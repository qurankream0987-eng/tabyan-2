import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock @workspace/db ─────────────────────────────────────────────────────
// نفس نمط admin.accounts.test.ts مع دعم `.for("update")` (قفل صف الطالب)
// لاختبار placementReview: إشعار قبول واحد فقط مهما تكرر الاعتماد.

const selectResults: unknown[][] = [];
const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const updated: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const forUpdateCalls: string[] = [];

function makeBuilder(result: unknown[]) {
  const builder: any = {};
  const chain = () => builder;
  for (const m of ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy", "groupBy"]) {
    builder[m] = vi.fn(chain);
  }
  builder.for = vi.fn((mode: string) => {
    forUpdateCalls.push(mode);
    return builder;
  });
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
    delete: vi.fn((table: unknown) => ({ where: vi.fn(async () => {}) })),
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
    "weeklySchedules", "securityEvents", "adminLoginAttempts", "otpCodes", "otpRequests",
    "webauthnCredentials", "webauthnChallenges", "googleAuthTickets", "emailVerifications",
    "scheduleChangeRequests", "teacherMessages", "teacherBroadcasts", "phoneChangeRequests",
    "shariaSubjects", "levelContent",
  ];
  const tables = Object.fromEntries(names.map((n) => [n, tableProxy(n)]));
  return { db: makeDb(), ...tables };
});

import { notifications, students, studentProgress } from "@workspace/db";
import { adminRouter } from "./admin";
import type { TrpcContext } from "../context";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const LEVEL_ID = 3;

const adminCtx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: ADMIN_ID, fullName: "مشرف", phone: null, role: "admin" },
} as never;

beforeEach(() => {
  selectResults.length = 0;
  inserted.length = 0;
  updated.length = 0;
  forUpdateCalls.length = 0;
});

const acceptanceNotifs = () =>
  inserted.filter((i) => i.table === notifications &&
    (i.values.payload as { event?: string } | undefined)?.event === "placement_accepted");

/** يهيّئ نتائج select لاستدعاء اعتماد واحد */
function queueApproveSelects(prevStatus: string) {
  // 1) صف الطالب المقفول (FOR UPDATE)
  selectResults.push([{ status: prevStatus, pathType: "quran" }]);
  // 2) بيانات المستوى من قاعدة البيانات
  selectResults.push([{ name: "الغرس", path: "quran", isActive: true, aqeedahLevelId: null }]);
  // 3) هل يوجد تقدّم للمستوى؟ → لا
  selectResults.push([]);
}

describe("admin.placementReview — إشعار قبول وحيد وديناميكي", () => {
  it("أول اعتماد: يقفل صف الطالب وينشئ إشعار قبول واحد بنص من قاعدة البيانات", async () => {
    queueApproveSelects("pending");
    const caller = adminRouter.createCaller(adminCtx);
    const res = await caller.placementReview({ studentId: STUDENT_ID, approve: true, resultLevelId: LEVEL_ID });
    expect(res).toEqual({ ok: true });

    // القفل الذري لصف الطالب قبل فحص الحالة
    expect(forUpdateCalls).toContain("update");

    // إشعار قبول واحد فقط، للطالب الصحيح، بالعنوان والنص الديناميكي
    const accepted = acceptanceNotifs();
    expect(accepted).toHaveLength(1);
    expect(accepted[0].values.userId).toBe(STUDENT_ID);
    expect(accepted[0].values.title).toBe("مبارك! تم قبولك 🎉");
    expect(accepted[0].values.body).toContain("الغرس");
    expect(accepted[0].values.body).toContain("مسار القرآن الكريم");
    expect(accepted[0].values.primaryActionUrl).toBe("/student/home");

    // تحديث حالة الطالب + إنشاء التقدّم داخل نفس المعاملة
    expect(updated.some((u) => u.table === students && u.values.placementTestStatus === "approved")).toBe(true);
    expect(inserted.some((i) => i.table === studentProgress)).toBe(true);
  });

  it("إعادة الاعتماد (نقر مزدوج/متزامن بعد القفل): لا إشعار قبول ثانٍ", async () => {
    // الاستدعاء الأول: الحالة pending
    queueApproveSelects("pending");
    // الاستدعاء الثاني: بعد تسلسل القفل يرى approved
    queueApproveSelects("approved");

    const caller = adminRouter.createCaller(adminCtx);
    await caller.placementReview({ studentId: STUDENT_ID, approve: true, resultLevelId: LEVEL_ID });
    await caller.placementReview({ studentId: STUDENT_ID, approve: true, resultLevelId: LEVEL_ID });

    expect(acceptanceNotifs()).toHaveLength(1);
  });

  it("الرفض: إشعار نتيجة بدون تفاصيل مع رابط إعادة الاختبار", async () => {
    selectResults.push([{ status: "pending" }]);
    const caller = adminRouter.createCaller(adminCtx);
    await caller.placementReview({ studentId: STUDENT_ID, approve: false });

    expect(acceptanceNotifs()).toHaveLength(0);
    const rejection = inserted.find((i) => i.table === notifications);
    expect(rejection?.values.userId).toBe(STUDENT_ID);
    expect(rejection?.values.title).toBe("نتيجة اختبار تحديد المستوى");
    expect(rejection?.values.primaryActionUrl).toBe("/student/placement");
  });

  it("طالب غير موجود: NOT_FOUND ولا إشعارات", async () => {
    selectResults.push([]);
    const caller = adminRouter.createCaller(adminCtx);
    await expect(caller.placementReview({ studentId: STUDENT_ID, approve: true, resultLevelId: LEVEL_ID }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(inserted.filter((i) => i.table === notifications)).toHaveLength(0);
  });
});
