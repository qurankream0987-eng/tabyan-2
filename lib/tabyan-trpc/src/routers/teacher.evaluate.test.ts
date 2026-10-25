import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock @workspace/db ─────────────────────────────────────────────────────
// A chainable, thenable query builder: each db.select() consumes the next
// queued result; db.insert(table).values(v) records inserted rows per table.

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

vi.mock("@workspace/db", () => {
  const tableProxy = (name: string) =>
    new Proxy({ __table: name }, { get: (t: any, p) => (p in t ? t[p] : `${name}.${String(p)}`) });
  return {
    db: {
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
    },
    evaluations: tableProxy("evaluations"),
    notifications: tableProxy("notifications"),
    sessions: tableProxy("sessions"),
    students: tableProxy("students"),
    studentProgress: tableProxy("studentProgress"),
    fatwaAnswers: tableProxy("fatwaAnswers"),
    fatwaQuestions: tableProxy("fatwaQuestions"),
    levels: tableProxy("levels"),
    promotionRequests: tableProxy("promotionRequests"),
    recordings: tableProxy("recordings"),
    scheduleChangeRequests: tableProxy("scheduleChangeRequests"),
    teacherMessages: tableProxy("teacherMessages"),
    teacherSettings: tableProxy("teacherSettings"),
    teachers: tableProxy("teachers"),
    users: tableProxy("users"),
    authTokens: tableProxy("authTokens"),
  };
});

import { notifications } from "@workspace/db";
import { teacherRouter } from "./teacher";
import type { TrpcContext } from "../context";

const TEACHER_ID = "teacher-1";
const STUDENT_ID = "student-1";

const ctx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: TEACHER_ID, fullName: "معلم تجريبي", phone: "0500000000", role: "teacher" },
};

function queueEvaluateSelects() {
  // 1) approved teacher lookup
  selectResults.push([{ kycStatus: "approved" }]);
  // 2) session lookup
  selectResults.push([{ id: "sess-1", teacherId: TEACHER_ID, studentId: STUDENT_ID }]);
  // 3) existing evaluation lookup → none
  selectResults.push([]);
  // 4) all evaluations for the student (average computation)
  selectResults.push([{ total: 85 }]);
  // 5) student record → no currentLevelId (skips progress update)
  selectResults.push([{ userId: STUDENT_ID, currentLevelId: null }]);
}

const baseInput = {
  sessionId: "sess-1",
  hifzScore: 40,
  revisionScore: 18,
  tajweedScore: 19,
  commitmentScore: 8,
  recommendation: "keep" as const,
};

function studentNotifications() {
  return inserted
    .filter((i) => i.table === notifications)
    .map((i) => i.values)
    .filter((v) => v.userId === STUDENT_ID);
}

describe("teacher.evaluate — الملاحظة الصوتية في إشعار الطالب", () => {
  beforeEach(() => {
    selectResults.length = 0;
    inserted.length = 0;
    updated.length = 0;
  });

  it("يرفق الملاحظة الصوتية كمرفق audio في إشعار الطالب عند تمرير audioNotesUrl", async () => {
    queueEvaluateSelects();
    const caller = teacherRouter.createCaller(ctx);
    const audioNotesUrl = "https://storage.example.com/notes/audio-1.webm";
    const res = await caller.evaluate({ ...baseInput, audioNotesUrl });

    expect(res).toEqual({ ok: true, total: 85 });
    const notifs = studentNotifications();
    expect(notifs).toHaveLength(1);
    const notif = notifs[0];
    expect(notif.type).toBe("result");
    expect(notif.attachments).toBeDefined();
    const attachments = notif.attachments as Array<{ name: string; kind: string; url: string }>;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].kind).toBe("audio");
    expect(attachments[0].url).toBe(audioNotesUrl);
    expect(attachments[0].name).toContain("ملاحظة صوتية");
  });

  it("لا يضيف attachments في إشعار الطالب عندما لا يُمرَّر audioNotesUrl", async () => {
    queueEvaluateSelects();
    const caller = teacherRouter.createCaller(ctx);
    const res = await caller.evaluate({ ...baseInput });

    expect(res).toEqual({ ok: true, total: 85 });
    const notifs = studentNotifications();
    expect(notifs).toHaveLength(1);
    expect("attachments" in notifs[0]).toBe(false);
  });
});
