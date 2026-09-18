import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { and, eq } from "drizzle-orm";
import { db, recitationSessions } from "@workspace/db";
import { createContext } from "@workspace/tabyan-trpc";
import { logger } from "./lib/logger";
import { NvidiaStreamingProvider, NVIDIA_ARABIC_SAMPLE_RATE_HZ } from "./recitation-providers/NvidiaStreamingProvider";
import { OpenAiRealtimeProvider } from "./recitation-providers/OpenAiRealtimeProvider";
import { SpeechmaticsStreamingProvider } from "./recitation-providers/SpeechmaticsStreamingProvider";
import type { CanonicalTranscriptEvent, SpeechRecognitionProvider } from "./recitation-providers/types";

type ClientMessage =
  | { t: "auth"; token: string; sessionId: string }
  | { t: "audio"; audio: string; timing?: { audioChunkCreatedAt: number; audioChunkSentAt: number } }
  | { t: "commit" }
  | { t: "close" };

type AuthenticatedUser = { id: string };

const MAX_BASE64_AUDIO_CHARS = 32 * 1024;
type ProviderName = SpeechRecognitionProvider["name"];

function selectedProvider(): ProviderName | null {
  const value = process.env.TABYAN_AI_ASR_PROVIDER;
  return value === "openai" || value === "nvidia" || value === "speechmatics" ? value : null;
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

function isSafeBase64Audio(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_BASE64_AUDIO_CHARS
    && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function attachRecitationRealtime(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (pathname !== "/api/ws/recitation") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws) => {
    let user: AuthenticatedUser | null = null;
    let provider: SpeechRecognitionProvider | null = null;
    let closed = false;
    let receivedAudio = false;
    let receivedAudioAccepted = false;
    let receivedPartial = false;
    let receivedFinal = false;
    let audioChunkCount = 0;
    let audioBytesCount = 0;
    let providerEventCount = 0;
    let providerDeltaEventCount = 0;
    let providerCompletedEventCount = 0;
    let providerErrorCount = 0;
    let droppedAudioChunkCount = 0;
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
    });

    const sendDiagnostics = () => {
      if (process.env.NODE_ENV === "production") return;
      send(ws, {
        t: "diagnostics",
        audioChunkCount,
        audioBytesCount,
        providerStats: providerStats(),
      });
    };

    logger.info("recitation realtime client connected");

    const closeAll = () => {
      if (closed) return;
      closed = true;
      if (diagnosticHeartbeat) clearInterval(diagnosticHeartbeat);
      provider?.close();
      provider = null;
    };

    const authTimeout = setTimeout(() => {
      if (!user) {
        clientError(ws, "AUTH_TIMEOUT", "انتهت مهلة التحقق من جلسة التسميع");
        ws.close();
      }
    }, 10_000);

    const emitTranscript = (event: CanonicalTranscriptEvent, itemId: string) => {
      if (event.isFinal) {
        providerCompletedEventCount += 1;
        receivedFinal = true;
      } else {
        providerDeltaEventCount += 1;
        receivedPartial = true;
      }
      send(ws, {
        t: "transcript",
        text: event.text,
        isFinal: event.isFinal,
        receivedAt: Date.now(),
        itemId,
        textIsDelta: event.textIsDelta ?? false,
        timing: latestAudioTiming ? { ...latestAudioTiming, providerDeltaReceivedAt: Date.now() } : undefined,
        providerStats: providerStats(),
      });
    };

    const providerEvents = (name: ProviderName) => ({
      onReady: () => {
        logger.info({ provider: name }, "recitation realtime provider ready");
        send(ws, {
          t: "ready",
          providerConnectionMs: 0,
          provider: name,
          audioSampleRateHz: name === "nvidia" ? NVIDIA_ARABIC_SAMPLE_RATE_HZ : 24_000,
        });
      },
      onTranscript: (event: CanonicalTranscriptEvent) => {
        if (!receivedPartial && !event.isFinal) {
          receivedPartial = true;
          logger.info({ provider: name }, "recitation realtime first transcript delta received");
        }
        if (event.isFinal) receivedFinal = true;
        emitTranscript(event, event.itemId ?? `${name}-${crypto.randomUUID()}`);
      },
      onProviderEvent: () => { providerEventCount += 1; },
      onAudioAccepted: () => {
        if (!receivedAudioAccepted) {
          receivedAudioAccepted = true;
          logger.info({ provider: name }, "recitation realtime first audio accepted");
        }
      },
      onError: (message: string, code?: number) => {
        providerErrorCount += 1;
        logger.error({ provider: name, providerCode: code, providerMessage: message }, "recitation realtime stream error");
        clientError(ws, "PROVIDER_STREAM_ERROR", "تعذر استمرار اتصال خدمة التفريغ الحي");
      },
      onClose: (code?: number, reason?: string) => {
        logger.info({ provider: name, providerCode: code, providerReason: reason }, "recitation realtime provider closed");
        if (!closed) {
          clientError(ws, "PROVIDER_CLOSED", "انقطع اتصال خدمة التفريغ الحي");
          ws.close();
        }
      },
    });

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
        ws.close();
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
        ws.close();
        return;
      }
      logger.info("recitation realtime Speechmatics connection attempt");
      provider = new SpeechmaticsStreamingProvider(apiKey, providerEvents("speechmatics"));
      provider.connect();
    };

    ws.on("message", (raw) => {
      let message: ClientMessage;
      try { message = JSON.parse(String(raw)) as ClientMessage; } catch {
        clientError(ws, "BAD_MESSAGE", "رسالة اتصال غير صالحة");
        return;
      }

      if (message.t === "auth") {
        void (async () => {
          try {
            const ctx = await createContext({
              req: { headers: { authorization: `Bearer ${String(message.token ?? "")}` } },
              res: null,
            } as unknown as Parameters<typeof createContext>[0]);
            if (!ctx.user) {
              clientError(ws, "UNAUTHORIZED", "رمز الجلسة غير صالح");
              ws.close();
              return;
            }
            if (ctx.user.role !== "student") {
              clientError(ws, "ROLE_FORBIDDEN", "التفريغ الحي متاح لجلسة الطالب فقط");
              ws.close();
              return;
            }
            const [session] = await db
              .select({ id: recitationSessions.id })
              .from(recitationSessions)
              .where(and(
                eq(recitationSessions.id, String(message.sessionId ?? "")),
                eq(recitationSessions.userId, ctx.user.id),
                eq(recitationSessions.status, "listening"),
              ))
              .limit(1);
            if (!session) {
              clientError(ws, "SESSION_FORBIDDEN", "جلسة التسميع غير متاحة للتفريغ الحي");
              ws.close();
              return;
            }
            user = { id: ctx.user.id };
            clearTimeout(authTimeout);
            logger.info("recitation realtime client authenticated");
            send(ws, { t: "authenticated" });
            if (process.env.NODE_ENV !== "production") {
              diagnosticHeartbeat = setInterval(sendDiagnostics, 1000);
            }
             if (!liveTranscriptionEnabled()) {
               clientError(ws, "FEATURE_DISABLED", "التفريغ الحي غير مفعّل");
               ws.close();
               return;
             }
             const selected = selectedProvider();
             if (!selected) {
               clientError(ws, "PROVIDER_NOT_CONFIGURED", "مزود التفريغ الحي غير محدد أو غير مدعوم");
               ws.close();
               return;
             }
             if (selected === "nvidia") connectNvidia();
             else if (selected === "speechmatics") connectSpeechmatics();
             else connectOpenAi();
          } catch {
            clientError(ws, "AUTH_FAILED", "تعذر التحقق من جلسة التسميع");
            ws.close();
          }
        })();
        return;
      }

       if (!user) return;

      if (message.t === "audio") {
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
        audioBytesCount += Math.floor(message.audio.length * 3 / 4);
        if (!receivedAudio) {
          receivedAudio = true;
          logger.info("recitation realtime first audio chunk received");
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
         if (provider?.isOpen()) provider.commit();
         else logger.warn({ provider: provider?.name ?? null }, "recitation realtime commit dropped because provider is not open");
        return;
      }
      if (message.t === "close") ws.close();
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
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
      }, "recitation realtime client closed");
      closeAll();
    });
    ws.on("error", () => closeAll());
  });

  logger.info("recitation realtime gateway attached at /api/ws/recitation");
}