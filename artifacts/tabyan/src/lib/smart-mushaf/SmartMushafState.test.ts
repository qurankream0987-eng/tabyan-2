import { describe, expect, it } from "vitest";
import {
  applyProviderObservation,
  createSmartMushafState,
  statusForWord,
  wordKeyId,
  type WordKey,
} from "./SmartMushafState";

const firstWord: WordKey = { surah: 1, ayah: 1, wordIndex: 1 };
const secondWord: WordKey = { surah: 1, ayah: 1, wordIndex: 2 };
const validKeys = new Set([wordKeyId(firstWord), wordKeyId(secondWord)]);

describe("SmartMushafState", () => {
  it("uses canonical surah/ayah/word identity and starts hidden", () => {
    const state = createSmartMushafState();
    expect(wordKeyId(firstWord)).toBe("1:1:1");
    expect(statusForWord(state, firstWord)).toBe("hidden");
  });

  it("only advances a current word when the key belongs to the loaded Quran page", () => {
    const state = applyProviderObservation(
      createSmartMushafState(),
      { status: "current", wordKey: firstWord, provider: "mock_ui" },
      validKeys,
    );
    expect(statusForWord(state, firstWord)).toBe("current");
    expect(state.currentWordKey).toBe("1:1:1");
  });

  it("requires stabilization before committing a non-current outcome", () => {
    const pending = applyProviderObservation(
      createSmartMushafState(),
      { status: "confirmed", wordKey: firstWord, provider: "mock_ui" },
      validKeys,
    );
    expect(statusForWord(pending, firstWord)).toBe("hidden");

    const confirmed = applyProviderObservation(
      pending,
      {
        status: "confirmed",
        wordKey: firstWord,
        stabilized: true,
        provider: "mock_ui",
      },
      validKeys,
    );
    expect(statusForWord(confirmed, firstWord)).toBe("confirmed");
  });

  it("does not assign an unknown provider position to a word", () => {
    const state = applyProviderObservation(
      createSmartMushafState(),
      {
        status: "incorrect",
        wordKey: { surah: 1, ayah: 1, wordIndex: 99 },
        stabilized: true,
        provider: "mock_ui",
      },
      validKeys,
    );
    expect(Object.keys(state.words)).toHaveLength(0);
    expect(state.notice).toBe("unknown-position");
  });

  it("supports incorrect, skipped, and repeated only as explicit stable observations", () => {
    for (const status of ["incorrect", "skipped", "repeated"] as const) {
      const state = applyProviderObservation(
        createSmartMushafState(),
        { status, wordKey: secondWord, stabilized: true, provider: "mock_ui" },
        validKeys,
      );
      expect(statusForWord(state, secondWord)).toBe(status);
    }
  });
});
