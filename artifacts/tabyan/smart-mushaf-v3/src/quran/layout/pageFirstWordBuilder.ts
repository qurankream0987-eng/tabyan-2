/**
 * @license
 * Tabyan Smart Mushaf — derives each page's first canonical word from QCF data.
 * Depends only on the alignment so the generator script can run outside Vite.
 */

import { alignQcfWord, QcfWordTuple } from './qcfAlignment';

export const TOTAL_MUSHAF_PAGES = 604;

export interface QcfPageSource {
  readonly p: number;
  readonly v: readonly { readonly k: string; readonly w: readonly QcfWordTuple[] }[];
}

/** Derives [surah, ayah, wordIndex] of each page's first canonical word. */
export function buildPageFirstWords(pages: readonly QcfPageSource[]): [number, number, number][] {
  const sorted = [...pages].sort((a, b) => a.p - b.p);
  return sorted.map((page) => {
    for (const verse of page.v) {
      for (const [position, , type] of verse.w) {
        const glyph = alignQcfWord(verse.k, position, type);
        const first = glyph.wordKeys[0];
        if (first) return [first.surah, first.ayah, first.wordIndex];
      }
    }
    throw new Error(`QCF page ${page.p} has no recitable words.`);
  });
}
