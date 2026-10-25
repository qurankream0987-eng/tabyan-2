/**
 * @license
 * Tabyan Smart Mushaf — Complete 114 Surahs Data Integrity Audit
 * Verifies all 114 Surahs, boundary compliance, WordKey uniqueness, and monotonicity.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { defaultQuranProvider, TanzilQuranProvider } from '../quran/providers/TanzilQuranProvider';
import { SURAH_METADATA } from '../quran/data/surahMetadata';
import { serializeWordKey, WordKey } from '../quran/domain/types';
import tanzilUthmaniText from '../quran/data/tanzil-uthmani.txt?raw';
import {
  canonicalWordKeyToNabrIndices,
  nabrIndicesToCanonicalWordKey,
} from '../providers/nabr/nabrIndexConversion';

const TANZIL_SOURCE_SHA256 = '6933e133dd56db778c801bf738848454e43648105a151e8d84d86a7cae39ec5f';
const STANDARD_BASMALA_PREFIX = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const VARIANT_BASMALA_PREFIX = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const BASMALA_PREFIXES = [STANDARD_BASMALA_PREFIX, VARIANT_BASMALA_PREFIX] as const;
const EXPECTED_VARIANT_BASMALA_SURAHS = [95, 97];
const EXPECTED_EMBEDDED_BASMALA_COUNT = 112;
const EXPECTED_CANONICAL_WORD_COUNT = 77433;

function findEmbeddedBasmalaPrefix(surah: number, ayah: number, sourceText: string): string | undefined {
  if (ayah !== 1 || surah === 1 || surah === 9) return undefined;
  return BASMALA_PREFIXES.find((prefix) => sourceText.startsWith(`${prefix} `));
}

function expectedCanonicalAyahText(surah: number, ayah: number, sourceText: string): string {
  const prefix = findEmbeddedBasmalaPrefix(surah, ayah, sourceText);
  return prefix ? sourceText.slice(prefix.length + 1) : sourceText;
}

describe('Quran Data Integrity Audit — Complete 114 Surahs', () => {
  it('verifies all 114 Surahs, Ayah boundaries, and WordKey uniqueness', async () => {
    expect(SURAH_METADATA.length).toBe(114);
    expect(createHash('sha256').update(tanzilUthmaniText, 'utf8').digest('hex')).toBe(
      TANZIL_SOURCE_SHA256,
    );

    const sourceTexts = new Map<string, string>();
    for (const line of tanzilUthmaniText.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const firstSeparator = line.indexOf('|');
      const secondSeparator = line.indexOf('|', firstSeparator + 1);
      expect(firstSeparator).toBeGreaterThan(0);
      expect(secondSeparator).toBeGreaterThan(firstSeparator + 1);
      const key = `${line.slice(0, firstSeparator)}:${line.slice(firstSeparator + 1, secondSeparator)}`;
      expect(sourceTexts.has(key)).toBe(false);
      sourceTexts.set(key, line.slice(secondSeparator + 1));
    }
    expect(sourceTexts.size).toBe(6236);

    let totalAyahsCalculated = 0;
    let totalWordsCalculated = 0;
    let embeddedBasmalaCount = 0;
    const variantBasmalaSurahs = new Set<number>();
    const seenAyahKeys = new Set<string>();
    const seenWordKeys = new Set<string>();

    for (let s = 1; s <= 114; s++) {
      const meta = SURAH_METADATA[s - 1];
      expect(meta.number).toBe(s);
      expect(meta.totalAyahs).toBeGreaterThan(0);

      const surah = await defaultQuranProvider.getSurah(s);
      expect(surah.number).toBe(s);
      expect(surah.ayahs.length).toBe(meta.totalAyahs);

      for (let a = 0; a < surah.ayahs.length; a++) {
        const ayah = surah.ayahs[a];
        const expectedAyahNum = a + 1;

        // Ayah boundaries
        expect(ayah.surahNumber).toBe(s);
        expect(ayah.ayahNumber).toBe(expectedAyahNum);

        const ayahKey = `${s}:${expectedAyahNum}`;
        expect(seenAyahKeys.has(ayahKey)).toBe(false);
        seenAyahKeys.add(ayahKey);
        totalAyahsCalculated++;
        const sourceText = sourceTexts.get(ayahKey);
        expect(sourceText).toBeDefined();
        const embeddedBasmalaPrefix = findEmbeddedBasmalaPrefix(s, expectedAyahNum, sourceText!);
        if (embeddedBasmalaPrefix) {
          embeddedBasmalaCount += 1;
          if (embeddedBasmalaPrefix === VARIANT_BASMALA_PREFIX) {
            variantBasmalaSurahs.add(s);
          }
        }
        expect(ayah.textUthmani).toBe(
          expectedCanonicalAyahText(s, expectedAyahNum, sourceText!),
        );
        expect(ayah.textUthmani).not.toContain('ءَايَةٌ كَرِيمَةٌ');

        // Word boundaries and monotonicity
        expect(ayah.words.length).toBeGreaterThan(0);

        for (let w = 0; w < ayah.words.length; w++) {
          const word = ayah.words[w];
          const expectedWordIndex = w + 1;

          // 1-based positive index verification
          expect(word.key.surah).toBe(s);
          expect(word.key.ayah).toBe(expectedAyahNum);
          expect(word.key.wordIndex).toBe(expectedWordIndex);
          expect(word.key.wordIndex).toBeGreaterThan(0);

          const wordKeyStr = serializeWordKey(word.key);
          expect(seenWordKeys.has(wordKeyStr)).toBe(false);
          seenWordKeys.add(wordKeyStr);
          expect(
            serializeWordKey(
              nabrIndicesToCanonicalWordKey(canonicalWordKeyToNabrIndices(word.key)),
            ),
          ).toBe(wordKeyStr);
          totalWordsCalculated++;

          // Every rendered QuranWord maps to exact canonical WordKey
          expect(word.textUthmani.length).toBeGreaterThan(0);
          expect(word.textSimple.length).toBeGreaterThan(0);
        }
      }
    }

    // Official 114 Surahs verification
    expect(totalAyahsCalculated).toBe(6236); // Canonical Hafs verse count: exactly 6,236 Ayahs!
    expect(embeddedBasmalaCount).toBe(EXPECTED_EMBEDDED_BASMALA_COUNT);
    expect([...variantBasmalaSurahs]).toEqual(EXPECTED_VARIANT_BASMALA_SURAHS);
    expect(totalWordsCalculated).toBe(seenWordKeys.size);
    // Canonical word count after separating all 112 source-embedded prefixes.
    expect(totalWordsCalculated).toBe(EXPECTED_CANONICAL_WORD_COUNT);
    expect(seenWordKeys.size).toBe(EXPECTED_CANONICAL_WORD_COUNT);

    console.log(`[QURAN INTEGRITY AUDIT COMPLETE]`);
    console.log(`TOTAL_SURAHS: 114`);
    console.log(`TOTAL_AYAHS: ${totalAyahsCalculated}`);
    console.log(`TOTAL_WORDS: ${totalWordsCalculated}`);
    console.log(`TOTAL_UNIQUE_WORD_KEYS: ${seenWordKeys.size}`);
    console.log(`MISSING_WORDKEYS: 0`);
    console.log(`DUPLICATE_WORDKEYS: 0`);
    console.log(`NONDETERMINISTIC_WORDKEYS: 0`);
  }, 15000);

  it('rebuilds the same canonical WordKeys from independent provider instances', async () => {
    const independentProvider = new TanzilQuranProvider();

    for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
      const [first, second] = await Promise.all([
        defaultQuranProvider.getSurah(surahNumber),
        independentProvider.getSurah(surahNumber),
      ]);
      expect(second.bismillahText).toBe(first.bismillahText);
      expect(
        second.ayahs.map((ayah) => ayah.words.map((word) => serializeWordKey(word.key))),
      ).toEqual(first.ayahs.map((ayah) => ayah.words.map((word) => serializeWordKey(word.key))));
    }
  });

  it('validates word tokenization for representative passages without mismatch', async () => {
    // 1. Al-Fatihah (7 Ayahs, 29 Words)
    const fatihah = await defaultQuranProvider.getSurah(1);
    const fatihahWordCount = fatihah.ayahs.reduce((acc, a) => acc + a.words.length, 0);
    expect(fatihahWordCount).toBe(29);
    expect(fatihah.ayahs[0].page).toBe(1);
    expect(fatihah.ayahs[0].words[0].textUthmani).toBe('بِسْمِ');
    expect(fatihah.ayahs[0].words[1].textUthmani).toBe('ٱللَّهِ');
    expect(fatihah.ayahs[0].words[2].textUthmani).toBe('ٱلرَّحْمَـٰنِ');
    expect(fatihah.ayahs[0].words[3].textUthmani).toBe('ٱلرَّحِيمِ');

    // 2. Al-Baqarah beginning (Ayahs 1-5)
    const baqarah = await defaultQuranProvider.getSurah(2);
    expect(baqarah.ayahs[0].words[0].textUthmani).toBe('الٓمٓ');
    expect(baqarah.ayahs[5].page).toBe(3);
    expect(baqarah.ayahs[1].words.length).toBe(7); // ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَۛ فِيهِۛ هُدًى لِّلْمُتَّقِينَ

    // 3. Ayat al-Kursi (2:255)
    const ayatKursi = await defaultQuranProvider.getAyah(2, 255);
    expect(ayatKursi.page).toBe(42);
    expect(ayatKursi.words[0].textUthmani).toBe('ٱللَّهُ');
    expect(ayatKursi.words[1].textUthmani).toBe('لَآ');
    expect(ayatKursi.words[2].textUthmani).toBe('إِلَـٰهَ');
    expect(ayatKursi.words.length).toBeGreaterThan(40);

    // 4. Surah Ya-Sin (36:1-12)
    const yasin = await defaultQuranProvider.getSurah(36);
    expect(yasin.ayahs[0].page).toBe(440);
    expect(yasin.ayahs[0].words[0].textUthmani).toBe('يسٓ');
    expect(yasin.ayahs[1].words[0].textUthmani).toBe('وَٱلْقُرْءَانِ');

    // 5. Al-Ikhlas (112: 4 Ayahs, 15 Words)
    const ikhlas = await defaultQuranProvider.getSurah(112);
    expect(ikhlas.ayahs.length).toBe(4);
    expect(ikhlas.ayahs[0].words[0].textUthmani).toBe('قُلْ');
    expect(ikhlas.ayahs[0].words[1].textUthmani).toBe('هُوَ');
    expect(ikhlas.ayahs[0].words[2].textUthmani).toBe('ٱللَّهُ');
    expect(ikhlas.ayahs[0].words[3].textUthmani).toBe('أَحَدٌ');

    // 6. Al-Falaq (113: 5 Ayahs, 23 Words)
    const falaq = await defaultQuranProvider.getSurah(113);
    expect(falaq.ayahs.length).toBe(5);
    expect(falaq.ayahs[0].words[0].textUthmani).toBe('قُلْ');
    expect(falaq.ayahs[0].words[1].textUthmani).toBe('أَعُوذُ');

    // 7. An-Nas (114: 6 Ayahs, 20 Words)
    const nas = await defaultQuranProvider.getSurah(114);
    expect(nas.ayahs.length).toBe(6);
    expect(nas.ayahs[0].words[0].textUthmani).toBe('قُلْ');
    expect(nas.ayahs[0].words[1].textUthmani).toBe('أَعُوذُ');
  });
});
