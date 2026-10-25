import { readAccountStorage, writeAccountStorage } from "@/lib/account-storage";

/**
 * تفضيلات جلسة Tabyan AI المحلية للحساب الحالي.
 * التخزين قد يكون غير متاح (تصفح خاص/حظر)، فكل قراءة/كتابة محمية.
 * المفتاح القديم لوضع التصحيح الصارم محفوظ كما هو للتوافق.
 */
const STRICT_KEY = "tabyan_ai_strict_correction";
const TASHKEEL_KEY = "tabyan_ai_tashkeel_experimental";
const HIDE_VERSES_KEY = "tabyan_ai_memorize_hide_verses";
const HIDE_MARKERS_KEY = "tabyan_ai_memorize_hide_markers";

export interface RecitationAiOptions {
  /** "لا تنتقل حتى أصحح الخطأ" */
  strict: boolean;
  /** "كشف أخطاء التشكيل" — تجريبي، افتراضياً مغلق */
  tashkeel?: boolean;
  /** الحفظ: إخفاء الآيات وكشفها تدريجياً مع التلاوة الصحيحة */
  hideVerses?: boolean;
  /** الحفظ/الاختبار فقط: إخفاء علامات الآيات أيضاً */
  hideMarkers?: boolean;
}

function readFlag(accountId: string | null, key: string) {
  return readAccountStorage(accountId, key) === "1";
}

function writeFlag(accountId: string | null, key: string, value: boolean | undefined) {
  if (value === undefined) return;
  writeAccountStorage(accountId, key, value ? "1" : "0");
}

export function loadRecitationAiOptions(accountId: string | null): RecitationAiOptions {
  return {
    strict: readFlag(accountId, STRICT_KEY),
    tashkeel: readFlag(accountId, TASHKEEL_KEY),
    hideVerses: readFlag(accountId, HIDE_VERSES_KEY),
    hideMarkers: readFlag(accountId, HIDE_MARKERS_KEY),
  };
}

export function saveRecitationAiOptions(options: RecitationAiOptions, accountId: string | null) {
  writeFlag(accountId, STRICT_KEY, options.strict);
  writeFlag(accountId, TASHKEEL_KEY, options.tashkeel);
  writeFlag(accountId, HIDE_VERSES_KEY, options.hideVerses);
  writeFlag(accountId, HIDE_MARKERS_KEY, options.hideMarkers);
}
