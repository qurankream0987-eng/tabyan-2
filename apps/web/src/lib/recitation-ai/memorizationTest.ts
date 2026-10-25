/**
 * اختبار الحفظ (Part 25–27) — منطق حتمي خالص بلا واجهة ولا شبكة.
 *
 * النطاقات المدعومة بدقة من بيانات المصحف الحالية:
 *   سورة · جزء (كل جزء يبدأ أعلى صفحة في الطبعة المدنية) · صفحة · آيات من سورة ·
 *   نطاق مخصص (من آية إلى آية، قد يعبر السور).
 * الحزب والربع: بيانات المصحف الحالية تحفظ رقم الحزب لكل صفحة فقط، والحزب/الربع
 * قد يبدأ في منتصف الصفحة — فلا نخترع حدوداً تقريبية؛ يبقيان غير متاحين.
 *
 * السؤال: بداية آية ظاهرة (cueWords كلمات) ثم تكملة مخفية حتى نهاية الآية
 * (أو عدة آيات حسب الطول). الكلمات نفسها تأتي دائماً من corpus المصحف الكنسي.
 */
import { SURAHS, JUZ_LIST, TOTAL_PAGES } from "@/lib/quran-data";
import { pageOfAyah } from "@/lib/mushaf/page-index";

export type TestScope =
  | { kind: "surah"; surah: number }
  | { kind: "juz"; juz: number }
  | { kind: "page"; page: number }
  | { kind: "ayahs"; surah: number; from: number; to: number }
  | { kind: "custom"; from: { surah: number; ayah: number }; to: { surah: number; ayah: number } };

export type TestScopeKind = TestScope["kind"] | "hizb" | "rub";

export const SCOPE_AVAILABILITY: Record<TestScopeKind, { label: string; available: boolean; note?: string }> = {
  surah: { label: "سورة", available: true },
  juz: { label: "جزء", available: true },
  hizb: { label: "حزب", available: false, note: "حدود الأحزاب على مستوى الآية غير متوفرة في بيانات المصحف الحالية" },
  rub: { label: "ربع", available: false, note: "حدود الأرباع غير متوفرة في بيانات المصحف الحالية" },
  page: { label: "صفحة", available: true },
  ayahs: { label: "آيات", available: true },
  custom: { label: "نطاق مخصص", available: true },
};

export interface AyahRef {
  surah: number;
  ayah: number;
  verseKey: string;
  page: number;
}

export interface TestSettings {
  questionCount: number;
  /** عدد الآيات المخفية في كل سؤال (1..3) */
  ayahsPerQuestion: 1 | 2 | 3;
  /** كلمات البداية الظاهرة */
  cueWords: number;
  /** جلسة مؤقتة: لا تُحفظ في السجل */
  temporary: boolean;
  /** تنبيه صوتي هادئ عند انتهاء كل سؤال */
  sound: boolean;
  /** إظهار الموضع (السورة/الآية) منذ البداية */
  showLocation: boolean;
}

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  questionCount: 5,
  ayahsPerQuestion: 1,
  cueWords: 3,
  temporary: false,
  sound: true,
  showLocation: false,
};

function ref(surah: number, ayah: number): AyahRef {
  return { surah, ayah, verseKey: `${surah}:${ayah}`, page: pageOfAyah(surah, ayah) };
}

function ayahsOfSurah(surah: number, from = 1, to = SURAHS[surah - 1]?.ayahs ?? 0): AyahRef[] {
  const out: AyahRef[] = [];
  const max = SURAHS[surah - 1]?.ayahs ?? 0;
  for (let ayah = Math.max(1, from); ayah <= Math.min(max, to); ayah += 1) out.push(ref(surah, ayah));
  return out;
}

function ayahsOfPages(firstPage: number, lastPage: number): AyahRef[] {
  const out: AyahRef[] = [];
  for (const surah of SURAHS) {
    const nextStart = SURAHS[surah.n]?.startPage ?? TOTAL_PAGES + 1;
    // سورة تنتهي قبل الصفحة الأولى تُتخطى؛ إن بدأت التالية في الصفحة نفسها فقد تشترك فيها.
    if (nextStart < firstPage) continue;
    if (surah.startPage > lastPage) break;
    for (let ayah = 1; ayah <= surah.ayahs; ayah += 1) {
      const page = pageOfAyah(surah.n, ayah);
      if (page < firstPage) continue;
      if (page > lastPage) break;
      out.push({ surah: surah.n, ayah, verseKey: `${surah.n}:${ayah}`, page });
    }
  }
  return out;
}

/** يحوّل نطاق الاختبار إلى قائمة آيات كنسية مرتبة. */
export function resolveScope(scope: TestScope): AyahRef[] {
  switch (scope.kind) {
    case "surah":
      return ayahsOfSurah(scope.surah);
    case "ayahs":
      return ayahsOfSurah(scope.surah, scope.from, scope.to);
    case "page":
      return ayahsOfPages(scope.page, scope.page);
    case "juz": {
      const juz = JUZ_LIST[scope.juz - 1];
      if (!juz) return [];
      const last = (JUZ_LIST[scope.juz]?.startPage ?? TOTAL_PAGES + 1) - 1;
      return ayahsOfPages(juz.startPage, last);
    }
    case "custom": {
      const { from, to } = scope;
      const out: AyahRef[] = [];
      for (let surah = from.surah; surah <= to.surah; surah += 1) {
        const start = surah === from.surah ? from.ayah : 1;
        const end = surah === to.surah ? to.ayah : SURAHS[surah - 1]?.ayahs ?? 0;
        out.push(...ayahsOfSurah(surah, start, end));
      }
      return out;
    }
  }
}

export function describeScope(scope: TestScope): string {
  const name = (surah: number) => SURAHS[surah - 1]?.name ?? "";
  switch (scope.kind) {
    case "surah": return `سورة ${name(scope.surah)}`;
    case "juz": return JUZ_LIST[scope.juz - 1]?.name ?? `الجزء ${scope.juz}`;
    case "page": return `صفحة ${scope.page}`;
    case "ayahs": return `${name(scope.surah)} ${scope.from}–${scope.to}`;
    case "custom": return `${name(scope.from.surah)} ${scope.from.ayah} — ${name(scope.to.surah)} ${scope.to.ayah}`;
  }
}

/** mulberry32 — اختيار حتمي قابل للتكرار عند تمرير البذرة نفسها. */
export function seededRandom(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestQuestion {
  id: number;
  start: AyahRef;
  /** آخر آية مخفية في السؤال (شاملة) */
  end: AyahRef;
  cueWords: number;
}

/**
 * يختار أسئلة موزعة على النطاق كله (عيّنة طبقية): يُقسم النطاق إلى count شرائح
 * ويُختار موضع واحد من كل شريحة، فلا تتكدس الأسئلة في بداية السورة.
 * `wordCount` يعيد عدد كلمات الآية إن كان معروفاً — الآيات الأقصر من البداية
 * الظاهرة + كلمتين لا تصلح سؤالاً وحدها فتُمدَّد للآية التالية.
 */
export function buildQuestions(
  ayahs: AyahRef[],
  settings: Pick<TestSettings, "questionCount" | "ayahsPerQuestion" | "cueWords">,
  seed: number,
  wordCount?: (verseKey: string) => number | undefined,
): TestQuestion[] {
  const span = settings.ayahsPerQuestion;
  const candidates = ayahs.length - span + 1;
  if (candidates <= 0) return [];
  const count = Math.max(1, Math.min(settings.questionCount, candidates));
  const random = seededRandom(seed);
  const questions: TestQuestion[] = [];
  const used = new Set<number>();
  for (let bucket = 0; bucket < count; bucket += 1) {
    const lo = Math.floor((bucket * candidates) / count);
    const hi = Math.max(lo, Math.floor(((bucket + 1) * candidates) / count) - 1);
    let startIndex = lo + Math.floor(random() * (hi - lo + 1));
    while (used.has(startIndex) && startIndex < hi) startIndex += 1;
    used.add(startIndex);
    let endIndex = Math.min(ayahs.length - 1, startIndex + span - 1);
    const startWords = wordCount?.(ayahs[startIndex].verseKey);
    if (startWords !== undefined && startWords < settings.cueWords + 2 && endIndex === startIndex && endIndex + 1 < ayahs.length) {
      endIndex += 1;
    }
    questions.push({
      id: bucket + 1,
      start: ayahs[startIndex],
      end: ayahs[endIndex],
      cueWords: startWords !== undefined ? Math.max(1, Math.min(settings.cueWords, startWords - 1)) : settings.cueWords,
    });
  }
  return questions;
}

export type QuestionOutcome = "mastered" | "with_hints" | "mistakes" | "skipped" | "self_correct" | "self_wrong";

export interface QuestionResult {
  questionId: number;
  outcome: QuestionOutcome;
  confirmedMistakes: number;
  correctedMistakes: number;
  peeks: number;
  hiddenWords: number;
  locationShown: boolean;
}

/**
 * تصنيف شفاف لنتيجة سؤال:
 *   mastered   = لا أخطاء مؤكدة ولا تلميحات
 *   with_hints = لا أخطاء مؤكدة مع تلميح واحد على الأقل
 *   mistakes   = خطأ مؤكد واحد على الأقل
 * الأخطاء المصحَّحة ذاتياً لا تُسقط الإتقان لكنها تُسجَّل.
 */
export function classifyQuestion(result: { confirmedMistakes: number; peeks: number }): QuestionOutcome {
  if (result.confirmedMistakes > 0) return "mistakes";
  if (result.peeks > 0) return "with_hints";
  return "mastered";
}

export const OUTCOME_LABEL: Record<QuestionOutcome, string> = {
  mastered: "متقن",
  with_hints: "صحيح بتلميح",
  mistakes: "فيه أخطاء",
  skipped: "تُخطّي",
  self_correct: "صحيح (تقييم ذاتي)",
  self_wrong: "يحتاج مراجعة (تقييم ذاتي)",
};

export interface TestSummary {
  total: number;
  answered: number;
  mastered: number;
  withHints: number;
  withMistakes: number;
  skipped: number;
  /** نسبة الأسئلة المتقنة أو الصحيحة بتلميح من المُجاب عنها */
  scorePercent: number | null;
}

export function summarizeTest(results: QuestionResult[], total: number): TestSummary {
  const count = (outcomes: QuestionOutcome[]) => results.filter((r) => outcomes.includes(r.outcome)).length;
  const skipped = count(["skipped"]);
  const answered = results.length - skipped;
  const good = count(["mastered", "with_hints", "self_correct"]);
  return {
    total,
    answered,
    mastered: count(["mastered", "self_correct"]),
    withHints: count(["with_hints"]),
    withMistakes: count(["mistakes", "self_wrong"]),
    skipped,
    scorePercent: answered ? Math.round((good / answered) * 100) : null,
  };
}
