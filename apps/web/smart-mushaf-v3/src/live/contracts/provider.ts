/**
 * @license
 * Tabyan Smart Mushaf — live recitation provider boundary
 *
 * Nabr, the development fake stream, and any future recognizer implement this
 * interface. The Mushaf knows nothing about vendor sockets, auth headers,
 * provider ids, or vendor event names.
 */

import type { WordKey } from '../../quran/domain/types';
import type { LiveRecitationEvent } from './events';

export type LiveProviderConnectionState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'streaming'
  | 'paused'
  | 'reconnecting'
  | 'closed'
  | 'error';

export interface LiveSessionScope {
  /** Inclusive canonical bounds the reciter is expected to stay within. */
  readonly from: WordKey;
  readonly to: WordKey;
}

export interface LiveSessionConfig {
  readonly sessionId: string;
  /** Where the reciter is expected to begin (selected word, ayah, or page start). */
  readonly anchor: WordKey;
  readonly scope: LiveSessionScope;
  /**
   * 'anchor': begin at the anchor word.
   * 'locate': the provider may locate the reciter anywhere within scope.
   */
  readonly startMode: 'anchor' | 'locate';
}

/** 16 kHz mono PCM16 frame from the capture pipeline. */
export interface LiveAudioFrame {
  readonly pcm: Int16Array;
  readonly sampleRate: 16000;
  readonly seq: number;
  /** Wall-clock ms of the first sample. */
  readonly captureTimestamp: number;
  readonly speech: boolean;
}

export interface LiveProviderCapabilities {
  /** The provider consumes microphone audio (the fake stream does not need it). */
  readonly consumesAudio: boolean;
  /** Emits position events per word rather than per phrase/ayah. */
  readonly incrementalWords: boolean;
  readonly candidatePositions: boolean;
  readonly mistakeFlags: boolean;
  /** Can locate a reciter who starts away from the anchor. */
  readonly locatesWithinScope: boolean;
}

export type LiveEventListener = (event: LiveRecitationEvent) => void;

export interface LiveRecitationProvider {
  readonly kind: 'fake-stream' | 'nabr';
  readonly capabilities: LiveProviderCapabilities;
  startSession(config: LiveSessionConfig): Promise<void>;
  /** Non-blocking; providers apply their own bounded buffering and backpressure. */
  pushAudioFrame(frame: LiveAudioFrame): void;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
  subscribeToEvents(listener: LiveEventListener): () => void;
  getConnectionState(): LiveProviderConnectionState;
}
