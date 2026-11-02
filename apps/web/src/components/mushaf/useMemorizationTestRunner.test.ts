import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeQuranText } from "@/lib/recitation-ai/normalizer";
import type { CanonicalQuranWord } from "@/lib/recitation-ai/canonicalWords";
import { testHintIndices, testRevealMap, type QuestionRuntime } from "./useMemorizationTestRunner";

const words: CanonicalQuranWord[] = (JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../public/mushaf/v1/quran-words/pages/562.json"), "utf8")).words as Omit<CanonicalQuranWord, "normalizedText">[])
  .map((w) => ({ ...w, normalizedText: normalizeQuranText(w.displayText) }));

function runtime(patch: Partial<QuestionRuntime> = {}): QuestionRuntime {
  const cueIndex = words.findIndex((w) => w.verseKey === "67:2" && w.position === 1);
  let endIndex = 0;
  words.forEach((w, i) => { if (w.verseKey === "67:2") endIndex = i + 1; });
  return {
    question: { id: 1, start: { surah: 67, ayah: 2, verseKey: "67:2", page: 562 }, end: { surah: 67, ayah: 2, verseKey: "67:2", page: 562 }, cueWords: 3 },
    words, cueIndex, startIndex: cueIndex + 3, endIndex,
    answered: false, manualRevealed: 0, manualPeeks: 0, locationShown: false, result: null, ...patch,
  };
}

describe("memorization test reveal map", () => {
  it("reveals exactly the next hidden word without escalating repeated taps", () => {
    const r = runtime({ manualRevealed: 1 });
    expect(testHintIndices(r, testRevealMap(r, null, []), "word")).toEqual([r.startIndex + 1]);
  });

  it("caps an ayah hint at the question boundary and never includes another ayah", () => {
    const r = runtime();
    const indices = testHintIndices(r, testRevealMap(r, null, []), "ayah");
    expect(indices[0]).toBe(r.startIndex);
    expect(indices.at(-1)).toBe(r.endIndex - 1);
    expect(indices.every(index => r.words[index].verseKey === "67:2")).toBe(true);
    expect(testHintIndices({ ...r, answered: true }, new Map(), "ayah")).toEqual([]);
  });

  it("shows only the cue words of the question ayah at the start", () => {
    expect([...testRevealMap(runtime(), null, [])]).toEqual([["67:2", 3]]);
  });

  it("never reveals anything before the cue (previous ayahs stay hidden)", () => {
    const map = testRevealMap(runtime(), null, []);
    expect(map.has("67:1")).toBe(false);
  });

  it("advances with live progress, caps at the question end, and reveals everything once answered", () => {
    const r = runtime();
    expect(testRevealMap(r, r.startIndex + 2, []).get("67:2")).toBe(5);
    expect(testRevealMap(r, r.endIndex + 20, []).has("67:3")).toBe(false);
    const last = words[r.endIndex - 1].position;
    expect(testRevealMap({ ...r, answered: true }, null, []).get("67:2")).toBe(last);
  });

  it("includes manual reveals and peeked words inside the question only", () => {
    const r = runtime({ manualRevealed: 1 });
    expect(testRevealMap(r, null, []).get("67:2")).toBe(4);
    expect(testRevealMap(runtime(), null, [runtime().startIndex + 4, 0]).get("67:2")).toBe(8);
  });
});
