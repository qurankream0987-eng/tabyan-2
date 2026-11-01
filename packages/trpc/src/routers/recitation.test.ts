import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { selectResults, inserted, updated, tableProxy, makeBuilder } = vi.hoisted(() => {
  const selectResults: unknown[][] = [];
  const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  function makeBuilder(result: unknown[]) {
    const builder: any = {};
    const chain = () => builder;
    for (const method of ["from", "where", "limit", "orderBy"]) {
      builder[method] = vi.fn(chain);
    }
    builder.then = (resolve: (value: unknown[]) => void, reject?: (error: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject);
    return builder;
  }

  const tableProxy = (name: string) =>
    new Proxy({ __table: name }, {
      get: (target: any, property) =>
        property in target ? target[property] : `${name}.${String(property)}`,
    });

  return { selectResults, inserted, updated, tableProxy, makeBuilder };
});

vi.mock("@workspace/db", () => {
  const recitationSessions = tableProxy("recitationSessions");
  const recitationAssignments = tableProxy("recitationAssignments");
  const sessions = tableProxy("sessions");
  const students = tableProxy("students");
  const levels = tableProxy("levels");
  const teachers = tableProxy("teachers");

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
    levels,
    recitationAssignments,
    recitationSessions,
    sessions,
    students,
    teachers,
  };
});

import { recitationSessions } from "@workspace/db";
import type { TrpcContext } from "../context";
import { recitationRouter } from "./recitation";

const studentContext: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: {
    id: "student-1",
    fullName: "طالب تجريبي",
    phone: "0500000000",
    role: "student",
  },
};

const validEducationalRange = {
  start: { surahId: 2, ayah: 255 },
  end: { surahId: 2, ayah: 257 },
};

describe("recitationRouter contract separation", () => {
  const previousAiFlag = process.env.TABYAN_AI_ENABLED;

  beforeEach(() => {
    process.env.TABYAN_AI_ENABLED = "true";
    selectResults.length = 0;
    inserted.length = 0;
    updated.length = 0;
  });

  afterEach(() => {
    if (previousAiFlag === undefined) delete process.env.TABYAN_AI_ENABLED;
    else process.env.TABYAN_AI_ENABLED = previousAiFlag;
  });

  it("creates GENERAL without an expected range and stores only optional start context", async () => {
    const caller = recitationRouter.createCaller(studentContext);

    const result = await caller.start({
      mode: "general",
      startContext: {
        startPage: 42,
        startVerseKey: "2:255",
        startWordPosition: 3,
      },
      hideMode: "full_hide",
    });

    expect(result.policy).toMatchObject({
      mode: "general",
      expectedEndPosition: "none",
      allowsEducationalProgress: false,
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe(recitationSessions);
    expect(inserted[0].values).toMatchObject({
      mode: "general",
      startPage: 42,
      startVerseKey: "2:255",
      startWordPosition: 3,
      expectedRange: null,
      policyVersion: 1,
    });
    expect(inserted[0].values).not.toHaveProperty("startAyah");
    expect(inserted[0].values).not.toHaveProperty("endAyah");
    expect(inserted[0].values).not.toHaveProperty("surahId");
  });

  const assignmentId = "6f1c2d3e-4a5b-4c6d-8e7f-001122334455";
  const assignment = {
    id: assignmentId,
    studentId: "student-1",
    surahId: 2,
    startAyah: 255,
    endAyah: 257,
    hideMode: "progressive_reveal",
    status: "assigned",
  };

  it("rejects EDUCATIONAL without a teacher assignment for this student", async () => {
    selectResults.push([]);
    const caller = recitationRouter.createCaller(studentContext);

    await expect(caller.start({
      mode: "educational",
      assignmentId,
      expectedRange: validEducationalRange,
      hideMode: "full_hide",
    })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(inserted).toHaveLength(0);
  });

  it("rejects EDUCATIONAL whose range differs from the assignment", async () => {
    selectResults.push([assignment]);
    const caller = recitationRouter.createCaller(studentContext);

    await expect(caller.start({
      mode: "educational",
      assignmentId,
      expectedRange: { start: { surahId: 2, ayah: 255 }, end: { surahId: 2, ayah: 260 } },
      hideMode: "full_hide",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(inserted).toHaveLength(0);
  });

  it("starts EDUCATIONAL from the assignment, with the teacher's display mode", async () => {
    selectResults.push([assignment]);
    const caller = recitationRouter.createCaller(studentContext);

    const result = await caller.start({
      mode: "educational",
      assignmentId,
      expectedRange: validEducationalRange,
      hideMode: "visible_review",
    });

    expect(result.hideMode).toBe("progressive_reveal");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].values).toMatchObject({
      mode: "educational",
      assignmentId,
      hideMode: "progressive_reveal",
      expectedRange: validEducationalRange,
    });
  });

  it("does not start EDUCATIONAL from a reviewed or cancelled assignment", async () => {
    selectResults.push([{ ...assignment, status: "reviewed" }]);
    const caller = recitationRouter.createCaller(studentContext);

    await expect(caller.start({
      mode: "educational",
      assignmentId,
      expectedRange: validEducationalRange,
      hideMode: "full_hide",
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("ends a GENERAL session without writing educational progress", async () => {
    selectResults.push([{
      id: "general-session",
      userId: studentContext.user!.id,
      mode: "general",
      status: "listening",
      startedAt: new Date(Date.now() - 5_000),
      pausedSeconds: 0,
      lastPausedAt: null,
    }]);
    const caller = recitationRouter.createCaller(studentContext);

    const result = await caller.end({ sessionId: "general-session" });

    expect(result.completionState).toBe("user_ended");
    expect(updated).toHaveLength(1);
    expect(updated[0].table).toBe(recitationSessions);
    expect(updated[0].values).toMatchObject({ status: "completed" });
    expect(updated[0].values).not.toHaveProperty("studentProgress");
  });

  it("keeps legacy ranged GENERAL sessions readable", async () => {
    const legacySession = {
      id: "legacy-general",
      mode: "general",
      surahId: 1,
      startAyah: 1,
      endAyah: 7,
      expectedRange: null,
    };
    selectResults.push([legacySession]);
    const caller = recitationRouter.createCaller(studentContext);

    const result = await caller.myHistory({ limit: 20 });

    expect(result).toEqual([legacySession]);
  });
});