import { randomUUID } from "node:crypto";
import type {
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";
import { tarteelTranscriber, type TarteelTranscriber } from "./TarteelWhisperWorker";
import { logger } from "../lib/logger";

const SAMPLE_RATE_HZ = 24_000;
const MAX_UTTERANCE_BYTES = SAMPLE_RATE_HZ * 2 * 30;
const MAX_PENDING_COMMITS = 2;
const BYTES_PER_SECOND = SAMPLE_RATE_HZ * 2;
const WINDOW_BYTES = BYTES_PER_SECOND * 10;
const OVERLAP_BYTES = BYTES_PER_SECOND * 2;

/**
 * CHUNKED_NEAR_REALTIME: ten-second windows, two-second overlap.
 * Only real, completed decodes emit transcripts; never synthetic partials.
 */
export class TarteelWhisperProvider implements SpeechRecognitionProvider {
  readonly name = "tarteel" as const;
  private readonly audioChunks: Buffer[] = [];
  private bufferedBytes = 0;
  private pendingCommits = 0;
  private ready = false;
  private closed = false;
  private connecting = false;
  private finalizing = false;
  private failed = false;
  private bufferStartBytes = 0;
  private scheduledEndBytes = 0;
  private emittedUntilSeconds = 0;
  private decodeSequence = 0;
  private decodeTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly events: SpeechRecognitionProviderEvents,
    private readonly worker: TarteelTranscriber = tarteelTranscriber,
  ) {}

  connect() {
    if (this.ready || this.closed || this.connecting) return;
    this.connecting = true;
    void this.worker.start().then(() => {
      if (this.closed) return;
      this.ready = true;
      this.events.onReady();
    }).catch((error: unknown) => {
      if (this.closed) return;
      const message = error instanceof Error ? error.message : "Tarteel worker failed to start";
      this.events.onError(message);
      this.events.onClose(1011, "Tarteel model unavailable");
      this.closed = true;
    });
  }

  appendAudio(base64Audio: string) {
    if (!this.isOpen() || this.finalizing) return;
    const chunk = Buffer.from(base64Audio, "base64");
    if (!chunk.length) return;
    if (chunk.length % 2 !== 0 || this.bufferedBytes + chunk.length > MAX_UTTERANCE_BYTES) {
      this.failed = true;
      this.audioChunks.length = 0;
      this.bufferedBytes = 0;
      this.events.onError("Tarteel utterance exceeded the 30-second PCM limit");
      return;
    }
    this.audioChunks.push(chunk);
    this.bufferedBytes += chunk.length;
    this.events.onAudioForwarded?.(chunk.byteLength);
    this.scheduleWindow();
  }

  commit(finalize = false, commitId?: string) {
    if (!this.isOpen() || this.finalizing) return;
    if (!finalize) {
      // Client VAD commits must not turn this into one-second decoding.
      this.scheduleWindow();
      return;
    }
    this.finalizing = true;
    // Wait for the bounded queue before decoding a final short remainder.
    void this.decodeTail.then(async () => {
      if (this.closed || this.failed) return;
      if (this.bufferStartBytes + this.bufferedBytes > this.scheduledEndBytes) {
        const pcm = Buffer.concat(this.audioChunks, this.bufferedBytes);
        await this.queueDecode(pcm, this.bufferStartBytes);
      }
      this.audioChunks.length = 0;
      this.bufferedBytes = 0;
      if (!this.closed && !this.failed) this.events.onFinalized?.(commitId);
    });
  }

  private scheduleWindow() {
    if (this.closed || this.failed || this.finalizing || this.pendingCommits >= MAX_PENDING_COMMITS
      || this.bufferedBytes < WINDOW_BYTES) return;
    const pcm = Buffer.concat(this.audioChunks, this.bufferedBytes);
    const start = this.bufferStartBytes;
    const hop = WINDOW_BYTES - OVERLAP_BYTES;
    this.bufferStartBytes += hop;
    this.audioChunks.length = 0;
    this.audioChunks.push(pcm.subarray(hop));
    this.bufferedBytes = pcm.length - hop;
    this.scheduledEndBytes = start + WINDOW_BYTES;
    void this.queueDecode(pcm.subarray(0, WINDOW_BYTES), start);
  }

  private queueDecode(pcm: Buffer, startBytes: number): Promise<void> {
    const sequence = ++this.decodeSequence;
    this.pendingCommits += 1;
    this.decodeTail = this.decodeTail.then(async () => {
      if (this.closed || this.failed) return;
      const result = await this.worker.transcribe(pcm, SAMPLE_RATE_HZ);
      if (this.closed || this.failed) return;
      this.events.onAudioAccepted?.("local_transcription_result");
      this.events.onCommitAccepted?.("local_transcription_result");
      this.events.onProviderEvent();
      // Real word timestamps tie overlap removal to the same audio, not repeated
      // Quran vocabulary. A student's later repeated word must remain audible.
      const offset = startBytes / BYTES_PER_SECOND;
      const newWords = result.words?.filter((word) => offset + word.end > this.emittedUntilSeconds + 0.01);
      if (startBytes > 0 && !result.words) throw new Error("Local decode omitted overlap timestamps");
      const text = newWords ? newWords.map((word) => word.word.trim()).join(" ").trim() : result.text.trim();
      for (const word of newWords ?? []) this.emittedUntilSeconds = Math.max(this.emittedUntilSeconds, offset + word.end);
      if (
        process.env.NODE_ENV === "development"
        && process.env.TABYAN_AI_ASR_PROVIDER === "tarteel"
        && process.env.TABYAN_AI_TARTEEL_TRIAL_ENABLED === "true"
      ) {
        logger.info({
          sequence,
          audioStartMs: Math.round(startBytes / BYTES_PER_SECOND * 1_000),
          audioMs: result.audioMs,
          inferenceMs: result.inferenceMs,
          rawModelTranscript: result.text,
          emittedTranscript: text,
        }, "Tarteel development transcript diagnostic");
      }
      if (text) {
        this.events.onTranscript({
          text, isFinal: true, itemId: `tarteel-${sequence}-${randomUUID()}`, textIsDelta: false,
          confirmationEligible: false,
        });
      }
    }).catch((error: unknown) => {
      if (this.closed) return;
      this.failed = true;
      this.events.onError(error instanceof Error ? error.message : "Tarteel transcription failed");
    }).finally(() => {
      this.pendingCommits = Math.max(0, this.pendingCommits - 1);
      this.scheduleWindow();
    });
    return this.decodeTail;
  }

  close() {
    this.closed = true;
    this.ready = false;
    this.audioChunks.length = 0;
    this.bufferedBytes = 0;
  }

  isOpen() {
    return this.ready && !this.closed && !this.failed;
  }
}