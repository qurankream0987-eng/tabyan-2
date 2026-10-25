/**
 * @license
 * Tabyan Smart Mushaf — live microphone pipeline (Web)
 *
 * getUserMedia → AudioWorklet (20 ms PCM16 @ 16 kHz) → main-thread VAD →
 * frame listeners. Frames always flow (VAD never gates audio). Pausing
 * suspends the AudioContext but keeps the granted stream, so resume is
 * instant and never re-prompts for permission. Nothing is recorded or
 * persisted: frames exist only in memory on their way to the provider.
 */

import { EnergyVad, DEFAULT_VAD_CONFIG, type EnergyVadConfig } from './EnergyVad';
import type { LiveAudioFrame } from '../contracts/provider';
import pcmFrameWorkletUrl from './pcm-frame-worklet.js?url&no-inline';

export type MicFailure = 'denied' | 'unavailable' | 'interrupted';

export class MicPipelineError extends Error {
  constructor(readonly failure: MicFailure, message: string) {
    super(message);
    this.name = 'MicPipelineError';
  }
}

export interface MicChunk {
  readonly pcm: Int16Array;
  readonly rms: number;
  /** Wall-clock ms of the first sample. */
  readonly captureTimestamp: number;
}

/** Platform audio source. The Web implementation uses getUserMedia + AudioWorklet. */
export interface MicSource {
  readonly frameMs: number;
  start(onChunk: (chunk: MicChunk) => void): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  stop(): void;
}

export interface MicTimings {
  readonly startCalledAt: number | null;
  readonly audioReadyAt: number | null;
  readonly firstSpeechAt: number | null;
}

function now(): number {
  return typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

export function classifyMicError(error: unknown): MicFailure {
  const name = (error as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError'
    || name === 'AbortError' || name === 'TypeError' || name === 'NotSupportedError') return 'unavailable';
  return 'unavailable';
}

interface SharedAudio {
  readonly context: AudioContext;
  readonly workletReady: Promise<void>;
}

/**
 * One AudioContext per page. Constructing the first context blocks the main
 * thread while the audio device starts (≈115 ms measured in Chromium), so it
 * is created during idle time when a live mode opens, starts suspended, and
 * is only resumed inside the tap. Sessions reuse it; it is closed on release.
 */
let sharedAudio: SharedAudio | null = null;

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    || null;
}

function acquireSharedAudio(): SharedAudio | null {
  if (sharedAudio && sharedAudio.context.state !== 'closed') return sharedAudio;
  const AudioCtx = audioContextClass();
  if (!AudioCtx || typeof AudioWorkletNode === 'undefined') return null;
  const context = new AudioCtx({ latencyHint: 'interactive' });
  sharedAudio = { context, workletReady: context.audioWorklet.addModule(pcmFrameWorkletUrl) };
  return sharedAudio;
}

/** Warms the audio device off the tap's critical path (call when a live mode opens). */
export function prewarmMicrophone(): void {
  if (sharedAudio) return;
  const shared = acquireSharedAudio();
  // Outside a gesture the context may start running; keep it idle until the tap.
  if (shared && shared.context.state === 'running') void shared.context.suspend().catch(() => {});
}

/** Closes the shared audio device (call when the Mushaf route unmounts). */
export function releaseMicrophone(): void {
  const shared = sharedAudio;
  sharedAudio = null;
  if (shared && shared.context.state !== 'closed') void shared.context.close().catch(() => {});
}

/** Resolves after the next frame is presented, so a pending UI state paints first. */
function nextPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve();
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export class WebMicSource implements MicSource {
  readonly frameMs = 20;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onInterrupted: (() => void) | null = null;
  /** Bumped by stop(); a start() that outlives its generation tears itself down. */
  private generation = 0;

  constructor(onInterrupted?: () => void) {
    this.onInterrupted = onInterrupted ?? null;
  }

  async start(onChunk: (chunk: MicChunk) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicPipelineError('unavailable', 'getUserMedia unsupported');
    }
    if (!audioContextClass() || typeof AudioWorkletNode === 'undefined') {
      throw new MicPipelineError('unavailable', 'AudioWorklet unsupported');
    }
    const generation = ++this.generation;
    const superseded = () => generation !== this.generation;
    // Cold start: let the "preparing" state paint before the device start
    // blocks the main thread. One frame stays well inside the tap's user
    // activation window, which mobile Safari needs for resume().
    if (!sharedAudio) await nextPaint();
    const shared = acquireSharedAudio()!;
    const { context, workletReady } = shared;
    this.context = context;
    const resumed = context.resume();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      void context.suspend().catch(() => {});
      this.context = null;
      throw new MicPipelineError(classifyMicError(error), 'microphone permission or device failure');
    }
    if (superseded()) {
      stream.getTracks().forEach((track) => track.stop());
      throw new MicPipelineError('interrupted', 'microphone start superseded');
    }
    this.stream = stream;
    await workletReady;
    await resumed;
    if (superseded()) {
      stream.getTracks().forEach((track) => track.stop());
      throw new MicPipelineError('interrupted', 'microphone start superseded');
    }

    const wallOffset = now() - context.currentTime * 1000;
    this.source = context.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(context, 'tabyan-pcm-frame', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: 1,
      channelCountMode: 'explicit',
    });
    this.node.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; rms: number; startFrame: number }>) => {
      const { pcm, rms, startFrame } = event.data;
      onChunk({
        pcm: new Int16Array(pcm),
        rms,
        captureTimestamp: wallOffset + (startFrame / context.sampleRate) * 1000,
      });
    };
    this.node.onprocessorerror = () => this.onInterrupted?.();
    for (const track of stream.getAudioTracks()) track.addEventListener('ended', () => this.onInterrupted?.());
    // The worklet outputs silence; the microphone is never played back.
    this.source.connect(this.node);
    this.node.connect(context.destination);
  }

  async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') await this.context.resume();
  }

  stop(): void {
    this.generation += 1;
    if (this.node) {
      this.node.port.onmessage = null;
      this.node.disconnect();
      this.node = null;
    }
    this.source?.disconnect();
    this.source = null;
    // Keep the shared device warm but idle; the microphone itself is released.
    if (this.context && this.context.state === 'running') void this.context.suspend().catch(() => {});
    this.context = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

export interface MicPipelineEvents {
  onFrame(frame: LiveAudioFrame): void;
  onSpeech(speaking: boolean, at: number): void;
  onFailure(failure: MicFailure): void;
}

export class MicrophonePipeline {
  private readonly vad: EnergyVad;
  private seq = 0;
  private running = false;
  private paused = false;
  private timings: MicTimings = { startCalledAt: null, audioReadyAt: null, firstSpeechAt: null };

  constructor(
    private readonly source: MicSource,
    private readonly events: MicPipelineEvents,
    vadConfig: EnergyVadConfig = DEFAULT_VAD_CONFIG,
  ) {
    this.vad = new EnergyVad(vadConfig);
  }

  getTimings(): MicTimings {
    return this.timings;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.seq = 0;
    this.paused = false;
    this.vad.reset();
    this.timings = { startCalledAt: now(), audioReadyAt: null, firstSpeechAt: null };
    // Running before the source resolves, so the very first frames are kept.
    this.running = true;
    try {
      await this.source.start((chunk) => this.handleChunk(chunk));
    } catch (error) {
      this.running = false;
      this.source.stop();
      const failure = error instanceof MicPipelineError ? error.failure : classifyMicError(error);
      this.events.onFailure(failure);
      throw error instanceof MicPipelineError ? error : new MicPipelineError(failure, 'microphone start failed');
    }
    this.timings = { ...this.timings, audioReadyAt: now() };
  }

  async pause(): Promise<void> {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.vad.isSpeaking()) this.events.onSpeech(false, now());
    this.vad.reset();
    await this.source.suspend();
  }

  async resume(): Promise<void> {
    if (!this.running || !this.paused) return;
    this.paused = false;
    await this.source.resume();
  }

  stop(): void {
    const wasSpeaking = this.vad.isSpeaking();
    this.running = false;
    this.paused = false;
    this.source.stop();
    this.vad.reset();
    if (wasSpeaking) this.events.onSpeech(false, now());
  }

  private handleChunk(chunk: MicChunk): void {
    if (!this.running || this.paused) return;
    const transition = this.vad.push(chunk.rms, this.source.frameMs);
    if (transition) {
      const at = now();
      if (transition === 'speech-start' && this.timings.firstSpeechAt === null) {
        this.timings = { ...this.timings, firstSpeechAt: at };
      }
      this.events.onSpeech(transition === 'speech-start', at);
    }
    this.seq += 1;
    this.events.onFrame({
      pcm: chunk.pcm,
      sampleRate: 16000,
      seq: this.seq,
      captureTimestamp: chunk.captureTimestamp,
      speech: this.vad.isSpeaking(),
    });
  }
}
