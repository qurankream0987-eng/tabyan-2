import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

// ── Mock @workspace/db ─────────────────────────────────────────────────────
// Chainable/thenable builder (نفس نمط teacher.evaluate.test.ts) مع دعم
// db.transaction وdb.delete وtx.execute لاختبار إجراءات الحسابات وpasswordLogin.

const selectResults: unknown[][] = [];
const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const updated: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const deleted: Array<{ table: unknown }> = [];

function makeBuilder(result: unknown[]) {
  const builder: any = {};
  const chain = () => builder;
  for (const m of ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy", "groupBy"]) {
    builder[m] = vi.fn(chain);
  }
  builder.then = (resolve: (v: unknown[]) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function makeDb() {
  const dbObj: any = {
    select: vi.fn(() => makeBuilder(selectResults.shift() ?? [])),
    insert: vi.fn((table: unknown) => {
      const builder: any = {
        values: vi.fn((values: Record<string, unknown>) => {
          if (Array.isArray(values)) {
            for (const value of values) inserted.push({ table, values: value });
          } else {
            inserted.push({ table, values });
          }
          return builder;
        }),
        onConflictDoUpdate: vi.fn(async () => undefined),
        onConflictDoNothing: vi.fn(async () => undefined),
      };
      return builder;
    }),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          updated.push({ table, values });
        }),
      })),
    })),
    delete: vi.fn((table: unknown) => {
      const builder: any = {
        where: vi.fn(() => {
          deleted.push({ table });
          return (table as { __table?: string }).__table === "users"
            ? { returning: vi.fn(async () => [{ id: TARGET_ID }]) }
            : Promise.resolve();
        }),
      };
      return builder;
    }),
    execute: vi.fn(async () => []),
  };
  dbObj.transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(dbObj));
  return dbObj;
}

vi.mock("@workspace/db", () => {
  const tableProxy = (name: string) =>
    new Proxy({ __table: name }, { get: (t: any, p) => (p in t ? t[p] : `${name}.${String(p)}`) });
  const names = [
    "adminNotificationsSent", "adminSessions", "assessmentAttempts", "assessmentQuestions",
    "assessments", "auditLogs", "authTokens", "bookmarks", "books", "evaluations",
    "accountDeletionRequests", "privateMediaDeletionJobs", "userStorageObjects",
    "fatwaAnswers", "fatwaQuestions", "fatwaRatings", "levels", "muftiAssignments",
    "notifications", "promotionRequests", "qiraatCertificates", "recordings", "sessions", "sessionParticipants",
    "studentProgress", "students", "studentSettings", "systemSettings", "teachers", "teacherSettings", "users",
    "weeklySchedules", "securityEvents", "adminLoginAttempts", "studentPasswordLoginAttempts",
    "otpCodes", "otpRequests",
    "webauthnCredentials", "webauthnChallenges", "googleAuthTickets", "emailVerifications",
    "scheduleChangeRequests", "teacherMessages", "teacherBroadcasts", "phoneChangeRequests",
    "shariaContent", "shariaSubjects", "levelContent", "teacherCertificates",
  ];
  const tables = Object.fromEntries(names.map((n) => [n, tableProxy(n)]));
  return { db: makeDb(), ...tables };
});

import {
  accountDeletionRequests,
  adminSessions,
  authTokens,
  auditLogs,
  privateMediaDeletionJobs,
  studentPasswordLoginAttempts,
  users,
  userStorageObjects,
  webauthnChallenges,
  webauthnCredentials,
} from "@workspace/db";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import type { TrpcContext } from "../context";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

describe("auth contract after external sign-in removal", () => {
  it("keeps password sign-in and exposes no Google, Clerk, or Replit Auth procedures", () => {
    const procedures = Object.keys(authRouter._def.procedures);
    expect(procedures).toEqual(expect.arrayContaining([
      "completeProfile",
      "studentPasswordLogin",
      "passwordLogin",
    ]));
    expect(procedures.filter((name) => /google|clerk|replit|external/i.test(name))).toEqual([]);
  });
});

const adminCtx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: ADMIN_ID, fullName: "مشرف", phone: null, role: "admin" },
} as never;

beforeEach(() => {
  selectResults.length = 0;
  inserted.length = 0;
  updated.length = 0;
  deleted.length = 0;
});

describe("admin.accountSetActive — إيقاف الحساب", () => {
  it("يوقف الحساب ويُنهي جلساته ورموزه ويسجّل التدقيق في معاملة", async () => {
    selectResults.push([{ id: TARGET_ID, role: "teacher", username: "t.demo", createdBy: ADMIN_ID }]);
    const caller = adminRouter.createCaller(adminCtx);
    const res = await caller.accountSetActive({ userId: TARGET_ID, isActive: false });
    expect(res).toEqual({ ok: true });

    const userUpdate = updated.find((u) => u.table === users);
    expect(userUpdate?.values).toEqual({ isActive: false });
    // إنهاء الجلسات والرموز
    expect(updated.some((u) => u.table === adminSessions && u.values.isActive === false)).toBe(true);
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    // سجل التدقيق
    const audit = inserted.find((i) => i.table === auditLogs);
    expect(audit?.values.action).toBe("deactivate_account");
    expect(audit?.values.targetId).toBe(TARGET_ID);
  });

  it("يرفض إيقاف حساب المشرف لنفسه", async () => {
    const caller = adminRouter.createCaller(adminCtx);
    await expect(caller.accountSetActive({ userId: ADMIN_ID, isActive: false }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("يرفض حساباً خارج نطاق حسابات الإشراف (بلا createdBy)", async () => {
    selectResults.push([{ id: TARGET_ID, role: "teacher", username: "t.demo", createdBy: null }]);
    const caller = adminRouter.createCaller(adminCtx);
    await expect(caller.accountSetActive({ userId: TARGET_ID, isActive: false }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("auth.deleteAccount — حذف الحساب من صاحبه", () => {
  it("does not discover or link an unreferenced historical storage object", async () => {
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: null,
    }], [], [], [], []);
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({ ok: true });
    expect(inserted.some((entry) => entry.table === userStorageObjects)).toBe(false);
    expect(inserted.some((entry) => entry.table === privateMediaDeletionJobs)).toBe(false);
  });

  it("classifies an unregistered historical object only from an exact account-row path", async () => {
    const exactPath = "/objects/legacy/profile-image";
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: exactPath,
    }], [], [], [], [], [], [{
      ownerUserId: TARGET_ID,
      objectPath: exactPath,
      purpose: "user_upload",
      status: "reserved",
    }], [], []);
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({
      ok: true,
      mediaDeletionStatus: "pending",
      pendingMediaJobs: 1,
    });
    expect(inserted.some((entry) => entry.table === userStorageObjects
      && entry.values.ownerUserId === TARGET_ID
      && entry.values.objectPath === exactPath)).toBe(true);
    expect(inserted.some((entry) => entry.table === privateMediaDeletionJobs
      && entry.values.objectPath === exactPath)).toBe(true);
  });

  it("stops historical linking when another account row references the same exact path", async () => {
    const sharedPath = "/objects/legacy/ambiguous-avatar";
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: sharedPath,
    }], [], [], [], [], [], [{
      ownerUserId: TARGET_ID,
      objectPath: sharedPath,
      purpose: "user_upload",
      status: "reserved",
    }], [{ id: ADMIN_ID }]);
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(deleted.some((entry) => entry.table === users)).toBe(false);
    expect(inserted.some((entry) => entry.table === privateMediaDeletionJobs)).toBe(false);
  });

  it("retains an exact historical path that is also referenced by shared library content", async () => {
    const sharedPath = "/objects/legacy/shared-library-file";
    selectResults.push(
      [{
        id: TARGET_ID,
        phone: "+966500000003",
        email: "student@example.com",
        role: "student",
        avatarUrl: sharedPath,
      }],
      [],
      [],
      [],
      [],
      [],
      [{
        ownerUserId: TARGET_ID,
        objectPath: sharedPath,
        purpose: "user_upload",
        status: "reserved",
      }],
      ...Array.from({ length: 9 }, () => []),
      [{ fileObjectKey: sharedPath, fileUrl: sharedPath, audioUrl: null }],
      [],
      [],
      [],
    );
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({
      ok: true,
      mediaDeletionStatus: "completed",
      pendingMediaJobs: 0,
      retainedSharedMedia: 1,
    });
    expect(inserted.some((entry) => entry.table === privateMediaDeletionJobs
      && entry.values.objectPath === sharedPath
      && entry.values.status === "retained"
      && entry.values.lastErrorCode === "shared_library_asset_retained")).toBe(true);
    expect(updated.some((entry) => entry.table === userStorageObjects
      && entry.values.status === "retained")).toBe(true);
  });

  it("يجدوِل فيديو قبول مملوكاً للطالب ويحذف الحساب مع إبقاء الطلب قيد التنفيذ", async () => {
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: null,
    }], [{
      placementTestVideoUrl: "/objects/uploads/student-placement-proof",
    }], [], [], [{
      ownerUserId: TARGET_ID,
      objectPath: "/objects/uploads/student-placement-proof",
      purpose: "student_placement_video",
      status: "reserved",
    }], [], []);
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({
      ok: true,
      mediaDeletionStatus: "pending",
      pendingMediaJobs: 1,
    });
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnCredentials)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnChallenges)).toBe(true);
    expect(deleted.some((d) => d.table === studentPasswordLoginAttempts)).toBe(true);
    expect(deleted.some((d) => d.table === users)).toBe(true);
    expect(inserted.some((i) => i.table === accountDeletionRequests
      && i.values.userId === TARGET_ID
      && i.values.requestedByRole === "student"
      && i.values.status === "pending")).toBe(true);
    expect(inserted.some((i) => i.table === privateMediaDeletionJobs
      && i.values.objectPath === "/objects/uploads/student-placement-proof"
      && i.values.deletionReason === "account_deletion"
      && i.values.status === "pending")).toBe(true);
    expect(updated.some((u) => u.table === userStorageObjects && u.values.status === "queued")).toBe(true);
  });

  it("queues an unknown-purpose private upload when registry ownership is proven", async () => {
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: null,
    }], [], [], [], [{
      ownerUserId: TARGET_ID,
      objectPath: "/objects/uploads/private-audio",
      purpose: "new_private_audio",
      status: "reserved",
    }], [], []);

    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({
      ok: true,
      mediaDeletionStatus: "pending",
      pendingMediaJobs: 1,
    });

    const deletionJobs = inserted.filter((i) => i.table === privateMediaDeletionJobs);
    expect(deletionJobs.map((job) => [job.values.objectPath, job.values.mediaType])).toEqual([
      ["/objects/uploads/private-audio", "other_private_media"],
    ]);
    expect(deletionJobs[0].values.deletionReason).toBe("account_deletion");
  });

  it("retains a session recording only when another live participant is linked", async () => {
    const sharedVideoPath = "/objects/shared/placement-proof";
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
      role: "student",
      avatarUrl: null,
    }], [{
      placementTestVideoUrl: sharedVideoPath,
    }], [], [], [{
      ownerUserId: TARGET_ID,
      objectPath: sharedVideoPath,
      purpose: "live_session_recording",
      status: "reserved",
    }],
      ...Array.from({ length: 11 }, () => []),
    [{
      objectPath: sharedVideoPath,
      sessionId: "33333333-3333-4333-8333-333333333333",
      teacherId: "44444444-4444-4444-8444-444444444444",
      studentId: TARGET_ID,
    }], [{
      sessionId: "33333333-3333-4333-8333-333333333333",
      studentId: TARGET_ID,
    }], []);

    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toMatchObject({
      ok: true,
      mediaDeletionStatus: "completed",
      pendingMediaJobs: 0,
      retainedSharedMedia: 1,
    });
    expect(inserted.some((i) => i.table === privateMediaDeletionJobs
      && i.values.objectPath === sharedVideoPath
      && i.values.deletionReason === "account_deletion"
      && i.values.status === "retained"
      && i.values.lastErrorCode === "shared_recording_retained_for_other_participant")).toBe(true);
    expect(updated.some((u) => u.table === userStorageObjects
      && u.values.status === "retained")).toBe(true);
    expect(updated.some((u) => u.table === userStorageObjects
      && u.values.ownerUserId === null)).toBe(true);
  });

  it("يرفض حذف حساب المشرف من تطبيق العميل", async () => {
    const caller = authRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: ADMIN_ID, fullName: "مشرف", phone: null, role: "admin" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(["teacher", "supervisor"])("لا يتيح الحذف الذاتي لدور %s", async (role) => {
    const caller = authRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: TARGET_ID, fullName: "حساب محمي", phone: null, role },
    } as never);
    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.userDelete — حذف المستخدم من لوحة المشرف", () => {
  it("يحذف الطالب فعلياً ويبطل الرموز والجلسات وبيانات الدخول", async () => {
    selectResults.push([{
      id: TARGET_ID,
      role: "student",
      phone: "+966500000003",
      email: "student@example.com",
      username: null,
      fullName: "طالب تجريبي",
    }]);
    const caller = adminRouter.createCaller(adminCtx);

    await expect(caller.userDelete({ userId: TARGET_ID, confirm: "حذف" })).resolves.toEqual({ ok: true });
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    expect(updated.some((u) => u.table === adminSessions && u.values.isActive === false)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnCredentials)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnChallenges)).toBe(true);
    expect(deleted.some((d) => d.table === users)).toBe(true);
    expect(inserted.find((i) => i.table === auditLogs)?.values.action).toBe("delete_user");
  });

  it("يمنع حذف المشرف أو الحساب الحالي", async () => {
    await expect(adminRouter.createCaller(adminCtx).userDelete({ userId: ADMIN_ID, confirm: "حذف" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    selectResults.push([{
      id: TARGET_ID, role: "admin", phone: null, email: null,
      username: "other.admin", fullName: "مشرف آخر",
    }]);
    await expect(adminRouter.createCaller(adminCtx).userDelete({ userId: TARGET_ID, confirm: "حذف" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    selectResults.push([{
      id: TARGET_ID, role: "teacher", phone: "+966500000004", email: null,
      username: "teacher.demo", fullName: "معلم تجريبي",
    }]);
    await expect(adminRouter.createCaller(adminCtx).userDelete({ userId: TARGET_ID, confirm: "حذف" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    selectResults.push([{
      id: TARGET_ID, role: "supervisor", phone: "+966500000005", email: null,
      username: "supervisor.demo", fullName: "مشرف تعليمي",
    }]);
    await expect(adminRouter.createCaller(adminCtx).userDelete({ userId: TARGET_ID, confirm: "حذف" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.settingsUpdate — تعطيل حذف التسجيلات حسب المدة", () => {
  it("يرفض إعادة تفعيل إعداد الاحتفاظ الزمني القديم", async () => {
    await expect(adminRouter.createCaller(adminCtx).settingsUpdate({
      key: "recording_retention_months",
      value: "6",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(inserted.some((row) => row.values.key === "recording_retention_months")).toBe(false);
  });
});

describe("admin.accountResetPassword — إعادة تعيين كلمة السر", () => {
  it("يحدّث passwordHash (bcrypt) ويُنهي الجلسات ويسجّل التدقيق", async () => {
    selectResults.push([{ id: TARGET_ID, role: "admin", username: "s.demo", createdBy: ADMIN_ID }]);
    const caller = adminRouter.createCaller(adminCtx);
    const res = await caller.accountResetPassword({ userId: TARGET_ID, password: "abcd1234" });
    expect(res).toEqual({ ok: true });

    const userUpdate = updated.find((u) => u.table === users);
    const hash = userUpdate?.values.passwordHash as string;
    expect(await bcrypt.compare("abcd1234", hash)).toBe(true);
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    expect(inserted.find((i) => i.table === auditLogs)?.values.action).toBe("reset_account_password");
  });
});

describe("admin.accountTerminateSessions — إنهاء الجلسات", () => {
  it("يُنهي adminSessions وauthTokens ويسجّل التدقيق دون تغيير حالة الحساب", async () => {
    selectResults.push([{ id: TARGET_ID, role: "admin", username: "s.demo", createdBy: ADMIN_ID }]);
    const caller = adminRouter.createCaller(adminCtx);
    const res = await caller.accountTerminateSessions({ userId: TARGET_ID });
    expect(res).toEqual({ ok: true });

    expect(updated.some((u) => u.table === adminSessions && u.values.isActive === false)).toBe(true);
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    expect(updated.some((u) => u.table === users)).toBe(false);
    expect(inserted.find((i) => i.table === auditLogs)?.values.action).toBe("terminate_account_sessions");
  });
});

describe("auth.passwordLogin — الحساب الموقوف يُمنع فوراً", () => {
  it("يرفض دخول حساب isActive=false بكلمة سر صحيحة برسالة FORBIDDEN", async () => {
    const password = "abcd1234";
    const passwordHash = await bcrypt.hash(password, 10);
    // 1) حد المعدل داخل المعاملة → لا محاولات سابقة
    selectResults.push([]);
    // 2) البحث عن المستخدم → حساب موقوف بكلمة سر صحيحة
    selectResults.push([{
      id: TARGET_ID, username: "t.demo", fullName: "معلم", role: "teacher",
      passwordHash, isActive: false, bannedUntil: null,
    }]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);
    await expect(caller.passwordLogin({ username: "t.demo", password }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإشراف" });
    // لم يُصدر أي رمز جلسة
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });
});

describe("admin account usernames — Arabic creation and login", () => {
  it("يقبل حرفاً عربياً واحداً كاسم حساب المشرف", async () => {
    const caller = adminRouter.createCaller(adminCtx);
    const result = await caller.createSupervisor({ username: "single-letter.admin", fullName: "ا", password: "1" });

    expect(result).toMatchObject({ ok: true, username: "single-letter.admin", fullName: "ا" });
    expect(inserted.some((entry) => entry.table === users && entry.values.username === "single-letter.admin" && entry.values.fullName === "ا")).toBe(true);
  });

  it("ينشئ حساب مشرف باسم عربي واسم مستخدم منفصلين", async () => {
    const caller = adminRouter.createCaller(adminCtx);
    const result = await caller.createSupervisor({ username: "ali.admin", fullName: "علي بن صالح", password: "1" });

    expect(result).toMatchObject({ ok: true, username: "ali.admin", fullName: "علي بن صالح" });
    expect(inserted.some((entry) => entry.table === users && entry.values.username === "ali.admin" && entry.values.fullName === "علي بن صالح")).toBe(true);
  });

  it("ينشئ حساب معلم باسم عربي مع بقاء مسار المستوى", async () => {
    selectResults.push([{ id: 7, path: "quran", isActive: true }]);
    const caller = adminRouter.createCaller(adminCtx);
    const result = await caller.createTeacher({
      username: "محمد_العجمي",
      fullName: "محمد العجمي",
      password: "1",
      path: "quran",
      levelId: 7,
    });

    expect(result).toMatchObject({ ok: true, username: "محمد_العجمي", fullName: "محمد العجمي" });
    expect(inserted.some((entry) => entry.table === users && entry.values.username === "محمد_العجمي" && entry.values.fullName === "محمد العجمي")).toBe(true);
  });

  it("يسجل دخول المعلم باسم عربي ورقم عربي دون تحويل اسم المستخدم", async () => {
    const password = "1";
    const passwordHash = await bcrypt.hash(password, 10);
    selectResults.push([], [{
      id: TARGET_ID,
      username: "معلم١",
      fullName: "معلم١",
      role: "teacher",
      passwordHash,
      isActive: true,
      bannedUntil: null,
    }]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);
    const result = await caller.passwordLogin({ username: "معلم١", password });

    expect(result).toMatchObject({ ok: true, role: "teacher", name: "معلم١" });
  });

  it("يسجل دخول المشرف باسم عربي", async () => {
    const password = "1";
    const passwordHash = await bcrypt.hash(password, 10);
    selectResults.push([], [{
      id: TARGET_ID,
      username: "مشرف_٢",
      fullName: "مشرف_٢",
      role: "admin",
      passwordHash,
      isActive: true,
      bannedUntil: null,
    }]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);
    const result = await caller.passwordLogin({ username: "مشرف_٢", password });

    expect(result).toMatchObject({ ok: true, role: "admin", name: "مشرف_٢" });
  });

  it("يسجل دخول حساب مشرف عربي قديم عند اختلاف المسافة الداخلية", async () => {
    const password = "1";
    const passwordHash = await bcrypt.hash(password, 10);
    selectResults.push([], [], [{
      id: TARGET_ID,
      username: "عبد الرحمن",
      fullName: "عبد الرحمن",
      role: "admin",
      passwordHash,
      isActive: true,
      bannedUntil: null,
    }]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);
    const result = await caller.passwordLogin({ username: "عبدالرحمن", password });

    expect(result).toMatchObject({ ok: true, role: "admin", name: "عبد الرحمن" });
  });

  it("يحافظ على دخول اسم المستخدم الإنجليزي القديم ذي النقطة", async () => {
    const password = "1";
    const passwordHash = await bcrypt.hash(password, 10);
    selectResults.push([], [{
      id: TARGET_ID,
      username: "teacher.demo",
      fullName: "teacher.demo",
      role: "teacher",
      passwordHash,
      isActive: true,
      bannedUntil: null,
    }]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);
    const result = await caller.passwordLogin({ username: "teacher.demo", password });

    expect(result).toMatchObject({ ok: true, role: "teacher", name: "teacher.demo" });
  });
});

describe("auth.studentPasswordLogin — دخول الطالب بكلمة السر", () => {
  const password = "abcd1234";
  const student = {
    id: TARGET_ID,
    fullName: "طالب تجريبي",
    phone: "+96550000003",
    email: "student@example.com",
    emailVerified: true,
    role: "student",
    passwordHash: "",
    isActive: true,
    bannedUntil: null as Date | null,
  };

  it("يصدر نفس auth token لطالب نشط عبر الهاتف بلا OTP", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    // حد IP، ثم حالة حظر المعرّف، ثم المستخدم
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    const res = await caller.studentPasswordLogin({ identifier: "+96550000003", password });

    expect(res).toMatchObject({ ok: true, token: expect.any(String), role: "student", name: "طالب تجريبي" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(true);
  });

  it("يرفض كلمة السر الخاطئة برسالة عامة ولا يصدر token", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    // حد IP، حالة الحظر، ثم المستخدم — التحقق والعداد في المعاملة نفسها
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password: "wrong123" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "رقم الهاتف/البريد أو كلمة السر غير صحيحة" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });

  it("يرفض الحساب غير النشط حتى مع كلمة السر الصحيحة", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = false;
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإدارة" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });

  it("يسمح بالدخول بالبريد مع كلمة السر دون Email OTP", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.emailVerified = false;
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    const res = await caller.studentPasswordLogin({ identifier: "student@example.com", password });
    expect(res).toMatchObject({ ok: true, token: expect.any(String), role: "student" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(true);
  });

  it("يسمح للمعلم الجديد بالدخول بالهاتف مع كلمة السر", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.emailVerified = true;
    student.role = "teacher";
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    const res = await caller.studentPasswordLogin({ identifier: "+96550000003", password });
    expect(res).toMatchObject({ ok: true, token: expect.any(String), role: "teacher" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(true);
  });

  it("يمنع الحساب المحظور حتى مع كلمة السر الصحيحة", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.role = "student";
    student.bannedUntil = new Date(Date.now() + 3600000);
    selectResults.push([], [], [student]);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "حسابك موقوف — تواصل مع الإدارة" });
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });

  it("يوقف المحاولة قبل البحث عن الحساب عند بلوغ حد IP", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.role = "student";
    student.bannedUntil = null;
    // أول select داخل المعاملة هو عداد security_events
    selectResults.push(Array.from({ length: 30 }, (_, i) => ({ id: String(i) })));
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(selectResults).toHaveLength(0);
  });

  it("يحوّل المحاولة الخامسة خلال ساعة إلى حظر 48 ساعة", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.role = "student";
    student.bannedUntil = null;
    const recentFailure = new Date(Date.now() - 5 * 60 * 1000);
    selectResults.push(
      [],
      [{
        id: "attempt-state",
        identifier: "+96550000003",
        failedAttempts: 4,
        failureTimestamps: [
          new Date(recentFailure.getTime() - 3 * 60 * 1000).toISOString(),
          new Date(recentFailure.getTime() - 2 * 60 * 1000).toISOString(),
          new Date(recentFailure.getTime() - 1 * 60 * 1000).toISOString(),
          recentFailure.toISOString(),
        ],
        blockedUntil: null,
      }],
      [student],
    );
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password: "wrong123" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: "تعذّر تسجيل الدخول مؤقتاً — حاول لاحقاً" });
    expect(updated.some((u) =>
      u.values.failedAttempts === 5
      && u.values.blockedUntil instanceof Date
      && (u.values.blockedUntil as Date).getTime() > Date.now() + 47 * 60 * 60 * 1000
    )).toBe(true);
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });

  it("يرفض المعرّف المحظور قبل البحث عن الحساب برسالة لا تكشف وجوده", async () => {
    selectResults.push(
      [],
      [{
        id: "attempt-state",
        identifier: "student@example.com",
        failedAttempts: 5,
        failureTimestamps: [new Date().toISOString()],
        blockedUntil: new Date(Date.now() + 60 * 60 * 1000),
      }],
    );
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "student@example.com", password }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: "تعذّر تسجيل الدخول مؤقتاً — حاول لاحقاً" });
    expect(selectResults).toHaveLength(0);
    expect(inserted.some((i) => i.table === authTokens)).toBe(false);
  });

  it("لا يحسب المحاولات الأقدم من ساعة ضمن حد المحاولات الخمس", async () => {
    student.passwordHash = await bcrypt.hash(password, 10);
    student.isActive = true;
    student.role = "student";
    student.bannedUntil = null;
    const stale = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    selectResults.push(
      [],
      [{
        id: "attempt-state",
        identifier: "+96550000003",
        failedAttempts: 4,
        failureTimestamps: [stale, stale, stale, stale],
        blockedUntil: null,
      }],
      [student],
    );
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await expect(caller.studentPasswordLogin({ identifier: "+96550000003", password: "wrong123" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "رقم الهاتف/البريد أو كلمة السر غير صحيحة" });
    expect(updated.some((u) =>
      u.values.failedAttempts === 1
      && Array.isArray(u.values.failureTimestamps)
      && u.values.failureTimestamps.length === 1
      && u.values.blockedUntil === null
    )).toBe(true);
  });
});

describe("auth.completeProfile — student email registration", () => {
  it("stores an optional submitted email as unverified for password sign-in", async () => {
    selectResults.push([], [], []);
    const caller = authRouter.createCaller({ req: { headers: {} }, res: {} } as never);

    await caller.completeProfile({
      phone: "+96550000004",
      email: "Student@Example.com",
      fullName: "محمد أحمد علي",
      birthDate: "2005-06-01",
      inSchool: false,
      role: "student",
      password: "abcd1234",
      confirmPassword: "abcd1234",
    });

    expect(inserted.find((entry) => entry.table === users)?.values).toMatchObject({
      email: "student@example.com",
      emailVerified: false,
    });
  });
});
