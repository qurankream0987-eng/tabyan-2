import { describe, expect, it } from "vitest";
import { RecitationHistoryStore, filterMistakes, mistakesBySurah, type KeyValueStorage } from "./recitationHistoryStore";
import { groupRanges, isDueForReview, rankWeakness, recommend, weaknessOf, WEAKNESS_WEIGHTS } from "./weaknessEngine";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
}

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 25);

function session(store: RecitationHistoryStore, at: number, ayahs: { verseKey: string; correctWords?: number; confirmed?: number; corrected?: number; peeks?: number }[], mistakes: { verseKey: string; position: number; status: "confirmed" | "corrected" }[] = []) {
  return store.record({
    session: {
      at, durationSec: 120, mode: "hifz", scopeLabel: "الملك", firstVerseKey: ayahs[0]?.verseKey ?? null, lastVerseKey: ayahs.at(-1)?.verseKey ?? null,
      words: 40, confirmed: mistakes.filter((m) => m.status === "confirmed").length, corrected: mistakes.filter((m) => m.status === "corrected").length,
      peeks: 0, accuracy: 90,
    },
    mistakes: mistakes.map((m) => ({ ...m, kind: "WRONG_WORD" as const })),
    ayahs: ayahs.map((a) => ({ verseKey: a.verseKey, correctWords: a.correctWords ?? 8, confirmed: a.confirmed ?? 0, corrected: a.corrected ?? 0, peeks: a.peeks ?? 0 })),
  });
}

describe("recitation history store", () => {
  it("keeps separate histories per user and never stores audio or heard text", () => {
    const storage = memoryStorage();
    const a = new RecitationHistoryStore("user-a", storage);
    const b = new RecitationHistoryStore("user-b", storage);
    session(a, NOW, [{ verseKey: "67:2", confirmed: 1 }], [{ verseKey: "67:2", position: 3, status: "confirmed" }]);
    expect(a.load().sessions).toHaveLength(1);
    expect(b.load().sessions).toHaveLength(0);
    const raw = [...storage.data.values()].join("");
    expect(raw).not.toMatch(/audio|heard|transcript/i);
  });

  it("reclassifies a false positive instead of deleting it, and updates the ayah aggregate", () => {
    const store = new RecitationHistoryStore("u", memoryStorage());
    session(store, NOW, [{ verseKey: "67:2", confirmed: 1 }], [{ verseKey: "67:2", position: 3, status: "confirmed" }]);
    const id = store.load().mistakes[0].id;
    expect(store.markNotMistake(id, NOW + 1)).toBe(true);
    const data = store.load();
    expect(data.mistakes[0]).toMatchObject({ status: "dismissed", previousStatus: "confirmed", reclassifiedAt: NOW + 1 });
    expect(data.ayahs["67:2"].mistakes).toBe(0);
    expect(store.markNotMistake(id)).toBe(false);
  });

  it("filters mistakes by session, surah, ayah and status, and groups by surah", () => {
    const store = new RecitationHistoryStore("u", memoryStorage());
    const s1 = session(store, NOW, [{ verseKey: "67:2" }], [{ verseKey: "67:2", position: 3, status: "confirmed" }, { verseKey: "67:5", position: 1, status: "corrected" }]);
    session(store, NOW + 10, [{ verseKey: "2:255" }], [{ verseKey: "2:255", position: 4, status: "confirmed" }]);
    const data = store.load();
    expect(filterMistakes(data, { sessionId: s1.id })).toHaveLength(2);
    expect(filterMistakes(data, { surah: 67 })).toHaveLength(2);
    expect(filterMistakes(data, { verseKey: "2:255" })).toHaveLength(1);
    expect(filterMistakes(data, { status: "corrected" })).toHaveLength(1);
    expect(mistakesBySurah(data).map((s) => s.surah)).toEqual([2, 67]);
  });
});

describe("weakness engine", () => {
  const stat = (patch: Partial<Parameters<typeof weaknessOf>[0]>) => ({
    verseKey: "67:2", correctWords: 0, mistakes: 0, corrected: 0, peeks: 0, successfulReviews: 0, failedReviews: 0, lastReviewedAt: NOW, ...patch,
  });

  it("uses the documented weights and explains every contribution", () => {
    const score = weaknessOf(stat({ mistakes: 2, corrected: 1, peeks: 1, failedReviews: 1 }), NOW);
    expect(score.score).toBe(2 * WEAKNESS_WEIGHTS.mistake + WEAKNESS_WEIGHTS.corrected + WEAKNESS_WEIGHTS.peek + WEAKNESS_WEIGHTS.failedReview);
    expect(score.reasons.join(" ")).toContain("خطأ مؤكد");
    expect(score.reasons.join(" ")).toContain("تلميح");
  });

  it("successful reviews reduce weakness; a clean ayah is not weak", () => {
    expect(weaknessOf(stat({ mistakes: 1, successfulReviews: 2 }), NOW).score).toBe(0);
    expect(weaknessOf(stat({ correctWords: 50, successfulReviews: 3 }), NOW).score).toBe(0);
  });

  it("adds bounded staleness only to ayahs that were weak", () => {
    const old = NOW - 40 * DAY;
    expect(weaknessOf(stat({ mistakes: 1, lastReviewedAt: old }), NOW).score).toBe(WEAKNESS_WEIGHTS.mistake + WEAKNESS_WEIGHTS.stalenessCap);
    expect(weaknessOf(stat({ successfulReviews: 1, lastReviewedAt: old }), NOW).score).toBe(0);
  });

  it("schedules reviews with expanding intervals", () => {
    expect(isDueForReview(stat({ successfulReviews: 0, lastReviewedAt: NOW - 1 * DAY }), NOW)).toBe(true);
    expect(isDueForReview(stat({ successfulReviews: 2, lastReviewedAt: NOW - 3 * DAY }), NOW)).toBe(false);
    expect(isDueForReview(stat({ successfulReviews: 2, lastReviewedAt: NOW - 7 * DAY }), NOW)).toBe(true);
  });

  it("groups consecutive ayahs into ranges", () => {
    expect(groupRanges(["67:5", "67:3", "67:4", "67:9", "2:1"])).toEqual([
      { surah: 2, from: 1, to: 1 }, { surah: 67, from: 3, to: 5 }, { surah: 67, from: 9, to: 9 },
    ]);
  });
});

describe("smart review", () => {
  it("returns nothing for an empty history (no fake suggestions)", () => {
    const store = new RecitationHistoryStore("u", memoryStorage());
    expect(recommend(store.load(), NOW)).toEqual([]);
  });

  it("recommends from real history: weakest, frequent mistakes, stale and warm-up", () => {
    const store = new RecitationHistoryStore("u", memoryStorage());
    session(store, NOW - 20 * DAY, [{ verseKey: "67:2", confirmed: 1 }, { verseKey: "67:3", corrected: 1 }],
      [{ verseKey: "67:2", position: 3, status: "confirmed" }, { verseKey: "67:3", position: 1, status: "corrected" }]);
    session(store, NOW - 20 * DAY, [{ verseKey: "67:2", confirmed: 1 }], [{ verseKey: "67:2", position: 5, status: "confirmed" }]);
    const kinds = recommend(store.load(), NOW).map((r) => r.kind);
    expect(kinds).toEqual(expect.arrayContaining(["weakest", "frequent_mistakes", "stale", "warmup", "due_today"]));
    const weakest = recommend(store.load(), NOW).find((r) => r.kind === "weakest")!;
    expect(weakest.ranges[0]).toMatchObject({ surah: 67, from: 2 });
    expect(rankWeakness(store.load(), NOW)[0].verseKey).toBe("67:2");
  });
});
