import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { normalizeQuranText } from "./normalizer";
import { buildSearchIndex, queryTokens, searchQuran, type SearchRow } from "./quranSearch";

const file = resolve(import.meta.dirname, "../../../public/mushaf/quran-words/search-index.json");
const data = JSON.parse(readFileSync(file, "utf8")) as { version: string; verses: number; sha256: string; rows: SearchRow[] };
const index = buildSearchIndex(data.rows);

function pageWords(page: number) {
  return (JSON.parse(readFileSync(resolve(import.meta.dirname, `../../../public/mushaf/quran-words/pages/${page}.json`), "utf8")).words as { verseKey: string; position: number; displayText: string }[]);
}

describe("generated Quran search index", () => {
  it("covers all 6236 ayahs with an intact checksum", () => {
    expect(data.version).toBe("tabyan-quran-search-v1");
    expect(data.rows).toHaveLength(6236);
    expect(createHash("sha256").update(JSON.stringify(data.rows)).digest("hex")).toBe(data.sha256);
  });

  it("is exactly the canonical word text normalized with the matcher's normalizer", () => {
    for (const page of [1, 50, 293, 562, 604]) {
      const byVerse = new Map<string, string[]>();
      for (const word of pageWords(page)) {
        const list = byVerse.get(word.verseKey) ?? [];
        list[word.position - 1] = normalizeQuranText(word.displayText);
        byVerse.set(word.verseKey, list);
      }
      for (const [verseKey, words] of byVerse) {
        const row = data.rows.find((r) => r[0] === verseKey)!;
        // آيات تعبر الصفحة: كلمات هذه الصفحة جزء متصل من نص الآية المفهرس.
        expect(row[2].includes(words.filter(Boolean).join(" "))).toBe(true);
      }
    }
  });
});

describe("Quran search", () => {
  it("finds a well-known phrase from undiacritized modern spelling", () => {
    const results = searchQuran(index, "الله لا اله الا هو الحي القيوم");
    expect(results[0].verseKey).toBe("2:255");
  });

  it("tolerates ASR spelling variants (ة/ه, missing alef)", () => {
    const results = searchQuran(index, "تبارك الذي بيده الملك وهو علي كل شيء قدير");
    expect(results[0].verseKey).toBe("67:1");
  });

  it("follows a phrase that crosses into the next ayah", () => {
    const tail = "الحمد لله رب العالمين الرحمن الرحيم";
    const results = searchQuran(index, tail);
    expect(results[0]).toMatchObject({ verseKey: "1:2", endVerseKey: "1:3" });
  });

  it("returns the refrain's many positions in canonical order rather than guessing one", () => {
    const results = searchQuran(index, "فباي الاء ربكما تكذبان", { limit: 40 });
    expect(results.length).toBeGreaterThan(20);
    // Every full match is a refrain of ar-Rahman; "فبأي آلاء ربك" (53:55) may follow as a partial match.
    const full = results.filter((r) => r.score === 1);
    expect(full.length).toBeGreaterThan(20);
    expect(full.every((r) => r.verseKey.startsWith("55:"))).toBe(true);
    expect(results.slice(0, full.length)).toEqual(full);
    expect(results[0].verseKey).toBe("55:13");
  });

  it("returns nothing for unrelated speech instead of forcing a match", () => {
    expect(searchQuran(index, "مرحبا كيف حالك اليوم يا صديقي")).toEqual([]);
  });

  it("strips punctuation and digits from the query", () => {
    expect(queryTokens("«الحمد لله» 12، رب!")).toEqual(["الحمد", "لله", "رب"]);
  });
});
