import { describe, expect, it } from "vitest";
import { normalizeLoginIdentifier, resolveNativeLoginMethod } from "../lib/account/native-login-method";

describe("Native Tabyan password login routing", () => {
  it.each(["+965 55667788", "0096555667788", "055667788"])(
    "routes student phone identifier %s to student password auth",
    (identifier) => {
      expect(resolveNativeLoginMethod("student", identifier)).toBe("student");
    },
  );

  it("routes student email to student password auth", () => {
    expect(resolveNativeLoginMethod("student", " learner@example.com ")).toBe("student");
  });

  it("rejects a username for students", () => {
    expect(resolveNativeLoginMethod("student", "studentname")).toBe("invalid-student-identifier");
  });

  it.each(["teacher", "admin"] as const)("routes %s username to account password auth", (role) => {
    expect(resolveNativeLoginMethod(role, "teachername")).toBe("account");
  });

  it("lets a teacher sign in by phone or email from the teacher screen", () => {
    expect(resolveNativeLoginMethod("teacher", "+965 55667788")).toBe("student");
    expect(resolveNativeLoginMethod("teacher", "teacher@example.com")).toBe("student");
  });

  it("converts Arabic digits only for phone numbers", () => {
    expect(normalizeLoginIdentifier("٠٥٥٦٦٧٧٨٨")).toBe("055667788");
    expect(normalizeLoginIdentifier("user٢٠٢٤")).toBe("user٢٠٢٤");
    expect(normalizeLoginIdentifier(" a@b.com ")).toBe("a@b.com");
  });

  it("lets the general login screen take a phone, an email or a username", () => {
    expect(resolveNativeLoginMethod("any", "+965 55667788")).toBe("student");
    expect(resolveNativeLoginMethod("any", "teacher@example.com")).toBe("student");
    expect(resolveNativeLoginMethod("any", "test_teacher")).toBe("account");
  });
});
