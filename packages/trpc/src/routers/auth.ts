import { z } from "zod";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createRouter, publicQuery, protectedProcedure } from "../middleware";
import { db } from "@workspace/db";
import {
  accountDeletionRequests, adminLoginAttempts, adminSessions, auditLogs, authTokens, books, notifications,
  fatwaAnswers, fatwaQuestions,
  privateMediaDeletionJobs, promotionRequests, qiraatCertificates,
  recordings, securityEvents, sessionParticipants, students, studentPasswordLoginAttempts, studentSettings,
  shariaContent, systemSettings, teacherCertificates, teachers, teacherSettings, teacherMessages,
  userStorageObjects, users,
  webauthnChallenges, webauthnCredentials,
} from "@workspace/db";
import { hasMinimumNameParts, isValidPersonName, normalizePersonName, normalizePhoneInput, normalizeUsername, isValidUsername } from "@workspace/tabyan-domain/input-normalization";
import { isNonWhitespacePassword } from "@workspace/tabyan-domain/password-validation";
import { registrationEmailSchema, validateStudentBirthDate } from "../lib/registration-validation";
import { canDeletePrivateMedia, isProtectedVideoMediaType } from "../lib/mediaDeletionPolicy";

const COUNTRY_PHONE_RULES: Record<string, { minLength: number; maxLength: number }> = {
  "965": { minLength: 8, maxLength: 8 },
  "966": { minLength: 9, maxLength: 10 },
  "973": { minLength: 8, maxLength: 8 },
  "974": { minLength: 8, maxLength: 8 },
  "971": { minLength: 9, maxLength: 9 },
  "968": { minLength: 8, maxLength: 8 },
  "962": { minLength: 9, maxLength: 9 },
  "970": { minLength: 9, maxLength: 9 },
  "961": { minLength: 7, maxLength: 8 },
  "963": { minLength: 9, maxLength: 9 },
  "964": { minLength: 10, maxLength: 10 },
  "967": { minLength: 9, maxLength: 9 },
  "20": { minLength: 10, maxLength: 10 },
  "249": { minLength: 9, maxLength: 9 },
  "218": { minLength: 9, maxLength: 9 },
  "216": { minLength: 8, maxLength: 8 },
  "213": { minLength: 9, maxLength: 9 },
  "212": { minLength: 9, maxLength: 9 },
  "90": { minLength: 10, maxLength: 10 },
  "92": { minLength: 10, maxLength: 10 },
};

const COUNTRY_DIALS = Object.keys(COUNTRY_PHONE_RULES).sort((a, b) => b.length - a.length);

function isValidPhoneNumber(phone: string): boolean {
  if (/^05\d{8}$/.test(phone)) return true; // توافق مع الأرقام السعودية القديمة
  // E.164 عالمي: + ثم 7-15 رقماً — التطبيق متاح لجميع دول العالم، لا يُحصر بقائمة دول
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) return false;
  const digits = phone.slice(1);
  const dial = COUNTRY_DIALS.find((candidate) => digits.startsWith(candidate));
  // دولة لها قاعدة طول دقيقة → تُفرض؛ وبقية دول العالم تُقبل بصيغة E.164 العامة
  if (!dial) return true;
  const national = digits.slice(dial.length);
  const rule = COUNTRY_PHONE_RULES[dial];
  return /^\d+$/.test(national) && national.length >= rule.minLength && national.length <= rule.maxLength;
}

const phoneSchema = z.string()
  .transform(normalizePhoneInput)
  .refine(isValidPhoneNumber, "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة.");

function privateObjectPath(rawPath: string | null | undefined): string | null {
  if (!rawPath?.startsWith("/objects/") || rawPath.includes("..") || rawPath.includes("\\")) return null;
  return rawPath;
}

/** Student birth dates must be real ISO calendar dates and match the registration age range. */
/** يوحّد الرقم للتخزين والمطابقة: السعودي 05… يحوَّل إلى +9665…، والدولي يبقى E.164 كما هو */
function normalizePhone(p: string): string {
  return p.startsWith("05") ? `+966${p.slice(1)}` : p;
}

/** كل الصيغ المحتمل تخزينها للرقم نفسه — توافقية مع الأرقام السعودية المخزنة قديماً بصيغة 05… */
export function phoneVariants(p: string): string[] {
  const n = normalizePhone(p);
  return n.startsWith("+9665") ? [n, `0${n.slice(4)}`] : [n];
}
const makeToken = () => crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

// ── كلمة السر: محرف واحد غير مسافة على الأقل — تُفرض هنا في الخادم وليس في الواجهة فقط ──
// مُصدَّرة ليعيد admin.ts استخدامها في حسابات المشرفين/المعلمين — قاعدة واحدة لا تتكرر
export const passwordSchema = z.string()
  .refine(isNonWhitespacePassword, "أدخل كلمة المرور");

// كلمة المرور الرئيسية للإدارة سياسة منفصلة: نفس قبول المحرف الواحد،
// مع إبقاء حد الطول التاريخي 100 محرف دون تغييره ضمن إصلاح حسابات المستخدمين.
export const masterPasswordSchema = z.string()
  .max(100)
  .refine(isNonWhitespacePassword, "أدخل كلمة المرور");

// ── اسم المستخدم لحسابات الإشراف: عربي/إنجليزي وأرقام و_ و-، من 3 إلى 30 خانة ──
export const usernameSchema = z.string()
  .transform(normalizeUsername)
  .refine(isValidUsername, "اسم المستخدم: يمكن استخدام الحروف العربية أو الإنجليزية والأرقام و _ و - و . (3-30 خانة)");

// يسمح مسار الدخول بقراءة أسماء الحسابات العربية القديمة التي احتوت مسافة،
// مع إبقاء سياسة إنشاء الحسابات كما هي. تُزال المسافات فقط عند محاولة fallback
// غير ملتبسة، ولا يُسمح بحسابات جديدة تحتويها.
const loginUsernameSchema = z.string()
  .trim()
  .min(3)
  .max(30)
  .refine((value) => isValidUsername(value.replace(/\s+/g, "")), "اسم المستخدم غير صالح")
  .transform(normalizeUsername);

const normalizedPersonNameSchema = z.string().transform(normalizePersonName);

// ── حدود الحماية لعمليات الدخول الحساسة ──
const REMEMBER_ME_TTL_DAYS = 30;        // «تذكرني» = جلسة أطول بأمان (رمز عشوائي، لا كلمة سر)

/** عنوان الشبكة من الترويسات — x-forwarded-for قد يحمل سلسلة، نأخذ الأول ونقتطع لطول العمود */
function clientIp(ctx: { req: { headers: Record<string, unknown> } }): string {
  return ((ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0] ?? "").trim().slice(0, 45);
}

/** قائمة نطاقات WebAuthn المسموحة — تُشتق من بيئة النشر (لا من ترويسات الطلب) حتى لا يزوّر مهاجم origin/rpID */
function allowedWebauthnOrigins(): { rpID: string; origin: string }[] {
  const entries: { rpID: string; origin: string }[] = [];
  const add = (originStr: string) => {
    try {
      const u = new URL(originStr);
      if (!entries.some((e) => e.origin === u.origin)) entries.push({ rpID: u.hostname, origin: u.origin });
    } catch { /* تجاهل القيم غير الصالحة */ }
  };
  if (process.env.NODE_ENV !== "production") {
    add("http://localhost:5000");
    add("http://localhost:5173");
  }
  add("https://tibyanquran.com");
  add("https://www.tibyanquran.com");
  const domains = process.env.TABYAN_ALLOWED_ORIGINS;
  if (domains) for (const d of domains.split(",")) {
    const value = d.trim();
    if (value) add(value.includes("://") ? value : `https://${value}`);
  }
  return entries;
}

/** يقبل الطلب فقط إن جاء من نطاق مسموح؛ ترويسة Origin يتحكم بها المهاجم لذلك تُطابَق مع القائمة لا تُصدَّق */
function webauthnConfig(ctx: { req: { headers: Record<string, unknown> } }): { rpID: string; origin: string } {
  const originHeader = (ctx.req.headers["origin"] as string | undefined) ?? "";
  const allowed = allowedWebauthnOrigins();
  const match = allowed.find((e) => e.origin === originHeader);
  if (match) return match;
  // عملاء بلا ترويسة Origin (غير متصفحات) لا يمكنهم إتمام مراسم WebAuthn أصلاً — نرفض إلا في التطوير
  if (!originHeader && process.env.NODE_ENV !== "production" && allowed.length > 0) return allowed[0];
  throw new TRPCError({ code: "FORBIDDEN", message: "مصدر الطلب غير مسموح" });
}

/** سجل أمني للمحاولات المشبوهة — بلا كلمات سر أو رموز OTP. فشل التسجيل لا يُسقط الطلب */
async function logSecurityEvent(eventType: string, opts: { phone?: string; ip?: string; userAgent?: string; details?: Record<string, unknown> }) {
  try {
    await db.insert(securityEvents).values({
      id: crypto.randomUUID(), eventType,
      phone: opts.phone ?? null,
      ipAddress: opts.ip || null,
      userAgent: opts.userAgent?.slice(0, 500) ?? null,
      details: opts.details ?? null,
    });
  } catch { /* التسجيل الأمني لا يعطّل الخدمة */ }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type PrivateDeletionMediaType =
  | "profile_asset" | "student_certificate"
  | "placement_video" | "verification_video" | "promotion_video"
  | "session_recording" | "live_session_recording"
  | "student_placement_video" | "teacher_kyc_video"
  | "book_pdf" | "user_upload" | "other_private_media";

type AccountDeletionReason = "account_deletion" | "manual_admin_delete";
type AccountDeletionActor = { id: string; role: "student" | "admin" };

function privateMediaTypeForPurpose(purpose: string): PrivateDeletionMediaType {
  switch (purpose) {
    case "student_placement_video": return "placement_video";
    case "teacher_kyc_video": return "verification_video";
    case "live_session_recording": return "live_session_recording";
    case "qiraat_certificate": return "student_certificate";
    case "book_pdf": return "book_pdf";
    case "user_upload": return "user_upload";
    default: return "other_private_media";
  }
}

/**
 * Records an explicit account-deletion request and queues only private objects
 * whose ownership is proven by the ownership registry or a direct student row.
 * Existing legacy automatic-retention jobs can be promoted to this explicit
 * reason; ambiguous owner conflicts abort the account-deletion transaction.
 */
export async function enqueueAccountDeletionMedia(
  tx: Tx,
  target: { id: string; role: string; avatarUrl?: string | null },
  reason: AccountDeletionReason,
  actor: AccountDeletionActor,
): Promise<{ requestId: string; deletionStatus: "pending" | "completed"; pendingJobs: number; retainedShared: number }> {
  if (
    target.role !== "student"
    || (reason === "account_deletion" && (actor.role !== "student" || actor.id !== target.id))
    || (reason === "manual_admin_delete" && actor.role !== "admin")
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "سبب حذف الحساب أو منفّذه غير مخوّل" });
  }

  const [student] = await tx.select({
    placementTestVideoUrl: students.placementTestVideoUrl,
  }).from(students).where(eq(students.userId, target.id)).limit(1);
  const [promotionVideos, certificates, uploads] = await Promise.all([
    tx.select({ objectPath: promotionRequests.videoUrl })
      .from(promotionRequests).where(eq(promotionRequests.studentId, target.id)),
    tx.select({ objectPath: qiraatCertificates.certificateUrl })
      .from(qiraatCertificates).where(eq(qiraatCertificates.studentId, target.id)),
    tx.select({
      ownerUserId: userStorageObjects.ownerUserId,
      objectPath: userStorageObjects.objectPath,
      purpose: userStorageObjects.purpose,
      status: userStorageObjects.status,
    }).from(userStorageObjects).where(eq(userStorageObjects.ownerUserId, target.id)),
  ]);

  const directReferences: Array<{
    objectPath: string;
    purpose: string;
    mediaType: PrivateDeletionMediaType;
  }> = [];
  const addDirectReference = (
    rawPath: string | null | undefined,
    purpose: string,
    mediaType: PrivateDeletionMediaType,
  ) => {
    const objectPath = privateObjectPath(rawPath);
    if (objectPath) directReferences.push({ objectPath, purpose, mediaType });
  };
  addDirectReference(target.avatarUrl, "user_upload", "profile_asset");
  addDirectReference(student?.placementTestVideoUrl, "student_placement_video", "placement_video");
  for (const row of promotionVideos) {
    addDirectReference(row.objectPath, "student_placement_video", "promotion_video");
  }
  for (const row of certificates) {
    addDirectReference(row.objectPath, "qiraat_certificate", "student_certificate");
  }

  const ownedPathRows = new Map(uploads.map((row) => [row.objectPath, row]));
  const directPaths = [...new Set(directReferences.map((row) => row.objectPath))]
    .filter((path) => !ownedPathRows.has(path));
  if (directPaths.length) {
    const existingDirectRows = await tx.select({
      objectPath: userStorageObjects.objectPath,
      ownerUserId: userStorageObjects.ownerUserId,
      purpose: userStorageObjects.purpose,
      status: userStorageObjects.status,
    }).from(userStorageObjects).where(inArray(userStorageObjects.objectPath, directPaths));
    const existingDirectByPath = new Map(existingDirectRows.map((row) => [row.objectPath, row]));
    for (const row of existingDirectRows) {
      if (row.ownerUserId !== target.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "تعذر إثبات ملكية أحد الملفات المرتبطة بالحساب؛ أُوقف الحذف لحماية الملف",
        });
      }
      ownedPathRows.set(row.objectPath, row);
    }
    const unregistered = directReferences.filter((reference) => {
      const existing = existingDirectByPath.get(reference.objectPath);
      return !existing;
    });
    if (unregistered.length) {
      await tx.insert(userStorageObjects).values(unregistered.map((reference) => ({
        id: randomUUID(),
        ownerUserId: target.id,
        objectPath: reference.objectPath,
        purpose: reference.purpose,
        status: "reserved" as const,
      }))).onConflictDoNothing();
      const verifiedRows = await tx.select({
        objectPath: userStorageObjects.objectPath,
        ownerUserId: userStorageObjects.ownerUserId,
        purpose: userStorageObjects.purpose,
        status: userStorageObjects.status,
      }).from(userStorageObjects).where(inArray(
        userStorageObjects.objectPath,
        [...new Set(unregistered.map((reference) => reference.objectPath))],
      ));
      for (const row of verifiedRows) {
        if (row.ownerUserId !== target.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "تعذر إثبات ملكية أحد الملفات المرتبطة بالحساب؛ أُوقف الحذف لحماية الملف",
          });
        }
        ownedPathRows.set(row.objectPath, row);
      }
      if (unregistered.some((reference) => !ownedPathRows.has(reference.objectPath))) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "تعذر تسجيل ملكية أحد الملفات المرتبطة بالحساب؛ أُوقف الحذف لحماية الملف",
        });
      }
    }
  }

  const candidates = new Map<string, {
    mediaType: PrivateDeletionMediaType;
    purposes: Set<string>;
  }>();
  const addCandidate = (objectPath: string, purpose: string, mediaType: PrivateDeletionMediaType) => {
    const current = candidates.get(objectPath);
    if (current) {
      current.purposes.add(purpose);
      if (mediaType === "book_pdf") current.mediaType = mediaType;
      else if (isProtectedVideoMediaType(mediaType) && !isProtectedVideoMediaType(current.mediaType)) {
        current.mediaType = mediaType;
      } else if (current.mediaType === "other_private_media" || current.mediaType === "user_upload") {
        current.mediaType = mediaType;
      }
      return;
    }
    candidates.set(objectPath, { mediaType, purposes: new Set([purpose]) });
  };

  for (const upload of uploads) {
    if (upload.status === "deleted") continue;
    const path = privateObjectPath(upload.objectPath);
    if (path) addCandidate(path, upload.purpose, privateMediaTypeForPurpose(upload.purpose));
  }
  for (const reference of directReferences) {
    const row = ownedPathRows.get(reference.objectPath);
    if (row?.status === "deleted") continue;
    if (row && row.ownerUserId !== undefined && row.ownerUserId !== target.id) {
      throw new TRPCError({ code: "CONFLICT", message: "تعذر إثبات ملكية الملف المرتبط بالحساب" });
    }
    addCandidate(reference.objectPath, row?.purpose ?? reference.purpose, reference.mediaType);
  }

  const paths = [...candidates.keys()];
  const exactDirectPaths = [...new Set(directReferences.map((reference) => reference.objectPath))];
  const otherAccountReferences: unknown[][] = exactDirectPaths.length
    ? await Promise.all([
      tx.select({ id: users.id }).from(users).where(and(
        inArray(users.avatarUrl, exactDirectPaths),
        ne(users.id, target.id),
      )),
      tx.select({ userId: students.userId }).from(students).where(and(
        inArray(students.placementTestVideoUrl, exactDirectPaths),
        ne(students.userId, target.id),
      )),
      tx.select({ studentId: promotionRequests.studentId }).from(promotionRequests).where(and(
        inArray(promotionRequests.videoUrl, exactDirectPaths),
        ne(promotionRequests.studentId, target.id),
      )),
      tx.select({ studentId: qiraatCertificates.studentId }).from(qiraatCertificates).where(and(
        inArray(qiraatCertificates.certificateUrl, exactDirectPaths),
        ne(qiraatCertificates.studentId, target.id),
      )),
      tx.select({ userId: teachers.userId }).from(teachers).where(and(
        inArray(teachers.kycVideoUrl, exactDirectPaths),
        ne(teachers.userId, target.id),
      )),
      tx.select({ teacherId: teacherCertificates.teacherId }).from(teacherCertificates).where(and(
        inArray(teacherCertificates.filePath, exactDirectPaths),
        ne(teacherCertificates.teacherId, target.id),
      )),
      tx.select({ studentId: fatwaQuestions.studentId }).from(fatwaQuestions).where(and(
        or(inArray(fatwaQuestions.imageUrl, exactDirectPaths), inArray(fatwaQuestions.audioUrl, exactDirectPaths)),
        ne(fatwaQuestions.studentId, target.id),
      )),
      tx.select({ muftiId: fatwaAnswers.muftiId }).from(fatwaAnswers).where(and(
        inArray(fatwaAnswers.audioUrl, exactDirectPaths),
        ne(fatwaAnswers.muftiId, target.id),
      )),
      tx.select({ studentId: teacherMessages.studentId }).from(teacherMessages).where(and(
        or(inArray(teacherMessages.audioUrl, exactDirectPaths), inArray(teacherMessages.fileUrl, exactDirectPaths)),
        ne(teacherMessages.studentId, target.id),
      )),
    ])
    : [];
  if (otherAccountReferences.some((rows) => rows.length > 0)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "تعذر إثبات ملكية أحد الملفات المرتبطة بالحساب بسبب مرجع لحساب آخر",
    });
  }
  const [bookReferences, shariaReferences] = exactDirectPaths.length
    ? await Promise.all([
      tx.select({
        fileObjectKey: books.fileObjectKey,
        fileUrl: books.fileUrl,
        audioUrl: books.audioUrl,
      }).from(books).where(or(
        inArray(books.fileObjectKey, exactDirectPaths),
        inArray(books.fileUrl, exactDirectPaths),
        inArray(books.audioUrl, exactDirectPaths),
      )),
      tx.select({ fileUrl: shariaContent.fileUrl }).from(shariaContent)
        .where(inArray(shariaContent.fileUrl, exactDirectPaths)),
    ])
    : [[], []];
  const sharedLibraryPaths = new Set<string>([
    ...bookReferences.flatMap((row) => [row.fileObjectKey, row.fileUrl, row.audioUrl]),
    ...shariaReferences.map((row) => row.fileUrl),
  ].filter((path): path is string => typeof path === "string"));
  const activeRecordings = paths.length
    ? await tx.select({
      objectPath: recordings.videoUrl,
      sessionId: recordings.sessionId,
      teacherId: recordings.teacherId,
      studentId: recordings.studentId,
    }).from(recordings).where(and(
      inArray(recordings.videoUrl, paths),
      eq(recordings.status, "ready"),
      eq(recordings.isDeleted, false),
    ))
    : [];
  const sessionIds = [...new Set(activeRecordings.map((row) => row.sessionId))];
  const participants = sessionIds.length
    ? await tx.select({
      sessionId: sessionParticipants.sessionId,
      studentId: sessionParticipants.studentId,
    }).from(sessionParticipants).where(inArray(sessionParticipants.sessionId, sessionIds))
    : [];
  const sharedPaths = new Set<string>();
  for (const row of activeRecordings) {
    if (
      (row.teacherId && row.teacherId !== target.id)
      || (row.studentId && row.studentId !== target.id)
      || participants.some((participant) =>
        participant.sessionId === row.sessionId && participant.studentId !== target.id)
    ) {
      sharedPaths.add(row.objectPath);
    }
  }

  const requestId = randomUUID();
  const requestedAt = new Date();
  await tx.insert(accountDeletionRequests).values({
    id: requestId,
    userId: target.id,
    requestedByUserId: actor.id,
    requestedByRole: actor.role,
    status: "pending",
    requestedAt,
    completedAt: null,
  });

  const existingJobs = paths.length
    ? await tx.select({
      objectPath: privateMediaDeletionJobs.objectPath,
      id: privateMediaDeletionJobs.id,
      requestId: privateMediaDeletionJobs.requestId,
      ownerUserId: privateMediaDeletionJobs.ownerUserId,
      deletionReason: privateMediaDeletionJobs.deletionReason,
      mediaType: privateMediaDeletionJobs.mediaType,
      status: privateMediaDeletionJobs.status,
    }).from(privateMediaDeletionJobs).where(inArray(privateMediaDeletionJobs.objectPath, paths))
    : [];
  const jobByPath = new Map(existingJobs.map((job) => [job.objectPath, job]));
  let pendingJobs = 0;
  let retainedShared = 0;

  for (const [objectPath, candidate] of candidates) {
    const manifest = ownedPathRows.get(objectPath);
    if (!manifest || manifest.ownerUserId !== target.id) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "تعذر إثبات ملكية أحد الملفات؛ أُوقف الحذف لحماية الملف",
      });
    }
    const isSharedRecording = sharedPaths.has(objectPath);
    const isSharedLibraryAsset = candidate.purposes.has("book_pdf") || sharedLibraryPaths.has(objectPath);
    const isPrivate = !isSharedLibraryAsset;
    const policyAllowed = canDeletePrivateMedia({
      reason,
      mediaType: candidate.mediaType,
      objectPath,
      ownershipProven: true,
      isPrivate,
      isShared: isSharedRecording,
      manualAdminAuthorized: actor.role === "admin",
    });
    const retainReason = isSharedRecording
      ? "shared_recording_retained_for_other_participant"
      : isSharedLibraryAsset
        ? "shared_library_asset_retained"
        : policyAllowed
          ? null
          : "deletion_policy_denied";
    const existing = jobByPath.get(objectPath);
    if (existing?.ownerUserId && existing.ownerUserId !== target.id) {
      throw new TRPCError({ code: "CONFLICT", message: "تعارض سجل ملكية ملف؛ أُوقف الحذف لحمايته" });
    }
    if (
      existing?.requestId
      && existing.requestId !== requestId
      && existing.deletionReason !== "automatic_retention"
      && existing.status !== "completed"
    ) {
      throw new TRPCError({ code: "CONFLICT", message: "يوجد طلب حذف آخر قيد المعالجة لهذا الملف" });
    }

    if (existing?.status === "completed") {
      await tx.update(userStorageObjects).set({ status: "deleted" })
        .where(eq(userStorageObjects.objectPath, objectPath));
      continue;
    }

    const status: "pending" | "retained" = policyAllowed ? "pending" : "retained";
    const jobValues = {
      requestId,
      ownerUserId: target.id,
      deletionReason: reason,
      mediaType: candidate.mediaType,
      status,
      notBefore: requestedAt,
      lockedAt: null,
      completedAt: policyAllowed ? null : requestedAt,
      lastErrorCode: retainReason,
    };
    if (existing) {
      await tx.update(privateMediaDeletionJobs).set(jobValues)
        .where(eq(privateMediaDeletionJobs.id, existing.id));
    } else {
      await tx.insert(privateMediaDeletionJobs).values({
        id: randomUUID(),
        objectPath,
        attempts: 0,
        ...jobValues,
      }).onConflictDoNothing();
    }
    await tx.update(userStorageObjects).set({
      status: policyAllowed ? "queued" : "retained",
    }).where(eq(userStorageObjects.objectPath, objectPath));
    if (policyAllowed) pendingJobs += 1;
    else if (isSharedRecording || isSharedLibraryAsset) retainedShared += 1;
  }

  const deletionStatus = pendingJobs ? "pending" : "completed";
  if (!pendingJobs) {
    await tx.update(accountDeletionRequests).set({
      status: "completed",
      completedAt: requestedAt,
      userId: null,
      requestedByUserId: null,
    }).where(eq(accountDeletionRequests.id, requestId));
    await tx.update(userStorageObjects).set({ ownerUserId: null })
      .where(eq(userStorageObjects.ownerUserId, target.id));
    await tx.update(privateMediaDeletionJobs).set({ ownerUserId: null })
      .where(and(
        eq(privateMediaDeletionJobs.requestId, requestId),
        inArray(privateMediaDeletionJobs.status, ["completed", "retained"]),
      ));
  }
  return { requestId, deletionStatus, pendingJobs, retainedShared };
}

const STUDENT_PASSWORD_FAILURE_LIMIT = 5;
const STUDENT_PASSWORD_FAILURE_WINDOW_MS = 60 * 60 * 1000;
const STUDENT_PASSWORD_BLOCK_MS = 48 * 60 * 60 * 1000;

function studentPasswordBlockedError() {
  return new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "تعذّر تسجيل الدخول مؤقتاً — حاول لاحقاً",
  });
}

/** إشعار جميع حسابات المسؤولين */
async function notifyAdmins(title: string, body: string, type: "general" | "result" | "activity" = "general") {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  if (!admins.length) return;
  await db.insert(notifications).values(
    admins.map((a) => ({ id: crypto.randomUUID(), userId: a.id, title, body, type })),
  );
}

async function issueToken(userId: string, role: "student" | "teacher" | "admin", rememberMe = false, tx?: Tx) {
  const token = makeToken();
  const ttlDays = rememberMe ? REMEMBER_ME_TTL_DAYS : 7;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);
  const row = { id: crypto.randomUUID(), userId, token, role, expiresAt };
  if (tx) await tx.insert(authTokens).values(row); else await db.insert(authTokens).values(row);
  return token;
}

// البريد الإلكتروني الاختياري في تسجيل الطالب — يُطبَّع (trim + lowercase) قبل الحفظ والمطابقة
const emailSchema = registrationEmailSchema;

export const authRouter = createRouter({
  /** فحص هل الرقم مسجّل — يوجّه المسار: موجود → دخول بكلمة المرور، جديد → تسجيل بلا تحقق هاتف */
  checkPhone: publicQuery
    .input(z.object({ phone: phoneSchema }))
    .mutation(async ({ input, ctx }) => {
      // حد ذرّي لكل عنوان شبكة (قفل استشاري داخل معاملة) لمنع تعداد الحسابات —
      // عند غياب العنوان نستخدم مفتاحاً ثابتاً يتشارك الحد بدل إسقاط الحماية
      const ip = clientIp(ctx) || "unknown";
      const hourAgo = new Date(Date.now() - 3600000);
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"phone-check:" + ip}, 0))`);
        const recent = await tx.select({ id: securityEvents.id }).from(securityEvents)
          .where(and(eq(securityEvents.eventType, "phone_check_ip"), eq(securityEvents.ipAddress, ip),
            gte(securityEvents.createdAt, hourAgo)));
        if (recent.length >= 30) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "عدد كبير من المحاولات — حاول بعد قليل" });
        await tx.insert(securityEvents).values({
          id: crypto.randomUUID(), eventType: "phone_check_ip",
          ipAddress: ip, userAgent: ((ctx.req.headers["user-agent"] as string) ?? "").slice(0, 500) || null,
        });
      });
      const existing = await db.select({ id: users.id }).from(users)
        .where(inArray(users.phone, phoneVariants(input.phone))).limit(1);
      return { registered: existing.length > 0 };
    }),

  completeProfile: publicQuery
    .input(z.object({
      phone: phoneSchema,
      // البريد اختياري — كلمة السر هي وسيلة المصادقة الأساسية
      email: emailSchema.optional(),
      fullName: normalizedPersonNameSchema,
      birthDate: z.string(),
      inSchool: z.boolean().optional(),
      schoolStage: z.enum(["primary", "middle", "high"]).optional(),
      schoolGrade: z.string().max(20).optional(),
      parentPhone: z.string().max(20).optional(),
      gpsLat: z.string().max(30).optional(), gpsLng: z.string().max(30).optional(),
      role: z.enum(["student", "teacher"]).default("student"),
      // كلمة السر إلزامية للطالب والمعلم (تُفرض قواعدها هنا في الخادم)
      password: passwordSchema,
      confirmPassword: z.string().optional(),
      rememberMe: z.boolean().optional(),
    }).superRefine((data, ctx) => {
      if (data.role === "student") {
        const birthDateError = validateStudentBirthDate(data.birthDate);
        if (birthDateError) {
          ctx.addIssue({
            code: "custom",
            path: ["birthDate"],
            message: birthDateError,
          });
        }
        if (data.inSchool === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["inSchool"],
            message: "الرجاء اختيار وضعك المدرسي",
          });
        } else if (data.inSchool) {
          if (!data.schoolStage) {
            ctx.addIssue({
              code: "custom",
              path: ["schoolStage"],
              message: "الرجاء اختيار مرحلتك الدراسية",
            });
          }
          if (!data.schoolGrade?.trim()) {
            ctx.addIssue({
              code: "custom",
              path: ["schoolGrade"],
              message: "الرجاء اختيار صفك الدراسي",
            });
          }
        }
      }
      // الاسم الثلاثي للطالب: كل جزء حرفان على الأقل؛ المعلم يبقى على حد الاسم العام.
      const validName = data.role === "teacher"
        ? isValidPersonName(data.fullName)
        : isValidPersonName(data.fullName) && hasMinimumNameParts(data.fullName, 3, 2);
      if (!validName) {
        ctx.addIssue({
          code: "custom",
          path: ["fullName"],
          message: data.role === "teacher"
            ? "الاسم غير صالح"
            : "أدخل الاسم الثلاثي، على أن يتكوّن كل جزء من حرفين على الأقل",
        });
      }
      if (data.password && data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "كلمتا السر غير متطابقتين" });
      }
    }))
    .mutation(async ({ input, ctx }) => {
      const dup = await db.select().from(users).where(inArray(users.phone, phoneVariants(input.phone))).limit(1);
      if (dup.length > 0) {
        // محاولة إنشاء حساب مكرر برقم مُتحقق منه — تُسجَّل أمنياً والرسالة لا تكشف بيانات صاحب الحساب
        await logSecurityEvent("duplicate_registration_attempt", {
          phone: normalizePhone(input.phone), ip: clientIp(ctx), userAgent: ctx.req.headers["user-agent"] as string,
        });
        throw new TRPCError({ code: "CONFLICT", message: "الرقم مسجل مسبقاً — سجّل دخولك" });
      }
      // البريد اختياري وغير موثّق؛ كلمة السر هي وسيلة المصادقة، ولا نرفع emailVerified دون تحقق خادمي.
      const accountEmail = input.email ?? null;
      const id = crypto.randomUUID();
      // تجزئة bcrypt آمنة — لا تُخزَّن كلمة السر نصاً صريحاً أبداً
      const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;
      // كل الكتابات في معاملة واحدة: منع البريد المكرر + إنشاء المستخدم والملف والجلسة.
      const token = await db.transaction(async (tx) => {
        if (accountEmail) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"student-registration-email:" + accountEmail}, 0))`);
          const emailDup = await tx.select({ id: users.id }).from(users)
            .where(sql`lower(${users.email}) = ${accountEmail}`).limit(1);
          if (emailDup.length) {
            throw new TRPCError({ code: "CONFLICT", message: "البريد مرتبط بحساب آخر — سجّل الدخول به أو تواصل مع الإدارة" });
          }
        }
        await tx.insert(users).values({
          id,
          fullName: input.fullName,
          phone: normalizePhone(input.phone),
          role: input.role,
          passwordHash,
          email: accountEmail,
          emailVerified: false,
        });
        if (input.role === "student") {
          await tx.insert(students).values({
            userId: id, birthDate: input.birthDate, schoolStage: input.schoolStage,
            schoolGrade: input.schoolGrade, parentPhone: input.parentPhone,
            gpsLat: input.gpsLat, gpsLng: input.gpsLng,
          });
          await tx.insert(studentSettings).values({ id: crypto.randomUUID(), studentId: id });
        } else {
          await tx.insert(teachers).values({ userId: id, kycStatus: "awaiting_assessment" });
          await tx.insert(teacherSettings).values({ id: crypto.randomUUID(), teacherId: id });
        }
        return issueToken(id, input.role, input.rememberMe ?? false, tx);
      });
      if (input.role === "student") {
        await notifyAdmins(
          "🎓 طالب جديد سجّل في المنصة",
          `انضم الطالب ${input.fullName} إلى تبيان — بانتظار إرسال فيديو اختبار القبول.`,
          "activity",
        );
      } else {
        await notifyAdmins(
          "🧑‍🏫 معلم جديد سجّل في المنصة",
          `انضم ${input.fullName} كمعلم — بانتظار إكمال اختبار القبول.`,
          "activity",
        );
      }
      return { ok: true, token, role: input.role };
    }),

  adminLogin: publicQuery
    .input(z.object({
      masterPassword: masterPasswordSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // x-forwarded-for قد يحمل سلسلة عناوين — نأخذ الأول ونقتطع لطول العمود (45)
      const ip = (ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? "").trim().slice(0, 45);
      // دخول الإدارة يعتمد على كلمة المرور فقط؛ لا يرتبط برقم هاتف أو اسم معيّن.
      // نستخدم قيمة ثابتة للتوافق مع العمود القديم غير القابل للقيمة الفارغة في سجل المحاولات.
      const loginKey = "password-only";
      const logAttempt = async (status: "success" | "failed" | "blocked", count: number, blockedUntil?: Date) =>
        db.insert(adminLoginAttempts).values({
          id: crypto.randomUUID(), userId: null, phone: loginKey,
          ipAddress: ip, status, attemptCount: count, blockedUntil,
        });
      // الحظر يطبق على عنوان الشبكة، لا على رقم هاتف.
      const recent = await db.select().from(adminLoginAttempts)
        .where(and(eq(adminLoginAttempts.ipAddress, ip), gt(adminLoginAttempts.blockedUntil, new Date())))
        .orderBy(desc(adminLoginAttempts.createdAt)).limit(1);
      if (recent.length > 0 && recent[0].blockedUntil) {
        const hours = Math.ceil((recent[0].blockedUntil.getTime() - Date.now()) / 3600000);
        throw new TRPCError({ code: "FORBIDDEN", message: `تم حظرك مؤقتاً — حاول بعد ${hours} ساعة` });
      }
      // الحساب الإداري الذي سيُمنح الجلسة يُختار من حسابات الإدارة النشطة.
      const [admin] = await db.select().from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true))).limit(1);
      // بعد تفعيل بيانات دخول حساب الإدارة نفسه، لا يبقى مسار كلمة المرور
      // الرئيسية صالحاً بالتوازي؛ هذا يمنع وجود بيانات اعتماد قديمة مخفية.
      if (admin?.username && admin.passwordHash) {
        throw new TRPCError({ code: "FORBIDDEN", message: "استخدم اسم المستخدم وكلمة السر الخاصة بحسابك" });
      }
      const setting = await db.select().from(systemSettings).where(eq(systemSettings.key, "admin_master_password_hash")).limit(1);
      const hash = setting[0]?.value ?? "";
      const ok = await bcrypt.compare(input.masterPassword, hash);
      if (!ok || !admin) {
        const hourAgo = new Date(Date.now() - 3600000);
        const fails = await db.select().from(adminLoginAttempts)
          .where(and(
            eq(adminLoginAttempts.ipAddress, ip),
            eq(adminLoginAttempts.status, "failed"),
            gte(adminLoginAttempts.createdAt, hourAgo),
          ));
        const count = fails.length + 1;
        if (count >= 5) {
          const blockedUntil = new Date(Date.now() + 48 * 3600 * 1000);
          await logAttempt("blocked", count, blockedUntil);
          throw new TRPCError({ code: "FORBIDDEN", message: "تم حظرك 48 ساعة بعد 5 محاولات فاشلة" });
        }
        await logAttempt("failed", count);
        throw new TRPCError({ code: "FORBIDDEN", message: `بيانات غير صحيحة — المحاولات المتبقية: ${5 - count}` });
      }
      // 4) success
      await logAttempt("success", 0);
      const token = await issueToken(admin.id, "admin");
      await db.insert(adminSessions).values({
        id: crypto.randomUUID(), userId: admin.id, jwtToken: token, ipAddress: ip,
      });
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(), adminId: admin.id, action: "login", targetType: "session", ipAddress: ip,
      });
      return { ok: true, token, role: "admin" as const, fullName: admin.fullName };
    }),

  /** دخول الحسابات المنشأة من لوحة الإشراف (مشرف/معلم) باسم مستخدم + كلمة سر —
   *  رسالة فشل عامة واحدة لا تكشف وجود الاسم، وحد معدل ذرّي لكل عنوان شبكة */
  passwordLogin: publicQuery
    .input(z.object({
      username: loginUsernameSchema,
      password: passwordSchema,
      rememberMe: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = clientIp(ctx) || "unknown";
      const ua = ((ctx.req.headers["user-agent"] as string) ?? "").slice(0, 500);
      // حد ذرّي لكل عنوان (قفل استشاري داخل معاملة) — نفس نمط checkPhone
      const hourAgo = new Date(Date.now() - 3600000);
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"password-login:" + ip}, 0))`);
        const recent = await tx.select({ id: securityEvents.id }).from(securityEvents)
          .where(and(eq(securityEvents.eventType, "password_login_ip"), eq(securityEvents.ipAddress, ip),
            gte(securityEvents.createdAt, hourAgo)));
        if (recent.length >= 30) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "عدد كبير من المحاولات — حاول بعد قليل" });
        await tx.insert(securityEvents).values({ id: crypto.randomUUID(), eventType: "password_login_ip", ipAddress: ip, userAgent: ua });
      });
      const genericError = () => new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة السر غير صحيحة" });
       const exactRows = await db.select().from(users).where(eq(users.username, input.username)).limit(1);
       let u = exactRows[0];
       if (!u) {
         // توافق مع حسابات عربية قديمة أُنشئت بمسافات داخل الاسم.
         // لا نختار حساباً عند وجود أكثر من تطابق بعد إزالة المسافات.
         const compactUsername = input.username.replace(/\s+/g, "");
         const legacyRows = await db.select().from(users)
           .where(sql`regexp_replace(${users.username}, '[[:space:]]+', '', 'g') = ${compactUsername}`)
           .limit(2);
         if (legacyRows.length === 1) u = legacyRows[0];
       }
      // حسابات الإشراف فقط (مشرف/معلم) — الطلاب يدخلون بالهاتف/البصمة كالمعتاد
      if (!u || !u.passwordHash || (u.role !== "admin" && u.role !== "teacher")) throw genericError();
      const ok = await bcrypt.compare(input.password, u.passwordHash);
      if (!ok) {
        await logSecurityEvent("password_login_failure", { ip, userAgent: ua, details: { username: input.username } });
        throw genericError();
      }
      if (!u.isActive || (u.bannedUntil && u.bannedUntil > new Date())) {
        throw new TRPCError({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإشراف" });
      }
      const token = await issueToken(u.id, u.role, input.rememberMe ?? false);
      if (u.role === "admin") {
        // جلسة إشراف قابلة للإنهاء من «المشرفون النشطون» — نفس نمط adminLogin
        await db.insert(adminSessions).values({ id: crypto.randomUUID(), userId: u.id, jwtToken: token, ipAddress: ip });
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(), adminId: u.id, action: "login", targetType: "session", ipAddress: ip,
        });
      }
      await logSecurityEvent("password_login_success", { ip, userAgent: ua, details: { userId: u.id, role: u.role } });
      return { ok: true as const, token, role: u.role, name: u.fullName };
    }),

  /** دخول الطالب/المعلم من الهاتف أو البريد + كلمة السر.
   * يبقى منفصلاً عن passwordLogin حتى لا يفتح مسار اسم المستخدم للطلاب في هذا العقد.
   */
  studentPasswordLogin: publicQuery
    .input(z.object({
      identifier: z.string().trim().min(1).max(150),
      password: passwordSchema,
      rememberMe: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = clientIp(ctx) || "unknown";
      const ua = ((ctx.req.headers["user-agent"] as string) ?? "").slice(0, 500);
      const hourAgo = new Date(Date.now() - 3600000);

       // حد ذري لكل عنوان شبكة — مع مفتاح مستقل لمسار الهاتف/البريد.
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"student-password-login:" + ip}, 0))`);
        const recent = await tx.select({ id: securityEvents.id }).from(securityEvents)
          .where(and(
            eq(securityEvents.eventType, "student_password_login_ip"),
            eq(securityEvents.ipAddress, ip),
            gte(securityEvents.createdAt, hourAgo),
          ));
        if (recent.length >= 30) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "عدد كبير من المحاولات — حاول بعد قليل" });
        }
        await tx.insert(securityEvents).values({
          id: crypto.randomUUID(),
          eventType: "student_password_login_ip",
          ipAddress: ip,
          userAgent: ua || null,
        });
      });

       const genericError = () => new TRPCError({
         code: "UNAUTHORIZED",
         message: "رقم الهاتف/البريد أو كلمة السر غير صحيحة",
       });
      const rawIdentifier = input.identifier.trim();
      const identifier = rawIdentifier.includes("@") ? rawIdentifier : normalizePhoneInput(rawIdentifier);
      const phoneLike = /^\+|^05/.test(identifier);
      let normalizedIdentifier: string;
      let identifierType: "phone" | "email";

      if (phoneLike) {
        if (!isValidPhoneNumber(identifier)) throw genericError();
        normalizedIdentifier = normalizePhone(identifier);
        identifierType = "phone";
      } else {
        const email = emailSchema.safeParse(identifier);
        if (!email.success) throw genericError();
        normalizedIdentifier = email.data;
        identifierType = "email";
      }

      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"student-password-attempt:" + normalizedIdentifier}, 0))`);
        const now = new Date();
        const [state] = await tx.select().from(studentPasswordLoginAttempts)
          .where(eq(studentPasswordLoginAttempts.identifier, normalizedIdentifier))
          .limit(1);
        if (state?.blockedUntil && state.blockedUntil > now) {
          return { status: "blocked" as const };
        }

        const rows = phoneLike
          ? await tx.select().from(users)
              .where(and(
                inArray(users.phone, phoneVariants(identifier)),
                inArray(users.role, ["student", "teacher"]),
              ))
              .limit(1)
          : await tx.select().from(users)
              .where(and(
                eq(users.email, normalizedIdentifier),
                inArray(users.role, ["student", "teacher"]),
              ))
              .limit(1);
        const u = rows[0];
        const passwordOk = !!u?.passwordHash && await bcrypt.compare(input.password, u.passwordHash);

        if (!u || (u.role !== "student" && u.role !== "teacher") || !passwordOk) {
          const cutoff = now.getTime() - STUDENT_PASSWORD_FAILURE_WINDOW_MS;
          const failureTimestamps = (state?.failureTimestamps ?? [])
            .filter((value) => {
              const timestamp = Date.parse(value);
              return Number.isFinite(timestamp) && timestamp >= cutoff;
            });
          failureTimestamps.push(now.toISOString());
          const failedAttempts = failureTimestamps.length;
          const blockedUntil = failedAttempts >= STUDENT_PASSWORD_FAILURE_LIMIT
            ? new Date(now.getTime() + STUDENT_PASSWORD_BLOCK_MS)
            : null;

          if (state) {
            await tx.update(studentPasswordLoginAttempts)
              .set({ failedAttempts, failureTimestamps, blockedUntil, updatedAt: now })
              .where(eq(studentPasswordLoginAttempts.id, state.id));
          } else {
            await tx.insert(studentPasswordLoginAttempts).values({
              id: crypto.randomUUID(),
              identifier: normalizedIdentifier,
              failedAttempts,
              failureTimestamps,
              blockedUntil,
              updatedAt: now,
            });
          }
          if (blockedUntil) return { status: "blocked" as const };
          return { status: "invalid" as const, userId: u?.id };
        }

        if (!u.isActive || (u.bannedUntil && u.bannedUntil > now)) {
          return { status: "suspended" as const };
        }
        const token = await issueToken(u.id, u.role, input.rememberMe ?? false, tx);
        await tx.delete(studentPasswordLoginAttempts)
          .where(eq(studentPasswordLoginAttempts.identifier, normalizedIdentifier));
        return { status: "success" as const, token, role: u.role, name: u.fullName, userId: u.id };
      });

      if (result.status === "blocked") {
        await logSecurityEvent("student_password_login_blocked", {
          ip,
          userAgent: ua,
          details: { identifierType },
        });
        throw studentPasswordBlockedError();
      }
      if (result.status === "invalid") {
        await logSecurityEvent("student_password_login_failure", {
          ip,
          userAgent: ua,
          details: { userId: result.userId, identifierType },
        });
        throw genericError();
      }
      if (result.status === "suspended") {
        throw new TRPCError({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإدارة" });
      }

      await logSecurityEvent("student_password_login_success", {
        ip,
        userAgent: ua,
        details: { userId: result.userId, role: result.role },
      });
      return { ok: true as const, token: result.token, role: result.role, name: result.name };
    }),

  // ── WebAuthn: الدخول بالبصمة / Face ID / Touch ID بتحقق خادمي كامل ──────────
  // المفتاح العام يُسجَّل في الخادم، وكل دخول يتحقق الخادم فيه من توقيع المصادق —
  // لا يُصدر أي رمز جلسة إلا بعد نجاح التحقق التشفيري، ولا يُخزَّن أي رمز على الجهاز.

  webauthnRegisterOptions: protectedProcedure.mutation(async ({ ctx }) => {
    const { rpID } = webauthnConfig(ctx);
    const options = await generateRegistrationOptions({
      rpName: "تبيان",
      rpID,
      userID: new TextEncoder().encode(ctx.user.id),
      userName: ctx.user.phone || ctx.user.id,
      userDisplayName: ctx.user.fullName,
      // مفتاح مدمج بالجهاز (Face ID / Touch ID / بصمة) قابل للاكتشاف — ليعمل الدخول دون إدخال أي بيانات
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
      timeout: 60_000,
    });
    const challengeId = crypto.randomUUID();
    await db.insert(webauthnChallenges).values({
      id: challengeId, userId: ctx.user.id, challenge: options.challenge,
      type: "registration", expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return { challengeId, options };
  }),

  webauthnRegisterVerify: protectedProcedure
    .input(z.object({ challengeId: z.string(), response: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const { rpID, origin } = webauthnConfig(ctx);
      const [ch] = await db.select().from(webauthnChallenges)
        .where(and(eq(webauthnChallenges.id, input.challengeId), eq(webauthnChallenges.type, "registration"),
          gt(webauthnChallenges.expiresAt, new Date())))
        .limit(1);
      if (!ch || ch.userId !== ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية عملية التفعيل — حاول مجدداً" });
      await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, ch.id)); // تحدٍّ أحادي الاستخدام
      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: input.response, expectedChallenge: ch.challenge,
          expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "فشل التحقق من البصمة — حاول مجدداً" });
      }
      if (!verification.verified || !verification.registrationInfo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "فشل التحقق من البصمة — حاول مجدداً" });
      }
      const { credential } = verification.registrationInfo;
      await db.insert(webauthnCredentials).values({
        id: crypto.randomUUID(), userId: ctx.user.id,
        credentialId: credential.id,                        // base64url
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter, transports: credential.transports ?? null,
      });
      return { ok: true };
    }),

  webauthnLoginOptions: publicQuery.mutation(async ({ ctx }) => {
    const { rpID } = webauthnConfig(ctx);
    // بلا allowCredentials — الاعتماد على المفاتيح القابلة للاكتشاف (resident keys) فلا يُكشف أي معرّف
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required", timeout: 60_000 });
    const challengeId = crypto.randomUUID();
    await db.insert(webauthnChallenges).values({
      id: challengeId, userId: null, challenge: options.challenge,
      type: "authentication", expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return { challengeId, options };
  }),

  webauthnLoginVerify: publicQuery
    .input(z.object({ challengeId: z.string(), response: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const { rpID, origin } = webauthnConfig(ctx);
      const ip = clientIp(ctx);
      const [ch] = await db.select().from(webauthnChallenges)
        .where(and(eq(webauthnChallenges.id, input.challengeId), eq(webauthnChallenges.type, "authentication"),
          gt(webauthnChallenges.expiresAt, new Date())))
        .limit(1);
      if (!ch) throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية المحاولة — حاول مجدداً" });
      await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, ch.id)); // أحادي الاستخدام حتى عند الفشل
      const credId = typeof input.response?.id === "string" ? input.response.id : "";
      const [cred] = await db.select().from(webauthnCredentials)
        .where(eq(webauthnCredentials.credentialId, credId)).limit(1);
      if (!cred) throw new TRPCError({ code: "UNAUTHORIZED", message: "البصمة غير مفعّلة — سجّل الدخول برقم الهاتف أو البريد وكلمة المرور" });
      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: input.response, expectedChallenge: ch.challenge,
          expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
          credential: {
            id: cred.credentialId,
            publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")),
            counter: cred.counter,
            transports: (cred.transports ?? undefined) as import("@simplewebauthn/server").AuthenticatorTransportFuture[] | undefined,
          },
        });
      } catch {
        verification = null;
      }
      if (!verification?.verified) {
        await logSecurityEvent("webauthn_login_failed", { ip, userAgent: ctx.req.headers["user-agent"] as string });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "فشل التحقق بالبصمة — استخدم كلمة المرور بدلاً منها" });
      }
      // عدّاد التوقيع يكشف استنساخ المصادق — يُحدَّث عند كل نجاح
      await db.update(webauthnCredentials).set({ counter: verification.authenticationInfo.newCounter })
        .where(eq(webauthnCredentials.id, cred.id));
      const [u] = await db.select().from(users).where(eq(users.id, cred.userId)).limit(1);
      if (!u || !u.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإدارة" });
      // الدخول بالبصمة يعني جهازاً موثوقاً — جلسة طويلة (30 يوماً) كـ«تذكرني»
      const token = await issueToken(u.id, u.role, true);
      return { ok: true, token, role: u.role, fullName: u.fullName };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const u = ctx.user;
    if (u.role === "student") {
      const s = await db.select().from(students).where(eq(students.userId, u.id)).limit(1);
      const birth = s[0]?.birthDate ? new Date(s[0].birthDate) : null;
      const age = birth ? Math.floor((Date.now() - birth.getTime()) / 3.156e10) : null;
      return { ...u, student: s[0] ?? null, age };
    }
    if (u.role === "teacher") {
      const t = await db.select().from(teachers).where(eq(teachers.userId, u.id)).limit(1);
      return { ...u, teacher: t[0] ?? null };
    }
    if (u.role === "admin") {
      const first = await db.select().from(adminSessions).orderBy(adminSessions.createdAt).limit(1);
      return { ...u, isFirstAdmin: first[0]?.userId === u.id };
    }
    return u;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const header = (ctx.req.headers["authorization"] as string) ?? "";
    const token = header.slice(7);
    await db.delete(authTokens).where(eq(authTokens.token, token));
    if (ctx.user.role === "admin")
      await db.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.jwtToken, token));
    return { ok: true };
  }),

  /**
   * حذف الحساب من صاحبه فقط.
   * الحذف الفيزيائي مقصود هنا: علاقات الطالب/المعلم ذات cascade تنظّف بيانات
   * الحساب التابعة، بينما نُبطل الرموز والجلسات ذاتياً قبل حذف users.
   * حسابات المسؤولين لا تُحذف من تطبيق العميل كحاجز أمان إضافي.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ confirmation: z.literal("حذف حسابي") }))
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "student") {
        throw new TRPCError({ code: "FORBIDDEN", message: "حذف الحساب الذاتي متاح للطلاب فقط حالياً" });
      }

      const deletion = await db.transaction(async (tx) => {
        const [user] = await tx.select({
          id: users.id,
          phone: users.phone,
          email: users.email,
          role: users.role,
          avatarUrl: users.avatarUrl,
        }).from(users).where(eq(users.id, ctx.user.id)).limit(1);

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود" });
        }
        if (user.role !== "student") {
          throw new TRPCError({ code: "FORBIDDEN", message: "حذف الحساب الذاتي متاح للطلاب فقط حالياً" });
        }

        const queue = await enqueueAccountDeletionMedia(
          tx,
          user,
          "account_deletion",
          { id: user.id, role: "student" },
        );
        await tx.delete(authTokens).where(eq(authTokens.userId, user.id));
        await tx.delete(adminSessions).where(eq(adminSessions.userId, user.id));
        await tx.delete(webauthnCredentials).where(eq(webauthnCredentials.userId, user.id));
        await tx.delete(webauthnChallenges).where(eq(webauthnChallenges.userId, user.id));

        // لا نترك مُعرّفات محاولات الدخول الخاصة بالحساب بعد الحذف.
        const identifiers = [
          ...(user.phone ? phoneVariants(user.phone) : []),
          ...(user.email ? [user.email] : []),
        ];
        if (identifiers.length > 0) {
          await tx.delete(studentPasswordLoginAttempts)
            .where(inArray(studentPasswordLoginAttempts.identifier, identifiers));
        }

        const deleted = await tx.delete(users).where(eq(users.id, user.id)).returning({ id: users.id });
        if (deleted.length !== 1) {
          throw new TRPCError({ code: "NOT_FOUND", message: "تعذر العثور على الحساب" });
        }
        return queue;
      });

      return {
        ok: true,
        deletionRequestId: deletion.requestId,
        mediaDeletionStatus: deletion.deletionStatus,
        pendingMediaJobs: deletion.pendingJobs,
        retainedSharedMedia: deletion.retainedShared,
      };
    }),
});
