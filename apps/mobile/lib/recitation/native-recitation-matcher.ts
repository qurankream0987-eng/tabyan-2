import {
  QuranLiveMatcher,
  type CanonicalQuranWord,
  type LiveMatch,
} from "@workspace/tabyan-domain/quran-live-matcher";
import {
  RecitationStateEngine,
  type RecitationWordState,
} from "@workspace/tabyan-domain/recitation-state-engine";
import { normalizeQuranText } from "./quran-normalizer";

export type { CanonicalQuranWord };

export interface NativeMatcherDiagnostics {
  mode: "tracking" | "recovery";
  repeatedPosition: boolean;
  skippedRegionWords: number;
  unmatchedTokenCount: number;
  unmatched: boolean;
}

/**
 * What the screen may show for a recited word, from the shared state engine; never raw ASR
 * text. "skipped" is no longer produced (a word left out is a mistake) but stays for results
 * submitted before.
 */
export type NativeWordFeedback = "correct" | "pending" | "mistake" | "skipped" | "corrected" | "peeked";

export interface NativeWordStateChange {
  key: string;
  state: RecitationWordState;
}

export interface NativeRecitationMatch {
  current: CanonicalQuranWord | null;
  /**
   * The word being recited now, for the on-screen pointer: it follows partial
   * transcripts forward and never falls back to the last final while the
   * reciter keeps going; a final transcript sets it to what was committed.
   */
  reading: CanonicalQuranWord | null;
  /** Words of the range up to and including `reading` (position, not accuracy). */
  readingWords: number;
  revealedWords: Map<string, number>;
  /** `verseKey:position` of every word a final alignment confirmed; never raw ASR text. */
  confirmedWordKeys: ReadonlySet<string>;
  /** Display state per `verseKey:position`, from the shared recitation state engine. */
  wordFeedback: ReadonlyMap<string, NativeWordFeedback>;
  /** Engine states that changed in this event (for mistake/correction cues). */
  changedWordStates: readonly NativeWordStateChange[];
  confidence: number;
  stable: boolean;
  progressionWords: number;
  totalWords: number;
  diagnostics: NativeMatcherDiagnostics;
}

/** Local, on-device summary of a general session; not an evaluation. */
export interface NativeRecitationSummary {
  wordsRecited: number;
  totalWords: number;
  /** Every word the reader stopped on, wrong or left out, corrected afterwards or not. */
  confirmedMistakes: number;
  /** Always 0: nothing is skipped; kept for the submitted result's shape. */
  skippedWords: number;
  /** Mistakes the reader corrected by reading the word right. */
  correctedWords: number;
  /** Words revealed by a hint; neither correct nor a mistake. */
  peekedWords: number;
}

/** One word the reader was stopped on, for the session summary. */
export interface NativeRecitationMistake {
  key: string;
  verseKey: string;
  position: number;
  /** The word as printed in the Mushaf. */
  text: string;
  /** What the recognizer heard instead (normalized), or null when the word was left out. */
  heard: string | null;
  /** Read right afterwards, shown by a hint and then read, or never corrected. */
  outcome: "corrected" | "hinted" | "uncorrected";
}

export type NativeRecitationState =
  | "idle"
  | "connecting"
  | "recording"
  | "paused"
  | "stopped"
  | "error";

export interface NativeRecitationCallbacks {
  onState?: (state: NativeRecitationState, message?: string) => void;
  onMatch?: (match: NativeRecitationMatch) => void;
}

const CONFIDENCE_THRESHOLD = 0.68;

export function confirmedWordKey(word: Pick<CanonicalQuranWord, "verseKey" | "position">) {
  return `${word.verseKey}:${word.position}`;
}

function tokenCount(text: string) {
  return normalizeQuranText(text).split(" ").filter(Boolean).length;
}

/**
 * Native live matcher: the shared web matcher and mistake engine behind the
 * controller's `feed(text, itemId, isFinal)` contract. Partials only move the
 * provisional pointer; words are committed and judged from final transcripts.
 * Strict: a wrong or missing word stops the reader on it, and nothing after it
 * counts until it is read right (or shown by a hint and then read).
 */
export class NativeQuranLiveMatcher {
  private readonly matcher: QuranLiveMatcher;
  private readonly engine: RecitationStateEngine;
  private readonly indexByKey = new Map<string, number>();
  private readonly confirmedIndices = new Set<number>();
  private readingIndex = -1;
  private lastEvent = "";
  private lastResult: NativeRecitationMatch | null = null;

  constructor(private readonly words: CanonicalQuranWord[]) {
    this.matcher = new QuranLiveMatcher(words, {
      generalPositionFollowing: true,
      ignoreOptionalBasmala: true,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      commitPartials: false,
    });
    this.engine = new RecitationStateEngine({ strict: true, wordAt: (index) => this.matcher.wordAt(index) });
    this.indexWords();
  }

  appendWords(nextWords: CanonicalQuranWord[]) {
    this.matcher.appendWords(nextWords);
    this.indexWords();
  }

  setStartPosition(position: { verseKey: string; wordPosition?: number }) {
    if (!this.matcher.setStartPosition(position)) return false;
    this.engine.setStart(this.matcher.committedIndex());
    this.confirmedIndices.clear();
    this.readingIndex = this.matcher.committedIndex() - 1;
    this.lastEvent = "";
    this.lastResult = null;
    return true;
  }

  feed(text: string, itemId: string, isFinal: boolean, wordConfidences?: number[]): NativeRecitationMatch {
    const eventKey = `${itemId}:${isFinal}:${text}`;
    if (eventKey === this.lastEvent && this.lastResult) {
      return { ...this.lastResult, stable: false, changedWordStates: [] };
    }
    this.lastEvent = eventKey;
    const committedBefore = this.matcher.committedIndex();
    const live = this.matcher.feed({ text, itemId, isFinal, wordConfidences });
    const update = this.engine.apply(live);
    // Stopped on a mistake: the matcher goes back to it, and words said past it are not taken.
    if (update.rewindTo !== null) this.matcher.rewindTo(update.rewindTo);
    const committed = this.matcher.committedIndex();
    const hold = this.engine.strictHoldAt;
    if (hold !== null) this.readingIndex = hold - 1;
    // A partial that does not align (a half-heard word, noise) keeps the
    // pointer where it is instead of snapping back to the last final.
    else if (isFinal && live.stable) this.readingIndex = committed - 1;
    else this.readingIndex = Math.max(this.readingIndex, live.provisionalIndex, committed - 1);
    for (const op of [...live.committedOps, ...live.revisitOps]) {
      if (op.kind === "extra" || op.index >= committed || op.index === hold) continue;
      // A short word the recognizer dropped, taken as heard, was recited too.
      if (op.kind !== "skip" || this.engine.stateAt(op.index) === "CORRECT") this.confirmedIndices.add(op.index);
    }
    const changedWordStates: NativeWordStateChange[] = [];
    for (const index of update.changed) {
      const word = this.matcher.wordAt(index);
      if (word) changedWordStates.push({ key: confirmedWordKey(word), state: this.engine.stateAt(index) });
    }
    this.lastResult = {
      current: live.current,
      reading: this.matcher.wordAt(this.readingIndex) ?? null,
      readingWords: this.readingIndex + 1,
      revealedWords: this.matcher.revealedSnapshot(),
      confirmedWordKeys: this.confirmedKeys(),
      wordFeedback: this.wordFeedback(),
      changedWordStates,
      confidence: live.confidence,
      stable: live.stable,
      progressionWords: this.confirmedIndices.size,
      totalWords: this.words.length,
      diagnostics: this.diagnostics(live, text, committedBefore),
    };
    return this.lastResult;
  }

  /**
   * Hint for a reciter who is stuck: reveals the word after the reading pointer
   * (level 1), the next three words (2) or the rest of that ayah (3). Hinted
   * words are recorded as peeks, never as correct words or mistakes.
   */
  peek(level: 1 | 2 | 3): NativeRecitationMatch | null {
    const start = this.engine.strictHoldAt ?? Math.max(this.readingIndex + 1, this.matcher.committedIndex());
    const first = this.matcher.wordAt(start);
    if (!first) return null;
    const indices: number[] = [];
    const limit = level === 1 ? 1 : level === 2 ? 3 : Number.POSITIVE_INFINITY;
    for (let index = start; indices.length < limit; index += 1) {
      const word = this.matcher.wordAt(index);
      if (!word || (level === 3 && word.verseKey !== first.verseKey)) break;
      indices.push(index);
    }
    this.engine.peekIndices(indices);
    const base = this.lastResult ?? this.emptyResult();
    this.lastResult = { ...base, wordFeedback: this.wordFeedback(), changedWordStates: [], stable: false };
    return this.lastResult;
  }

  /**
   * Ends the local session: unconfirmed deviations are dropped (never counted as
   * mistakes) and the summary reflects exactly what the screen showed.
   */
  finish(): NativeRecitationSummary {
    this.engine.finalize();
    const summary: NativeRecitationSummary = {
      wordsRecited: this.confirmedIndices.size,
      totalWords: this.words.length,
      confirmedMistakes: 0,
      skippedWords: 0,
      correctedWords: 0,
      peekedWords: 0,
    };
    for (const feedback of this.wordFeedback().values()) {
      if (feedback === "corrected") summary.correctedWords += 1;
      else if (feedback === "peeked") summary.peekedWords += 1;
    }
    // Every stop counts as a mistake, the ones corrected after it too.
    summary.confirmedMistakes = this.engine.mistakeRecords().filter((record) => record.status !== "dismissed").length;
    return summary;
  }

  /** Every word the reader was stopped on, in reading order; call after finish(). */
  mistakes(): NativeRecitationMistake[] {
    const list: (NativeRecitationMistake & { index: number })[] = [];
    for (const record of this.engine.mistakeRecords()) {
      if (record.status === "dismissed") continue;
      const key = `${record.verseKey}:${record.position}`;
      const index = this.indexByKey.get(key);
      if (index === undefined) continue;
      const event = this.engine.mistakeAt(index);
      list.push({
        index,
        key,
        verseKey: record.verseKey,
        position: record.position,
        text: this.matcher.wordAt(index)?.displayText ?? "",
        heard: record.kind === "WRONG_WORD" ? event?.heard ?? null : null,
        outcome: this.engine.stateAt(index) === "PEEKED" ? "hinted" : record.status === "corrected" ? "corrected" : "uncorrected",
      });
    }
    return list.sort((a, b) => a.index - b.index).map(({ index: _index, ...mistake }) => mistake);
  }

  /** Words the engine flagged, for a submitted assignment; call after finish(). */
  flaggedWords(): { key: string; kind: Exclude<NativeWordFeedback, "correct" | "pending"> }[] {
    const flagged: { key: string; kind: Exclude<NativeWordFeedback, "correct" | "pending"> }[] = [];
    for (const [key, feedback] of this.wordFeedback()) {
      if (feedback !== "correct" && feedback !== "pending") flagged.push({ key, kind: feedback });
    }
    return flagged;
  }

  private indexWords() {
    this.words.forEach((word, index) => this.indexByKey.set(confirmedWordKey(word), index));
  }

  private confirmedKeys() {
    const keys = new Set<string>();
    for (const index of this.confirmedIndices) {
      const word = this.matcher.wordAt(index);
      if (word) keys.add(confirmedWordKey(word));
    }
    return keys;
  }

  private wordFeedback() {
    const feedback = new Map<string, NativeWordFeedback>();
    for (const [key, state] of this.engine.visibleStates(true)) {
      const index = this.indexByKey.get(key);
      if (index === undefined) continue;
      const value = this.feedbackFor(state);
      if (value) feedback.set(key, value);
    }
    return feedback;
  }

  private feedbackFor(state: RecitationWordState): NativeWordFeedback | null {
    switch (state) {
      case "CORRECT":
        return "correct";
      case "CORRECTED":
        return "corrected";
      case "PEEKED":
        return "peeked";
      case "POSSIBLE_ERROR":
        return "pending";
      case "CONFIRMED_ERROR":
        return "mistake";
      default:
        return null;
    }
  }

  private emptyResult(): NativeRecitationMatch {
    return {
      current: null,
      reading: this.matcher.wordAt(this.readingIndex) ?? null,
      readingWords: this.readingIndex + 1,
      revealedWords: new Map(),
      confirmedWordKeys: this.confirmedKeys(),
      wordFeedback: this.wordFeedback(),
      changedWordStates: [],
      confidence: 0,
      stable: false,
      progressionWords: this.confirmedIndices.size,
      totalWords: this.words.length,
      diagnostics: { mode: "tracking", repeatedPosition: false, skippedRegionWords: 0, unmatchedTokenCount: 0, unmatched: false },
    };
  }

  private diagnostics(live: LiveMatch, text: string, committedBefore: number): NativeMatcherDiagnostics {
    const unmatched = live.confidence < CONFIDENCE_THRESHOLD;
    return {
      mode: live.mode,
      repeatedPosition: live.stable && live.committedIndex <= committedBefore && live.revisitOps.length > 0,
      skippedRegionWords: live.committedOps.filter((op) => op.kind === "skip").length,
      unmatchedTokenCount: unmatched
        ? tokenCount(text)
        : live.committedOps.filter((op) => op.kind === "extra").length,
      unmatched,
    };
  }
}
