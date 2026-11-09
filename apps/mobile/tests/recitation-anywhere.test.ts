import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSearchIndex, type SearchRow } from "@workspace/tabyan-domain/quran-search";
import { NativeQuranLiveMatcher, type CanonicalQuranWord } from "../lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../lib/recitation/quran-normalizer";
import { AnywhereRecitationMatcher, findRecitationPlace, locateRecitation, type RecitationLocation } from "../lib/recitation/recitation-anywhere";

const WORDS = join(__dirname, "../../web/public/mushaf/v1/quran-words");
const index = buildSearchIndex((JSON.parse(readFileSync(join(WORDS, "search-index.json"), "utf8")) as { rows: SearchRow[] }).rows);
const corpus: CanonicalQuranWord[] = [];
for (let page = 1; page <= 604; page += 1) {
  for (const word of JSON.parse(readFileSync(join(WORDS, "pages", `${page}.json`), "utf8")).words) {
    corpus.push({ ...word, normalizedText: normalizeQuranText(word.displayText) });
  }
}
const surahFrom = (surah: number, ayah: number) => corpus.filter((w) => w.surah === surah && w.ayah >= ayah);

describe("reciting from anywhere", () => {
  it("finds where a reading starts from its first words", () => {
    expect(locateRecitation(index, "قل أوحي إلي أنه استمع نفر", false)).toMatchObject({ verseKey: "72:1", position: 1, page: 572 });
    // Begun in the middle of an ayah.
    expect(locateRecitation(index, "لا تأخذه سنة ولا نوم", false)).toMatchObject({ verseKey: "2:255", position: 8 });
    // Words said in many places wait for more.
    expect(locateRecitation(index, "إن الله غفور رحيم", false)).toBeNull();
    expect(locateRecitation(index, "بسم الله", false)).toBeNull();
    // The isti'adha and basmala are not the place («من الشيطان الرجيم» is also An-Nahl 98).
    expect(locateRecitation(index, "أعوذ بالله من الشيطان الرجيم", false)).toBeNull();
    expect(locateRecitation(index, "أعوذ بالله من الشيطان الرجيم فقلت استغفروا ربكم إنه كان غفارا", false)).toMatchObject({ verseKey: "71:10", position: 1 });
    expect(locateRecitation(index, "بسم الله الرحمن الرحيم تبارك الذي بيده الملك", false)).toMatchObject({ verseKey: "67:1", position: 1 });
    // Talk is not a place.
    expect(locateRecitation(index, "طيب يلا نبدأ دلوقتي", false)).toBeNull();
  });

  it("opened on An-Nisa, reading Al-Jinn goes to Al-Jinn and follows the reader there", () => {
    const located: RecitationLocation[] = [];
    const anywhere = new AnywhereRecitationMatcher(index, (location) => located.push(location));
    anywhere.feed("قل اوحي", "a", false);
    anywhere.feed("قل اوحي الي انه استمع", "a", false);
    expect(located.map((l) => l.verseKey)).toEqual(["72:1"]);
    anywhere.feed("قل اوحي الي انه استمع نفر من الجن", "a", true);
    expect(located).toHaveLength(1);
    // The screen loads the surah from there and hands over its matcher.
    const matcher = new NativeQuranLiveMatcher(surahFrom(72, located[0].ayah));
    matcher.setStartPosition({ verseKey: located[0].verseKey, wordPosition: located[0].position });
    const first = anywhere.attach(matcher);
    expect(first.reading).toMatchObject({ verseKey: "72:1", position: 8 });
    const next = anywhere.feed("فقالوا انا سمعنا قرانا عجبا", "b", true);
    expect(next.reading).toMatchObject({ verseKey: "72:1", position: 13 });
    expect(next.wordFeedback.size).toBeGreaterThan(0);
    expect([...next.wordFeedback.values()].every((feedback) => feedback === "correct")).toBe(true);
  });

  it("words read alike in several places are offered to choose from once the reader pauses", () => {
    const search = findRecitationPlace(index, "الحمد لله رب العالمين", false);
    expect(search?.kind).toBe("several");
    const keys = search?.kind === "several" ? search.candidates.map((c) => c.verseKey) : [];
    expect(keys).toContain("1:2");
    expect(keys.length).toBeGreaterThan(1);
    expect(keys.length).toBeLessThanOrEqual(6);

    const located: RecitationLocation[] = [];
    const offered: RecitationLocation[][] = [];
    const heard: string[] = [];
    const anywhere = new AnywhereRecitationMatcher(index, (location) => located.push(location), {
      onCandidates: (candidates) => offered.push(candidates),
      onHeard: (text) => heard.push(text),
    });
    // Still reading: nothing offered yet.
    anywhere.feed("الحمد لله رب العالمين", "a", false);
    expect(offered).toEqual([]);
    expect(heard.at(-1)).toBe("الحمد لله رب العالمين");
    // A pause on words said in several places offers them.
    anywhere.feed("الحمد لله رب العالمين", "a", true);
    expect(offered.at(-1)?.map((c) => c.verseKey)).toContain("1:2");
    // Choosing one goes there, and the offer is withdrawn.
    anywhere.choose(offered.at(-1)!.find((c) => c.verseKey === "1:2")!);
    expect(located.map((l) => l.verseKey)).toEqual(["1:2"]);
    expect(offered.at(-1)).toEqual([]);

    // Reading on instead tells the places apart without a choice.
    const other: RecitationLocation[] = [];
    const reading = new AnywhereRecitationMatcher(index, (location) => other.push(location));
    reading.feed("الحمد لله رب العالمين", "a", true);
    reading.feed("الرحمن الرحيم مالك يوم الدين", "b", true);
    expect(other.map((l) => l.verseKey)).toEqual(["1:2"]);
  });

  it("reading somewhere else for a while moves the reader there", () => {
    const located: RecitationLocation[] = [];
    const anywhere = new AnywhereRecitationMatcher(index, (location) => located.push(location));
    anywhere.feed("قل اوحي الي انه استمع نفر من الجن", "a", true);
    const matcher = new NativeQuranLiveMatcher(surahFrom(72, 1));
    matcher.setStartPosition({ verseKey: "72:1", wordPosition: 1 });
    anywhere.attach(matcher);
    anywhere.feed("الله لا اله الا هو الحي القيوم", "b", true);
    anywhere.feed("لا تاخذه سنة ولا نوم له ما في السماوات", "c", true);
    expect(located.map((l) => l.verseKey)).toEqual(["72:1", "2:255"]);
  });
});
