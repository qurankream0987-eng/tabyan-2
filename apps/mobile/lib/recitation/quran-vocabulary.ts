import { quranVocabulary, type SearchRow } from "@workspace/tabyan-domain/quran-search";
import { normalizeQuranText } from "./quran-normalizer";

/**
 * The words of the whole Quran, from the search index once it is loaded: a word heard close to
 * the expected one that is itself another Quran word is a wrong word, not a mishearing.
 */
let vocabulary: Set<string> | null = null;

export function setQuranVocabulary(rows: readonly SearchRow[]) {
  vocabulary = quranVocabulary(rows);
}

export function isQuranVocabularyWord(token: string) {
  if (!vocabulary) return false;
  // Heard tokens reach the matcher normalized; the index is normalized the same way.
  return vocabulary.has(token) || vocabulary.has(normalizeQuranText(token));
}
