/**
 * @license
 * Tabyan Smart Mushaf — Nabr (QRC) live adapter
 *
 * Translates the authenticated Tabyan gateway's QRC observations into
 * canonical live events. The browser never holds Nabr credentials: it speaks
 * only to Tabyan's server gateway, which owns the provider WebSocket.
 *
 * Translation policy (see research/TABYAN_NABR_QRC_EVENT_SEMANTICS.md):
 * the only live capture shows ~1 Hz results, repeated coordinates, one
 * backward move, and no event ids or confidence. The documented decision is
 * to keep QRC positions unconfirmed, so the default policy emits the current
 * position as a CANDIDATE only. `confirm-correct-words` additionally turns
 * explicit `correct_words` claims into confirmations; it is opt-in until the
 * live acceptance phase proves it.
 *
 * Word segmentation: QRC's word index space is not yet verified against the
 * Tanzil WordKeys. With 'qdc', indices are mapped through the same explicit
 * QCF alignment used by the renderer (four joined words).
 */

import type { NabrQrcGatewayObservation } from '@workspace/tabyan-domain';
import type { WordKey } from '../../quran/domain/types';
import type { CanonicalWordIndex } from '../../quran/canonical/CanonicalWordIndex';
import { alignQcfWord } from '../../quran/layout/qcfAlignment';
import {
  wordPositionFields,
  type LiveEventBody,
  type LiveRecitationEvent,
  type ProviderErrorCode,
} from '../contracts/events';
import type {
  LiveAudioFrame,
  LiveEventListener,
  LiveProviderCapabilities,
  LiveProviderConnectionState,
  LiveRecitationProvider,
  LiveSessionConfig,
} from '../contracts/provider';
import { NabrGatewayError, NabrQrcProvider } from '../../providers/nabr/NabrQrcProvider';
import type { RawProviderObservation } from '../../providers/contracts/types';

export type NabrTranslationPolicy = 'candidate-only' | 'confirm-correct-words';
export type NabrWordSegmentation = 'tanzil' | 'qdc';

type EventBody = LiveEventBody;

interface WireIndices {
  readonly chapter_index: number;
  readonly verse_index: number;
  readonly word_index: number;
}

/** Wire coordinates (1-based) → canonical WordKeys; null when not canonical. */
export function wireToCanonical(
  indices: WireIndices,
  segmentation: NabrWordSegmentation,
  index: CanonicalWordIndex,
): readonly WordKey[] | null {
  const verseKey = `${indices.chapter_index}:${indices.verse_index}`;
  const keys = segmentation === 'qdc'
    ? alignQcfWord(verseKey, indices.word_index, 0).wordKeys
    : [{ surah: indices.chapter_index, ayah: indices.verse_index, wordIndex: indices.word_index }];
  if (keys.length === 0 || keys.some((key) => !index.isValid(key))) return null;
  return keys;
}

/** Pure translation of one gateway observation into canonical event bodies. */
export function translateNabrObservation(
  observation: NabrQrcGatewayObservation,
  policy: NabrTranslationPolicy,
  segmentation: NabrWordSegmentation,
  index: CanonicalWordIndex,
): EventBody[] {
  const events: EventBody[] = [];
  const confidence = observation.confidence ?? 0.6;
  const audioTimestamp = observation.providerTimestamp ?? null;

  if (policy === 'confirm-correct-words') {
    let furthest: WordKey | null = null;
    for (const position of observation.correctWords) {
      const keys = wireToCanonical(position, segmentation, index);
      if (!keys) continue;
      for (const key of keys) {
        events.push({ type: 'word.confirmed', ...wordPositionFields(key, 'confirmed', confidence, audioTimestamp) });
        if (!furthest || index.distance(furthest, key) > 0) furthest = key;
      }
    }
    if (furthest) {
      events.push({ type: 'position.confirmed', ...wordPositionFields(furthest, 'confirmed', confidence, audioTimestamp) });
    }
  }

  const current = wireToCanonical(observation.currentPosition, segmentation, index);
  if (current) {
    events.push({ type: 'position.candidate', ...wordPositionFields(current[0], 'candidate', confidence, audioTimestamp) });
  }

  for (const position of observation.skippedWords) {
    for (const key of wireToCanonical(position, segmentation, index) ?? []) {
      events.push({
        type: 'word.flagged',
        wordKey: `${key.surah}:${key.ayah}:${key.wordIndex}`,
        surah: key.surah,
        ayah: key.ayah,
        wordIndex: key.wordIndex,
        flag: 'SKIPPED',
      });
    }
  }
  for (const mistake of [...observation.letterMistakes, ...observation.tajweedMistakes]) {
    for (const key of wireToCanonical(mistake.position, segmentation, index) ?? []) {
      events.push({
        type: 'word.flagged',
        wordKey: `${key.surah}:${key.ayah}:${key.wordIndex}`,
        surah: key.surah,
        ayah: key.ayah,
        wordIndex: key.wordIndex,
        flag: 'MISTAKE',
      });
    }
  }
  return events;
}

const ERROR_CODES: Readonly<Record<string, ProviderErrorCode>> = Object.freeze({
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  UNAVAILABLE: 'UNAVAILABLE',
  PROTOCOL: 'PROTOCOL',
  RATE_LIMIT: 'RATE_LIMIT',
});

export interface NabrLiveAdapterOptions {
  readonly policy?: NabrTranslationPolicy;
  readonly segmentation?: NabrWordSegmentation;
  /** Where to resume after a reconnect (the tracker's next expected word). */
  readonly resumeAnchor?: () => WordKey | null;
  readonly maxReconnectAttempts?: number;
  readonly reconnectDelayMs?: (attempt: number) => number;
  readonly createGatewayClient?: () => NabrQrcProvider;
}

export class NabrLiveAdapter implements LiveRecitationProvider {
  readonly kind = 'nabr' as const;
  readonly capabilities: LiveProviderCapabilities = Object.freeze({
    consumesAudio: true,
    incrementalWords: false, // unproven: one live capture showed ~1 Hz results
    candidatePositions: true,
    mistakeFlags: true,
    locatesWithinScope: false,
  });

  private readonly listeners = new Set<LiveEventListener>();
  private client: NabrQrcProvider | null = null;
  private clientSubscriptions: (() => void)[] = [];
  private state: LiveProviderConnectionState = 'idle';
  private config: LiveSessionConfig | null = null;
  private sessionId = '';
  private generation = 0;
  private seq = 0;
  private paused = false;
  private stopped = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly policy: NabrTranslationPolicy;
  private readonly segmentation: NabrWordSegmentation;

  constructor(private readonly index: CanonicalWordIndex, private readonly options: NabrLiveAdapterOptions = {}) {
    this.policy = options.policy ?? 'candidate-only';
    this.segmentation = options.segmentation ?? 'tanzil';
  }

  getConnectionState(): LiveProviderConnectionState {
    return this.state;
  }

  subscribeToEvents(listener: LiveEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startSession(config: LiveSessionConfig): Promise<void> {
    this.stopped = false;
    this.paused = false;
    this.config = config;
    this.sessionId = config.sessionId;
    this.generation = 0;
    this.seq = 0;
    this.reconnectAttempts = 0;
    this.state = 'connecting';
    await this.open(config.anchor);
    this.emit({ type: 'session.ready' });
    this.emit({ type: 'connection.changed', phase: 'connected' });
  }

  pushAudioFrame(frame: LiveAudioFrame): void {
    if (this.paused || this.state !== 'streaming' && this.state !== 'ready') return;
    const client = this.client;
    if (!client) return;
    this.state = 'streaming';
    void client.pushAudio({
      pcmData: frame.pcm,
      sampleRate: 16000,
      channels: 1,
      timestamp: frame.captureTimestamp,
      captureTimestamp: frame.captureTimestamp,
      speechState: frame.speech ? 'SPEAKING' : 'SILENT',
    });
  }

  pause(): void {
    this.paused = true;
    if (this.state === 'streaming' || this.state === 'ready') this.state = 'paused';
  }

  resume(): void {
    this.paused = false;
    if (this.state === 'paused') this.state = 'ready';
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    await this.closeClient();
    this.state = 'closed';
  }

  private async open(anchor: WordKey): Promise<void> {
    await this.closeClient();
    const client = this.options.createGatewayClient?.() ?? new NabrQrcProvider();
    this.client = client;
    this.clientSubscriptions = [
      client.onObservation((raw) => this.onObservation(client, raw)),
      client.onError((error) => this.onClientError(client, error)),
    ];
    await client.connect();
    await client.startSession({
      sessionId: this.providerSessionId(),
      surahNumber: anchor.surah,
      startAyah: anchor.ayah,
      startWordIndex: anchor.wordIndex,
    });
    this.state = this.paused ? 'paused' : 'ready';
  }

  private providerSessionId(): string {
    // The gateway accepts [A-Za-z0-9_-]; the canonical id may contain '~'.
    return this.sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  }

  private async closeClient(): Promise<void> {
    for (const unsubscribe of this.clientSubscriptions) unsubscribe();
    this.clientSubscriptions = [];
    const client = this.client;
    this.client = null;
    if (client) {
      await client.resetSession().catch(() => {});
      await client.disconnect().catch(() => {});
    }
  }

  private onObservation(client: NabrQrcProvider, raw: RawProviderObservation): void {
    if (client !== this.client || this.paused || this.stopped || !raw.qrc_observation) return;
    for (const body of translateNabrObservation(raw.qrc_observation, this.policy, this.segmentation, this.index)) {
      this.emit(body);
    }
  }

  private onClientError(client: NabrQrcProvider, error: Error): void {
    if (client !== this.client || this.stopped) return;
    const failure = error instanceof NabrGatewayError ? error.failure : 'UNKNOWN';
    const code = ERROR_CODES[failure] ?? 'UNKNOWN';
    const recoverable = code === 'NETWORK' && this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 3);
    this.emit({ type: 'provider.error', code, recoverable });
    if (!recoverable) {
      this.state = 'error';
      return;
    }
    this.state = 'reconnecting';
    this.emit({ type: 'connection.changed', phase: 'reconnecting' });
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    const delay = this.options.reconnectDelayMs?.(this.reconnectAttempts) ?? Math.min(4000, 400 * 2 ** (this.reconnectAttempts - 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopped || !this.config) return;
      // A new provider session, namespaced under ours, resuming where the reader is.
      this.generation += 1;
      this.sessionId = `${this.config.sessionId}~r${this.generation}`;
      this.seq = 0;
      const anchor = this.options.resumeAnchor?.() ?? this.config.anchor;
      this.open(anchor).then(
        () => {
          this.reconnectAttempts = 0;
          this.emit({ type: 'connection.changed', phase: 'connected' });
        },
        () => {
          if (this.stopped) return;
          if (this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 3)) this.scheduleReconnect();
          else {
            this.state = 'error';
            this.emit({ type: 'provider.error', code: 'NETWORK', recoverable: false });
          }
        },
      );
    }, delay);
  }

  private emit(body: EventBody): void {
    this.seq += 1;
    const event = { ...body, sessionId: this.sessionId, seq: this.seq, eventTimestamp: Date.now() } as LiveRecitationEvent;
    for (const listener of this.listeners) listener(event);
  }
}
