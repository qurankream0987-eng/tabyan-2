/**
 * @license
 * Tabyan Smart Mushaf — Canonical Quran Domain Types
 * Invariant: Every Quran word is identified strictly by immutable WordKey.
 */

export interface WordKey {
  readonly surah: number;     // 1..114
  readonly ayah: number;      // 1..N
  readonly wordIndex: number; // 1-based index within the Ayah
}

export type WordKeyString = `${number}:${number}:${number}`;

export function serializeWordKey(key: WordKey): WordKeyString {
  return `${key.surah}:${key.ayah}:${key.wordIndex}`;
}

export function parseWordKey(str: WordKeyString | string): WordKey {
  const parts = str.split(':').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid WordKey string format: "${str}". Expected "surah:ayah:wordIndex".`);
  }
  return {
    surah: parts[0],
    ayah: parts[1],
    wordIndex: parts[2],
  };
}

export function areWordKeysEqual(a: WordKey | null | undefined, b: WordKey | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.surah === b.surah && a.ayah === b.ayah && a.wordIndex === b.wordIndex;
}

export function compareWordKeys(a: WordKey, b: WordKey): number {
  if (a.surah !== b.surah) return a.surah - b.surah;
  if (a.ayah !== b.ayah) return a.ayah - b.ayah;
  return a.wordIndex - b.wordIndex;
}

export interface QuranWord {
  readonly key: WordKey;
  readonly textUthmani: string;
  readonly textSimple: string; // Diacritic-stripped for search & phonetic alignment
  readonly page: number;       // Madani 604-page reference
  readonly juz: number;        // 1..30
  readonly hizb: number;       // 1..60
  readonly lineIndex?: number; // Optional 15-line Mushaf visual reference
}

export interface Ayah {
  readonly surahNumber: number;
  readonly ayahNumber: number;
  readonly textUthmani: string;
  readonly textSimple: string;
  readonly words: readonly QuranWord[];
  readonly page: number;
  readonly juz: number;
  readonly hizb: number;
  readonly sajda?: boolean;
}

export type RevelationType = 'Meccan' | 'Medinan';

export interface Surah {
  readonly number: number;             // 1..114
  readonly nameArabic: string;         // e.g. "الفاتحة"
  readonly nameEnglish: string;        // e.g. "Al-Fatihah"
  readonly englishTranslation: string; // e.g. "The Opening"
  readonly totalAyahs: number;
  readonly revelationType: RevelationType;
  readonly startPage: number;          // 1..604
  readonly startJuz: number;           // 1..30
  readonly ayahs: readonly Ayah[];
  readonly hasBismillah: boolean;
  /** Source-spelled, presentation-only Basmala extracted from the first ayah row, when separate. */
  readonly bismillahText?: string;
}

export interface PageReference {
  readonly pageNumber: number;         // 1..604
  readonly juzNumber: number;          // 1..30
  readonly surahsIncluded: readonly number[];
  readonly startAyah: { readonly surah: number; readonly ayah: number };
  readonly endAyah: { readonly surah: number; readonly ayah: number };
}

export interface JuzReference {
  readonly juzNumber: number;          // 1..30
  readonly startSurah: number;
  readonly startAyah: number;
  readonly endSurah: number;
  readonly endAyah: number;
  readonly nameArabic: string;
}

export interface Bookmark {
  readonly id: string;
  readonly key: WordKey;
  readonly surahName: string;
  readonly textPreview: string;
  readonly page: number;
  readonly createdAt: number;
  readonly note?: string;
}
