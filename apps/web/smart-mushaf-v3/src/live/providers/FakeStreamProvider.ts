/**
 * @license
 * Tabyan Smart Mushaf — deterministic local fake stream provider
 *
 * DEVELOPMENT / TEST ONLY. It performs no recognition: it replays a scripted
 * recitation timeline as canonical live events, so the Mushaf front end can be
 * proven to follow word-by-word before any real provider is connected.
 * `createLiveProvider` refuses to construct it in production builds.
 *
 * With `gateOnSpeech`, the timeline only advances while the microphone VAD
 * reports speech, so a developer can recite and watch the cursor follow their
 * voice rhythm (positions are still scripted, not recognized).
 */

import type { WordKey } from '../../quran/domain/types';
import type { CanonicalWordIndex } from '../../quran/canonical/CanonicalWordIndex';
import {
  wordPositionFields,
  type LiveEventBody,
  type LiveRecitationEvent,
  type WordFlag,
} from '../contracts/events';
import type {
  LiveAudioFrame,
  LiveEventListener,
  LiveProviderCapabilities,
  LiveProviderConnectionState,
  LiveRecitationProvider,
  LiveSessionConfig,
} from '../contracts/provider';

export interface FakeStreamScenario {
  readonly name: string;
  /** Time per recited word: 80 / 120 / 200 ms are typical test paces. */
  readonly wordIntervalMs: number;
  /** A candidate is emitted this long before each confirmation (0 = none). */
  readonly candidateLeadMs: number;
  /** Extra rapid candidate updates per word (stress test). */
  readonly rapidCandidates?: number;
  readonly words: number;
  readonly pauses?: readonly { readonly afterWord: number; readonly ms: number }[];
  /** Re-recite the last `back` words after `afterWord` (correction / backtrack). */
  readonly backtracks?: readonly { readonly afterWord: number; readonly back: number }[];
  /** Connection drops after `afterWord` for `ms`; the reciter keeps going meanwhile. */
  readonly disconnects?: readonly { readonly afterWord: number; readonly ms: number }[];
  readonly flags?: readonly { readonly afterWord: number; readonly flag: WordFlag }[];
  readonly gateOnSpeech?: boolean;
}

export const FAKE_STREAM_SCENARIOS = Object.freeze({
  continuous120: { name: 'continuous120', wordIntervalMs: 120, candidateLeadMs: 50, words: 60 },
  continuous80: { name: 'continuous80', wordIntervalMs: 80, candidateLeadMs: 30, words: 80 },
  continuous200: { name: 'continuous200', wordIntervalMs: 200, candidateLeadMs: 80, words: 40 },
  mixed: {
    name: 'mixed',
    wordIntervalMs: 120,
    candidateLeadMs: 50,
    words: 70,
    pauses: [{ afterWord: 12, ms: 900 }],
    backtracks: [{ afterWord: 24, back: 3 }],
    disconnects: [{ afterWord: 40, ms: 600 }],
  },
  rapidCandidates: { name: 'rapidCandidates', wordIntervalMs: 160, candidateLeadMs: 120, rapidCandidates: 4, words: 40 },
  /** Two minutes of continuous recitation at 120 ms per word. */
  marathon: { name: 'marathon', wordIntervalMs: 120, candidateLeadMs: 50, words: 1000 },
  followVoice: { name: 'followVoice', wordIntervalMs: 420, candidateLeadMs: 160, words: 400, gateOnSpeech: true },
} satisfies Record<string, FakeStreamScenario>);

export interface FakeClock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: FakeClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

type Step =
  | { readonly at: number; readonly kind: 'candidate' | 'confirm'; readonly ordinal: number }
  | { readonly at: number; readonly kind: 'flag'; readonly ordinal: number; readonly flag: WordFlag }
  | { readonly at: number; readonly kind: 'drop' }
  | { readonly at: number; readonly kind: 'restore' }
  | { readonly at: number; readonly kind: 'end' };

/** Expands a scenario into an absolute, deterministic timeline. */
export function buildFakeTimeline(scenario: FakeStreamScenario, startOrdinal: number, totalWords: number): Step[] {
  const steps: Step[] = [];
  const interval = scenario.wordIntervalMs;
  let t = interval;
  let ordinal = startOrdinal;
  let recited = 0;
  let offline = false;
  let offlineUntil = 0;

  const pushWord = (target: number) => {
    if (!offline) {
      if (scenario.candidateLeadMs > 0) {
        const extra = scenario.rapidCandidates ?? 0;
        for (let i = extra; i >= 0; i -= 1) {
          const lead = scenario.candidateLeadMs * ((i + 1) / (extra + 1));
          steps.push({ at: Math.max(0, t - lead), kind: 'candidate', ordinal: target });
        }
      }
      steps.push({ at: t, kind: 'confirm', ordinal: target });
    }
    t += interval;
    if (offline && t >= offlineUntil) {
      offline = false;
      steps.push({ at: offlineUntil, kind: 'restore' });
    }
  };

  while (recited < scenario.words && ordinal < totalWords) {
    pushWord(ordinal);
    recited += 1;
    for (const flag of scenario.flags ?? []) {
      if (flag.afterWord === recited && !offline) steps.push({ at: t - interval, kind: 'flag', ordinal, flag: flag.flag });
    }
    for (const pause of scenario.pauses ?? []) if (pause.afterWord === recited) t += pause.ms;
    for (const back of scenario.backtracks ?? []) {
      if (back.afterWord === recited) {
        for (let o = Math.max(startOrdinal, ordinal - back.back + 1); o <= ordinal; o += 1) pushWord(o);
      }
    }
    for (const drop of scenario.disconnects ?? []) {
      if (drop.afterWord === recited) {
        offline = true;
        offlineUntil = t + drop.ms;
        steps.push({ at: t, kind: 'drop' });
      }
    }
    ordinal += 1;
  }
  if (offline) steps.push({ at: offlineUntil, kind: 'restore' });
  steps.push({ at: t, kind: 'end' });
  return steps.sort((a, b) => a.at - b.at);
}

export class FakeStreamProvider implements LiveRecitationProvider {
  readonly kind = 'fake-stream' as const;
  readonly capabilities: LiveProviderCapabilities;
  private readonly listeners = new Set<LiveEventListener>();
  private state: LiveProviderConnectionState = 'idle';
  private steps: Step[] = [];
  private cursor = 0;
  private timer: unknown = null;
  private baseSessionId = '';
  private sessionId = '';
  private generation = 0;
  private seq = 0;
  /** Timeline time already played (ms), and the clock reading it resumed at. */
  private playedMs = 0;
  private playingSince: number | null = null;
  private userPaused = false;
  private speaking = false;

  constructor(
    private readonly index: CanonicalWordIndex,
    private readonly scenario: FakeStreamScenario = FAKE_STREAM_SCENARIOS.continuous120,
    private readonly clock: FakeClock = realClock,
  ) {
    this.capabilities = Object.freeze({
      consumesAudio: scenario.gateOnSpeech === true,
      incrementalWords: true,
      candidatePositions: scenario.candidateLeadMs > 0,
      mistakeFlags: (scenario.flags?.length ?? 0) > 0,
      locatesWithinScope: false,
    });
  }

  getConnectionState(): LiveProviderConnectionState {
    return this.state;
  }

  subscribeToEvents(listener: LiveEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startSession(config: LiveSessionConfig): Promise<void> {
    this.stopTimer();
    const start = this.index.ordinalOf(config.anchor);
    if (start < 0) throw new Error('fake stream anchor is not a canonical word');
    this.steps = buildFakeTimeline(this.scenario, start, this.index.totalWords);
    this.cursor = 0;
    this.baseSessionId = config.sessionId;
    this.sessionId = config.sessionId;
    this.generation = 0;
    this.seq = 0;
    this.playedMs = 0;
    this.playingSince = null;
    this.userPaused = false;
    this.speaking = false;
    this.state = 'ready';
    this.emit({ type: 'session.ready' });
    this.emit({ type: 'connection.changed', phase: 'connected' });
    this.state = 'streaming';
    this.updatePlayback();
  }

  pushAudioFrame(frame: LiveAudioFrame): void {
    if (!this.scenario.gateOnSpeech || frame.speech === this.speaking) return;
    this.speaking = frame.speech;
    this.emit({ type: frame.speech ? 'speech.started' : 'speech.ended' });
    this.updatePlayback();
  }

  pause(): void {
    this.userPaused = true;
    if (this.state === 'streaming') this.state = 'paused';
    this.updatePlayback();
  }

  resume(): void {
    this.userPaused = false;
    if (this.state === 'paused') this.state = 'streaming';
    this.updatePlayback();
  }

  async stop(): Promise<void> {
    this.stopTimer();
    this.playingSince = null;
    this.state = 'closed';
  }

  private shouldPlay(): boolean {
    if (this.userPaused || this.state === 'closed' || this.state === 'idle') return false;
    return !this.scenario.gateOnSpeech || this.speaking;
  }

  private updatePlayback(): void {
    const play = this.shouldPlay();
    if (!play && this.playingSince !== null) {
      this.playedMs += this.clock.now() - this.playingSince;
      this.playingSince = null;
      this.stopTimer();
    } else if (play && this.playingSince === null) {
      this.playingSince = this.clock.now();
      this.schedule();
    }
  }

  private timelineNow(): number {
    return this.playedMs + (this.playingSince === null ? 0 : this.clock.now() - this.playingSince);
  }

  private schedule(): void {
    this.stopTimer();
    const next = this.steps[this.cursor];
    if (!next || this.playingSince === null) return;
    // Absolute targets: timer jitter never accumulates into drift.
    const delay = Math.max(0, next.at - this.timelineNow());
    this.timer = this.clock.setTimeout(() => this.run(), delay);
  }

  private run(): void {
    this.timer = null;
    const now = this.timelineNow();
    while (this.cursor < this.steps.length && this.steps[this.cursor].at <= now) {
      this.execute(this.steps[this.cursor]);
      this.cursor += 1;
      if (this.playingSince === null) return;
    }
    this.schedule();
  }

  private execute(step: Step): void {
    switch (step.kind) {
      case 'candidate':
      case 'confirm': {
        if (this.state === 'reconnecting') return;
        const key = this.index.keyAt(step.ordinal) as WordKey;
        const status = step.kind === 'confirm' ? 'confirmed' : 'candidate';
        this.emit({
          type: step.kind === 'confirm' ? 'position.confirmed' : 'position.candidate',
          ...wordPositionFields(key, status, step.kind === 'confirm' ? 0.96 : 0.6),
        });
        return;
      }
      case 'flag': {
        const key = this.index.keyAt(step.ordinal) as WordKey;
        this.emit({
          type: 'word.flagged',
          wordKey: `${key.surah}:${key.ayah}:${key.wordIndex}`,
          surah: key.surah,
          ayah: key.ayah,
          wordIndex: key.wordIndex,
          flag: step.flag,
        });
        return;
      }
      case 'drop':
        this.emit({ type: 'provider.error', code: 'NETWORK', recoverable: true });
        this.emit({ type: 'connection.changed', phase: 'reconnecting' });
        this.state = 'reconnecting';
        return;
      case 'restore':
        // A real reconnect opens a new provider session with a fresh sequence space.
        this.generation += 1;
        this.sessionId = `${this.baseSessionId}~r${this.generation}`;
        this.seq = 0;
        this.state = this.userPaused ? 'paused' : 'streaming';
        this.emit({ type: 'connection.changed', phase: 'connected' });
        return;
      case 'end':
        this.emit({ type: 'provider.final', text: '' });
        return;
    }
  }

  private emit(event: LiveEventBody): void {
    this.seq += 1;
    const full = {
      ...event,
      sessionId: this.sessionId,
      seq: this.seq,
      eventTimestamp: Date.now(),
    } as LiveRecitationEvent;
    for (const listener of this.listeners) listener(full);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
