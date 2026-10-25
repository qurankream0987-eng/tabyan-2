/**
 * @license
 * Tabyan Smart Mushaf — Basmala / Canonical Start Boundary Tests
 */

import { describe, expect, it } from 'vitest';
import { defaultQuranProvider } from '../quran/providers/TanzilQuranProvider';
import {
  DEFAULT_BASMALA_TEXT,
  basmalaRowText,
  getBasmalaHeaderText,
  shouldShowBasmalaHeader,
} from '../quran/data/basmala';
import {
  canonicalSessionStartToNabrIndices,
  canonicalWordIndicesToNabr,
  nabrIndicesToCanonicalWordKey,
  nabrWordIndicesToCanonical,
} from '../providers/nabr/nabrIndexConversion';

const VARIANT_BASMALA_TEXT = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

const SURAH_START_CASES = [
  {
    surahNumber: 1,
    hasBismillah: true,
    showHeader: false,
    firstWord: 'بِسْمِ',
    headerText: undefined,
  },
  {
    surahNumber: 2,
    hasBismillah: true,
    showHeader: true,
    firstWord: 'الٓمٓ',
    headerText: DEFAULT_BASMALA_TEXT,
  },
  {
    surahNumber: 9,
    hasBismillah: false,
    showHeader: false,
    firstWord: 'بَرَآءَةٌ',
    headerText: undefined,
  },
  {
    surahNumber: 95,
    hasBismillah: true,
    showHeader: true,
    firstWord: 'وَٱلتِّينِ',
    headerText: VARIANT_BASMALA_TEXT,
  },
  {
    surahNumber: 97,
    hasBismillah: true,
    showHeader: true,
    firstWord: 'إِنَّآ',
    headerText: VARIANT_BASMALA_TEXT,
  },
] as const;

describe('Basmala and canonical provider-index boundaries', () => {
  it.each(SURAH_START_CASES)(
    'keeps Surah $surahNumber first-word and session-start coordinates canonical',
    async ({ surahNumber, hasBismillah, showHeader, firstWord, headerText }) => {
      const surah = await defaultQuranProvider.getSurah(surahNumber);
      const firstAyah = surah.ayahs[0];
      const firstQuranWord = firstAyah.words[0];

      expect(surah.hasBismillah).toBe(hasBismillah);
      expect(firstAyah.ayahNumber).toBe(1);
      expect(firstQuranWord.textUthmani).toBe(firstWord);
      expect(firstQuranWord.key).toEqual({
        surah: surahNumber,
        ayah: 1,
        wordIndex: 1,
      });
      expect(shouldShowBasmalaHeader(surah)).toBe(showHeader);

      if (headerText) {
        expect(surah.bismillahText).toBe(headerText);
        expect(getBasmalaHeaderText(surah)).toBe(headerText);
        // The QCF page row shows the exact source spelling (95 and 97 keep their shadda).
        expect(basmalaRowText(surahNumber)).toBe(headerText);
        expect(firstAyah.textUthmani).not.toContain(headerText);
      } else {
        expect(surah.bismillahText).toBeUndefined();
      }

      if (surahNumber === 1) {
        expect(firstAyah.textUthmani.startsWith(DEFAULT_BASMALA_TEXT)).toBe(true);
      }

      const nabrStart = canonicalSessionStartToNabrIndices({
        surahNumber,
        startAyah: 1,
        startWordIndex: 1,
      });
      expect(nabrStart).toEqual({
        chapter_index: surahNumber,
        verse_index: 1,
        word_index: 1,
      });
      expect(nabrIndicesToCanonicalWordKey(nabrStart)).toEqual(firstQuranWord.key);
    },
  );

  it('keeps the default Basmala byte-identical to the Tanzil source', async () => {
    const fatiha = await defaultQuranProvider.getAyah(1, 1);
    // Al-Fatihah 1:1 is the Basmala itself, as a recitable ayah.
    expect(DEFAULT_BASMALA_TEXT).toBe(fatiha.textUthmani);
    // Shadda precedes fatha in the source; a canonically reordered copy must not pass.
    expect(DEFAULT_BASMALA_TEXT.includes('\u0644\u0644\u0651\u064e')).toBe(true);
  });

  it('converts the internal 0-based correct/skipped word lists without shifting', () => {
    expect(nabrWordIndicesToCanonical([0, 2])).toEqual([1, 3]);
    expect(canonicalWordIndicesToNabr([1, 3])).toEqual([0, 2]);
    expect(nabrWordIndicesToCanonical(undefined)).toEqual([]);
  });
});
