import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  const selectResults: unknown[][] = [];
  const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const makeBuilder = (result: unknown[]) => {
    const builder: any = {};
    const chain = () => builder;
    for (const method of ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy"]) {
      builder[method] = vi.fn(chain);
    }
    builder.then = (resolve: (value: unknown[]) => void, reject?: (error: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject);
    return builder;
  };
  const db: any = {
    select: vi.fn(() => makeBuilder(selectResults.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserted.push({ table, values });
      }),
    })),
  };
  db.transaction = vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
  return { db, selectResults, inserted };
});

vi.mock("@workspace/db", () => {
  const tableProxy = (name: string) =>
      new Proxy({ __table: name } as Record<PropertyKey, unknown>, {
      get: (target: Record<PropertyKey, unknown>, property: string | symbol) =>
        typeof property === "symbol"
          ? Reflect.get(target, property)
          : property in target ? target[property] : `${name}.${property}`,
    });

  return {
    db: mock.db,
    levels: tableProxy("levels"),
    shariaSubjects: tableProxy("shariaSubjects"),
    shariaExamQuestions: tableProxy("shariaExamQuestions"),
    shariaExamAttempts: tableProxy("shariaExamAttempts"),
    shariaContent: tableProxy("shariaContent"),
    shariaContentProgress: tableProxy("shariaContentProgress"),
  };
});

import { shariaExamAttempts } from "@workspace/db";
import type { TrpcContext } from "../context";
import { shariaRouter } from "./sharia";

const LEVEL_ID = 101;
const STUDENT_ID = "student-sharia-exam";
const question = {
  id: "question-1",
  levelId: LEVEL_ID,
  questionText: "هل هذه إجابة صحيحة؟",
  questionType: "mcq",
  options: ["نعم", "لا"],
  points: 10,
  correctAnswer: "نعم",
  explanation: "الإجابة الصحيحة هي نعم.",
  isActive: true,
  orderIndex: 1,
};

const studentContext: TrpcContext = {
  req: { headers: {} },
  res: {},
  user: { id: STUDENT_ID, fullName: "طالب الاختبار", phone: "", role: "student" },
};

function queueLevelWithSubject() {
  mock.selectResults.push([
    { id: LEVEL_ID, path: "sharia", name: "المستوى الأول", nameEn: "aqeedah", orderIndex: 1 },
  ]);
  mock.selectResults.push([
    { id: LEVEL_ID, path: "sharia", name: "المستوى الأول", nameEn: "aqeedah", orderIndex: 1 },
  ]);
  mock.selectResults.push([{ key: "aqeedah", name: "العقيدة" }]);
}

function queueExamQuery(attempts: unknown[] = []) {
  queueLevelWithSubject();
  mock.selectResults.push([question]);
  mock.selectResults.push(attempts);
}

function queueSubmission() {
  mock.selectResults.push([question]);
  queueLevelWithSubject();
  mock.selectResults.push([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.selectResults.length = 0;
  mock.inserted.length = 0;
});

describe("sharia exam — Web/Mobile server contract flow", () => {
  it("loads the exam, submits selected answers, and returns the server result", async () => {
    const caller = shariaRouter.createCaller(studentContext);
    queueExamQuery();

    console.error("before exam");
    const exam = await caller.exam({ levelId: LEVEL_ID });
    console.error("after exam");
    expect(exam?.questions).toEqual([
      expect.objectContaining({
        id: question.id,
        questionType: "multiple_choice",
        options: question.options,
        points: question.points,
      }),
    ]);
    expect(exam?.attemptsRemaining).toBe(3);

    queueSubmission();
    console.error("before submit");
    const result = await caller.submitExam({
      levelId: LEVEL_ID,
      answers: exam!.questions.map((item) => ({ questionId: item.id, answer: "نعم" })),
    });
    console.error("after submit");

    expect(result).toMatchObject({
      score: 100,
      passed: true,
      passingScore: 70,
      attemptsUsed: 1,
      attemptsRemaining: 2,
    });
    expect(result.results[0]).toMatchObject({
      questionId: question.id,
      correct: true,
      earned: 10,
      correctAnswer: "نعم",
      explanation: question.explanation,
    });
    expect(mock.inserted).toHaveLength(1);
    expect(mock.inserted[0]).toMatchObject({
      table: shariaExamAttempts,
      values: { studentId: STUDENT_ID, levelId: LEVEL_ID, score: 100, passed: true, attemptNumber: 1 },
    });
  });

  it("does not trust or persist a client-supplied score", async () => {
    const caller = shariaRouter.createCaller(studentContext);
    queueSubmission();

    const result = await caller.submitExam({
      levelId: LEVEL_ID,
      answers: [{ questionId: question.id, answer: "لا" }],
      score: 100,
    } as never);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(mock.inserted[0].values.score).toBe(0);
    expect(mock.inserted[0].values.passed).toBe(false);
  });

  it("rejects unauthenticated and non-student callers before reading exam data", async () => {
    const unauthenticated = shariaRouter.createCaller({ req: { headers: {} }, res: {}, user: null });
    const teacher = shariaRouter.createCaller({
      ...studentContext,
      user: { ...studentContext.user!, role: "teacher" },
    });

    await expect(unauthenticated.exam({ levelId: LEVEL_ID })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(teacher.exam({ levelId: LEVEL_ID })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.db.select).not.toHaveBeenCalled();
  });

  it("rejects malformed level ids at the tRPC boundary", async () => {
    const caller = shariaRouter.createCaller(studentContext);

    await expect(caller.exam({ levelId: 1.5 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mock.db.select).not.toHaveBeenCalled();
  });
});