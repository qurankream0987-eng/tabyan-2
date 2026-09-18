import { normalizeQuranText } from "./normalizer";
import type { CanonicalQuranWord } from "./canonicalWords";
import type { TranscriptEvent } from "./types";

export interface LiveMatch {
  current: CanonicalQuranWord | null;
  provisional: CanonicalQuranWord | null;
  revealedWords: Map<string, number>;
  confidence: number;
  stability: number;
  stable: boolean;
  mode: "tracking" | "recovery";
  matcherMs: number;
  diagnostics: MatcherDiagnostics;
}

export interface MatcherDiagnostics {
  matcherUpdateCount: number;
  matcherMatchCount: number;
  matcherNoMatchCount: number;
  provisionalRevealCount: number;
  committedRevealCount: number;
  provisionalRollbackCount: number;
  trackingModeMatches: number;
  recoveryModeEntries: number;
  recoverySuccesses: number;
  falseForwardJumps: number;
  backtracks: number;
}

export interface QuranLiveMatcherOptions {
  trackingForwardWindow?: number;
  trackingBackwardWindow?: number;
  recoveryMismatchLimit?: number;
  commitStability?: number;
  confidenceThreshold?: number;
  /** يوسّع recovery للأمام ضمن corpus المتحرك في GENERAL فقط. */
  generalPositionFollowing?: boolean;
  /** يتجاوز البسملة المنطوقة إن لم تكن ممثلة كسلسلة كلمات في canonical. */
  ignoreOptionalBasmala?: boolean;
}

interface Alignment {
  start: number;
  end: number;
  confidence: number;
}

const BASMALA_TOKENS = ["بسم", "الله", "الرحمن", "الرحيم"];

function tokens(text: string) {
  return normalizeQuranText(text).split(" ").filter(Boolean);
}

function charDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return rows[a.length][b.length] / Math.max(a.length, b.length, 1);
}

function tokenCost(heard: string, expected: string) {
  if (heard === expected) return 0;
  const distance = charDistance(heard, expected);
  return distance <= 0.25 ? 0.35 + distance : 1;
}

/** Weighted token edit distance: substitution is softer only for close ASR spellings. */
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

export class QuranLiveMatcher {
  private committed = 0;
  private committedCurrent: CanonicalQuranWord | null = null;
  private provisional: CanonicalQuranWord | null = null;
  private pendingStart = -1;
  private pendingEnd = -1;
  private stability = 0;
  private lastEvent = "";
  private mode: "tracking" | "recovery" = "tracking";
  private mismatchCount = 0;
  private readonly options: Required<QuranLiveMatcherOptions>;
  private readonly stats: MatcherDiagnostics = {
    matcherUpdateCount: 0,
    matcherMatchCount: 0,
    matcherNoMatchCount: 0,
    provisionalRevealCount: 0,
    committedRevealCount: 0,
    provisionalRollbackCount: 0,
    trackingModeMatches: 0,
    recoveryModeEntries: 0,
    recoverySuccesses: 0,
    falseForwardJumps: 0,
    backtracks: 0,
  };
  private readonly tokensByItem = new Map<string, string[]>();

  constructor(
    private words: CanonicalQuranWord[],
    options: QuranLiveMatcherOptions = {},
  ) {
    this.options = {
      trackingForwardWindow: options.trackingForwardWindow ?? 16,
      trackingBackwardWindow: options.trackingBackwardWindow ?? 3,
      recoveryMismatchLimit: options.recoveryMismatchLimit ?? 3,
      commitStability: options.commitStability ?? 2,
      confidenceThreshold: options.confidenceThreshold ?? 0.68,
      generalPositionFollowing: options.generalPositionFollowing ?? false,
      ignoreOptionalBasmala: options.ignoreOptionalBasmala ?? false,
    };
  }

  /**
   * يوسّع corpus المطابقة دون إعادة تهيئة المؤشر أو سجل الأحداث.
   * هذا لا يغيّر خوارزمية المحاذاة أو حدودها؛ يضيف فقط كلمات الصفحة التالية
   * بعد أن تصبح جاهزة مسبقاً.
   */
  appendWords(nextWords: CanonicalQuranWord[]) {
    if (!nextWords.length) return;
    const known = new Set(this.words.map((word) => `${word.verseKey}:${word.position}:${word.page}`));
    for (const word of nextWords) {
      const key = `${word.verseKey}:${word.position}:${word.page}`;
      if (!known.has(key)) {
        this.words.push(word);
        known.add(key);
      }
    }
  }

  /**
   * يضع مؤشر المطابقة عند موضع بداية اختياري داخل الـ corpus الحالي.
   * لا يُعدّ هذا تخطياً أو تقدماً مسموعاً؛ الكلمات السابقة تصبح سياقاً
   * مُنجزاً فقط حتى لا تُجبر القراءة من منتصف الصفحة على المرور من أولها.
   */
  setStartPosition(position: { verseKey: string; wordPosition?: number }): boolean {
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
    this.mode = "tracking";
    this.mismatchCount = 0;
    return true;
  }

  /** حدود corpus الحالي للتشخيص التنموي فقط، بلا كشف للنص المسموع. */
  contextBounds() {
    const first = this.words[0] ?? null;
    const last = this.words.at(-1) ?? null;
    return {
      startVerseKey: first?.verseKey ?? null,
      endVerseKey: last?.verseKey ?? null,
      startPage: first?.page ?? null,
      endPage: last?.page ?? null,
    };
  }

  private optionalBasmalaIsAhead() {
    if (!this.options.ignoreOptionalBasmala) return false;
    const anchor = Math.max(0, this.committed - 1);
    const nearby = this.words.slice(
      anchor,
      Math.min(this.words.length, anchor + this.options.trackingForwardWindow + 5),
    );
    return nearby.some((word) =>
      word.ayah === 1
      && word.position === 1
      && word.surah !== 1
      && word.surah !== 9
      && word.normalizedText !== "بسم",
    );
  }

  private eventWithoutOptionalBasmala(event: TranscriptEvent) {
    if (!this.optionalBasmalaIsAhead()) return event;
    const heard = tokens(event.text);
    let prefixLength = 0;
    while (
      prefixLength < heard.length
      && prefixLength < BASMALA_TOKENS.length
      && heard[prefixLength] === BASMALA_TOKENS[prefixLength]
    ) {
      prefixLength += 1;
    }
    if (!prefixLength) return event;
    return { ...event, text: heard.slice(prefixLength).join(" ") };
  }

  private findAlignment(heard: string[]): Alignment | null {
    if (!heard.length) return null;
    const anchor = this.committed;
    let first = Math.max(0, anchor - this.options.trackingBackwardWindow);
    let last = Math.min(this.words.length - 1, anchor + this.options.trackingForwardWindow);
    if (this.mode === "recovery") {
      if (this.options.generalPositionFollowing) {
        // GENERAL لا يربط الاسترداد بالصفحة السابقة: يبحث داخل نافذة context
        // المتحركة الحالية، بما فيها أول كلمات الصفحة/السورة التالية.
        first = Math.max(0, anchor - this.options.trackingBackwardWindow);
        last = Math.min(this.words.length - 1, anchor + 48);
      } else {
        const anchorWord = this.words[Math.min(anchor, this.words.length - 1)];
        const page = anchorWord?.page;
        const ayah = anchorWord?.ayah;
        const nearby = this.words
          .map((word, index) => ({ word, index }))
          .filter(({ word }) => word.page === page && (Math.abs(word.ayah - (ayah ?? word.ayah)) <= 2));
        if (nearby.length) {
          first = nearby[0].index;
          last = nearby[nearby.length - 1].index;
        } else {
          first = Math.max(0, anchor - 48);
          last = Math.min(this.words.length - 1, anchor + 48);
        }
      }
    }
    let best: Alignment | null = null;

    for (let start = first; start <= last; start += 1) {
      for (let length = Math.max(1, heard.length - 1); length <= heard.length + 2; length += 1) {
        const end = start + length;
        if (end > this.words.length) continue;
        const expected = this.words.slice(start, end).map((word) => word.normalizedText);
        const cost = sequenceCost(heard, expected);
        const confidence = Math.max(0, 1 - cost / Math.max(heard.length, expected.length, 1));
        const adjusted = confidence - Math.abs(start - this.committed) * 0.006;
        if (!best || adjusted > best.confidence) best = { start, end, confidence: adjusted };
      }
    }
    return best;
  }

  private revealMap() {
    const revealed = new Map<string, number>();
    for (let index = 0; index < this.committed; index += 1) {
      const word = this.words[index];
      revealed.set(word.verseKey, Math.max(revealed.get(word.verseKey) ?? 0, word.position));
    }
    return revealed;
  }

  private usefulTokens(event: TranscriptEvent) {
    const next = tokens(event.text);
    const previous = this.tokensByItem.get(event.itemId);
    if (event.isFinal) {
      this.tokensByItem.delete(event.itemId);
      return next;
    }
    this.tokensByItem.set(event.itemId, next);
    if (!previous || next.length <= previous.length) return next;
    const isExtension = previous.every((token, index) => next[index] === token);
    return isExtension ? next.slice(previous.length) : next;
  }

  feed(event: TranscriptEvent): LiveMatch {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.stats.matcherUpdateCount += 1;
    const eventKey = `${event.itemId}:${event.isFinal}:${event.text}`;
    if (eventKey === this.lastEvent) {
      return this.result(0, false, startedAt);
    }
    this.lastEvent = eventKey;
    const canonicalEvent = this.eventWithoutOptionalBasmala(event);
    const heard = this.usefulTokens(canonicalEvent);
    if (!heard.length && canonicalEvent.text !== event.text) {
      return this.result(1, false, startedAt);
    }
    const alignment = this.findAlignment(heard);
    if (!alignment || alignment.confidence < this.options.confidenceThreshold) {
      this.stats.matcherNoMatchCount += 1;
      this.mismatchCount += 1;
      if (this.provisional) this.stats.provisionalRollbackCount += 1;
      this.provisional = null;
      if (this.mode === "tracking" && this.mismatchCount >= this.options.recoveryMismatchLimit) {
        this.mode = "recovery";
        this.stats.recoveryModeEntries += 1;
      }
      return this.result(alignment?.confidence ?? 0, false, startedAt);
    }

    const wasRecovery = this.mode === "recovery";
    this.mismatchCount = 0;
    this.mode = "tracking";
    if (wasRecovery) this.stats.recoverySuccesses += 1;
    this.stats.matcherMatchCount += 1;
    this.stats.trackingModeMatches += 1;
    if (alignment.start === this.pendingStart && alignment.end >= this.pendingEnd) this.stability += 1;
    else this.stability = 1;
    this.pendingStart = alignment.start;
    this.pendingEnd = alignment.end;
    const previousProvisional = this.provisional;
    this.provisional = this.words[alignment.end - 1] ?? null;
    if (this.provisional && this.provisional !== previousProvisional) {
      this.stats.provisionalRevealCount += 1;
    }

    const exactSingle = alignment.confidence >= 0.99 && alignment.end - alignment.start === 1;
    const stable = event.isFinal || exactSingle
      || (alignment.confidence >= 0.86 && this.stability >= this.options.commitStability);
    if (stable && alignment.end > this.committed) {
      this.stats.committedRevealCount += alignment.end - this.committed;
      this.committed = alignment.end;
      this.committedCurrent = this.words[this.committed - 1] ?? null;
      this.provisional = null;
    } else if (stable && alignment.end < this.committed) {
      this.stats.backtracks += 1;
    }
    return this.result(alignment.confidence, stable, startedAt);
  }

  private result(confidence: number, stable: boolean, startedAt: number): LiveMatch {
    const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      current: this.provisional ?? this.committedCurrent,
      provisional: this.provisional,
      revealedWords: this.revealMap(),
      confidence,
      stability: this.stability,
      stable,
      mode: this.mode,
      matcherMs: Math.max(0, endedAt - startedAt),
      diagnostics: { ...this.stats },
    };
  }
}