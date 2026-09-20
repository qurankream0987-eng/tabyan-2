import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, authTokens, books, downloads, levels, notifications, recordings, sessions, students, users } from "@workspace/db";

import { canAccessObject, getObjectAclPolicy, ObjectPermission } from "../lib/objectAcl";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { FfprobeUnavailableError, probeVideoFile, validateMp4Structure, validateWebmStructure } from "../lib/videoStructure";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

type DirectDiagnosticSession = {
  cookieSecret: string;
  diagnosticId: string;
  objectPath: string;
  user: { id: string; role: string };
  expiresAt: number;
};

type MediaDiagnosticSession = {
  objectPath: string;
  userId: string;
  expiresAt: number;
};

const directDiagnosticSessions = new Map<string, DirectDiagnosticSession>();
const mediaDiagnosticSessions = new Map<string, MediaDiagnosticSession>();
const MAX_DIAGNOSTIC_SESSIONS = 100;
const TRANSIENT_STORAGE_CODES = new Set([
  "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENETUNREACH", "ETIMEDOUT",
]);
// Temporary controlled A/B instrumentation. Remove after the real-device test;
// it records only safe request metadata for these two objects.
const CONTROLLED_AB_OBJECTS = new Map<string, "original" | "diagnostic">([
  ["/objects/uploads/e48f5e4d-fb73-4d51-8708-92db519ccdd9", "original"],
  ["/objects/uploads/503c9afc-1283-447f-8480-f4fd5b9d7cde", "diagnostic"],
]);

function isTransientStorageError(error: unknown): boolean {
  const candidate = error as { code?: unknown; response?: { status?: unknown } };
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  const status = typeof candidate?.response?.status === "number" ? candidate.response.status : 0;
  return TRANSIENT_STORAGE_CODES.has(code) || status === 429 || status >= 500;
}

/** طلبات GCS الوصفية قد تنقطع قبل إرسال أي بايت. أعد المحاولة هنا فقط قبل كتابة الاستجابة. */
async function retryStorageRead<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientStorageError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}

const uploadBodySchema = z.object({
  name: z.string().min(1).max(300),
  size: z.number().int().positive().max(500 * 1024 * 1024),
  contentType: z.string().min(1).max(100),
  purpose: z.enum(["live_session_recording", "book_pdf", "placement_video", "qiraat_certificate"]).optional(),
});
const directDiagnosticSchema = z.object({
  objectPath: z.string().regex(/^\/objects\/[\w\-./]+$/),
  diagnosticId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
});
const sessionRecordingFinalizeSchema = z.object({
  sessionId: z.string().uuid(),
  objectPath: z.string().regex(/^\/objects\/uploads\/live-session-recordings\/[\w-]+$/),
  durationSeconds: z.number().int().min(1).max(4 * 60 * 60),
});

function recordingExpiry(from: Date): Date {
  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + 6);
  return expires;
}

async function canReadSessionRecording(userId: string, objectPath: string): Promise<boolean> {
  const rows = await db.select({ id: recordings.id }).from(recordings)
    .innerJoin(sessions, eq(recordings.sessionId, sessions.id))
    .where(and(
      eq(recordings.videoUrl, objectPath),
      eq(recordings.status, "ready"),
      eq(recordings.isDeleted, false),
    )).limit(1);
  if (!rows[0]) return false;
  const [recording] = await db.select({
    teacherId: recordings.teacherId,
    studentId: recordings.studentId,
  }).from(recordings).where(eq(recordings.id, rows[0].id)).limit(1);
  return recording?.teacherId === userId || recording?.studentId === userId;
}

/**
 * Validates the app's bearer token (Authorization header or ?token= query
 * for media tags) against the authTokens table. demo-/dev- tokens never pass.
 */
async function resolveUser(req: Request): Promise<{ id: string; role: string } | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : typeof req.query.token === "string" ? req.query.token : "";
  if (!token || token.startsWith("dev-") || token.startsWith("demo-")) return null;
  try {
    const rows = await db
      .select({ userId: authTokens.userId, role: authTokens.role })
      .from(authTokens)
      .innerJoin(users, eq(authTokens.userId, users.id))
      .where(and(eq(authTokens.token, token), gt(authTokens.expiresAt, new Date())))
      .limit(1);
    return rows[0] ? { id: rows[0].userId, role: rows[0].role } : null;
  } catch {
    return null;
  }
}

function diagnosticId(req: Request): string | null {
  const value = typeof req.query.diag === "string" ? req.query.diag : "";
  return /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? "";
  const pair = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function directSession(req: Request, id: string): DirectDiagnosticSession | null {
  const session = directDiagnosticSessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    directDiagnosticSessions.delete(id);
    return null;
  }
  return cookieValue(req, `tabyan_media_diag_${id}`) === session.cookieSecret ? session : null;
}

function pruneDiagnosticSessions() {
  const now = Date.now();
  for (const [id, session] of directDiagnosticSessions) {
    if (session.expiresAt <= now) directDiagnosticSessions.delete(id);
  }
  for (const [id, session] of mediaDiagnosticSessions) {
    if (session.expiresAt <= now) mediaDiagnosticSessions.delete(id);
  }
}

function mediaDiagnosticSession(
  id: string | null,
  userId: string,
  objectPath: string,
): boolean {
  if (!id) return false;
  const session = mediaDiagnosticSessions.get(id);
  return !!session && session.expiresAt > Date.now()
    && session.userId === userId && session.objectPath === objectPath;
}

function knownDiagnosticObject(id: string | null, objectPath: string): boolean {
  if (!id) return false;
  const session = mediaDiagnosticSessions.get(id);
  return !!session && session.expiresAt > Date.now() && session.objectPath === objectPath;
}

function directDiagnosticUser(req: Request, objectPath: string): { id: string; role: string } | null {
  const id = typeof req.query.direct === "string" ? req.query.direct : "";
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const session = directSession(req, id);
  return session?.objectPath === objectPath ? session.user : null;
}

/**
 * POST /storage/uploads/request-url
 * Client sends JSON metadata — NOT the file — and gets a presigned PUT URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  const parsed = uploadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "الحقول المطلوبة ناقصة أو غير صحيحة" });
    return;
  }
  try {
    if (parsed.data.purpose === "live_session_recording" && user.role !== "teacher") {
      res.status(403).json({ error: "المعلمون فقط يمكنهم تجهيز تسجيل الحلقة المباشرة" });
      return;
    }
    if (parsed.data.purpose === "placement_video") {
      if (user.role !== "student") {
        res.status(403).json({ error: "الطلاب فقط يمكنهم تجهيز فيديو اختبار القبول" });
        return;
      }
      if (!/\.mp4$/i.test(parsed.data.name) || parsed.data.contentType !== "video/mp4") {
        res.status(422).json({ error: "فيديو اختبار القبول يجب أن يكون MP4 صالحاً" });
        return;
      }
    }
    if (parsed.data.purpose === "qiraat_certificate") {
      if (user.role !== "student") {
        res.status(403).json({ error: "الطلاب فقط يمكنهم تجهيز شهادة القراءات" });
        return;
      }
      if (!/\.pdf$/i.test(parsed.data.name) || parsed.data.contentType !== "application/pdf") {
        res.status(422).json({ error: "شهادة القراءات يجب أن تكون ملف PDF صالحاً" });
        return;
      }
    }
    if (parsed.data.purpose === "book_pdf") {
      const isPdfName = /\.pdf$/i.test(parsed.data.name);
      if (!isPdfName || parsed.data.contentType !== "application/pdf") {
        res.status(422).json({ error: "ملف الكتاب يجب أن يكون PDF صالحاً بامتداد ومحتوى application/pdf" });
        return;
      }
    }
    const uploadURL = await objectStorageService.getObjectEntityUploadURL(
      parsed.data.purpose === "live_session_recording"
        ? "live_session_recording"
        : parsed.data.purpose === "book_pdf" || parsed.data.purpose === "qiraat_certificate"
          ? "book_pdf"
          : "default",
    );
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "تعذر تجهيز رابط الرفع" });
  }
});

/**
 * فحص بنيوي خفيف للملفات المرئية بعد الرفع — يفوّض التحقق إلى المدققات
 * النقية في lib/videoStructure (مختبرة وحدةً). يرفض الملفات الناقصة بنيوياً
 * (stub نصي، MP4 بلا ftyp/moov أو بصندوق يتجاوز حجم الملف، WebM بلا
 * Segment/Cluster) دون حد أدنى للحجم ودون إعادة ترميز.
 */
async function hasValidVideoStructure(
  objectFile: Awaited<ReturnType<ObjectStorageService["getObjectEntityFile"]>>,
): Promise<boolean | null> {
  const [metadata] = await objectFile.getMetadata();
  const size = Number(metadata.size ?? 0);
  const contentType = String(metadata.contentType ?? "");
  if (size <= 0) return contentType.startsWith("video/") ? false : null;

  const readRange = async (start: number, end: number): Promise<Buffer> => {
    const response = await objectStorageService.downloadObject(objectFile, 0, { start, end, total: size });
    return Buffer.from(await response.arrayBuffer());
  };

  const headLength = Math.min(size, 64 * 1024);
  const head = await readRange(0, headLength - 1);

  // الصيغة تُكشف من توقيع الملف الفعلي، لا من content-type الذي يتحكم به العميل
  const looksMp4 = head.length >= 8 && head.toString("latin1", 4, 8) === "ftyp";
  const looksWebm = head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;

  if (looksMp4 || looksWebm || contentType.startsWith("video/")) {
    const tail = size > headLength ? await readRange(Math.max(0, size - 64 * 1024), size - 1) : null;
    // الطبقة الأولى: فحص بنيوي سريع يرفض العوارض دون تنزيل الملف كاملاً
    const structureOk = looksMp4
      ? validateMp4Structure(head, tail, size)
      : looksWebm
        ? validateWebmStructure(head, tail, size)
        : false; // مُعلن كفيديو بلا توقيع معروف — مرفوض (لا تجاوز بتغيير النوع)
    if (!structureOk) return false;

    // الطبقة الثانية (الموثوقة): ffprobe يقرأ كل حزم الملف — يكشف أي بتر
    // في الوسط أو الذيل بما فيه mdat/Cluster غير معلوم الحجم.
    // التنزيل متدفق إلى ملف مؤقت — لا تحميل كامل في الذاكرة.
    const tempPath = join(tmpdir(), `tabyan-probe-${randomUUID()}`);
    try {
      const full = await objectStorageService.downloadObject(objectFile, 0);
      if (!full.body) return false;
      const out = createWriteStream(tempPath);
      await pipeline(Readable.fromWeb(full.body as ReadableStream<Uint8Array>), out);
      return await probeVideoFile(tempPath);
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  }
  return null; // ملف غير مرئي — لا فحص
}

const BOOK_PDF_MAX_BYTES = 500 * 1024 * 1024;

async function hasValidPdfStructure(
  objectFile: Awaited<ReturnType<ObjectStorageService["getObjectEntityFile"]>>,
): Promise<boolean> {
  const [metadata] = await objectFile.getMetadata();
  const size = Number(metadata.size ?? 0);
  if (size <= 0 || size > BOOK_PDF_MAX_BYTES || metadata.contentType !== "application/pdf") return false;
  const response = await objectStorageService.downloadObject(objectFile, 0, {
    start: 0,
    end: Math.min(size, 1024 * 1024) - 1,
    total: size,
  }, metadata);
  if (!response.body) return false;
  const head = Buffer.from(await response.arrayBuffer());
  return head.subarray(0, 5).toString("latin1") === "%PDF-";
}

/**
 * POST /storage/uploads/finalize
 * Called by the client after the PUT to GCS succeeds. Marks the object as
 * privately owned by the uploader so only they (and admins) can read it.
 */
router.post("/storage/uploads/finalize", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  const parsed = z.object({
    objectPath: z.string().regex(/^\/objects\/[\w\-./]+$/),
    purpose: z.enum(["live_session_recording", "book_pdf", "placement_video", "qiraat_certificate"]).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "مسار الملف ناقص أو غير صحيح" });
    return;
  }
  try {
    // منع سرقة الملكية: ملف سبق تأمينه لمالك آخر لا يجوز إعادة تعيينه
    const objectFile = await objectStorageService.getObjectEntityFile(parsed.data.objectPath);
    const existingPolicy = await getObjectAclPolicy(objectFile);
    if (existingPolicy && existingPolicy.owner !== user.id) {
      res.status(403).json({ error: "غير مسموح بهذا الإجراء" });
      return;
    }
    let structureOk: boolean | null;
    try {
      structureOk = parsed.data.purpose === "book_pdf" || parsed.data.purpose === "qiraat_certificate"
        ? await hasValidPdfStructure(objectFile)
        : await hasValidVideoStructure(objectFile);
    } catch (error) {
      // غياب أداة الفحص خطأ بنية تحتية في النشر — 500 مسجّل، لا 422 على المستخدم
      if (error instanceof FfprobeUnavailableError) {
        req.log.error({ objectPath: parsed.data.objectPath }, "ffprobe unavailable — video validation cannot run");
        res.status(500).json({ error: "خدمة فحص الفيديو غير متاحة حالياً — حاول لاحقاً" });
        return;
      }
      throw error;
    }
    if (structureOk === false && parsed.data.purpose === "book_pdf") {
      req.log.warn({ objectPath: parsed.data.objectPath, userId: user.id }, "Rejected upload: invalid PDF structure");
      res.status(422).json({ error: "الملف المرفوع ليس PDF صالحاً أو تجاوز الحجم المسموح" });
      return;
    }
    if (structureOk === false) {
      req.log.warn({ objectPath: parsed.data.objectPath, userId: user.id }, "Rejected upload: invalid video structure");
      res.status(422).json({ error: "الملف المرفوع ليس فيديو صالحاً — يبدو أنه مقطوع أو تالف. أعد التسجيل من جديد." });
      return;
    }
    const normalized = await objectStorageService.trySetObjectEntityAclPolicy(parsed.data.objectPath, {
      owner: user.id,
      visibility: "private",
    });
    res.json({ ok: true, objectPath: normalized });
  } catch (error) {
    req.log.error({ err: error }, "Error finalizing upload ACL");
    res.status(500).json({ error: "تعذر تأكيد اكتمال الرفع" });
  }
});

/**
 * Links a previously uploaded + finalized private object to a teacher's live
 * session. This is intentionally separate from endSession: a failed upload
 * must never prevent the lesson from being completed or evaluated.
 */
router.post("/storage/live-session-recordings/finalize", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  if (process.env.LIVE_SESSION_RECORDING_ENABLED !== "true") {
    res.status(404).json({ error: "تسجيل الحلقات المباشرة غير مفعّل حالياً" });
    return;
  }
  const parsed = sessionRecordingFinalizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات التسجيل غير صالحة" });
    return;
  }

  try {
    const [session] = await db.select({
      teacherId: sessions.teacherId,
      studentId: sessions.studentId,
      status: sessions.status,
    }).from(sessions).where(eq(sessions.id, parsed.data.sessionId)).limit(1);
    if (!session || session.teacherId !== user.id || !session.studentId) {
      res.status(403).json({ error: "غير مسموح بهذا الإجراء" });
      return;
    }
    if (!["in_progress", "completed"].includes(session.status)) {
      res.status(409).json({ error: "هذه الحلقة غير مؤهلة للتسجيل" });
      return;
    }

    const [existing] = await db.select({ id: recordings.id }).from(recordings)
      .where(and(eq(recordings.sessionId, parsed.data.sessionId), eq(recordings.status, "ready"), eq(recordings.isDeleted, false)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "يوجد تسجيل مكتمل لهذه الحلقة مسبقاً" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(parsed.data.objectPath);
    const policy = await getObjectAclPolicy(objectFile);
    if (!policy || policy.visibility !== "private" || policy.owner !== user.id) {
      res.status(403).json({ error: "ملف التسجيل غير مؤكَّد لهذا المعلم" });
      return;
    }
    const [metadata] = await objectFile.getMetadata();
    const bytes = Number(metadata.size ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0 || !String(metadata.contentType ?? "").startsWith("video/")) {
      res.status(422).json({ error: "ملف التسجيل ليس فيديو صالحاً مكتملاً" });
      return;
    }

    const readyAt = new Date();
    const id = randomUUID();
    await db.insert(recordings).values({
      id,
      sessionId: parsed.data.sessionId,
      teacherId: user.id,
      studentId: session.studentId,
      videoUrl: parsed.data.objectPath,
      durationSeconds: parsed.data.durationSeconds,
      fileSizeMb: (bytes / (1024 * 1024)).toFixed(2),
      status: "ready",
      readyAt,
      expiresAt: recordingExpiry(readyAt),
    });
    await db.insert(notifications).values({
      id: randomUUID(),
      userId: session.studentId,
      title: "تسجيل حلقتك جاهز",
      body: "يمكنك مشاهدته في صفحة تسجيلاتي خلال ستة أشهر.",
      type: "recording",
    });
    res.status(201).json({ ok: true, recordingId: id, expiresAt: recordingExpiry(readyAt).toISOString() });
  } catch (error) {
    const pgCode = (error as { cause?: { code?: string }; code?: string }).cause?.code
      ?? (error as { code?: string }).code;
    if (pgCode === "23505") {
      res.status(409).json({ error: "يوجد تسجيل مكتمل لهذه الحلقة مسبقاً" });
      return;
    }
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "ملف التسجيل غير موجود" });
      return;
    }
    req.log.error({ err: error, sessionId: parsed.data.sessionId }, "Error finalizing live session recording");
    res.status(500).json({ error: "تعذر ربط تسجيل الحلقة المباشرة" });
  }
});

/**
 * GET /storage/books/:id/download
 * A student-facing download endpoint. It checks publication and curriculum
 * eligibility before starting the private object stream, then records the
 * download only after the storage stream has successfully produced its first
 * byte.
 */
router.get("/storage/books/:id/download", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user || user.role !== "student") {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  const rawBookId = req.params.id;
  const bookId = Array.isArray(rawBookId) ? rawBookId[0] : rawBookId;
  try {
    const [book] = await db.select().from(books)
      .where(and(eq(books.id, bookId), eq(books.status, "published"))).limit(1);
    if (!book || book.contentType !== "pdf" || book.sourceType !== "uploaded") {
      res.status(404).json({ error: "الكتاب غير متاح للتنزيل" });
      return;
    }
    const objectPath = book.fileObjectKey ?? book.fileUrl;
    if (!objectPath?.startsWith("/objects/")) {
      res.status(404).json({ error: "لا يوجد ملف مرفوع لهذا الكتاب" });
      return;
    }

    if (book.section === "curriculum") {
      const [student] = await db.select({ currentLevelId: students.currentLevelId })
        .from(students).where(eq(students.userId, user.id)).limit(1);
      const [currentLevel] = student?.currentLevelId
        ? await db.select().from(levels).where(eq(levels.id, student.currentLevelId)).limit(1)
        : [];
      const allIds = Array.isArray(book.levelIds)
        ? (book.levelIds as unknown[]).filter((id): id is number => Number.isInteger(id))
        : [];
      if (allIds.length > 0 && (!currentLevel || !allIds.includes(currentLevel.id))) {
        const assignedLevels = await db.select({
          id: levels.id, path: levels.path, nameEn: levels.nameEn, orderIndex: levels.orderIndex,
        }).from(levels);
        const eligible = allIds.some((id) => {
          const target = assignedLevels.find((level) => level.id === id);
          return !!target && !!currentLevel
            && target.path === currentLevel.path
            && (currentLevel.path !== "sharia" || target.nameEn === currentLevel.nameEn)
            && target.orderIndex <= currentLevel.orderIndex;
        });
        if (!eligible) {
          res.status(403).json({ error: "هذا الكتاب غير متاح لمستواك الحالي" });
          return;
        }
      }
    }

    const objectFile = await retryStorageRead(() => objectStorageService.getObjectEntityFile(objectPath));
    const [metadata] = await retryStorageRead(() => objectFile.getMetadata());
    const response = await retryStorageRead(() => objectStorageService.downloadObject(objectFile, 0, undefined, metadata));
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const safeName = book.title.replace(/[\r\n"\\/:*?<>|]+/g, " ").trim().slice(0, 150) || "book";
    const inline = req.query.inline === "1";
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="book.pdf"; filename*=UTF-8''${encodeURIComponent(`${safeName}.pdf`)}`);

    try {
      await db.insert(downloads).values({ id: randomUUID(), studentId: user.id, bookId: book.id });
    } catch (error) {
      const pgCode = (error as { cause?: { code?: string }; code?: string }).cause?.code
        ?? (error as { code?: string }).code;
      if (pgCode !== "23505") throw error;
    }
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "ملف الكتاب غير موجود" });
      return;
    }
    req.log.error({ err: error, bookId }, "Error downloading book");
    if (!res.headersSent) res.status(500).json({ error: "تعذر تنزيل الكتاب حالياً" });
  }
});

/**
 * Registers a short-lived diagnostic ID for one authorized user/object pair.
 * The later media trace accepts that ID only for this exact pair.
 */
router.post("/storage/diagnostic-session", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  const parsed = directDiagnosticSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب تشخيص غير صالح" });
    return;
  }
  try {
    pruneDiagnosticSessions();
    if (mediaDiagnosticSessions.size >= MAX_DIAGNOSTIC_SESSIONS) {
      res.status(429).json({ error: "عدد كبير من عمليات التشخيص النشطة" });
      return;
    }
    const objectFile = await objectStorageService.getObjectEntityFile(parsed.data.objectPath);
    if (user.role !== "admin") {
      const allowed = await canAccessObject({
        userId: user.id,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!allowed) {
        res.status(403).json({ error: "غير مسموح بهذا الإجراء" });
        return;
      }
    }
    const existing = mediaDiagnosticSessions.get(parsed.data.diagnosticId);
    if (existing && (existing.userId !== user.id || existing.objectPath !== parsed.data.objectPath)) {
      res.status(409).json({ error: "معرّف التشخيص مستخدم بالفعل" });
      return;
    }
    mediaDiagnosticSessions.set(parsed.data.diagnosticId, {
      userId: user.id,
      objectPath: parsed.data.objectPath,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    req.log.error({ err: error }, "Error registering media diagnostic");
    res.status(500).json({ error: "تعذر تسجيل التشخيص" });
  }
});

/**
 * Creates a two-minute, cookie-protected direct player page for a media
 * diagnostic. The browser URL contains only an opaque ID — never the app
 * bearer token or the protected object key.
 */
router.post("/storage/diagnostic-direct", async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  const parsed = directDiagnosticSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب تشخيص غير صالح" });
    return;
  }
  try {
    pruneDiagnosticSessions();
    if (!mediaDiagnosticSession(parsed.data.diagnosticId, user.id, parsed.data.objectPath)) {
      res.status(409).json({ error: "انتهت صلاحية جلسة التشخيص" });
      return;
    }
    if (directDiagnosticSessions.size >= MAX_DIAGNOSTIC_SESSIONS) {
      res.status(429).json({ error: "عدد كبير من عمليات التشخيص النشطة" });
      return;
    }
    const objectFile = await objectStorageService.getObjectEntityFile(parsed.data.objectPath);
    if (user.role !== "admin") {
      const allowed = await canAccessObject({
        userId: user.id,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!allowed) {
        res.status(403).json({ error: "غير مسموح بهذا الإجراء" });
        return;
      }
    }

    const id = randomUUID();
    const cookieSecret = randomUUID();
    directDiagnosticSessions.set(id, {
      cookieSecret,
      diagnosticId: parsed.data.diagnosticId,
      objectPath: parsed.data.objectPath,
      user,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    res.cookie(`tabyan_media_diag_${id}`, cookieSecret, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/api/storage/",
      maxAge: 2 * 60 * 1000,
    });
    req.log.info({ diagnosticId: parsed.data.diagnosticId, mediaTrace: "direct-page-created" }, "Media diagnostic direct page created");
    res.json({ url: `/api/storage/diagnostic-direct/${id}` });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    req.log.error({ err: error }, "Error creating media diagnostic page");
    res.status(500).json({ error: "تعذر إنشاء صفحة التشخيص" });
  }
});

router.get("/storage/diagnostic-direct/:id", (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    res.status(404).end();
    return;
  }
  const session = directSession(req, id);
  if (!session) {
    res.status(401).type("text/plain").send("Diagnostic player session expired.");
    return;
  }
  const src = `/api/storage${session.objectPath}?diag=${encodeURIComponent(session.diagnosticId)}&direct=${encodeURIComponent(id)}`;
  res
    .setHeader("Cache-Control", "no-store")
    .setHeader("Content-Security-Policy", "default-src 'none'; media-src 'self'; style-src 'unsafe-inline'")
    .type("html")
    .send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اختبار الفيديو المباشر</title><style>body{margin:0;background:#111;color:#fff;font-family:system-ui;padding:18px}video{width:100%;max-height:85vh;background:#000}p{font-size:14px}</style><p>اختبار الفيديو المباشر — أعد للنافذة السابقة وحدد النتيجة.</p><video controls preload="metadata" src="${src}"></video></html>`);
});

/**
 * GET /storage/public-objects/*
 * Unconditionally public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "تعذر تقديم الملف العام" });
  }
});

/**
 * GET /storage/objects/*
 * Serves private object entities — requires a valid app token
 * (Authorization header or ?token= for <video>/<img> tags).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  let traceId = diagnosticId(req);
  const traceStartedAt = Date.now();
  let clientAborted = false;
  let streamErrorCode: string | null = null;
  let finalTraceWritten = false;
  req.once("aborted", () => {
    clientAborted = true;
  });
  const writeTrace = (
    status: number,
    outcome: string,
    fields: Record<string, unknown> = {},
  ) => {
    if (!traceId || finalTraceWritten) return;
    finalTraceWritten = true;
    req.log.info({
      diagnosticId: traceId,
      mediaTrace: "final",
      outcome,
      method: req.method,
      range: req.headers.range ?? null,
      status,
      rangeStart: null,
      rangeEnd: null,
      totalObjectSize: null,
      contentType: null,
      contentLength: null,
      contentRange: null,
      acceptRanges: null,
      contentEncoding: "identity",
      objectLabel: controlledObjectLabel,
      authorizationPresent: controlledObjectLabel ? /^Bearer\s+\S+$/i.test(req.headers.authorization ?? "") : null,
      userAgent: controlledObjectLabel ? String(req.headers["user-agent"] ?? "").slice(0, 200) || null : null,
      clientAborted,
      streamError: streamErrorCode !== null,
      streamErrorCode,
      elapsedMs: Date.now() - traceStartedAt,
      ...fields,
    }, "Media diagnostic request complete");
  };
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
  const objectPath = `/objects/${wildcardPath}`;
  const controlledObjectLabel = CONTROLLED_AB_OBJECTS.get(objectPath) ?? null;
  if (controlledObjectLabel && !traceId) traceId = `controlled-ab-${controlledObjectLabel}`;
  let user = await resolveUser(req);
  if (!user) user = directDiagnosticUser(req, objectPath);
  if (!user) {
    if (!knownDiagnosticObject(traceId, objectPath) && !controlledObjectLabel) traceId = null;
    writeTrace(401, "authorization-failed");
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  if (!controlledObjectLabel && !mediaDiagnosticSession(traceId, user.id, objectPath)) traceId = null;
  try {
    const objectFile = await retryStorageRead(() => objectStorageService.getObjectEntityFile(objectPath));

    // المسؤول يقرأ كل شيء؛ المالك يقرأ ملفه، والطرفان في تسجيل حلقة
    // نهائي يملكان حق مشاهدة الرابط المحدد فقط.
    if (user.role !== "admin") {
      const allowed = await canAccessObject({
        userId: user.id,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!allowed && !(await canReadSessionRecording(user.id, objectPath))) {
        writeTrace(403, "acl-forbidden");
        res.status(403).json({ error: "غير مسموح بهذا الإجراء" });
        return;
      }
    }

    const [metadata] = await retryStorageRead(() => objectFile.getMetadata());
    const totalSize = Number(metadata.size ?? 0);
    const rangeHeader = req.headers.range;
    let range: { start: number; end: number; total: number } | undefined;

    if (rangeHeader && totalSize > 0) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match && (match[1] || match[2])) {
        if (!match[1]) {
          // Suffix range: bytes=-N يعني آخر N بايت
          const suffixLength = Number(match[2]);
          if (suffixLength <= 0) {
            writeTrace(416, "range-not-satisfiable", { totalObjectSize: totalSize });
            res.status(416).setHeader("Content-Range", `bytes */${totalSize}`).json({ error: "نطاق البيانات المطلوب غير صالح" });
            return;
          }
          const start = Math.max(totalSize - suffixLength, 0);
          range = { start, end: totalSize - 1, total: totalSize };
        } else {
          const start = Number(match[1]);
          const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;
          if (start >= totalSize || end < start) {
            writeTrace(416, "range-not-satisfiable", { totalObjectSize: totalSize });
            res.status(416).setHeader("Content-Range", `bytes */${totalSize}`).json({ error: "نطاق البيانات المطلوب غير صالح" });
            return;
          }
          range = { start, end, total: totalSize };
        }
      }
      // الترويسة المشوهة تُتجاهل ويُقدَّم الملف كاملاً (200) وفق RFC 9110
    }

    const response = await retryStorageRead(() => objectStorageService.downloadObject(objectFile, 3600, range, metadata));
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (traceId) {
      const responseTrace = {
        rangeStart: range?.start ?? null,
        rangeEnd: range?.end ?? null,
        totalObjectSize: range?.total ?? totalSize,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        contentRange: response.headers.get("content-range"),
        acceptRanges: response.headers.get("accept-ranges"),
        contentEncoding: response.headers.get("content-encoding") ?? "identity",
      };
      let pipelineSettled = false;
      let responseFinished = false;
      let responseClosed = false;
      const finalizeStreamTrace = () => {
        // `close` may fire while pipeline() is still unwinding. Defer the
        // classification until the stream result is known, so stream-error
        // always wins over a concurrent client close.
        if (!pipelineSettled) return;
        if (streamErrorCode !== null) {
          writeTrace(response.status, "stream-error", responseTrace);
        } else if (responseFinished || res.writableEnded) {
          writeTrace(response.status, "finished", responseTrace);
        } else if (responseClosed) {
          writeTrace(response.status, "closed", responseTrace);
        }
      };
      res.once("finish", () => {
        responseFinished = true;
        finalizeStreamTrace();
      });
      res.once("close", () => {
        responseClosed = true;
        if (!res.writableEnded) clientAborted = true;
        finalizeStreamTrace();
      });
      if (response.body) {
        const source = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        try {
          await pipeline(source, res);
          pipelineSettled = true;
          finalizeStreamTrace();
        } catch (streamError) {
          streamErrorCode = (streamError as NodeJS.ErrnoException).code ?? "unknown";
          pipelineSettled = true;
          if (traceId) {
            req.log.info({
              diagnosticId: traceId,
              mediaTrace: "stream-error",
              method: req.method,
              range: req.headers.range ?? null,
              clientAborted,
              streamError: true,
              errorCode: streamErrorCode,
            }, "Media diagnostic stream error");
          }
          // انقطاع العميل أثناء البث متوقع عند التمرير/الإغلاق — لا يُسجَّل كخطأ خادم
          if (!res.writableEnded && !(streamError as NodeJS.ErrnoException).code?.match(/^(ERR_STREAM_PREMATURE_CLOSE|ECONNRESET)$/)) {
            req.log.warn({ err: streamError }, "Stream interrupted while serving object");
          }
          source.destroy();
          finalizeStreamTrace();
        }
      } else {
        pipelineSettled = true;
        res.end();
      }
      return;
    }
    if (response.body) {
      const source = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      try {
        await pipeline(source, res);
      } catch (streamError) {
        streamErrorCode = (streamError as NodeJS.ErrnoException).code ?? "unknown";
        if (traceId) {
          req.log.info({
            diagnosticId: traceId,
            mediaTrace: "stream-error",
            method: req.method,
            range: req.headers.range ?? null,
            clientAborted,
            streamError: true,
            errorCode: streamErrorCode,
          }, "Media diagnostic stream error");
        }
        // انقطاع العميل أثناء البث متوقع عند التمرير/الإغلاق — لا يُسجَّل كخطأ خادم
        if (!res.writableEnded && !(streamError as NodeJS.ErrnoException).code?.match(/^(ERR_STREAM_PREMATURE_CLOSE|ECONNRESET)$/)) {
          req.log.warn({ err: streamError }, "Stream interrupted while serving object");
        }
        source.destroy();
        writeTrace(response.status, "stream-error", {
          rangeStart: range?.start ?? null,
          rangeEnd: range?.end ?? null,
          totalObjectSize: range?.total ?? totalSize,
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
          contentRange: response.headers.get("content-range"),
          acceptRanges: response.headers.get("accept-ranges"),
          contentEncoding: response.headers.get("content-encoding") ?? "identity",
        });
      }
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      writeTrace(404, "object-not-found");
      res.status(404).json({ error: "الملف غير موجود" });
      return;
    }
    writeTrace(500, "storage-error");
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "تعذر تقديم الملف" });
  }
});

export default router;
