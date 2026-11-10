import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { and, eq } from "drizzle-orm";
import { db, recitationSessions } from "@workspace/db";
import { createContext } from "@workspace/tabyan-trpc";
import { logger } from "../lib/logger";
import { RecitationAudioRecorder } from "./recitationAudioRecorder";
import { NvidiaStreamingProvider, NVIDIA_ARABIC_SAMPLE_RATE_HZ } from "../recitation-providers/NvidiaStreamingProvider";
import { OpenAiRealtimeProvider } from "../recitation-providers/OpenAiRealtimeProvider";
import { SpeechmaticsStreamingProvider } from "../recitation-providers/SpeechmaticsStreamingProvider";
import { TarteelWhisperProvider } from "../recitation-providers/TarteelWhisperProvider";
import { tarteelTranscriber } from "../recitation-providers/TarteelWhisperWorker";
import { TilawiStreamingProvider } from "../recitation-providers/tilawi/TilawiStreamingProvider";
import { sharedTilawiModel } from "../recitation-providers/tilawi/tilawiModel";
import { NabrQrcSpeechProvider } from "../recitation-providers/NabrQrcSpeechProvider";
import { NabrQrcOneShotTestGate } from "../recitation-providers/nabr-qrc-one-shot-test";
import { qrcIntervalSummary } from "../recitation-providers/nabr-qrc-diagnostics";
import {
  parseNabrQrcConfig,
  readNabrQrcCredential,
} from "../recitation-providers/nabr-qrc-config";
import {
  nabrQrcStartInputForSession,
  type NabrQrcSessionContext,
} from "../recitation-providers/nabr-qrc-session";
import { selectSpeechRecognitionProvider } from "../recitation-providers/providerSelection";
import { classifyProviderError } from "../recitation-providers/provider-error-classification";
import { normalizeTranscriptEvent } from "../recitation-providers/recitation-contracts";
import type { QrcStructuredObservation } from "@workspace/tabyan-domain";
import {
  recitationSessionLeases,
  RECITATION_HEARTBEAT_TIMEOUT_MS,
  RECITATION_IDLE_MS,
  RECITATION_MAX_CONNECTION_MS,
} from "../recitation-providers/sessionLease";
import type {
  AudioAcceptanceEvidence,
  CanonicalTranscriptEvent,
  NabrQrcDiagnosticPacket,
  SpeechRecognitionProvider,
} from "../recitation-providers/types";

type ClientMessage =
  | { t: "auth"; token: string; sessionId: string; diagnosticClientId?: string }
  | { t: "audio"; audio: string; timing?: { audioChunkCreatedAt: number; audioChunkSentAt: number } }
  | { t: "commit"; final?: boolean; commitId?: string }
  | { t: "ping" }
  | { t: "expect"; words?: unknown }
  | { t: "close" };

type AuthenticatedUser = { id: string };

const MAX_BASE64_AUDIO_CHARS = 32 * 1024;
type ProviderName = SpeechRecognitionProvider["name"];
const nabrQrcOneShotTestGate = new NabrQrcOneShotTestGate();

function selectedProvider(): ProviderName | null {
  return selectSpeechRecognitionProvider({
    provider: process.env.TABYAN_AI_ASR_PROVIDER,
    nodeEnv: process.env.NODE_ENV,
    tarteelTrialEnabled: process.env.TABYAN_AI_TARTEEL_TRIAL_ENABLED,
    nabrEnabled: process.env.NABR_QRC_ENABLED,
    nabrShadowMode: process.env.NABR_QRC_SHADOW_MODE,
    nabrOneShotTest: process.env.NABR_QRC_ONE_SHOT_TEST,
  });
}

function liveTranscriptionEnabled(): boolean {
  return process.env.TABYAN_AI_ENABLED === "true"
    && process.env.TABYAN_AI_TRANSCRIPTION_ENABLED === "true"
    && process.env.TABYAN_AI_LIVE_TRACKING_ENABLED === "true";
}

function send(ws: WebSocket, message: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function clientError(ws: WebSocket, code: string, message: string) {
  send(ws, { t: "error", code, message });
}

function safeDiagnosticClientId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(value)
    ? value
    : null;
}

function redactedCloseReason(reason: Buffer): string {
  let text = reason.toString("utf8").slice(0, 123);
  const apiKey = process.env.NABR_QRC_API_KEY;
  if (apiKey) {
    text = text.split(apiKey).join("[REDACTED]");
    text = text.split(encodeURIComponent(apiKey)).join("[REDACTED]");
  }
  return text;
}

function websocketWasClean(ws: WebSocket): boolean | null {
  const state = ws as WebSocket & {
    _closeFrameReceived?: boolean;
    _closeFrameSent?: boolean;
  };
  return typeof state._closeFrameReceived === "boolean"
    && typeof state._closeFrameSent === "boolean"
    ? state._closeFrameReceived && state._closeFrameSent
    : null;
}

function isSafeBase64Audio(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_BASE64_AUDIO_CHARS
    && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function attachRecitationRealtime(server: Server) {
  // Development-only warmup: the same singleton is reused by authenticated
  // sessions. Model availability is not itself gateway/session acceptance.
  if (liveTranscriptionEnabled() && selectedProvider() === "tarteel") {
    void tarteelTranscriber.start().catch(() => {
      logger.warn("Local Quran Whisper warmup unavailable");
    });
  }
  // Load the in-process model at startup so the first recitation is not delayed.
  if (liveTranscriptionEnabled() && selectedProvider() === "tilawi") {
    sharedTilawiModel().then(
      () => logger.info("Tilawi recitation model loaded"),
      (error: unknown) => logger.error({ err: error }, "Tilawi recitation model unavailable"),
    );
  }
  const wss = new WebSocketServer({ noServer: true, maxPayload: 48 * 1024, perMessageDeflate: false });

  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (pathname !== "/api/ws/recitation") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws) => {
    let user: AuthenticatedUser | null = null;
    let provider: SpeechRecognitionProvider | null = null;
    let closed = false;
    let authenticating = false;
    const serverConnectionId = crypto.randomUUID();
    let clientDiagnosticId: string | null = null;
    let localSocketCloseCause: string | null = null;
    let clientRequestedClose = false;
    let lastClientMessageAt: number | null = null;
    const leaseOwner = Symbol("recitation socket");
    let leaseStudent: string | null = null;
    // Educational sessions keep the audio for the teacher to listen to.
    let recorder: RecitationAudioRecorder | null = null;
    let lastActivityAt = Date.now();
    let lastPongAt = lastActivityAt;
    const connectedAt = lastActivityAt;
    let sessionDeadlineAt = connectedAt + RECITATION_MAX_CONNECTION_MS;
    const developmentDiagnostics = process.env.NODE_ENV === "development";
    const logSocketLifecycle = (event: string, details: Record<string, unknown> = {}) => {
      if (!developmentDiagnostics) return;
      const at = Date.now();
      logger.info({
        ...details,
        serverConnectionId,
        clientDiagnosticId,
        event,
        timestamp: new Date(at).toISOString(),
        elapsedMs: Math.max(0, at - connectedAt),
        processId: process.pid,
        processUptimeMs: Math.round(process.uptime() * 1_000),
        readyState: ws.readyState,
        bufferedAmount: ws.bufferedAmount,
        lastClientMessageAt: lastClientMessageAt === null
          ? null
          : new Date(lastClientMessageAt).toISOString(),
      }, "recitation realtime socket lifecycle");
    };
    const closeGatewaySocket = (cause: string, terminate = false) => {
      localSocketCloseCause = cause;
      logSocketLifecycle(terminate ? "API_SOCKET_TERMINATE_REQUESTED" : "API_SOCKET_CLOSE_REQUESTED", {
        closeInitiator: "TABYAN_API",
        closeCause: cause,
      });
      if (terminate) ws.terminate();
      else ws.close();
    };
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      // A socket that stops answering protocol pings is half-open: drop it so
      // its lease cannot outlive the connection.
      if (now - lastPongAt > RECITATION_HEARTBEAT_TIMEOUT_MS) {
        logSocketLifecycle("API_HEARTBEAT_TIMEOUT", { lastPongAgeMs: now - lastPongAt });
        closeAll("heartbeat_timeout");
        closeGatewaySocket("heartbeat_timeout", true);
        return;
      }
      if (ws.readyState === WebSocket.OPEN) ws.ping();
      const idleMs = now - lastActivityAt;
      const sessionAgeMs = now - connectedAt;
      const idleExpired = idleMs > RECITATION_IDLE_MS;
      const maximumDurationExpired = now > sessionDeadlineAt;
      if (idleExpired || maximumDurationExpired) {
        const cause = idleExpired ? "idle_timeout" : "maximum_connection_duration";
        logSocketLifecycle("API_SESSION_TIMER_FIRED", {
          closeCause: cause,
          idleMs,
          idleLimitMs: RECITATION_IDLE_MS,
          sessionAgeMs,
          absoluteDeadlineAt: new Date(sessionDeadlineAt).toISOString(),
        });
        if (idleExpired) clientError(ws, "SESSION_IDLE", "انقطع اتصال التسميع لعدم وصول أي إشارة من التطبيق");
        else clientError(ws, "SESSION_EXPIRED", "انتهت مهلة اتصال التسميع؛ ابدأ اتصالاً جديداً");
        closeAll(cause);
        // The socket still answers pings: close gracefully so the error frame
        // reaches the client instead of being discarded by terminate().
        closeGatewaySocket(cause);
      }
    }, 10_000);
    cleanupTimer.unref();
    let receivedAudio = false;
    let receivedAudioForwarded = false;
    let receivedAudioAccepted = false;
    let receivedPartial = false;
    let receivedFinal = false;
    let audioChunkCount = 0;
    let audioBytesCount = 0;
    let providerEventCount = 0;
    let providerDeltaEventCount = 0;
    let providerCompletedEventCount = 0;
    let providerErrorCount = 0;
    let nabrOneShotClaimed = false;
    let nabrSummaryLogged = false;
    let nabrPacketCount = 0;
    let nabrResultPacketCount = 0;
    let nabrPositionObservationCount = 0;
    let nabrCorrectWordClaimCount = 0;
    let nabrSkippedWordClaimCount = 0;
    let nabrLetterObservationCount = 0;
    let nabrTajweedObservationCount = 0;
    let nabrFirstAudioForwardedAt: number | null = null;
    let nabrFirstFeedbackLatencyMs: number | null = null;
    let nabrLastResultAt: number | null = null;
    const nabrResultIntervalsMs: number[] = [];
    let droppedAudioChunkCount = 0;
    let providerAudioForwardedCount = 0;
    let providerAudioAcceptedCount = 0;
    let providerCommitAcceptedCount = 0;
    const developmentTelemetry = process.env.NODE_ENV !== "production";
    let latestAudioTiming: {
      audioChunkCreatedAt?: number;
      audioChunkSentAt?: number;
      backendAudioReceivedAt: number;
    } | null = null;
    let diagnosticHeartbeat: ReturnType<typeof setInterval> | null = null;

    const providerStats = () => ({
      providerEventCount,
      providerDeltaEventCount,
      providerCompletedEventCount,
      providerErrorCount,
      droppedAudioChunkCount,
      providerAudioForwardedCount,
      providerAudioAcceptedCount,
      providerCommitAcceptedCount,
    });

    const logNabrSummary = () => {
      if (!nabrOneShotClaimed || nabrSummaryLogged) return;
      nabrSummaryLogged = true;
      const intervalSummary = qrcIntervalSummary(nabrResultIntervalsMs);
      logger.info({
        eventCount: nabrPacketCount,
        resultPacketCount: nabrResultPacketCount,
        wordPositionEvents: nabrPositionObservationCount,
        reportedCorrectWordClaims: nabrCorrectWordClaimCount,
        reportedSkippedWordClaims: nabrSkippedWordClaimCount,
        letterDataCount: nabrLetterObservationCount,
        tajweedDataCount: nabrTajweedObservationCount,
        firstFeedbackLatencyMs: nabrFirstFeedbackLatencyMs,
        rawEventIntervalsMs: nabrResultIntervalsMs,
        medianEventIntervalMs: intervalSummary.medianMs,
        p95EventIntervalMs: intervalSummary.p95Ms,
        enoughIntervalSamples: intervalSummary.enoughSamples,
        learnerStateMutated: false,
        uiMistakesShown: false,
      }, "Nabr/QRC one-shot shadow session summary");
    };

    const sendDiagnostics = () => {
      if (process.env.NODE_ENV === "production") return;
      send(ws, {
        t: "diagnostics",
        audioChunkCount,
        audioBytesCount,
        providerStats: providerStats(),
      });
    };

    logSocketLifecycle("API_SOCKET_OPEN", {
      processStartedAt: new Date(Date.now() - process.uptime() * 1_000).toISOString(),
    });

    const closeAll = (reason = "unspecified") => {
      if (closed) return;
      closed = true;
      logSocketLifecycle("API_CLEANUP_STARTED", {
        closeCause: reason,
        provider: provider?.name ?? null,
        audioChunkCount,
        audioBytesCount,
        lastAudioAt: latestAudioTiming?.backendAudioReceivedAt
          ? new Date(latestAudioTiming.backendAudioReceivedAt).toISOString()
          : null,
      });
      clearInterval(cleanupTimer);
      clearTimeout(authTimeout);
      if (leaseStudent) recitationSessionLeases.release(leaseStudent, leaseOwner);
      leaseStudent = null;
      if (diagnosticHeartbeat) clearInterval(diagnosticHeartbeat);
      logNabrSummary();
      provider?.close(reason);
      provider = null;
      void recorder?.finish();
      recorder = null;
    };

    const authTimeout = setTimeout(() => {
      if (!user) {
        logSocketLifecycle("API_AUTH_TIMER_FIRED", { timeoutMs: 10_000 });
        clientError(ws, "AUTH_TIMEOUT", "انتهت مهلة التحقق من جلسة التسميع");
        closeAll("authentication_timeout");
        closeGatewaySocket("authentication_timeout", true);
      }
    }, 10_000);

    ws.on("ping", (data) => {
      logSocketLifecycle("API_CLIENT_WEBSOCKET_PING_RECEIVED", { payloadBytes: data.byteLength });
    });
    ws.on("pong", (data) => {
      lastPongAt = Date.now();
      logSocketLifecycle("API_CLIENT_WEBSOCKET_PONG_RECEIVED", { payloadBytes: data.byteLength });
    });

    const emitTranscript = (
      name: Exclude<ProviderName, "nabr">,
      event: CanonicalTranscriptEvent,
      itemId: string,
    ) => {
      const normalized = normalizeTranscriptEvent(name, event, Date.now(), itemId);
      if (normalized.type === "final") {
        providerCompletedEventCount += 1;
        receivedFinal = true;
      } else {
        providerDeltaEventCount += 1;
        receivedPartial = true;
      }
      send(ws, {
        t: "transcript",
        text: normalized.transcript,
        isFinal: normalized.type === "final",
        normalizedType: normalized.type,
        provider: normalized.provider,
        receivedAt: normalized.timestamp,
        itemId: normalized.providerUtteranceId ?? itemId,
        textIsDelta: normalized.textIsDelta,
        confirmationEligible: normalized.confirmationEligible,
        confidence: normalized.confidenceHint,
        wordConfidences: normalized.wordConfidences,
        eventId: normalized.providerEventId,
        timing: latestAudioTiming ? { ...latestAudioTiming, providerDeltaReceivedAt: Date.now() } : undefined,
        providerStats: providerStats(),
      });
    };

    const providerEvents = (name: ProviderName) => {
      const providerConnectStartedAt = performance.now();
      return {
        onConnectionPhase: (phase: "PROVIDER_CONNECTED" | "SESSION_CONFIGURED" | "CLEAN_CLOSE") => {
          if (!closed || phase === "CLEAN_CLOSE") logger.info({ provider: name, phase }, "recitation realtime provider milestone");
        },
        onReady: () => {
          if (closed) return;
          logger.info({ provider: name }, "recitation realtime provider ready");
          send(ws, {
            t: "ready",
            providerConnectionMs: Math.max(0, Math.round(performance.now() - providerConnectStartedAt)),
            provider: name,
            audioSampleRateHz: name === "nvidia" ? NVIDIA_ARABIC_SAMPLE_RATE_HZ : 24_000,
          });
        },
        onTranscript: (event: CanonicalTranscriptEvent) => {
          if (closed) return;
          if (name === "nabr") {
            // QRC currently documents structured positions/assessments, not a
            // transcript. Never let a future unverified shape enter Tabyan state.
            logger.warn({ provider: name }, "Nabr/QRC transcript event rejected without a documented mapping");
            return;
          }
          if (!receivedPartial && !event.isFinal) {
            receivedPartial = true;
            if (developmentTelemetry) {
              logger.info({ provider: name }, "recitation realtime first transcript partial received");
            }
          }
          if (!receivedFinal && event.isFinal) {
            receivedFinal = true;
            if (developmentTelemetry) {
              logger.info({ provider: name }, "recitation realtime first transcript final received");
            }
          }
          emitTranscript(name, event, event.itemId ?? `${name}-${crypto.randomUUID()}`);
        },
        onProviderEvent: () => { providerEventCount += 1; },
        onStructuredObservation: (observation: QrcStructuredObservation) => {
          if (closed
            || name !== "nabr"
            || process.env.NODE_ENV !== "development"
            || process.env.NABR_QRC_SHADOW_MODE !== "true") return;
          send(ws, { t: "qrc-observation", observation });
        },
        onQrcDiagnostic: (packet: NabrQrcDiagnosticPacket) => {
          if (name !== "nabr"
            || process.env.NODE_ENV !== "development"
            || process.env.NABR_QRC_SHADOW_MODE !== "true") return;
          const receivedAt = performance.now();
          nabrPacketCount += 1;
          let arrivalIntervalMs: number | undefined;
          if (packet.eventType === "TILAWA_RESULT") {
            nabrResultPacketCount += 1;
            if (nabrFirstFeedbackLatencyMs === null && nabrFirstAudioForwardedAt !== null) {
              nabrFirstFeedbackLatencyMs = Math.max(0, receivedAt - nabrFirstAudioForwardedAt);
            }
            if (nabrLastResultAt !== null) {
              arrivalIntervalMs = Math.max(0, receivedAt - nabrLastResultAt);
              nabrResultIntervalsMs.push(arrivalIntervalMs);
              if (nabrResultIntervalsMs.length > 512) nabrResultIntervalsMs.shift();
            }
            nabrLastResultAt = receivedAt;
            nabrPositionObservationCount += Number(
              packet.chapter_index !== undefined
              && packet.verse_index !== undefined
              && packet.word_index !== undefined,
            ) + packet.correct_words.length + packet.skipped_words.length;
            nabrCorrectWordClaimCount += packet.correct_words.length;
            nabrSkippedWordClaimCount += packet.skipped_words.length;
            nabrLetterObservationCount += packet.letter_mistakes.length;
            nabrTajweedObservationCount += packet.tajweed_mistakes.length;
          }
          logger.info({
            ...packet,
            arrivalIntervalMs,
          }, "Nabr/QRC shadow provider event");
        },
        onFinalized: (commitId?: string) => {
          if (closed) return;
          send(ws, { t: "finalized", commitId });
        },
        onAudioForwarded: (audioBytes: number) => {
          if (name === "nabr" && nabrFirstAudioForwardedAt === null) {
            nabrFirstAudioForwardedAt = performance.now();
          }
          providerAudioForwardedCount += 1;
          if (!receivedAudioForwarded) {
            receivedAudioForwarded = true;
            if (developmentTelemetry) {
              logger.info(
                { provider: name, audioBytes },
                "recitation realtime first audio forwarded to provider adapter",
              );
            }
          }
        },
        onAudioAccepted: (evidence: AudioAcceptanceEvidence) => {
          providerAudioAcceptedCount += 1;
          if (!receivedAudioAccepted) {
            receivedAudioAccepted = true;
            if (developmentTelemetry) {
              logger.info(
                { provider: name, evidence },
                "recitation realtime first provider audio acceptance confirmed",
              );
            }
          }
        },
        onCommitAccepted: (evidence: AudioAcceptanceEvidence) => {
          providerCommitAcceptedCount += 1;
          if (providerCommitAcceptedCount === 1 && developmentTelemetry) {
            logger.info(
              { provider: name, evidence },
              "recitation realtime first provider commit accepted",
            );
          }
        },
        onError: (message: string, code?: number) => {
          providerErrorCount += 1;
          logger.error({
            provider: name,
            providerCode: code,
            providerErrorCategory: classifyProviderError(message),
          }, "recitation realtime stream error");
          clientError(ws, "PROVIDER_STREAM_ERROR", name === "tarteel" ? "تعذر تشغيل خدمة التسميع الآن" : "تعذر استمرار اتصال خدمة التفريغ الحي");
          closeAll("provider_error");
          closeGatewaySocket("provider_error");
        },
        onClose: (code?: number, reason?: string) => {
          logger.info({
            provider: name,
            providerCode: code,
            providerCloseCategory: reason ? classifyProviderError(reason) : "provider_error",
          }, "recitation realtime provider closed");
          if (!closed) {
            clientError(ws, "PROVIDER_CLOSED", name === "tarteel" ? "تعذر تشغيل خدمة التسميع الآن" : "انقطع اتصال خدمة التفريغ الحي");
            closeAll("upstream_provider_closed");
            closeGatewaySocket("upstream_provider_closed");
          }
        },
      };
    };

    const connectNvidia = () => {
      const apiKey = process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        clientError(ws, "PROVIDER_UNAVAILABLE", "خدمة NVIDIA للتفريغ الحي غير مهيأة");
        return;
      }
      provider = new NvidiaStreamingProvider(apiKey, providerEvents("nvidia"));
      provider.connect();
    };

    const connectOpenAi = () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.error("OpenAI realtime unavailable: OPENAI_API_KEY is not configured");
        clientError(ws, "PROVIDER_UNAVAILABLE", "خدمة التفريغ الحي غير مهيأة");
        closeGatewaySocket("openai_credential_unavailable");
        return;
      }
      logger.info("recitation realtime OpenAI connection attempt");
      provider = new OpenAiRealtimeProvider(apiKey, providerEvents("openai"));
      provider.connect();
    };

    const connectSpeechmatics = () => {
      const apiKey = process.env.SPEECHMATICS_API_KEY;
      if (!apiKey) {
        logger.error("Speechmatics realtime unavailable: SPEECHMATICS_API_KEY is not configured");
        clientError(ws, "PROVIDER_UNAVAILABLE", "خدمة Speechmatics للتفريغ الحي غير مهيأة");
        closeGatewaySocket("speechmatics_credential_unavailable");
        return;
      }
      logger.info("recitation realtime Speechmatics connection attempt");
      provider = new SpeechmaticsStreamingProvider(apiKey, providerEvents("speechmatics"));
      provider.connect();
    };

    const connectTarteel = () => {
      const nodeEnv = process.env.NODE_ENV;
      const trialOn = process.env.TABYAN_AI_TARTEEL_TRIAL_ENABLED === "true";
      const allowed = trialOn && (nodeEnv === "development" || nodeEnv === "production");
      if (!allowed) {
        clientError(ws, "PROVIDER_UNAVAILABLE", "مسار Tarteel التجريبي غير متاح في هذا النشر");
        closeGatewaySocket("tarteel_trial_not_enabled");
        return;
      }
      logger.info("recitation realtime Tarteel Whisper trial connection attempt");
      provider = new TarteelWhisperProvider(providerEvents("tarteel"));
      provider.connect();
    };

    const connectTilawi = () => {
      logger.info("recitation realtime Tilawi connection attempt");
      provider = new TilawiStreamingProvider(providerEvents("tilawi"));
      provider.connect();
    };

    const connectNabr = (session: NabrQrcSessionContext) => {
      if (process.env.NODE_ENV !== "development"
        || process.env.NABR_QRC_ONE_SHOT_TEST !== "true") {
        clientError(ws, "PROVIDER_NOT_CONFIGURED", "اختبار نبر محصور ببيئة التطوير");
        closeAll("nabr_one_shot_gate_disabled");
        closeGatewaySocket("nabr_one_shot_gate_disabled");
        return;
      }
      const config = parseNabrQrcConfig(process.env);
      if (!config.enabled || config.dryRun || !config.shadowMode) {
        clientError(ws, "PROVIDER_NOT_CONFIGURED", "إعداد مزود نبر غير مكتمل");
        closeAll("nabr_shadow_flags_invalid");
        closeGatewaySocket("nabr_shadow_flags_invalid");
        return;
      }
      const startInput = nabrQrcStartInputForSession(session, config);
      if (!startInput) {
        clientError(ws, "PROVIDER_NOT_CONFIGURED", "بيانات بداية التسميع أو سياسة QRC غير مكتملة");
        closeAll("nabr_start_policy_missing");
        closeGatewaySocket("nabr_start_policy_missing");
        return;
      }
      if (!nabrQrcOneShotTestGate.claim(session)) {
        clientError(ws, "PROVIDER_NOT_CONFIGURED", "جلسة الاختبار الوحيدة يجب أن تبدأ من الفاتحة 1:1");
        closeAll("nabr_one_shot_claim_rejected");
        closeGatewaySocket("nabr_one_shot_claim_rejected");
        return;
      }
      nabrOneShotClaimed = true;
      const credential = readNabrQrcCredential(process.env, config);
      provider = new NabrQrcSpeechProvider(
        config,
        credential,
        startInput,
        providerEvents("nabr"),
        { diagnosticTraceId: clientDiagnosticId ?? serverConnectionId },
      );
      provider.connect();
    };

    ws.on("message", (raw) => {
      lastClientMessageAt = Date.now();
      let message: ClientMessage;
      try {
        const parsed: unknown = JSON.parse(String(raw));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid message");
        message = parsed as ClientMessage;
      } catch {
        clientError(ws, "BAD_MESSAGE", "رسالة اتصال غير صالحة");
        return;
      }

      if (message.t === "auth") {
        clientDiagnosticId = safeDiagnosticClientId(message.diagnosticClientId);
        logSocketLifecycle("API_AUTH_MESSAGE_RECEIVED", {
          clientDiagnosticIdProvided: clientDiagnosticId !== null,
          sessionIdProvided: typeof message.sessionId === "string" && message.sessionId.length > 0,
        });
        if (closed || authenticating || user) {
          clientError(ws, "AUTH_ALREADY_STARTED", "بدأ التحقق من هذا الاتصال بالفعل");
          return;
        }
        authenticating = true;
        void (async () => {
          try {
            const ctx = await createContext({
              req: { headers: { authorization: `Bearer ${String(message.token ?? "")}` } },
              res: null,
            } as unknown as Parameters<typeof createContext>[0]);
            if (!ctx.user) {
              clientError(ws, "UNAUTHORIZED", "رمز الجلسة غير صالح");
              closeGatewaySocket("unauthorized");
              return;
            }
            if (ctx.user.role !== "student") {
              clientError(ws, "ROLE_FORBIDDEN", "التفريغ الحي متاح لجلسة الطالب فقط");
              closeGatewaySocket("role_forbidden");
              return;
            }
            const [session] = await db
              .select({
                id: recitationSessions.id,
                startedAt: recitationSessions.startedAt,
                mode: recitationSessions.mode,
                startVerseKey: recitationSessions.startVerseKey,
                startWordPosition: recitationSessions.startWordPosition,
                expectedRange: recitationSessions.expectedRange,
                assignmentId: recitationSessions.assignmentId,
              })
              .from(recitationSessions)
              .where(and(
                eq(recitationSessions.id, String(message.sessionId ?? "")),
                eq(recitationSessions.userId, ctx.user.id),
                eq(recitationSessions.status, "listening"),
              ))
              .limit(1);
            if (!session) {
              clientError(ws, "SESSION_FORBIDDEN", "جلسة التسميع غير متاحة للتفريغ الحي");
              closeGatewaySocket("session_forbidden");
              return;
            }
            if (closed || ws.readyState !== WebSocket.OPEN) return;
            // Reconnecting must not reset a logical session's wall-clock cap.
            sessionDeadlineAt = Math.min(sessionDeadlineAt, session.startedAt.getTime() + RECITATION_MAX_CONNECTION_MS);
            if (Date.now() > sessionDeadlineAt) {
              clientError(ws, "SESSION_EXPIRED", "انتهت مدة اتصال جلسة التسميع");
              closeGatewaySocket("session_expired_before_provider_connect");
              return;
            }
            // A reconnect for the same session replaces the previous socket,
            // which may be half-open and not yet caught by the heartbeat.
            const replace = () => {
              clientError(ws, "SESSION_REPLACED", "فُتح اتصال تسميع أحدث لهذه الجلسة");
              closeAll("replaced_by_reconnect");
              closeGatewaySocket("replaced_by_reconnect");
            };
            if (!recitationSessionLeases.acquire(ctx.user.id, session.id, leaseOwner, replace)) {
              clientError(ws, "SESSION_ALREADY_ACTIVE", "يوجد اتصال تسميع نشط لهذا الحساب");
              closeGatewaySocket("session_already_active");
              return;
            }
            leaseStudent = ctx.user.id;
            user = { id: ctx.user.id };
            clearTimeout(authTimeout);
            logger.info("recitation realtime client authenticated");
            logSocketLifecycle("API_CLIENT_AUTHENTICATED");
            send(ws, { t: "authenticated" });
            if (process.env.NODE_ENV !== "production") {
              diagnosticHeartbeat = setInterval(sendDiagnostics, 1000);
            }
             if (!liveTranscriptionEnabled()) {
               clientError(ws, "FEATURE_DISABLED", "التفريغ الحي غير مفعّل");
               closeGatewaySocket("live_transcription_disabled");
               return;
             }
             const selected = selectedProvider();
             if (!selected) {
               clientError(ws, "PROVIDER_NOT_CONFIGURED", "مزود التفريغ الحي غير محدد أو غير مدعوم");
               closeGatewaySocket("provider_not_configured");
               return;
             }
             if (session.assignmentId) {
               // Same rate the client is told to send in the ready message.
               recorder = new RecitationAudioRecorder(session.id, selected === "nvidia" ? NVIDIA_ARABIC_SAMPLE_RATE_HZ : 24_000);
             }
              if (selected === "nvidia") connectNvidia();
             else if (selected === "speechmatics") connectSpeechmatics();
             else if (selected === "tarteel") connectTarteel();
             else if (selected === "tilawi") connectTilawi();
              else if (selected === "nabr") connectNabr(session);
             else connectOpenAi();
          } catch {
            clientError(ws, "AUTH_FAILED", "تعذر التحقق من جلسة التسميع");
            closeGatewaySocket("authentication_failed");
          }
        })();
        return;
      }

       if (!user || closed) return;

      if (message.t === "ping") {
        // Client keepalive: a paused or silent reciter is idle, not gone.
        lastActivityAt = Date.now();
        send(ws, { t: "pong" });
        return;
      }

      if (message.t === "expect") {
        // The words ahead of a known place. Empty, or a provider without this, stays an open search.
        const words = Array.isArray(message.words)
          ? message.words.filter((word): word is string => typeof word === "string").slice(0, 12)
          : [];
        provider?.noteExpected?.(words);
        return;
      }

      if (message.t === "audio") {
        if (recorder && isSafeBase64Audio(message.audio)) recorder.append(message.audio);
        if (!provider?.isOpen()) {
          droppedAudioChunkCount += 1;
          if (droppedAudioChunkCount === 1 || droppedAudioChunkCount % 50 === 0) {
            logger.warn({
              provider: provider?.name ?? null,
              droppedAudioChunkCount,
            }, "recitation realtime audio dropped because provider is not open");
          }
          return;
        }
        if (!isSafeBase64Audio(message.audio)) {
          clientError(ws, "AUDIO_INVALID", "كتلة الصوت غير صالحة");
          return;
        }
        audioChunkCount += 1;
        lastActivityAt = Date.now();
        audioBytesCount += Math.floor(message.audio.length * 3 / 4);
        if (!receivedAudio) {
          receivedAudio = true;
          logger.info("recitation realtime first audio chunk received");
          logSocketLifecycle("API_FIRST_AUDIO_RECEIVED", {
            audioChunkCount,
            audioBytesCount,
            clientAudioCreatedAt: Number.isFinite(message.timing?.audioChunkCreatedAt)
              ? new Date(message.timing?.audioChunkCreatedAt ?? 0).toISOString()
              : null,
            clientAudioSentAt: Number.isFinite(message.timing?.audioChunkSentAt)
              ? new Date(message.timing?.audioChunkSentAt ?? 0).toISOString()
              : null,
            backendAudioReceivedAt: new Date(Date.now()).toISOString(),
          });
        }
        latestAudioTiming = {
          audioChunkCreatedAt: Number.isFinite(message.timing?.audioChunkCreatedAt) ? message.timing?.audioChunkCreatedAt : undefined,
          audioChunkSentAt: Number.isFinite(message.timing?.audioChunkSentAt) ? message.timing?.audioChunkSentAt : undefined,
          backendAudioReceivedAt: Date.now(),
        };
         provider.appendAudio(message.audio);
        return;
      }
      if (message.t === "commit") {
         lastActivityAt = Date.now();
         logSocketLifecycle("API_CLIENT_COMMIT_RECEIVED", {
           final: message.final === true,
           audioChunkCount,
           audioBytesCount,
           lastAudioAt: latestAudioTiming
             ? new Date(latestAudioTiming.backendAudioReceivedAt).toISOString()
             : null,
         });
         if (provider?.isOpen()) provider.commit(message.final === true, typeof message.commitId === "string" ? message.commitId.slice(0, 80) : undefined);
         else logger.warn({ provider: provider?.name ?? null }, "recitation realtime commit dropped because provider is not open");
        return;
      }
      if (message.t === "close") {
        clientRequestedClose = true;
        logSocketLifecycle("API_CLIENT_CLOSE_MESSAGE_RECEIVED", {
          audioChunkCount,
          audioBytesCount,
        });
        closeAll("client_sent_close_message");
        closeGatewaySocket("client_sent_close_message");
      }
    });

    ws.on("close", (code, reason) => {
      clearTimeout(authTimeout);
      logSocketLifecycle("API_SOCKET_CLOSED", {
        closeTimestamp: new Date().toISOString(),
        closeCode: code,
        closeReason: redactedCloseReason(reason),
        wasClean: websocketWasClean(ws),
        closeInitiator: clientRequestedClose
          ? "CLIENT"
          : localSocketCloseCause
            ? "TABYAN_API"
            : "UNKNOWN",
        localSocketCloseCause,
        clientRequestedClose,
        audioChunkCount,
        audioBytesCount,
        lastAudioAt: latestAudioTiming
          ? new Date(latestAudioTiming.backendAudioReceivedAt).toISOString()
          : null,
      });
      logger.info({
        authenticated: user !== null,
        receivedAudio,
        receivedPartial,
        receivedFinal,
        audioChunkCount,
        audioBytesCount,
        providerEventCount,
        providerDeltaEventCount,
        providerCompletedEventCount,
        providerErrorCount,
        droppedAudioChunkCount,
        decodeStats: provider?.stats?.() ?? null,
      }, "recitation realtime client closed");
      closeAll("client_socket_closed");
    });
    ws.on("error", (error) => {
      logSocketLifecycle("API_SOCKET_ERROR", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      closeAll("client_socket_error");
      closeGatewaySocket("client_socket_error", true);
    });
  });

  logger.info("recitation realtime gateway attached at /api/ws/recitation");
}