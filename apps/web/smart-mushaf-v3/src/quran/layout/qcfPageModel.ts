/**
 * @license
 * Tabyan Smart Mushaf — QCF page model
 * Turns one QCF v2 page into its printed rows with every glyph-word bound to
 * canonical word ordinals. Pure: no DOM, no fetching.
 */

import type { CanonicalWordIndex } from '../canonical/CanonicalWordIndex';
import { SURAH_METADATA } from '../data/surahMetadata';
import { basmalaRowText } from '../data/basmala';
import { alignQcfWord, parseVerseKey, type QcfWordTuple } from './qcfAlignment';

export interface QcfPageData {
  readonly p: number;
  readonly j: number;
  readonly h: number | null;
  readonly v: readonly { readonly k: string; readonly n: number; readonly c: number; readonly w: readonly QcfWordTuple[] }[];
}

export interface QcfGlyph {
  readonly kind: 'word' | 'ayah-end';
  readonly code: string;
  readonly verseKey: string;
  /** Canonical ordinal(s); `second` is -1 unless this is a joined glyph-word. */
  readonly first: number;
  readonly second: number;
}

export type QcfRow =
  | { readonly kind: 'words'; readonly line: number; readonly glyphs: readonly QcfGlyph[]; readonly centered: boolean }
  | { readonly kind: 'surah-header'; readonly line: number; readonly surah: number; readonly name: string; readonly ayahCount: number }
  | { readonly kind: 'basmalah'; readonly line: number; readonly text: string };

export interface QcfPageModel {
  readonly page: number;
  readonly juz: number;
  readonly rows: readonly QcfRow[];
  readonly rowCount: number;
  readonly firstOrdinal: number;
  readonly lastOrdinal: number;
}

export function buildQcfPageModel(data: QcfPageData, index: CanonicalWordIndex): QcfPageModel {
  const lines = new Map<number, QcfGlyph[]>();
  const rows: QcfRow[] = [];
  let firstOrdinal = Number.POSITIVE_INFINITY;
  let lastOrdinal = -1;

  for (const verse of data.v) {
    const { surah } = parseVerseKey(verse.k);
    for (const [position, line, type, code] of verse.w) {
      const aligned = alignQcfWord(verse.k, position, type);
      const ordinals = aligned.wordKeys.map((key) => index.ordinalOf(key));
      if (ordinals.some((ordinal) => ordinal < 0)) {
        throw new Error(`QCF page ${data.p}: ${verse.k} position ${position} is not canonical`);
      }
      for (const ordinal of ordinals) {
        firstOrdinal = Math.min(firstOrdinal, ordinal);
        lastOrdinal = Math.max(lastOrdinal, ordinal);
      }
      const glyphs = lines.get(line) ?? [];
      glyphs.push({
        kind: aligned.kind === 'word' ? 'word' : 'ayah-end',
        code,
        verseKey: verse.k,
        first: ordinals[0] ?? -1,
        second: ordinals[1] ?? -1,
      });
      lines.set(line, glyphs);
    }
    if (verse.n === 1 && verse.w.length > 0) {
      const firstLine = verse.w[0][1];
      const noBasmalaRow = surah === 1 || surah === 9;
      const headerLine = firstLine - (noBasmalaRow ? 1 : 2);
      if (headerLine >= 1) {
        const meta = SURAH_METADATA[surah - 1];
        rows.push({ kind: 'surah-header', line: headerLine, surah, name: meta?.nameArabic ?? '', ayahCount: meta?.totalAyahs ?? 0 });
        if (!noBasmalaRow) rows.push({ kind: 'basmalah', line: headerLine + 1, text: basmalaRowText(surah) });
      }
    }
  }

  for (const [line, glyphs] of lines) {
    // The closing line of a surah is centred in the printed Mushaf.
    const centered = glyphs.some((glyph) => {
      if (glyph.kind !== 'ayah-end') return false;
      const { surah, ayah } = parseVerseKey(glyph.verseKey);
      return ayah === SURAH_METADATA[surah - 1]?.totalAyahs;
    });
    rows.push({ kind: 'words', line, glyphs, centered });
  }
  rows.sort((a, b) => a.line - b.line);

  return {
    page: data.p,
    juz: data.j,
    rows,
    rowCount: Math.max(1, ...rows.map((row) => row.line)),
    firstOrdinal: Number.isFinite(firstOrdinal) ? firstOrdinal : -1,
    lastOrdinal,
  };
}
