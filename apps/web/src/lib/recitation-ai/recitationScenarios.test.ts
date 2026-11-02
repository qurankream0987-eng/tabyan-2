/**
 * Part 61 — مصفوفة سيناريوهات حتمية للمطابق + محرك الحالات فوق نص المصحف الحقيقي.
 *
 * تحذير منهجي: "التلاوة" هنا تسلسل ألفاظ ASR مصطنع (نص كنسي مطبّع مع انحرافات
 * موسومة)، يُغذّى كلمة بكلمة كما تصل partials. يقيس منطق المتابعة والأخطاء فقط؛
 * لا يقيس دقة التعرف الصوتي ولا كمون المزوّد/الشبكة. الأرقام المطبوعة هنا ليست
 * قياساً صوتياً ولا تُقدَّم بديلاً عن التحقق بتسجيلات حقيقية.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QuranLiveMatcher } from "./QuranLiveMatcher";
import { normalizeQuranText } from "./normalizer";
import { RecitationStateEngine, type RecitationMistakeKind } from "./recitationStateEngine";
import type { CanonicalQuranWord } from "./canonicalWords";

function loadPage(page: number): CanonicalQuranWord[] {
  const file = resolve(import.meta.dirname, `../../../public/mushaf/v1/quran-words/pages/${page}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { words: Omit<CanonicalQuranWord, "normalizedText">[] };
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
}

const FOREIGN = ["سمعنا", "قلنا", "كتاب", "بيت", "يعني", "طيب", "نعم", "هكذا", "انتهى", "حسنا"];

interface Scenario {
  name: string;
  pages: number[];
  /** فهرس بداية اختياري (قراءة من منتصف الصفحة) */
  startIndex?: (corpus: CanonicalQuranWord[]) => number;
  /** ألفاظ كل مقطع (utterance)؛ كل مقطع يُغذّى كلمة بكلمة ثم نهائياً */
  utterances: (corpus: CanonicalQuranWord[]) => string[][];
  /** فهرس الموضع الملتزم المتوقع في النهاية */
  expectedEnd: (corpus: CanonicalQuranWord[]) => number;
  /** فهارس أخطاء كلمية يجب أن تتأكد (WRONG_WORD/OMISSION) */
  expectedMistakes?: (corpus: CanonicalQuranWord[]) => number[];
  /** أحداث من نوع معيّن يجب ظهورها */
  expectEvent?: RecitationMistakeKind | "CORRECTION";
  /** أنواع أحداث يجب ألا تظهر إطلاقاً (مثل قفزة وهمية عند إعادة البدء) */
  forbidEvents?: string[];
  /** فهارس يجب أن تنتهي CORRECTED */
  expectedCorrected?: (corpus: CanonicalQuranWord[]) => number[];
}

const say = (corpus: CanonicalQuranWord[], from: number, to: number) => corpus.slice(from, to).map((w) => w.normalizedText);
const indexOf = (corpus: CanonicalQuranWord[], verseKey: string, position = 1) =>
  corpus.findIndex((w) => w.verseKey === verseKey && w.position === position);
const ayahEnd = (corpus: CanonicalQuranWord[], verseKey: string) => {
  let last = -1;
  corpus.forEach((w, i) => { if (w.verseKey === verseKey) last = i; });
  return last + 1;
};

const SCENARIOS: Scenario[] = [
  {
    name: "exact recitation across several ayahs",
    pages: [562],
    utterances: (c) => [say(c, 0, 14), say(c, 14, 30), say(c, 30, 44)],
    expectedEnd: () => 44,
    expectedMistakes: () => [],
  },
  {
    name: "partial phrase then stop",
    pages: [562],
    utterances: (c) => [say(c, 0, 7)],
    expectedEnd: () => 7,
    expectedMistakes: () => [],
  },
  {
    name: "single omitted word",
    pages: [562],
    utterances: (c) => [[...say(c, 0, 12), ...say(c, 13, 30)]],
    expectedEnd: () => 30,
    expectedMistakes: () => [12],
  },
  {
    name: "extra word inserted",
    pages: [562],
    utterances: (c) => [[...say(c, 0, 16), "كتاب", ...say(c, 16, 32)]],
    expectedEnd: () => 32,
    expectedMistakes: () => [],
  },
  {
    name: "repetition of the last words",
    pages: [562],
    utterances: (c) => [[...say(c, 0, 13), ...say(c, 10, 13), ...say(c, 13, 30)]],
    expectedEnd: () => 30,
    expectedMistakes: () => [],
  },
  {
    name: "wrong word then immediate self-correction",
    pages: [562],
    utterances: (c) => [[...say(c, 0, 18), "سمعنا", ...say(c, 18, 34)]],
    expectedEnd: () => 34,
    expectedMistakes: () => [],
    expectedCorrected: () => [18],
  },
  {
    name: "restarting the current ayah from its beginning",
    pages: [562],
    utterances: (c) => {
      const a2 = indexOf(c, "67:2");
      const mid = a2 + 6;
      return [say(c, 0, mid), say(c, a2, ayahEnd(c, "67:3"))];
    },
    expectedEnd: (c) => ayahEnd(c, "67:3"),
    expectedMistakes: () => [],
    forbidEvents: ["UNEXPECTED_JUMP", "SKIP", "CORRECTION", "OMISSION"],
  },
  {
    name: "backtrack to an earlier ayah after finishing it",
    pages: [562],
    utterances: (c) => [say(c, 0, ayahEnd(c, "67:3")), say(c, indexOf(c, "67:2"), ayahEnd(c, "67:2"))],
    // الرجوع للمراجعة لا يُرجع الموضع الملتزم ولا يُعدّ خطأ.
    expectedEnd: (c) => ayahEnd(c, "67:3"),
    expectedMistakes: () => [],
    forbidEvents: ["UNEXPECTED_JUMP", "SKIP", "OMISSION", "WRONG_WORD"],
  },
  {
    name: "wrong word left uncorrected is confirmed",
    pages: [562],
    utterances: (c) => [[...say(c, 0, 20), "بيت", ...say(c, 21, 36)]],
    expectedEnd: () => 36,
    expectedMistakes: () => [20],
  },
  {
    name: "unexpected forward jump over a whole ayah",
    pages: [562],
    utterances: (c) => [say(c, 0, ayahEnd(c, "67:2")), say(c, indexOf(c, "67:4"), ayahEnd(c, "67:5"))],
    expectedEnd: (c) => ayahEnd(c, "67:5"),
    expectedMistakes: () => [],
    expectEvent: "SKIP",
  },
  {
    name: "cross page boundary inside a surah",
    pages: [50, 51],
    utterances: (c) => {
      const boundary = c.findIndex((w) => w.page === 51);
      return [say(c, boundary - 14, boundary), say(c, boundary, boundary + 16)];
    },
    startIndex: (c) => c.findIndex((w) => w.page === 51) - 14,
    expectedEnd: (c) => c.findIndex((w) => w.page === 51) + 16,
    expectedMistakes: () => [],
  },
  {
    name: "repeated refrain (Ar-Rahman) stays local, never jumps to a later identical ayah",
    pages: [531, 532],
    startIndex: (c) => indexOf(c, "55:14"),
    utterances: (c) => [say(c, indexOf(c, "55:14"), ayahEnd(c, "55:15")), say(c, indexOf(c, "55:16"), ayahEnd(c, "55:17"))],
    expectedEnd: (c) => ayahEnd(c, "55:17"),
    expectedMistakes: () => [],
  },
  {
    name: "sustained unrelated speech (low confidence) neither moves nor flags",
    pages: [562],
    utterances: (c) => [say(c, 0, 10), FOREIGN.slice(0, 8), say(c, 10, 24)],
    expectedEnd: () => 24,
    expectedMistakes: () => [],
  },
];

interface Outcome {
  name: string;
  locationOk: boolean;
  end: number;
  expectedEnd: number;
  tp: number; fp: number; fn: number;
  cleanWords: number;
  correctionsExpected: number; correctionsSeen: number;
  events: string[];
  forbidden: string[];
  latencies: number[];
}

function run(scenario: Scenario): Outcome {
  const corpus: CanonicalQuranWord[] = [];
  for (const page of scenario.pages) corpus.push(...loadPage(page));
  const matcher = new QuranLiveMatcher(corpus.slice(), { generalPositionFollowing: true, ignoreOptionalBasmala: true });
  const engine = new RecitationStateEngine({ wordAt: (i) => matcher.wordAt(i) });
  if (scenario.startIndex) {
    const from = corpus[scenario.startIndex(corpus)];
    matcher.setStartPosition({ verseKey: from.verseKey, wordPosition: from.position });
    engine.setStart(matcher.committedIndex());
  }
  const latencies: number[] = [];
  scenario.utterances(corpus).forEach((utterance, u) => {
    const itemId = `s${u}`;
    for (let i = 1; i <= utterance.length; i += 1) {
      const match = matcher.feed({ text: utterance.slice(0, i).join(" "), isFinal: false, itemId, receivedAt: 0 });
      latencies.push(match.matcherMs);
      engine.apply(match);
    }
    engine.apply(matcher.feed({ text: utterance.join(" "), isFinal: true, itemId, receivedAt: 0 }));
  });
  engine.finalize();
  const expectedMistakes = new Set(scenario.expectedMistakes?.(corpus) ?? []);
  const flagged = new Set<number>();
  const corrected = new Set<number>();
  const events: string[] = [];
  for (const event of engine.eventLog()) {
    events.push(`${event.kind}:${event.status ?? ""}`);
    if ((event.kind === "WRONG_WORD" || event.kind === "OMISSION") && event.status === "confirmed") flagged.add(event.index);
    if (event.kind === "CORRECTION") corrected.add(event.index);
  }
  let tp = 0; let fp = 0; let fn = 0;
  for (const index of flagged) (expectedMistakes.has(index) ? tp += 1 : fp += 1);
  for (const index of expectedMistakes) if (!flagged.has(index)) fn += 1;
  const expectedCorrected = scenario.expectedCorrected?.(corpus) ?? [];
  const words = scenario.utterances(corpus).reduce((n, u) => n + u.length, 0);
  return {
    name: scenario.name,
    end: matcher.committedIndex(),
    expectedEnd: scenario.expectedEnd(corpus),
    locationOk: matcher.committedIndex() === scenario.expectedEnd(corpus),
    tp, fp, fn,
    cleanWords: Math.max(0, words - expectedMistakes.size),
    correctionsExpected: expectedCorrected.length,
    correctionsSeen: expectedCorrected.filter((i) => corrected.has(i)).length,
    events,
    forbidden: events.filter((e) => scenario.forbidEvents?.some((kind) => e.startsWith(`${kind}:`)) ?? false),
    latencies,
  };
}

const outcomes = SCENARIOS.map(run);
if (process.env.SCENARIO_DUMP) for (const o of outcomes) console.info("[OUTCOME]", o.name, JSON.stringify({ end: o.end, expected: o.expectedEnd, tp: o.tp, fp: o.fp, fn: o.fn, events: o.events.slice(0, 8) }));

describe("Part 61 deterministic recitation scenarios (text-level, not acoustic)", () => {
  it.each(outcomes.map((o) => [o.name, o] as const))("%s", (_name, outcome) => {
    expect({ end: outcome.end, fp: outcome.fp, fn: outcome.fn }).toEqual({ end: outcome.expectedEnd, fp: 0, fn: 0 });
    expect(outcome.correctionsSeen).toBe(outcome.correctionsExpected);
    expect(outcome.forbidden).toEqual([]);
  });

  it("forward jump over a whole ayah is recorded as a SKIP event, not per-word omissions", () => {
    const jump = outcomes.find((o) => o.name.startsWith("unexpected forward jump"))!;
    expect(jump.events.some((e) => e.startsWith("SKIP"))).toBe(true);
    expect(jump.events.filter((e) => e.startsWith("OMISSION:confirmed"))).toHaveLength(0);
  });

  it("reports aggregate metrics for the scenario matrix", () => {
    const sum = (f: (o: Outcome) => number) => outcomes.reduce((n, o) => n + f(o), 0);
    const tp = sum((o) => o.tp); const fp = sum((o) => o.fp); const fn = sum((o) => o.fn);
    const latencies = outcomes.flatMap((o) => o.latencies).sort((a, b) => a - b);
    const pct = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
    const metrics = {
      scenarios: outcomes.length,
      LOCATION_ACCURACY: sum((o) => (o.locationOk ? 1 : 0)) / outcomes.length,
      MISTAKE_PRECISION: tp / Math.max(1, tp + fp),
      MISTAKE_RECALL: tp / Math.max(1, tp + fn),
      FALSE_POSITIVE_RATE: fp / Math.max(1, sum((o) => o.cleanWords)),
      CORRECTION_RECOVERY_RATE: sum((o) => o.correctionsSeen) / Math.max(1, sum((o) => o.correctionsExpected)),
      MATCHER_P50_MS: Number(pct(0.5).toFixed(3)),
      MATCHER_P95_MS: Number(pct(0.95).toFixed(3)),
    };
    console.info("[SCENARIO_MATRIX]", JSON.stringify(metrics));
    expect(metrics.LOCATION_ACCURACY).toBe(1);
    expect(metrics.FALSE_POSITIVE_RATE).toBe(0);
  });
});
