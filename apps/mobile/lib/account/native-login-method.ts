import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

export type NativeLoginMethod = "student" | "account" | "invalid-student-identifier";

/** "any" is the general login screen, opened without a role. */
export type NativeLoginRole = "any" | "student" | "teacher" | "admin";

const PHONE_PATTERN = /^(?:\+\d{6,15}|00\d{6,14}|0\d{7,14})$/;

function isPhone(identifier: string) {
  return PHONE_PATTERN.test(identifier.replace(/[^\d+]/g, ""));
}

function isPhoneOrEmail(identifier: string) {
  const value = identifier.trim();
  return isPhone(value) || value.includes("@");
}

/**
 * Arabic-Indic digits are converted only when the result is a phone number;
 * usernames and emails are sent as typed.
 */
export function normalizeLoginIdentifier(raw: string): string {
  const value = raw.trim();
  if (value.includes("@")) return value;
  const digits = normalizeDigits(value);
  return isPhone(digits) ? digits : value;
}

/**
 * "student" is the phone/email password endpoint, which also signs in
 * teachers who have a phone; "account" is the username endpoint for teachers
 * and admins. Admins only have usernames.
 */
export function resolveNativeLoginMethod(role: NativeLoginRole, identifier: string): NativeLoginMethod {
  if (role === "admin") return "account";
  if (isPhoneOrEmail(identifier)) return "student";
  return role === "student" ? "invalid-student-identifier" : "account";
}
