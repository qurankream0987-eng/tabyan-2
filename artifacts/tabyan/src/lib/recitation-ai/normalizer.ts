/**
 * Quran Normalizer — يفصل نص المطابقة عن glyphs QCF المعروضة.
 * القواعد مقصودة أن تكون محافظة: لا نمحو حروفاً جذرية ولا نحوّل التاء
 * المربوطة/الهمزات على واو أو ياء، حتى لا تتساوى كلمتان قرآنـيتان مختلفتان.
 */

/** عقد التطبيع — يُنفَّذ بعد اعتماد المزود */
export interface QuranNormalizer {
  /**
   * يُطبِّع نصاً منطوقاً (من STT) أو نصاً قرآنياً إلى صيغة مطابقة موحدة:
   * إزالة التشكيل، توحيد الهمزات والألفات، معالجة التاء المربوطة… إلخ.
   */
  normalize(text: string): string;
}

/**
 * حارس صريح ضد الاستخدام المبكر — يفشل بوضوح بدلاً من مطابقة وهمية (§32).
 * يُستبدل بالتنفيذ الحقيقي مع الـ Provider Adapter.
 */
const QURAN_MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g;
const FORMAT_CHARS = /[\u200C\u200D\uFEFF]/g;

export function normalizeQuranText(text: string): string {
  return text
    .normalize("NFC")
    // الألف الخنجرية حرف منطوق في الرسم العثماني، وليست علامة تُحذف.
    .replace(/\u0670/g, "ا")
    .replace(QURAN_MARKS, "")
    .replace(/\u0640/g, "") // tatweel
    .replace(FORMAT_CHARS, "")
    // الرسم العثماني/مخرجات ASR يختلفان في هذه الأشكال الإملائية فقط.
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export const quranNormalizer: QuranNormalizer = { normalize: normalizeQuranText };
