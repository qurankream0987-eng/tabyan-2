import { WebSocket } from "ws";
import type {
  CanonicalTranscriptEvent,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";

const SPEECHMATICS_REALTIME_URL = "wss://global.rt.speechmatics.com/v2/";
const SPEECHMATICS_SAMPLE_RATE_HZ = 24_000;

type SpeechmaticsWord = {
  type?: string;
  start_time?: number;
  end_time?: number;
  alternatives?: Array<{ content?: string; confidence?: number }>;
};

function transcriptFromResults(results: unknown): CanonicalTranscriptEvent | null {
  if (!Array.isArray(results)) return null;
  const words = results.filter((result): result is SpeechmaticsWord => Boolean(result && typeof result === "object"));
  const contents = words
    .map((word) => word.alternatives?.[0]?.content?.trim() ?? "")
    .filter(Boolean);
  if (contents.length === 0) return null;
  const first = words[0];
  const last = words.at(-1);
  const confidences = words
    .map((word) => word.alternatives?.[0]?.confidence)
    .filter((value): value is number => typeof value === "number");
  return {
    text: contents.join(" "),
    isFinal: false,
    confidence: confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : undefined,
    startMs: typeof first?.start_time === "number" ? Math.round(first.start_time * 1000) : undefined,
    endMs: typeof last?.end_time === "number" ? Math.round(last.end_time * 1000) : undefined,
  };
}

/**
 * Speechmatics Realtime WebSocket adapter. The gateway never sees provider
 * messages; it receives only canonical full partials/finals.
 */
export class SpeechmaticsStreamingProvider implements SpeechRecognitionProvider {
  readonly name = "speechmatics" as const;
  private socket: WebSocket | null = null;
  private closed = false;
  private recognitionStarted = false;

  constructor(
    private readonly apiKey: string,
    private readonly events: SpeechRecognitionProviderEvents,
  ) {}

  connect() {
    if (this.socket || this.closed) return;
    this.socket = new WebSocket(SPEECHMATICS_REALTIME_URL, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      perMessageDeflate: false,
    });

    this.socket.on("open", () => {
      this.socket?.send(JSON.stringify({
        message: "StartRecognition",
        audio_format: {
          type: "raw",
          encoding: "pcm_s16le",
          sample_rate: SPEECHMATICS_SAMPLE_RATE_HZ,
        },
        transcription_config: {
          language: "ar",
          model: "enhanced",
          enable_partials: true,
          max_delay: 0.7,
        },
      }));
    });

    this.socket.on("message", (raw) => {
      let event: Record<string, unknown>;
      try { event = JSON.parse(String(raw)) as Record<string, unknown>; } catch { return; }
      this.events.onProviderEvent();
      const message = String(event.message ?? "");

      if (message === "RecognitionStarted") {
        this.recognitionStarted = true;
        this.events.onReady();
        return;
      }
      if (message === "AudioAdded") {
        this.events.onAudioAccepted?.();
        return;
      }
      if (message === "AddPartialTranscript" || message === "AddTranscript") {
        const transcript = transcriptFromResults(event.results);
        if (!transcript) return;
        const isFinal = message === "AddTranscript";
        this.events.onTranscript({
          ...transcript,
          isFinal,
          textIsDelta: false,
          itemId: `speechmatics-${String(event.seq_no ?? crypto.randomUUID())}`,
        });
        return;
      }
      if (message === "Error") {
        this.events.onError(String(event.reason ?? event.type ?? "Speechmatics realtime error"));
      }
    });

    this.socket.on("error", (error: Error) => {
      if (!this.closed) this.events.onError(error.message || "Speechmatics connection failed");
    });
    this.socket.on("close", (code, reason) => {
      this.socket = null;
      if (!this.closed) {
        this.events.onClose(code, reason.toString());
      }
    });
  }

  appendAudio(base64Audio: string) {
    if (!this.recognitionStarted || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(Buffer.from(base64Audio, "base64"));
  }

  commit() {
    // Speechmatics finalizes spans continuously; EndOfStream would end the
    // provider session, so commits are intentionally no-ops.
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket?.close();
    this.socket = null;
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN && !this.closed && this.recognitionStarted;
  }
}