/**
 * @license
 * Tabyan Smart Mushaf — Canonical WordKey & Domain Tests
 */

import { describe, it, expect } from 'vitest';
import { WordKey, areWordKeysEqual, compareWordKeys, serializeWordKey, parseWordKey } from '../quran/domain/types';
import { validateWordKeyBounds, normalizeArabicSimple, QuranIntegrityError } from '../quran/domain/validation';
import { defaultQuranProvider } from '../quran/providers/TanzilQuranProvider';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { nabrProviderIndicesToCanonicalWordKey } from '@workspace/tabyan-domain';

describe('Canonical Quran Model & WordKey Invariance', () => {
  // Test 1: Canonical WordKey equality
  it('1. verifies canonical WordKey equality and comparison', () => {
    const keyA: WordKey = { surah: 1, ayah: 1, wordIndex: 1 };
    const keyB: WordKey = { surah: 1, ayah: 1, wordIndex: 1 };
    const keyC: WordKey = { surah: 1, ayah: 1, wordIndex: 2 };

    expect(areWordKeysEqual(keyA, keyB)).toBe(true);
    expect(areWordKeysEqual(keyA, keyC)).toBe(false);
    expect(compareWordKeys(keyA, keyC)).toBeLessThan(0);
    expect(compareWordKeys(keyC, keyA)).toBeGreaterThan(0);

    const serialized = serializeWordKey(keyA);
    expect(serialized).toBe('1:1:1');
    const parsed = parseWordKey(serialized);
    expect(areWordKeysEqual(keyA, parsed)).toBe(true);
  });

  // Test 2: Quran text immutability
  it('2. confirms sacred Quran domain text and objects are immutable', async () => {
    const fatihah = await defaultQuranProvider.getSurah(1);
    expect(Object.isFrozen(fatihah)).toBe(true);
    expect(Object.isFrozen(fatihah.ayahs)).toBe(true);
    expect(Object.isFrozen(fatihah.ayahs[0].words)).toBe(true);

    // Assert attempting to modify throws or fails
    expect(() => {
      (fatihah as any).nameArabic = 'تغيير غير جائز';
    }).toThrow();
  });

  // Test 3: Valid provider position mapping
  it('3. maps valid provider coordinates to a canonical word without searching text', async () => {
    const key = nabrProviderIndicesToCanonicalWordKey({ chapter_index: 0, verse_index: 0, word_index: 0 });
    expect(key).toEqual({ surah: 1, ayah: 1, wordIndex: 1 });
    expect(getCanonicalWordIndex().isValid(key)).toBe(true);
    const word = await defaultQuranProvider.resolveWord(key);
    expect(word?.textUthmani).toBe('بِسْمِ');
  });

  // Test 4: Invalid provider position rejection
  it('4. rejects invalid / out-of-bounds provider positions safely', () => {
    const index = getCanonicalWordIndex();
    expect(index.isValid({ surah: 200, ayah: 1, wordIndex: 1 })).toBe(false);
    expect(index.isValid({ surah: 1, ayah: 99, wordIndex: 1 })).toBe(false);
    expect(index.isValid({ surah: 1, ayah: 1, wordIndex: 50 })).toBe(false);
    expect(index.isValid({ surah: 0, ayah: 0, wordIndex: 0 })).toBe(false);
  });

  // Test 5: 0/1-based conversion
  it('5. validates strict 0-based to 1-based index conversion at boundaries', () => {
    const key = nabrProviderIndicesToCanonicalWordKey({ chapter_index: 1, verse_index: 254, word_index: 0 });
    expect(key).toEqual({ surah: 2, ayah: 255, wordIndex: 1 });
    expect(getCanonicalWordIndex().isValid(key)).toBe(true);
  });
});
