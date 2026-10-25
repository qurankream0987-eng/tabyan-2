const COUNTRY_PHONE_RULES: Record<string, { minLength: number; maxLength: number }> = {
  "965": { minLength: 8, maxLength: 8 },
  "966": { minLength: 9, maxLength: 10 },
  "973": { minLength: 8, maxLength: 8 },
  "974": { minLength: 8, maxLength: 8 },
  "971": { minLength: 9, maxLength: 9 },
  "968": { minLength: 8, maxLength: 8 },
  "962": { minLength: 9, maxLength: 9 },
  "970": { minLength: 9, maxLength: 9 },
  "961": { minLength: 7, maxLength: 8 },
  "963": { minLength: 9, maxLength: 9 },
  "964": { minLength: 10, maxLength: 10 },
  "967": { minLength: 9, maxLength: 9 },
  "20": { minLength: 10, maxLength: 10 },
  "249": { minLength: 9, maxLength: 9 },
  "218": { minLength: 9, maxLength: 9 },
  "216": { minLength: 8, maxLength: 8 },
  "213": { minLength: 9, maxLength: 9 },
  "212": { minLength: 9, maxLength: 9 },
  "90": { minLength: 10, maxLength: 10 },
  "92": { minLength: 10, maxLength: 10 },
};

const COUNTRY_DIALS = Object.keys(COUNTRY_PHONE_RULES).sort((a, b) => b.length - a.length);
import { normalizePhoneInput } from "../../../lib/tabyan-trpc/src/lib/input-normalization";
import { isNonWhitespacePassword } from "../../../lib/tabyan-trpc/src/lib/password-validation";

export function normalizeRegistrationPhone(value: string): string {
  return normalizePhoneInput(value);
}

export function validateRegistrationPhone(value: string): string | null {
  const phone = normalizeRegistrationPhone(value);
  if (/^05\d{8}$/.test(phone)) return null;
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return "رقم الهاتف غير صحيح، يرجى إدخاله بصيغة دولية مثل +965XXXXXXXX.";
  }

  const digits = phone.slice(1);
  const dial = COUNTRY_DIALS.find((candidate) => digits.startsWith(candidate));
  if (!dial) return null;

  const national = digits.slice(dial.length);
  const rule = COUNTRY_PHONE_RULES[dial];
  return /^\d+$/.test(national)
    && national.length >= rule.minLength
    && national.length <= rule.maxLength
    ? null
    : "رقم الهاتف غير صحيح، يرجى التأكد من مفتاح الدولة وعدد الأرقام.";
}

export function validateRegistrationPassword(value: string): string | null {
  return isNonWhitespacePassword(value) ? null : "أدخل كلمة المرور";
}