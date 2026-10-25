import { beforeEach, describe, expect, it, vi } from "vitest";

const selectResults: unknown[][] = [];
const updateResults: unknown[][] = [];
const updated: Array<{ values: Record<string, unknown> }> = [];

function builderFor(result: unknown[]) {
  const builder: any = {};
  const chain = () => builder;
  for (const method of ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy", "groupBy"]) {
    builder[method] = vi.fn(chain);
  }
  builder.then = (resolve: (value: unknown[]) => void, reject?: (reason: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

vi.mock("@workspace/db", () => {
  const tableProxy = (name: string) =>
    new Proxy({ __table: name }, { get: (target: any, property) => property in target ? target[property] : `${name}.${String(property)}` });
  return {
    db: {
      select: vi.fn(() => builderFor(selectResults.shift() ?? [])),
      update: vi.fn(() => ({
        set: vi.fn((values: Record<string, unknown>) => {
          updated.push({ values });
          const builder: any = {};
          builder.where = vi.fn(() => builder);
          builder.returning = vi.fn(async () => updateResults.shift() ?? []);
          return builder;
        }),
      })),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    },
    evaluations: tableProxy("evaluations"),
    fatwaAnswers: tableProxy("fatwaAnswers"),
    fatwaQuestions: tableProxy("fatwaQuestions"),
    levels: tableProxy("levels"),
    notifications: tableProxy("notifications"),
    promotionRequests: tableProxy("promotionRequests"),
    recordings: tableProxy("recordings"),
    scheduleChangeRequests: tableProxy("scheduleChangeRequests"),
    sessions: tableProxy("sessions"),
    studentProgress: tableProxy("studentProgress"),
    students: tableProxy("students"),
    teacherBroadcasts: tableProxy("teacherBroadcasts"),
    teacherCertificates: tableProxy("teacherCertificates"),
    teacherMessages: tableProxy("teacherMessages"),
    teacherSettings: tableProxy("teacherSettings"),
    teachers: tableProxy("teachers"),
    users: tableProxy("users"),
    weeklySchedules: tableProxy("weeklySchedules"),
  };
});

import { teacherRouter } from "./teacher";
import type { TrpcContext } from "../context";

const TEACHER_ID = "teacher-1";
const SESSION_ID = "session-1";

const ctx: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: TEACHER_ID, fullName: "معلم تجريبي", phone: "0500000000", role: "teacher" },
};

function queueApprovedTeacher() {
  selectResults.push([{ kycStatus: "approved" }]);
}

function queueSession(status: string, teacherId = TEACHER_ID) {
  selectResults.push([{ id: SESSION_ID, teacherId, status, studentId: "student-1" }]);
}

describe("teacher session state transitions", () => {
  beforeEach(() => {
    selectResults.length = 0;
    updateResults.length = 0;
    updated.length = 0;
  });

  it.each(["scheduled", "confirmed"])("starts an owned %s session atomically", async (status) => {
    queueApprovedTeacher();
    queueSession(status);
    updateResults.push([{ id: SESSION_ID }]);

    await expect(teacherRouter.createCaller(ctx).startSession({ id: SESSION_ID })).resolves.toEqual({ ok: true });
    expect(updated).toHaveLength(1);
    expect(updated[0].values.status).toBe("in_progress");
    expect(updated[0].values.startedAt).toBeInstanceOf(Date);
  });

  it.each(["completed", "cancelled", "no_show", "in_progress"])("rejects starting a %s session", async (status) => {
    queueApprovedTeacher();
    queueSession(status);

    await expect(teacherRouter.createCaller(ctx).startSession({ id: SESSION_ID }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updated).toHaveLength(0);
  });

  it("rejects starting another teacher's session", async () => {
    queueApprovedTeacher();
    queueSession("scheduled", "teacher-2");

    await expect(teacherRouter.createCaller(ctx).startSession({ id: SESSION_ID }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updated).toHaveLength(0);
  });

  it("ends an owned in-progress session atomically", async () => {
    queueApprovedTeacher();
    queueSession("in_progress");
    updateResults.push([{ id: SESSION_ID }]);

    await expect(teacherRouter.createCaller(ctx).endSession({ id: SESSION_ID })).resolves.toEqual({ ok: true });
    expect(updated).toHaveLength(1);
    expect(updated[0].values.status).toBe("completed");
    expect(updated[0].values.endedAt).toBeInstanceOf(Date);
  });

  it.each(["scheduled", "confirmed", "completed", "cancelled", "no_show"])("rejects ending a %s session", async (status) => {
    queueApprovedTeacher();
    queueSession(status);

    await expect(teacherRouter.createCaller(ctx).endSession({ id: SESSION_ID }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updated).toHaveLength(0);
  });

  it("rejects ending another teacher's session", async () => {
    queueApprovedTeacher();
    queueSession("in_progress", "teacher-2");

    await expect(teacherRouter.createCaller(ctx).endSession({ id: SESSION_ID }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updated).toHaveLength(0);
  });

  it("does not claim success when the atomic transition loses a race", async () => {
    queueApprovedTeacher();
    queueSession("scheduled");
    updateResults.push([]);

    await expect(teacherRouter.createCaller(ctx).startSession({ id: SESSION_ID }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});