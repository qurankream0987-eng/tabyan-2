import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptEvent } from "./types";

export interface ConnectivityMetrics {
  connectionMs: number | null;
  firstAudioMs: number | null;
  firstPartialMs: number | null;
  finalMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  providerLatencyMs: number | null;
  providerP50Ms: number | null;
  providerP95Ms: number | null;
  providerMinMs: number | null;
  providerMaxMs: number | null;
  transportP50Ms: number | null;
  transportP95Ms: number | null;
  transportMinMs: number | null;
  transportMaxMs: number | null;
  backendProviderP50Ms: number | null;
  backendProviderP95Ms: number | null;
  backendProviderMinMs: number | null;
  backendProviderMaxMs: number | null;
}

export interface RealtimeDiagnostics {
  wsConnected: boolean;
  backendWsConnected: boolean;
  providerConnected: boolean;
  audioChunkCount: number;
  audioBytesCount: number;
  workletMessageCount: number;
  transcriptDeltaCount: number;
  transcriptCompletedCount: number;
  providerEventCount: number;
  providerDeltaEventCount: number;
  providerCompletedEventCount: number;
  providerErrorCount: number;
  recitationSessionAgeMs: number | null;
  providerSessionAgeMs: number | null;
  lastAudioAgeMs: number | null;
  audioLevelRms: number;
  speechActive: boolean;
  lastSpeechActiveAgeMs: number | null;
  longestActiveSpeechWithoutDeltaMs: number;
  providerStalledDuringActiveSpeech: boolean;
  lastDeltaAgeMs: number | null;
  lastWsSendAgeMs: number | null;
  lastWsReceiveAgeMs: number | null;
  audioContextState: AudioContextState | "unavailable";
  micTrackReadyState: MediaStreamTrackState | "unavailable";
  micTrackEnabled: boolean | null;
  micTrackMuted: boolean | null;
}

type GatewayMessage =
  | { t: "authenticated" }
  | { t: "ready"; providerConnectionMs: number; provider?: "openai" | "nvidia" | "speechmatics"; audioSampleRateHz?: number }
  | {
      t: "transcript";
      text: string;
      isFinal: boolean;
      receivedAt: number;
      itemId: string;
      textIsDelta?: boolean;
      timing?: {
        audioChunkCreatedAt?: number;
        audioChunkSentAt?: number;
        backendAudioReceivedAt: number;
        providerDeltaReceivedAt: number;
      };
      providerStats?: {
        providerEventCount: number;
        providerDeltaEventCount: number;
        providerCompletedEventCount: number;
        providerErrorCount: number;
      };
    }
  | {
      t: "diagnostics";
      audioChunkCount: number;
      audioBytesCount: number;
      providerStats: {
        providerEventCount: number;
        providerDeltaEventCount: number;
        providerCompletedEventCount: number;
        providerErrorCount: number;
      };
    }
  | { t: "error"; code: string; message: string };

const EMPTY_METRICS: ConnectivityMetrics = {
  connectionMs: null, firstAudioMs: null, firstPartialMs: null, finalMs: null, p50Ms: null, p95Ms: null,
  providerLatencyMs: null, providerP50Ms: null, providerP95Ms: null, providerMinMs: null, providerMaxMs: null,
  transportP50Ms: null, transportP95Ms: null, transportMinMs: null, transportMaxMs: null,
  backendProviderP50Ms: null, backendProviderP95Ms: null, backendProviderMinMs: null, backendProviderMaxMs: null,
};

const EMPTY_DIAGNOSTICS: RealtimeDiagnostics = {
  wsConnected: false,
  backendWsConnected: false,
  providerConnected: false,
  audioChunkCount: 0,
  audioBytesCount: 0,
  workletMessageCount: 0,
  transcriptDeltaCount: 0,
  transcriptCompletedCount: 0,
  providerEventCount: 0,
  providerDeltaEventCount: 0,
  providerCompletedEventCount: 0,
  providerErrorCount: 0,
  recitationSessionAgeMs: null,
  providerSessionAgeMs: null,
  lastAudioAgeMs: null,
  audioLevelRms: 0,
  speechActive: false,
  lastSpeechActiveAgeMs: null,
  longestActiveSpeechWithoutDeltaMs: 0,
  providerStalledDuringActiveSpeech: false,
  lastDeltaAgeMs: null,
  lastWsSendAgeMs: null,
  lastWsReceiveAgeMs: null,
  audioContextState: "unavailable",
  micTrackReadyState: "unavailable",
  micTrackEnabled: null,
  micTrackMuted: null,
};

const SPEECH_RMS_THRESHOLD = 0.02;
const ACTIVE_SPEECH_STALL_MS = 5_000;
const SILENCE_COMMIT_MS = 700;

function traceAi(event: string, metadata: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.info(`[TABYAN_AI_TRACE] ${event}`, metadata);
}

function gatewayUrl(): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${protocol}://${location.host}${base}/api/ws/recitation`;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

const PROCESSOR_SOURCE = `
class TabyanPcm24kProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 24000;
    this.ratio = sampleRate / this.targetRate;
    this.offset = 0;
    this.frame = new Int16Array(Math.round(this.targetRate / 10));
    this.index = 0;
    this.port.onmessage = (event) => {
      if (event.data && event.data.t === "flush" && this.index > 0) {
        const out = this.frame.slice(0, this.index);
        this.port.postMessage(out.buffer, [out.buffer]);
        this.frame = new Int16Array(Math.round(this.targetRate / 10));
        this.index = 0;
      }
    };
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;
    let i = this.offset;
    while (i < input.length) {
      const sample = Math.max(-1, Math.min(1, input[Math.floor(i)] || 0));
      this.frame[this.index++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.index === this.frame.length) {
        const out = this.frame.buffer;
        this.port.postMessage(out, [out]);
        this.frame = new Int16Array(Math.round(this.targetRate / 10));
        this.index = 0;
      }
      i += this.ratio;
    }
    this.offset = i - input.length;
    return true;
  }
}
registerProcessor("tabyan-pcm24k", TabyanPcm24kProcessor);
`;

export function useOpenAiRealtimeTranscription() {
  const [state, setState] = useState<"idle" | "connecting" | "listening" | "stopping" | "failed">("idle");
  const [partial, setPartial] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConnectivityMetrics>(EMPTY_METRICS);
  const [diagnostics, setDiagnostics] = useState<RealtimeDiagnostics>(EMPTY_DIAGNOSTICS);
  const [latestTranscriptEvent, setLatestTranscriptEvent] = useState<TranscriptEvent | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const moduleUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const firstAudioAtRef = useRef<number | null>(null);
  const firstPartialAtRef = useRef<number | null>(null);
  const finalsRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const finalResolverRef = useRef<(() => void) | null>(null);
  const partialByItemRef = useRef(new Map<string, string>());
  const lastAudioChunkAtRef = useRef<number | null>(null);
  const speechSeenSinceCommitRef = useRef(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const silenceCommitSentRef = useRef(false);
  const providerLatenciesRef = useRef<number[]>([]);
  const requestedAudioSampleRateRef = useRef(24_000);
  const transportLatenciesRef = useRef<number[]>([]);
  const backendProviderLatenciesRef = useRef<number[]>([]);
  const diagnosticRef = useRef({
    audioChunkCount: 0,
    audioBytesCount: 0,
    workletMessageCount: 0,
    transcriptDeltaCount: 0,
    transcriptCompletedCount: 0,
    providerEventCount: 0,
    providerDeltaEventCount: 0,
    providerCompletedEventCount: 0,
    providerErrorCount: 0,
    lastAudioAt: null as number | null,
    audioLevelRms: 0,
    speechActive: false,
    lastSpeechActiveAt: null as number | null,
    activeSpeechStartedAt: null as number | null,
    longestActiveSpeechWithoutDeltaMs: 0,
    providerStalledDuringActiveSpeech: false,
    lastDeltaAt: null as number | null,
    lastWsSendAt: null as number | null,
    lastWsReceiveAt: null as number | null,
    providerConnected: false,
    backendWsConnected: false,
    recitationSessionStartedAt: null as number | null,
    providerSessionStartedAt: null as number | null,
  });

  const snapshotDiagnostics = useCallback(() => {
    const now = performance.now();
    const stats = diagnosticRef.current;
    const age = (value: number | null) => value === null ? null : Math.max(0, Math.round(now - value));
    const track = streamRef.current?.getAudioTracks()[0];
    setDiagnostics({
      wsConnected: wsRef.current?.readyState === WebSocket.OPEN,
      backendWsConnected: stats.backendWsConnected,
      providerConnected: stats.providerConnected,
      audioChunkCount: stats.audioChunkCount,
      audioBytesCount: stats.audioBytesCount,
      workletMessageCount: stats.workletMessageCount,
      transcriptDeltaCount: stats.transcriptDeltaCount,
      transcriptCompletedCount: stats.transcriptCompletedCount,
      providerEventCount: stats.providerEventCount,
      providerDeltaEventCount: stats.providerDeltaEventCount,
      providerCompletedEventCount: stats.providerCompletedEventCount,
      providerErrorCount: stats.providerErrorCount,
      recitationSessionAgeMs: age(stats.recitationSessionStartedAt),
      providerSessionAgeMs: age(stats.providerSessionStartedAt),
      lastAudioAgeMs: age(stats.lastAudioAt),
      audioLevelRms: stats.audioLevelRms,
      speechActive: stats.speechActive,
      lastSpeechActiveAgeMs: age(stats.lastSpeechActiveAt),
      longestActiveSpeechWithoutDeltaMs: stats.longestActiveSpeechWithoutDeltaMs,
      providerStalledDuringActiveSpeech: stats.providerStalledDuringActiveSpeech,
      lastDeltaAgeMs: age(stats.lastDeltaAt),
      lastWsSendAgeMs: age(stats.lastWsSendAt),
      lastWsReceiveAgeMs: age(stats.lastWsReceiveAt),
      audioContextState: contextRef.current?.state ?? "unavailable",
      micTrackReadyState: track?.readyState ?? "unavailable",
      micTrackEnabled: track?.enabled ?? null,
      micTrackMuted: track?.muted ?? null,
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(snapshotDiagnostics, 1000);
    snapshotDiagnostics();
    return () => window.clearInterval(timer);
  }, [snapshotDiagnostics]);

  const cleanupMedia = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    contextRef.current?.close().catch(() => {});
    contextRef.current = null;
    if (moduleUrlRef.current) URL.revokeObjectURL(moduleUrlRef.current);
    moduleUrlRef.current = null;
  }, []);

  const close = useCallback(() => {
    cleanupMedia();
    finalResolverRef.current?.();
    finalResolverRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "close" }));
    ws?.close();
  }, [cleanupMedia]);

  const fail = useCallback((message: string) => {
    setError(message);
    stateRef.current = "failed";
    setState("failed");
    cleanupMedia();
  }, [cleanupMedia]);

  const startCapture = useCallback(async (): Promise<boolean> => {
    try {
      traceAi("MIC_PERMISSION_REQUESTED");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      traceAi("MIC_PERMISSION_GRANTED", { audioTracks: stream.getAudioTracks().length });
      streamRef.current = stream;
      const context = new AudioContext({ sampleRate: requestedAudioSampleRateRef.current });
      contextRef.current = context;
      const url = URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: "application/javascript" }));
      moduleUrlRef.current = url;
      await context.audioWorklet.addModule(url);
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, "tabyan-pcm24k");
      processorRef.current = processor;
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(processor).connect(silent).connect(context.destination);
      processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        diagnosticRef.current.workletMessageCount += 1;
        const samples = new Int16Array(event.data);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const normalized = samples[i] / 32768;
          sumSquares += normalized * normalized;
        }
        const now = performance.now();
        const audioLevelRms = samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0;
        const speechActive = audioLevelRms >= SPEECH_RMS_THRESHOLD;
        const stats = diagnosticRef.current;
        stats.audioLevelRms = Number(audioLevelRms.toFixed(4));
        stats.speechActive = speechActive;
        if (speechActive) {
          speechSeenSinceCommitRef.current = true;
          silenceStartedAtRef.current = null;
          silenceCommitSentRef.current = false;
          stats.lastSpeechActiveAt = now;
          stats.activeSpeechStartedAt ??= now;
          const sinceDelta = stats.lastDeltaAt === null
            ? now - stats.activeSpeechStartedAt
            : Math.max(0, now - Math.max(stats.lastDeltaAt, stats.activeSpeechStartedAt));
          stats.longestActiveSpeechWithoutDeltaMs = Math.max(
            stats.longestActiveSpeechWithoutDeltaMs,
            Math.round(sinceDelta),
          );
          stats.providerStalledDuringActiveSpeech = sinceDelta > ACTIVE_SPEECH_STALL_MS;
        } else {
          if (speechSeenSinceCommitRef.current && silenceStartedAtRef.current === null) {
            silenceStartedAtRef.current = now;
          }
          stats.activeSpeechStartedAt = null;
          stats.providerStalledDuringActiveSpeech = false;
        }
        if (pausedRef.current) return;
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (firstAudioAtRef.current === null) {
          firstAudioAtRef.current = performance.now();
          setMetrics((previous) => ({ ...previous, firstAudioMs: Math.round(firstAudioAtRef.current! - startedAtRef.current) }));
          traceAi("FIRST_AUDIO_CHUNK_SENT");
        }
        lastAudioChunkAtRef.current = now;
        diagnosticRef.current.audioChunkCount += 1;
        diagnosticRef.current.audioBytesCount += event.data.byteLength;
        diagnosticRef.current.lastAudioAt = now;
        diagnosticRef.current.lastWsSendAt = now;
        const audioChunkCreatedAt = Date.now();
        ws.send(JSON.stringify({
          t: "audio",
          audio: toBase64(event.data),
          timing: { audioChunkCreatedAt, audioChunkSentAt: Date.now() },
        }));
        if (
          !speechActive
          && speechSeenSinceCommitRef.current
          && silenceStartedAtRef.current !== null
          && !silenceCommitSentRef.current
          && now - silenceStartedAtRef.current >= SILENCE_COMMIT_MS
        ) {
          ws.send(JSON.stringify({ t: "commit" }));
          diagnosticRef.current.lastWsSendAt = performance.now();
          silenceCommitSentRef.current = true;
          speechSeenSinceCommitRef.current = false;
          traceAi("SILENCE_TURN_COMMITTED", { silenceMs: Math.round(now - silenceStartedAtRef.current) });
        }
      };
      stateRef.current = "listening";
      setState("listening");
      traceAi("AUDIO_CAPTURE_STARTED");
      return true;
    } catch {
      fail("تعذر الوصول إلى الميكروفون — امنح الإذن ثم أعد المحاولة");
      return false;
    }
  }, [fail]);

  const start = useCallback(async (sessionId: string) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
      fail("هذا المتصفح لا يدعم التقاط الصوت المطلوب للتفريغ الحي");
      return false;
    }
    close();
    stateRef.current = "connecting";
    setState("connecting");
    setError(null);
    setPartial("");
    setFinalTranscript("");
    setMetrics(EMPTY_METRICS);
    setLatestTranscriptEvent(null);
    partialByItemRef.current.clear();
    pausedRef.current = false;
    firstAudioAtRef.current = null;
    firstPartialAtRef.current = null;
    lastAudioChunkAtRef.current = null;
    speechSeenSinceCommitRef.current = false;
    silenceStartedAtRef.current = null;
    silenceCommitSentRef.current = false;
    providerLatenciesRef.current = [];
    transportLatenciesRef.current = [];
    backendProviderLatenciesRef.current = [];
    requestedAudioSampleRateRef.current = 24_000;
    diagnosticRef.current = {
      ...diagnosticRef.current,
      audioChunkCount: 0,
      audioBytesCount: 0,
      workletMessageCount: 0,
      transcriptDeltaCount: 0,
      transcriptCompletedCount: 0,
      providerEventCount: 0,
      providerDeltaEventCount: 0,
      providerCompletedEventCount: 0,
      providerErrorCount: 0,
      lastAudioAt: null,
      audioLevelRms: 0,
      speechActive: false,
      lastSpeechActiveAt: null,
      activeSpeechStartedAt: null,
      longestActiveSpeechWithoutDeltaMs: 0,
      providerStalledDuringActiveSpeech: false,
      lastDeltaAt: null,
      lastWsSendAt: null,
      lastWsReceiveAt: null,
      providerConnected: false,
      backendWsConnected: false,
      recitationSessionStartedAt: performance.now(),
      providerSessionStartedAt: null,
    };
    setDiagnostics(EMPTY_DIAGNOSTICS);
    startedAtRef.current = performance.now();

    return await new Promise<boolean>((resolve) => {
      traceAi("WS_CONNECT_ATTEMPT", { url: gatewayUrl() });
      const ws = new WebSocket(gatewayUrl());
      wsRef.current = ws;
      const token = localStorage.getItem("tabyan_token") ?? "";
      const timeout = window.setTimeout(() => {
        fail("انتهت مهلة الاتصال بخدمة التفريغ الحي");
        ws.close();
        resolve(false);
      }, 15_000);

      ws.onopen = () => ws.send(JSON.stringify({ t: "auth", token, sessionId }));
      ws.onmessage = (event) => {
          diagnosticRef.current.lastWsReceiveAt = performance.now();
          diagnosticRef.current.backendWsConnected = true;
        let message: GatewayMessage;
        try { message = JSON.parse(String(event.data)) as GatewayMessage; } catch { return; }
        if (message.t === "error") {
          window.clearTimeout(timeout);
          fail(message.message);
          ws.close();
          resolve(false);
          return;
        }
        if (message.t === "diagnostics") {
          diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
          diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
          diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
          diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
          return;
        }
        if (message.t === "authenticated") {
          traceAi("WS_AUTHENTICATED");
          return;
        }
        if (message.t === "ready") {
          window.clearTimeout(timeout);
          traceAi("OPENAI_CONNECTED");
          requestedAudioSampleRateRef.current = message.audioSampleRateHz ?? 24_000;
          diagnosticRef.current.providerConnected = true;
          diagnosticRef.current.providerSessionStartedAt = performance.now();
          const connectionMs = Math.round(performance.now() - startedAtRef.current);
          setMetrics((previous) => ({ ...previous, connectionMs }));
          void startCapture().then((capturing) => {
            if (!capturing) close();
            resolve(capturing);
          });
          return;
        }
        if (message.t === "transcript") {
          const now = performance.now();
          if (!message.isFinal) {
            diagnosticRef.current.transcriptDeltaCount += 1;
            diagnosticRef.current.lastDeltaAt = now;
            if (message.providerStats) {
              diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
              diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
              diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
              diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
            }
            if (firstPartialAtRef.current === null) {
              firstPartialAtRef.current = now;
              setMetrics((previous) => ({ ...previous, firstPartialMs: Math.round(now - startedAtRef.current) }));
              traceAi("OPENAI_FIRST_DELTA");
            }
            const accumulated = message.textIsDelta === false
              ? message.text
              : `${partialByItemRef.current.get(message.itemId) ?? ""}${message.text}`;
            partialByItemRef.current.set(message.itemId, accumulated);
            setPartial(accumulated);
            const providerLatency = lastAudioChunkAtRef.current === null
              ? null
              : Math.max(0, Math.round(now - lastAudioChunkAtRef.current));
            if (providerLatency !== null) {
              providerLatenciesRef.current.push(providerLatency);
              const sortedLatency = [...providerLatenciesRef.current].sort((a, b) => a - b);
              const percentile = (p: number) => sortedLatency[Math.min(sortedLatency.length - 1, Math.ceil(sortedLatency.length * p) - 1)] ?? null;
              const transport = message.timing?.audioChunkSentAt === undefined
                ? null
                : Math.max(0, message.timing.backendAudioReceivedAt - message.timing.audioChunkSentAt);
              const backendProvider = message.timing === undefined
                ? null
                : Math.max(0, message.timing.providerDeltaReceivedAt - message.timing.backendAudioReceivedAt);
              if (transport !== null) transportLatenciesRef.current.push(transport);
              if (backendProvider !== null) backendProviderLatenciesRef.current.push(backendProvider);
              const metricAt = (values: number[], p: number) => {
                const sorted = [...values].sort((a, b) => a - b);
                return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? null;
              };
              setMetrics((previous) => ({
                ...previous,
                providerLatencyMs: providerLatency,
                providerP50Ms: percentile(0.5),
                providerP95Ms: percentile(0.95),
                providerMinMs: Math.min(...providerLatenciesRef.current),
                providerMaxMs: Math.max(...providerLatenciesRef.current),
                transportP50Ms: metricAt(transportLatenciesRef.current, 0.5),
                transportP95Ms: metricAt(transportLatenciesRef.current, 0.95),
                transportMinMs: transportLatenciesRef.current.length ? Math.min(...transportLatenciesRef.current) : null,
                transportMaxMs: transportLatenciesRef.current.length ? Math.max(...transportLatenciesRef.current) : null,
                backendProviderP50Ms: metricAt(backendProviderLatenciesRef.current, 0.5),
                backendProviderP95Ms: metricAt(backendProviderLatenciesRef.current, 0.95),
                backendProviderMinMs: backendProviderLatenciesRef.current.length ? Math.min(...backendProviderLatenciesRef.current) : null,
                backendProviderMaxMs: backendProviderLatenciesRef.current.length ? Math.max(...backendProviderLatenciesRef.current) : null,
              }));
            }
            setLatestTranscriptEvent({
              text: accumulated,
              isFinal: false,
              receivedAt: now,
              clientReceivedAt: now,
              audioChunkSentAt: lastAudioChunkAtRef.current ?? undefined,
              itemId: message.itemId,
            });
          } else {
            diagnosticRef.current.transcriptCompletedCount += 1;
            if (message.providerStats) {
              diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
              diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
              diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
              diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
            }
            const finalMs = Math.round(now - startedAtRef.current);
            finalsRef.current.push(finalMs);
            const sorted = [...finalsRef.current].sort((a, b) => a - b);
            const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? null;
            setFinalTranscript(message.text);
            partialByItemRef.current.delete(message.itemId);
            setLatestTranscriptEvent({ text: message.text, isFinal: true, receivedAt: now, clientReceivedAt: now, itemId: message.itemId });
            setMetrics((previous) => ({ ...previous, finalMs, p50Ms: at(0.5), p95Ms: at(0.95) }));
            traceAi("OPENAI_FINAL");
            finalResolverRef.current?.();
            finalResolverRef.current = null;
          }
        }
      };
      ws.onerror = () => {
        window.clearTimeout(timeout);
        fail("تعذر الاتصال بخادم التفريغ الحي");
        resolve(false);
      };
      ws.onclose = () => {
        if (stateRef.current !== "stopping" && stateRef.current !== "idle") {
          cleanupMedia();
          stateRef.current = "failed";
          setState("failed");
        }
      };
    });
  }, [cleanupMedia, close, fail, startCapture]);

  const pause = useCallback(() => { pausedRef.current = true; }, []);
  const resume = useCallback(() => { pausedRef.current = false; }, []);

  const stop = useCallback(async () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      close();
      return;
    }
    stateRef.current = "stopping";
    setState("stopping");
    const completed = new Promise<void>((resolve) => { finalResolverRef.current = resolve; });
    processorRef.current?.port.postMessage({ t: "flush" });
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: "commit" }));
    }
    await Promise.race([completed, new Promise((resolve) => window.setTimeout(resolve, 10_000))]);
    finalResolverRef.current = null;
    close();
    stateRef.current = "idle";
    setState("idle");
  }, [close]);

  useEffect(() => () => close(), [close]);

  return {
    state, partial, finalTranscript, error, metrics, diagnostics, latestTranscriptEvent,
    start, stop, pause, resume, cancel: close,
  };
}