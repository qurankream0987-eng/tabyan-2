/**
 * Password policy shared by registration, login, account management, and
 * the administrative master-password change flow.
 *
 * This is validation only: callers must pass the original value unchanged
 * to bcrypt and to password comparison.
 */
export function isNonWhitespacePassword(value: string): boolean {
  return value.trim().length >= 1;
}