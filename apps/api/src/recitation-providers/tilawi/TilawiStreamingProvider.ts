import { randomUUID } from "node:crypto";
import type { SpeechRecognitionProvider, SpeechRecognitionProviderEvents } from "../types";
import { MODEL_SAMPLE_RATE_HZ, pcm16ToModelInput, rms } from "./pcm";
import type { CtcWord } from "./ctcDecoder";
import { FRAME_SECONDS, sharedTilawiModel, type Transcriber } from "./tilawiModel";
import { WordStabilizer, type RecognizedWord } from "./wordStabilizer";

/**
 * Sample rate the gateway announces to clients for this provider: the model's own rate.
 * Anything above it is resampled away here, so sending it only costs the reciter's uplink.
 */
export const TILAWI_INPUT_SAMPLE_RATE_HZ = MODEL_SAMPLE_RATE_HZ;

/** A tuning value from the environment, or its default when unset or not a positive number. */
function seconds(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
/**
 * New audio needed before the next decode. A decode takes about 160 ms on four
 * threads, so a quarter second keeps the model busy about two thirds of the time
 * and the pointer at most a quarter second behind the audio before decoding.
 */
const HOP_SECONDS = seconds("TABYAN_TILAWI_HOP_SECONDS", 0.25);
/**
 * Already-settled audio re-decoded in front of new audio, for acoustic context. The model
 * reads a word reliably only with a couple of words before it: on 287 whole ayahs, two
 * seconds against 0.8 took a third off the correct readings stopped by a misheard word.
 */
const CONTEXT_SECONDS = seconds("TABYAN_TILAWI_CONTEXT_SECONDS", 2);
/**
 * Silence appended after the newest audio. The model holds back the last
 * pieces of a word until it hears what follows; a silent tail lets it close
 * the word at the edge now, which cuts the pointer's lag by about 200 ms.
 */
const PAD_SECONDS = 0.3;
/** Upper bound on one decode, so a long unbroken stretch cannot grow without limit. */
const MAX_WINDOW_SECONDS = 12;
/**
 * Silence and voiced speech are judged against the background noise measured on
 * this session's own audio, so recitation under the breath in a quiet room is
 * decoded while the noise of a louder room is not. These floors hold when the
 * input is digital silence.
 */
const MIN_SILENCE_RMS = 0.0006;
const MIN_VOICED_RMS = 0.0008;
/** A hop below this multiple of the noise floor is silence and not decoded. */
const SILENCE_OVER_NOISE = 2.5;
/** A decoded word needs this multiple of the noise floor around its frames to be real speech. */
const VOICED_OVER_NOISE = 3;
/**
 * The noise floor follows quieter chunks quickly and louder ones slowly: within
 * a few seconds for noise-level audio, and over about half a minute while the
 * reciter is heard, so steady recitation is never taken for a noisy room.
 */
const NOISE_FALL = 0.7;
const NOISE_RISE = 1.02;
const NOISE_RISE_DURING_SPEECH = 1.002;
/** Shorter windows (a final flush right after a decode) hold no whole word. */
const MIN_DECODE_SECONDS = 0.2;
const VOICE_MARGIN_FRAMES = 2;
/** Quiet audio is raised towards this level before decoding, by at most MAX_INPUT_GAIN. */
const TARGET_INPUT_RMS = 0.05;
const MAX_INPUT_GAIN = 12;
/**
 * The confidence a client takes a different word as a mistake from. A word the model spelled
 * with less (pieces it wavered between) is still surely not the expected word when the audio
 * fits it this many nats better than any expected word; it is then sent at that confidence.
 * Measured on planted wrong words: 8 nats recovers most of those a plain confidence gate lets pass.
 */
const SURE_CONFIDENCE = 0.86;
const MIN_HEARD_CONFIDENCE = 0.6;
const SURE_MARGIN = seconds("TABYAN_TILAWI_SURE_MARGIN", 8);

/** The confidence sent for a word: its own, raised when the audio rules the expected words out. */
function sentConfidence(word: RecognizedWord) {
  const sure = word.margin !== undefined && word.margin >= SURE_MARGIN && word.confidence >= MIN_HEARD_CONFIDENCE;
  return sure ? Math.max(word.confidence, SURE_CONFIDENCE) : word.confidence;
}

/** A copy of quiet audio raised towards TARGET_INPUT_RMS; loud audio is passed as it is. */
function raised(window: Float32Array): Float32Array {
  const level = rms(window);
  if (level <= 0 || level >= TARGET_INPUT_RMS) return window;
  const gain = Math.min(MAX_INPUT_GAIN, TARGET_INPUT_RMS / level);
  const out = new Float32Array(window.length);
  for (let i = 0; i < window.length; i++) out[i] = Math.max(-1, Math.min(1, window[i] * gain));
  return out;
}

function padded(window: Float32Array): Float32Array {
  const pad = Math.round(PAD_SECONDS * MODEL_SAMPLE_RATE_HZ);
  if (!pad) return window;
  const out = new Float32Array(window.length + pad);
  out.set(window);
  return out;
}

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
  /** Background noise level of this session's audio (RMS per chunk). */
  private noiseFloor = 0.001;
  private readonly stabilizer = new WordStabilizer();
  /** Folded later by the decoder. Empty: open search, no bias toward a place. */
  private preferred: string[] = [];

  private decoding = false;
  private flushRequested = false;
  private finalCommit: { id?: string } | null = null;
  private finalized = false;

  private readonly decodeMs: number[] = [];
  private readonly windowSeconds: number[] = [];

  private readonly itemPrefix = `tilawi-${randomUUID()}`;
  private itemSequence = 0;
  private itemHasPartial = false;

  constructor(
    private readonly events: SpeechRecognitionProviderEvents,
    private readonly loadModel: () => Promise<Transcriber> = sharedTilawiModel,
    /** Rate of the PCM16 this session receives. */
    private readonly inputSampleRateHz: number = TILAWI_INPUT_SAMPLE_RATE_HZ,
  ) {}

  /** The next words at the reader's place. The following decode prefers them. */
  noteExpected(words: readonly string[]) {
    const next: string[] = [];
    for (const word of words) {
      if (next.length >= 12) break;
      if (typeof word !== "string") continue;
      const text = word.trim();
      if (text && text.length <= 40) next.push(text);
    }
    this.preferred = next;
  }

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
    const samples = pcm16ToModelInput(chunk, this.inputSampleRateHz);
    const level = rms(samples);
    this.noiseFloor = level < this.noiseFloor
      ? this.noiseFloor * NOISE_FALL + level * (1 - NOISE_FALL)
      : Math.min(level, this.noiseFloor * (level >= this.silenceRms() ? NOISE_RISE_DURING_SPEECH : NOISE_RISE));
    const merged = new Float32Array(this.audio.length + samples.length);
    merged.set(this.audio);
    merged.set(samples, this.audio.length);
    this.audio = merged;
    this.pump();
  }

  /** A non-final commit means the client heard a pause: settle every word clear of the window edge. */
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

  /** Decode timing of this session, for the session log. */
  stats() {
    const quantile = (values: number[], share: number) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * share))];
    };
    return {
      decodes: this.decodeMs.length,
      decodeMsP50: Math.round(quantile(this.decodeMs, 0.5)),
      decodeMsP90: Math.round(quantile(this.decodeMs, 0.9)),
      decodeMsMax: Math.round(quantile(this.decodeMs, 1)),
      windowSecondsP50: Math.round(quantile(this.windowSeconds, 0.5) * 100) / 100,
      hopSeconds: HOP_SECONDS,
      contextSeconds: CONTEXT_SECONDS,
    };
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
      && rms(this.audio, Math.max(0, this.decodedUntil - this.audioStart)) < this.silenceRms()) {
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
    void this.decode(isFinal ? "all" : wasFlush ? "flush" : "agreed").then(() => {
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

  private async decode(settle: "agreed" | "flush" | "all") {
    const model = this.model;
    if (!model) return;
    this.decoding = true;
    const start = this.windowStart();
    this.trimTo(start);
    const end = this.audioEnd;
    const window = this.audio.slice(0, end - start);
    try {
      const startedAt = performance.now();
      const words = window.length >= MIN_DECODE_SECONDS * MODEL_SAMPLE_RATE_HZ
        ? await model.transcribe(padded(raised(window)), this.preferred)
        : [];
      if (this.decodeMs.length < 4096) {
        this.decodeMs.push(performance.now() - startedAt);
        this.windowSeconds.push(window.length / MODEL_SAMPLE_RATE_HZ);
      }
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
          margin: word.margin,
        })),
        end / MODEL_SAMPLE_RATE_HZ,
        settle,
        this.preferred,
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
    return rms(window, from, to) >= Math.max(MIN_VOICED_RMS, this.noiseFloor * VOICED_OVER_NOISE);
  }

  private silenceRms() {
    return Math.max(MIN_SILENCE_RMS, this.noiseFloor * SILENCE_OVER_NOISE);
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
      confidence: words.length ? Math.min(...words.map(sentConfidence)) : undefined,
      // The model's confidence in each word, so a word it barely heard is never a mistake.
      wordConfidences: words.map((word) => Math.round(sentConfidence(word) * 1000) / 1000),
      wordMargins: words.map((word) => (word.margin === undefined ? null : Math.round(word.margin * 100) / 100)),
      // Settled words may confirm a mistake; the client still needs the reciter to read
      // on correctly past it first. A revisable tail never does.
      confirmationEligible: isFinal,
    });
  }

  private fail(message: string) {
    if (this.closed || this.failed) return;
    this.failed = true;
    this.events.onError(message);
  }
}
