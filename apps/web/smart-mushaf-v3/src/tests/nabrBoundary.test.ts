/**
 * @license
 * Tabyan Smart Mushaf — Nabr Boundary & Indexing Integrity Tests
 */

import { describe, it, expect } from 'vitest';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { PositionTracker } from '../live/position/PositionTracker';
import { translateNabrObservation } from '../live/providers/NabrLiveAdapter';
import { nabrWordIndicesToCanonical } from '../providers/nabr/nabrIndexConversion';
import type { LiveRecitationEvent } from '../live/contracts/events';
import {
  canonicalWordKeyToNabrIndices,
  nabrIndicesToCanonicalWordKey,
  nabrProviderIndicesToCanonicalWordKey,
  nabrWireIndicesToProviderObservation,
} from '@workspace/tabyan-domain';

describe('Nabr Provider Index Boundary & Security Verification', () => {
  it('strictly converts the internal 0-based provider contract to canonical coordinates', () => {
    // Raw Nabr observation: Surah 114 (index 113), Ayah 6 (index 5), Word 3 (index 2)
    const key = nabrProviderIndicesToCanonicalWordKey({ chapter_index: 113, verse_index: 5, word_index: 2 });
    expect(key).toEqual({ surah: 114, ayah: 6, wordIndex: 3 });
    expect(nabrWordIndicesToCanonical([0, 2])).toEqual([1, 3]);
    expect(nabrWordIndicesToCanonical([1])).toEqual([2]);
  });

  it('keeps QRC wire coordinates 1-based and adapts to the internal 0-based contract once', () => {
    const canonical = { surah: 114, ayah: 6, wordIndex: 3 };
    const qrcWire = canonicalWordKeyToNabrIndices(canonical);
    expect(qrcWire).toEqual({
      chapter_index: 114,
      verse_index: 6,
      word_index: 3,
    });
    expect(nabrIndicesToCanonicalWordKey(qrcWire)).toEqual(canonical);
    const providerContract = nabrWireIndicesToProviderObservation(qrcWire);
    expect(providerContract).toEqual({
      chapter_index: 113,
      verse_index: 5,
      word_index: 2,
    });
    expect(nabrProviderIndicesToCanonicalWordKey(providerContract)).toEqual(canonical);
  });

  it('rejects invalid Surah, Ayah, and Word indices without crashing', () => {
    const index = getCanonicalWordIndex();
    const wire = (chapter_index: number, verse_index: number, word_index: number) => ({
      currentPosition: { chapter_index, verse_index, word_index },
      correctWords: [],
      skippedWords: [],
      letterMistakes: [],
      tajweedMistakes: [],
      observedAt: 0,
    });
    // Negative, beyond 114 surahs, beyond Al-Ikhlas's 4 ayahs, beyond 112:1's 4 words.
    for (const observation of [wire(-1, -1, -1), wire(115, 1, 1), wire(112, 5, 1), wire(112, 1, 5)]) {
      expect(translateNabrObservation(observation, 'confirm-correct-words', 'tanzil', index)).toEqual([]);
    }
    expect(translateNabrObservation(wire(112, 1, 4), 'candidate-only', 'tanzil', index)).toHaveLength(1);
  });

  it('proves backward observations and duplicate results do not duplicate progress', () => {
    const index = getCanonicalWordIndex();
    const tracker = new PositionTracker(index);
    tracker.begin('boundary-test', { surah: 1, ayah: 1, wordIndex: 1 }, { from: { surah: 1, ayah: 1, wordIndex: 1 }, to: { surah: 1, ayah: 7, wordIndex: 9 } }, 'anchor');
    let seq = 0;
    const confirm = (wordIndex: number): LiveRecitationEvent => ({
      type: 'position.confirmed',
      sessionId: 'boundary-test',
      seq: ++seq,
      eventTimestamp: 0,
      wordKey: `1:1:${wordIndex}`,
      surah: 1,
      ayah: 1,
      wordIndex,
      confidence: 0.98,
      audioTimestamp: null,
      status: 'confirmed',
    });
    expect(tracker.process(confirm(1)).recited).toHaveLength(1);
    // QRC repeats the same coordinate many times (see TABYAN_NABR_QRC_EVENT_SEMANTICS.md).
    for (let i = 0; i < 5; i += 1) expect(tracker.process(confirm(1)).recited).toHaveLength(0);
    expect(tracker.process(confirm(2)).recited).toHaveLength(1);
    const back = tracker.process(confirm(1));
    expect(back.recited).toHaveLength(0);
    expect(back.skipped).toHaveLength(0);
    expect(tracker.snapshot().recitedCount).toBe(2);
  });
});
