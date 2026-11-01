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
 * What the screen may show for a recited word. Deviations stay "pending" until
 * the shared state engine confirms them; they never come from raw ASR text.
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
  confirmedMistakes: number;
  skippedWords: number;
  correctedWords: number;
  /** Words revealed by a hint; neither correct nor a mistake. */
  peekedWords: number;
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
/**
 * The recognizer often drops a short word ("في", "من") that was recited, which
 * the matcher reads as an omission. Only a run of this many consecutive omitted
 * words is shown and counted as skipped; a shorter gap is treated as not heard.
 */
const MIN_SHOWN_OMISSION_RUN = 3;

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
    this.engine = new RecitationStateEngine({ wordAt: (index) => this.matcher.wordAt(index) });
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

  feed(text: string, itemId: string, isFinal: boolean): NativeRecitationMatch {
    const eventKey = `${itemId}:${isFinal}:${text}`;
    if (eventKey === this.lastEvent && this.lastResult) {
      return { ...this.lastResult, stable: false, changedWordStates: [] };
    }
    this.lastEvent = eventKey;
    const committedBefore = this.matcher.committedIndex();
    const live = this.matcher.feed({ text, itemId, isFinal });
    const update = this.engine.apply(live);
    // A partial that does not align (a half-heard word, noise) keeps the
    // pointer where it is instead of snapping back to the last final.
    if (isFinal && live.stable) this.readingIndex = live.committedIndex - 1;
    else this.readingIndex = Math.max(this.readingIndex, live.provisionalIndex, live.committedIndex - 1);
    for (const op of [...live.committedOps, ...live.revisitOps]) {
      if (op.kind === "match" || op.kind === "substitution") this.confirmedIndices.add(op.index);
    }
    const changedWordStates: NativeWordStateChange[] = [];
    for (const index of update.changed) {
      const word = this.matcher.wordAt(index);
      // No mistake cue for a gap that is not shown.
      if (word && !this.isUnheardGap(index)) changedWordStates.push({ key: confirmedWordKey(word), state: this.engine.stateAt(index) });
    }
    this.lastResult = {
      current: live.current,
      reading: this.matcher.wordAt(this.readingIndex) ?? null,
      readingWords: this.readingIndex + 1,
      revealedWords: live.revealedWords,
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
    const start = Math.max(this.readingIndex + 1, this.matcher.committedIndex());
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
      if (feedback === "mistake") summary.confirmedMistakes += 1;
      else if (feedback === "skipped") summary.skippedWords += 1;
      else if (feedback === "corrected") summary.correctedWords += 1;
      else if (feedback === "peeked") summary.peekedWords += 1;
    }
    return summary;
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
      const value = this.feedbackFor(index, state);
      if (value) feedback.set(key, value);
    }
    return feedback;
  }

  private feedbackFor(index: number, state: RecitationWordState): NativeWordFeedback | null {
    // A short gap is never shown as a mistake; once re-read it is simply correct.
    if (this.isUnheardGap(index)) return state === "CORRECTED" ? "correct" : null;
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
        return this.engine.mistakeAt(index)?.kind === "OMISSION" ? "skipped" : "mistake";
      case "SKIPPED": {
        // A long skipped run records one mistake at its first word; show the run
        // only once that mistake is confirmed.
        let start = index;
        while (start > 0 && this.engine.stateAt(start - 1) === "SKIPPED") start -= 1;
        return this.engine.mistakeAt(start)?.status === "confirmed" ? "skipped" : null;
      }
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

  /** A short run of omissions, more likely missed by the recognizer than skipped. */
  private isUnheardGap(index: number) {
    const isOmission = (at: number) => this.engine.mistakeAt(at)?.kind === "OMISSION";
    if (!isOmission(index)) return false;
    let start = index;
    while (start > 0 && isOmission(start - 1)) start -= 1;
    let end = index;
    while (isOmission(end + 1)) end += 1;
    return end - start + 1 < MIN_SHOWN_OMISSION_RUN;
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
