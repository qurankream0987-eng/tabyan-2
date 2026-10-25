/**
 * @license
 * Tabyan Smart Mushaf — Replaceable Quran Content Provider Interface
 * Non-negotiable: The content source must be replaceable without rewriting the application.
 */

import { Surah, Ayah, QuranWord, WordKey, PageReference, JuzReference } from '../domain/types';
import { SurahMetaEntry } from '../data/surahMetadata';

export interface SearchResult {
  readonly key: WordKey;
  readonly surahNumber: number;
  readonly surahNameArabic: string;
  readonly ayahNumber: number;
  readonly matchedWordIndex: number;
  readonly textUthmani: string;
  readonly highlightedText: string;
}

export interface QuranContentProvider {
  /**
   * Retrieves full metadata for all 114 Surahs.
   */
  getSurahList(): Promise<readonly SurahMetaEntry[]>;

  /**
   * Retrieves a single Surah with all its Ayahs and Words.
   */
  getSurah(surahNumber: number): Promise<Surah>;

  /**
   * Retrieves a specific Ayah by Surah and Ayah number.
   */
  getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah>;

  /**
   * Retrieves words for a specific Ayah.
   */
  getWords(surahNumber: number, ayahNumber: number): Promise<readonly QuranWord[]>;

  /**
   * Retrieves a single QuranWord by its canonical WordKey.
   */
  resolveWord(key: WordKey): Promise<QuranWord | null>;

  /**
   * Retrieves the page metadata and content for a standard Madani page (1..604).
   */
  getPage(pageNumber: number): Promise<{
    readonly reference: PageReference;
    readonly ayahs: readonly Ayah[];
  }>;

  /**
   * Retrieves all Ayahs contained in a specific Juz (1..30).
   */
  getJuz(juzNumber: number): Promise<{
    readonly reference: JuzReference;
    readonly ayahs: readonly Ayah[];
  }>;

  /**
   * Searches the Quran corpus using a simple or Uthmani query.
   */
  search(query: string, maxResults?: number): Promise<readonly SearchResult[]>;
}
