import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginSource = readFileSync(new URL("../app/(auth)/login.tsx", import.meta.url), "utf8");
const registerSource = readFileSync(new URL("../app/(auth)/register.tsx", import.meta.url), "utf8");
const authScreens = `${loginSource}\n${registerSource}`;
const mobilePackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  dependencies: Record<string, string>;
};

describe("Native authentication providers", () => {
  it("contains no Google, OAuth, AuthSession, or Clerk flow in login or registration", () => {
    expect(authScreens).not.toMatch(/google|oauth|authsession|clerk|promptasync/i);
  });

  it("does not include the Native Google auth module or its AuthSession dependency", () => {
    expect(existsSync(new URL("../lib/google-auth.tsx", import.meta.url))).toBe(false);
    expect(mobilePackage.dependencies["expo-auth-session"]).toBeUndefined();
  });

  it("keeps Tabyan password authentication for students and other roles", () => {
    expect(loginSource).toContain("studentPasswordLogin");
    expect(loginSource).toContain("passwordLogin");
    expect(loginSource).toContain("resolveNativeLoginMethod");
    expect(registerSource).toContain("completeProfile");
    expect(registerSource).toContain("phone:");
  });
});
