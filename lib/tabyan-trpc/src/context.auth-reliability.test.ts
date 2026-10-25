import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

const fixture = vi.hoisted(() => ({
  rows: [] as unknown[][],
  failure: false,
}));
vi.mock("@workspace/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@workspace/db")>();
  const select = () => {
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      limit: async () => {
        if (fixture.failure) throw new Error("fixture database unavailable");
        return fixture.rows.shift() ?? [];
      },
    };
    return chain;
  };
  return { ...original, db: { select } };
});
import { createContext } from "./context";
const opts = { req: { headers: { authorization: "Bearer fixture-session" } }, res: {} } as CreateExpressContextOptions;
beforeEach(() => { fixture.failure = false; fixture.rows = []; });

describe("session resolution error semantics", () => {
  it("an unavailable database is 500, never an invented unauthenticated session", async () => {
    fixture.failure = true;
    await expect(createContext(opts)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "تعذّر الاتصال بالخادم — حاول مرة أخرى",
    });
  });
  it("a genuinely expired or missing token remains unauthenticated", async () => {
    expect((await createContext(opts)).user).toBeNull();
  });
  it.each(["student", "teacher", "admin"])("resolves the persisted %s role", async (role) => {
    fixture.rows = [[{ userId: "fixture-user", fullName: "حساب اختبار", phone: null, tokenRole: role, userRole: role }]];
    if (role === "admin") fixture.rows.push([{ id: "fixture-admin-session" }]);
    expect((await createContext(opts)).user).toMatchObject({ id: "fixture-user", role });
  });
  it("a revoked administrator session cannot authenticate", async () => {
    fixture.rows = [[{ userId: "fixture", fullName: "اختبار", tokenRole: "admin", userRole: "admin" }], []];
    expect((await createContext(opts)).user).toBeNull();
  });
});
