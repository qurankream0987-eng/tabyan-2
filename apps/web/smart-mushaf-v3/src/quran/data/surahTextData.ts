/**
 * @license
 * Tabyan Smart Mushaf — Canonical Quran Text Corpus (Tanzil Uthmani, Hafs)
 * Every Quran word has an immutable WordKey { surah, ayah, wordIndex (1-based) }.
 *
 * The bundled Tanzil source text is preserved verbatim in tanzil-uthmani.txt.
 * Its required copyright and license notice is in docs/TANZIL_LICENSE.txt.
 */

import { QuranWord, Ayah, WordKey } from '../domain/types';
import { normalizeArabicSimple } from '../domain/validation';
import { SURAH_METADATA } from './surahMetadata';
import { getJuzForAyah } from './pages';
import tanzilUthmaniText from './tanzil-uthmani.txt?raw';

interface RawAyahInput {
  ayahNumber: number;
  textUthmani: string;
  page?: number;
}

const EXPECTED_SURAH_COUNT = 114;
const EXPECTED_AYAH_COUNT = 6236;
const STANDARD_BASMALA_PREFIX = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const VARIANT_BASMALA_PREFIX = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const BASMALA_PREFIXES = [STANDARD_BASMALA_PREFIX, VARIANT_BASMALA_PREFIX] as const;
const VARIANT_BASMALA_SURAHS = new Set([95, 97]);
const EXPECTED_EMBEDDED_BASMALA_COUNT = 112;

interface ParsedTanzilCorpus {
  readonly surahs: Record<number, RawAyahInput[]>;
  readonly separateBasmalaText: Readonly<Record<number, string>>;
}

// Preserve the source bundle's existing page hints for its preloaded passages.
// These do not claim complete or authentic printed-page layout coverage.
const EXISTING_PAGE_HINTS: Readonly<Record<string, number>> = Object.freeze({
  '1:1': 1, '1:2': 1, '1:3': 1, '1:4': 1, '1:5': 1, '1:6': 1, '1:7': 1,
  '2:1': 2, '2:2': 2, '2:3': 2, '2:4': 2, '2:5': 2,
  '2:6': 3, '2:7': 3, '2:8': 3, '2:9': 3, '2:10': 3, '2:255': 42,
  '36:1': 440, '36:2': 440, '36:3': 440, '36:4': 440, '36:5': 440, '36:6': 440,
  '36:7': 440, '36:8': 440, '36:9': 440, '36:10': 440, '36:11': 440, '36:12': 440,
  '67:1': 562, '67:2': 562, '67:3': 562, '67:4': 562, '67:5': 562,
  '112:1': 604, '112:2': 604, '112:3': 604, '112:4': 604,
  '113:1': 604, '113:2': 604, '113:3': 604, '113:4': 604, '113:5': 604,
  '114:1': 604, '114:2': 604, '114:3': 604, '114:4': 604, '114:5': 604, '114:6': 604,
});

/**
 * Parses the official pipe-delimited Tanzil text. The bundled source file stays
 * verbatim; when a row prefixes a separate Basmala before ayah 1, move only
 * that exact prefix out of the ayah payload because the reader renders it in
 * its dedicated surah header.
 */
function parseTanzilCorpus(sourceText: string): ParsedTanzilCorpus {
  const surahs: Record<number, RawAyahInput[]> = Object.create(null);
  const separateBasmalaText: Record<number, string> = Object.create(null);
  let ayahCount = 0;
  let embeddedBasmalaCount = 0;
  let variantBasmalaCount = 0;

  for (const [index, line] of sourceText.split(/\r?\n/).entries()) {
    if (!line || line.startsWith('#')) continue;

    const firstSeparator = line.indexOf('|');
    const secondSeparator = line.indexOf('|', firstSeparator + 1);
    if (firstSeparator < 1 || secondSeparator <= firstSeparator + 1) {
      throw new Error(`Malformed Tanzil Uthmani row at line ${index + 1}.`);
    }

    const surahNumberText = line.slice(0, firstSeparator);
    const ayahNumberText = line.slice(firstSeparator + 1, secondSeparator);
    if (!/^\d+$/.test(surahNumberText) || !/^\d+$/.test(ayahNumberText)) {
      throw new Error(`Invalid Tanzil surah/ayah number at line ${index + 1}.`);
    }

    const surahNumber = Number(surahNumberText);
    const ayahNumber = Number(ayahNumberText);
    const sourceTextUthmani = line.slice(secondSeparator + 1);
    if (
      surahNumber < 1 ||
      surahNumber > EXPECTED_SURAH_COUNT ||
      ayahNumber < 1 ||
      sourceTextUthmani.length === 0 ||
      sourceTextUthmani.trim().length === 0
    ) {
      throw new Error(`Invalid Tanzil ayah content at line ${index + 1}.`);
    }

    // Tanzil's text file stays byte-for-byte unchanged. In each surah other
    // than Al-Fatihah and At-Tawbah, ayah 1 begins with a separate Basmala.
    // Surahs 95 and 97 use a source spelling with shadda on the initial ba.
    const hasSeparateBasmalaRow =
      ayahNumber === 1 &&
      surahNumber !== 1 &&
      surahNumber !== 9;
    const basmalaPrefix = hasSeparateBasmalaRow
      ? BASMALA_PREFIXES.find((prefix) => sourceTextUthmani.startsWith(`${prefix} `))
      : undefined;

    if (hasSeparateBasmalaRow && !basmalaPrefix) {
      throw new Error(`Missing recognized Tanzil Basmala prefix for surah ${surahNumber}.`);
    }
    if (hasSeparateBasmalaRow && (basmalaPrefix === VARIANT_BASMALA_PREFIX) !== VARIANT_BASMALA_SURAHS.has(surahNumber)) {
      throw new Error(`Unexpected Tanzil Basmala spelling for surah ${surahNumber}.`);
    }
    if (basmalaPrefix) {
      embeddedBasmalaCount += 1;
      separateBasmalaText[surahNumber] = basmalaPrefix;
      if (basmalaPrefix === VARIANT_BASMALA_PREFIX) variantBasmalaCount += 1;
    }

    const textUthmani = basmalaPrefix
      ? sourceTextUthmani.slice(basmalaPrefix.length + 1)
      : sourceTextUthmani;

    const surahAyahs = surahs[surahNumber] ?? (surahs[surahNumber] = []);
    if (ayahNumber !== surahAyahs.length + 1) {
      throw new Error(`Non-sequential Tanzil ayah ${surahNumber}:${ayahNumber}.`);
    }

    // Preserve the ayah payload after separating any source-embedded Basmala.
    surahAyahs.push({
      ayahNumber,
      textUthmani,
      page: EXISTING_PAGE_HINTS[`${surahNumber}:${ayahNumber}`],
    });
    ayahCount += 1;
  }

  if (ayahCount !== EXPECTED_AYAH_COUNT || Object.keys(surahs).length !== EXPECTED_SURAH_COUNT) {
    throw new Error(
      `Incomplete Tanzil corpus: found ${Object.keys(surahs).length} surahs and ${ayahCount} ayahs.`,
    );
  }

  if (embeddedBasmalaCount !== EXPECTED_EMBEDDED_BASMALA_COUNT) {
    throw new Error(
      `Unexpected Tanzil Basmala structure: found ${embeddedBasmalaCount} embedded surah prefixes.`,
    );
  }
  if (variantBasmalaCount !== VARIANT_BASMALA_SURAHS.size) {
    throw new Error(`Unexpected count of variant Tanzil Basmala prefixes: ${variantBasmalaCount}.`);
  }

  for (const meta of SURAH_METADATA) {
    if (surahs[meta.number]?.length !== meta.totalAyahs) {
      throw new Error(
        `Tanzil ayah count mismatch for surah ${meta.number}; expected ${meta.totalAyahs}.`,
      );
    }
  }

  return {
    surahs,
    separateBasmalaText: Object.freeze(separateBasmalaText),
  };
}

const PARSED_TANZIL_CORPUS = parseTanzilCorpus(tanzilUthmaniText);
const RAW_CANONICAL_SURAHS = PARSED_TANZIL_CORPUS.surahs;

/** Returns exact source spelling for the presentation-only separate header. */
export function getCanonicalBasmalaText(surahNumber: number): string | undefined {
  return PARSED_TANZIL_CORPUS.separateBasmalaText[surahNumber];
}

/**
 * The single canonical tokenizer: every WordKey and every word count derives
 * from this function, so the two can never disagree.
 */
function tokenizeCanonicalAyah(textUthmani: string): string[] {
  // Split on whitespace while preserving sacred characters.
  const rawTokens = textUthmani.trim().split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const token of rawTokens) {
    // Attach standalone Quranic pause/annotation marks (U+06D6 to U+06ED).
    if (/^[\u06D6-\u06ED]+$/.test(token)) {
      if (tokens.length > 0) tokens[tokens.length - 1] += token;
    } else {
      tokens.push(token);
    }
  }
  return tokens;
}

let ayahWordCounts: readonly (readonly number[])[] | null = null;

/**
 * Recitable word count of every ayah, indexed [surah - 1][ayah - 1].
 * Built once from the same tokenizer as the WordKeys, without word objects.
 */
export function getCanonicalAyahWordCounts(): readonly (readonly number[])[] {
  if (ayahWordCounts) return ayahWordCounts;
  const counts: (readonly number[])[] = [];
  for (let surah = 1; surah <= EXPECTED_SURAH_COUNT; surah += 1) {
    counts.push(
      Object.freeze(
        RAW_CANONICAL_SURAHS[surah].map((ayah) => tokenizeCanonicalAyah(ayah.textUthmani).length),
      ),
    );
  }
  ayahWordCounts = Object.freeze(counts);
  return ayahWordCounts;
}

/**
 * Parses raw text into discrete QuranWord objects with strict 1-based indexing.
 */
function createWordsFromText(
  surahNumber: number,
  ayahNumber: number,
  textUthmani: string,
  page: number,
): readonly QuranWord[] {
  const tokens = tokenizeCanonicalAyah(textUthmani);

  const juz = getJuzForAyah(surahNumber, ayahNumber);
  const hizb = Math.min(60, Math.ceil(juz * 2));

  return Object.freeze(
    tokens.map((token, index): QuranWord => {
      const key: WordKey = Object.freeze({
        surah: surahNumber,
        ayah: ayahNumber,
        wordIndex: index + 1,
      });
      return Object.freeze({
        key,
        textUthmani: token,
        textSimple: normalizeArabicSimple(token),
        page,
        juz,
        hizb,
      });
    }),
  );
}

function buildAyah(surahNumber: number, ayahNumber: number, textUthmani: string, page: number): Ayah {
  const words = createWordsFromText(surahNumber, ayahNumber, textUthmani, page);
  const juz = getJuzForAyah(surahNumber, ayahNumber);
  const hizb = Math.min(60, Math.ceil(juz * 2));

  return Object.freeze({
    surahNumber,
    ayahNumber,
    textUthmani,
    textSimple: normalizeArabicSimple(textUthmani),
    words,
    page,
    juz,
    hizb,
  });
}

/**
 * Builds a Surah exclusively from the complete bundled Tanzil corpus.
 * Missing or incomplete source data fails closed instead of synthesizing text.
 */
export function getCanonicalSurah(surahNumber: number): Ayah[] {
  const meta = SURAH_METADATA.find((entry) => entry.number === surahNumber);
  if (!meta) {
    throw new Error(`Surah number ${surahNumber} does not exist in canonical registry.`);
  }

  const rawList = RAW_CANONICAL_SURAHS[surahNumber];
  if (!rawList || rawList.length !== meta.totalAyahs) {
    throw new Error(`Tanzil text is unavailable or incomplete for surah ${surahNumber}.`);
  }

  return rawList.map((ayah) =>
    buildAyah(surahNumber, ayah.ayahNumber, ayah.textUthmani, ayah.page ?? meta.startPage),
  );
}
