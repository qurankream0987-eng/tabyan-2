import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  counters: new Map<string, number>(),
  attempts: new Map<string, {
    id: string;
    studentId: string;
    pathType: "quran" | "tajweed_correction";
    status: "recorded" | "submitted" | "invalidated";
  }>(),
  lastAttemptId: null as string | null,
  transactionQueue: Promise.resolve() as Promise<void>,
  currentSelectTable: undefined as string | undefined,
}));

function tableName(table: unknown): string | undefined {
  return (table as { __table?: string })?.__table;
}

function countKey(studentId: string, pathType: string): string {
  return `${studentId}:${pathType}`;
}

function makeSelectBuilder(getRows: () => unknown[]) {
  const builder: any = {};
  const chain = () => builder;
  for (const method of ["from", "where", "limit", "orderBy"]) builder[method] = vi.fn(chain);
  builder.then = (resolve: (value: unknown[]) => void, reject?: (reason: unknown) => void) =>
    Promise.resolve(getRows()).then(resolve, reject);
  return builder;
}

function tableProxy(name: string) {
  return new Proxy({ __table: name }, {
    get: (target, property, receiver) => {
      if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
      return `${name}.${property}`;
    },
  });
}

vi.mock("@workspace/db", () => {
  const db: any = {};
  db.select = vi.fn(() => {
    const builder = makeSelectBuilder(() => {
      if (!state.lastAttemptId) return [];
      const attempt = state.attempts.get(state.lastAttemptId);
      if (!attempt) return [];
      if (state.currentSelectTable === "placementAttempts") return [attempt];
      if (state.currentSelectTable === "students") {
        return [{ attemptsUsed: state.counters.get(countKey(attempt.studentId, attempt.pathType)) ?? 0 }];
      }
      return [];
    });
    const originalFrom = builder.from;
    builder.from = vi.fn((table: unknown) => {
      state.currentSelectTable = tableName(table);
      return originalFrom(table);
    });
    return builder;
  });

  db.insert = vi.fn((table: unknown) => {
    const name = tableName(table);
    const query: any = {};
    let values: any;
    query.values = vi.fn((nextValues: any) => {
      values = nextValues;
      if (name === "placementAttempts") state.lastAttemptId = nextValues.id;
      return query;
    });
    query.onConflictDoNothing = vi.fn(() => query);
    query.returning = vi.fn(async () => {
      if (name !== "placementAttempts") return [];
      if (state.attempts.has(values.id)) return [];
      state.attempts.set(values.id, { ...values });
      return [{ id: values.id }];
    });
    return query;
  });

  db.update = vi.fn((table: unknown) => {
    const name = tableName(table);
    return {
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          const result: any[] = [];
          (result as any).returning = vi.fn(async () => {
            if (name !== "students" || !state.lastAttemptId) return [];
            const attempt = state.attempts.get(state.lastAttemptId);
            if (!attempt) return [];
            const key = countKey(attempt.studentId, attempt.pathType);
            const used = state.counters.get(key) ?? 0;
            if (used >= 5) return [];
            const next = used + 1;
            state.counters.set(key, next);
            return [{ attemptsUsed: next, userId: attempt.studentId }];
          });
          return result;
        }),
      })),
    };
  });

  db.transaction = vi.fn(async (callback: (tx: any) => unknown) => {
    let unlock!: () => void;
    const previous = state.transactionQueue;
    state.transactionQueue = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    const countersBefore = new Map(state.counters);
    const attemptsBefore = new Map(state.attempts);
    try {
      return await callback(db);
    } catch (error) {
      state.counters.clear();
      for (const [key, value] of countersBefore) state.counters.set(key, value);
      state.attempts.clear();
      for (const [key, value] of attemptsBefore) state.attempts.set(key, value);
      throw error;
    } finally {
      unlock();
    }
  });

  const exports: Record<string, unknown> = { db };
  return new Proxy(exports, {
    get(target, property, receiver) {
      if (typeof property === "symbol" || property in target) return Reflect.get(target, property, receiver);
      if (property === "__esModule") return true;
      const proxy = tableProxy(property);
      (target as any)[property] = proxy;
      return proxy;
    },
  });
});

import { studentRouter } from "./student";
import type { TrpcContext } from "../context";

function contextFor(id: string): TrpcContext {
  return {
    req: { headers: {} },
    res: {},
    user: { id, fullName: `طالب ${id}`, phone: "0500000000", role: "student" },
  };
}

function attemptId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

describe("student.recordPlacementAttempt", () => {
  beforeEach(() => {
    state.counters.clear();
    state.attempts.clear();
    state.lastAttemptId = null;
    state.transactionQueue = Promise.resolve();
    state.currentSelectTable = undefined;
  });

  it("يحتفظ بالعداد لكل حساب ولكل مسار، ولا ينقل استهلاك جهاز إلى حساب آخر", async () => {
    const accountA = studentRouter.createCaller(contextFor("account-a"));
    const accountB = studentRouter.createCaller(contextFor("account-b"));

    const aQuran = await accountA.recordPlacementAttempt({
      attemptId: attemptId(1), pathType: "quran", durationSeconds: 60,
    });
    const aCorrection = await accountA.recordPlacementAttempt({
      attemptId: attemptId(2), pathType: "tajweed_correction", durationSeconds: 60,
    });
    const bQuran = await accountB.recordPlacementAttempt({
      attemptId: attemptId(3), pathType: "quran", durationSeconds: 60,
    });

    expect(aQuran.attemptsUsed).toBe(1);
    expect(aCorrection.attemptsUsed).toBe(1);
    expect(bQuran.attemptsUsed).toBe(1);
    expect(state.counters.get("account-a:quran")).toBe(1);
    expect(state.counters.get("account-a:tajweed_correction")).toBe(1);
    expect(state.counters.get("account-b:quran")).toBe(1);
    expect(state.attempts.get(attemptId(1))?.studentId).toBe("account-a");
    expect(state.attempts.get(attemptId(3))?.studentId).toBe("account-b");
  });

  it("يقبل خمس محاولات متزامنة كحد أقصى للحساب نفسه ويعيد الباقي دون زيادة", async () => {
    const caller = studentRouter.createCaller(contextFor("same-account"));
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) => caller.recordPlacementAttempt({
        attemptId: attemptId(index + 10),
        pathType: "quran",
        durationSeconds: 60,
      })),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(3);
    expect(state.counters.get("same-account:quran")).toBe(5);
    expect([...state.attempts.values()].filter((attempt) => attempt.studentId === "same-account")).toHaveLength(5);
  });

  it("يعيد نتيجة الطلب المكرر بمفتاح التسجيل نفسه دون استهلاك إضافي", async () => {
    const caller = studentRouter.createCaller(contextFor("retry-account"));
    const request = { attemptId: attemptId(30), pathType: "quran" as const, durationSeconds: 60 };

    const first = await caller.recordPlacementAttempt(request);
    const retry = await caller.recordPlacementAttempt(request);

    expect(first.attemptsUsed).toBe(1);
    expect(retry.attemptsUsed).toBe(1);
    expect(state.counters.get("retry-account:quran")).toBe(1);
    expect(state.attempts.size).toBe(1);
  });

  it("يرفض استخدام محاولة حساب آخر ولا يستهلك من عداد الحساب الثاني", async () => {
    const accountA = studentRouter.createCaller(contextFor("owner-account"));
    const accountB = studentRouter.createCaller(contextFor("other-account"));
    const permit = await accountA.recordPlacementAttempt({
      attemptId: attemptId(40), pathType: "quran", durationSeconds: 60,
    });

    await expect(accountB.recordPlacementAttempt({
      attemptId: permit.attemptId, pathType: "quran", durationSeconds: 60,
    })).rejects.toMatchObject({ code: "CONFLICT" });

    expect(state.counters.get("owner-account:quran")).toBe(1);
    expect(state.counters.get("other-account:quran")).toBeUndefined();
  });
});
