import { describe, expect, it } from "vitest";
import {
  assignmentResultSchema,
  educationalStartInputSchema,
  generalStartInputSchema,
  getRecitationPolicy,
  isLegacyRangedGeneral,
} from "./recitation-contract";

describe("recitation contract separation", () => {
  it("allows GENERAL to start with start context only and no range", () => {
    const parsed = generalStartInputSchema.safeParse({
      mode: "general",
      startContext: { startPage: 42, startVerseKey: "2:255" },
      hideMode: "full_hide",
    });
    expect(parsed.success).toBe(true);
    expect(getRecitationPolicy("general").expectedEndPosition).toBe("none");
  });

  it("keeps GENERAL outside educational completion", () => {
    const policy = getRecitationPolicy("general");
    expect(policy.allowsEducationalProgress).toBe(false);
    expect(policy.rangeCompletionEnabled).toBe(false);
  });

  it("requires and validates an EDUCATIONAL expected range", () => {
    expect(educationalStartInputSchema.safeParse({
      mode: "educational",
      hideMode: "full_hide",
    }).success).toBe(false);

    expect(educationalStartInputSchema.safeParse({
      mode: "educational",
      expectedRange: {
        start: { surahId: 1, ayah: 7 },
        end: { surahId: 1, ayah: 8 },
      },
      hideMode: "full_hide",
    }).success).toBe(false);

    // An EDUCATIONAL start names the teacher's assignment it comes from.
    expect(educationalStartInputSchema.safeParse({
      mode: "educational",
      expectedRange: {
        start: { surahId: 2, ayah: 255 },
        end: { surahId: 2, ayah: 257 },
      },
      hideMode: "full_hide",
    }).success).toBe(false);

    expect(educationalStartInputSchema.safeParse({
      mode: "educational",
      assignmentId: "6f1c2d3e-4a5b-4c6d-8e7f-001122334455",
      expectedRange: {
        start: { surahId: 2, ayah: 255 },
        end: { surahId: 2, ayah: 257 },
      },
      hideMode: "full_hide",
    }).success).toBe(true);
  });

  it("uses mode as the source of truth and preserves legacy ranged GENERAL rows", () => {
    expect(generalStartInputSchema.safeParse({
      mode: "general",
      expectedRange: {
        start: { surahId: 1, ayah: 1 },
        end: { surahId: 1, ayah: 7 },
      },
      hideMode: "full_hide",
    }).success).toBe(false);
    expect(isLegacyRangedGeneral({
      mode: "general",
      surahId: 1,
      startAyah: 1,
      endAyah: 7,
    })).toBe(true);
    expect(isLegacyRangedGeneral({
      mode: "educational",
      surahId: 1,
      startAyah: 1,
      endAyah: 7,
    })).toBe(false);
  });
});
describe("assignment result contract", () => {
  const result = {
    wordsRecited: 10, totalWords: 12, confirmedMistakes: 1, skippedWords: 0, correctedWords: 0, peekedWords: 0,
    flaggedWords: [{ key: "67:3:2", kind: "mistake" }],
  };

  it("accepts flagged words keyed surah:ayah:position", () => {
    expect(assignmentResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects malformed flagged word keys", () => {
    expect(assignmentResultSchema.safeParse({ ...result, flaggedWords: [{ key: "67:3", kind: "mistake" }] }).success).toBe(false);
  });
});
