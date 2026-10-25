/**
 * مشغّل «اختبار الحفظ» داخل القارئ (Part 25–27).
 *
 * التدفق: بداية ظاهرة ← تكملة مخفية ← كشف حي مع التلاوة الصحيحة ← تقدّم ← نتيجة.
 * - مع تبيان AI: جلسة تسميع واحدة للاختبار كله؛ لكل سؤال matcher/engine جديدان
 *   يبدآن بعد كلمات البداية، ويكتمل السؤال حين يتجاوز الموضع الملتزم آخر كلمة مخفية.
 * - دون AI: كشف يدوي بالتلميح ثم تقييم ذاتي صريح (لا يُدّعى تحقق آلي).
 * الكلمات من corpus المصحف الكنسي فقط؛ الإخفاء opacity فقط (لا تغيير هندسة).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { loadCanonicalWordsForPage, type CanonicalQuranWord } from "@/lib/recitation-ai/canonicalWords";
import {
  buildQuestions, classifyQuestion, describeScope, resolveScope, summarizeTest,
  type QuestionResult, type TestQuestion, type TestScope, type TestSettings, type TestSummary,
} from "@/lib/recitation-ai/memorizationTest";

export interface QuestionRuntime {
  question: TestQuestion;
  words: CanonicalQuranWord[];
  /** أول كلمة مخفية (بعد البداية الظاهرة) */
  startIndex: number;
  /** نهاية السؤال (حصرية) */
  endIndex: number;
  /** أول كلمة في البداية الظاهرة */
  cueIndex: number;
  answered: boolean;
  manualRevealed: number;
  manualPeeks: number;
  locationShown: boolean;
  result: QuestionResult | null;
}

export interface TestRunState {
  scopeLabel: string;
  scope: TestScope;
  settings: TestSettings;
  questions: TestQuestion[];
  current: number;
  runtime: QuestionRuntime | null;
  results: QuestionResult[];
  mode: "ai" | "manual";
  startedAt: number;
  finished: boolean;
  summary: TestSummary | null;
  loading: boolean;
  error: string | null;
}

export interface TestRunnerDeps {
  aiEnabled: boolean;
  navigate: (page: number) => void;
  /** يُنشئ matcher/engine جديدين للسؤال عند فهرس أول كلمة مخفية */
  installQuestionMatcher: (words: CanonicalQuranWord[], startIndex: number) => void;
  /** يبدأ جلسة التسميع الحية للاختبار (مرة واحدة) */
  startAi: (page: number, startVerseKey: string) => Promise<boolean>;
  /** ينهي جلسة الاختبار الحية (حفظ) أو يلغيها */
  stopAi: (save: boolean) => Promise<void>;
  /** تلميح عبر محرك الحالات (AI) */
  peekAi: (indices: number[]) => void;
  committedIndex: () => number;
  /** إحصاءات المحرك الحالي للسؤال */
  engineStats: () => { confirmed: number; corrected: number; peeks: number };
  onQuestionComplete?: (result: QuestionResult) => void;
  onFinished?: (state: TestRunState) => void;
}

async function loadQuestionWords(question: TestQuestion): Promise<CanonicalQuranWord[]> {
  const pages: number[] = [];
  for (let page = question.start.page; page <= question.end.page; page += 1) pages.push(page);
  const words = (await Promise.all(pages.map(loadCanonicalWordsForPage))).flat();
  return words;
}

function buildRuntime(question: TestQuestion, words: CanonicalQuranWord[], showLocation: boolean): QuestionRuntime | null {
  const cueIndex = words.findIndex((w) => w.verseKey === question.start.verseKey && w.position === 1);
  if (cueIndex < 0) return null;
  let endIndex = -1;
  words.forEach((w, i) => { if (w.verseKey === question.end.verseKey) endIndex = i + 1; });
  if (endIndex < 0) return null;
  const startIndex = Math.min(endIndex - 1, cueIndex + question.cueWords);
  return {
    question, words, cueIndex, startIndex, endIndex,
    answered: false, manualRevealed: 0, manualPeeks: 0, locationShown: showLocation, result: null,
  };
}

/** خريطة الكشف (verseKey → عدد الكلمات الظاهرة) للصفحة أثناء السؤال. */
export function testRevealMap(runtime: QuestionRuntime, committedIndex: number | null, peeked: Iterable<number>): Map<string, number> {
  const revealed = new Map<string, number>();
  const boundary = runtime.answered
    ? runtime.endIndex
    : Math.min(runtime.endIndex, Math.max(runtime.startIndex + runtime.manualRevealed, committedIndex ?? 0));
  const mark = (index: number) => {
    const word = runtime.words[index];
    if (word) revealed.set(word.verseKey, Math.max(revealed.get(word.verseKey) ?? 0, word.position));
  };
  for (let i = runtime.cueIndex; i < Math.max(boundary, runtime.startIndex); i += 1) mark(i);
  for (const index of peeked) if (index >= runtime.startIndex && index < runtime.endIndex) mark(index);
  return revealed;
}

/** Exact next-word / current-ayah hints, bounded to this question. */
export function testHintIndices(runtime: QuestionRuntime, revealed: Map<string, number>, kind: "word" | "ayah"): number[] {
  if (runtime.answered) return [];
  const first = runtime.words.findIndex((word, index) =>
    index >= runtime.startIndex && index < runtime.endIndex &&
    word.position > (revealed.get(word.verseKey) ?? 0));
  if (first < 0) return [];
  const indices = [first];
  if (kind === "ayah") {
    for (let index = first + 1; index < runtime.endIndex; index++) {
      if (runtime.words[index].verseKey !== runtime.words[first].verseKey) break;
      indices.push(index);
    }
  }
  return indices;
}

export function useMemorizationTestRunner(deps: TestRunnerDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const [state, setState] = useState<TestRunState | null>(null);
  const stateRef = useRef<TestRunState | null>(null);

  /**
   * تحديث متزامن: الحالة الجديدة تُحسب من المرجع فوراً ثم تُسلَّم لـ React، كي
   * تقرأ الخطوة التالية في نفس الحدث (مثل «تخطي» ثم «التالي») النتيجة الحديثة.
   */
  const update = useCallback((patch: (s: TestRunState) => TestRunState) => {
    const previous = stateRef.current;
    if (!previous) return;
    const next = patch(previous);
    stateRef.current = next;
    setState(next);
  }, []);

  const openQuestion = useCallback(async (index: number, base: TestRunState) => {
    const question = base.questions[index];
    const loadingState = { ...base, current: index, runtime: null, loading: true, error: null };
    stateRef.current = loadingState;
    setState(loadingState);
    try {
      const words = await loadQuestionWords(question);
      const runtime = buildRuntime(question, words, base.settings.showLocation);
      if (!runtime) throw new Error("question");
      depsRef.current.navigate(question.start.page);
      if (base.mode === "ai") depsRef.current.installQuestionMatcher(words, runtime.startIndex);
      update((s) => ({ ...s, runtime, loading: false }));
    } catch {
      update((s) => ({ ...s, loading: false, error: "تعذّر تحميل نص السؤال — تحقق من الاتصال" }));
    }
  }, [update]);

  const start = useCallback(async (scope: TestScope, settings: TestSettings) => {
    const ayahs = resolveScope(scope);
    const questions = buildQuestions(ayahs, settings, Date.now() % 2_147_483_647);
    if (!questions.length) return false;
    const mode = depsRef.current.aiEnabled ? "ai" : "manual";
    const base: TestRunState = {
      scopeLabel: describeScope(scope), scope, settings, questions, current: 0, runtime: null, results: [],
      mode, startedAt: Date.now(), finished: false, summary: null, loading: true, error: null,
    };
    stateRef.current = base;
    setState(base);
    if (mode === "ai") {
      const first = questions[0];
      const started = await depsRef.current.startAi(first.start.page, first.start.verseKey);
      if (!started) {
        // لا ميكروفون/مزوّد: يستمر الاختبار يدوياً بصراحة بدل الفشل.
        base.mode = "manual";
      }
    }
    await openQuestion(0, { ...base });
    return true;
  }, [openQuestion]);

  const complete = useCallback((outcome: QuestionResult["outcome"] | null) => {
    const s = stateRef.current;
    if (!s?.runtime || s.runtime.answered) return;
    const runtime = s.runtime;
    const stats = s.mode === "ai" && outcome === null
      ? depsRef.current.engineStats()
      : { confirmed: 0, corrected: 0, peeks: runtime.manualPeeks };
    const result: QuestionResult = {
      questionId: runtime.question.id,
      // «أصبت» بعد تلميح يدوي = صحيح بتلميح، لا إتقان.
      outcome: outcome === "self_correct" && stats.peeks > 0
        ? "with_hints"
        : outcome ?? classifyQuestion({ confirmedMistakes: stats.confirmed, peeks: stats.peeks }),
      confirmedMistakes: stats.confirmed,
      correctedMistakes: stats.corrected,
      peeks: stats.peeks,
      hiddenWords: runtime.endIndex - runtime.startIndex,
      locationShown: runtime.locationShown,
    };
    depsRef.current.onQuestionComplete?.(result);
    update((prev) => ({
      ...prev,
      runtime: prev.runtime ? { ...prev.runtime, answered: true, result } : null,
      results: [...prev.results.filter((r) => r.questionId !== result.questionId), result],
    }));
  }, [update]);

  /** يستدعيه القارئ بعد كل مطابقة ملتزمة (AI). */
  const onCommitted = useCallback((committedIndex: number) => {
    const s = stateRef.current;
    if (!s?.runtime || s.runtime.answered || s.mode !== "ai") return;
    if (committedIndex >= s.runtime.endIndex) complete(null);
  }, [complete]);

  const revealHint = useCallback((kind: "word" | "ayah") => {
    const s = stateRef.current;
    if (!s?.runtime || s.runtime.answered) return;
    const committed = s.mode === "ai" ? depsRef.current.committedIndex() : null;
    const indices = testHintIndices(s.runtime, testRevealMap(s.runtime, committed, []), kind);
    if (!indices.length) return;
    if (s.mode === "ai") depsRef.current.peekAi(indices);
    update((prev) => {
      if (!prev.runtime) return prev;
      const manualRevealed = Math.max(prev.runtime.manualRevealed, indices[indices.length - 1] + 1 - prev.runtime.startIndex);
      return { ...prev, runtime: { ...prev.runtime, manualRevealed, manualPeeks: prev.runtime.manualPeeks + indices.length } };
    });
  }, [update]);
  const hint = useCallback(() => revealHint("word"), [revealHint]);
  const revealAyah = useCallback(() => revealHint("ayah"), [revealHint]);

  /** يدوي: إظهار الإجابة كاملة قبل التقييم الذاتي (لا يُعدّ نتيجة بعد). */
  const [manualRevealAll, setManualRevealAll] = useState(false);
  const revealAnswer = useCallback(() => {
    setManualRevealAll(true);
    update((prev) => prev.runtime ? { ...prev, runtime: { ...prev.runtime, manualRevealed: prev.runtime.endIndex - prev.runtime.startIndex } } : prev);
  }, [update]);

  const selfGrade = useCallback((correct: boolean) => {
    complete(correct ? "self_correct" : "self_wrong");
  }, [complete]);

  const toggleLocation = useCallback(() => {
    update((prev) => prev.runtime ? { ...prev, runtime: { ...prev.runtime, locationShown: !prev.runtime.locationShown } } : prev);
  }, [update]);

  const finish = useCallback(async (save = true) => {
    const s = stateRef.current;
    if (!s) return;
    const summary = summarizeTest(s.results, s.questions.length);
    const done: TestRunState = { ...s, finished: true, summary, runtime: null };
    stateRef.current = done;
    setState(done);
    if (s.mode === "ai") await depsRef.current.stopAi(save && !s.settings.temporary);
    depsRef.current.onFinished?.(done);
  }, []);

  const next = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    setManualRevealAll(false);
    if (s.current + 1 >= s.questions.length) { await finish(true); return; }
    await openQuestion(s.current + 1, s);
  }, [finish, openQuestion]);

  const skip = useCallback(async () => {
    complete("skipped");
    await next();
  }, [complete, next]);

  const close = useCallback(() => {
    stateRef.current = null;
    setState(null);
    setManualRevealAll(false);
  }, []);

  /** إعادة الأسئلة التي لم تُتقن فقط، بالإعدادات نفسها. */
  const retryWeak = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;
    const weakIds = new Set(s.results.filter((r) => r.outcome === "mistakes" || r.outcome === "self_wrong" || r.outcome === "skipped").map((r) => r.questionId));
    const questions = s.questions.filter((q) => weakIds.has(q.id)).map((q, i) => ({ ...q, id: i + 1 }));
    if (!questions.length) return;
    const base: TestRunState = { ...s, questions, current: 0, results: [], finished: false, summary: null, startedAt: Date.now(), runtime: null };
    if (base.mode === "ai") {
      const started = await depsRef.current.startAi(questions[0].start.page, questions[0].start.verseKey);
      if (!started) base.mode = "manual";
    }
    await openQuestion(0, base);
  }, [openQuestion]);

  const active = !!state && !state.finished;
  return useMemo(() => ({
    state, active, manualRevealAll,
    start, hint, revealAyah, revealAnswer, selfGrade, toggleLocation, skip, next, finish, close, retryWeak, onCommitted,
  }), [state, active, manualRevealAll, start, hint, revealAyah, revealAnswer, selfGrade, toggleLocation, skip, next, finish, close, retryWeak, onCommitted]);
}
