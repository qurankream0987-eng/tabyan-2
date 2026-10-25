import type { NabrQrcGatewayObservation } from '@workspace/tabyan-domain';
import type { WordKey } from '../../quran/domain/types';

/**
 * @license
 * Tabyan Smart Mushaf — Recitation Provider Contracts
 * Provider-neutral abstraction for all speech & recitation recognizers.
 */

export type ProviderConnectionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'STARTING_SESSION'
  | 'READY'
  | 'STREAMING'
  | 'RESETTING'
  | 'CLOSED'
  | 'ERROR';

export interface ProviderCapabilities {
  readonly wordTracking: boolean;
  readonly skipDetection: boolean;
  readonly repetitionDetection: boolean;
  readonly letterMistakes: boolean;
  readonly tajweedMistakes: boolean;
  readonly phonemeFeedback: boolean;
  readonly offline: boolean;
  readonly realtime: boolean;
}

export interface RecitationSessionConfig {
  readonly sessionId: string;
  readonly surahNumber: number;      // 1-based canonical surah
  readonly startAyah: number;        // 1-based canonical start ayah
  readonly startWordIndex?: number;  // 1-based canonical start word
  readonly hafzLevel?: number;       // 1..5
  readonly tajweedLevel?: number;    // 1..5
  readonly audioMode?: 'WAV' | 'OPUS';
}

export interface RawLetterMistake {
  readonly letter_index?: number;
  readonly mistake_type?: string;
  readonly description?: string;
  readonly error_code?: string;
  readonly heard?: string;
}

export interface RawTajweedMistake {
  readonly rule_name?: string;
  readonly mistake_type?: string;
  readonly description?: string;
  readonly error_code?: string;
  readonly heard?: string;
}

export interface LocalQualificationObservationTrace {
  readonly captureSeq: number;
  readonly observationSeq: number;
  readonly gatewayReceiveTimestamp: number;
  readonly fakeObservationEmitTimestamp: number;
  readonly sourceCaptureTimestamp: number;
  readonly sourceWordRank: number;
  readonly candidateKey: WordKey;
}

export interface RawProviderObservation {
  /** Smart Mushaf's internal provider contract is 0-based; QRC wire values are 1-based. */
  readonly chapter_index: number;
  readonly verse_index: number;
  readonly word_index: number;
  readonly correct_words?: readonly number[];
  readonly skipped_words?: readonly number[];
  readonly letter_mistakes?: readonly RawLetterMistake[];
  readonly tajweed_mistakes?: readonly RawTajweedMistake[];
  readonly confidence?: number;
  readonly timestamp: number;
  readonly isKeepAlive?: boolean;
  /** Local-only correlation metadata used by the development microphone qualification route. */
  readonly localQualificationTrace?: LocalQualificationObservationTrace;
  /** Complete whitelisted QRC observation retained for diagnostics, never applied directly to state. */
  readonly qrc_observation?: NabrQrcGatewayObservation;
}

export interface CanonicalAudioFrame {
  readonly pcmData: Int16Array;
  readonly sampleRate: 16000;
  readonly channels: 1;
  readonly timestamp: number;
  readonly captureSeq?: number;
  readonly captureTimestamp?: number;
  readonly workletTimestamp?: number;
  readonly chunkReadyTimestamp?: number;
  readonly speechState?: 'SPEAKING' | 'SILENT';
}

export type ObservationListener = (observation: RawProviderObservation) => void;
export type StateChangeListener = (state: ProviderConnectionState) => void;
export type ErrorListener = (error: Error) => void;

export interface RecitationProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startSession(config: RecitationSessionConfig): Promise<void>;
  pushAudio(frame: CanonicalAudioFrame): Promise<void>;
  resetSession(): Promise<void>;
  onObservation(listener: ObservationListener): () => void;
  onStateChange(listener: StateChangeListener): () => void;
  onError(listener: ErrorListener): () => void;
  getConnectionState(): ProviderConnectionState;
  getCapabilities(): ProviderCapabilities;
  getDevDiagnostics(): ProviderDiagnostics;
}

export interface ProviderDiagnostics {
  readonly providerName: string;
  readonly connectionState: ProviderConnectionState;
  readonly connectedAt: number | null;
  readonly sessionStartedAt: number | null;
  readonly firstAudioSentAt: number | null;
  readonly firstObservationAt: number | null;
  readonly lastObservationAt: number | null;
  readonly keepAliveAt: number | null;
  readonly closedAt: number | null;
  readonly closeCode: number | null;
  readonly closeReason: string | null;
  readonly wasClean: boolean;
  readonly audioChunksSent: number;
  readonly audioBytesSent: number;
  readonly resultsReceived: number;
}
