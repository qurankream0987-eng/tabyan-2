/**
 * @license
 * Tabyan Smart Mushaf — per-word presentation store
 *
 * Word state lives outside React in typed arrays indexed by canonical ordinal.
 * Each rendered glyph subscribes to its own ordinal(s) only, so moving the
 * cursor notifies exactly the two glyphs involved — no page, line, or ayah
 * re-renders. The same store owns the direct ordinal → element registry used
 * by follow mode; nothing ever searches the DOM or the text.
 */

import type { TrackerUpdate } from '../position/PositionTracker';
import type { WordFlag } from '../contracts/events';

/** Recitation base state of a word. */
export const WordBase = Object.freeze({
  UNREAD: 0,
  CANDIDATE: 1,
  CONFIRMED: 2,
  SKIPPED: 3,
  REVEALED: 4,
} as const);
export type WordBaseValue = (typeof WordBase)[keyof typeof WordBase];

const BASE_MASK = 0b111;
export const VISUAL_CURRENT = 1 << 3;
export const VISUAL_CANDIDATE_CURSOR = 1 << 4;
const FLAG_BITS: Readonly<Record<WordFlag, number>> = Object.freeze({
  MISTAKE: 1 << 5,
  TASHKEEL_WARNING: 1 << 6,
  RECOVERED: 1 << 7,
  // SKIPPED is a base state; the flag maps onto it.
  SKIPPED: 0,
});

export type WordVisualState =
  | 'unread'
  | 'candidate'
  | 'current'
  | 'confirmed'
  | 'skipped'
  | 'revealed';

const BASE_NAMES: readonly WordVisualState[] = ['unread', 'candidate', 'confirmed', 'skipped', 'revealed'];

export interface DecodedVisual {
  readonly state: WordVisualState;
  /** Recitation base, independent of the cursor (for masking and tinting). */
  readonly base: WordVisualState;
  readonly mistake: boolean;
  readonly tashkeelWarning: boolean;
  readonly recovered: boolean;
}

export function decodeVisual(code: number): DecodedVisual {
  const state: WordVisualState = code & VISUAL_CURRENT
    ? 'current'
    : code & VISUAL_CANDIDATE_CURSOR
      ? 'candidate'
      : BASE_NAMES[code & BASE_MASK] ?? 'unread';
  return {
    state,
    base: BASE_NAMES[code & BASE_MASK] ?? 'unread',
    mistake: (code & FLAG_BITS.MISTAKE) !== 0,
    tashkeelWarning: (code & FLAG_BITS.TASHKEEL_WARNING) !== 0,
    recovered: (code & FLAG_BITS.RECOVERED) !== 0,
  };
}

const BASE_PRECEDENCE: readonly number[] = [0, 2, 4, 1, 3]; // unread < skipped < candidate < revealed < confirmed

/** Visual of a joined glyph-word bound to two WordKeys: the strongest of both. */
export function combineVisuals(a: number, b: number): number {
  const baseA = a & BASE_MASK;
  const baseB = b & BASE_MASK;
  const base = (BASE_PRECEDENCE[baseA] ?? 0) >= (BASE_PRECEDENCE[baseB] ?? 0) ? baseA : baseB;
  return ((a | b) & ~BASE_MASK) | base;
}

type Listener = () => void;

export class WordPresentationStore {
  private readonly base: Uint8Array;
  private readonly flags: Uint8Array;
  private cursor = -1;
  private candidate = -1;
  private readonly listeners = new Map<number, Set<Listener>>();
  private readonly elements = new Map<number, HTMLElement>();
  private readonly dirty = new Set<number>();
  /** Every ordinal whose base or flags were ever set since the last reset. */
  private readonly touched = new Set<number>();
  private readonly cursorListeners = new Set<Listener>();
  private cursorMoved = false;
  private recitedCount = 0;
  private skippedCount = 0;
  private revealedCount = 0;

  constructor(readonly totalWords: number) {
    this.base = new Uint8Array(totalWords);
    this.flags = new Uint8Array(totalWords);
  }

  visual(ordinal: number): number {
    if (ordinal < 0 || ordinal >= this.totalWords) return 0;
    let code = this.base[ordinal] | this.flags[ordinal];
    if (ordinal === this.cursor) code |= VISUAL_CURRENT;
    else if (ordinal === this.candidate) code |= VISUAL_CANDIDATE_CURSOR;
    return code;
  }

  getCursor(): number {
    return this.cursor;
  }

  getCandidate(): number {
    return this.candidate;
  }

  counts(): { recited: number; skipped: number; revealed: number } {
    return { recited: this.recitedCount, skipped: this.skippedCount, revealed: this.revealedCount };
  }

  subscribe(ordinal: number, listener: Listener): () => void {
    let set = this.listeners.get(ordinal);
    if (!set) {
      set = new Set();
      this.listeners.set(ordinal, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(ordinal);
    };
  }

  /** Number of glyph subscriptions currently mounted (diagnostics/tests). */
  subscriberCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }

  /** Notified once per update in which the cursor or candidate moved (follow mode). */
  subscribeCursor(listener: Listener): () => void {
    this.cursorListeners.add(listener);
    return () => this.cursorListeners.delete(listener);
  }

  registerElement(ordinal: number, element: HTMLElement | null): void {
    if (element) this.elements.set(ordinal, element);
    else this.elements.delete(ordinal);
  }

  getElement(ordinal: number): HTMLElement | null {
    return this.elements.get(ordinal) ?? null;
  }

  /** Applies one tracker update and notifies only the words it touched. */
  apply(update: TrackerUpdate): number[] {
    for (const ordinal of update.recited) this.setBase(ordinal, WordBase.CONFIRMED);
    for (const ordinal of update.skipped) {
      if (this.base[ordinal] !== WordBase.CONFIRMED) this.setBase(ordinal, WordBase.SKIPPED);
    }
    for (const ordinal of update.wordCandidates) {
      if (this.base[ordinal] === WordBase.UNREAD) this.setBase(ordinal, WordBase.CANDIDATE);
    }
    for (const { ordinal, flag } of update.flags) {
      if (flag === 'SKIPPED') {
        if (this.base[ordinal] !== WordBase.CONFIRMED) this.setBase(ordinal, WordBase.SKIPPED);
      } else if ((this.flags[ordinal] & FLAG_BITS[flag]) === 0) {
        this.flags[ordinal] |= FLAG_BITS[flag];
        this.touched.add(ordinal);
        this.dirty.add(ordinal);
      }
    }
    if (update.cursor !== undefined && update.cursor !== this.cursor) {
      this.cursorMoved = true;
      this.markDirty(this.cursor);
      this.cursor = update.cursor;
      this.markDirty(this.cursor);
      if (this.candidate === this.cursor) this.candidate = -1;
    }
    if (update.candidate !== undefined) {
      const next = update.candidate ?? -1;
      if (next !== this.candidate) {
        this.markDirty(this.candidate);
        this.candidate = next === this.cursor ? -1 : next;
        this.markDirty(this.candidate);
      }
    }
    return this.flush();
  }

  /** Learner-requested hint: shown, but never counted as recited. */
  reveal(ordinals: readonly number[]): number[] {
    for (const ordinal of ordinals) {
      const base = this.base[ordinal];
      if (base === WordBase.UNREAD || base === WordBase.CANDIDATE) this.setBase(ordinal, WordBase.REVEALED);
    }
    return this.flush();
  }

  /** Clears every word state; notifies only words that were not already clear. */
  reset(): number[] {
    // Proportional to what the session touched, not to all 77,433 words.
    for (const ordinal of this.touched) {
      if (this.base[ordinal] !== 0 || this.flags[ordinal] !== 0) {
        this.base[ordinal] = 0;
        this.flags[ordinal] = 0;
        this.dirty.add(ordinal);
      }
    }
    this.touched.clear();
    this.markDirty(this.cursor);
    this.markDirty(this.candidate);
    this.cursorMoved = this.cursor !== -1;
    this.cursor = -1;
    this.candidate = -1;
    this.recitedCount = 0;
    this.skippedCount = 0;
    this.revealedCount = 0;
    return this.flush();
  }

  private markDirty(ordinal: number): void {
    if (ordinal >= 0) this.dirty.add(ordinal);
  }

  private setBase(ordinal: number, next: WordBaseValue): void {
    if (ordinal < 0 || ordinal >= this.totalWords) return;
    const previous = this.base[ordinal];
    if (previous === next) return;
    if (previous === WordBase.CONFIRMED) this.recitedCount -= 1;
    if (previous === WordBase.SKIPPED) this.skippedCount -= 1;
    if (previous === WordBase.REVEALED) this.revealedCount -= 1;
    if (next === WordBase.CONFIRMED) this.recitedCount += 1;
    if (next === WordBase.SKIPPED) this.skippedCount += 1;
    if (next === WordBase.REVEALED) this.revealedCount += 1;
    this.base[ordinal] = next;
    this.touched.add(ordinal);
    this.dirty.add(ordinal);
  }

  private flush(): number[] {
    const cursorMoved = this.cursorMoved;
    this.cursorMoved = false;
    if (this.dirty.size === 0) return [];
    const touched = [...this.dirty];
    this.dirty.clear();
    for (const ordinal of touched) {
      const set = this.listeners.get(ordinal);
      if (set) for (const listener of set) listener();
    }
    if (cursorMoved) for (const listener of this.cursorListeners) listener();
    return touched;
  }
}
