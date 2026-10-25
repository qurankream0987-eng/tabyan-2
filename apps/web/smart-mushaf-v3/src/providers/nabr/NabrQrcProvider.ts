/**
 * Smart Mushaf adapter for Tabyan's authenticated server-side QRC gateway.
 * The browser sends only Tabyan auth, canonical start coordinates, and WAV
 * chunks; QRC credentials and the provider WebSocket remain on the server.
 */

import type {
  NabrQrcGatewayObservation,
  NabrQrcGatewayServerMessage,
  NabrQrcIndices,
} from '@workspace/tabyan-domain';
import {
  nabrWireIndicesToProviderObservation,
} from '@workspace/tabyan-domain';
import {
  RecitationProvider,
  ProviderConnectionState,
  ProviderCapabilities,
  RecitationSessionConfig,
  CanonicalAudioFrame,
  RawProviderObservation,
  ObservationListener,
  StateChangeListener,
  ErrorListener,
  ProviderDiagnostics,
} from '../contracts/types';
import { NabrAudioAdapter } from '../../audio/adapters/NabrAudioAdapter';
import { canonicalSessionStartToNabrIndices } from './nabrIndexConversion';

/** Gateway failure, classified. The message is always generic Arabic copy. */
export type NabrGatewayFailure = 'NETWORK' | 'AUTH' | 'UNAVAILABLE' | 'PROTOCOL' | 'RATE_LIMIT' | 'UNKNOWN';

export class NabrGatewayError extends Error {
  constructor(readonly failure: NabrGatewayFailure, message = 'تعذر الاتصال بخدمة التسميع') {
    super(message);
    this.name = 'NabrGatewayError';
  }
}

const GATEWAY_CODE_FAILURES: Readonly<Record<string, NabrGatewayFailure>> = Object.freeze({
  UNAUTHORIZED: 'AUTH',
  AUTH_TIMEOUT: 'AUTH',
  AUTH_ALREADY_STARTED: 'PROTOCOL',
  PROVIDER_UNAVAILABLE: 'UNAVAILABLE',
  SESSION_NOT_READY: 'PROTOCOL',
  SESSION_ALREADY_ACTIVE: 'PROTOCOL',
  BAD_AUDIO_CHUNK: 'PROTOCOL',
  BAD_MESSAGE: 'PROTOCOL',
  BAD_START: 'PROTOCOL',
  UNKNOWN_MESSAGE: 'PROTOCOL',
  INVALID_TEST_AUDIO: 'PROTOCOL',
});

/** Audio waiting in the socket send buffer beyond this is stale; new chunks are dropped. */
const MAX_SOCKET_BUFFERED_BYTES = 6444 * 5; // ≈ 1 s of 200 ms WAV chunks

export interface NabrQrcOptions {
  readonly endpoint?: string;
  /** Test seam only; the application uses the existing Tabyan token store. */
  readonly tokenProvider?: () => string | null;
}

interface PendingControl {
  readonly expected: 'ready' | 'stopped';
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isQrcPosition(value: unknown): value is NabrQrcIndices {
  if (!isRecord(value)) return false;
  return isPositiveInteger(value.chapter_index)
    && value.chapter_index <= 114
    && isPositiveInteger(value.verse_index)
    && isPositiveInteger(value.word_index);
}

function parseGatewayObservation(value: unknown): NabrQrcGatewayObservation | null {
  if (!isRecord(value)
    || !isQrcPosition(value.currentPosition)
    || !Array.isArray(value.correctWords)
    || !Array.isArray(value.skippedWords)
    || !Array.isArray(value.letterMistakes)
    || !Array.isArray(value.tajweedMistakes)
    || !Number.isFinite(value.observedAt)) {
    return null;
  }
  const positionsAreValid = (items: unknown[]) =>
    items.length <= 512 && items.every(isQrcPosition);
  const mistakesAreValid = (items: unknown[]) =>
    items.length <= 512 && items.every((item) =>
      isRecord(item)
      && isQrcPosition(item.position)
      && (item.providerLetterIndex === undefined
        || (typeof item.providerLetterIndex === 'number'
          && Number.isSafeInteger(item.providerLetterIndex)
          && item.providerLetterIndex >= 0))
      && (item.errorCode === undefined || typeof item.errorCode === 'string')
      && (item.description === undefined || typeof item.description === 'string')
      && (item.heard === undefined || typeof item.heard === 'string')
      && (item.ruleName === undefined || typeof item.ruleName === 'string'));
  if (!positionsAreValid(value.correctWords)
    || !positionsAreValid(value.skippedWords)
    || !mistakesAreValid(value.letterMistakes)
    || !mistakesAreValid(value.tajweedMistakes)) {
    return null;
  }
  if (value.providerTimestamp !== undefined && !Number.isFinite(value.providerTimestamp)) return null;
  if (value.confidence !== undefined
    && (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)
      || value.confidence < 0 || value.confidence > 1)) return null;
  if (value.providerEventId !== undefined
    && (typeof value.providerEventId !== 'string' || value.providerEventId.length > 128)) return null;
  return value as unknown as NabrQrcGatewayObservation;
}

function endpointFromPage(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const base = baseUrl.replace(/\/$/, '');
  return `${protocol}//${window.location.host}${base}/api/ws/nabr-qrc-gateway`;
}

function activeAyahPositions(
  positions: readonly NabrQrcIndices[],
  current: NabrQrcIndices,
): number[] {
  return positions
    .filter((position) => position.chapter_index === current.chapter_index
      && position.verse_index === current.verse_index)
    .map((position) => nabrWireIndicesToProviderObservation(position).word_index);
}

function mapGatewayObservation(observation: NabrQrcGatewayObservation): RawProviderObservation {
  const current = nabrWireIndicesToProviderObservation(observation.currentPosition);
  const letterMistakes = observation.letterMistakes
    .filter((mistake) => mistake.position.chapter_index === observation.currentPosition.chapter_index
      && mistake.position.verse_index === observation.currentPosition.verse_index
      && mistake.position.word_index === observation.currentPosition.word_index)
    .map((mistake) => ({
      ...(mistake.providerLetterIndex === undefined ? {} : { letter_index: mistake.providerLetterIndex }),
      ...(mistake.errorCode ? { mistake_type: mistake.errorCode, error_code: mistake.errorCode } : {}),
      ...(mistake.description || mistake.heard
        ? { description: mistake.description ?? mistake.heard }
        : {}),
      ...(mistake.heard ? { heard: mistake.heard } : {}),
    }));
  const tajweedMistakes = observation.tajweedMistakes
    .filter((mistake) => mistake.position.chapter_index === observation.currentPosition.chapter_index
      && mistake.position.verse_index === observation.currentPosition.verse_index
      && mistake.position.word_index === observation.currentPosition.word_index)
    .map((mistake) => ({
      ...(mistake.ruleName ? { rule_name: mistake.ruleName } : {}),
      ...(mistake.errorCode ? { mistake_type: mistake.errorCode, error_code: mistake.errorCode } : {}),
      ...(mistake.description || mistake.heard
        ? { description: mistake.description ?? mistake.heard }
        : {}),
      ...(mistake.heard ? { heard: mistake.heard } : {}),
    }));

  return Object.freeze({
    ...current,
    correct_words: Object.freeze(activeAyahPositions(observation.correctWords, observation.currentPosition)),
    skipped_words: Object.freeze(activeAyahPositions(observation.skippedWords, observation.currentPosition)),
    letter_mistakes: Object.freeze(letterMistakes),
    tajweed_mistakes: Object.freeze(tajweedMistakes),
    ...(observation.confidence === undefined ? {} : { confidence: observation.confidence }),
    timestamp: observation.observedAt,
    qrc_observation: observation,
  });
}

export class NabrQrcProvider implements RecitationProvider {
  private readonly endpoint: string;
  private readonly tokenProvider: () => string | null;
  private connectionState: ProviderConnectionState = 'IDLE';
  private readonly observationListeners = new Set<ObservationListener>();
  private readonly stateListeners = new Set<StateChangeListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly audioAdapter = new NabrAudioAdapter('WAV');
  private socket: WebSocket | null = null;
  private activeConfig: RecitationSessionConfig | null = null;
  private authPending: {
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private pendingControl: PendingControl | null = null;
  private readonly seenProviderEventIds = new Set<string>();
  private audioChunksDropped = 0;

  private diagnostics: ProviderDiagnostics = {
    providerName: 'Nabr QRC — authenticated Tabyan gateway',
    connectionState: 'IDLE',
    connectedAt: null,
    sessionStartedAt: null,
    firstAudioSentAt: null,
    firstObservationAt: null,
    lastObservationAt: null,
    keepAliveAt: null,
    closedAt: null,
    closeCode: null,
    closeReason: null,
    wasClean: true,
    audioChunksSent: 0,
    audioBytesSent: 0,
    resultsReceived: 0,
  };

  private readonly capabilities: ProviderCapabilities = Object.freeze({
    wordTracking: true,
    skipDetection: true,
    repetitionDetection: false,
    letterMistakes: true,
    tajweedMistakes: true,
    phonemeFeedback: false,
    offline: false,
    realtime: true,
  });

  constructor(options: NabrQrcOptions = {}) {
    this.endpoint = options.endpoint ?? (
      typeof window !== 'undefined' && window.location
        ? endpointFromPage()
        : 'ws://localhost:3000/api/ws/nabr-qrc-gateway'
    );
    this.tokenProvider = options.tokenProvider ?? (() => {
      try {
        return typeof window === 'undefined'
          ? null
          : window.localStorage.getItem('tabyan_token');
      } catch {
        return null;
      }
    });
    this.audioAdapter.onChunk((chunk) => this.handleAudioChunkReady(chunk.data));
  }

  getConnectionState(): ProviderConnectionState {
    return this.connectionState;
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  getDevDiagnostics(): ProviderDiagnostics {
    return { ...this.diagnostics, connectionState: this.connectionState };
  }

  onObservation(listener: ObservationListener): () => void {
    this.observationListeners.add(listener);
    return () => this.observationListeners.delete(listener);
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private setConnectionState(newState: ProviderConnectionState): void {
    this.connectionState = newState;
    this.diagnostics = { ...this.diagnostics, connectionState: newState };
    this.stateListeners.forEach((listener) => listener(newState));
  }

  async connect(): Promise<void> {
    if (typeof WebSocket === 'undefined') {
      throw new Error('تعذر الاتصال بخدمة التسميع');
    }
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
      throw new Error('يوجد اتصال تسميع نشط بالفعل');
    }
    this.clearPendingControl(new Error('بدأ اتصال جديد'));
    this.seenProviderEventIds.clear();
    this.setConnectionState('CONNECTING');
    this.socket = new WebSocket(this.endpoint);
    this.socket.binaryType = 'arraybuffer';

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.authPending = null;
        reject(new NabrGatewayError('NETWORK'));
        this.fail(new NabrGatewayError('NETWORK'));
      }, 12_000);
      this.authPending = { resolve, reject, timer };
      const socket = this.socket!;
      socket.onopen = () => {
        this.diagnostics = { ...this.diagnostics, connectedAt: Date.now() };
        const token = this.tokenProvider();
        if (!token) {
          this.fail(new NabrGatewayError('AUTH', 'سجّل الدخول بحساب طالب لاستخدام التسميع'));
          return;
        }
        try {
          socket.send(JSON.stringify({ t: 'auth', token }));
        } catch {
          this.fail(new NabrGatewayError('AUTH', 'تعذر التحقق من جلسة الحساب'));
        }
      };
      socket.onmessage = (event) => this.handleSocketMessage(event.data);
      socket.onclose = (event) => {
        this.diagnostics = {
          ...this.diagnostics,
          closedAt: Date.now(),
          closeCode: event.code,
          closeReason: event.reason,
          wasClean: event.wasClean,
        };
        if (this.authPending) {
          this.rejectAuth(new NabrGatewayError('NETWORK'));
        }
        this.clearPendingControl(new NabrGatewayError('NETWORK', 'انقطع اتصال خدمة التسميع'));
        const unexpected = this.socket === socket && this.activeConfig !== null && !event.wasClean;
        if (this.connectionState !== 'ERROR') this.setConnectionState('CLOSED');
        if (unexpected) {
          this.activeConfig = null;
          this.errorListeners.forEach((listener) => listener(new NabrGatewayError('NETWORK', 'انقطع اتصال خدمة التسميع')));
        }
      };
      socket.onerror = () => this.fail(new NabrGatewayError('NETWORK'));
    });
  }

  async disconnect(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    this.activeConfig = null;
    this.clearPendingControl(new Error('انتهت جلسة التسميع'));
    this.rejectAuth(new Error('انتهت جلسة التسميع'));
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ t: 'close' }));
        socket.close(1000, 'Client closed gateway');
      } catch {
        socket.close();
      }
    } else if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close(1000, 'Client closed gateway');
    }
    if (this.connectionState !== 'ERROR') this.setConnectionState('CLOSED');
  }

  async startSession(config: RecitationSessionConfig): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN
      || this.connectionState !== 'CONNECTED') {
      throw new Error('اتصال التسميع غير جاهز');
    }
    this.setConnectionState('STARTING_SESSION');
    this.activeConfig = config;
    const startIndices = canonicalSessionStartToNabrIndices(config);
    const request = {
      t: 'start',
      sessionId: config.sessionId,
      start: {
        surah: startIndices.chapter_index,
        ayah: startIndices.verse_index,
        wordIndex: startIndices.word_index,
      },
    };
    try {
      await this.sendAndWaitFor('ready', request);
    } catch (error) {
      this.activeConfig = null;
      throw error;
    }
  }

  async pushAudio(frame: CanonicalAudioFrame): Promise<void> {
    if (this.connectionState !== 'READY' && this.connectionState !== 'STREAMING') return;
    if (this.connectionState === 'READY') {
      this.setConnectionState('STREAMING');
      this.diagnostics = { ...this.diagnostics, firstAudioSentAt: Date.now() };
    }
    this.audioAdapter.processFrame(frame);
  }

  async resetSession(): Promise<void> {
    // Flush audio before moving state so the final WAV remains ordered before reset.
    this.audioAdapter.flush();
    if (!this.activeConfig || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.activeConfig = null;
      if (this.connectionState !== 'ERROR') this.setConnectionState('CONNECTED');
      return;
    }
    this.setConnectionState('RESETTING');
    await this.sendAndWaitFor('stopped', { t: 'reset' });
    this.activeConfig = null;
    if (this.connectionState !== 'ERROR') this.setConnectionState('CONNECTED');
  }

  /** Chunks dropped because the socket could not drain fast enough. */
  getAudioChunksDropped(): number {
    return this.audioChunksDropped;
  }

  private handleAudioChunkReady(chunkData: ArrayBuffer): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN
      || (this.connectionState !== 'STREAMING' && this.connectionState !== 'READY')) return;
    // Backpressure: never let seconds of audio queue up behind a slow link.
    if (this.socket.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
      this.audioChunksDropped += 1;
      return;
    }
    try {
      this.socket.send(chunkData);
      this.diagnostics = {
        ...this.diagnostics,
        audioChunksSent: this.diagnostics.audioChunksSent + 1,
        audioBytesSent: this.diagnostics.audioBytesSent + chunkData.byteLength,
      };
    } catch {
      this.fail(new NabrGatewayError('NETWORK', 'تعذر إرسال مقطع الصوت إلى خدمة التسميع'));
    }
  }

  private async sendAndWaitFor(
    expected: PendingControl['expected'],
    message: Record<string, unknown>,
  ): Promise<void> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('اتصال التسميع غير جاهز');
    }
    this.clearPendingControl(new Error('استبدل طلب التسميع'));
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingControl = null;
        const error = new NabrGatewayError('NETWORK', 'انتهت مهلة خدمة التسميع');
        reject(error);
        this.fail(error);
      }, 15_000);
      this.pendingControl = { expected, resolve, reject, timer };
      try {
        socket.send(JSON.stringify(message));
      } catch {
        clearTimeout(timer);
        this.pendingControl = null;
        reject(new Error('تعذر إرسال طلب التسميع'));
      }
    });
  }

  private handleSocketMessage(data: unknown): void {
    let parsed: unknown;
    try {
      const text = typeof data === 'string'
        ? data
        : data instanceof ArrayBuffer
          ? new TextDecoder().decode(data)
          : ArrayBuffer.isView(data)
            ? new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
          : data instanceof Blob
            ? ''
            : '';
      if (!text) throw new Error('non-text gateway message');
      parsed = JSON.parse(text);
    } catch {
      this.fail(new NabrGatewayError('PROTOCOL', 'استجابة خدمة التسميع غير صالحة'));
      return;
    }
    if (!isRecord(parsed) || typeof parsed.t !== 'string') {
      this.fail(new NabrGatewayError('PROTOCOL', 'استجابة خدمة التسميع غير صالحة'));
      return;
    }

    const message = parsed as unknown as NabrQrcGatewayServerMessage;
    if (message.t === 'authenticated') {
      const pending = this.authPending;
      if (!pending) return;
      clearTimeout(pending.timer);
      this.authPending = null;
      this.setConnectionState('CONNECTED');
      pending.resolve();
      return;
    }
    if (message.t === 'ready') {
      this.diagnostics = {
        ...this.diagnostics,
        providerName: `Nabr QRC Gateway (${message.mode})`,
        sessionStartedAt: Date.now(),
      };
      this.setConnectionState('READY');
      this.resolvePendingControl('ready');
      return;
    }
    if (message.t === 'observation') {
      const observation = parseGatewayObservation(message.observation);
      if (!observation) return;
      if (observation.providerEventId) {
        if (this.seenProviderEventIds.has(observation.providerEventId)) return;
        this.seenProviderEventIds.add(observation.providerEventId);
        if (this.seenProviderEventIds.size > 256) {
          const oldest = this.seenProviderEventIds.values().next().value;
          if (typeof oldest === 'string') this.seenProviderEventIds.delete(oldest);
        }
      }
      this.diagnostics = {
        ...this.diagnostics,
        firstObservationAt: this.diagnostics.firstObservationAt ?? observation.observedAt,
        lastObservationAt: observation.observedAt,
        resultsReceived: this.diagnostics.resultsReceived + 1,
      };
      const rawObservation = mapGatewayObservation(observation);
      this.observationListeners.forEach((listener) => listener(rawObservation));
      return;
    }
    if (message.t === 'keep_alive') {
      if (Number.isFinite(message.observedAt)) {
        this.diagnostics = { ...this.diagnostics, keepAliveAt: message.observedAt };
      }
      return;
    }
    if (message.t === 'stopped') {
      if (this.connectionState !== 'ERROR') this.setConnectionState('CONNECTED');
      this.resolvePendingControl('stopped');
      return;
    }
    if (message.t === 'error') {
      // Classify by code; the server's message text is never forwarded.
      this.fail(new NabrGatewayError(GATEWAY_CODE_FAILURES[message.code] ?? 'UNKNOWN'));
      return;
    }
  }

  private resolvePendingControl(expected: PendingControl['expected']): void {
    const pending = this.pendingControl;
    if (!pending || pending.expected !== expected) return;
    clearTimeout(pending.timer);
    this.pendingControl = null;
    pending.resolve();
  }

  private clearPendingControl(error: Error): void {
    const pending = this.pendingControl;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingControl = null;
    pending.reject(error);
  }

  private rejectAuth(error: Error): void {
    const pending = this.authPending;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.authPending = null;
    pending.reject(error);
  }

  private fail(error: Error): void {
    this.rejectAuth(error);
    this.clearPendingControl(error);
    this.activeConfig = null;
    this.setConnectionState('ERROR');
    this.errorListeners.forEach((listener) => listener(error));
    const socket = this.socket;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      try { socket.close(1011, 'Gateway error'); } catch { /* Socket may already be closed. */ }
    }
  }
}
