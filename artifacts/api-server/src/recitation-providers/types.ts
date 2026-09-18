export interface CanonicalTranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  startMs?: number;
  endMs?: number;
  itemId?: string;
  textIsDelta?: boolean;
}

export interface SpeechRecognitionProviderEvents {
  onReady: () => void;
  onTranscript: (event: CanonicalTranscriptEvent) => void;
  onProviderEvent: () => void;
  onAudioAccepted?: () => void;
  onError: (message: string, code?: number) => void;
  onClose: (code?: number, reason?: string) => void;
}

export interface SpeechRecognitionProvider {
  readonly name: "openai" | "nvidia" | "speechmatics";
  connect(): void;
  appendAudio(base64Audio: string): void;
  commit(): void;
  close(): void;
  isOpen(): boolean;
}