/**
 * Live recitation core — session machine, bounded position tracker, and the
 * per-word presentation store. Ports the semantics proven by the legacy
 * stabilizer suites (delayed skip, repetition without penalty, reveal is not
 * recitation, dedupe) onto the canonical event contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import type { WordKey } from '../quran/domain/types';
import { wordPositionFields, type LiveRecitationEvent } from '../live/contracts/events';
import { INITIAL_LIVE_SESSION, liveSessionReducer, type LiveSessionInput } from '../live/session/sessionMachine';
import { PositionTracker } from '../live/position/PositionTracker';
import {
  combineVisuals,
  decodeVisual,
  WordPresentationStore,
} from '../live/store/WordPresentationStore';

const index = getCanonicalWordIndex();
const key = (surah: number, ayah: number, wordIndex: number): WordKey => ({ surah, ayah, wordIndex });
const ord = (surah: number, ayah: number, wordIndex: number) => index.ordinalOf(key(surah, ayah, wordIndex));

let seq = 0;
function position(
  type: 'position.confirmed' | 'position.candidate' | 'word.confirmed',
  k: WordKey,
  options: { session?: string; seq?: number; confidence?: number } = {},
): LiveRecitationEvent {
  seq = options.seq ?? seq + 1;
  return {
    type,
    sessionId: options.session ?? 's1',
    seq,
    eventTimestamp: 0,
    ...wordPositionFields(k, type === 'position.candidate' ? 'candidate' : 'confirmed', options.confidence ?? 0.95),
  } as LiveRecitationEvent;
}

describe('live session state machine', () => {
  const run = (...inputs: LiveSessionInput[]) => inputs.reduce(liveSessionReducer, INITIAL_LIVE_SESSION);

  it('shows the mic-preparing state on the tap itself, before any async work', () => {
    const state = run({ type: 'START', sessionId: 's', at: 10 });
    expect(state.phase).toBe('REQUESTING_MIC');
    expect(state.timings.tapAt).toBe(10);
  });

  it('walks listening → voice active → tracking and records first-speech timing', () => {
    const state = run(
      { type: 'START', sessionId: 's', at: 0 },
      { type: 'MIC_READY', at: 40 },
      { type: 'SPEECH_STARTED', at: 300 },
      { type: 'POSITION', at: 420 },
    );
    expect(state.phase).toBe('TRACKING');
    expect(state.timings).toMatchObject({ micReadyAt: 40, firstSpeechAt: 300, firstPositionAt: 420 });
  });

  it('pauses and resumes; positions arriving while paused do not unpause', () => {
    let state = run({ type: 'START', sessionId: 's', at: 0 }, { type: 'MIC_READY', at: 1 }, { type: 'PAUSE' });
    expect(state.phase).toBe('PAUSED');
    state = liveSessionReducer(state, { type: 'POSITION', at: 5 });
    expect(state.phase).toBe('PAUSED');
    state = liveSessionReducer(state, { type: 'RESUME' });
    expect(state.phase).toBe('LISTENING');
  });

  it('recovers from a lost connection without losing the session', () => {
    let state = run(
      { type: 'START', sessionId: 's', at: 0 },
      { type: 'MIC_READY', at: 1 },
      { type: 'POSITION', at: 2 },
      { type: 'CONNECTION_LOST' },
    );
    expect(state.phase).toBe('RECOVERING');
    expect(state.sessionId).toBe('s');
    state = liveSessionReducer(state, { type: 'CONNECTION_RESTORED' });
    expect(state.phase).toBe('LISTENING');
  });

  it('fails into ERROR with a reason, then a new START clears it', () => {
    let state = run({ type: 'START', sessionId: 's', at: 0 }, { type: 'FAIL', reason: 'mic-denied' });
    expect(state).toMatchObject({ phase: 'ERROR', error: 'mic-denied' });
    state = liveSessionReducer(state, { type: 'START', sessionId: 't', at: 9 });
    expect(state).toMatchObject({ phase: 'REQUESTING_MIC', error: null, sessionId: 't' });
  });
});

describe('position tracker', () => {
  let tracker: PositionTracker;
  const begin = (anchor: WordKey, mode: 'anchor' | 'locate' = 'anchor', to: WordKey = key(114, 6, 3)) => {
    tracker.begin('s1', anchor, { from: anchor, to }, mode);
  };

  beforeEach(() => {
    seq = 0;
    tracker = new PositionTracker(index);
  });

  it('follows word by word across ayah and surah boundaries', () => {
    begin(key(1, 1, 1));
    const path = [key(1, 1, 1), key(1, 1, 2), key(1, 1, 3), key(1, 1, 4), key(1, 2, 1)];
    for (const k of path) expect(tracker.process(position('position.confirmed', k)).cursor).toBe(index.ordinalOf(k));
    const lastOfFatiha = tracker.process(position('position.confirmed', key(1, 7, 9)));
    expect(lastOfFatiha.accepted).toBe(false); // far forward jump is guarded
    begin(key(1, 7, 8));
    tracker.process(position('position.confirmed', key(1, 7, 8)));
    tracker.process(position('position.confirmed', key(1, 7, 9)));
    const crossing = tracker.process(position('position.confirmed', key(2, 1, 1)));
    expect(crossing.cursor).toBe(ord(2, 1, 1));
    expect(crossing.ayahChanged).toEqual({ surah: 2, ayah: 1 });
  });

  it('previews a bounded candidate, then confirmation clears it', () => {
    begin(key(1, 2, 1));
    tracker.process(position('position.confirmed', key(1, 2, 1)));
    expect(tracker.process(position('position.candidate', key(1, 2, 2))).candidate).toBe(ord(1, 2, 2));
    const confirmed = tracker.process(position('position.confirmed', key(1, 2, 2)));
    expect(confirmed.cursor).toBe(ord(1, 2, 2));
    expect(confirmed.candidate).toBeNull();
    // A candidate far ahead of the cursor is not shown.
    expect(tracker.process(position('position.candidate', key(1, 6, 1))).accepted).toBe(false);
  });

  it('drops duplicate, stale, and foreign-session events', () => {
    begin(key(1, 1, 1));
    tracker.process(position('position.confirmed', key(1, 1, 1), { seq: 5 }));
    expect(tracker.process(position('position.confirmed', key(1, 1, 2), { seq: 5 })).rejection).toBe('stale-sequence');
    expect(tracker.process(position('position.confirmed', key(1, 1, 2), { seq: 3 })).rejection).toBe('stale-sequence');
    expect(tracker.process(position('position.confirmed', key(1, 1, 2), { session: 'old' })).rejection).toBe('foreign-session');
    // The same word again (new seq) is idempotent: no double counting.
    const again = tracker.process(position('position.confirmed', key(1, 1, 1)));
    expect(again.recited).toEqual([]);
    expect(tracker.snapshot().recitedCount).toBe(1);
  });

  it('applies the delayed skip policy: A B D leaves C pending until later evidence', () => {
    begin(key(1, 2, 1));
    tracker.process(position('position.confirmed', key(1, 2, 1))); // A
    tracker.process(position('position.confirmed', key(1, 2, 2))); // B
    const jump = tracker.process(position('position.confirmed', key(1, 2, 4))); // D
    expect(jump.skipped).toEqual([]);
    const next = tracker.process(position('position.confirmed', key(1, 3, 1))); // later evidence
    expect(next.skipped).toEqual([ord(1, 2, 3)]);
  });

  it('cancels a pending skip when the reader goes back for the missed word', () => {
    begin(key(1, 2, 1));
    tracker.process(position('position.confirmed', key(1, 2, 1)));
    tracker.process(position('position.confirmed', key(1, 2, 3))); // skipped 1:2:2 pending
    tracker.process(position('position.confirmed', key(1, 2, 2))); // went back
    const forward = tracker.process(position('position.confirmed', key(1, 2, 4)));
    expect(forward.skipped).toEqual([]);
    expect(tracker.snapshot().skippedCount).toBe(0);
  });

  it('treats a short backward step as repetition, never as an error', () => {
    begin(key(1, 5, 1));
    for (const w of [1, 2, 3, 4]) tracker.process(position('position.confirmed', key(1, 5, w)));
    const back = tracker.process(position('position.confirmed', key(1, 5, 2)));
    expect(back.cursor).toBe(ord(1, 5, 2));
    expect(back.skipped).toEqual([]);
    expect(back.flags).toEqual([]);
    expect(tracker.snapshot().recitedCount).toBe(4);
  });

  it('guards a single noisy far jump but accepts a sustained legitimate jump', () => {
    begin(key(2, 1, 1));
    tracker.process(position('position.confirmed', key(2, 1, 1)));
    expect(tracker.process(position('position.confirmed', key(2, 255, 1))).rejection).toBe('guarded-jump');
    expect(tracker.process(position('position.confirmed', key(2, 255, 2))).rejection).toBe('guarded-jump');
    const landed = tracker.process(position('position.confirmed', key(2, 255, 3)));
    expect(landed.cursor).toBe(ord(2, 255, 3));
    // A jump is navigation: the words in between are not flagged as skipped.
    expect(tracker.snapshot().skippedCount).toBe(0);
  });

  it('treats a low-confidence confirmation as a candidate only', () => {
    begin(key(1, 1, 1));
    tracker.process(position('position.confirmed', key(1, 1, 1)));
    const weak = tracker.process(position('position.confirmed', key(1, 1, 2), { confidence: 0.1 }));
    expect(weak.cursor).toBeUndefined();
    expect(weak.candidate).toBe(ord(1, 1, 2));
  });

  it('locates a reader who starts anywhere within the session scope', () => {
    tracker.begin('s1', key(36, 1, 1), { from: key(36, 1, 1), to: key(36, 83, 4) }, 'locate');
    expect(tracker.process(position('position.confirmed', key(36, 12, 1))).cursor).toBe(ord(36, 12, 1));
    tracker.begin('s1', key(36, 1, 1), { from: key(36, 1, 1), to: key(36, 83, 4) }, 'locate');
    seq = 0;
    expect(tracker.process(position('position.confirmed', key(67, 1, 1))).rejection).toBe('guarded-jump');
  });

  it('relocates on explicit user navigation without counting the word as recited', () => {
    begin(key(1, 1, 1));
    tracker.process(position('position.confirmed', key(1, 1, 1)));
    const moved = tracker.relocate(key(18, 10, 1));
    expect(moved.cursor).toBe(ord(18, 10, 1));
    expect(moved.recited).toEqual([]);
    const said = tracker.process(position('position.confirmed', key(18, 10, 1)));
    expect(said.recited).toEqual([ord(18, 10, 1)]);
  });

  it('keeps progress across a reconnect and judges new positions against the old cursor', () => {
    begin(key(1, 1, 1));
    for (const w of [1, 2, 3]) tracker.process(position('position.confirmed', key(1, 1, w)));
    tracker.rebind('s1-r1');
    seq = 0;
    expect(tracker.process(position('position.confirmed', key(1, 1, 4), { session: 's1-r1' })).cursor).toBe(ord(1, 1, 4));
    expect(tracker.process(position('position.confirmed', key(3, 1, 1), { session: 's1-r1' })).accepted).toBe(false);
    expect(tracker.snapshot()).toMatchObject({ cursor: ord(1, 1, 4), recitedCount: 4 });
  });

  it('marks words confirmed without moving the cursor', () => {
    begin(key(1, 1, 1));
    tracker.process(position('position.confirmed', key(1, 1, 1)));
    const word = tracker.process(position('word.confirmed', key(1, 1, 2)));
    expect(word.recited).toEqual([ord(1, 1, 2)]);
    expect(word.cursor).toBeUndefined();
  });
});

describe('word presentation store', () => {
  it('notifies only the previous and next cursor words when the cursor moves', () => {
    const store = new WordPresentationStore(index.totalWords);
    const notified: number[] = [];
    for (let ordinal = 0; ordinal < 40; ordinal += 1) store.subscribe(ordinal, () => notified.push(ordinal));
    store.apply({ accepted: true, cursor: 3, recited: [3], skipped: [], wordCandidates: [], flags: [] });
    notified.length = 0;
    store.apply({ accepted: true, cursor: 4, recited: [4], skipped: [], wordCandidates: [], flags: [] });
    expect(notified.sort((a, b) => a - b)).toEqual([3, 4]);
    expect(decodeVisual(store.visual(4)).state).toBe('current');
    expect(decodeVisual(store.visual(3)).state).toBe('confirmed');
  });

  it('counts a revealed hint separately from recitation', () => {
    const store = new WordPresentationStore(index.totalWords);
    store.reveal([10, 11]);
    expect(store.counts()).toEqual({ recited: 0, skipped: 0, revealed: 2 });
    store.apply({ accepted: true, recited: [11], skipped: [], wordCandidates: [], flags: [] });
    expect(store.counts()).toEqual({ recited: 1, skipped: 0, revealed: 1 });
  });

  it('presents a joined glyph-word with the strongest state of its two WordKeys', () => {
    const store = new WordPresentationStore(index.totalWords);
    store.apply({ accepted: true, cursor: 7, recited: [6, 7], skipped: [], wordCandidates: [], flags: [] });
    expect(decodeVisual(combineVisuals(store.visual(6), store.visual(7))).state).toBe('current');
    expect(decodeVisual(combineVisuals(store.visual(6), store.visual(8))).state).toBe('confirmed');
  });
});
