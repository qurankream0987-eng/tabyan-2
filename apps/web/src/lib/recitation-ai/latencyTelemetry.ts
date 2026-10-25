/**
 * قياسات كمون محلية آمنة: أرقام فقط، بلا صوت أو نص أو رموز اعتماد.
 * نافذة دائرية ثابتة الحجم حتى لا تنمو الذاكرة أو كلفة الترتيب مع طول الجلسة.
 */
export class RollingSamples {
  private readonly values: number[] = [];
  private next = 0;
  private total = 0;
  private maxSeen: number | null = null;

  constructor(private readonly capacity = 256) {}

  push(value: number) {
    if (!Number.isFinite(value)) return;
    this.total += 1;
    this.maxSeen = this.maxSeen === null ? value : Math.max(this.maxSeen, value);
    if (this.values.length < this.capacity) this.values.push(value);
    else this.values[this.next] = value;
    this.next = (this.next + 1) % this.capacity;
  }

  get count() {
    return this.total;
  }

  percentile(p: number): number | null {
    if (!this.values.length) return null;
    const sorted = [...this.values].sort((a, b) => a - b);
    return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))]);
  }

  min(): number | null {
    return this.values.length ? Math.round(Math.min(...this.values)) : null;
  }

  /** أسوأ قيمة منذ بداية الجلسة، لا داخل النافذة فقط — لرصد التوقفات الطويلة. */
  max(): number | null {
    return this.maxSeen === null ? null : Math.round(this.maxSeen);
  }

  clear() {
    this.values.length = 0;
    this.next = 0;
    this.total = 0;
    this.maxSeen = null;
  }
}

export interface RecitationTelemetrySnapshot {
  audioCaptureMs: number | null;
  firstPartialMs: number | null;
  matchP50Ms: number | null;
  matchP95Ms: number | null;
  renderP50Ms: number | null;
  renderP95Ms: number | null;
  totalFeedbackP50Ms: number | null;
  totalFeedbackP95Ms: number | null;
  totalFeedbackMaxMs: number | null;
  /** أطول فترة كلام نشط بلا أي delta من المزود — مؤشر التوقف الطويل. */
  longestSpeechWithoutDeltaMs: number;
  forcedCommitCount: number;
  reconnectCount: number;
  lostPositionCount: number;
}

/**
 * Utterance segmentation for providers that transcribe only after a client
 * commit (OpenAI with turn_detection: null). Without a cap, continuous
 * recitation with no ≥700ms silence never commits, so the provider buffer and
 * the transcript item grow without bound.
 */
export interface UtteranceSegmenterOptions {
  /** RMS below which a frame counts as silence. */
  silenceRms: number;
  /** Silence duration that ends an utterance. */
  silenceCommitMs: number;
  /** After this much continuous speech, commit at the next dip between words. */
  softMaxUtteranceMs: number;
  /** Hard ceiling: commit even without a dip. */
  hardMaxUtteranceMs: number;
  /** A frame counts as a dip when RMS falls below this fraction of recent speech RMS. */
  dipRatio: number;
}

export const DEFAULT_SEGMENTER_OPTIONS: UtteranceSegmenterOptions = {
  silenceRms: 0.02,
  silenceCommitMs: 700,
  softMaxUtteranceMs: 4_000,
  hardMaxUtteranceMs: 8_000,
  dipRatio: 0.35,
};

export type SegmenterDecision = null | "silence" | "dip" | "hard";

export class UtteranceSegmenter {
  private utteranceStartedAt: number | null = null;
  private silenceStartedAt: number | null = null;
  private speechRmsAverage = 0;
  forcedCommitCount = 0;

  constructor(private readonly options: UtteranceSegmenterOptions = DEFAULT_SEGMENTER_OPTIONS) {}

  reset() {
    this.utteranceStartedAt = null;
    this.silenceStartedAt = null;
    this.speechRmsAverage = 0;
    this.forcedCommitCount = 0;
  }

  /** Returns why the current utterance should be committed now, or null. */
  observe(rms: number, now: number): SegmenterDecision {
    const speech = rms >= this.options.silenceRms;
    if (speech) {
      this.utteranceStartedAt ??= now;
      this.silenceStartedAt = null;
      this.speechRmsAverage = this.speechRmsAverage === 0 ? rms : this.speechRmsAverage * 0.9 + rms * 0.1;
    } else if (this.utteranceStartedAt !== null) {
      this.silenceStartedAt ??= now;
      if (now - this.silenceStartedAt >= this.options.silenceCommitMs) return this.commit("silence");
    }
    if (this.utteranceStartedAt === null) return null;
    const length = now - this.utteranceStartedAt;
    if (length >= this.options.hardMaxUtteranceMs) return this.commit("hard");
    if (length >= this.options.softMaxUtteranceMs && rms < this.speechRmsAverage * this.options.dipRatio) {
      return this.commit("dip");
    }
    return null;
  }

  private commit(reason: Exclude<SegmenterDecision, null>): SegmenterDecision {
    this.utteranceStartedAt = null;
    this.silenceStartedAt = null;
    if (reason !== "silence") this.forcedCommitCount += 1;
    return reason;
  }
}
