export type NativeLoginMethod = "student" | "account" | "invalid-student-identifier";

const PHONE_PATTERN = /^(?:\+\d{6,15}|00\d{6,14}|0\d{7,14})$/;

export function resolveNativeLoginMethod(role: string, identifier: string): NativeLoginMethod {
  if (role !== "student") return "account";

  const value = identifier.trim();
  const phoneCandidate = value.replace(/[^\d+]/g, "");
  return PHONE_PATTERN.test(phoneCandidate) || value.includes("@")
    ? "student"
    : "invalid-student-identifier";
}
