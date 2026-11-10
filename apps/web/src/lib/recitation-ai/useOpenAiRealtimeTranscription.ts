import { useCallback, useEffect, useRef, useState } from "react";
import {
  isQrcStructuredObservation,
  NormalizedTranscriptMatcherBridge,
  normalizeProviderObservation,
  providerAcknowledgesFinalization,
  providerFinalizationTimeoutMs,
  RECITATION_GATEWAY_SILENCE_TIMEOUT_MS,
  RECITATION_KEEPALIVE_INTERVAL_MS,
  type QrcStructuredObservation,
  type RecitationProviderName,
} from "@workspace/tabyan-domain";
import type { TranscriptEvent } from "./types";
import { RollingSamples, UtteranceSegmenter } from "./latencyTelemetry";
import { AudioQualityMonitor, frameStats, type AudioQualitySnapshot } from "./audioQuality";
import { gatewayErrorFailure, type TransportFailure, type TransportState } from "./aiSessionPhase";
import { PROCESSOR_SOURCE } from "./pcm-worklet-source";
import { runSessionAction, waitForCleanSocketClose } from "@/lib/mushaf/session-audio-lifecycle";
import {
  MAX_AUDIO_FILE_BYTES,
  MAX_AUDIO_FILE_SECONDS,
  PCM_SAMPLE_RATE,
  pcm16Chunks,
  resampleToMonoPcm16,
} from "./audioFileInjection";
import { normalizeQuranText } from "./normalizer";

export type AudioInputSource = "microphone" | "audio-file";
export type PipelineMilestone = "matcherStartMs" | "matcherEndMs" | "uiCommitMs" | "totalFeedbackMs";
type RealtimeProviderName = RecitationProviderName;
type MeasuredMilestone =
  | "micCaptureStartMs"
  | "firstAudioFrameMs"
  | "websocketOpenMs"
  | "firstProviderPartialMs"
  | "firstProviderFinalMs"
  | PipelineMilestone;

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
  firstSpeechPartialP50Ms: number | null;
  firstSpeechPartialP95Ms: number | null;
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
  /** commits أُرسلت بسبب طول المقطع لا الصمت (تلاوة متصلة). */
  forcedCommitCount: number;
  /** بايتات صوت لم يُرسلها المتصفح بعد — مؤشر شبكة بطيئة/backpressure. */
  wsBufferedBytes: number;
  maxWsBufferedBytes: number;
  asrProvider: RealtimeProviderName | null;
  providerConnectionMs: number | null;
  audioSource: AudioInputSource | null;
  micCaptureStartMs: number | null;
  firstAudioFrameMs: number | null;
  websocketOpenMs: number | null;
  firstProviderPartialMs: number | null;
  firstProviderFinalMs: number | null;
  matcherStartMs: number | null;
  matcherEndMs: number | null;
  uiCommitMs: number | null;
  /** From the most recently sent client audio frame; not from spoken-word onset. */
  totalFeedbackMs: number | null;
  chunkDurationMs: number;
  bytesPerChunk: number;
  queueDepth: number;
  droppedChunkCount: number;
  clientDroppedChunkCount: number;
  providerDroppedChunkCount: number;
}

export type TranscriptListener = (event: TranscriptEvent) => void;
export type QrcStructuredObservationListener = (event: QrcStructuredObservation) => void;

export interface RealtimeTranscriptionOptions {
  /**
   * يحدّث partial/latestTranscriptEvent كحالة React مع كل delta. المستهلك الذي
   * يعالج الأحداث عبر subscribe يعطّله لتجنب إعادة رسم القارئ مع كل delta.
   */
  trackTranscriptState?: boolean;
  /** Called only once provider READY and the actual audio path are usable. */
  onAudioReady?: () => void | Promise<void>;
}

type GatewayMessage =
  | { t: "authenticated" }
  | { t: "pong" }
  | { t: "finalized"; commitId?: string }
  | { t: "ready"; providerConnectionMs: number; provider?: RealtimeProviderName; audioSampleRateHz?: number }
  | { t: "qrc-observation"; observation: QrcStructuredObservation }
  | {
      t: "transcript";
      text: string;
      isFinal: boolean;
      receivedAt: number;
      itemId: string;
      normalizedType?: "partial" | "final";
      provider?: RealtimeProviderName;
      eventId?: string;
      confidence?: number;
      wordConfidences?: number[];
      textIsDelta?: boolean;
      confirmationEligible?: boolean;
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
        droppedAudioChunkCount: number;
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
        droppedAudioChunkCount: number;
      };
    }
  | { t: "error"; code: string; message: string };

const EMPTY_METRICS: ConnectivityMetrics = {
  connectionMs: null, firstAudioMs: null, firstPartialMs: null, finalMs: null, p50Ms: null, p95Ms: null,
  providerLatencyMs: null, providerP50Ms: null, providerP95Ms: null, providerMinMs: null, providerMaxMs: null,
  transportP50Ms: null, transportP95Ms: null, transportMinMs: null, transportMaxMs: null,
  backendProviderP50Ms: null, backendProviderP95Ms: null, backendProviderMinMs: null, backendProviderMaxMs: null,
  firstSpeechPartialP50Ms: null, firstSpeechPartialP95Ms: null,
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
  forcedCommitCount: 0,
  wsBufferedBytes: 0,
  maxWsBufferedBytes: 0,
  asrProvider: null,
  providerConnectionMs: null,
  audioSource: null,
  micCaptureStartMs: null,
  firstAudioFrameMs: null,
  websocketOpenMs: null,
  firstProviderPartialMs: null,
  firstProviderFinalMs: null,
  matcherStartMs: null,
  matcherEndMs: null,
  uiCommitMs: null,
  totalFeedbackMs: null,
  chunkDurationMs: 0,
  bytesPerChunk: 0,
  queueDepth: 0,
  droppedChunkCount: 0,
  clientDroppedChunkCount: 0,
  providerDroppedChunkCount: 0,
};

const SPEECH_RMS_THRESHOLD = 0.02;
const ACTIVE_SPEECH_STALL_MS = 5_000;
const MAX_PARTIAL_ITEMS = 32;
/** Worklet frames are 100 ms: keep up to 10 s captured before the provider is ready. */
const MAX_PENDING_AUDIO_FRAMES = 100;

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

export function useOpenAiRealtimeTranscription(options: RealtimeTranscriptionOptions = {}) {
  const onAudioReadyRef = useRef(options.onAudioReady);
  onAudioReadyRef.current = options.onAudioReady;
  const stopFlightRef = useRef<Promise<boolean> | null>(null);
  const flushResolverRef = useRef<((flushed: boolean) => void) | null>(null);
  const trackTranscriptState = options.trackTranscriptState ?? true;
  const trackTranscriptStateRef = useRef(trackTranscriptState);
  trackTranscriptStateRef.current = trackTranscriptState;
  const listenersRef = useRef(new Set<TranscriptListener>());
  const qrcObservationListenersRef = useRef(new Set<QrcStructuredObservationListener>());
  const normalizedTranscriptBridgeRef = useRef(new NormalizedTranscriptMatcherBridge());
  const [state, setState] = useState<TransportState>("idle");
  const [failure, setFailure] = useState<TransportFailure | null>(null);
  const [audioQuality, setAudioQuality] = useState<AudioQualitySnapshot>({ issue: null, reliable: true });
  const qualityRef = useRef(new AudioQualityMonitor());
  const qualityIssueRef = useRef<AudioQualitySnapshot["issue"]>(null);
  const audioReliableRef = useRef(true);
  const [partial, setPartial] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConnectivityMetrics>(EMPTY_METRICS);
  const [diagnostics, setDiagnostics] = useState<RealtimeDiagnostics>(EMPTY_DIAGNOSTICS);
  const [latestTranscriptEvent, setLatestTranscriptEvent] = useState<TranscriptEvent | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const wsRef = useRef<WebSocket | null>(null);
  const lastExpectedRef = useRef("");
  const socketTraceIdRef = useRef<string | null>(null);
  const socketCloseRequestedByRef = useRef<string | null>(null);
  const socketLastMessageAtRef = useRef<number | null>(null);
  const socketLastOutboundAtRef = useRef<number | null>(null);
  const socketLastAudioAtRef = useRef<number | null>(null);
  const logSocketLifecycle = useCallback((
    event: string,
    socket: WebSocket | null,
    details: Record<string, unknown> = {},
  ) => {
    if (!import.meta.env.DEV) return;
    console.info("[TABYAN_RECITATION_SOCKET]", {
      ...details,
      diagnosticClientId: socketTraceIdRef.current,
      event,
      timestamp: new Date().toISOString(),
      readyState: socket?.readyState ?? null,
      bufferedAmount: socket?.bufferedAmount ?? null,
      lastMessageAt: socketLastMessageAtRef.current === null
        ? null
        : new Date(socketLastMessageAtRef.current).toISOString(),
      lastOutboundAt: socketLastOutboundAtRef.current === null
        ? null
        : new Date(socketLastOutboundAtRef.current).toISOString(),
    });
  }, []);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const moduleUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const firstAudioAtRef = useRef<number | null>(null);
  const firstPartialAtRef = useRef<number | null>(null);
  const fileInjectionGenerationRef = useRef(0);
  const finalsRef = useRef(new RollingSamples());
  const pausedRef = useRef(false);
  const providerReadyRef = useRef(false);
  const pendingAudioRef = useRef<{ buffer: ArrayBuffer; rms: number }[]>([]);
  const keepaliveTimerRef = useRef<number | null>(null);
  const finalResolverRef = useRef<(() => void) | null>(null);
  const finalCommitIdRef = useRef<string | null>(null);
  const partialByItemRef = useRef(new Map<string, string>());
  const lastAudioChunkAtRef = useRef<number | null>(null);
  const segmenterRef = useRef(new UtteranceSegmenter());
  const providerLatenciesRef = useRef(new RollingSamples());
  const firstSpeechPartialLatenciesRef = useRef(new RollingSamples());
  const requestedAudioSampleRateRef = useRef(24_000);
  const transportLatenciesRef = useRef(new RollingSamples());
  const backendProviderLatenciesRef = useRef(new RollingSamples());
  const lastProviderLatencyRef = useRef<number | null>(null);
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
    wsBufferedBytes: 0,
    maxWsBufferedBytes: 0,
    asrProvider: null as RealtimeProviderName | null,
    providerConnectionMs: null as number | null,
    audioSource: null as AudioInputSource | null,
    micCaptureStartMs: null as number | null,
    firstAudioFrameMs: null as number | null,
    websocketOpenMs: null as number | null,
    firstProviderPartialMs: null as number | null,
    firstProviderFinalMs: null as number | null,
    matcherStartMs: null as number | null,
    matcherEndMs: null as number | null,
    uiCommitMs: null as number | null,
    totalFeedbackMs: null as number | null,
    chunkDurationMs: 0,
    bytesPerChunk: 0,
    queueDepth: 0,
    clientDroppedChunkCount: 0,
    providerDroppedChunkCount: 0,
  });

  const markPipelineMilestone = useCallback((name: MeasuredMilestone, originAt?: number) => {
    if (!import.meta.env.DEV || diagnosticRef.current[name] !== null) return;
    const elapsed = Math.max(0, Math.round(performance.now() - (originAt ?? startedAtRef.current)));
    diagnosticRef.current[name] = elapsed;
    setDiagnostics((previous) => ({ ...previous, [name]: elapsed }));
  }, []);

  const observeAudioLevel = useCallback((rms: number, now: number) => {
    const stats = diagnosticRef.current;
    const speechActive = rms >= SPEECH_RMS_THRESHOLD;
    stats.audioLevelRms = Number(rms.toFixed(4));
    stats.speechActive = speechActive;
    if (speechActive) {
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
      stats.activeSpeechStartedAt = null;
      stats.providerStalledDuringActiveSpeech = false;
    }
  }, []);

  const sendPcmChunk = useCallback((buffer: ArrayBuffer, rms: number) => {
    const ws = wsRef.current;
    const stats = diagnosticRef.current;
    if (pausedRef.current) return false;
    if (!providerReadyRef.current) {
      // The provider is still connecting: hold the first words for the flush.
      pendingAudioRef.current.push({ buffer, rms });
      if (pendingAudioRef.current.length > MAX_PENDING_AUDIO_FRAMES) pendingAudioRef.current.shift();
      return true;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (stateRef.current === "listening") stats.clientDroppedChunkCount += 1;
      return false;
    }

    const now = performance.now();
    if (stats.firstAudioFrameMs === null) markPipelineMilestone("firstAudioFrameMs");
    if (firstAudioAtRef.current === null) {
      firstAudioAtRef.current = now;
      setMetrics((previous) => ({ ...previous, firstAudioMs: Math.round(now - startedAtRef.current) }));
      traceAi("FIRST_AUDIO_CHUNK_SENT");
    }
    stats.bytesPerChunk = buffer.byteLength;
    stats.chunkDurationMs = Number((buffer.byteLength / 2 / PCM_SAMPLE_RATE * 1_000).toFixed(2));
    lastAudioChunkAtRef.current = now;
    stats.audioChunkCount += 1;
    stats.audioBytesCount += buffer.byteLength;
    stats.lastAudioAt = now;
    stats.lastWsSendAt = now;

    const audioChunkCreatedAt = Date.now();
    const payload = JSON.stringify({
      t: "audio",
      audio: toBase64(buffer),
      timing: { audioChunkCreatedAt, audioChunkSentAt: Date.now() },
    });
    const isFirstAudioChunk = stats.audioChunkCount === 1;
    ws.send(payload);
    socketLastAudioAtRef.current = Date.now();
    socketLastOutboundAtRef.current = socketLastAudioAtRef.current;
    if (import.meta.env.DEV && isFirstAudioChunk) {
      logSocketLifecycle("CLIENT_FIRST_AUDIO_SENT", ws, {
        audioChunkCount: stats.audioChunkCount,
        audioBytesCount: stats.audioBytesCount,
        audioChunkCreatedAt: new Date(audioChunkCreatedAt).toISOString(),
        audioChunkSentAt: new Date(socketLastAudioAtRef.current).toISOString(),
      });
    }
    stats.wsBufferedBytes = ws.bufferedAmount;
    stats.maxWsBufferedBytes = Math.max(stats.maxWsBufferedBytes, ws.bufferedAmount);
    stats.queueDepth = stats.wsBufferedBytes === 0
      ? 0
      : Math.ceil(stats.wsBufferedBytes / Math.max(1, payload.length));

    const decision = segmenterRef.current.observe(rms, now);
    if (decision) {
      socketLastOutboundAtRef.current = Date.now();
      logSocketLifecycle("CLIENT_COMMIT_SENT", ws, {
        reason: decision,
        audioChunkCount: stats.audioChunkCount,
        audioBytesCount: stats.audioBytesCount,
        lastAudioAt: socketLastAudioAtRef.current === null
          ? null
          : new Date(socketLastAudioAtRef.current).toISOString(),
      });
      ws.send(JSON.stringify({ t: "commit" }));
      stats.lastWsSendAt = performance.now();
      traceAi(decision === "silence" ? "SILENCE_TURN_COMMITTED" : "LONG_UTTERANCE_COMMITTED", { reason: decision });
    }
    return true;
  }, [logSocketLifecycle, markPipelineMilestone]);

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
      asrProvider: stats.asrProvider,
      providerConnectionMs: stats.providerConnectionMs,
      audioSource: stats.audioSource,
      micCaptureStartMs: stats.micCaptureStartMs,
      firstAudioFrameMs: stats.firstAudioFrameMs,
      websocketOpenMs: stats.websocketOpenMs,
      firstProviderPartialMs: stats.firstProviderPartialMs,
      firstProviderFinalMs: stats.firstProviderFinalMs,
      matcherStartMs: stats.matcherStartMs,
      matcherEndMs: stats.matcherEndMs,
      uiCommitMs: stats.uiCommitMs,
      totalFeedbackMs: stats.totalFeedbackMs,
      chunkDurationMs: stats.chunkDurationMs,
      bytesPerChunk: stats.bytesPerChunk,
      queueDepth: stats.queueDepth,
      clientDroppedChunkCount: stats.clientDroppedChunkCount,
      providerDroppedChunkCount: stats.providerDroppedChunkCount,
      droppedChunkCount: stats.clientDroppedChunkCount + stats.providerDroppedChunkCount,
      forcedCommitCount: segmenterRef.current.forcedCommitCount,
      wsBufferedBytes: stats.wsBufferedBytes,
      maxWsBufferedBytes: stats.maxWsBufferedBytes,
    });
    // النسب المئوية تُحسب هنا مرة في الثانية، لا مع كل delta.
    const provider = providerLatenciesRef.current;
    const firstSpeechPartial = firstSpeechPartialLatenciesRef.current;
    if (provider.count > 0 || firstSpeechPartial.count > 0) {
      const transport = transportLatenciesRef.current;
      const backend = backendProviderLatenciesRef.current;
      setMetrics((previous) => ({
        ...previous,
        providerLatencyMs: lastProviderLatencyRef.current,
        providerP50Ms: provider.percentile(0.5),
        providerP95Ms: provider.percentile(0.95),
        providerMinMs: provider.min(),
        providerMaxMs: provider.max(),
        transportP50Ms: transport.percentile(0.5),
        transportP95Ms: transport.percentile(0.95),
        transportMinMs: transport.min(),
        transportMaxMs: transport.max(),
        backendProviderP50Ms: backend.percentile(0.5),
        backendProviderP95Ms: backend.percentile(0.95),
        backendProviderMinMs: backend.min(),
        backendProviderMaxMs: backend.max(),
        firstSpeechPartialP50Ms: firstSpeechPartial.percentile(0.5),
        firstSpeechPartialP95Ms: firstSpeechPartial.percentile(0.95),
      }));
    }
  }, []);

  /** تسليم متزامن لكل حدث تفريغ — لا يُسقِط React batching أي delta/final. */
  const subscribe = useCallback((listener: TranscriptListener) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  const subscribeQrcObservations = useCallback((listener: QrcStructuredObservationListener) => {
    qrcObservationListenersRef.current.add(listener);
    return () => { qrcObservationListenersRef.current.delete(listener); };
  }, []);

  const emitQrcObservation = useCallback((event: unknown) => {
    if (!isQrcStructuredObservation(event)) return;
    for (const listener of qrcObservationListenersRef.current) {
      try { listener(event); } catch (error) {
        if (import.meta.env.DEV) console.error("[TABYAN_QRC_SHADOW] observation listener failed", error);
      }
    }
  }, []);

  const emitTranscript = useCallback((event: TranscriptEvent) => {
    for (const listener of listenersRef.current) {
      try { listener(event); } catch (error) {
        if (import.meta.env.DEV) console.error("[TABYAN_AI_TRACE] transcript listener failed", error);
      }
    }
    if (trackTranscriptStateRef.current) setLatestTranscriptEvent(event);
  }, []);

  const normalizeTranscriptForMatcher = useCallback((
    message: Extract<GatewayMessage, { t: "transcript" }>,
    now: number,
  ) => {
    const provider = message.provider ?? diagnosticRef.current.asrProvider;
    const type = message.normalizedType ?? (message.isFinal ? "final" : "partial");
    if (!provider || type !== (message.isFinal ? "final" : "partial")) return null;
    const normalized = normalizeProviderObservation({
      observationKind: "transcript",
      provider,
      providerEventType: `transcript.${type}`,
      observedAt: Number.isFinite(message.receivedAt) ? message.receivedAt : now,
      ...(message.eventId ? { providerEventId: message.eventId, providerRawId: message.eventId } : {}),
      ...(message.itemId ? { providerUtteranceId: message.itemId } : {}),
      transcript: message.text,
      completeness: type,
      textIsDelta: message.textIsDelta ?? false,
      ...(message.confidence === undefined ? {} : { confidenceHint: message.confidence }),
      ...(Array.isArray(message.wordConfidences) ? { wordConfidences: message.wordConfidences } : {}),
      ...(message.confirmationEligible === undefined
        ? {}
        : { confirmationEligible: message.confirmationEligible }),
    });
    return normalized ? normalizedTranscriptBridgeRef.current.toMatcherInput(normalized) : null;
  }, []);

  // التشخيص يُحدَّث مرة في الثانية أثناء جلسة حية فقط؛ في الخمول لا إعادة رسم.
  const transportLive = state !== "idle" && state !== "failed";
  useEffect(() => {
    if (!transportLive) return;
    const timer = window.setInterval(snapshotDiagnostics, 1000);
    snapshotDiagnostics();
    return () => window.clearInterval(timer);
  }, [snapshotDiagnostics, transportLive]);

  const cleanupMedia = useCallback(() => {
    if (keepaliveTimerRef.current !== null) window.clearInterval(keepaliveTimerRef.current);
    keepaliveTimerRef.current = null;
    providerReadyRef.current = false;
    pendingAudioRef.current = [];
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const released = contextRef.current?.close().then(() => true, () => false) ?? Promise.resolve(true);
    contextRef.current = null;
    if (moduleUrlRef.current) URL.revokeObjectURL(moduleUrlRef.current);
    moduleUrlRef.current = null;
    return released;
  }, []);

  const close = useCallback(() => {
    fileInjectionGenerationRef.current += 1;
    const released = cleanupMedia();
    flushResolverRef.current?.(false);
    flushResolverRef.current = null;
    finalResolverRef.current?.();
    finalResolverRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    // الفشل الحقيقي يبقى ظاهراً برسالته؛ غير ذلك يعود النقل إلى الخمول قبل
    // وصول onclose غير المتزامن فلا يُعدّ الإغلاق المقصود انقطاعاً.
    if (stateRef.current !== "failed") {
      stateRef.current = "idle";
      setState("idle");
    }
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        socketCloseRequestedByRef.current = "client_hook";
        socketLastOutboundAtRef.current = Date.now();
        logSocketLifecycle("CLIENT_CLOSE_MESSAGE_SENT", ws, {
          requestedBy: "client_hook",
          audioChunkCount: diagnosticRef.current.audioChunkCount,
          audioBytesCount: diagnosticRef.current.audioBytesCount,
        });
        ws.send(JSON.stringify({ t: "close" }));
      }
    } catch { /* A closing socket must not interrupt microphone cleanup. */ }
    try {
      if (ws) {
        socketCloseRequestedByRef.current ??= "client_hook";
        logSocketLifecycle("CLIENT_SOCKET_CLOSE_REQUESTED", ws, {
          requestedBy: socketCloseRequestedByRef.current,
        });
        ws.close();
      }
    } catch { /* Already detached from this session. */ }
    return released;
  }, [cleanupMedia, logSocketLifecycle]);

  /** إلغاء صريح من الواجهة: يغلق كل شيء ويمسح أي فشل سابق. */
  const cancel = useCallback(() => {
    close();
    stateRef.current = "idle";
    setState("idle");
    setFailure(null);
    setError(null);
  }, [close]);

  const fail = useCallback((message: string, kind: TransportFailure = "transport") => {
    setError(message);
    setFailure(kind);
    stateRef.current = "failed";
    setState("failed");
    cleanupMedia();
  }, [cleanupMedia]);

  const startCapture = useCallback(async (expectedWs: WebSocket): Promise<boolean> => {
    try {
      traceAi("MIC_PERMISSION_REQUESTED");
      stateRef.current = "requesting_mic";
      setState("requesting_mic");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // Permission may return after cancel/retry or a failed start. Never attach
      // the old microphone to a replacement session; stop the granted tracks.
      if (wsRef.current !== expectedWs || (stateRef.current as TransportState) === "failed") {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      traceAi("MIC_PERMISSION_GRANTED", { audioTracks: stream.getAudioTracks().length });
      streamRef.current = stream;
      const context = new AudioContext({ sampleRate: requestedAudioSampleRateRef.current });
      contextRef.current = context;
      const url = URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: "application/javascript" }));
      moduleUrlRef.current = url;
      await context.audioWorklet.addModule(url);
      if (wsRef.current !== expectedWs || (stateRef.current as TransportState) === "failed") {
        stream.getTracks().forEach((track) => track.stop());
        void context.close().catch(() => {});
        URL.revokeObjectURL(url);
        return false;
      }
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, "tabyan-pcm24k");
      processorRef.current = processor;
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(processor).connect(silent).connect(context.destination);
      diagnosticRef.current.audioSource = "microphone";
      markPipelineMilestone("micCaptureStartMs");
      processor.port.onmessage = (event: MessageEvent<ArrayBuffer | { t: "flushed" }>) => {
        if (wsRef.current !== expectedWs) return;
        if (!(event.data instanceof ArrayBuffer)) {
          if (event.data.t === "flushed") flushResolverRef.current?.(true);
          return;
        }
        diagnosticRef.current.workletMessageCount += 1;
        const samples = new Int16Array(event.data);
        const frame = frameStats(samples);
        const now = performance.now();
        if (!pausedRef.current) {
          const quality = qualityRef.current.observe(frame);
          if (quality.reliable !== audioReliableRef.current || quality.issue !== qualityIssueRef.current) {
            audioReliableRef.current = quality.reliable;
            qualityIssueRef.current = quality.issue;
            setAudioQuality(quality);
          }
        }
        observeAudioLevel(frame.rms, now);
        if (pausedRef.current) return;
        sendPcmChunk(event.data, frame.rms);
      };
      await context.resume();
      if (wsRef.current !== expectedWs) return false;
      if ((stateRef.current as TransportState) === "failed") {
        cleanupMedia();
        return false;
      }
      if (context.state !== "running") throw new Error("Audio capture context is not running");
      traceAi("AUDIO_CAPTURE_STARTED");
      // Capture runs while the provider connects; its audio is buffered until READY.
      if (stateRef.current === "requesting_mic") {
        stateRef.current = "connecting";
        setState("connecting");
      }
      return true;
    } catch {
      if (wsRef.current !== expectedWs) return false;
      fail("تعذر الوصول إلى الميكروفون — امنح الإذن ثم أعد المحاولة", "mic");
      return false;
    }
  }, [cleanupMedia, fail, markPipelineMilestone, observeAudioLevel, sendPcmChunk]);

  const start = useCallback(async (sessionId: string, source: AudioInputSource = "microphone") => {
    if (source === "microphone" && (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode)) {
      fail("هذا المتصفح لا يدعم التقاط الصوت المطلوب للتفريغ الحي", "unsupported");
      return false;
    }
    if (source === "audio-file" && typeof AudioContext === "undefined") {
      fail("هذا المتصفح لا يدعم فك ترميز ملف الصوت للاختبار", "unsupported");
      return false;
    }
    close();
    normalizedTranscriptBridgeRef.current.reset();
    partialByItemRef.current.clear();
    stateRef.current = "connecting";
    setState("connecting");
    setError(null);
    setFailure(null);
    qualityRef.current.reset();
    qualityIssueRef.current = null;
    audioReliableRef.current = true;
    setAudioQuality({ issue: null, reliable: true });
    setPartial("");
    setFinalTranscript("");
    setMetrics(EMPTY_METRICS);
    setLatestTranscriptEvent(null);
    partialByItemRef.current.clear();
    pausedRef.current = false;
    firstAudioAtRef.current = null;
    firstPartialAtRef.current = null;
    lastAudioChunkAtRef.current = null;
    segmenterRef.current.reset();
    finalsRef.current.clear();
    providerLatenciesRef.current.clear();
    firstSpeechPartialLatenciesRef.current.clear();
    transportLatenciesRef.current.clear();
    backendProviderLatenciesRef.current.clear();
    lastProviderLatencyRef.current = null;
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
      wsBufferedBytes: 0,
      maxWsBufferedBytes: 0,
      asrProvider: null,
      providerConnectionMs: null,
      audioSource: source,
      micCaptureStartMs: null,
      firstAudioFrameMs: null,
      websocketOpenMs: null,
      firstProviderPartialMs: null,
      firstProviderFinalMs: null,
      matcherStartMs: null,
      matcherEndMs: null,
      uiCommitMs: null,
      totalFeedbackMs: null,
      chunkDurationMs: 0,
      bytesPerChunk: 0,
      queueDepth: 0,
      clientDroppedChunkCount: 0,
      providerDroppedChunkCount: 0,
    };
    setDiagnostics(EMPTY_DIAGNOSTICS);
    startedAtRef.current = performance.now();

    try {
      return await new Promise<boolean>((resolve) => {
        const diagnosticClientId = import.meta.env.DEV ? crypto.randomUUID() : null;
        socketTraceIdRef.current = diagnosticClientId;
        socketCloseRequestedByRef.current = null;
        socketLastMessageAtRef.current = null;
        socketLastOutboundAtRef.current = null;
        socketLastAudioAtRef.current = null;
        traceAi("WS_CONNECT_ATTEMPT", { url: gatewayUrl() });
        const ws = new WebSocket(gatewayUrl());
        wsRef.current = ws;
        lastExpectedRef.current = "";
        logSocketLifecycle("CLIENT_SOCKET_CONNECT_ATTEMPT", ws);
        const token = localStorage.getItem("tabyan_token") ?? "";
        let timeout: number | null = null;
        let settled = false;
        const clearStartTimeout = () => {
          if (timeout === null) return;
          window.clearTimeout(timeout);
          timeout = null;
        };
        const settle = (started: boolean) => {
          if (settled) return;
          settled = true;
          clearStartTimeout();
          resolve(started);
        };
        // The microphone opens with the socket so words spoken while the provider
        // connects are buffered and flushed at READY instead of being lost.
        const capture = source === "microphone" ? startCapture(ws) : null;
        void capture?.then((capturing) => {
          if (capturing) return;
          if (wsRef.current === ws) close();
          settle(false);
        }, () => {
          if (wsRef.current !== ws) { settle(false); return; }
          fail("تعذر تهيئة التقاط الصوت", "mic");
          close();
          settle(false);
        });
        let providerReadyReceived = false;
        const startKeepalive = () => {
          keepaliveTimerRef.current = window.setInterval(() => {
            if (wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return;
            // Pongs arrive even during silence, so a quiet socket is a dead one.
            if (Date.now() - (socketLastMessageAtRef.current ?? 0) > RECITATION_GATEWAY_SILENCE_TIMEOUT_MS) {
              socketCloseRequestedByRef.current = "client_gateway_silent";
              fail("انقطع الاتصال بخدمة التعرف", "transport");
              close();
              return;
            }
            try { ws.send(JSON.stringify({ t: "ping" })); } catch { /* onclose reports the failure. */ }
          }, RECITATION_KEEPALIVE_INTERVAL_MS);
        };
        timeout = window.setTimeout(() => {
          if (wsRef.current !== ws) { settle(false); return; }
          socketCloseRequestedByRef.current = "client_start_timeout";
          logSocketLifecycle("CLIENT_START_TIMER_FIRED", ws, { timeoutMs: 15_000 });
          fail("انتهت مهلة الاتصال بخدمة التفريغ الحي", "timeout");
          ws.close();
          settle(false);
        }, 15_000);

        ws.onopen = () => {
          if (wsRef.current !== ws) { settle(false); return; }
          try {
            logSocketLifecycle("CLIENT_SOCKET_OPEN", ws);
            markPipelineMilestone("websocketOpenMs");
            socketLastOutboundAtRef.current = Date.now();
            ws.send(JSON.stringify({
              t: "auth",
              token,
              sessionId,
              ...(diagnosticClientId ? { diagnosticClientId } : {}),
            }));
            logSocketLifecycle("CLIENT_AUTH_MESSAGE_SENT", ws, {
              diagnosticClientIdProvided: diagnosticClientId !== null,
              sessionIdProvided: Boolean(sessionId),
            });
          } catch {
            socketCloseRequestedByRef.current = "client_auth_send_failed";
            fail("تعذر بدء اتصال خدمة التفريغ الحي", "transport");
            close();
            settle(false);
          }
        };
        const handleWsMessage = (event: MessageEvent) => {
          if (wsRef.current !== ws) return;
          socketLastMessageAtRef.current = Date.now();
          diagnosticRef.current.lastWsReceiveAt = performance.now();
          diagnosticRef.current.backendWsConnected = true;
          let message: GatewayMessage;
          try { message = JSON.parse(String(event.data)) as GatewayMessage; } catch { return; }
          if (message.t === "error") {
            logSocketLifecycle("API_ERROR_MESSAGE_RECEIVED", ws, {
              errorCode: message.code ?? null,
            });
            clearStartTimeout();
            const errorMessage = typeof message.message === "string" && message.message.trim()
              ? message.message
              : "تعذر استمرار اتصال خدمة التفريغ الحي";
            fail(errorMessage, gatewayErrorFailure(message.code));
            socketCloseRequestedByRef.current = "api_error_message";
            ws.close();
            settle(false);
            return;
          }
          if (message.t === "diagnostics") {
            diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
            diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
            diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
            diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
            diagnosticRef.current.providerDroppedChunkCount = message.providerStats.droppedAudioChunkCount;
            return;
          }
          if (message.t === "authenticated") {
            logSocketLifecycle("API_AUTHENTICATED_MESSAGE_RECEIVED", ws);
            traceAi("WS_AUTHENTICATED");
            return;
          }
          if (message.t === "finalized") {
            logSocketLifecycle("API_FINALIZED_MESSAGE_RECEIVED", ws);
            if (
              providerAcknowledgesFinalization(diagnosticRef.current.asrProvider)
              && message.commitId === finalCommitIdRef.current && stateRef.current === "stopping") {
              if (import.meta.env.DEV && diagnosticRef.current.asrProvider === "tarteel") {
                traceAi("TARTEEL_FINAL_COMMIT_ACK", {
                  providerCompletedEventCount: diagnosticRef.current.providerCompletedEventCount,
                  providerDroppedChunkCount: diagnosticRef.current.providerDroppedChunkCount,
                });
              }
              finalResolverRef.current?.();
              finalResolverRef.current = null;
            }
            return;
          }
          if (message.t === "ready") {
            logSocketLifecycle("API_PROVIDER_READY_MESSAGE_RECEIVED", ws, {
              provider: message.provider ?? "unknown",
            });
            if (providerReadyReceived) return;
            providerReadyReceived = true;
            clearStartTimeout();
            traceAi("ASR_PROVIDER_READY", { provider: message.provider ?? "unknown" });
            requestedAudioSampleRateRef.current = message.audioSampleRateHz ?? 24_000;
            diagnosticRef.current.providerConnected = true;
            diagnosticRef.current.asrProvider = message.provider ?? null;
            diagnosticRef.current.providerConnectionMs = Number.isFinite(message.providerConnectionMs)
              ? Math.max(0, Math.round(message.providerConnectionMs))
              : null;
            setDiagnostics((previous) => ({
              ...previous,
              providerConnected: true,
              asrProvider: diagnosticRef.current.asrProvider,
              providerConnectionMs: diagnosticRef.current.providerConnectionMs,
            }));
            diagnosticRef.current.providerSessionStartedAt = performance.now();
            const connectionMs = Math.round(performance.now() - startedAtRef.current);
            setMetrics((previous) => ({ ...previous, connectionMs }));
            // Microphone: wait for capture (permission may still be pending);
            // capture failures are already handled by the capture promise.
            void (capture ?? Promise.resolve(true)).then(async (capturing) => {
              if (wsRef.current !== ws || !capturing) { settle(false); return; }
              try { await onAudioReadyRef.current?.(); } catch { /* Optional audio cue. */ }
              if (wsRef.current !== ws || (stateRef.current as TransportState) === "failed") { settle(false); return; }
              providerReadyRef.current = true;
              const pending = pendingAudioRef.current;
              pendingAudioRef.current = [];
              for (const frame of pending) sendPcmChunk(frame.buffer, frame.rms);
              startKeepalive();
              stateRef.current = "listening";
              setState("listening");
              settle(true);
            }, () => settle(false));
            return;
          }
          if (message.t === "qrc-observation") {
            emitQrcObservation(message.observation);
            return;
          }
          if (message.t === "transcript") {
            const now = performance.now();
            if (!message.isFinal) {
              diagnosticRef.current.transcriptDeltaCount += 1;
              const previousDeltaAt = diagnosticRef.current.lastDeltaAt;
              const activeSpeechStartedAt = diagnosticRef.current.activeSpeechStartedAt;
              if (
                activeSpeechStartedAt !== null
                && (previousDeltaAt === null || previousDeltaAt < activeSpeechStartedAt)
              ) {
                firstSpeechPartialLatenciesRef.current.push(Math.max(0, now - activeSpeechStartedAt));
              }
              diagnosticRef.current.lastDeltaAt = now;
              if (message.providerStats) {
                diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
                diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
                diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
                diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
                diagnosticRef.current.providerDroppedChunkCount = message.providerStats.droppedAudioChunkCount;
              }
              if (firstPartialAtRef.current === null) {
                firstPartialAtRef.current = now;
                setMetrics((previous) => ({ ...previous, firstPartialMs: Math.round(now - startedAtRef.current) }));
                markPipelineMilestone("firstProviderPartialMs");
                traceAi("OPENAI_FIRST_DELTA");
              }
              const accumulated = message.textIsDelta === false
                ? message.text
                : `${partialByItemRef.current.get(message.itemId) ?? ""}${message.text}`;
              if (!partialByItemRef.current.has(message.itemId) && partialByItemRef.current.size >= MAX_PARTIAL_ITEMS) {
                const oldestItemId = partialByItemRef.current.keys().next().value;
                if (oldestItemId !== undefined) partialByItemRef.current.delete(oldestItemId);
              }
              partialByItemRef.current.set(message.itemId, accumulated);
              if (trackTranscriptStateRef.current) setPartial(accumulated);
              const providerLatency = lastAudioChunkAtRef.current === null
                ? null
                : Math.max(0, Math.round(now - lastAudioChunkAtRef.current));
              if (providerLatency !== null) {
                lastProviderLatencyRef.current = providerLatency;
                providerLatenciesRef.current.push(providerLatency);
                if (message.timing?.audioChunkSentAt !== undefined) {
                  transportLatenciesRef.current.push(Math.max(0, message.timing.backendAudioReceivedAt - message.timing.audioChunkSentAt));
                }
                if (message.timing !== undefined) {
                  backendProviderLatenciesRef.current.push(Math.max(0, message.timing.providerDeltaReceivedAt - message.timing.backendAudioReceivedAt));
                }
              }
              const matcherInput = normalizeTranscriptForMatcher(message, now);
              if (matcherInput) {
                emitTranscript({
                  ...matcherInput,
                  receivedAt: now,
                  clientReceivedAt: now,
                  audioChunkSentAt: lastAudioChunkAtRef.current ?? undefined,
                });
              }
            } else {
              diagnosticRef.current.transcriptCompletedCount += 1;
              if (message.providerStats) {
                diagnosticRef.current.providerEventCount = message.providerStats.providerEventCount;
                diagnosticRef.current.providerDeltaEventCount = message.providerStats.providerDeltaEventCount;
                diagnosticRef.current.providerCompletedEventCount = message.providerStats.providerCompletedEventCount;
                diagnosticRef.current.providerErrorCount = message.providerStats.providerErrorCount;
                diagnosticRef.current.providerDroppedChunkCount = message.providerStats.droppedAudioChunkCount;
              }
              const finalMs = Math.round(now - startedAtRef.current);
              markPipelineMilestone("firstProviderFinalMs");
              finalsRef.current.push(finalMs);
              if (trackTranscriptStateRef.current) setFinalTranscript(message.text);
              partialByItemRef.current.delete(message.itemId);
              const matcherInput = normalizeTranscriptForMatcher(message, now);
              if (matcherInput) {
                emitTranscript({
                  ...matcherInput,
                  receivedAt: now,
                  clientReceivedAt: now,
                  confirmationEligible: matcherInput.confirmationEligible,
                });
              }
              const provider = message.provider ?? diagnosticRef.current.asrProvider;
              if (import.meta.env.DEV && provider === "tarteel") {
                const sequence = /^tarteel-(\d+)-/.exec(message.itemId)?.[1] ?? null;
                traceAi("TARTEEL_ASR_FINAL", {
                  sequence: sequence === null ? null : Number(sequence),
                  providerUtteranceId: message.itemId,
                  rawTranscript: message.text,
                  normalizedTranscript: normalizeQuranText(message.text),
                  providerCompletedEventCount: message.providerStats?.providerCompletedEventCount ?? null,
                });
              }
              setMetrics((previous) => ({
                ...previous,
                finalMs,
                p50Ms: finalsRef.current.percentile(0.5),
                p95Ms: finalsRef.current.percentile(0.95),
              }));
              traceAi("ASR_FINAL", { provider: diagnosticRef.current.asrProvider });
              if (!providerAcknowledgesFinalization(diagnosticRef.current.asrProvider)) {
                finalResolverRef.current?.();
                finalResolverRef.current = null;
              }
            }
          }
        };
        ws.onmessage = (event) => {
          try {
            handleWsMessage(event);
          } catch (reason) {
            if (import.meta.env.DEV) {
              console.error("[TABYAN_AI_TRACE] websocket message handler failed", {
                reasonType: typeof reason,
                reasonName: reason instanceof Error ? reason.name : null,
              });
            }
            fail("تعذر معالجة رد خدمة التفريغ الحي", "server");
            close();
            settle(false);
          }
        };
        ws.onerror = () => {
          if (wsRef.current !== ws) { settle(false); return; }
          logSocketLifecycle("CLIENT_SOCKET_ERROR", ws);
          fail("تعذر الاتصال بخادم التفريغ الحي");
          socketCloseRequestedByRef.current = "client_websocket_error";
          ws.close();
          settle(false);
        };
        ws.onclose = (event) => {
          logSocketLifecycle("CLIENT_SOCKET_CLOSED", ws, {
            closeTimestamp: new Date().toISOString(),
            closeCode: event.code,
            closeReason: event.reason,
            wasClean: event.wasClean,
            clientCloseRequestedBy: socketCloseRequestedByRef.current,
            audioChunkCount: diagnosticRef.current.audioChunkCount,
            audioBytesCount: diagnosticRef.current.audioBytesCount,
            lastAudioAt: socketLastAudioAtRef.current === null
              ? null
              : new Date(socketLastAudioAtRef.current).toISOString(),
          });
          if (wsRef.current !== ws) { settle(false); return; }
          // إغلاق غير متوقع أثناء الاستماع = انقطاع نقل عابر (قابل لإعادة الاتصال).
          if (stateRef.current !== "stopping" && stateRef.current !== "idle" && stateRef.current !== "failed") {
            fail("انقطع الاتصال بخدمة التعرف", "transport");
            settle(false);
          }
        };
      });
    } catch {
      fail("تعذر بدء اتصال خدمة التفريغ الحي", "transport");
      close();
      return false;
    }
  }, [
    cleanupMedia,
    close,
    emitQrcObservation,
    emitTranscript,
    fail,
    markPipelineMilestone,
    normalizeTranscriptForMatcher,
    sendPcmChunk,
    startCapture,
  ]);

  const injectAudioFile = useCallback(async (file: File): Promise<boolean> => {
    if (!import.meta.env.DEV) throw new Error("اختبار ملفات الصوت متاح في بيئة التطوير فقط");
    if (!file.size || file.size > MAX_AUDIO_FILE_BYTES) {
      throw new Error("اختر ملف صوت لا يتجاوز 20 ميغابايت");
    }
    const ws = wsRef.current;
    if (
      diagnosticRef.current.audioSource !== "audio-file"
      || !ws
      || ws.readyState !== WebSocket.OPEN
      || stateRef.current !== "listening"
    ) {
      throw new Error("اتصال مزوّد الصوت غير جاهز لاختبار الملف");
    }

    const generation = ++fileInjectionGenerationRef.current;
    const decoder = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    } finally {
      await decoder.close().catch(() => {});
    }
    if (generation !== fileInjectionGenerationRef.current || wsRef.current !== ws) return false;
    if (decoded.duration > MAX_AUDIO_FILE_SECONDS) {
      throw new Error("مدة ملف الاختبار يجب ألا تتجاوز 3 دقائق");
    }

    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, index) => decoded.getChannelData(index),
    );
    const pcm = resampleToMonoPcm16(channels, decoded.sampleRate);
    for (const chunk of pcm16Chunks(pcm)) {
      if (generation !== fileInjectionGenerationRef.current || wsRef.current !== ws) return false;
      while (pausedRef.current) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
        if (generation !== fileInjectionGenerationRef.current || wsRef.current !== ws) return false;
      }

      const frame = frameStats(chunk);
      observeAudioLevel(frame.rms, performance.now());
      const quality = qualityRef.current.observe(frame);
      if (quality.reliable !== audioReliableRef.current || quality.issue !== qualityIssueRef.current) {
        audioReliableRef.current = quality.reliable;
        qualityIssueRef.current = quality.issue;
        setAudioQuality(quality);
      }
      const buffer = new ArrayBuffer(chunk.byteLength);
      new Int16Array(buffer).set(chunk);
      if (!sendPcmChunk(buffer, frame.rms)) return false;
      const frameDurationMs = chunk.length / PCM_SAMPLE_RATE * 1_000;
      await new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(1, Math.round(frameDurationMs))));
    }

    if (generation === fileInjectionGenerationRef.current && wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ t: "commit" }));
      diagnosticRef.current.lastWsSendAt = performance.now();
    }
    return true;
  }, [observeAudioLevel, sendPcmChunk]);

  const pause = useCallback(() => { pausedRef.current = true; }, []);
  const resume = useCallback(() => { pausedRef.current = false; }, []);

  const stop = useCallback(() => {
    const isTarteelTrial = import.meta.env.DEV && diagnosticRef.current.asrProvider === "tarteel";
    if (isTarteelTrial) {
      traceAi("TARTEEL_STOP_REQUEST", { actionInFlight: stopFlightRef.current !== null });
    }
    return runSessionAction(stopFlightRef, async () => {
    if (isTarteelTrial) traceAi("TARTEEL_STOP_ACTION_STARTED");
    fileInjectionGenerationRef.current += 1;
    const ws = wsRef.current;
    try {
    if (stateRef.current !== "listening") {
      const alreadyFailed = stateRef.current === "failed";
      void close();
      if (!alreadyFailed) fail("لم يصبح التسميع جاهزًا؛ أُغلق الاتصال دون إعلان نجاح", "transport");
      return false;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      close();
      fail("اتصال التسميع مغلق؛ لا يمكن تأكيد الإنهاء", "transport");
      return false;
    }
    stateRef.current = "stopping";
    setState("stopping");
    if (processorRef.current) {
      if (isTarteelTrial) traceAi("TARTEEL_PCM_FLUSH_REQUESTED");
      const flushed = new Promise<boolean>((resolve) => { flushResolverRef.current = resolve; });
      processorRef.current.port.postMessage({ t: "flush" });
      let flushTimeout: ReturnType<typeof setTimeout> | undefined;
      const drained = await Promise.race([
        flushed,
        new Promise<boolean>((resolve) => { flushTimeout = setTimeout(() => resolve(false), 1500); }),
      ]);
      clearTimeout(flushTimeout);
      if (wsRef.current !== ws) return false;
      flushResolverRef.current = null;
      if (!drained) {
        if (isTarteelTrial) traceAi("TARTEEL_PCM_FLUSH_RESULT", { drained: false });
        fail("تعذر تفريغ الصوت قبل الإنهاء — حاول مرة أخرى", "transport");
        close();
        return false;
      }
      if (isTarteelTrial) traceAi("TARTEEL_PCM_FLUSH_RESULT", { drained: true });
    } else if (isTarteelTrial) {
      traceAi("TARTEEL_PCM_FLUSH_SKIPPED", { reason: "no_audio_worklet" });
    }
    let resolveFinal!: () => void;
    const completed = new Promise<void>((resolve) => { resolveFinal = resolve; });
    finalResolverRef.current = resolveFinal;
    finalCommitIdRef.current = crypto.randomUUID();
    if (wsRef.current !== ws) return false;
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ t: "commit", final: true, commitId: finalCommitIdRef.current })); }
      catch {
        fail("تعذر إنهاء اتصال التسميع", "transport");
        close();
        return false;
      }
      socketLastOutboundAtRef.current = Date.now();
      logSocketLifecycle("CLIENT_FINAL_COMMIT_SENT", ws, {
        audioChunkCount: diagnosticRef.current.audioChunkCount,
        audioBytesCount: diagnosticRef.current.audioBytesCount,
        lastAudioAt: socketLastAudioAtRef.current === null
          ? null
          : new Date(socketLastAudioAtRef.current).toISOString(),
      });
      if (isTarteelTrial) traceAi("TARTEEL_FINAL_COMMIT_SENT");
    }
    let finalTimeout: ReturnType<typeof setTimeout> | undefined;
    const finalized = await Promise.race([
      completed.then(() => true),
      new Promise<boolean>((resolve) => {
        finalTimeout = setTimeout(
          () => resolve(false),
          providerFinalizationTimeoutMs(diagnosticRef.current.asrProvider),
        );
      }),
    ]);
    clearTimeout(finalTimeout);
    if (finalResolverRef.current === resolveFinal) finalResolverRef.current = null;
    // A cancelled stop must never close a replacement socket after retry.
    if (wsRef.current !== ws) return false;
    // WebSocket callbacks can change the ref while the awaited final arrives.
    const failed = (stateRef.current as TransportState) === "failed";
    if (isTarteelTrial) traceAi("TARTEEL_FINAL_COMMIT_RESULT", { finalized, failed });
    if (!finalized || failed) {
      if (!failed) fail("تعذر تأكيد معالجة الصوت الأخير — حاول مرة أخرى", "transport");
      close();
      return false;
    }
    const cleanSocket = waitForCleanSocketClose(ws);
    const released = close();
    const closingGeneration = fileInjectionGenerationRef.current;
    const [socketClosed, audioReleased] = await Promise.all([cleanSocket, released]);
    if (fileInjectionGenerationRef.current !== closingGeneration) return false;
    if (isTarteelTrial) traceAi("TARTEEL_CLEAN_CLOSE_RESULT", { socketClosed, audioReleased });
    if (!socketClosed || !audioReleased) {
      fail("تعذر تأكيد إغلاق التسميع بأمان", "transport");
      return false;
    }
    // Never turn a provider failure into a successful completion.
    if (!failed) {
      stateRef.current = "idle";
      setState("idle");
    }
    return finalized && !failed;
    } catch {
      if (wsRef.current === ws) {
        fail("تعذر إنهاء التسميع بأمان — حاول مرة أخرى", "transport");
        void close();
      }
      return false;
    }
    });
  }, [close, fail]);

  useEffect(() => () => { void close(); }, [close]);


  /** يُقرأ داخل معالج الأحداث المتزامن دون انتظار إعادة رسم. */
  const isAudioReliable = useCallback(() => audioReliableRef.current, []);

  /** Words expected next, so Tilawi prefers them. Empty keeps the search open. */
  const noteExpected = useCallback((words: readonly string[]) => {
    const next = words.filter((word) => word.length > 0 && word.length <= 40).slice(0, 12);
    const key = next.join("\n");
    if (key === lastExpectedRef.current) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    lastExpectedRef.current = key;
    ws.send(JSON.stringify({ t: "expect", words: next }));
  }, []);

  return {
    state, failure, audioQuality, partial, finalTranscript, error, metrics, diagnostics, latestTranscriptEvent,
    start, stop, pause, resume, cancel, subscribe, subscribeQrcObservations,
    isAudioReliable, noteExpected, injectAudioFile, markPipelineMilestone,
  };
}