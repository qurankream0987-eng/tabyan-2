import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QuranLiveMatcher, type AlignmentOp } from "./QuranLiveMatcher";
import { normalizeQuranText } from "./normalizer";
import type { CanonicalQuranWord } from "./canonicalWords";
import type { TranscriptEvent } from "./types";

function loadPage(page: number): CanonicalQuranWord[] {
  const file = resolve(import.meta.dirname, `../../../public/mushaf/quran-words/pages/${page}.json`);
  const data = JSON.parse(readFileSync(file, "utf8")) as { words: Omit<CanonicalQuranWord, "normalizedText">[] };
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
}

function event(text: string, isFinal = false, itemId = "item-1"): TranscriptEvent {
  return { text, isFinal, itemId, receivedAt: 0 };
}

// الملك 562: نص مرجعي حقيقي من بيانات المصحف، لا نص مولّد.
const page = loadPage(562);
const spoken = (from: number, to: number) => page.slice(from, to).map((word) => word.normalizedText);
const indexOf = (word: CanonicalQuranWord | null) => (word ? page.indexOf(word) : -1);

/** يغذي مقطعاً واحداً كلمةً كلمة (delta تراكمي) ثم final اختياري. */
function recite(matcher: QuranLiveMatcher, heard: string[], itemId: string, opts: { step?: number; final?: boolean } = {}) {
  const step = opts.step ?? 1;
  const committed: AlignmentOp[] = [];
  let last = null as ReturnType<QuranLiveMatcher["feed"]> | null;
  for (let i = step; i < heard.length + step; i += step) {
    last = matcher.feed(event(heard.slice(0, Math.min(i, heard.length)).join(" "), false, itemId));
    committed.push(...last.committedOps);
  }
  if (opts.final ?? true) {
    last = matcher.feed(event(heard.join(" "), true, itemId));
    committed.push(...last.committedOps);
  }
  return { last: last!, committed };
}

describe("QuranLiveMatcher V2 — follow-along", () => {
  it("tracks a long continuous utterance delivered word by word", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const { last, committed } = recite(matcher, spoken(0, 80), "long");
    expect(indexOf(last.current)).toBe(79);
    expect(committed.filter((op) => op.kind !== "match")).toEqual([]);
    expect(last.diagnostics.matcherNoMatchCount).toBe(0);
  });

  it("tracks multi-word deltas without waiting for the final transcript", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const { last } = recite(matcher, spoken(0, 30), "batched", { step: 3, final: false });
    // التزام مستمر أثناء الكلام: لا يتأخر أكثر من دفعة واحدة عن آخر كلمة مسموعة.
    expect(matcher.committedIndex()).toBeGreaterThanOrEqual(27);
    expect(last.diagnostics.matcherNoMatchCount).toBe(0);
  });

  it("follows sub-word partials and never commits from an unfinished word", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const heard = spoken(0, 20);
    for (let i = 1; i <= heard.length; i += 1) {
      const half = heard[i - 1].slice(0, Math.ceil(heard[i - 1].length / 2));
      matcher.feed(event([...heard.slice(0, i - 1), half].join(" "), false, "sub"));
      matcher.feed(event(heard.slice(0, i).join(" "), false, "sub"));
    }
    expect(matcher.committedIndex()).toBeGreaterThanOrEqual(19);
  });

  it("treats the final transcript of an already-followed utterance as neither a miss nor a jump", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const { last } = recite(matcher, spoken(0, 40), "a");
    expect(last.diagnostics.matcherNoMatchCount).toBe(0);
    expect(matcher.committedIndex()).toBe(40);
  });

  it("ignores ASR punctuation", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const text = `${spoken(0, 4).join(" ")}، ${spoken(4, 9).join(" ")}.`;
    const match = matcher.feed(event(text, true, "punct"));
    expect(indexOf(match.current)).toBe(8);
    expect(match.committedOps.every((op) => op.kind === "match" && op.cost < 0.5)).toBe(true);
  });

  it("continues across utterances split by silence commits", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    recite(matcher, spoken(0, 12), "u1");
    recite(matcher, spoken(12, 25), "u2");
    const { last } = recite(matcher, spoken(25, 40), "u3");
    expect(indexOf(last.current)).toBe(39);
  });
});

describe("QuranLiveMatcher V2 — deviations", () => {
  it("reports an omitted word as a skip op when later words confirm the position", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const heard = [...spoken(0, 5), ...spoken(6, 12)];
    const { committed } = recite(matcher, heard, "omit");
    const skips = committed.filter((op) => op.kind === "skip");
    expect(skips).toEqual([{ kind: "skip", index: 5 }]);
    expect(matcher.committedIndex()).toBe(12);
  });

  it("reports an unrelated word as substitution without losing position", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const heard = [...spoken(0, 5), "سمعنا", ...spoken(6, 12)];
    const { committed } = recite(matcher, heard, "sub");
    const substitutions = committed.filter((op) => op.kind === "substitution");
    expect(substitutions.map((op) => op.kind === "substitution" && op.index)).toEqual([5]);
    expect(matcher.committedIndex()).toBe(12);
  });

  it("reports an inserted extra word", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    const heard = [...spoken(0, 5), "يعني", ...spoken(5, 12)];
    const { committed } = recite(matcher, heard, "extra");
    expect(committed.filter((op) => op.kind === "extra").length).toBe(1);
    expect(matcher.committedIndex()).toBe(12);
  });

  it("does not move forward when the reciter repeats the previous words", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    recite(matcher, spoken(0, 10), "first");
    const repeat = recite(matcher, spoken(7, 10), "repeat");
    expect(matcher.committedIndex()).toBe(10);
    expect(repeat.committed).toEqual([]);
    const resume = recite(matcher, spoken(10, 14), "resume");
    expect(indexOf(resume.last.current)).toBe(13);
  });

  it("does not commit a distant forward jump from one short weak hypothesis", () => {
    const matcher = new QuranLiveMatcher(page.slice(), { generalPositionFollowing: true });
    recite(matcher, spoken(0, 5), "start");
    // كلمة مفردة من موضع بعيد في الصفحة: لا قفزة ملتزمة من فرضية واحدة.
    const far = 40;
    expect(spoken(0, 20)).not.toContain(page[far].normalizedText);
    matcher.feed(event("نص بعيد", false, "m1"));
    matcher.feed(event("نص بعيد", false, "m2"));
    matcher.feed(event("نص بعيد", false, "m3"));
    matcher.feed(event(page[far].normalizedText, true, "far"));
    expect(matcher.committedIndex()).toBeLessThan(far);
  });

  it("follows a genuine forward jump once multi-word evidence confirms it", () => {
    const matcher = new QuranLiveMatcher(page.slice(), { generalPositionFollowing: true });
    recite(matcher, spoken(0, 5), "start");
    const { last } = recite(matcher, spoken(30, 38), "jump");
    expect(indexOf(last.current)).toBe(37);
  });
});

describe("QuranLiveMatcher V2 — performance", () => {
  it("keeps per-event cost bounded for very long unbroken utterances", () => {
    const words = [...page, ...loadPage(563), ...loadPage(564)];
    const matcher = new QuranLiveMatcher(words.slice(), { generalPositionFollowing: true });
    const heard = words.slice(0, 300).map((word) => word.normalizedText);
    const costs: number[] = [];
    for (let i = 1; i <= heard.length; i += 1) {
      costs.push(matcher.feed(event(heard.slice(0, i).join(" "), false, "marathon")).matcherMs);
    }
    costs.sort((a, b) => a - b);
    expect(matcher.committedIndex()).toBeGreaterThanOrEqual(299);
    // الحد مرتفع عمداً لبيئات CI البطيئة؛ القياس المحلي أقل من 1ms.
    expect(costs[Math.floor(costs.length * 0.95)]).toBeLessThan(15);
  });

  it("recovers position after noise instead of accumulating an unbounded tail", () => {
    const matcher = new QuranLiveMatcher(page.slice());
    recite(matcher, spoken(0, 6), "a");
    const noise = Array.from({ length: 60 }, (_, i) => `ضوضاء${i}`);
    const heard = [...noise, ...spoken(6, 14)];
    for (let i = 1; i <= heard.length; i += 1) matcher.feed(event(heard.slice(0, i).join(" "), false, "noisy"));
    expect(matcher.committedIndex()).toBeGreaterThanOrEqual(13);
  });
});
