import type {
  NativeQuranLiveMatcher,
  NativeRecitationCallbacks,
  NativeRecitationState,
} from "./native-recitation-matcher";
import { NativeRecitationFeedback, type NativeRecitationCue } from "./native-recitation-feedback";

export interface NativeSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
}

export interface NativeAudioBuffer {
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export interface NativeAudioRecorder {
  onAudioReady(
    options: { sampleRate: number; bufferLength: number; channelCount: number },
    callback: (event: { buffer: NativeAudioBuffer }) => void,
  ): { status: string; message?: string };
  start(): Promise<{ status: string; message?: string }>;
  pause(): void;
  resume(): void;
  stop(): void | Promise<unknown>;
  clearOnAudioReady(): void;
  isRecording(): boolean;
}

export interface NativeRecitationRuntime {
  isWeb: boolean;
  requestMicrophonePermission(): Promise<boolean>;
  getWebSocketUrl(): string;
  createSocket(url: string): NativeSocket;
  createRecorder(): NativeAudioRecorder;
  playCue?(cue: NativeRecitationCue): unknown;
  disposeAudio?(): void;
  readyTimeoutMs?: number;
  finalTimeoutMs?: number;
}

export interface NativeMatcherLike {
  feed(text: string, itemId: string, isFinal: boolean): ReturnType<NativeQuranLiveMatcher["feed"]>;
}

const SOCKET_OPEN = 1;

function resampleMono(channels: Float32Array[], sourceRate: number, targetRate: number) {
  const sourceLength = channels[0]?.length ?? 0;
  if (!sourceLength) return new Float32Array();
  const mono = new Float32Array(sourceLength);
  for (let index = 0; index < sourceLength; index += 1) {
    mono[index] = channels.reduce((sum, channel) => sum + (channel[index] ?? 0), 0) / Math.max(channels.length, 1);
  }
  if (sourceRate === targetRate) return mono;
  const targetLength = Math.max(1, Math.round(sourceLength * targetRate / sourceRate));
  const result = new Float32Array(targetLength);
  const ratio = sourceRate / targetRate;
  for (let index = 0; index < targetLength; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(sourceLength - 1, left + 1);
    const amount = sourceIndex - left;
    result[index] = mono[left] * (1 - amount) + mono[right] * amount;
  }
  return result;
}

function pcm16leBase64(samples: Float32Array) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | (b === undefined ? 0 : b >> 4)];
    output += b === undefined ? "=" : alphabet[((b & 15) << 2) | (c === undefined ? 0 : c >> 6)];
    output += c === undefined ? "=" : alphabet[c & 63];
  }
  return output;
}

function safeError(error: unknown) {
  return error instanceof Error ? error : new Error("Native recitation failed");
}

/**
 * Platform-independent lifecycle core. The Native adapter injects audio and
 * WebSocket implementations; tests inject deterministic fakes.
 */
export class NativeRecitationControllerCore {
  private socket: NativeSocket | null = null;
  private recorder: NativeAudioRecorder | null = null;
  private closed = false;
  private hasStarted = false;
  private recorderStarted = false;
  private paused = false;
  private targetSampleRate = 24_000;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private commitTimer: ReturnType<typeof setInterval> | null = null;
  private stopFlight: Promise<boolean> | null = null;
  private stopping = false;
  private provider = "openai";
  private audioSinceCommit = false;
  private finalCommitId: string | null = null;
  private finalResolve: (() => void) | null = null;
  private finalReject: ((error: Error) => void) | null = null;
  private items = new Map<string, { text: string; final: boolean }>();
  private eventIds = new Set<string>();
  private finalizedSuccessfully = false;
  private cancelled = false;
  private readonly feedback = new NativeRecitationFeedback((cue) => this.runtime.playCue?.(cue));

  constructor(
    private readonly matcher: NativeMatcherLike,
    private readonly callbacks: NativeRecitationCallbacks,
    private readonly runtime: NativeRecitationRuntime,
  ) {}

  async start(token: string, sessionId: string) {
    if (this.hasStarted) throw new Error("Create a new controller for another session");
    this.hasStarted = true;
    if (this.runtime.isWeb) throw new Error("Live recitation requires a Native device");
    if (!token || !sessionId) throw new Error("Session authorization is required");
    this.closed = false;
    this.callbacks.onState?.("connecting");

    try {
      if (!(await this.runtime.requestMicrophonePermission())) {
        throw new Error("Microphone permission was not granted");
      }
      if (this.closed) throw new Error("Recitation session was stopped");
      await new Promise<void>((resolve, reject) => {
        this.readyResolve = resolve;
        this.readyReject = reject;
        this.readyTimer = setTimeout(() => this.fail(new Error("Live provider readiness timed out")), this.runtime.readyTimeoutMs ?? 15_000);
        const socket = this.runtime.createSocket(this.runtime.getWebSocketUrl());
        this.socket = socket;
        socket.onopen = () => {
          if (!this.closed) socket.send(JSON.stringify({ t: "auth", token, sessionId }));
        };
        socket.onmessage = (event) => this.handleMessage(String(event.data));
        socket.onerror = () => this.fail(new Error("Live recitation connection failed"));
        socket.onclose = () => {
          if (!this.closed) this.fail(new Error("Live recitation connection closed"));
        };
      });
      if (this.closed) throw new Error("Recitation session was stopped");
      await this.startRecorder();
    } catch (error) {
      if (!this.closed) this.fail(safeError(error));
      throw safeError(error);
    }
  }

  private handleMessage(raw: string) {
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      message = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    if (message.t === "authenticated") return;
    if (message.t === "ready") {
      if (!this.readyResolve || this.closed) return;
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      if (typeof message.provider === "string") this.provider = message.provider;
      const rate = message.audioSampleRateHz;
      if (typeof rate === "number" && Number.isFinite(rate) && rate >= 8_000 && rate <= 48_000) {
        this.targetSampleRate = rate;
      }
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    if (message.t === "transcript") {
      if (typeof message.text !== "string") return;
      const isFinal = message.isFinal === true;
      const itemId = typeof message.itemId === "string" ? message.itemId : "native";
      const eventId = typeof message.eventId === "string" ? message.eventId : null;
      if (eventId && this.eventIds.has(eventId)) return;
      if (eventId) {
        this.eventIds.add(eventId);
        if (this.eventIds.size > 4096) this.eventIds.delete(this.eventIds.values().next().value!);
      }
      const previous = this.items.get(itemId);
      if (previous?.final) return; // Late delta or replayed final cannot commit twice.
      const text = !isFinal && message.textIsDelta === true
        ? (previous?.text ?? "") + message.text : message.text;
      if (text.length > 32_000) { this.fail(new Error("Transcript item too large")); return; }
      if (!isFinal && previous?.text === text) return;
      this.items.set(itemId, { text, final: isFinal });
      // Retain a bounded finalized-item replay history; never evict open items.
      if (this.items.size > 512) {
        const completed = [...this.items].find(([, item]) => item.final);
        if (completed) this.items.delete(completed[0]);
        else { this.fail(new Error("Too many pending transcript items")); return; }
      }
      this.callbacks.onMatch?.(this.matcher.feed(text, itemId, isFinal));
      return;
    }
    if (message.t === "finalized" && this.stopping && message.commitId === this.finalCommitId) {
      this.finalResolve?.();
      return;
    }
    if (message.t === "error") this.fail(new Error("Live transcription provider failed"));
  }

  private async startRecorder() {
    if (this.closed) throw new Error("Recitation session was stopped");
    const recorder = this.runtime.createRecorder();
    this.recorder = recorder;
    const callbackResult = recorder.onAudioReady(
      { sampleRate: 24_000, bufferLength: 2_400, channelCount: 1 },
      ({ buffer }) => {
        if (this.closed || !this.socket || this.socket.readyState !== SOCKET_OPEN) return;
        const channels = Array.from(
          { length: buffer.numberOfChannels },
          (_, channel) => buffer.getChannelData(channel),
        );
        const samples = resampleMono(channels, buffer.sampleRate, this.targetSampleRate);
        if (!samples.length) return;
        this.audioSinceCommit = true;
        try {
          this.socket.send(JSON.stringify({
            t: "audio",
            audio: pcm16leBase64(samples),
            timing: { audioChunkCreatedAt: Date.now(), audioChunkSentAt: Date.now() },
          }));
        } catch (error) { this.fail(safeError(error)); }
      },
    );
    if (callbackResult.status === "error") throw new Error(callbackResult.message ?? "Audio recorder setup failed");
    const startResult = await recorder.start();
    if (startResult.status === "error") throw new Error(startResult.message ?? "Audio recorder failed to start");
    if (this.closed) {
      this.cleanupRecorderInstance(recorder);
      throw new Error("Recitation session was stopped");
    }
    this.recorderStarted = true;
    // Bound uninterrupted provider buffers without creating an automatic retry.
    this.commitTimer = setInterval(() => {
      if (this.closed || this.stopping || this.paused || !this.audioSinceCommit) return;
      try {
        this.socket?.send(JSON.stringify({ t: "commit" }));
        this.audioSinceCommit = false;
      } catch (error) { this.fail(safeError(error)); }
    }, 5_000);
    this.callbacks.onState?.("recording");
    this.feedback.ready();
  }

  pause() {
    if (this.closed || this.stopping || this.paused || !this.recorder || this.socket?.readyState !== SOCKET_OPEN) return false;
    try {
      this.recorder.pause();
      this.paused = true;
      this.socket.send(JSON.stringify({ t: "commit" }));
      this.audioSinceCommit = false;
      this.callbacks.onState?.("paused");
      return true;
    } catch (error) {
      this.fail(safeError(error));
      return false;
    }
  }

  resume() {
    if (this.closed || this.stopping || !this.paused || !this.recorder || !this.socket || this.socket.readyState !== SOCKET_OPEN) return false;
    try {
      this.recorder.resume();
      this.paused = false;
      this.callbacks.onState?.("recording");
      return true;
    } catch (error) {
      this.fail(safeError(error));
      return false;
    }
  }

  stop(): Promise<boolean> {
    if (this.stopFlight) return this.stopFlight;
    this.stopping = true;
    this.stopFlight = this.finalize();
    return this.stopFlight;
  }

  private async finalize(): Promise<boolean> {
    const socket = this.socket;
    if (this.closed || !this.recorderStarted || socket?.readyState !== SOCKET_OPEN) {
      this.abort();
      return false;
    }
    if (this.commitTimer) clearInterval(this.commitTimer);
    this.commitTimer = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // AudioRecorder.stop is asynchronous on real Native. Keep the callback
      // alive until it finishes so queued final PCM precedes the final commit.
      const recorder = this.recorder;
      const result = await recorder?.stop();
      if (result && typeof result === "object" && "status" in result && result.status === "error") {
        throw new Error("Audio recorder could not flush");
      }
      recorder?.clearOnAudioReady();
      this.recorder = null;
      this.recorderStarted = false;
      if (this.closed || socket.readyState !== SOCKET_OPEN) throw new Error("Transport closed before finalization");
      // Unchanged providers without a drain acknowledgement fail closed here.
      if (this.provider !== "openai" && this.provider !== "tarteel") {
        throw new Error("Provider finalization acknowledgement unavailable");
      }
      this.finalCommitId = `native-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const drained = new Promise<void>((resolve, reject) => {
        this.finalResolve = resolve;
        this.finalReject = reject;
        timer = setTimeout(() => reject(new Error("Final audio acknowledgement timed out")),
          this.runtime.finalTimeoutMs ?? (this.provider === "tarteel" ? 120_000 : 10_000));
      });
      // A synchronous send failure must not leave an unobserved rejected waiter.
      void drained.catch(() => {});
      socket.send(JSON.stringify({ t: "commit", final: true, commitId: this.finalCommitId }));
      await drained;
      clearTimeout(timer);
      if (this.closed) throw new Error("Finalization cancelled");
      this.closed = true;
      const disconnected = new Promise<void>((resolve, reject) => {
        socket.onclose = () => resolve();
        socket.onerror = () => reject(new Error("Transport close failed"));
        timer = setTimeout(() => reject(new Error("Transport close timed out")), 3_000);
      });
      void disconnected.catch(() => {});
      socket.send(JSON.stringify({ t: "close" }));
      socket.close();
      await disconnected;
      this.detachSocket(socket);
      this.socket = null;
      this.items.clear();
      this.eventIds.clear();
      this.finalizedSuccessfully = true;
      this.callbacks.onState?.("stopped");
      return true;
    } catch (error) {
      if (!this.cancelled) {
        this.closed = false; // Failure during the close handshake also needs cleanup.
        this.fail(safeError(error));
      }
      return false;
    } finally {
      clearTimeout(timer);
      this.finalResolve = null;
      this.finalReject = null;
      this.finalCommitId = null;
    }
  }

  setSoundsEnabled(enabled: boolean) { this.feedback.enabled = enabled; }

  observeWordState(key: string, state: string, authoritativeEvidence = false) {
    this.feedback.observeWordState(key, state, authoritativeEvidence);
  }

  /** Called only after both drained transport and successful server persistence. */
  async completeSuccessfully() {
    if (this.finalizedSuccessfully) await this.feedback.complete(true);
    this.runtime.disposeAudio?.();
  }

  releaseFeedbackAudio() {
    this.runtime.disposeAudio?.();
  }

  async dispose() {
    const wasOpen = !this.closed;
    this.cancelled = true;
    this.finalizedSuccessfully = false;
    this.finalReject?.(new Error("Finalization cancelled"));
    this.feedback.complete(false);
    this.abort();
    this.runtime.disposeAudio?.();
    if (wasOpen) this.callbacks.onState?.("stopped");
  }

  private abort() {
    this.hasStarted = true;
    this.closed = true;
    if (this.readyTimer) clearTimeout(this.readyTimer);
    if (this.commitTimer) clearInterval(this.commitTimer);
    this.readyTimer = null;
    this.commitTimer = null;
    this.readyReject?.(new Error("Recitation session stopped"));
    this.readyResolve = null;
    this.readyReject = null;
    this.stopRecorder();
    const socket = this.socket;
    this.socket = null;
    this.detachSocket(socket);
    try { socket?.close(); } catch { /* Already disconnected. */ }
    this.items.clear();
    this.eventIds.clear();
  }

  private stopRecorder() {
    const recorder = this.recorder;
    if (!recorder) return;
    try {
      recorder.clearOnAudioReady();
    } catch {
      // Keep trying to stop capture even if callback cleanup fails.
    }
    this.cleanupRecorderInstance(recorder);
  }

  private cleanupRecorderInstance(recorder: NativeAudioRecorder) {
    try {
      if (this.recorderStarted || recorder.isRecording()) Promise.resolve(recorder.stop()).catch(() => {});
    } catch {
      // Cleanup remains best-effort after the session is closed.
    }
    if (this.recorder === recorder) {
      this.recorderStarted = false;
      this.recorder = null;
    }
    this.paused = false;
  }

  private detachSocket(socket: NativeSocket | null) {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }

  private fail(error: Error) {
    if (this.closed) return;
    this.finalReject?.(error);
    this.readyReject?.(error);
    this.readyResolve = null;
    this.readyReject = null;
    this.feedback.complete(false);
    this.abort();
    this.runtime.disposeAudio?.();
    this.callbacks.onState?.("error", "تعذر متابعة جلسة التسميع الحي.");
  }
}
