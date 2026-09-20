import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock @workspace/db ─────────────────────────────────────────────────────
// Same chainable/thenable builder pattern as teacher.evaluate.test.ts /
// admin.accounts.test.ts, but table exports are auto-proxied so importing
// student.ts + teacher.ts + admin.ts (and their transitive ./library, ./fatwa
// imports) never breaks on an unlisted table name.

const selectResults: unknown[][] = [];
const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
const updated: Array<{ table: unknown; values: Record<string, unknown> }> = [];

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

function tableProxy(name: string) {
  return new Proxy({ __table: name }, { get: (t: any, p) => (p in t ? t[p] : `${name}.${String(p)}`) });
}

vi.mock("@workspace/db", () => {
  const dbObj = {
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
  };
  const known: Record<string, unknown> = { db: dbObj };
  // Any other named export (a Drizzle table) is auto-proxied by name on
  // first access, so this mock never needs updating when a router starts
  // importing one more table.
  return new Proxy(known, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      if (prop === "__esModule") return true;
      const proxy = tableProxy(prop);
      (target as any)[prop] = proxy;
      return proxy;
    },
  });
});

import { studentRouter } from "./student";
import { teacherRouter } from "./teacher";
import { adminRouter } from "./admin";
import { users, students, teachers } from "@workspace/db";
import type { TrpcContext } from "../context";

const STUDENT_ID = "student-1";
const TEACHER_ID = "teacher-1";

const studentCtx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: STUDENT_ID, fullName: "طالب تجريبي", phone: "0500000001", role: "student" },
};
const teacherCtx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: TEACHER_ID, fullName: "معلم تجريبي", phone: "0500000002", role: "teacher" },
};
const adminCtx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: "admin-1", fullName: "مشرف تجريبي", phone: "0500000003", role: "admin" },
};

const INVALID_VIDEO_URLS = [
  "file:///var/mobile/Containers/Data/tmp.mp4",
  "https://storage.googleapis.com/some-bucket/object",
  "not-a-path-at-all",
  "/objects/../../etc/passwd",
  "",
];
const VALID_OBJECT_PATH = "/objects/uploads/e2e-test-video.mp4";

describe("student.submitPlacement — يرفض أي مرجع غير مسار كائن خاص صالح", () => {
  beforeEach(() => {
    selectResults.length = 0;
    inserted.length = 0;
    updated.length = 0;
  });

  it.each(INVALID_VIDEO_URLS)("يرفض videoUrl=%s قبل أي وصول لقاعدة البيانات", async (videoUrl) => {
    const caller = studentRouter.createCaller(studentCtx);
    await expect(caller.submitPlacement({ videoUrl, pathType: "quran" } as never)).rejects.toThrow();
    expect(updated).toHaveLength(0);
  });

  it("يحفظ مسار /objects/ الصالح كما هو دون أي تحويل، ويصل بنفس القيمة إلى admin.placementList", async () => {
    // notifyAdmins: لا يوجد مشرفون نشطون → لا إشعارات، ولا حاجة لمزيد من المزاعم
    selectResults.push([]);
    const caller = studentRouter.createCaller(studentCtx);
    await caller.submitPlacement({ videoUrl: VALID_OBJECT_PATH, pathType: "quran" });

    const placementUpdate = updated.find((u) => u.table === students);
    expect(placementUpdate?.values.placementTestVideoUrl).toBe(VALID_OBJECT_PATH);
    expect(placementUpdate?.values.placementTestStatus).toBe("pending");

    // نفس القيمة المحفوظة تُعاد حرفياً من admin.placementList — لا تحويل بينهما
    selectResults.push([{
      userId: STUDENT_ID,
      videoUrl: placementUpdate?.values.placementTestVideoUrl,
      createdAt: new Date(),
      pathType: "quran",
      name: "طالب تجريبي",
      schoolStage: null,
      schoolGrade: null,
    }]);
    const adminCaller = adminRouter.createCaller(adminCtx);
    const list = await adminCaller.placementList();
    expect(list).toHaveLength(1);
    expect(list[0].videoUrl).toBe(VALID_OBJECT_PATH);
  });
});

describe("teacher.submitKyc — يرفض أي مرجع غير مسار كائن خاص صالح", () => {
  beforeEach(() => {
    selectResults.length = 0;
    inserted.length = 0;
    updated.length = 0;
  });

  it.each(INVALID_VIDEO_URLS)("يرفض videoUrl=%s قبل أي وصول لقاعدة البيانات", async (videoUrl) => {
    const caller = teacherRouter.createCaller(teacherCtx);
    const answers = Array.from({ length: 10 }, (_, i) => ({ q: `س${i}`, a: `ج${i}` }));
    await expect(caller.submitKyc({ videoUrl, answers } as never)).rejects.toThrow();
    expect(updated).toHaveLength(0);
  });

  it("يحفظ مسار /objects/ الصالح كما هو دون أي تحويل، ويصل بنفس القيمة إلى admin.kycList", async () => {
    // فحص حالة KYC الحالية: in_progress → يسمح بالإرسال
    selectResults.push([{ kycStatus: "in_progress" }]);
    const answers = Array.from({ length: 10 }, (_, i) => ({ q: `س${i}`, a: `ج${i}` }));
    const caller = teacherRouter.createCaller(teacherCtx);
    await caller.submitKyc({ videoUrl: VALID_OBJECT_PATH, answers });

    const kycUpdate = updated.find((u) => u.table === teachers);
    expect(kycUpdate?.values.kycVideoUrl).toBe(VALID_OBJECT_PATH);
    expect(kycUpdate?.values.kycStatus).toBe("pending");

    // نفس القيمة المحفوظة تُعاد حرفياً من admin.kycList — لا تحويل بينهما
    selectResults.push([{
      teacherId: TEACHER_ID,
      name: "معلم تجريبي",
      videoUrl: kycUpdate?.values.kycVideoUrl,
      answers,
      createdAt: new Date(),
      kycStatus: "pending",
      reviewNotes: null,
      bio: null,
      specialization: null,
      experienceYears: 0,
    }]);
    selectResults.push([]); // teacherCertificates lookup
    const adminCaller = adminRouter.createCaller(adminCtx);
    const list = await adminCaller.kycList();
    expect(list).toHaveLength(1);
    expect(list[0].videoUrl).toBe(VALID_OBJECT_PATH);
  });
});

// يحفظ صحة استيراد الجداول المستخدمة فعلياً حتى لا يتحول التجاهل الصامت
// للتصدير غير المعروف (auto-proxy أعلاه) إلى تعمية عن كسر حقيقي في الاستيراد.
describe("sanity: الجداول المرجعية المستخدمة في هذا الملف حقيقية", () => {
  it("users/students/teachers مستوردة من @workspace/db الحقيقي وليست undefined", () => {
    expect(users).toBeDefined();
    expect(students).toBeDefined();
    expect(teachers).toBeDefined();
  });
});
