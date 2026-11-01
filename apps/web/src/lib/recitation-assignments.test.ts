import { describe, expect, it } from "vitest";
import {
  MAX_FLAGGED_WORDS,
  assignmentRangeLabel,
  buildAssignmentResult,
  canRecite,
  collectRangeWords,
  flaggedKindFor,
  groupFlaggedByAyah,
  type EngineWordEntry,
} from "./recitation-assignments";

describe("flaggedKindFor", () => {
  it("maps engine states to what the teacher sees", () => {
    expect(flaggedKindFor("CONFIRMED_ERROR", "WRONG_WORD")).toBe("mistake");
    expect(flaggedKindFor("CONFIRMED_ERROR", "OMISSION")).toBe("skipped");
    expect(flaggedKindFor("CONFIRMED_ERROR", null)).toBe("mistake");
    expect(flaggedKindFor("SKIPPED", "SKIP")).toBe("skipped");
    expect(flaggedKindFor("CORRECTED", "WRONG_WORD")).toBe("corrected");
    expect(flaggedKindFor("PEEKED", null)).toBe("peeked");
  });

  it("never sends unconfirmed or neutral states", () => {
    for (const state of ["UNREAD", "EXPECTED", "HEARD_PENDING", "CORRECT", "POSSIBLE_ERROR"] as const) {
      expect(flaggedKindFor(state, "WRONG_WORD")).toBeNull();
    }
  });
});

describe("buildAssignmentResult", () => {
  const word = (ayah: number, position: number, state: EngineWordEntry["state"], mistakeKind?: EngineWordEntry["mistakeKind"]): EngineWordEntry =>
    ({ verseKey: `67:${ayah}`, position, state, mistakeKind });

  it("counts each flagged kind and keys words as surah:ayah:position", () => {
    const result = buildAssignmentResult([
      word(1, 1, "CORRECT"),
      word(1, 2, "CONFIRMED_ERROR", "WRONG_WORD"),
      word(1, 3, "CONFIRMED_ERROR", "OMISSION"),
      word(2, 1, "SKIPPED"),
      word(2, 2, "CORRECTED", "WRONG_WORD"),
      word(2, 3, "PEEKED"),
      word(2, 4, "POSSIBLE_ERROR"),
      word(2, 5, "UNREAD"),
    ], 6);
    expect(result).toEqual({
      wordsRecited: 6,
      totalWords: 8,
      confirmedMistakes: 1,
      skippedWords: 2,
      correctedWords: 1,
      peekedWords: 1,
      flaggedWords: [
        { key: "67:1:2", kind: "mistake" },
        { key: "67:1:3", kind: "skipped" },
        { key: "67:2:1", kind: "skipped" },
        { key: "67:2:2", kind: "corrected" },
        { key: "67:2:3", kind: "peeked" },
      ],
    });
  });

  it("matches the server key format", () => {
    const result = buildAssignmentResult([word(12, 7, "PEEKED")], 1);
    for (const flagged of result.flaggedWords) expect(flagged.key).toMatch(/^\d{1,3}:\d{1,3}:\d{1,3}$/);
  });

  it("clamps words recited to the range and caps the flagged list", () => {
    const many = Array.from({ length: MAX_FLAGGED_WORDS + 20 }, (_, i) => word(1 + Math.floor(i / 50), (i % 50) + 1, "PEEKED"));
    const result = buildAssignmentResult(many, 99_999);
    expect(result.wordsRecited).toBe(many.length);
    expect(result.peekedWords).toBe(many.length);
    expect(result.flaggedWords).toHaveLength(MAX_FLAGGED_WORDS);
  });
});

describe("groupFlaggedByAyah", () => {
  it("groups by ayah in mushaf order and drops malformed keys", () => {
    expect(groupFlaggedByAyah([
      { key: "2:10:4", kind: "mistake" },
      { key: "2:3:2", kind: "peeked" },
      { key: "2:10:1", kind: "skipped" },
      { key: "bad", kind: "mistake" },
    ])).toEqual([
      { verseKey: "2:3", ayah: 3, words: [{ position: 2, kind: "peeked" }] },
      { verseKey: "2:10", ayah: 10, words: [{ position: 1, kind: "skipped" }, { position: 4, kind: "mistake" }] },
    ]);
  });
});

describe("assignment helpers", () => {
  it("labels single-ayah and multi-ayah ranges", () => {
    expect(assignmentRangeLabel({ surahId: 1, startAyah: 2, endAyah: 2 })).toBe("سورة الفاتحة — الآية 2");
    expect(assignmentRangeLabel({ surahId: 1, startAyah: 1, endAyah: 7 })).toBe("سورة الفاتحة — الآيات 1–7");
  });

  it("allows reciting until the teacher reviews", () => {
    expect(canRecite("assigned")).toBe(true);
    expect(canRecite("submitted")).toBe(true);
    expect(canRecite("reviewed")).toBe(false);
    expect(canRecite("cancelled")).toBe(false);
  });
});

describe("collectRangeWords", () => {
  it("reads engine state per matcher index and keeps only the assignment range", () => {
    const corpus = [
      { verseKey: "67:1", position: 1, surah: 67, ayah: 1 },
      { verseKey: "67:1", position: 2, surah: 67, ayah: 1 },
      { verseKey: "67:3", position: 1, surah: 67, ayah: 3 },
    ];
    const states = ["CORRECT", "CONFIRMED_ERROR", "SKIPPED"] as const;
    const words = collectRangeWords(
      (index) => corpus[index] ?? null,
      {
        stateAt: (index) => states[index],
        mistakeAt: (index) => (index === 1 ? { kind: "OMISSION" } : null),
      },
      { surahId: 67, startAyah: 1, endAyah: 2 },
    );
    expect(words).toEqual([
      { verseKey: "67:1", position: 1, state: "CORRECT", mistakeKind: null },
      { verseKey: "67:1", position: 2, state: "CONFIRMED_ERROR", mistakeKind: "OMISSION" },
    ]);
    expect(buildAssignmentResult(words, 2).flaggedWords).toEqual([{ key: "67:1:2", kind: "skipped" }]);
  });
});
