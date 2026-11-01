export type NativeLoginMethod = "student" | "account" | "invalid-student-identifier";

/** "any" is the general login screen, opened without a role. */
export type NativeLoginRole = "any" | "student" | "teacher" | "admin";

const PHONE_PATTERN = /^(?:\+\d{6,15}|00\d{6,14}|0\d{7,14})$/;

function isPhoneOrEmail(identifier: string) {
  const value = identifier.trim();
  return PHONE_PATTERN.test(value.replace(/[^\d+]/g, "")) || value.includes("@");
}

/**
 * "student" is the phone/email password endpoint, which also signs in
 * teachers who have a phone; "account" is the username endpoint for teachers
 * and admins.
 */
export function resolveNativeLoginMethod(role: NativeLoginRole, identifier: string): NativeLoginMethod {
  if (role === "teacher" || role === "admin") return "account";
  if (isPhoneOrEmail(identifier)) return "student";
  return role === "any" ? "account" : "invalid-student-identifier";
}
