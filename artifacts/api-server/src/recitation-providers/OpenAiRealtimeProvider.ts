import { WebSocket } from "ws";
import type {
  CanonicalTranscriptEvent,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * OpenAI's transcription WebSocket adapter. Provider-specific protocol details
 * stay here; the gateway only consumes canonical transcript events.
 */
export class OpenAiRealtimeProvider implements SpeechRecognitionProvider {
  readonly name = "openai" as const;
  private socket: WebSocket | null = null;
  private closed = false;

  constructor(
    private readonly apiKey: string,
    private readonly events: SpeechRecognitionProviderEvents,
  ) {}

  connect() {
    if (this.socket || this.closed) return;
    this.socket = new WebSocket(OPENAI_REALTIME_URL, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      perMessageDeflate: false,
    });

    this.socket.on("open", () => {
      this.socket?.send(JSON.stringify({
        type: "session.update",
        session: {
          type: "transcription",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24_000 },
              transcription: {
                model: "gpt-live-transcribe",
                languages: ["ar"],
                delay: "minimal",
              },
              turn_detection: null,
            },
          },
        },
      }));
    });

    this.socket.on("message", (raw) => {
      let event: Record<string, unknown>;
      try { event = JSON.parse(String(raw)) as Record<string, unknown>; } catch { return; }
      this.events.onProviderEvent();
      const type = String(event.type ?? "");

      if (type === "session.updated") {
        this.events.onReady();
        return;
      }
      if (type === "conversation.item.input_audio_transcription.delta") {
        this.events.onTranscript({
          text: String(event.delta ?? ""),
          isFinal: false,
          itemId: String(event.item_id ?? ""),
          textIsDelta: true,
        });
        return;
      }
      if (type === "conversation.item.input_audio_transcription.completed") {
        this.events.onTranscript({
          text: String(event.transcript ?? ""),
          isFinal: true,
          itemId: String(event.item_id ?? ""),
          textIsDelta: false,
        });
        return;
      }
      if (type === "error") {
        const providerError = event.error as Record<string, unknown> | undefined;
        this.events.onError(
          String(providerError?.message ?? "OpenAI realtime transcription error"),
        );
      }
    });

    this.socket.on("error", (error: Error) => {
      if (!this.closed) this.events.onError(error.message || "OpenAI connection failed");
    });
    this.socket.on("close", (code, reason) => {
      this.socket = null;
      if (!this.closed) {
        this.events.onClose(code, reason.toString());
      }
    });
  }

  appendAudio(base64Audio: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
  }

  commit() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket?.close();
    this.socket = null;
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN && !this.closed;
  }
}