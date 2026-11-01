import { randomUUID } from "node:crypto";
import type { SpeechRecognitionProvider, SpeechRecognitionProviderEvents } from "../types";
import { MODEL_SAMPLE_RATE_HZ, pcm16ToModelInput, rms } from "./pcm";
import type { CtcWord } from "./ctcDecoder";
import { FRAME_SECONDS, sharedTilawiModel, type Transcriber } from "./tilawiModel";
import { WordStabilizer, type RecognizedWord } from "./wordStabilizer";

/** Sample rate the gateway announces to clients for this provider. */
export const TILAWI_INPUT_SAMPLE_RATE_HZ = 24_000;

/** New audio needed before the next decode. */
const HOP_SECONDS = 0.4;
/** Already-settled audio re-decoded in front of new audio, for acoustic context. */
const CONTEXT_SECONDS = 1.0;
/** Upper bound on one decode, so a long unbroken stretch cannot grow without limit. */
const MAX_WINDOW_SECONDS = 12;
/** Below this level a hop is treated as silence and not decoded. */
const SILENCE_RMS = 0.002;
/** Shorter windows (a final flush right after a decode) hold no whole word. */
const MIN_DECODE_SECONDS = 0.2;
/** A decoded word needs at least this level around its frames to be real speech. */
const WORD_VOICED_RMS = 0.003;
const VOICE_MARGIN_FRAMES = 2;

/**
 * Live recitation transcription on the in-process Tilawi CTC model.
 *
 * The model is not streaming, so each hop re-decodes a short window: one
 * second of already-settled audio (context) plus the new audio. The
 * WordStabilizer decides which words are settled; those are sent as a final
 * item and the rest as that item's partial, revised on the next hop. Every
 * item is finalized exactly once, which both Tabyan clients expect.
 */
export class TilawiStreamingProvider implements SpeechRecognitionProvider {
  readonly name = "tilawi" as const;
  private model: Transcriber | null = null;
  private closed = false;
  private failed = false;
  private connecting = false;

  /** Model-rate samples kept for the next window; `audioStart` is the absolute index of audio[0]. */
  private audio = new Float32Array(0);
  private audioStart = 0;
  private decodedUntil = 0;
  /** Skipped silence moves the window forward even though no word settled. */
  private silenceUntilSeconds = 0;
  private readonly stabilizer = new WordStabilizer();

  private decoding = false;
  private flushRequested = false;
  private finalCommit: { id?: string } | null = null;
  private finalized = false;

  private readonly itemPrefix = `tilawi-${randomUUID()}`;
  private itemSequence = 0;
  private itemHasPartial = false;

  constructor(
    private readonly events: SpeechRecognitionProviderEvents,
    private readonly loadModel: () => Promise<Transcriber> = sharedTilawiModel,
  ) {}

  connect() {
    if (this.model || this.closed || this.connecting) return;
    this.connecting = true;
    this.loadModel().then((model) => {
      if (this.closed) return;
      this.model = model;
      this.events.onConnectionPhase?.("SESSION_CONFIGURED");
      this.events.onReady();
    }).catch((error: unknown) => {
      if (this.closed) return;
      this.closed = true;
      this.events.onError(error instanceof Error ? error.message : "Tilawi model failed to load");
      this.events.onClose(1011, "Tilawi model unavailable");
    });
  }

  appendAudio(base64Audio: string) {
    if (!this.isOpen() || this.finalCommit) return;
    const chunk = Buffer.from(base64Audio, "base64");
    if (!chunk.length) return;
    if (chunk.length % 2 !== 0) {
      this.fail("Tilawi received a partial PCM16 sample");
      return;
    }
    this.events.onAudioForwarded?.(chunk.length);
    const samples = pcm16ToModelInput(chunk, TILAWI_INPUT_SAMPLE_RATE_HZ);
    const merged = new Float32Array(this.audio.length + samples.length);
    merged.set(this.audio);
    merged.set(samples, this.audio.length);
    this.audio = merged;
    this.pump();
  }

  /** A non-final commit means the client heard a pause: settle everything heard so far. */
  commit(finalize = false, commitId?: string) {
    if (!this.isOpen() || this.finalCommit) return;
    if (finalize) this.finalCommit = { id: commitId };
    else this.flushRequested = true;
    this.pump();
  }

  close() {
    this.closed = true;
    this.audio = new Float32Array(0);
  }

  isOpen() {
    return !!this.model && !this.closed && !this.failed;
  }

  private get audioEnd() {
    return this.audioStart + this.audio.length;
  }

  private pump() {
    if (this.decoding || !this.isOpen() || this.finalized) return;
    const settleAll = this.finalCommit !== null || this.flushRequested;
    const newSamples = this.audioEnd - this.decodedUntil;
    if (!settleAll && newSamples < HOP_SECONDS * MODEL_SAMPLE_RATE_HZ) return;

    if (!settleAll && !this.itemHasPartial
      && rms(this.audio, Math.max(0, this.decodedUntil - this.audioStart)) < SILENCE_RMS) {
      // Nothing is waiting to settle and the new audio is silent: skip the
      // decode and slide the context forward so the next window stays short.
      this.decodedUntil = this.audioEnd;
      this.silenceUntilSeconds = this.audioEnd / MODEL_SAMPLE_RATE_HZ;
      this.trimTo(this.windowStart());
      return;
    }

    const isFinal = this.finalCommit !== null;
    const wasFlush = this.flushRequested;
    this.flushRequested = false;
    void this.decode(settleAll).then(() => {
      if (wasFlush || isFinal) this.events.onCommitAccepted?.("local_transcription_result");
      if (isFinal && this.isOpen()) {
        this.finalized = true;
        this.events.onFinalized?.(this.finalCommit?.id);
        return;
      }
      this.pump();
    });
  }

  private windowStart() {
    const floorSeconds = Math.max(this.stabilizer.settledUntilSeconds, this.silenceUntilSeconds);
    const contextStart = Math.round((floorSeconds - CONTEXT_SECONDS) * MODEL_SAMPLE_RATE_HZ);
    const capStart = this.audioEnd - MAX_WINDOW_SECONDS * MODEL_SAMPLE_RATE_HZ;
    return Math.max(this.audioStart, contextStart, capStart);
  }

  private trimTo(absoluteSample: number) {
    if (absoluteSample <= this.audioStart) return;
    this.audio = this.audio.slice(absoluteSample - this.audioStart);
    this.audioStart = absoluteSample;
  }

  private async decode(settleAll: boolean) {
    const model = this.model;
    if (!model) return;
    this.decoding = true;
    const start = this.windowStart();
    this.trimTo(start);
    const end = this.audioEnd;
    const window = this.audio.slice(0, end - start);
    try {
      const words = window.length >= MIN_DECODE_SECONDS * MODEL_SAMPLE_RATE_HZ
        ? await model.transcribe(window)
        : [];
      if (!this.isOpen()) return;
      this.decodedUntil = end;
      this.events.onAudioAccepted?.("local_transcription_result");
      this.events.onProviderEvent();
      const offsetSeconds = start / MODEL_SAMPLE_RATE_HZ;
      const { settled, pending } = this.stabilizer.update(
        words.filter((word) => this.isVoiced(window, word)).map((word) => ({
          text: word.text,
          startSeconds: offsetSeconds + word.startFrame * FRAME_SECONDS,
          endSeconds: offsetSeconds + word.endFrame * FRAME_SECONDS,
          confidence: word.confidence,
        })),
        end / MODEL_SAMPLE_RATE_HZ,
        settleAll,
      );
      this.emit(settled, pending);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : "Tilawi transcription failed");
    } finally {
      this.decoding = false;
    }
  }

  /**
   * On pauses and breaths the model can invent words ("نهاية درس"). A real
   * word has voiced audio around its frames; one decoded over silence does not.
   */
  private isVoiced(window: Float32Array, word: CtcWord) {
    const samplesPerFrame = FRAME_SECONDS * MODEL_SAMPLE_RATE_HZ;
    const from = Math.max(0, (word.startFrame - VOICE_MARGIN_FRAMES) * samplesPerFrame);
    const to = Math.min(window.length, (word.endFrame + VOICE_MARGIN_FRAMES) * samplesPerFrame);
    return rms(window, from, to) >= WORD_VOICED_RMS;
  }

  private emit(settled: RecognizedWord[], pending: RecognizedWord[]) {
    if (settled.length) {
      this.sendItem(settled, true);
      this.itemSequence += 1;
      this.itemHasPartial = false;
    }
    if (pending.length || this.itemHasPartial) {
      this.sendItem(pending, false);
      this.itemHasPartial = pending.length > 0;
    }
  }

  private sendItem(words: RecognizedWord[], isFinal: boolean) {
    this.events.onTranscript({
      text: words.map((word) => word.text).join(" "),
      isFinal,
      itemId: `${this.itemPrefix}-${this.itemSequence}`,
      textIsDelta: false,
      startMs: words.length ? Math.round(words[0].startSeconds * 1000) : undefined,
      endMs: words.length ? Math.round(words[words.length - 1].endSeconds * 1000) : undefined,
      confidence: words.length ? Math.min(...words.map((word) => word.confidence)) : undefined,
      // Unvalidated ASR may suggest review; it never confirms a mistake.
      confirmationEligible: false,
    });
  }

  private fail(message: string) {
    if (this.closed || this.failed) return;
    this.failed = true;
    this.events.onError(message);
  }
}
