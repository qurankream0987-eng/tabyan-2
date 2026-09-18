import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { Platform } from "react-native";
import { normalizeQuranText } from "./quran-normalizer";
import type { CanonicalQuranWord } from "./mushaf-native";

export type NativeRecitationState = "idle" | "connecting" | "recording" | "paused" | "stopped" | "error";

export interface NativeRecitationMatch {
  current: CanonicalQuranWord | null;
  revealedWords: Map<string, number>;
  confidence: number;
  stable: boolean;
}

export interface NativeRecitationCallbacks {
  onState?: (state: NativeRecitationState, message?: string) => void;
  onMatch?: (match: NativeRecitationMatch) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

type NativeSocket = {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
};

const SOCKET_OPEN = 1;

function similarity(heard: string, expected: string) {
  if (!heard || !expected) return 0;
  if (heard === expected) return 1;
  const rows = Array.from({ length: heard.length + 1 }, () => new Array(expected.length + 1).fill(0));
  for (let i = 0; i <= heard.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= expected.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= heard.length; i += 1) {
    for (let j = 1; j <= expected.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (heard[i - 1] === expected[j - 1] ? 0 : 1),
      );
    }
  }
  return Math.max(0, 1 - rows[heard.length][expected.length] / Math.max(heard.length, expected.length, 1));
}

interface NativeMatcherOptions {
  trackingForwardWindow?: number;
  trackingBackwardWindow?: number;
  recoveryMismatchLimit?: number;
  commitStability?: number;
  confidenceThreshold?: number;
  generalPositionFollowing?: boolean;
  ignoreOptionalBasmala?: boolean;
}

interface Alignment {
  start: number;
  end: number;
  confidence: number;
}

const BASMALA_TOKENS = ["بسم", "الله", "الرحمن", "الرحيم"];

function tokens(text: string) {
  return normalizeQuranText(text).split(" ").filter(Boolean);
}

function tokenCost(heard: string, expected: string) {
  if (heard === expected) return 0;
  const distance = 1 - similarity(heard, expected);
  return distance <= 0.25 ? 0.35 + distance : 1;
}

function sequenceCost(heard: string[], expected: string[]) {
  const dp = Array.from({ length: heard.length + 1 }, () => new Array<number>(expected.length + 1).fill(0));
  for (let i = 0; i <= heard.length; i += 1) dp[i][0] = i * 0.9;
  for (let j = 0; j <= expected.length; j += 1) dp[0][j] = j * 0.9;
  for (let i = 1; i <= heard.length; i += 1) {
    for (let j = 1; j <= expected.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 0.9,
        dp[i][j - 1] + 0.9,
        dp[i - 1][j - 1] + tokenCost(heard[i - 1], expected[j - 1]),
      );
    }
  }
  return dp[heard.length][expected.length];
}

/**
 * Native port of the Web live matcher contract. The committed cursor only
 * advances on a stable alignment; partial deltas, recovery, duplicate events,
 * optional basmala, and a preloaded next page use the same rules as Web.
 */
export class NativeQuranLiveMatcher {
  private committed = 0;
  private committedCurrent: CanonicalQuranWord | null = null;
  private provisional: CanonicalQuranWord | null = null;
  private pendingStart = -1;
  private pendingEnd = -1;
  private stability = 0;
  private lastEvent = "";
  private mode: "tracking" | "recovery" = "tracking";
  private mismatchCount = 0;
  private readonly options: Required<NativeMatcherOptions>;
  private readonly tokensByItem = new Map<string, string[]>();

  constructor(private words: CanonicalQuranWord[], options: NativeMatcherOptions = {}) {
    this.options = {
      trackingForwardWindow: options.trackingForwardWindow ?? 16,
      trackingBackwardWindow: options.trackingBackwardWindow ?? 3,
      recoveryMismatchLimit: options.recoveryMismatchLimit ?? 3,
      commitStability: options.commitStability ?? 2,
      confidenceThreshold: options.confidenceThreshold ?? 0.68,
      generalPositionFollowing: options.generalPositionFollowing ?? true,
      ignoreOptionalBasmala: options.ignoreOptionalBasmala ?? true,
    };
  }

  appendWords(nextWords: CanonicalQuranWord[]) {
    const known = new Set(this.words.map((word) => `${word.verseKey}:${word.position}:${word.page}`));
    for (const word of nextWords) {
      const key = `${word.verseKey}:${word.position}:${word.page}`;
      if (!known.has(key)) { this.words.push(word); known.add(key); }
    }
  }

  setStartPosition(position: { verseKey: string; wordPosition?: number }) {
    const index = this.words.findIndex((word) =>
      word.verseKey === position.verseKey
      && (position.wordPosition === undefined || word.position >= position.wordPosition),
    );
    if (index < 0) return false;
    this.committed = index;
    this.committedCurrent = index > 0 ? this.words[index - 1] : null;
    this.provisional = null;
    this.pendingStart = index;
    this.pendingEnd = index;
    this.stability = 0;
    this.lastEvent = "";
    this.mode = "tracking";
    this.mismatchCount = 0;
    return true;
  }

  private optionalBasmalaIsAhead() {
    if (!this.options.ignoreOptionalBasmala) return false;
    const nearby = this.words.slice(
      Math.max(0, this.committed - 1),
      Math.min(this.words.length, this.committed + this.options.trackingForwardWindow + 5),
    );
    return nearby.some((word) =>
      word.ayah === 1 && word.position === 1 && word.surah !== 1 && word.surah !== 9 && word.normalizedText !== "بسم"
    );
  }

  private eventWithoutOptionalBasmala(text: string) {
    if (!this.optionalBasmalaIsAhead()) return text;
    const heard = tokens(text);
    let prefixLength = 0;
    while (prefixLength < heard.length && prefixLength < BASMALA_TOKENS.length && heard[prefixLength] === BASMALA_TOKENS[prefixLength]) {
      prefixLength += 1;
    }
    return prefixLength ? heard.slice(prefixLength).join(" ") : text;
  }

  private findAlignment(heard: string[]): Alignment | null {
    if (!heard.length) return null;
    const anchor = this.committed;
    let first = Math.max(0, anchor - this.options.trackingBackwardWindow);
    let last = Math.min(this.words.length - 1, anchor + this.options.trackingForwardWindow);
    if (this.mode === "recovery") {
      first = Math.max(0, anchor - this.options.trackingBackwardWindow);
      last = Math.min(this.words.length - 1, anchor + (this.options.generalPositionFollowing ? 48 : 24));
    }
    let best: Alignment | null = null;
    for (let start = first; start <= last; start += 1) {
      for (let length = Math.max(1, heard.length - 1); length <= heard.length + 2; length += 1) {
        const end = start + length;
        if (end > this.words.length) continue;
        const expected = this.words.slice(start, end).map((word) => word.normalizedText);
        const confidence = 1 - sequenceCost(heard, expected) / Math.max(heard.length, expected.length, 1);
        const adjusted = confidence - Math.abs(start - this.committed) * 0.006;
        if (!best || adjusted > best.confidence) best = { start, end, confidence: adjusted };
      }
    }
    return best;
  }

  private revealMap() {
    const revealed = new Map<string, number>();
    for (let index = 0; index < this.committed; index += 1) {
      const word = this.words[index];
      revealed.set(word.verseKey, (revealed.get(word.verseKey) ?? 0) + 1);
    }
    return revealed;
  }

  private usefulTokens(text: string, itemId: string, isFinal: boolean) {
    const next = tokens(text);
    const previous = this.tokensByItem.get(itemId);
    if (isFinal) {
      this.tokensByItem.delete(itemId);
      return next;
    }
    this.tokensByItem.set(itemId, next);
    if (!previous || next.length <= previous.length) return next;
    const isExtension = previous.every((token, index) => next[index] === token);
    return isExtension ? next.slice(previous.length) : next;
  }

  feed(text: string, itemId: string, isFinal: boolean): NativeRecitationMatch {
    const eventKey = `${itemId}:${isFinal}:${text}`;
    if (eventKey === this.lastEvent) return this.result(0, false);
    this.lastEvent = eventKey;
    const canonicalText = this.eventWithoutOptionalBasmala(text);
    const heard = this.usefulTokens(canonicalText, itemId, isFinal);
    if (!heard.length && canonicalText !== text) return this.result(1, false);
    const alignment = this.findAlignment(heard);
    if (!alignment || alignment.confidence < this.options.confidenceThreshold) {
      this.mismatchCount += 1;
      this.provisional = null;
      if (this.mode === "tracking" && this.mismatchCount >= this.options.recoveryMismatchLimit) this.mode = "recovery";
      return this.result(alignment?.confidence ?? 0, false);
    }
    this.mismatchCount = 0;
    this.mode = "tracking";
    if (alignment.start === this.pendingStart && alignment.end >= this.pendingEnd) this.stability += 1;
    else this.stability = 1;
    this.pendingStart = alignment.start;
    this.pendingEnd = alignment.end;
    this.provisional = this.words[alignment.end - 1] ?? null;
    const exactSingle = alignment.confidence >= 0.99 && alignment.end - alignment.start === 1;
    const stable = isFinal || exactSingle || (alignment.confidence >= 0.86 && this.stability >= this.options.commitStability);
    if (stable && alignment.end > this.committed) {
      this.committed = alignment.end;
      this.committedCurrent = this.words[this.committed - 1] ?? null;
      this.provisional = null;
    }
    return this.result(alignment.confidence, stable);
  }

  private result(confidence: number, stable: boolean): NativeRecitationMatch {
    return {
      current: this.provisional ?? this.committedCurrent,
      revealedWords: this.revealMap(),
      confidence,
      stable,
    };
  }
}

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

function wsOrigin() {
  const origin = process.env.EXPO_PUBLIC_WS_ORIGIN ?? "wss://tibyanquran.com";
  return origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:").replace(/\/$/, "");
}

export class NativeRecitationController {
  private socket: NativeSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private closed = false;
  private targetSampleRate = 24_000;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;

  constructor(private readonly matcher: NativeQuranLiveMatcher, private readonly callbacks: NativeRecitationCallbacks = {}) {}

  async start(token: string, sessionId: string) {
    if (Platform.OS === "web") throw new Error("التسميع الحي يحتاج نسخة Native فعلية، وليس Expo Web");
    if (!token || !sessionId) throw new Error("رمز الجلسة ومعرّف جلسة التسميع مطلوبان");
    this.closed = false;
    this.callbacks.onState?.("connecting");
    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== "Granted") throw new Error("لم يُمنح إذن الميكروفون");
    await new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      const socket = new WebSocket(`${wsOrigin()}/api/ws/recitation`) as unknown as NativeSocket;
      this.socket = socket;
      socket.onopen = () => socket.send(JSON.stringify({ t: "auth", token, sessionId }));
      socket.onmessage = (event) => this.handleMessage(String(event.data));
      socket.onerror = () => this.fail(new Error("تعذر الاتصال بخدمة التسميع الحي"));
      socket.onclose = () => { if (!this.closed) this.fail(new Error("انقطع اتصال التسميع الحي")); };
    });
    await this.startRecorder();
  }

  private handleMessage(raw: string) {
    let message: Record<string, unknown>;
    try { message = JSON.parse(raw) as Record<string, unknown>; } catch { return; }
    if (message.t === "authenticated") return;
    if (message.t === "ready") {
      if (typeof message.audioSampleRateHz === "number") this.targetSampleRate = message.audioSampleRateHz;
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    if (message.t === "transcript") {
      const text = String(message.text ?? "");
      const isFinal = message.isFinal === true;
      const match = this.matcher.feed(text, String(message.itemId ?? "native"), isFinal);
      this.callbacks.onTranscript?.(text, isFinal);
      this.callbacks.onMatch?.(match);
      return;
    }
    if (message.t === "error") this.fail(new Error(String(message.message ?? "فشل التسميع الحي")));
  }

  private async startRecorder() {
    const recorder = new AudioRecorder();
    this.recorder = recorder;
    const callbackResult = recorder.onAudioReady(
      { sampleRate: 24_000, bufferLength: 2_400, channelCount: 1 },
      ({ buffer }) => {
        if (this.closed || !this.socket || this.socket.readyState !== SOCKET_OPEN) return;
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
        const samples = resampleMono(channels, buffer.sampleRate, this.targetSampleRate);
        if (!samples.length) return;
        this.socket.send(JSON.stringify({
          t: "audio",
          audio: pcm16leBase64(samples),
          timing: { audioChunkCreatedAt: Date.now(), audioChunkSentAt: Date.now() },
        }));
      },
    );
    if (callbackResult.status === "error") return this.fail(new Error(callbackResult.message));
    const startResult = await recorder.start();
    if (startResult.status === "error") return this.fail(new Error(startResult.message));
    this.callbacks.onState?.("recording");
  }

  pause() {
    this.recorder?.pause();
    this.socket?.send(JSON.stringify({ t: "commit" }));
    this.callbacks.onState?.("paused");
  }

  resume() {
    this.recorder?.resume();
    this.callbacks.onState?.("recording");
  }

  async stop() {
    if (this.closed) return;
    this.closed = true;
    this.recorder?.clearOnAudioReady();
    if (this.recorder?.isRecording()) this.recorder.stop();
    if (this.socket?.readyState === SOCKET_OPEN) {
      this.socket.send(JSON.stringify({ t: "commit" }));
      this.socket.send(JSON.stringify({ t: "close" }));
      this.socket.close();
    }
    this.socket = null;
    this.callbacks.onState?.("stopped");
  }

  private fail(error: Error) {
    if (this.closed) return;
    this.closed = true;
    this.readyReject?.(error);
    this.readyResolve = null;
    this.readyReject = null;
    this.recorder?.clearOnAudioReady();
    if (this.recorder?.isRecording()) this.recorder.stop();
    this.socket?.close();
    this.socket = null;
    this.callbacks.onState?.("error", "تعذر متابعة جلسة التسميع الحي.");
  }
}