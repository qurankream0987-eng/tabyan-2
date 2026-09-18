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
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserted.push({ table, values });
      }),
    })),
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
    "fatwaAnswers", "fatwaQuestions", "fatwaRatings", "levels", "muftiAssignments",
    "notifications", "promotionRequests", "qiraatCertificates", "recordings", "sessions",
    "studentProgress", "students", "systemSettings", "teachers", "teacherSettings", "users",
    "weeklySchedules", "securityEvents", "adminLoginAttempts", "studentPasswordLoginAttempts",
    "otpCodes", "otpRequests",
    "webauthnCredentials", "webauthnChallenges", "googleAuthTickets", "emailVerifications",
    "scheduleChangeRequests", "teacherMessages", "teacherBroadcasts", "phoneChangeRequests",
    "shariaSubjects", "levelContent",
  ];
  const tables = Object.fromEntries(names.map((n) => [n, tableProxy(n)]));
  return { db: makeDb(), ...tables };
});

import { adminSessions, authTokens, auditLogs, studentPasswordLoginAttempts, users, webauthnChallenges, webauthnCredentials } from "@workspace/db";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import type { TrpcContext } from "../context";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

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
  it("يحذف الرموز وبيانات WebAuthn ومحاولات الدخول ثم الحساب داخل معاملة", async () => {
    selectResults.push([{
      id: TARGET_ID,
      phone: "+966500000003",
      email: "student@example.com",
    }]);
    const caller = authRouter.createCaller({
      req: { headers: { authorization: "Bearer token" } },
      res: {},
      user: { id: TARGET_ID, fullName: "طالب تجريبي", phone: "+966500000003", role: "student" },
    } as never);

    await expect(caller.deleteAccount({ confirmation: "حذف حسابي" })).resolves.toEqual({ ok: true });
    expect(deleted.some((d) => d.table === authTokens)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnCredentials)).toBe(true);
    expect(deleted.some((d) => d.table === webauthnChallenges)).toBe(true);
    expect(deleted.some((d) => d.table === studentPasswordLoginAttempts)).toBe(true);
    expect(deleted.some((d) => d.table === users)).toBe(true);
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
