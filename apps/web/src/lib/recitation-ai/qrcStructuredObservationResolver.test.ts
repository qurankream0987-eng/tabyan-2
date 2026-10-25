import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { QrcStructuredObservation } from "@workspace/tabyan-domain";
import type { CanonicalQuranWord } from "./canonicalWords";
import { CanonicalQuranResolver, type CanonicalQuranCoordinate } from "./qrcStructuredObservationResolver";

function loadActualPageWords(page: number): CanonicalQuranWord[] {
  const file = resolve(
    import.meta.dirname,
    `../../../public/mushaf/quran-words/pages/${page}.json`,
  );
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    words: Omit<CanonicalQuranWord, "normalizedText">[];
  };
  return data.words.map((word) => ({ ...word, normalizedText: "" }));
}

function coordinate(word: CanonicalQuranWord): CanonicalQuranCoordinate {
  return { surah: word.surah, ayah: word.ayah, wordIndex: word.position };
}

function observation(
  providerCoordinate: QrcStructuredObservation["providerCoordinate"],
  overrides: Partial<QrcStructuredObservation> = {},
): QrcStructuredObservation {
  return {
    authority: "provider_observation",
    provider: "nabr",
    kind: "WORD_CURRENT",
    providerEventType: "TILAWA_RESULT",
    observedAt: 1,
    providerCoordinate,
    confirmation: "unconfirmed",
    ...overrides,
  };
}

describe("CanonicalQuranResolver for QRC shadow observations", () => {
  const page1 = loadActualPageWords(1);
  const page604 = loadActualPageWords(604);

  it("resolves the documented first-surah, first-ayah, first-word example", () => {
    const first = page1.find((word) => word.surah === 1 && word.ayah === 1 && word.position === 1)!;
    const resolver = new CanonicalQuranResolver(page1, {
      start: coordinate(first),
      end: coordinate(page1.at(-1)!),
    });
    const resolved = resolver.resolve(observation({
      chapterIndex: 1,
      verseIndex: 1,
      wordIndex: 1,
    }));

    expect(resolved?.canonicalWord).toMatchObject({
      surah: 1,
      ayah: 1,
      verseKey: "1:1",
      wordIndex: 1,
      displayText: first.displayText,
    });
  });

  it("resolves an ayah end and the next ayah's first word without flattening identities", () => {
    const lastOfFirstAyah = page1.filter((word) => word.surah === 1 && word.ayah === 1).at(-1)!;
    const firstOfNextAyah = page1.find((word) => word.surah === 1 && word.ayah === 2)!;
    const resolver = new CanonicalQuranResolver(page1, {
      start: coordinate(page1[0]!),
      end: coordinate(page1.at(-1)!),
    });
    const last = resolver.resolve(observation({
      chapterIndex: 1,
      verseIndex: 1,
      wordIndex: lastOfFirstAyah.position,
    }));
    const next = resolver.resolve(observation({
      chapterIndex: 1,
      verseIndex: 2,
      wordIndex: firstOfNextAyah.position,
    }));

    expect(last?.canonicalWord).toMatchObject({ verseKey: "1:1", wordIndex: lastOfFirstAyah.position });
    expect(next?.canonicalWord).toMatchObject({ verseKey: "1:2", wordIndex: 1 });
  });

  it("resolves a Surah transition from the real canonical page corpus", () => {
    const boundary = page604.findIndex((word, index) =>
      index > 0 && page604[index - 1]!.surah !== word.surah);
    expect(boundary).toBeGreaterThan(0);
    const previous = page604[boundary - 1]!;
    const firstNext = page604[boundary]!;
    const resolver = new CanonicalQuranResolver(page604, {
      start: coordinate(page604[0]!),
      end: coordinate(page604.at(-1)!),
    });

    expect(resolver.resolve(observation({
      chapterIndex: previous.surah,
      verseIndex: previous.ayah,
      wordIndex: previous.position,
    }))?.canonicalWord).toMatchObject({ verseKey: previous.verseKey, wordIndex: previous.position });
    expect(resolver.resolve(observation({
      chapterIndex: firstNext.surah,
      verseIndex: firstNext.ayah,
      wordIndex: firstNext.position,
    }))?.canonicalWord).toMatchObject({ verseKey: firstNext.verseKey, wordIndex: firstNext.position });
    expect(firstNext.surah).toBeGreaterThan(previous.surah);
  });

  it("rejects invalid Quran coordinates and positions outside the server-owned session scope", () => {
    const first = page1[0]!;
    const resolver = new CanonicalQuranResolver(page1, {
      start: coordinate(first),
      end: coordinate(page1.at(-1)!),
    });

    expect(resolver.resolve(observation({ chapterIndex: 115, verseIndex: 1, wordIndex: 1 }))).toBeNull();
    expect(resolver.resolve(observation({ chapterIndex: 1, verseIndex: 8, wordIndex: 1 }))).toBeNull();
    expect(resolver.resolve(observation({ chapterIndex: 1, verseIndex: 1, wordIndex: 999 }))).toBeNull();
    expect(resolver.resolve(observation({ chapterIndex: 2, verseIndex: 1, wordIndex: 1 }))).toBeNull();
  });

  it("keeps an undocumented letter coordinate attached to its source word, without glyph mapping", () => {
    const first = page1[0]!;
    const resolver = new CanonicalQuranResolver(page1, {
      start: coordinate(first),
      end: coordinate(page1.at(-1)!),
    });
    const resolved = resolver.resolve(observation({
      chapterIndex: first.surah,
      verseIndex: first.ayah,
      wordIndex: first.position,
    }, {
      kind: "LETTER_OBSERVATION",
      providerLetterIndex: 0,
    }));

    expect(resolved?.canonicalWord).toMatchObject({
      verseKey: first.verseKey,
      wordIndex: first.position,
    });
    expect(resolved?.providerLetterIndex).toBe(0);
    expect(resolved?.letterMapping).toBe("unverified");
    expect(resolved?.canonicalWord).not.toHaveProperty("letterIndex");
  });

  it("leaves duplicate observations unconfirmed and outside learner-state authority", () => {
    const first = page1[0]!;
    const resolver = new CanonicalQuranResolver(page1, {
      start: coordinate(first),
      end: coordinate(page1.at(-1)!),
    });
    const input = observation({
      chapterIndex: first.surah,
      verseIndex: first.ayah,
      wordIndex: first.position,
    }, { kind: "WORD_REPORTED_SKIPPED", claim: "reported_skipped" });
    const firstResult = resolver.resolve(input);
    const repeatedResult = resolver.resolve(input);

    expect(firstResult?.authority).toBe("provider_observation");
    expect(firstResult?.confirmation).toBe("unconfirmed");
    expect(repeatedResult?.canonicalWord).toEqual(firstResult?.canonicalWord);
    expect(repeatedResult?.confirmation).toBe("unconfirmed");
    expect(firstResult).not.toHaveProperty("type", "mistake_confirmed");
  });
});
