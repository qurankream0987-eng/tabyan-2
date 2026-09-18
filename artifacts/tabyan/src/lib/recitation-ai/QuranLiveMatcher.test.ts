import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QuranLiveMatcher } from "./QuranLiveMatcher";
import { normalizeQuranText } from "./normalizer";
import type { CanonicalQuranWord } from "./canonicalWords";
import type { TranscriptEvent } from "./types";

const words: CanonicalQuranWord[] = [
  ["تَبَـٰرَكَ", "ٱلَّذِى", "بِيَدِهِ", "ٱلْمُلْكُ"].map((displayText, index) => ({
    surah: 67,
    ayah: 1,
    verseKey: "67:1",
    position: index + 1,
    page: 562,
    line: 3,
    displayText,
    normalizedText: normalizeQuranText(displayText),
  })),
].flat();

function event(text: string, isFinal = false, itemId = "item-1"): TranscriptEvent {
  return { text, isFinal, itemId, receivedAt: 1 };
}

function loadActualPageWords(page: number): CanonicalQuranWord[] {
  const file = resolve(
    import.meta.dirname,
    `../../../public/mushaf/quran-words/pages/${page}.json`,
  );
  const data = JSON.parse(readFileSync(file, "utf8")) as {
    words: Omit<CanonicalQuranWord, "normalizedText">[];
  };
  return data.words.map((word) => ({
    ...word,
    normalizedText: normalizeQuranText(word.displayText),
  }));
}

function findActualSameSurahPageBoundary() {
  for (let page = 1; page < 604; page += 1) {
    const source = loadActualPageWords(page);
    const target = loadActualPageWords(page + 1);
    if (source.at(-1)?.surah === target[0]?.surah) return { page, source, target };
  }
  throw new Error("لم يُعثر على حد صفحة داخل السورة في بيانات المصحف");
}

function findActualSamePageSurahBoundary() {
  for (let page = 1; page <= 604; page += 1) {
    const words = loadActualPageWords(page);
    const index = words.findIndex((word, current) => current > 0 && words[current - 1].surah !== word.surah);
    if (index > 0) return { page, words, index };
  }
  throw new Error("لم يُعثر على حد سورتين داخل الصفحة في بيانات المصحف");
}

describe("normalizeQuranText", () => {
  it("removes marks and maps only conservative orthographic variants", () => {
    expect(normalizeQuranText("ٱلَّذِى")).toBe("الذي");
    expect(normalizeQuranText("تَبَـٰرَكَ")).toBe("تبارك");
    expect(normalizeQuranText("رَحْمَةٌ")).toBe("رحمة");
  });

  it("does not collapse distinct root letters", () => {
    expect(normalizeQuranText("مَلِك")).not.toBe(normalizeQuranText("مَالِك"));
    expect(normalizeQuranText("رَحْمَة")).not.toBe(normalizeQuranText("رَحِيم"));
    expect(normalizeQuranText("هُدًى")).not.toBe(normalizeQuranText("هُدَىة"));
  });
});

describe("QuranLiveMatcher", () => {
  it("reveals a strong first partial then advances monotonically", () => {
    const matcher = new QuranLiveMatcher(words);
    const first = matcher.feed(event("تبارك"));
    expect(first.stable).toBe(true);
    expect(first.current?.position).toBe(1);
    expect(first.revealedWords.get("67:1")).toBe(1);

    const second = matcher.feed(event("تبارك الذي"));
    expect(second.stable).toBe(true);
    expect(second.current?.position).toBe(2);
    expect(second.revealedWords.get("67:1")).toBe(2);
  });

  it("does not advance on repetition or an unrelated weak partial", () => {
    const matcher = new QuranLiveMatcher(words);
    matcher.feed(event("تبارك"));
    matcher.feed(event("تبارك الذي"));

    const repeated = matcher.feed(event("الذي", true, "item-2"));
    expect(repeated.current?.position).toBe(2);
    expect(repeated.revealedWords.get("67:1")).toBe(2);

    const unrelated = matcher.feed(event("كلمة بعيدة", false, "item-3"));
    expect(unrelated.current?.position).toBe(2);
    expect(unrelated.revealedWords.get("67:1")).toBe(2);
  });

  it("continues after a correction without recording a mistake", () => {
    const matcher = new QuranLiveMatcher(words);
    matcher.feed(event("تبارك الذي"));
    matcher.feed(event("تبارك الذي", false, "item-2"));
    const wrong = matcher.feed(event("كلمة خاطئة", false, "item-3"));
    expect(wrong.current?.position).toBe(2);

    const corrected = matcher.feed(event("بيده", true, "item-4"));
    expect(corrected.current?.position).toBe(3);
    expect(corrected.revealedWords.get("67:1")).toBe(3);
  });

  it("keeps a provisional word separate until a strong sequence is confirmed", () => {
    const matcher = new QuranLiveMatcher(words, { commitStability: 2 });
    const provisional = matcher.feed(event("تبارك الذي", false, "item-1"));
    expect(provisional.provisional?.position).toBe(2);
    expect(provisional.revealedWords.get("67:1")).toBeUndefined();

    const committed = matcher.feed(event("تبارك الذي", false, "item-2"));
    expect(committed.provisional).toBeNull();
    expect(committed.revealedWords.get("67:1")).toBe(2);
  });

  it("enters recovery only after repeated misses and returns to tracking after finding context", () => {
    const matcher = new QuranLiveMatcher(words, { recoveryMismatchLimit: 3 });
    matcher.feed(event("تبارك"));
    matcher.feed(event("نص بعيد", false, "miss-1"));
    matcher.feed(event("نص بعيد", false, "miss-2"));
    const recovery = matcher.feed(event("نص بعيد", false, "miss-3"));
    expect(recovery.mode).toBe("recovery");
    expect(recovery.diagnostics.recoveryModeEntries).toBe(1);

    const recovered = matcher.feed(event("الملك", false, "recover-1"));
    expect(recovered.mode).toBe("tracking");
    expect(recovered.current?.position).toBe(4);
    expect(recovered.diagnostics.recoverySuccesses).toBe(1);
  });

  it("continues into appended next-page words without resetting committed progress", () => {
    const matcher = new QuranLiveMatcher(words);
    matcher.feed(event("تبارك الذي بيده الملك", true, "page-1"));

    const nextPageWord: CanonicalQuranWord = {
      surah: 67,
      ayah: 2,
      verseKey: "67:2",
      position: 1,
      page: 563,
      line: 1,
      displayText: "ٱلَّذِى",
      normalizedText: normalizeQuranText("ٱلَّذِى"),
    };
    matcher.appendWords([nextPageWord]);

    const next = matcher.feed(event("الذي", true, "page-2"));
    expect(next.current?.page).toBe(563);
    expect(next.current?.verseKey).toBe("67:2");
    expect(next.revealedWords.get("67:1")).toBe(4);
    expect(next.revealedWords.get("67:2")).toBe(1);
  });

  it("starts matching from a supplied middle-of-page context", () => {
    const context = [
      ...words,
      ...["ٱلْمُلْكُ", "وَهُوَ", "عَلَىٰ", "كُلِّ", "شَىْءٍ", "قَدِيرٌ"].map((displayText, index) => ({
        surah: 67,
        ayah: 2,
        verseKey: "67:2",
        position: index + 1,
        page: 562,
        line: 4,
        displayText,
        normalizedText: normalizeQuranText(displayText),
      })),
    ];
    const matcher = new QuranLiveMatcher(context);

    expect(matcher.setStartPosition({ verseKey: "67:2" })).toBe(true);
    const match = matcher.feed(event("وهو على كل شيء", true, "middle-of-page"));

    expect(match.mode).toBe("tracking");
    expect(match.current?.verseKey).toBe("67:2");
    expect(match.current?.position).toBe(5);
    expect(match.diagnostics.recoveryModeEntries).toBe(0);
  });

  it("recovers from the real Fatiha→Baqarah boundary after skipped tail words", () => {
    const sourcePage = loadActualPageWords(1);
    const targetPage = loadActualPageWords(2);
    const matcher = new QuranLiveMatcher(
      [...sourcePage.slice(-16), ...targetPage],
      { generalPositionFollowing: true },
    );

    // نثبت موضعاً قبل آخر كلمتين، ثم نحاكي صمتاً قبل بداية السورة التالية.
    matcher.feed(event(sourcePage.slice(-5, -2).map((word) => word.displayText).join(" "), true, "pre-boundary"));
    matcher.feed(event("نص بعيد", false, "silence-1"));
    matcher.feed(event("نص بعيد", false, "silence-2"));
    const recovery = matcher.feed(event("نص بعيد", false, "silence-3"));
    expect(recovery.mode).toBe("recovery");

    const nextSurah = matcher.feed(
      event(targetPage.slice(0, 1).map((word) => word.displayText).join(" "), true, "next-surah"),
    );
    expect(nextSurah.current?.verseKey).toBe("2:1");
    expect(nextSurah.current?.page).toBe(2);
    expect(nextSurah.current?.position).toBe(1);
  });

  it("skips a spoken optional basmala when the real next-surah canonical source omits it", () => {
    const sourcePage = loadActualPageWords(1);
    const targetPage = loadActualPageWords(2);
    const matcher = new QuranLiveMatcher(
      [...sourcePage.slice(-16), ...targetPage],
      { generalPositionFollowing: true, ignoreOptionalBasmala: true },
    );
    matcher.feed(event(sourcePage.slice(-3).map((word) => word.displayText).join(" "), true, "fatiha-end"));

    const withBasmala = [
      "بسم الله الرحمن الرحيم",
      targetPage.slice(0, 1).map((word) => word.displayText).join(" "),
    ].join(" ");
    const nextSurah = matcher.feed(event(withBasmala, true, "basmala-then-baqarah"));

    expect(nextSurah.current?.verseKey).toBe("2:1");
    expect(nextSurah.current?.page).toBe(2);
    expect(nextSurah.current?.position).toBe(1);
  });

  it("tracks a real page boundary inside the same surah", () => {
    const { page, source, target } = findActualSameSurahPageBoundary();
    const matcher = new QuranLiveMatcher(
      [...source.slice(-16), ...target],
      { generalPositionFollowing: true },
    );

    matcher.feed(event(source.slice(-3).map((word) => word.displayText).join(" "), true, "same-surah-tail"));
    const nextPage = matcher.feed(event(target[0].displayText, true, "same-surah-next-page"));

    expect(nextPage.current?.surah).toBe(source.at(-1)?.surah);
    expect(nextPage.current?.page).toBe(page + 1);
  });

  it("tracks a real next-surah word without inventing a page turn when the boundary is on one page", () => {
    const { page, words, index } = findActualSamePageSurahBoundary();
    const context = words.slice(Math.max(0, index - 16));
    const boundaryIndex = index - Math.max(0, index - 16);
    const matcher = new QuranLiveMatcher(context, { generalPositionFollowing: true });

    matcher.feed(
      event(context.slice(boundaryIndex - 3, boundaryIndex).map((word) => word.displayText).join(" "), true, "same-page-tail"),
    );
    const nextSurah = matcher.feed(event(context[boundaryIndex].displayText, true, "same-page-next-surah"));

    expect(nextSurah.current?.surah).toBe(context[boundaryIndex].surah);
    expect(nextSurah.current?.page).toBe(page);
  });
});