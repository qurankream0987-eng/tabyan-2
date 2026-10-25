/**
 * @license
 * Tabyan Smart Mushaf — Canonical Word Ordinal Index
 * Every one of the 77,433 recitable words gets a 0-based global ordinal in
 * mushaf order, so distance, next/previous word, and ayah/surah boundaries are
 * O(1) arithmetic instead of text searches or `wordIndex + 1` guesses.
 */

import { WordKey } from '../domain/types';
import { getCanonicalAyahWordCounts } from '../data/surahTextData';

export interface CanonicalWordIndex {
  readonly totalWords: number;
  readonly totalAyahs: number;
  /** 0-based global ordinal, or -1 when the key is not a canonical word. */
  ordinalOf(key: WordKey): number;
  keyAt(ordinal: number): WordKey | null;
  isValid(key: WordKey): boolean;
  next(key: WordKey): WordKey | null;
  previous(key: WordKey): WordKey | null;
  ayahWordCount(surah: number, ayah: number): number;
  ayahCount(surah: number): number;
  /** Signed word distance b − a in mushaf order; NaN when either key is invalid. */
  distance(a: WordKey, b: WordKey): number;
}

function buildIndex(counts: readonly (readonly number[])[]): CanonicalWordIndex {
  const surahFirstAyah = new Int32Array(counts.length + 2);
  let totalAyahs = 0;
  for (let s = 0; s < counts.length; s += 1) {
    surahFirstAyah[s + 1] = totalAyahs;
    totalAyahs += counts[s].length;
  }
  surahFirstAyah[counts.length + 1] = totalAyahs;

  // ayahStart[g] = ordinal of word 1 of global ayah g; ayahStart[totalAyahs] = totalWords.
  const ayahStart = new Int32Array(totalAyahs + 1);
  const ayahSurah = new Int16Array(totalAyahs);
  const ayahNumber = new Int16Array(totalAyahs);
  let ordinal = 0;
  let g = 0;
  for (let s = 0; s < counts.length; s += 1) {
    for (let a = 0; a < counts[s].length; a += 1) {
      ayahStart[g] = ordinal;
      ayahSurah[g] = s + 1;
      ayahNumber[g] = a + 1;
      ordinal += counts[s][a];
      g += 1;
    }
  }
  ayahStart[totalAyahs] = ordinal;
  const totalWords = ordinal;

  const globalAyah = (surah: number, ayah: number): number => {
    if (!Number.isInteger(surah) || surah < 1 || surah > counts.length) return -1;
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > counts[surah - 1].length) return -1;
    return surahFirstAyah[surah] + ayah - 1;
  };

  const ordinalOf = (key: WordKey): number => {
    const ga = globalAyah(key.surah, key.ayah);
    if (ga < 0 || !Number.isInteger(key.wordIndex) || key.wordIndex < 1) return -1;
    if (key.wordIndex > ayahStart[ga + 1] - ayahStart[ga]) return -1;
    return ayahStart[ga] + key.wordIndex - 1;
  };

  const keyAt = (target: number): WordKey | null => {
    if (!Number.isInteger(target) || target < 0 || target >= totalWords) return null;
    let lo = 0;
    let hi = totalAyahs - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ayahStart[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return Object.freeze({
      surah: ayahSurah[lo],
      ayah: ayahNumber[lo],
      wordIndex: target - ayahStart[lo] + 1,
    });
  };

  return Object.freeze({
    totalWords,
    totalAyahs,
    ordinalOf,
    keyAt,
    isValid: (key: WordKey) => ordinalOf(key) >= 0,
    next: (key: WordKey) => {
      const o = ordinalOf(key);
      return o < 0 ? null : keyAt(o + 1);
    },
    previous: (key: WordKey) => {
      const o = ordinalOf(key);
      return o < 0 ? null : keyAt(o - 1);
    },
    ayahWordCount: (surah: number, ayah: number) => {
      const ga = globalAyah(surah, ayah);
      return ga < 0 ? 0 : ayahStart[ga + 1] - ayahStart[ga];
    },
    ayahCount: (surah: number) =>
      Number.isInteger(surah) && surah >= 1 && surah <= counts.length ? counts[surah - 1].length : 0,
    distance: (a: WordKey, b: WordKey) => {
      const oa = ordinalOf(a);
      const ob = ordinalOf(b);
      return oa < 0 || ob < 0 ? Number.NaN : ob - oa;
    },
  });
}

let sharedIndex: CanonicalWordIndex | null = null;

export function getCanonicalWordIndex(): CanonicalWordIndex {
  sharedIndex ??= buildIndex(getCanonicalAyahWordCounts());
  return sharedIndex;
}
