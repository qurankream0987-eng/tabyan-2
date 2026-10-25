/**
 * معيار نصي حتمي لمسار المطابقة + محرك الأخطاء.
 *
 * تحذير منهجي: هذا ليس تحققاً صوتياً. النص المرجعي حقيقي (بيانات المصحف)،
 * لكن "التلاوة" هنا تسلسل كلمات ASR مُصطنع بانحرافات موسومة ومولّد بذرة ثابتة.
 * يقيس سلوك المطابقة والمحرك فقط، لا دقة التعرف الصوتي ولا أداء المزود.
 * التحقق النهائي يحتاج تسجيلات حقيقية بموافقة وحقيقة أرضية من معلمين مؤهلين.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QuranLiveMatcher } from "./QuranLiveMatcher";
import { normalizeQuranText } from "./normalizer";
import { RecitationStateEngine } from "./recitationStateEngine";
import type { CanonicalQuranWord } from "./canonicalWords";

function loadPage(page: number): CanonicalQuranWord[] {
  const file = resolve(import.meta.dirname, `../../../public/mushaf/quran-words/pages/${page}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { words: Omit<CanonicalQuranWord, "normalizedText">[] };
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
}

/** mulberry32 — مولد حتمي حتى تتكرر النتائج حرفياً. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Deviation = "none" | "wrong" | "omit" | "extra" | "repeat" | "selfCorrect" | "spelling";

interface Script {
  tokens: string[];
  /** فهرس الكلمة القرآنية المتوقعة بعد نطق كل لفظ (للدقة الموضعية). */
  expectedAfter: number[];
  wrong: Set<number>;
  omitted: Set<number>;
  selfCorrected: Set<number>;
  clean: Set<number>;
}

/**
 * صيغ إملائية حديثة لكلمة عثمانية مطبّعة: ة↔ه آخر الكلمة، ألف تنوين النصب،
 * ألف المد المحذوفة/المضافة. لا تغيّر حرفاً أصلياً.
 */
function orthographicVariant(text: string): string {
  if (text.endsWith("ة")) return `${text.slice(0, -1)}ه`;
  // الكلمات القصيرة (ما، ثم، لا، من) لا تظهر لها صيغ ASR بديلة واقعية.
  if (text.length <= 3) return text;
  if (text.length > 3 && text.endsWith("ا")) return text.slice(0, -1);
  const alef = text.indexOf("ا", 2);
  if (alef > 0 && alef < text.length - 1) return text.slice(0, alef) + text.slice(alef + 1);
  return `${text.slice(0, 2)}ا${text.slice(2)}`;
}

const FOREIGN = ["سمعنا", "قلنا", "كتاب", "بيت", "يعني", "طيب", "نعم", "هكذا"];

function buildScript(words: CanonicalQuranWord[], random: () => number, rate: number): Script {
  const script: Script = { tokens: [], expectedAfter: [], wrong: new Set(), omitted: new Set(), selfCorrected: new Set(), clean: new Set() };
  const push = (token: string, expected: number) => { script.tokens.push(token); script.expectedAfter.push(expected); };
  let lastDeviation = -10;
  for (let i = 0; i < words.length; i += 1) {
    const text = words[i].normalizedText;
    // لا انحرافين متتاليين خلال 3 كلمات: نمط تلاوة واقعي ويُبقي الحقيقة الأرضية واضحة.
    const roll = i - lastDeviation > 3 && i > 2 && i < words.length - 3 ? random() : 1;
    const kinds: Deviation[] = ["wrong", "omit", "extra", "repeat", "selfCorrect", "spelling"];
    const kind: Deviation = roll < rate ? kinds[Math.floor(random() * kinds.length)] : "none";
    const foreign = FOREIGN[Math.floor(random() * FOREIGN.length)];
    if (kind !== "none") lastDeviation = i;
    switch (kind) {
      case "wrong": push(foreign, i + 1); script.wrong.add(i); break;
      case "omit": script.omitted.add(i); break;
      case "extra": push(text, i + 1); push(foreign, i + 1); script.clean.add(i); break;
      case "repeat": push(text, i + 1); push(words[i - 1].normalizedText, i + 1); push(text, i + 1); script.clean.add(i); break;
      case "selfCorrect": push(foreign, i); push(text, i + 1); script.selfCorrected.add(i); break;
      case "spelling": {
        // فرق إملائي شائع بين الرسم العثماني وإملاء ASR لكلمة صحيحة لفظاً — لا يجوز أن يُعلَّم خطأ.
        push(orthographicVariant(text), i + 1); script.clean.add(i); break;
      }
      default: push(text, i + 1); script.clean.add(i);
    }
  }
  return script;
}

interface Totals {
  words: number; utterances: number; locationExact: number; locationNear: number;
  tp: number; fp: number; fn: number; cleanWords: number; correctionsExpected: number; correctionsSeen: number;
  latencies: number[];
}

function runPage(words: CanonicalQuranWord[], random: () => number, rate: number, totals: Totals) {
  const matcher = new QuranLiveMatcher(words.slice());
  const engine = new RecitationStateEngine({ wordAt: (index) => matcher.wordAt(index) });
  const script = buildScript(words, random, rate);
  let cursor = 0;
  let item = 0;
  while (cursor < script.tokens.length) {
    const length = 6 + Math.floor(random() * 14);
    const utterance = script.tokens.slice(cursor, cursor + length);
    const itemId = `u${item += 1}`;
    for (let i = 1; i <= utterance.length; i += 1) {
      const match = matcher.feed({ text: utterance.slice(0, i).join(" "), isFinal: false, itemId, receivedAt: 0 });
      totals.latencies.push(match.matcherMs);
      engine.apply(match);
    }
    engine.apply(matcher.feed({ text: utterance.join(" "), isFinal: true, itemId, receivedAt: 0 }));
    cursor += utterance.length;
    const expected = script.expectedAfter[cursor - 1];
    const actual = matcher.committedIndex();
    totals.utterances += 1;
    if (actual === expected) totals.locationExact += 1;
    if (Math.abs(actual - expected) <= 1) totals.locationNear += 1;
  }
  engine.finalize();
  const truth = new Set([...script.wrong, ...script.omitted]);
  const flagged = new Set<number>();
  for (const event of engine.eventLog()) {
    if ((event.kind === "WRONG_WORD" || event.kind === "OMISSION") && event.status === "confirmed") flagged.add(event.index);
    if (event.kind === "CORRECTION" && script.selfCorrected.has(event.index)) totals.correctionsSeen += 1;
  }
  for (const index of flagged) (truth.has(index) ? totals.tp += 1 : totals.fp += 1);
  for (const index of truth) if (!flagged.has(index)) totals.fn += 1;
  totals.words += words.length;
  totals.cleanWords += script.clean.size;
  totals.correctionsExpected += script.selfCorrected.size;
}

function runBenchmark(pages: number[], rate: number, seed: number) {
  const random = rng(seed);
  const totals: Totals = {
    words: 0, utterances: 0, locationExact: 0, locationNear: 0,
    tp: 0, fp: 0, fn: 0, cleanWords: 0, correctionsExpected: 0, correctionsSeen: 0, latencies: [],
  };
  for (const page of pages) runPage(loadPage(page), random, rate, totals);
  totals.latencies.sort((a, b) => a - b);
  const pct = (p: number) => totals.latencies[Math.min(totals.latencies.length - 1, Math.floor(totals.latencies.length * p))];
  return {
    pages: pages.length,
    words: totals.words,
    LOCATION_ACCURACY: totals.locationExact / totals.utterances,
    LOCATION_ACCURACY_WITHIN_1: totals.locationNear / totals.utterances,
    MISTAKE_PRECISION: totals.tp / Math.max(1, totals.tp + totals.fp),
    MISTAKE_RECALL: totals.tp / Math.max(1, totals.tp + totals.fn),
    FALSE_POSITIVE_RATE: totals.fp / Math.max(1, totals.cleanWords),
    CORRECTION_RECOVERY_RATE: totals.correctionsSeen / Math.max(1, totals.correctionsExpected),
    MATCHER_P50_MS: pct(0.5),
    MATCHER_P95_MS: pct(0.95),
    MATCHER_MAX_MS: totals.latencies.at(-1) ?? 0,
  };
}

// عينة موزعة على المصحف كله (قصار وطوال السور)، بلا انتقاء يدوي.
const SAMPLE_PAGES = Array.from({ length: 30 }, (_, i) => 3 + i * 20);

describe("synthetic text-level recitation benchmark", () => {
  it("clean recitation: follows position and raises no mistakes", () => {
    const result = runBenchmark(SAMPLE_PAGES, 0, 1);
    console.info("[BENCHMARK clean]", JSON.stringify(result));
    expect(result.LOCATION_ACCURACY).toBeGreaterThanOrEqual(0.97);
    expect(result.FALSE_POSITIVE_RATE).toBeLessThanOrEqual(0.005);
  });

  it("recitation with labelled deviations (≈8% of words)", () => {
    const result = runBenchmark(SAMPLE_PAGES, 0.08, 7);
    console.info("[BENCHMARK deviations]", JSON.stringify(result));
    expect(result.LOCATION_ACCURACY_WITHIN_1).toBeGreaterThanOrEqual(0.9);
    expect(result.MISTAKE_PRECISION).toBeGreaterThanOrEqual(0.85);
    expect(result.FALSE_POSITIVE_RATE).toBeLessThanOrEqual(0.01);
  });
});
