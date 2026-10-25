/**
 * @license
 * Tabyan Smart Mushaf — word → Madani page index
 * The first canonical word of each of the 604 QCF pages, so the page of any
 * WordKey is a binary search over 604 ordinals — no page data needs to load.
 */

import { WordKey } from '../domain/types';
import { CanonicalWordIndex, getCanonicalWordIndex } from '../canonical/CanonicalWordIndex';
import { PAGE_FIRST_WORD } from './pageFirstWord.generated';

export { TOTAL_MUSHAF_PAGES } from './pageFirstWordBuilder';

let pageStartOrdinals: Int32Array | null = null;

function startOrdinals(index: CanonicalWordIndex): Int32Array {
  if (pageStartOrdinals) return pageStartOrdinals;
  const ordinals = new Int32Array(PAGE_FIRST_WORD.length);
  PAGE_FIRST_WORD.forEach(([surah, ayah, wordIndex], i) => {
    const ordinal = index.ordinalOf({ surah, ayah, wordIndex });
    if (ordinal < 0 || (i > 0 && ordinal <= ordinals[i - 1])) {
      throw new Error(`Page index entry ${i + 1} is not a monotonic canonical word.`);
    }
    ordinals[i] = ordinal;
  });
  pageStartOrdinals = ordinals;
  return ordinals;
}

/** Madani page (1..604) of a canonical word, or 0 when the key is invalid. */
export function pageOfWord(key: WordKey, index: CanonicalWordIndex = getCanonicalWordIndex()): number {
  const ordinal = index.ordinalOf(key);
  if (ordinal < 0) return 0;
  const starts = startOrdinals(index);
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= ordinal) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** First canonical word of a page (1..604). */
export function firstWordOfPage(page: number): WordKey | null {
  const entry = PAGE_FIRST_WORD[page - 1];
  return entry ? { surah: entry[0], ayah: entry[1], wordIndex: entry[2] } : null;
}
