/**
 * Gate A — canonical Quran integrity across the WordKey corpus (Tanzil) and the
 * page-geometry corpus (QCF v1). Every one of the 77,433 WordKeys must be
 * presented by exactly one QCF glyph-word, in order, on the expected page.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultQuranProvider } from '../quran/providers/TanzilQuranProvider';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { serializeWordKey } from '../quran/domain/types';
import {
  alignQcfWord,
  alignmentReport,
  QCF_ALIGNMENT_EXCEPTIONS,
} from '../quran/layout/qcfAlignment';
import { buildPageFirstWords, QcfPageSource } from '../quran/layout/pageFirstWordBuilder';
import { PAGE_FIRST_WORD } from '../quran/layout/pageFirstWord.generated';
import { firstWordOfPage, pageOfWord } from '../quran/layout/pageWordIndex';

const PAGES_DIR = join(import.meta.dirname, '../../../public/mushaf/v1/pages');
const pages: QcfPageSource[] = Array.from({ length: 604 }, (_, i) =>
  JSON.parse(readFileSync(join(PAGES_DIR, `${i + 1}.json`), 'utf8')),
);

describe('Canonical word index', () => {
  const index = getCanonicalWordIndex();

  it('holds exactly 6236 ayahs and 77433 recitable words', () => {
    expect(index.totalAyahs).toBe(6236);
    expect(index.totalWords).toBe(77433);
  });

  it('round-trips every provider WordKey to a unique, contiguous ordinal', async () => {
    const seen = new Set<string>();
    let expectedOrdinal = 0;
    for (let surah = 1; surah <= 114; surah += 1) {
      const loaded = await defaultQuranProvider.getSurah(surah);
      for (const ayah of loaded.ayahs) {
        for (const word of ayah.words) {
          const keyString = serializeWordKey(word.key);
          expect(seen.has(keyString)).toBe(false);
          seen.add(keyString);
          expect(index.ordinalOf(word.key)).toBe(expectedOrdinal);
          expect(index.keyAt(expectedOrdinal)).toEqual(word.key);
          expectedOrdinal += 1;
        }
      }
    }
    expect(seen.size).toBe(77433);
  });

  it('crosses ayah and surah boundaries without inventing words', () => {
    expect(index.next({ surah: 1, ayah: 1, wordIndex: 4 })).toEqual({ surah: 1, ayah: 2, wordIndex: 1 });
    expect(index.next({ surah: 1, ayah: 7, wordIndex: 9 })).toEqual({ surah: 2, ayah: 1, wordIndex: 1 });
    expect(index.previous({ surah: 2, ayah: 1, wordIndex: 1 })).toEqual({ surah: 1, ayah: 7, wordIndex: 9 });
    expect(index.next({ surah: 114, ayah: 6, wordIndex: 3 })).toBeNull();
    expect(index.previous({ surah: 1, ayah: 1, wordIndex: 1 })).toBeNull();
    expect(index.ordinalOf({ surah: 1, ayah: 1, wordIndex: 5 })).toBe(-1);
    expect(index.ordinalOf({ surah: 115, ayah: 1, wordIndex: 1 })).toBe(-1);
    // 2:1 is the single word «الٓمٓ», so 2:1:2 is not a word and the next one is 2:2:1.
    expect(index.ordinalOf({ surah: 2, ayah: 1, wordIndex: 2 })).toBe(-1);
    expect(index.distance({ surah: 1, ayah: 7, wordIndex: 9 }, { surah: 2, ayah: 2, wordIndex: 1 })).toBe(2);
  });
});

describe('QCF v2 ↔ canonical WordKey alignment', () => {
  const index = getCanonicalWordIndex();
  const verses = pages.flatMap((page) => page.v);

  it('binds all 77433 WordKeys with only the four documented joined glyph-words', () => {
    const report = alignmentReport(verses, index.ayahWordCount);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.boundWordKeys).toBe(77433);
    expect(report.joinedGlyphWords).toBe(4);
    expect(Object.keys(QCF_ALIGNMENT_EXCEPTIONS).sort()).toEqual(['13:37', '2:181', '37:130', '8:6']);
  });

  it('maps 2:181 by explicit alignment, not by its coincidentally equal word count', () => {
    expect(alignQcfWord('2:181', 2, 0).wordKeyStrings).toEqual(['2:181:2']);
    expect(alignQcfWord('2:181', 3, 0).wordKeyStrings).toEqual(['2:181:3', '2:181:4']);
    expect(alignQcfWord('2:181', 4, 0).wordKeyStrings).toEqual(['2:181:5']);
    expect(alignQcfWord('2:181', 13, 0).wordKeyStrings).toEqual(['2:181:14']);
    expect(alignQcfWord('2:181', 14, 0).kind).toBe('ayah-end');
  });

  it('fails closed when an unlisted ayah disagrees with the canonical count', () => {
    const corrupted = verses.map((verse) =>
      verse.k === '1:2' ? { ...verse, w: verse.w.filter(([position]) => position !== 2) } : verse,
    );
    const report = alignmentReport(corrupted, index.ayahWordCount);
    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.startsWith('1:2:'))).toBe(true);
  });
});

describe('Word → page index', () => {
  const index = getCanonicalWordIndex();

  it('matches the generated table to the QCF page data', () => {
    expect(buildPageFirstWords(pages)).toEqual(PAGE_FIRST_WORD.map((row) => [...row]));
  });

  it('places every canonical word on the page where QCF draws it', () => {
    let checked = 0;
    for (const page of pages) {
      for (const verse of page.v) {
        for (const [position, , type] of verse.w) {
          for (const key of alignQcfWord(verse.k, position, type).wordKeys) {
            expect(pageOfWord(key, index)).toBe(page.p);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(77433);
  });

  it('keeps the golden page anchors', () => {
    expect(firstWordOfPage(1)).toEqual({ surah: 1, ayah: 1, wordIndex: 1 });
    expect(firstWordOfPage(2)).toEqual({ surah: 2, ayah: 1, wordIndex: 1 });
    expect(firstWordOfPage(187)).toEqual({ surah: 9, ayah: 1, wordIndex: 1 });
    expect(pageOfWord({ surah: 114, ayah: 6, wordIndex: 3 })).toBe(604);
    expect(pageOfWord({ surah: 1, ayah: 1, wordIndex: 9 })).toBe(0);
  });
});
