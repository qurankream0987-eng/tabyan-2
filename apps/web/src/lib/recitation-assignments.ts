/**
 * واجبات التسميع — أدوات مشتركة بين صفحة الطالب وقارئ المصحف وملف الطالب عند المعلم.
 *
 * النتيجة يحسبها محرك الأخطاء على جهاز الطالب وتُرسل كما هي؛ المعلم وحده يقيّم.
 * لا شيء هنا يحسب درجة.
 */
import { SURAHS } from "@/lib/quran-data";
import type { HideMode } from "@/lib/recitation-types";
import type { RecitationEngineEvent, RecitationWordState } from "@/lib/recitation-ai/recitationStateEngine";

/** نوع سجل المحرك عند الكلمة (خطأ أو تصحيح أو تلميح…). */
type EngineEventKind = RecitationEngineEvent["kind"];

export type AssignmentStatus = "assigned" | "submitted" | "reviewed" | "cancelled";
export type FlaggedWordKind = "mistake" | "skipped" | "corrected" | "peeked";

export interface FlaggedWord {
  /** "سورة:آية:موضع الكلمة" */
  key: string;
  kind: FlaggedWordKind;
}

/** ما يرسله الطالب (recitationAssignments.submit)؛ الخادم يضيف المدة من الجلسة. */
export interface AssignmentResultPayload {
  wordsRecited: number;
  totalWords: number;
  confirmedMistakes: number;
  skippedWords: number;
  correctedWords: number;
  peekedWords: number;
  flaggedWords: FlaggedWord[];
}

/** واجب بالقدر الذي يحتاجه القارئ لبدء جلسة تعليمية منه. */
export interface MushafAssignment {
  id: string;
  surahId: number;
  startAyah: number;
  endAyah: number;
  hideMode: HideMode;
  note: string | null;
  teacherName?: string | null;
}

/** أقصى عدد كلمات معلَّمة يقبله الخادم في التسليم الواحد. */
export const MAX_FLAGGED_WORDS = 500;

/** أوضاع العرض التي يختار منها المعلم (بأسماء يفهمها الطالب). */
export const ASSIGNMENT_HIDE_MODES: { value: HideMode; label: string; hint: string }[] = [
  { value: "progressive_reveal", label: "تسميع", hint: "النص مخفي ويظهر كلما سمّع الطالب" },
  { value: "first_word", label: "أول كلمة", hint: "تظهر أول كلمة من كل آية فقط" },
  { value: "visible_review", label: "مراجعة بالنظر", hint: "النص ظاهر — يقرأ الطالب من المصحف" },
];

export function assignmentHideModeLabel(mode: HideMode): string {
  return ASSIGNMENT_HIDE_MODES.find((m) => m.value === mode)?.label
    ?? (mode === "full_hide" ? "إخفاء كامل" : mode);
}

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: "لم يُسلَّم",
  submitted: "سُلِّم — بانتظار المعلم",
  reviewed: "قيّمه المعلم",
  cancelled: "أُلغي",
};

/** يبدأ الطالب (أو يعيد) التسميع ما دام المعلم لم يقيّمه. */
export function canRecite(status: AssignmentStatus): boolean {
  return status === "assigned" || status === "submitted";
}

export function assignmentRangeLabel(a: { surahId: number; startAyah: number; endAyah: number }): string {
  const name = SURAHS[a.surahId - 1]?.name ?? `#${a.surahId}`;
  return a.startAyah === a.endAyah
    ? `سورة ${name} — الآية ${a.startAyah}`
    : `سورة ${name} — الآيات ${a.startAyah}–${a.endAyah}`;
}

/**
 * تصنيف حالة كلمة في المحرك إلى ما يُرسل للمعلم. الخطأ المؤكد من نوع السقوط
 * (OMISSION) يُعرض كتخطٍّ؛ الانحرافات غير المؤكدة لا تُرسل أبداً.
 */
export function flaggedKindFor(
  state: RecitationWordState,
  mistakeKind: EngineEventKind | null | undefined,
): FlaggedWordKind | null {
  switch (state) {
    case "CONFIRMED_ERROR":
      return mistakeKind === "OMISSION" ? "skipped" : "mistake";
    case "SKIPPED":
      return "skipped";
    case "CORRECTED":
      return "corrected";
    case "PEEKED":
      return "peeked";
    default:
      return null;
  }
}

export interface EngineWordEntry {
  verseKey: string;
  position: number;
  state: RecitationWordState;
  mistakeKind?: EngineEventKind | null;
}

/**
 * كلمات نطاق الواجب بترتيب الـ matcher مع حالتها في المحرك. أي كلمة خارج
 * النطاق (لا يُفترض وجودها في corpus تعليمي) تُهمل احتياطاً.
 */
export function collectRangeWords(
  wordAt: (index: number) => { verseKey: string; position: number; surah: number; ayah: number } | null,
  engine: { stateAt(index: number): RecitationWordState; mistakeAt(index: number): { kind: EngineEventKind } | null },
  range: { surahId: number; startAyah: number; endAyah: number },
): EngineWordEntry[] {
  const words: EngineWordEntry[] = [];
  for (let index = 0; ; index += 1) {
    const word = wordAt(index);
    if (!word) break;
    if (word.surah !== range.surahId || word.ayah < range.startAyah || word.ayah > range.endAyah) continue;
    words.push({
      verseKey: word.verseKey,
      position: word.position,
      state: engine.stateAt(index),
      mistakeKind: engine.mistakeAt(index)?.kind ?? null,
    });
  }
  return words;
}

/**
 * يبني نتيجة التسليم من كلمات نطاق الواجب بالترتيب. الأعداد تُحسب من الكلمات
 * المعلَّمة نفسها حتى تطابق ما يراه المعلم في القائمة (وما يرسله تطبيق الجوال).
 */
export function buildAssignmentResult(words: readonly EngineWordEntry[], wordsRecited: number): AssignmentResultPayload {
  const result: AssignmentResultPayload = {
    wordsRecited: Math.max(0, Math.min(wordsRecited, words.length)),
    totalWords: words.length,
    confirmedMistakes: 0,
    skippedWords: 0,
    correctedWords: 0,
    peekedWords: 0,
    flaggedWords: [],
  };
  for (const word of words) {
    const kind = flaggedKindFor(word.state, word.mistakeKind);
    if (!kind) continue;
    if (kind === "mistake") result.confirmedMistakes += 1;
    else if (kind === "skipped") result.skippedWords += 1;
    else if (kind === "corrected") result.correctedWords += 1;
    else result.peekedWords += 1;
    if (result.flaggedWords.length < MAX_FLAGGED_WORDS) {
      result.flaggedWords.push({ key: `${word.verseKey}:${word.position}`, kind });
    }
  }
  return result;
}

export interface FlaggedAyahGroup {
  verseKey: string;
  ayah: number;
  words: { position: number; kind: FlaggedWordKind }[];
}

/** يجمع الكلمات المعلَّمة حسب الآية ويرتبها مصحفياً؛ المفاتيح التالفة تُهمل. */
export function groupFlaggedByAyah(flagged: readonly FlaggedWord[]): FlaggedAyahGroup[] {
  const groups = new Map<string, FlaggedAyahGroup & { surah: number }>();
  for (const word of flagged) {
    const parts = word.key.split(":").map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 1)) continue;
    const [surah, ayah, position] = parts;
    const verseKey = `${surah}:${ayah}`;
    let group = groups.get(verseKey);
    if (!group) { group = { verseKey, surah, ayah, words: [] }; groups.set(verseKey, group); }
    group.words.push({ position, kind: word.kind });
  }
  return [...groups.values()]
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah)
    .map(({ verseKey, ayah, words }) => ({
      verseKey,
      ayah,
      words: words.sort((a, b) => a.position - b.position),
    }));
}

export const FLAGGED_KIND_LABEL: Record<FlaggedWordKind, string> = {
  mistake: "خطأ",
  skipped: "تخطٍّ",
  corrected: "صحّحه",
  peeked: "تلميح",
};
