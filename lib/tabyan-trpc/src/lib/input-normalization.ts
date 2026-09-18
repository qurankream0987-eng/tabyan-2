const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ASCII_USERNAME_CHAR_RE = /^[A-Za-z0-9_.-]$/;
const ARABIC_SCRIPT_RE = /\p{Script=Arabic}/u;
const USERNAME_LETTER_MARK_NUMBER_RE = /[\p{Letter}\p{Mark}\p{Number}]/u;

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(digit);
    return String(arabicIndex >= 0 ? arabicIndex : PERSIAN_DIGITS.indexOf(digit));
  });
}

export function normalizePhoneInput(value: string): string {
  const compact = normalizeDigits(value).trim().replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidPersonName(value: string, minLength = 3, maxLength = 50): boolean {
  const normalized = normalizePersonName(value);
  if (normalized.length < minLength || normalized.length > maxLength) return false;
  if (/[\p{Cc}\p{Cf}]/u.test(normalized)) return false;
  return /\p{L}/u.test(normalized);
}

/** تطبيع اسم المستخدم دون تحويل الأرقام العربية/الفارسية أو تهجئة الاسم العربي */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * أسماء حسابات الإشراف: حروف عربية أو إنجليزية، أرقام ASCII/عربية/فارسية،
 * و _ أو - أو . للتوافق مع الحسابات الإنجليزية القائمة. لا يُشترط أن يبدأ
 * الاسم بحرف إنجليزي.
 */
export function isValidUsername(value: string, minLength = 3, maxLength = 30): boolean {
  const normalized = normalizeUsername(value);
  const chars = Array.from(normalized);
  if (chars.length < minLength || chars.length > maxLength) return false;
  if (/[\p{Cc}\p{Cf}\s]/u.test(normalized)) return false;
  return chars.every((char) =>
    ASCII_USERNAME_CHAR_RE.test(char)
    || (ARABIC_SCRIPT_RE.test(char) && USERNAME_LETTER_MARK_NUMBER_RE.test(char)),
  );
}