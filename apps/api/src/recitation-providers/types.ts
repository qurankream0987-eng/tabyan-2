import type { QrcStructuredObservation } from "@workspace/tabyan-domain";
import type { NabrQrcDiagnosticPacket } from "./nabr-qrc-diagnostics";
export type { NabrQrcDiagnosticPacket } from "./nabr-qrc-diagnostics";

export interface CanonicalTranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  startMs?: number;
  endMs?: number;
  itemId?: string;
  textIsDelta?: boolean;
  /** Provider event identity, when available, for replay-safe delta assembly. */
  eventId?: string;
  /** Unvalidated ASR can suggest review, never automatically confirm a mistake. */
  confirmationEligible?: boolean;
  /** The recognizer's confidence (0..1) in each whitespace-separated word of `text`. */
  wordConfidences?: number[];
}

export type AudioAcceptanceEvidence =
  | "provider_audio_ack"
  | "provider_commit_ack"
  | "local_transcription_result";

export interface SpeechRecognitionProviderEvents {
  onConnectionPhase?: (phase: "PROVIDER_CONNECTED" | "SESSION_CONFIGURED" | "CLEAN_CLOSE") => void;
  onReady: () => void;
  onTranscript: (event: CanonicalTranscriptEvent) => void;
  /** Separate, non-authoritative channel; never enters transcript matching or learner state. */
  onStructuredObservation?: (event: QrcStructuredObservation) => void;
  /** Whitelisted development-only provider packet diagnostics; never sent to the client. */
  onQrcDiagnostic?: (packet: NabrQrcDiagnosticPacket) => void;
  onProviderEvent: () => void;
  /** Audio bytes were handed to the provider adapter, not necessarily accepted remotely. */
  onAudioForwarded?: (audioBytes: number) => void;
  /** The provider or local worker supplied positive evidence that audio was accepted. */
  onAudioAccepted?: (evidence: AudioAcceptanceEvidence) => void;
  /** A provider or local worker confirmed a requested utterance commit. */
  onCommitAccepted?: (evidence: AudioAcceptanceEvidence) => void;
  /** Local chunked decoding drained completely, including the last PCM. */
  onFinalized?: (commitId?: string) => void;
  onError: (message: string, code?: number) => void;
  onClose: (code?: number, reason?: string) => void;
}

/**
 * Server-only provider boundary. The authenticated Tabyan WebSocket owns the
 * session and authorization; the gateway forwards audio chunks as base64. The
 * Native client currently sends mono PCM16LE at the sample rate announced by
 * the gateway, and adapters normalize provider events back to this contract.
 * Provider credentials never cross this boundary to the Native client.
 */
export interface SpeechRecognitionProvider {
  readonly name: "openai" | "nvidia" | "speechmatics" | "tarteel" | "tilawi" | "nabr";
  /** Start provider setup; readiness and failures arrive through events. */
  connect(): void;
  /** Accept one base64 audio chunk from the authenticated gateway. */
  appendAudio(base64Audio: string): void;
  /** Flush the current provider segment when supported. */
  commit(finalize?: boolean, commitId?: string): void;
  /** Close sockets, workers, and other adapter-owned resources. */
  close(reason?: string): void;
  isOpen(): boolean;
  /** Provider-side timing for the session log. */
  stats?(): Record<string, number | string>;
  /**
   * Words expected next, while a known place is being followed. Empty clears
   * the bias (searching the Quran, or tracking lost). Tilawi only.
   */
  noteExpected?(words: readonly string[]): void;
}