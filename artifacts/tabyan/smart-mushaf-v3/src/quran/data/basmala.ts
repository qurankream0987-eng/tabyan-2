/**
 * @license
 * Tabyan Smart Mushaf — presentation-only Basmala rows
 * The Basmala before a surah is not a recitable WordKey (except Al-Fatihah,
 * where it is ayah 1). Its row shows the exact Tanzil source spelling.
 */

import type { Surah } from '../domain/types';
import { getCanonicalBasmalaText } from './surahTextData';

/**
 * Taken from the Tanzil source (Al-Baqarah's separated Basmala), never typed:
 * hand-typed Arabic is easily re-normalized (e.g. shadda/fatha reordered),
 * which would silently change the canonical byte sequence.
 */
export const DEFAULT_BASMALA_TEXT: string = getCanonicalBasmalaText(2) as string;

export function shouldShowBasmalaHeader(surah: Pick<Surah, 'number' | 'hasBismillah'>): boolean {
  return surah.hasBismillah && surah.number !== 1 && surah.number !== 9;
}

export function getBasmalaHeaderText(surah: Pick<Surah, 'bismillahText'>): string {
  return surah.bismillahText ?? DEFAULT_BASMALA_TEXT;
}

/** Source-spelled Basmala for a surah's header row. */
export function basmalaRowText(surahNumber: number): string {
  return getCanonicalBasmalaText(surahNumber) ?? DEFAULT_BASMALA_TEXT;
}
