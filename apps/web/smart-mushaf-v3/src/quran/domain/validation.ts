/**
 * @license
 * Tabyan Smart Mushaf — Canonical Quran Validation & Integrity
 */

import { WordKey, Surah } from './types';

export class QuranIntegrityError extends Error {
  constructor(message: string) {
    super(`[QuranIntegrityError] ${message}`);
    this.name = 'QuranIntegrityError';
  }
}

/**
 * Validates whether a WordKey adheres to fundamental domain invariants.
 */
export function validateWordKeyBounds(key: WordKey, totalAyahsInSurah?: number, totalWordsInAyah?: number): void {
  if (!Number.isInteger(key.surah) || key.surah < 1 || key.surah > 114) {
    throw new QuranIntegrityError(`Surah index ${key.surah} is out of canonical bounds [1..114].`);
  }
  if (!Number.isInteger(key.ayah) || key.ayah < 1) {
    throw new QuranIntegrityError(`Ayah index ${key.ayah} must be a positive integer.`);
  }
  if (totalAyahsInSurah !== undefined && key.ayah > totalAyahsInSurah) {
    throw new QuranIntegrityError(
      `Ayah ${key.ayah} exceeds total ayahs (${totalAyahsInSurah}) for Surah ${key.surah}.`
    );
  }
  if (!Number.isInteger(key.wordIndex) || key.wordIndex < 1) {
    throw new QuranIntegrityError(`Word index ${key.wordIndex} must be a 1-based positive integer.`);
  }
  if (totalWordsInAyah !== undefined && key.wordIndex > totalWordsInAyah) {
    throw new QuranIntegrityError(
      `Word index ${key.wordIndex} exceeds total words (${totalWordsInAyah}) for Surah ${key.surah}:${key.ayah}.`
    );
  }
}

/**
 * Strips Arabic diacritics (harakat, sukun, shaddah, tanween, dagger alif, Quranic stop marks)
 * for phonetic comparison, search, and phonetic alignment.
 */
export function normalizeArabicSimple(text: string): string {
  return text
    // Remove Quranic annotation signs (U+06D6 to U+06ED)
    .replace(/[\u06D6-\u06ED]/g, '')
    // Remove standard Arabic diacritics / tashkeel (fatha, damma, kasra, sukun, shadda, tanween)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alefs (أ, إ, آ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Ya / Alef Maksura (ى -> ي)
    .replace(/ى/g, 'ي')
    // Remove Tatweel / Kashida
    .replace(/\u0640/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Validates that an array of Surahs contains exactly 114 elements with sequential indices.
 */
export function validateSurahCollectionIntegrity(surahs: readonly Surah[]): void {
  if (surahs.length !== 114) {
    throw new QuranIntegrityError(`Expected exactly 114 Surahs, but received ${surahs.length}.`);
  }
  for (let i = 0; i < 114; i++) {
    const expectedNum = i + 1;
    if (surahs[i].number !== expectedNum) {
      throw new QuranIntegrityError(
        `Surah at index ${i} has number ${surahs[i].number}, expected ${expectedNum}.`
      );
    }
  }
}
