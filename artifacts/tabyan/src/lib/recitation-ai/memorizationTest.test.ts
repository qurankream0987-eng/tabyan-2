import { describe, expect, it } from "vitest";
import {
  buildQuestions, classifyQuestion, resolveScope, SCOPE_AVAILABILITY, summarizeTest, type QuestionResult,
} from "./memorizationTest";

describe("memorization test scopes", () => {
  it("resolves a surah to all its ayahs in canonical order", () => {
    const ayahs = resolveScope({ kind: "surah", surah: 67 });
    expect(ayahs).toHaveLength(30);
    expect(ayahs[0]).toMatchObject({ verseKey: "67:1", page: 562 });
    expect(ayahs.at(-1)?.verseKey).toBe("67:30");
  });

  it("resolves a juz exactly on its page boundaries (Madani juz starts at a page top)", () => {
    const ayahs = resolveScope({ kind: "juz", juz: 2 });
    expect(ayahs[0].verseKey).toBe("2:142");
    expect(ayahs.at(-1)?.verseKey).toBe("2:252");
  });

  it("resolves a page that contains the end of one surah and the start of another", () => {
    const keys = resolveScope({ kind: "page", page: 604 }).map((a) => a.verseKey);
    expect(keys[0]).toBe("112:1");
    expect(keys).toContain("113:1");
    expect(keys.at(-1)).toBe("114:6");
  });

  it("resolves a custom range across surahs", () => {
    const keys = resolveScope({ kind: "custom", from: { surah: 113, ayah: 4 }, to: { surah: 114, ayah: 2 } }).map((a) => a.verseKey);
    expect(keys).toEqual(["113:4", "113:5", "114:1", "114:2"]);
  });

  it("does not pretend hizb/rub boundaries exist without ayah-level data", () => {
    expect(SCOPE_AVAILABILITY.hizb.available).toBe(false);
    expect(SCOPE_AVAILABILITY.rub.available).toBe(false);
  });
});

describe("question generation", () => {
  const ayahs = resolveScope({ kind: "surah", surah: 2 });

  it("is deterministic for the same seed and spreads across the whole scope", () => {
    const a = buildQuestions(ayahs, { questionCount: 5, ayahsPerQuestion: 1, cueWords: 3 }, 42);
    const b = buildQuestions(ayahs, { questionCount: 5, ayahsPerQuestion: 1, cueWords: 3 }, 42);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    const positions = a.map((q) => q.start.ayah);
    expect(new Set(positions).size).toBe(5);
    // عيّنة طبقية: سؤال من كل خُمس للسورة
    positions.forEach((ayah, i) => {
      expect(ayah).toBeGreaterThanOrEqual(Math.floor((i * 286) / 5));
      expect(ayah).toBeLessThanOrEqual(Math.ceil(((i + 1) * 286) / 5) + 1);
    });
  });

  it("caps the count to the available ayahs and supports multi-ayah questions", () => {
    const short = resolveScope({ kind: "surah", surah: 112 });
    const questions = buildQuestions(short, { questionCount: 10, ayahsPerQuestion: 2, cueWords: 2 }, 1);
    expect(questions).toHaveLength(3);
    for (const q of questions) expect(q.end.ayah - q.start.ayah).toBe(1);
  });

  it("extends a question when the ayah is too short to hide anything after the cue", () => {
    const questions = buildQuestions(
      resolveScope({ kind: "ayahs", surah: 55, from: 1, to: 4 }),
      { questionCount: 1, ayahsPerQuestion: 1, cueWords: 3 },
      3,
      () => 1,
    );
    expect(questions[0].end.ayah).toBe(questions[0].start.ayah + 1);
    expect(questions[0].cueWords).toBeGreaterThanOrEqual(1);
  });
});

describe("question outcomes", () => {
  it("classifies transparently", () => {
    expect(classifyQuestion({ confirmedMistakes: 0, peeks: 0 })).toBe("mastered");
    expect(classifyQuestion({ confirmedMistakes: 0, peeks: 2 })).toBe("with_hints");
    expect(classifyQuestion({ confirmedMistakes: 1, peeks: 0 })).toBe("mistakes");
  });

  it("scores answered questions only; skipped questions are reported separately", () => {
    const base = { correctedMistakes: 0, peeks: 0, hiddenWords: 10, locationShown: false, confirmedMistakes: 0 };
    const results: QuestionResult[] = [
      { ...base, questionId: 1, outcome: "mastered" },
      { ...base, questionId: 2, outcome: "with_hints" },
      { ...base, questionId: 3, outcome: "mistakes" },
      { ...base, questionId: 4, outcome: "skipped" },
    ];
    expect(summarizeTest(results, 5)).toEqual({
      total: 5, answered: 3, mastered: 1, withHints: 1, withMistakes: 1, skipped: 1, scorePercent: 67,
    });
  });
});
