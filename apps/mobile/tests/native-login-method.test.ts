import { describe, expect, it } from "vitest";
import { resolveNativeLoginMethod } from "../lib/account/native-login-method";

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

  it("lets the general login screen take a phone, an email or a username", () => {
    expect(resolveNativeLoginMethod("any", "+965 55667788")).toBe("student");
    expect(resolveNativeLoginMethod("any", "teacher@example.com")).toBe("student");
    expect(resolveNativeLoginMethod("any", "test_teacher")).toBe("account");
  });
});
