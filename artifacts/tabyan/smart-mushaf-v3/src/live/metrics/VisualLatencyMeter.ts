/**
 * @license
 * Tabyan Smart Mushaf — client visual latency meter
 *
 * Measures, per position event, the client-side path independent of any
 * provider:  received → state applied → React commit of the target glyph →
 * painted (the frame after commit). Network and recognition time are NOT
 * included; this proves the Mushaf reacts as soon as an event arrives.
 */

export interface LatencyStats {
  readonly count: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
  readonly max: number | null;
}

export interface LatencyReport {
  readonly applied: LatencyStats;
  readonly committed: LatencyStats;
  readonly painted: LatencyStats;
  /** Events whose target glyph was not mounted (off-screen pages). */
  readonly notVisible: number;
}

interface PendingSample {
  readonly receivedAt: number;
  appliedAt: number | null;
  committedAt: number | null;
}

const MAX_SAMPLES = 5000;

export function summarize(samples: readonly number[]): LatencyStats {
  if (samples.length === 0) return { count: 0, p50: null, p95: null, p99: null, max: null };
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (fraction: number) =>
    Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] * 100) / 100;
  return { count: sorted.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: at(1) };
}

export class VisualLatencyMeter {
  private readonly pending = new Map<number, PendingSample>();
  private applied: number[] = [];
  private committed: number[] = [];
  private painted: number[] = [];
  private notVisible = 0;
  private enabled: boolean;

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly afterPaint: (callback: () => void) => void = defaultAfterPaint,
    enabled = true,
  ) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.pending.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** The event for `ordinal` arrived. Returns the timestamp to pass on. */
  received(ordinal: number): number {
    const at = this.now();
    if (!this.enabled || ordinal < 0) return at;
    // A newer event for a word still in flight supersedes the older sample.
    this.pending.set(ordinal, { receivedAt: at, appliedAt: null, committedAt: null });
    return at;
  }

  /** The store applied the event; `mounted` says whether the glyph is on screen. */
  appliedTo(ordinal: number, mounted: boolean): void {
    const sample = this.pending.get(ordinal);
    if (!sample) return;
    const at = this.now();
    sample.appliedAt = at;
    push(this.applied, at - sample.receivedAt);
    if (!mounted) {
      this.notVisible += 1;
      this.pending.delete(ordinal);
    }
  }

  /** The glyph presenting `ordinal` committed its new visual state. */
  committedFor(ordinal: number): void {
    const sample = this.pending.get(ordinal);
    if (!sample || sample.appliedAt === null || sample.committedAt !== null) return;
    sample.committedAt = this.now();
    push(this.committed, sample.committedAt - sample.receivedAt);
    this.pending.delete(ordinal);
    this.afterPaint(() => push(this.painted, this.now() - sample.receivedAt));
  }

  /** Drops an in-flight sample whose update produced no visual change. */
  discard(ordinal: number): void {
    this.pending.delete(ordinal);
  }

  report(): LatencyReport {
    return {
      applied: summarize(this.applied),
      committed: summarize(this.committed),
      painted: summarize(this.painted),
      notVisible: this.notVisible,
    };
  }

  reset(): void {
    this.pending.clear();
    this.applied = [];
    this.committed = [];
    this.painted = [];
    this.notVisible = 0;
  }
}

function push(samples: number[], value: number): void {
  samples.push(value);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

/** Fires after the next frame has been presented (rAF, then a macrotask). */
function defaultAfterPaint(callback: () => void): void {
  if (typeof requestAnimationFrame !== 'function' || typeof MessageChannel !== 'function') {
    setTimeout(callback, 0);
    return;
  }
  requestAnimationFrame(() => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      callback();
    };
    channel.port2.postMessage(null);
  });
}
