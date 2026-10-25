/** أنواع مشتركة لميزة التسميع — Phase 1A */

export type HideMode = "full_hide" | "first_word" | "progressive_reveal" | "visible_review";
export type RecitationMode = "general" | "educational";
export type SessionMode = RecitationMode;
export type SessionStatus = "listening" | "paused" | "completed" | "failed";

export interface RecitationPosition {
  surahId: number;
  ayah: number;
  wordPosition?: number;
}

export interface ExpectedRecitationRange {
  start: RecitationPosition;
  end: RecitationPosition;
}

export interface GeneralStartContext {
  startPage?: number;
  startVerseKey?: string;
  startWordPosition?: number;
}

export interface RecitationPolicy {
  mode: RecitationMode;
  requiresExpectedRange: boolean;
  expectedEndPosition: "none" | "range";
  allowsEducationalProgress: boolean;
  recoveryScope: "broad_local" | "constrained";
  rangeCompletionEnabled: boolean;
}

/** العقد متعمد أن يكون mode هو مصدر الحقيقة، لا وجود نطاق آيات. */
export const RECITATION_POLICIES: Record<RecitationMode, RecitationPolicy> = {
  general: {
    mode: "general",
    requiresExpectedRange: false,
    expectedEndPosition: "none",
    allowsEducationalProgress: false,
    recoveryScope: "broad_local",
    rangeCompletionEnabled: false,
  },
  educational: {
    mode: "educational",
    requiresExpectedRange: true,
    expectedEndPosition: "range",
    allowsEducationalProgress: true,
    recoveryScope: "constrained",
    rangeCompletionEnabled: true,
  },
};

/** آية مع نصها الكامل وكلماتها مُجزَّأة للكشف التدريجي */
export type AyahData = {
  numberInSurah: number;
  text: string;
  words: string[];
};

/** تسميات أوضاع الإخفاء بالعربية */
export const HIDE_MODE_LABELS: Record<HideMode, string> = {
  full_hide: "إخفاء كامل",
  first_word: "الكلمة الأولى فقط",
  progressive_reveal: "كشف تدريجي",
  visible_review: "مراجعة بالنص",
};

/** وصف موجز لكل وضع — يظهر في شاشة الإعداد */
export const HIDE_MODE_DESC: Record<HideMode, string> = {
  full_hide: "يظهر سطر فارغ — سمّع من الذاكرة تماماً",
  first_word: "تظهر الكلمة الأولى من كل آية كمؤشر",
  progressive_reveal: "اكشف كلمة واحدة في كل مرة بالضغط",
  visible_review: "يظهر النص كاملاً — للمراجعة بالقراءة",
};

/** تنسيق المدة (ثواني) → دقيقة:ثانية أو ساعة:دقيقة:ثانية */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** رقم الآية بالأرقام العربية */
export function toArabicNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}
