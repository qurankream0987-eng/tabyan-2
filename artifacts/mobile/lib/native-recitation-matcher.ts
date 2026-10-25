import { normalizeQuranText } from "./quran-normalizer";

export interface CanonicalQuranWord {
  surah: number;
  ayah: number;
  verseKey: string;
  position: number;
  page?: number;
  line?: number;
  displayText: string;
  normalizedText: string;
}

export interface NativeMatcherDiagnostics {
  mode: "tracking" | "recovery";
  underRunWords: number;
  overRunWords: number;
  repeatedPosition: boolean;
  skippedRegionWords: number;
  unmatchedTokenCount: number;
  unmatched: boolean;
}

export interface NativeRecitationMatch {
  current: CanonicalQuranWord | null;
  revealedWords: Map<string, number>;
  confidence: number;
  stable: boolean;
  progressionWords: number;
  totalWords: number;
  diagnostics: NativeMatcherDiagnostics;
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

export interface NativeMatcherOptions {
  trackingForwardWindow?: number;
  trackingBackwardWindow?: number;
  recoveryMismatchLimit?: number;
  commitStability?: number;
  confidenceThreshold?: number;
  generalPositionFollowing?: boolean;
  ignoreOptionalBasmala?: boolean;
}

interface Alignment {
  start: number;
  end: number;
  confidence: number;
}

const BASMALA_TOKENS = ["بسم", "الله", "الرحمن", "الرحيم"];
const EMPTY_DIAGNOSTICS: NativeMatcherDiagnostics = {
  mode: "tracking",
  underRunWords: 0,
  overRunWords: 0,
  repeatedPosition: false,
  skippedRegionWords: 0,
  unmatchedTokenCount: 0,
  unmatched: true,
};

function tokens(text: string) {
  return normalizeQuranText(text).split(" ").filter(Boolean);
}

function similarity(heard: string, expected: string) {
  if (!heard || !expected) return 0;
  if (heard === expected) return 1;
  const rows = Array.from({ length: heard.length + 1 }, () => new Array<number>(expected.length + 1).fill(0));
  for (let i = 0; i <= heard.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= expected.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= heard.length; i += 1) {
    for (let j = 1; j <= expected.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (heard[i - 1] === expected[j - 1] ? 0 : 1),
      );
    }
  }
  return Math.max(0, 1 - rows[heard.length][expected.length] / Math.max(heard.length, expected.length, 1));
}

function tokenCost(heard: string, expected: string) {
  if (heard === expected) return 0;
  const distance = 1 - similarity(heard, expected);
  return distance <= 0.25 ? 0.35 + distance : 1;
}

function sequenceCost(heard: string[], expected: string[]) {
  const dp = Array.from({ length: heard.length + 1 }, () => new Array<number>(expected.length + 1).fill(0));
  for (let i = 0; i <= heard.length; i += 1) dp[i][0] = i * 0.9;
  for (let j = 0; j <= expected.length; j += 1) dp[0][j] = j * 0.9;
  for (let i = 1; i <= heard.length; i += 1) {
    for (let j = 1; j <= expected.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 0.9,
        dp[i][j - 1] + 0.9,
        dp[i - 1][j - 1] + tokenCost(heard[i - 1], expected[j - 1]),
      );
    }
  }
  return dp[heard.length][expected.length];
}

/**
 * Native live matcher. It tracks canonical word positions only; confidence and
 * diagnostics are internal alignment data, not a recitation score.
 */
export class NativeQuranLiveMatcher {
  private committed = 0;
  private committedCurrent: CanonicalQuranWord | null = null;
  private provisional: CanonicalQuranWord | null = null;
  private pendingStart = -1;
  private pendingEnd = -1;
  private stability = 0;
  private lastEvent = "";
  private readonly confirmedIndices = new Set<number>();
  private mode: "tracking" | "recovery" = "tracking";
  private mismatchCount = 0;
  private lastDiagnostics = EMPTY_DIAGNOSTICS;
  private readonly options: Required<NativeMatcherOptions>;
  private readonly tokensByItem = new Map<string, string[]>();

  constructor(private words: CanonicalQuranWord[], options: NativeMatcherOptions = {}) {
    this.options = {
      trackingForwardWindow: options.trackingForwardWindow ?? 16,
      trackingBackwardWindow: options.trackingBackwardWindow ?? 3,
      recoveryMismatchLimit: options.recoveryMismatchLimit ?? 3,
      commitStability: options.commitStability ?? 2,
      confidenceThreshold: options.confidenceThreshold ?? 0.68,
      generalPositionFollowing: options.generalPositionFollowing ?? true,
      ignoreOptionalBasmala: options.ignoreOptionalBasmala ?? true,
    };
  }

  appendWords(nextWords: CanonicalQuranWord[]) {
    const known = new Set(this.words.map((word) => `${word.verseKey}:${word.position}`));
    for (const word of nextWords) {
      const key = `${word.verseKey}:${word.position}`;
      if (!known.has(key)) {
        this.words.push(word);
        known.add(key);
      }
    }
  }

  setStartPosition(position: { verseKey: string; wordPosition?: number }) {
    const index = this.words.findIndex((word) =>
      word.verseKey === position.verseKey
      && (position.wordPosition === undefined || word.position >= position.wordPosition),
    );
    if (index < 0) return false;
    this.committed = index;
    this.committedCurrent = index > 0 ? this.words[index - 1] : null;
    this.provisional = null;
    this.pendingStart = index;
    this.pendingEnd = index;
    this.stability = 0;
    this.lastEvent = "";
    this.confirmedIndices.clear();
    this.mode = "tracking";
    this.mismatchCount = 0;
    this.tokensByItem.clear();
    this.lastDiagnostics = { ...EMPTY_DIAGNOSTICS, mode: this.mode };
    return true;
  }

  private optionalBasmalaIsAhead() {
    if (!this.options.ignoreOptionalBasmala) return false;
    const nearby = this.words.slice(
      Math.max(0, this.committed - 1),
      Math.min(this.words.length, this.committed + this.options.trackingForwardWindow + 5),
    );
    return nearby.some((word) =>
      word.ayah === 1
      && word.position === 1
      && word.surah !== 1
      && word.surah !== 9
      && word.normalizedText !== "بسم",
    );
  }

  private eventWithoutOptionalBasmala(text: string) {
    if (!this.optionalBasmalaIsAhead()) return text;
    const heard = tokens(text);
    let prefixLength = 0;
    while (
      prefixLength < heard.length
      && prefixLength < BASMALA_TOKENS.length
      && heard[prefixLength] === BASMALA_TOKENS[prefixLength]
    ) {
      prefixLength += 1;
    }
    return prefixLength ? heard.slice(prefixLength).join(" ") : text;
  }

  private findAlignment(heard: string[]): Alignment | null {
    if (!heard.length) return null;
    const anchor = this.committed;
    let first = Math.max(0, anchor - this.options.trackingBackwardWindow);
    let last = Math.min(this.words.length - 1, anchor + this.options.trackingForwardWindow);
    if (this.mode === "recovery") {
      first = Math.max(0, anchor - this.options.trackingBackwardWindow);
      last = Math.min(this.words.length - 1, anchor + (this.options.generalPositionFollowing ? 48 : 24));
    }
    let best: Alignment | null = null;
    for (let start = first; start <= last; start += 1) {
      for (let length = Math.max(1, heard.length - 1); length <= heard.length + 2; length += 1) {
        const end = start + length;
        if (end > this.words.length) continue;
        const expected = this.words.slice(start, end).map((word) => word.normalizedText);
        const confidence = 1 - sequenceCost(heard, expected) / Math.max(heard.length, expected.length, 1);
        const adjusted = confidence - Math.abs(start - this.committed) * 0.006;
        if (!best || adjusted > best.confidence) best = { start, end, confidence: adjusted };
      }
    }
    return best;
  }

  private revealMap() {
    const revealed = new Map<string, number>();
    for (const index of this.confirmedIndices) {
      const word = this.words[index];
      revealed.set(word.verseKey, (revealed.get(word.verseKey) ?? 0) + 1);
    }
    return revealed;
  }

  private usefulTokens(text: string, itemId: string, isFinal: boolean) {
    const next = tokens(text);
    const previous = this.tokensByItem.get(itemId);
    if (isFinal) {
      this.tokensByItem.delete(itemId);
      return next;
    }
    this.tokensByItem.set(itemId, next);
    if (!previous || next.length <= previous.length) return next;
    const isExtension = previous.every((token, index) => next[index] === token);
    return isExtension ? next.slice(previous.length) : next;
  }

  feed(text: string, itemId: string, isFinal: boolean): NativeRecitationMatch {
    const eventKey = `${itemId}:${isFinal}:${text}`;
    if (eventKey === this.lastEvent) return this.result(0, false, this.lastDiagnostics);
    this.lastEvent = eventKey;
    const canonicalText = this.eventWithoutOptionalBasmala(text);
    const heard = this.usefulTokens(canonicalText, itemId, isFinal);
    if (!heard.length && canonicalText !== text) {
      return this.result(1, false, { ...EMPTY_DIAGNOSTICS, mode: this.mode, unmatched: false });
    }
    const alignment = this.findAlignment(heard);
    if (!alignment || alignment.confidence < this.options.confidenceThreshold) {
      this.mismatchCount += 1;
      this.provisional = null;
      if (this.mode === "tracking" && this.mismatchCount >= this.options.recoveryMismatchLimit) this.mode = "recovery";
      return this.result(alignment?.confidence ?? 0, false, {
        ...EMPTY_DIAGNOSTICS,
        mode: this.mode,
        unmatchedTokenCount: heard.length,
      });
    }
    this.mismatchCount = 0;
    this.mode = "tracking";
    const previousCommitted = this.committed;
    if (alignment.start === this.pendingStart && alignment.end >= this.pendingEnd) this.stability += 1;
    else this.stability = 1;
    this.pendingStart = alignment.start;
    this.pendingEnd = alignment.end;
    this.provisional = this.words[alignment.end - 1] ?? null;
    // Partials may move the provisional pointer, never permanently reveal words.
    const stable = isFinal;
    if (stable) {
      for (let index = alignment.start; index < alignment.end; index += 1) {
        this.confirmedIndices.add(index);
      }
    }
    if (stable && alignment.end > this.committed) {
      this.committed = alignment.end;
      this.committedCurrent = this.words[this.committed - 1] ?? null;
      this.provisional = null;
    }
    const spanWords = alignment.end - alignment.start;
    return this.result(alignment.confidence, stable, {
      mode: this.mode,
      underRunWords: Math.max(0, previousCommitted - alignment.end),
      overRunWords: Math.max(0, alignment.start - previousCommitted - heard.length),
      repeatedPosition: alignment.end <= previousCommitted,
      skippedRegionWords: Math.max(0, alignment.start - previousCommitted),
      unmatchedTokenCount: Math.max(0, heard.length - spanWords),
      unmatched: false,
    });
  }

  private result(
    confidence: number,
    stable: boolean,
    diagnostics: NativeMatcherDiagnostics,
  ): NativeRecitationMatch {
    this.lastDiagnostics = diagnostics;
    return {
      current: this.provisional ?? this.committedCurrent,
      revealedWords: this.revealMap(),
      confidence,
      stable,
      progressionWords: this.confirmedIndices.size,
      totalWords: this.words.length,
      diagnostics,
    };
  }
}
