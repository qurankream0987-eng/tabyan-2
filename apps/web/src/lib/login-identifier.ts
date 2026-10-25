import { normalizePhoneInput } from "@workspace/tabyan-domain/input-normalization";

export function loginIdentifierTarget(raw: string) {
  const value = raw.trim();
  const phone = normalizePhoneInput(value);
  if (/^\+|^05/.test(phone)) return { kind: "identifier" as const, value: phone };
  if (value.includes("@")) return { kind: "identifier" as const, value };
  // Never normalize Arabic/Persian digits in usernames or alter passwords.
  return { kind: "username" as const, value };
}
