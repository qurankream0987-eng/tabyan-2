/**
 * @license
 * Tabyan Smart Mushaf — bounded live position tracker
 *
 * Turns canonical position/word events into cursor movement over global word
 * ordinals. Candidate positions may move the visual cursor subtly within a
 * bounded window; the confirmed cursor only moves by sequence rules:
 *
 *   - small forward steps advance immediately (gaps become pending skips,
 *     flagged only after later evidence keeps moving forward);
 *   - small backward steps are repetition / re-recitation, never errors;
 *   - larger jumps need `jumpConfirmations` agreeing events (or an explicit
 *     user relocation), so a single noisy observation cannot fling the reader
 *     across the Mushaf while a real jump still lands within a few events.
 *
 * Stale, duplicate, and foreign-session events are rejected.
 */

import type { WordKey } from '../../quran/domain/types';
import type { CanonicalWordIndex } from '../../quran/canonical/CanonicalWordIndex';
import type { LiveRecitationEvent, WordFlag } from '../contracts/events';

export interface PositionGuardConfig {
  /** Confirmed forward advance accepted at once. */
  readonly maxForwardStep: number;
  /** Confirmed backward step accepted at once (repetition / re-recitation). */
  readonly maxBackwardStep: number;
  /** A candidate may preview up to this many words ahead of the cursor… */
  readonly candidateLead: number;
  /** …or this many behind it. */
  readonly candidateTrail: number;
  /** Agreeing events needed before a guarded jump is accepted. */
  readonly jumpConfirmations: number;
  /** Events within this many words of each other agree on a jump target. */
  readonly jumpAgreementWindow: number;
  /** Gaps up to this size are flagged as skipped; larger jumps are navigation. */
  readonly skipFlagMaxGap: number;
  /** Confirmed events below this confidence are treated as candidates. */
  readonly minConfirmConfidence: number;
}

export const DEFAULT_POSITION_GUARDS: PositionGuardConfig = Object.freeze({
  maxForwardStep: 10,
  maxBackwardStep: 15,
  candidateLead: 4,
  candidateTrail: 2,
  jumpConfirmations: 3,
  jumpAgreementWindow: 3,
  skipFlagMaxGap: 8,
  minConfirmConfidence: 0.35,
});

export type TrackerRejection =
  | 'foreign-session'
  | 'stale-sequence'
  | 'invalid-word'
  | 'guarded-jump'
  | 'out-of-window';

export interface TrackerUpdate {
  readonly accepted: boolean;
  readonly rejection?: TrackerRejection;
  /** New cursor ordinal when it moved. */
  readonly cursor?: number;
  /** New candidate ordinal, or null when cleared; undefined when unchanged. */
  readonly candidate?: number | null;
  readonly recited: readonly number[];
  readonly skipped: readonly number[];
  readonly wordCandidates: readonly number[];
  readonly flags: readonly { readonly ordinal: number; readonly flag: WordFlag }[];
  readonly ayahChanged?: { readonly surah: number; readonly ayah: number };
}

export interface TrackerSnapshot {
  readonly cursor: number;
  readonly candidate: number | null;
  readonly recitedCount: number;
  readonly skippedCount: number;
}

const NOTHING: TrackerUpdate = Object.freeze({
  accepted: true,
  recited: [],
  skipped: [],
  wordCandidates: [],
  flags: [],
});

function rejected(rejection: TrackerRejection): TrackerUpdate {
  return { ...NOTHING, accepted: false, rejection };
}

export class PositionTracker {
  private sessionId: string | null = null;
  private lastSeq = -1;
  private cursor = -1;
  private candidate: number | null = null;
  private anchor = 0;
  private scopeFrom = 0;
  private scopeTo = 0;
  private startMode: 'anchor' | 'locate' = 'anchor';
  private readonly recited = new Set<number>();
  private readonly skipped = new Set<number>();
  private pendingSkip: { readonly target: number; readonly words: number[] } | null = null;
  private jumpEvidence: { target: number; count: number } | null = null;
  /** Audio was lost (reconnect): the next forward gap is unknown, not skipped. */
  private gapUnobserved = false;

  constructor(
    private readonly index: CanonicalWordIndex,
    private readonly guards: PositionGuardConfig = DEFAULT_POSITION_GUARDS,
  ) {}

  /** Starts a fresh session; all prior progress is discarded. */
  begin(sessionId: string, anchor: WordKey, scope: { from: WordKey; to: WordKey }, startMode: 'anchor' | 'locate'): void {
    this.sessionId = sessionId;
    this.lastSeq = -1;
    this.cursor = -1;
    this.candidate = null;
    this.anchor = Math.max(0, this.index.ordinalOf(anchor));
    this.scopeFrom = Math.max(0, this.index.ordinalOf(scope.from));
    const to = this.index.ordinalOf(scope.to);
    this.scopeTo = to < 0 ? this.index.totalWords - 1 : to;
    this.startMode = startMode;
    this.recited.clear();
    this.skipped.clear();
    this.pendingSkip = null;
    this.jumpEvidence = null;
    this.gapUnobserved = false;
  }

  /**
   * A provider reconnected with a new provider session: keep all progress and
   * the cursor, accept the new sequence space. Positions after reconnect are
   * still judged relative to the existing cursor, so recovery never jumps to
   * an unrelated ayah.
   */
  rebind(sessionId: string): void {
    this.sessionId = sessionId;
    this.lastSeq = -1;
    this.candidate = null;
    this.jumpEvidence = null;
    this.gapUnobserved = true;
  }

  /** Explicit user navigation ("start from here"): a legitimate jump. */
  relocate(key: WordKey): TrackerUpdate {
    const ordinal = this.index.ordinalOf(key);
    if (ordinal < 0) return rejected('invalid-word');
    this.pendingSkip = null;
    this.jumpEvidence = null;
    // Not recited yet: the reader is about to start here.
    return this.moveCursor(ordinal, [], [], false);
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  snapshot(): TrackerSnapshot {
    return {
      cursor: this.cursor,
      candidate: this.candidate,
      recitedCount: this.recited.size,
      skippedCount: this.skipped.size,
    };
  }

  /** The word the reader is expected to say next. */
  nextExpected(): WordKey | null {
    if (this.cursor < 0) return this.index.keyAt(this.anchor);
    return this.recited.has(this.cursor) ? this.index.keyAt(this.cursor + 1) : this.index.keyAt(this.cursor);
  }

  process(event: LiveRecitationEvent): TrackerUpdate {
    if (event.sessionId !== this.sessionId) return rejected('foreign-session');
    if (event.seq <= this.lastSeq) return rejected('stale-sequence');

    switch (event.type) {
      case 'position.confirmed':
      case 'position.candidate':
      case 'word.confirmed':
      case 'word.candidate':
      case 'word.flagged': {
        const ordinal = this.index.ordinalOf(event);
        if (ordinal < 0) {
          this.lastSeq = event.seq;
          return rejected('invalid-word');
        }
        this.lastSeq = event.seq;
        if (event.type === 'position.confirmed') {
          return event.confidence < this.guards.minConfirmConfidence
            ? this.onCandidate(ordinal)
            : this.onConfirmed(ordinal);
        }
        if (event.type === 'position.candidate') return this.onCandidate(ordinal);
        if (!this.inWordWindow(ordinal)) return rejected('out-of-window');
        if (event.type === 'word.confirmed') return this.onWordConfirmed(ordinal);
        if (event.type === 'word.candidate') {
          return this.recited.has(ordinal) ? NOTHING : { ...NOTHING, wordCandidates: [ordinal] };
        }
        return event.type === 'word.flagged' ? { ...NOTHING, flags: [{ ordinal, flag: event.flag }] } : NOTHING;
      }
      default:
        this.lastSeq = event.seq;
        return NOTHING;
    }
  }

  private inWordWindow(ordinal: number): boolean {
    const origin = this.cursor < 0 ? this.anchor : this.cursor;
    const d = ordinal - origin;
    return d >= -this.guards.maxBackwardStep * 4 && d <= this.guards.maxForwardStep;
  }

  private initialZoneAccepts(ordinal: number): boolean {
    if (this.startMode === 'locate') return ordinal >= this.scopeFrom && ordinal <= this.scopeTo;
    const d = ordinal - this.anchor;
    return d >= -this.guards.candidateTrail && d <= this.guards.maxForwardStep;
  }

  /** Records evidence for a guarded jump; true once enough events agree. */
  private jumpAgreed(ordinal: number): boolean {
    const evidence = this.jumpEvidence;
    if (evidence && Math.abs(ordinal - evidence.target) <= this.guards.jumpAgreementWindow) {
      evidence.target = ordinal;
      evidence.count += 1;
    } else {
      this.jumpEvidence = { target: ordinal, count: 1 };
    }
    return this.jumpEvidence!.count >= this.guards.jumpConfirmations;
  }

  private onCandidate(ordinal: number): TrackerUpdate {
    const origin = this.cursor < 0 ? this.anchor : this.cursor;
    const d = ordinal - origin;
    const bounded = this.cursor < 0
      ? this.initialZoneAccepts(ordinal)
      : d >= -this.guards.candidateTrail && d <= this.guards.candidateLead;
    if (!bounded && !this.jumpAgreed(ordinal)) return rejected('guarded-jump');
    if (bounded) this.jumpEvidence = null;
    const next = ordinal === this.cursor ? null : ordinal;
    if (next === this.candidate) return NOTHING;
    this.candidate = next;
    return { ...NOTHING, candidate: next };
  }

  private onWordConfirmed(ordinal: number): TrackerUpdate {
    this.cancelPendingSkip(ordinal);
    if (this.recited.has(ordinal)) return NOTHING;
    this.recited.add(ordinal);
    this.skipped.delete(ordinal);
    return { ...NOTHING, recited: [ordinal] };
  }

  private cancelPendingSkip(ordinal: number): void {
    if (!this.pendingSkip) return;
    const words = this.pendingSkip.words.filter((word) => word !== ordinal);
    this.pendingSkip = words.length > 0 ? { target: this.pendingSkip.target, words } : null;
  }

  private onConfirmed(ordinal: number): TrackerUpdate {
    const skipped: number[] = [];

    if (this.cursor < 0) {
      if (!this.initialZoneAccepts(ordinal) && !this.jumpAgreed(ordinal)) return rejected('guarded-jump');
      this.jumpEvidence = null;
      return this.moveCursor(ordinal, [ordinal], skipped, true);
    }

    const d = ordinal - this.cursor;

    // Delayed skip policy: earlier gaps are confirmed only by continued forward evidence.
    if (this.pendingSkip) {
      if (ordinal >= this.pendingSkip.target) {
        for (const word of this.pendingSkip.words) {
          if (!this.recited.has(word) && !this.skipped.has(word)) {
            this.skipped.add(word);
            skipped.push(word);
          }
        }
        this.pendingSkip = null;
      } else {
        this.cancelPendingSkip(ordinal);
      }
    }

    if (d === 0) {
      this.jumpEvidence = null;
      const candidate = this.clearCandidateAtOrBefore(ordinal);
      const recited = this.recited.has(ordinal) ? [] : [ordinal];
      if (recited.length > 0) {
        this.recited.add(ordinal);
        this.skipped.delete(ordinal);
      }
      return { ...NOTHING, recited, skipped, ...(candidate === null ? { candidate } : {}) };
    }

    if (d > 0 && d <= this.guards.maxForwardStep) {
      this.jumpEvidence = null;
      // Words are recited only on evidence. A relocated cursor word that the
      // reader never said is part of the gap, like any other unheard word.
      const gap: number[] = [];
      for (let word = this.cursor; word < ordinal; word += 1) {
        if (!this.recited.has(word)) gap.push(word);
      }
      if (gap.length > 0 && gap.length <= this.guards.skipFlagMaxGap && !this.gapUnobserved) {
        this.pendingSkip = { target: ordinal, words: gap };
      }
      this.gapUnobserved = false;
      return this.moveCursor(ordinal, [ordinal], skipped, true);
    }

    if (d < 0 && -d <= this.guards.maxBackwardStep) {
      this.jumpEvidence = null;
      return this.moveCursor(ordinal, [ordinal], skipped, true);
    }

    if (!this.jumpAgreed(ordinal)) return { ...rejected('guarded-jump'), skipped };
    this.jumpEvidence = null;
    this.pendingSkip = null;
    this.gapUnobserved = false;
    return this.moveCursor(ordinal, [ordinal], skipped, true);
  }

  private clearCandidateAtOrBefore(ordinal: number): number | null | undefined {
    if (this.candidate === null || this.candidate > ordinal) return undefined;
    this.candidate = null;
    return null;
  }

  private moveCursor(
    ordinal: number,
    recitedNow: readonly number[],
    skipped: readonly number[],
    markRecited: boolean,
  ): TrackerUpdate {
    const previous = this.cursor < 0 ? null : this.index.keyAt(this.cursor);
    this.cursor = ordinal;
    const recited: number[] = [];
    if (markRecited) {
      for (const word of recitedNow) {
        if (!this.recited.has(word)) {
          this.recited.add(word);
          this.skipped.delete(word);
          recited.push(word);
        }
      }
    }
    const candidate = this.candidate !== null && this.candidate <= ordinal
      ? ((this.candidate = null), null)
      : undefined;
    const key = this.index.keyAt(ordinal)!;
    const ayahChanged = !previous || previous.surah !== key.surah || previous.ayah !== key.ayah
      ? { surah: key.surah, ayah: key.ayah }
      : undefined;
    return {
      accepted: true,
      cursor: ordinal,
      ...(candidate === null ? { candidate: null } : {}),
      recited,
      skipped,
      wordCandidates: [],
      flags: [],
      ...(ayahChanged ? { ayahChanged } : {}),
    };
  }
}
