import { WebSocket } from "ws";
import type {
  CanonicalTranscriptEvent,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";

// Transcription sessions reject a `model` query parameter ("invalid_model");
// the transcription model is set in session.update instead.
export const OPENAI_REALTIME_URL =
  "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * OpenAI's transcription WebSocket adapter. Provider-specific protocol details
 * stay here; the gateway only consumes canonical transcript events.
 */
export class OpenAiRealtimeProvider implements SpeechRecognitionProvider {
  readonly name = "openai" as const;
  private socket: WebSocket | null = null;
  private closed = false;
  private audioSinceCommit = false;
  private pendingCommits = 0;
  private pendingItems = new Set<string>();
  private completedItems = new Set<string>();
  private acknowledgedItems = new Set<string>();
  private itemOrder: string[] = [];
  private finalResults = new Map<string, CanonicalTranscriptEvent>();
  private seenEvents = new Set<string>();
  private finalCommitId: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly events: SpeechRecognitionProviderEvents,
    private readonly realtimeUrl = OPENAI_REALTIME_URL,
  ) {}

  connect() {
    if (this.socket || this.closed) return;
    this.socket = new WebSocket(this.realtimeUrl, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      perMessageDeflate: false,
    });

    this.socket.on("open", () => {
      if (this.closed) return;
      this.events.onConnectionPhase?.("PROVIDER_CONNECTED");
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
      if (this.closed) return;
      let event: Record<string, unknown>;
      try { event = JSON.parse(String(raw)) as Record<string, unknown>; } catch { return; }
      this.events.onProviderEvent();
      const type = String(event.type ?? "");
      const eventId = typeof event.event_id === "string" ? event.event_id : undefined;
      if (eventId) {
        if (this.seenEvents.has(eventId)) return;
        this.seenEvents.add(eventId);
        if (this.seenEvents.size > 4096) this.seenEvents.delete(this.seenEvents.values().next().value!);
      }

      if (type === "session.updated") {
        this.events.onConnectionPhase?.("SESSION_CONFIGURED");
        this.events.onReady();
        return;
      }
      if (type === "input_audio_buffer.committed") {
        const itemId = String(event.item_id ?? "");
        if (!itemId) {
          this.events.onError("OpenAI commit acknowledgement lacks item identity");
          return;
        }
        if (this.acknowledgedItems.has(itemId)) return;
        this.acknowledgedItems.add(itemId);
        this.itemOrder.push(itemId);
        this.pendingCommits = Math.max(0, this.pendingCommits - 1);
        if (!this.completedItems.has(itemId)) this.pendingItems.add(itemId);
        this.events.onAudioAccepted?.("provider_commit_ack");
        this.events.onCommitAccepted?.("provider_commit_ack");
        this.flushOrderedFinals();
        this.maybeFinalize();
        return;
      }
      if (type === "conversation.item.input_audio_transcription.delta") {
        if (this.completedItems.has(String(event.item_id ?? ""))) return;
        this.events.onTranscript({
          text: String(event.delta ?? ""),
          isFinal: false,
          itemId: String(event.item_id ?? ""),
          textIsDelta: true,
          eventId,
          // No current acoustic/educational acceptance: suggest review only.
          confirmationEligible: false,
        });
        return;
      }
      if (type === "conversation.item.input_audio_transcription.completed") {
        const itemId = String(event.item_id ?? "");
        if (this.completedItems.has(itemId)) return;
        this.completedItems.add(itemId);
        this.pendingItems.delete(itemId);
        this.finalResults.set(itemId, {
          text: String(event.transcript ?? ""),
          isFinal: true,
          itemId: String(event.item_id ?? ""),
          textIsDelta: false,
          eventId,
          confirmationEligible: false,
        });
        this.flushOrderedFinals();
        this.maybeFinalize();
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
      if (this.closed && code === 1000) this.events.onConnectionPhase?.("CLEAN_CLOSE");
      if (!this.closed) {
        this.events.onClose(code, reason.toString());
      }
    });
  }

  appendAudio(base64Audio: string) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
    this.audioSinceCommit = true;
    this.events.onAudioForwarded?.(Buffer.byteLength(base64Audio, "base64"));
  }

  commit(finalize = false, commitId?: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      if (finalize) this.finalCommitId = commitId ?? "";
      // A pause/segmenter may have already committed the last audio. Do not
      // send an empty commit; still wait for every outstanding item's final.
      if (this.audioSinceCommit) {
        this.pendingCommits += 1;
        this.audioSinceCommit = false;
        this.socket.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      }
      this.maybeFinalize();
    }
  }

  private maybeFinalize() {
    if (this.finalCommitId === null || this.pendingCommits || this.pendingItems.size || this.itemOrder.length || this.closed) return;
    const commitId = this.finalCommitId;
    this.finalCommitId = null;
    // onTranscript above is synchronous: the final reaches the matcher first.
    this.events.onFinalized?.(commitId);
  }

  private flushOrderedFinals() {
    while (this.itemOrder.length) {
      const itemId = this.itemOrder[0];
      const event = this.finalResults.get(itemId);
      if (!event) break;
      this.itemOrder.shift();
      this.finalResults.delete(itemId);
      this.events.onTranscript(event);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.pendingItems.clear();
    this.completedItems.clear();
    this.acknowledgedItems.clear();
    this.itemOrder = [];
    this.finalResults.clear();
    this.seenEvents.clear();
    this.socket?.close(1000);
    this.socket = null;
  }

  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN && !this.closed;
  }
}