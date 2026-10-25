const TECHNICAL_ERROR_MARKERS = [
  "TRPC",
  "Zod",
  "SQL",
  "stack",
  "Error:",
  "undefined",
  "null",
  "constraint",
  "relation",
  "column",
  "clerk",
  "oidc",
  "oauth",
  "bcrypt",
  "JSON",
];

/**
 * Keep server-provided Arabic validation/authorization messages useful while
 * preventing implementation details from reaching the user interface.
 */
export function userFacingErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (message.includes("AUTH_RECOVERY_PENDING")) {
    return "هذا الحساب يحتاج إلى استرداد الوصول — تواصل مع دعم تبيان";
  }
  if (
    message &&
    message.length <= 220 &&
    /[\u0600-\u06ff]/u.test(message) &&
    !/^[\[{]/.test(message) &&
    !TECHNICAL_ERROR_MARKERS.some((marker) => message.toLowerCase().includes(marker.toLowerCase()))
  ) {
    return message;
  }
  return fallback;
}