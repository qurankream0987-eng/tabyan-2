/**
 * @license
 * Tabyan Smart Mushaf — Tanzil Uthmani Quran Content Provider
 * Production implementation of QuranContentProvider using Tanzil Hafs canonical data.
 */

import { QuranContentProvider, SearchResult } from './QuranContentProvider';
import { Surah, Ayah, QuranWord, WordKey, PageReference, JuzReference } from '../domain/types';
import { SURAH_METADATA, SurahMetaEntry } from '../data/surahMetadata';
import { JUZ_REFERENCES, getPageReference } from '../data/pages';
import { getCanonicalBasmalaText, getCanonicalSurah } from '../data/surahTextData';
import { normalizeArabicSimple, validateWordKeyBounds } from '../domain/validation';

export class TanzilQuranProvider implements QuranContentProvider {
  private readonly surahCache: Map<number, Surah> = new Map();

  async getSurahList(): Promise<readonly SurahMetaEntry[]> {
    return SURAH_METADATA;
  }

  async getSurah(surahNumber: number): Promise<Surah> {
    if (this.surahCache.has(surahNumber)) {
      return this.surahCache.get(surahNumber)!;
    }

    const meta = SURAH_METADATA.find((m) => m.number === surahNumber);
    if (!meta) {
      throw new Error(`Surah #${surahNumber} not found.`);
    }

    const ayahs = getCanonicalSurah(surahNumber);
    const bismillahText = getCanonicalBasmalaText(surahNumber);
    const surah: Surah = Object.freeze({
      number: meta.number,
      nameArabic: meta.nameArabic,
      nameEnglish: meta.nameEnglish,
      englishTranslation: meta.englishTranslation,
      totalAyahs: meta.totalAyahs,
      revelationType: meta.revelationType,
      startPage: meta.startPage,
      startJuz: meta.startJuz,
      ayahs: Object.freeze(ayahs),
      hasBismillah: meta.hasBismillah,
      ...(bismillahText ? { bismillahText } : {}),
    });

    this.surahCache.set(surahNumber, surah);
    return surah;
  }

  async getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah> {
    const surah = await this.getSurah(surahNumber);
    const ayah = surah.ayahs.find((a) => a.ayahNumber === ayahNumber);
    if (!ayah) {
      throw new Error(`Ayah ${surahNumber}:${ayahNumber} not found.`);
    }
    return ayah;
  }

  async getWords(surahNumber: number, ayahNumber: number): Promise<readonly QuranWord[]> {
    const ayah = await this.getAyah(surahNumber, ayahNumber);
    return ayah.words;
  }

  async resolveWord(key: WordKey): Promise<QuranWord | null> {
    try {
      validateWordKeyBounds(key);
      const words = await this.getWords(key.surah, key.ayah);
      const word = words.find((w) => w.key.wordIndex === key.wordIndex);
      return word || null;
    } catch {
      return null;
    }
  }

  async getPage(pageNumber: number): Promise<{
    readonly reference: PageReference;
    readonly ayahs: readonly Ayah[];
  }> {
    const boundedPage = Math.max(1, Math.min(604, pageNumber));
    const reference = getPageReference(boundedPage);

    // Collect all ayahs mapped to this page
    const matchedAyahs: Ayah[] = [];
    for (const surahNum of reference.surahsIncluded) {
      const surah = await this.getSurah(surahNum);
      for (const ayah of surah.ayahs) {
        if (ayah.page === boundedPage) {
          matchedAyahs.push(ayah);
        }
      }
    }

    // If none specifically flagged, return startAyah
    if (matchedAyahs.length === 0) {
      const startSurah = await this.getSurah(reference.startAyah.surah);
      const fallback = startSurah.ayahs.find((a) => a.ayahNumber === reference.startAyah.ayah);
      if (fallback) matchedAyahs.push(fallback);
    }

    return {
      reference,
      ayahs: Object.freeze(matchedAyahs),
    };
  }

  async getJuz(juzNumber: number): Promise<{
    readonly reference: JuzReference;
    readonly ayahs: readonly Ayah[];
  }> {
    const ref = JUZ_REFERENCES.find((j) => j.juzNumber === juzNumber) || JUZ_REFERENCES[0];
    const ayahs: Ayah[] = [];

    for (let s = ref.startSurah; s <= ref.endSurah; s++) {
      const surah = await this.getSurah(s);
      for (const a of surah.ayahs) {
        const inStart = s > ref.startSurah || a.ayahNumber >= ref.startAyah;
        const inEnd = s < ref.endSurah || a.ayahNumber <= ref.endAyah;
        if (inStart && inEnd) {
          ayahs.push(a);
        }
      }
    }

    return {
      reference: ref,
      ayahs: Object.freeze(ayahs),
    };
  }

  async search(query: string, maxResults = 30): Promise<readonly SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const normQuery = normalizeArabicSimple(trimmed);
    const results: SearchResult[] = [];

    // Search through cached and core surahs
    const surahList = await this.getSurahList();
    for (const meta of surahList) {
      const surah = await this.getSurah(meta.number);
      for (const ayah of surah.ayahs) {
        if (ayah.textSimple.includes(normQuery) || ayah.textUthmani.includes(trimmed)) {
          // Find the matching word index
          let matchedWordIndex = 1;
          for (const word of ayah.words) {
            if (word.textSimple.includes(normQuery) || word.textUthmani.includes(trimmed)) {
              matchedWordIndex = word.key.wordIndex;
              break;
            }
          }

          results.push({
            key: {
              surah: surah.number,
              ayah: ayah.ayahNumber,
              wordIndex: matchedWordIndex,
            },
            surahNumber: surah.number,
            surahNameArabic: surah.nameArabic,
            ayahNumber: ayah.ayahNumber,
            matchedWordIndex,
            textUthmani: ayah.textUthmani,
            highlightedText: ayah.textUthmani,
          });

          if (results.length >= maxResults) {
            return Object.freeze(results);
          }
        }
      }
    }

    return Object.freeze(results);
  }
}

// Default singleton instance
export const defaultQuranProvider = new TanzilQuranProvider();
