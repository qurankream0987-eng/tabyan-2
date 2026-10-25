/**
 * Canonical and QRC coordinate boundaries.
 *
 * The project-confirmed QRC wire convention is one-based. Smart Mushaf's
 * existing raw-provider contract is zero-based, so the browser adapter crosses
 * that boundary here before the normalizer creates canonical WordKeys.
 */
export interface CanonicalWordPosition {
  readonly surah: number;
  readonly ayah: number;
  readonly wordIndex: number;
}

export interface NabrQrcIndices {
  readonly chapter_index: number;
  readonly verse_index: number;
  readonly word_index: number;
}

/** QRC wire positions use the same one-based numeric coordinates as WordKeys. */
export function canonicalWordKeyToNabrIndices(
  key: CanonicalWordPosition,
): NabrQrcIndices {
  return Object.freeze({
    chapter_index: key.surah,
    verse_index: key.ayah,
    word_index: key.wordIndex,
  });
}

/** Convert a one-based QRC wire position to the canonical Quran coordinate. */
export function nabrIndicesToCanonicalWordKey(
  indices: NabrQrcIndices,
): CanonicalWordPosition {
  return Object.freeze({
    surah: indices.chapter_index,
    ayah: indices.verse_index,
    wordIndex: indices.word_index,
  });
}

/** Adapt a one-based QRC wire coordinate to Smart Mushaf's legacy 0-based raw contract. */
export function nabrWireIndicesToProviderObservation(
  indices: NabrQrcIndices,
): NabrQrcIndices {
  return Object.freeze({
    chapter_index: indices.chapter_index - 1,
    verse_index: indices.verse_index - 1,
    word_index: indices.word_index - 1,
  });
}

/** Normalize Smart Mushaf's 0-based raw-provider coordinate into a canonical WordKey. */
export function nabrProviderIndicesToCanonicalWordKey(
  indices: NabrQrcIndices,
): CanonicalWordPosition {
  return Object.freeze({
    surah: indices.chapter_index + 1,
    ayah: indices.verse_index + 1,
    wordIndex: indices.word_index + 1,
  });
}

/** QRC word lists carry one-based word numbers; the app's raw contract is zero-based. */
export function nabrWireWordIndicesToProviderObservation(
  indices: readonly number[] | undefined,
): readonly number[] {
  return Object.freeze((indices ?? []).map((index) => index - 1));
}

/** Smart Mushaf raw word-list indices are zero-based; expose canonical 1-based values. */
export function nabrWordIndicesToCanonical(
  indices: readonly number[] | undefined,
): readonly number[] {
  return Object.freeze((indices ?? []).map((index) => index + 1));
}

/** Convert canonical 1-based word-list indices to Smart Mushaf's raw 0-based contract. */
export function canonicalWordIndicesToNabr(indices: readonly number[]): readonly number[] {
  return Object.freeze(indices.map((index) => index - 1));
}
