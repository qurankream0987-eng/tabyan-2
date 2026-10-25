/**
 * @license
 * Tabyan Smart Mushaf — QCF v2 ↔ canonical WordKey alignment
 *
 * Page geometry comes from the King Fahd Complex QCF v2 / QDC page data;
 * word identity comes from the Tanzil corpus (77,433 WordKeys). The two agree
 * on every ayah except four where QDC writes two Tanzil words as one glyph-word.
 * Neither dataset is modified: a joined glyph-word is bound to BOTH WordKeys
 * and presents the strongest state of either.
 *
 * Positions are 1-based per ayah and continue across page breaks, so the
 * mapping is a pure function of (verseKey, position, type). Anything not
 * described here must align one-to-one; `alignmentReport` fails closed.
 */

import { WordKey, WordKeyString, serializeWordKey } from '../domain/types';

export type QcfWordType = 0 | 1 | 2;
/** [position, line, type, glyph code] — the compact page-data tuple. */
export type QcfWordTuple = readonly [position: number, line: number, type: QcfWordType, code: string];

interface JoinedGlyphWord {
  /** QCF position of the joined glyph-word. */
  readonly qcfPosition: number;
  /** Tanzil word indices it carries, in order. */
  readonly tanzilWordIndices: readonly number[];
}

interface VerseAlignmentException {
  readonly joined: readonly JoinedGlyphWord[];
  /** QDC quirk: the ayah-end marker at this position is tagged type 0. */
  readonly endMarkerTaggedAsWord?: number;
}

/** The complete list of QDC/Tanzil segmentation differences (verified 2026-10-21). */
export const QCF_ALIGNMENT_EXCEPTIONS: Readonly<Record<string, VerseAlignmentException>> = Object.freeze({
  // «بَعْدَ مَا» → «بعدما»
  '2:181': { joined: [{ qcfPosition: 3, tanzilWordIndices: [3, 4] }], endMarkerTaggedAsWord: 14 },
  '8:6': { joined: [{ qcfPosition: 4, tanzilWordIndices: [4, 5] }] },
  '13:37': { joined: [{ qcfPosition: 8, tanzilWordIndices: [8, 9] }] },
  // «إِلْ يَاسِينَ» → «إلياسين»
  '37:130': { joined: [{ qcfPosition: 3, tanzilWordIndices: [3, 4] }] },
});

export type AlignedGlyphKind = 'word' | 'ayah-end' | 'mark';

export interface AlignedGlyph {
  readonly kind: AlignedGlyphKind;
  /** Canonical WordKeys this glyph-word presents; empty for markers. */
  readonly wordKeys: readonly WordKey[];
  readonly wordKeyStrings: readonly WordKeyString[];
}

const MARKER_END: AlignedGlyph = Object.freeze({ kind: 'ayah-end', wordKeys: [], wordKeyStrings: [] });
const MARKER_OTHER: AlignedGlyph = Object.freeze({ kind: 'mark', wordKeys: [], wordKeyStrings: [] });

function wordGlyph(surah: number, ayah: number, wordIndices: readonly number[]): AlignedGlyph {
  const wordKeys = wordIndices.map((wordIndex) => Object.freeze({ surah, ayah, wordIndex }));
  return Object.freeze({
    kind: 'word',
    wordKeys: Object.freeze(wordKeys),
    wordKeyStrings: Object.freeze(wordKeys.map(serializeWordKey)),
  });
}

export function parseVerseKey(verseKey: string): { surah: number; ayah: number } {
  const [surah, ayah] = verseKey.split(':').map(Number);
  return { surah, ayah };
}

/** Binds one QCF page-data word to its canonical WordKeys. */
export function alignQcfWord(verseKey: string, position: number, type: QcfWordType): AlignedGlyph {
  const { surah, ayah } = parseVerseKey(verseKey);
  const exception = QCF_ALIGNMENT_EXCEPTIONS[verseKey];
  if (type === 1) return MARKER_END;
  if (type === 2) return MARKER_OTHER;
  if (!exception) return wordGlyph(surah, ayah, [position]);
  if (exception.endMarkerTaggedAsWord === position) return MARKER_END;

  let shift = 0;
  for (const joined of exception.joined) {
    if (joined.qcfPosition === position) return wordGlyph(surah, ayah, joined.tanzilWordIndices);
    if (joined.qcfPosition < position) shift += joined.tanzilWordIndices.length - 1;
  }
  return wordGlyph(surah, ayah, [position + shift]);
}

export interface AlignmentReport {
  readonly ok: boolean;
  readonly boundWordKeys: number;
  readonly joinedGlyphWords: number;
  readonly errors: readonly string[];
}

/**
 * Verifies a full set of QCF verses against canonical ayah word counts:
 * every canonical WordKey is presented by exactly one glyph-word, in order.
 */
export function alignmentReport(
  verses: Iterable<{ readonly k: string; readonly w: readonly QcfWordTuple[] }>,
  ayahWordCount: (surah: number, ayah: number) => number,
): AlignmentReport {
  const errors: string[] = [];
  const presented = new Map<string, number[]>();
  let joinedGlyphWords = 0;
  for (const verse of verses) {
    const list = presented.get(verse.k) ?? [];
    for (const [position, , type] of verse.w) {
      const glyph = alignQcfWord(verse.k, position, type);
      if (glyph.wordKeys.length > 1) joinedGlyphWords += 1;
      for (const key of glyph.wordKeys) list.push(key.wordIndex);
    }
    presented.set(verse.k, list);
  }
  let bound = 0;
  for (const [verseKey, indices] of presented) {
    const { surah, ayah } = parseVerseKey(verseKey);
    const expected = ayahWordCount(surah, ayah);
    const inOrder = indices.every((wordIndex, i) => wordIndex === i + 1);
    if (expected === 0) errors.push(`${verseKey}: not a canonical ayah`);
    else if (indices.length !== expected || !inOrder) {
      errors.push(`${verseKey}: QCF presents [${indices.join(',')}], canonical has ${expected} words`);
    } else bound += expected;
  }
  for (const verseKey of Object.keys(QCF_ALIGNMENT_EXCEPTIONS)) {
    if (!presented.has(verseKey)) errors.push(`${verseKey}: alignment exception has no QCF data`);
  }
  return { ok: errors.length === 0, boundWordKeys: bound, joinedGlyphWords, errors };
}
