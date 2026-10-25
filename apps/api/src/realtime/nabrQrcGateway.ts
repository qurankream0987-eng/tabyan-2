import type { IncomingMessage, Server } from "node:http";
import { EventEmitter } from "node:events";
import { decode, encode } from "@msgpack/msgpack";
import { WebSocket, WebSocketServer } from "ws";
import {
  canonicalWordKeyToNabrIndices,
  type NabrQrcGatewayObservation,
  type NabrQrcGatewayStart,
} from "@workspace/tabyan-domain";
import { createContext } from "@workspace/tabyan-trpc";
import { logger } from "../lib/logger";
import { NabrQrcTransport, type NabrQrcTransportState } from "../recitation-providers/NabrQrcTransport";
import {
  parseNabrQrcConfig,
  readNabrQrcCredential,
} from "../recitation-providers/nabr-qrc-config";
import {
  nabrQrcStartInputForSession,
  type NabrQrcSessionContext,
} from "../recitation-providers/nabr-qrc-session";
import { normalizeNabrQrcGatewayResult } from "../recitation-providers/nabr-qrc-gateway-normalizer";
import { validateNabrQrcWavChunk } from "../recitation-providers/nabr-qrc-audio";
import type { NabrQrcStartInput } from "../recitation-providers/nabr-qrc-config";

type GatewayMode = "fake" | "live" | "disabled";
type GatewayUser = { readonly id: string; readonly role: string };

interface GatewayMetrics {
  tabyanSessionId: string | null;
  nabrSocketState: string;
  connectedAt: number;
  sessionStartedAt: number | null;
  firstAudioForwardedAt: number | null;
  firstResultAt: number | null;
  lastResultAt: number | null;
  lastKeepAliveAt: number | null;
  audioChunksForwarded: number;
  audioBytesForwarded: number;
  resultsReceived: number;
  closedAt: number | null;
  closeCode: number | null;
  closeReason: string | null;
}

export interface NabrQrcGatewayUpstreamEvents {
  readonly onState: (state: string) => void;
  readonly onReady: () => void;
  readonly onObservation: (observation: NabrQrcGatewayObservation) => void;
  readonly onKeepAlive: (observedAt: number) => void;
  readonly onError: (code: string) => void;
}

export interface NabrQrcGatewayUpstream {
  connect(): void;
  pushWavChunk(wav: Uint8Array): boolean;
  stop(): Promise<void>;
  close(reason: string): void;
  getDiagnostics?(): {
    readonly disconnectCode?: number | null;
    readonly disconnectReason?: string | null;
  };
}

export interface NabrQrcGatewayDependencies {
  readonly authenticate?: (token: string) => Promise<GatewayUser | null>;
  readonly mode?: GatewayMode | (() => GatewayMode);
  readonly createUpstream?: (
    mode: GatewayMode,
    start: NabrQrcGatewayStart,
    events: NabrQrcGatewayUpstreamEvents,
    traceId: string,
  ) => NabrQrcGatewayUpstream;
  readonly now?: () => number;
  readonly authTimeoutMs?: number;
}

const AUTH_TIMEOUT_MS = 10_000;
const MAX_CLIENT_JSON_BYTES = 8 * 1024;
const MAX_SESSION_ID_LENGTH = 100;
const ACTIVE_USER_CONNECTIONS = new Map<string, WebSocket>();
const SAFE_PROVIDER_ERROR = "تعذر الاتصال بخدمة التسميع";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function safeClientCloseReason(value: Buffer): string {
  return value.toString("utf8")
    .replace(/bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
    .slice(0, 123);
}

function send(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function serverMode(): GatewayMode {
  if (process.env.NODE_ENV === "development") return "fake";
  if (process.env.NABR_QRC_GATEWAY_LIVE_ENABLED === "true") return "live";
  return "disabled";
}

async function authenticateWithTabyan(token: string): Promise<GatewayUser | null> {
  if (!token || token.length > 8_192) return null;
  const context = await createContext({
    req: { headers: { authorization: `Bearer ${token}` } },
    res: null,
  } as unknown as Parameters<typeof createContext>[0]);
  if (!context.user) return null;
  return { id: context.user.id, role: context.user.role };
}

function parseStart(message: Record<string, unknown>): NabrQrcGatewayStart | null {
  const allowedTopLevelKeys = new Set(["t", "sessionId", "start"]);
  if (Object.keys(message).some((key) => !allowedTopLevelKeys.has(key))) return null;
  const sessionId = message.sessionId;
  const start = asRecord(message.start);
  if (typeof sessionId !== "string" || sessionId.length < 8
    || sessionId.length > MAX_SESSION_ID_LENGTH || !/^[A-Za-z0-9_-]+$/.test(sessionId)
    || !start || Object.keys(start).some((key) => !["surah", "ayah", "wordIndex"].includes(key))) {
    return null;
  }
  if (!isPositiveInteger(start.surah) || start.surah > 114
    || !isPositiveInteger(start.ayah) || start.ayah > 286
    || !isPositiveInteger(start.wordIndex) || start.wordIndex > 100) {
    return null;
  }
  return {
    sessionId,
    start: {
      surah: start.surah,
      ayah: start.ayah,
      wordIndex: start.wordIndex,
    },
  };
}

class FakeQrcTransportSocket extends EventEmitter {
  readyState: number = WebSocket.CONNECTING;
  binaryType: "nodebuffer" | "arraybuffer" | "fragments" = "arraybuffer";
  bufferedAmount = 0;
  private resultNumber = 0;

  constructor(private readonly start: NabrQrcGatewayStart) {
    super();
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.emit("open");
    queueMicrotask(() => this.receive({ event: "QRC_CLIENT_CONNECTED" }));
  }

  send(input: Uint8Array | string): void {
    if (typeof input === "string") throw new Error("fake QRC accepts MessagePack only");
    const request = decode(Buffer.from(input)) as Record<string, unknown>;
    if (request.method === "START_TILAWA_SESSION") {
      queueMicrotask(() => this.receive({ event: "TILAWA_SESSION_STARTED", exit_code: 6 }));
    } else if (request.method === "CHECK_TILAWA_AUDIO") {
      const audio = request.audio;
      if (!(audio instanceof Uint8Array) || !validateNabrQrcWavChunk(audio).isValid) {
        queueMicrotask(() => this.receive({ event: "QRC_ERROR", code: "INVALID_TEST_AUDIO" }));
        return;
      }
      this.resultNumber += 1;
      const position = canonicalWordKeyToNabrIndices(this.start.start);
      queueMicrotask(() => {
        this.receive({ event: "KEEP_ALIVE", timestamp: Date.now() / 1_000 });
        const result = {
          event: "TILAWA_RESULT",
          event_id: `fake-result-${this.start.sessionId}-${this.resultNumber}`,
          timestamp: 1_800_000_001,
          chapter_index: position.chapter_index,
          verse_index: position.verse_index,
          word_index: position.word_index,
          correct_words: [{
            chapter: position.chapter_index,
            verse: position.verse_index,
            word: position.word_index,
          }],
          skipped_words: [{
            chapter: position.chapter_index,
            verse: position.verse_index,
            word: position.word_index + 1,
          }],
          letter_mistakes: [{
            chapter: position.chapter_index,
            verse: position.verse_index,
            word: position.word_index,
            letter: 0,
            errorCode: "LETTER_HINT",
            message: "synthetic letter hint",
            speachLike: "synthetic heard value",
          }],
          tajweed_mistakes: [{
            chapter: position.chapter_index,
            verse: position.verse_index,
            word: position.word_index,
            errorCode: "TAJWEED_HINT",
            ruleName: "synthetic rule",
            message: "synthetic tajweed hint",
          }],
        };
        // Exercise the provider's duplicate-event guard with the same QRC event ID.
        this.receive(result);
        this.receive(result);
      });
    } else if (request.method === "RESET_TILAWA_SESSION") {
      queueMicrotask(() => this.receive({ event: "TILAWA_SESSION_ENDED", asr_call_count: 1 }));
    }
  }

  close(code = 1000): void {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSING;
    queueMicrotask(() => {
      this.readyState = WebSocket.CLOSED;
      this.emit("close", code, Buffer.alloc(0));
    });
  }

  private receive(message: unknown): void {
    this.emit("message", Buffer.from(encode(message)), true);
  }

  asWebSocket(): WebSocket {
    return this as unknown as WebSocket;
  }
}

function createFakeUpstream(
  start: NabrQrcGatewayStart,
  events: NabrQrcGatewayUpstreamEvents,
  now: () => number,
): NabrQrcGatewayUpstream {
  const socket = new FakeQrcTransportSocket(start);
  const startInput: NabrQrcStartInput = {
    chapterIndex: start.start.surah,
    verseIndex: start.start.ayah,
    wordIndex: start.start.wordIndex,
    hafzLevel: 1,
    tajweedLevel: 1,
  };
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-local-transport" },
    startInput,
    {
      onState: (state) => events.onState(state),
      onReady: events.onReady,
      onError: (code) => events.onError(code),
      onObservation: (capture) => {
        const message = asRecord(capture.rawProviderObservation);
        if (!message || typeof message.event !== "string") return;
        if (message.event === "KEEP_ALIVE") {
          events.onKeepAlive(capture.observedAt);
          return;
        }
        if (message.event !== "TILAWA_RESULT") return;
        const observation = normalizeNabrQrcGatewayResult(message, capture.observedAt);
        if (observation) events.onObservation(observation);
      },
    },
    {
      now,
      socketFactory: () => socket.asWebSocket(),
    },
  );
  return {
    connect() {
      transport.connect();
      socket.open();
    },
    pushWavChunk: (wav) => transport.appendWavChunk(wav),
    stop: () => transport.stop(),
    close: (reason) => transport.close(reason),
    getDiagnostics: () => transport.getDiagnostics(),
  };
}

function createLiveUpstream(
  start: NabrQrcGatewayStart,
  events: NabrQrcGatewayUpstreamEvents,
  traceId: string,
): NabrQrcGatewayUpstream {
  if (process.env.NABR_QRC_GATEWAY_LIVE_ENABLED !== "true") {
    throw new Error("GATEWAY_LIVE_DISABLED");
  }
  const config = parseNabrQrcConfig(process.env);
  if (!config.enabled || config.dryRun) throw new Error("GATEWAY_LIVE_DISABLED");
  const session: NabrQrcSessionContext = {
    mode: "general",
    startVerseKey: `${start.start.surah}:${start.start.ayah}`,
    startWordPosition: start.start.wordIndex,
    expectedRange: null,
  };
  const startInput = nabrQrcStartInputForSession(session, config);
  if (!startInput) throw new Error("GATEWAY_CONFIG_INVALID");
  const credential = readNabrQrcCredential(process.env, config);
  if (!credential.apiKey?.trim()) throw new Error("GATEWAY_CONFIG_INVALID");

  const transport = new NabrQrcTransport(config, credential, startInput, {
    onState: (state: NabrQrcTransportState) => events.onState(state),
    onReady: events.onReady,
    onError: (code) => events.onError(code),
    onObservation: (capture) => {
      const message = asRecord(capture.rawProviderObservation);
      if (!message || typeof message.event !== "string") return;
      if (message.event === "KEEP_ALIVE") {
        events.onKeepAlive(capture.observedAt);
      } else if (message.event === "TILAWA_RESULT") {
        const observation = normalizeNabrQrcGatewayResult(
          message,
          capture.observedAt,
        );
        if (observation) events.onObservation(observation);
      }
    },
  }, { diagnosticTraceId: traceId });

  return {
    connect: () => transport.connect(),
    pushWavChunk: (wav) => transport.appendWavChunk(wav),
    stop: () => transport.stop(),
    close: (reason) => transport.close(reason),
    getDiagnostics: () => transport.getDiagnostics(),
  };
}

function originMatchesRequest(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true; // Non-browser clients still authenticate with the Tabyan token.
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

/**
 * Ephemeral authenticated WebSocket gateway. It writes no DB rows and never
 * logs auth tokens, provider packets, audio, or the QRC URL/API key.
 */
export function attachNabrQrcGateway(
  server: Server,
  dependencies: NabrQrcGatewayDependencies = {},
): void {
  const now = dependencies.now ?? Date.now;
  const configuredMode = dependencies.mode;
  const getMode: () => GatewayMode = typeof configuredMode === "function"
    ? configuredMode
    : () => configuredMode ?? serverMode();
  const authenticate = dependencies.authenticate ?? authenticateWithTabyan;
  const createUpstream = dependencies.createUpstream
    ?? ((mode, start, events, traceId) => {
      if (mode === "fake") return createFakeUpstream(start, events, now);
      if (mode === "live") return createLiveUpstream(start, events, traceId);
      throw new Error("GATEWAY_DISABLED");
    });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    perMessageDeflate: false,
  });

  server.on("upgrade", (request, socket, head) => {
    const pathname = (request.url ?? "").split("?")[0];
    if (pathname !== "/api/ws/nabr-qrc-gateway") return;
    if (!originMatchesRequest(request)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    const traceId = crypto.randomUUID();
    const metrics: GatewayMetrics = {
      tabyanSessionId: null,
      nabrSocketState: "idle",
      connectedAt: now(),
      sessionStartedAt: null,
      firstAudioForwardedAt: null,
      firstResultAt: null,
      lastResultAt: null,
      lastKeepAliveAt: null,
      audioChunksForwarded: 0,
      audioBytesForwarded: 0,
      resultsReceived: 0,
      closedAt: null,
      closeCode: null,
      closeReason: null,
    };
    let user: GatewayUser | null = null;
    let authenticating = false;
    let authenticated = false;
    let closed = false;
    let startInProgress = false;
    let stopInFlight = false;
    let upstream: NabrQrcGatewayUpstream | null = null;
    let stopSent = false;
    let authTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      send(ws, { t: "error", code: "AUTH_TIMEOUT", message: "انتهت مهلة التحقق من الجلسة" });
      closeConnection("auth_timeout", 1008);
    }, dependencies.authTimeoutMs ?? AUTH_TIMEOUT_MS);
    const mode = getMode();

    const reportProviderError = () => {
      send(ws, { t: "error", code: "PROVIDER_UNAVAILABLE", message: SAFE_PROVIDER_ERROR });
      closeConnection("provider_error", 1011);
    };
    const sendStoppedOnce = () => {
      if (stopSent || closed) return;
      stopSent = true;
      send(ws, { t: "stopped" });
    };
    const syncUpstreamClose = () => {
      const diagnostics = upstream?.getDiagnostics?.();
      if (metrics.closeCode === null && typeof diagnostics?.disconnectCode === "number") {
        metrics.closeCode = diagnostics.disconnectCode;
      }
      if (!metrics.closeReason && diagnostics?.disconnectReason) {
        metrics.closeReason = diagnostics.disconnectReason.slice(0, 123);
      }
    };
    const stopUpstream = async () => {
      const current = upstream;
      if (!current) {
        sendStoppedOnce();
        return;
      }
      try {
        stopInFlight = true;
        await current.stop();
      } catch {
        reportProviderError();
        return;
      } finally {
        stopInFlight = false;
        syncUpstreamClose();
        if (upstream === current) upstream = null;
      }
      metrics.nabrSocketState = "closed";
      sendStoppedOnce();
    };
    const closeConnection = (reason: string, code = 1000, clientReason = "") => {
      if (closed) return;
      closed = true;
      if (authTimer) clearTimeout(authTimer);
      authTimer = null;
      upstream?.close(reason);
      syncUpstreamClose();
      upstream = null;
      metrics.closedAt = now();
      metrics.closeCode ??= code;
      metrics.closeReason ??= clientReason.slice(0, 123);
      if (user && ACTIVE_USER_CONNECTIONS.get(user.id) === ws) {
        ACTIVE_USER_CONNECTIONS.delete(user.id);
      }
      logger.info({
        ...metrics,
        traceId,
        closeCause: reason,
        mode,
      }, "Nabr/QRC gateway connection closed");
      if (ws.readyState === WebSocket.OPEN) ws.close(code, reason.slice(0, 100));
    };
    const upstreamEvents: NabrQrcGatewayUpstreamEvents = {
      onState: (state) => {
        metrics.nabrSocketState = state;
        if (state === "closed") {
          sendStoppedOnce();
          if (!stopInFlight) {
            syncUpstreamClose();
            upstream = null;
          }
        }
      },
      onReady: () => {
        if (closed) return;
        metrics.sessionStartedAt = now();
        metrics.nabrSocketState = "active";
        stopSent = false;
        send(ws, { t: "ready", mode: mode === "live" ? "live" : "fake" });
      },
      onObservation: (observation) => {
        if (closed) return;
        metrics.resultsReceived += 1;
        metrics.firstResultAt ??= now();
        metrics.lastResultAt = now();
        send(ws, { t: "observation", observation });
      },
      onKeepAlive: (observedAt) => {
        if (closed) return;
        metrics.lastKeepAliveAt = observedAt;
        send(ws, { t: "keep_alive", observedAt });
      },
      onError: () => reportProviderError(),
    };

    ws.on("message", (raw, isBinary) => {
      if (closed) return;
      if (isBinary) {
        if (!authenticated || !upstream) {
          send(ws, { t: "error", code: "SESSION_NOT_READY", message: "ابدأ جلسة التسميع أولاً" });
          return;
        }
        const bytes = raw instanceof Buffer ? new Uint8Array(raw) : new Uint8Array(raw as ArrayBuffer);
        const validation = validateNabrQrcWavChunk(bytes);
        if (!validation.isValid) {
          send(ws, { t: "error", code: "BAD_AUDIO_CHUNK", message: "تعذر معالجة مقطع الصوت" });
          closeConnection("invalid_audio_chunk", 1008);
          return;
        }
        if (!upstream.pushWavChunk(bytes)) {
          reportProviderError();
          return;
        }
        metrics.audioChunksForwarded += 1;
        metrics.audioBytesForwarded += bytes.byteLength;
        metrics.firstAudioForwardedAt ??= now();
        return;
      }

      if (Buffer.byteLength(raw as Buffer) > MAX_CLIENT_JSON_BYTES) {
        send(ws, { t: "error", code: "BAD_MESSAGE", message: "رسالة اتصال غير صالحة" });
        closeConnection("oversized_message", 1008);
        return;
      }
      let message: Record<string, unknown> | null;
      try {
        message = asRecord(JSON.parse(raw.toString()));
      } catch {
        message = null;
      }
      if (!message || typeof message.t !== "string") {
        send(ws, { t: "error", code: "BAD_MESSAGE", message: "رسالة اتصال غير صالحة" });
        return;
      }

      if (message.t === "auth") {
        if (authenticating || authenticated || Object.keys(message).some((key) => !["t", "token"].includes(key))) {
          send(ws, { t: "error", code: "AUTH_ALREADY_STARTED", message: "تعذر التحقق من جلسة الحساب" });
          closeConnection("invalid_auth_sequence", 1008);
          return;
        }
        authenticating = true;
        const token = message.token;
        if (typeof token !== "string" || token.length === 0 || token.length > 8_192) {
          send(ws, { t: "error", code: "UNAUTHORIZED", message: "رمز الجلسة غير صالح" });
          closeConnection("invalid_token", 1008);
          return;
        }
        void authenticate(token).then((authenticatedUser) => {
          if (closed || ws.readyState !== WebSocket.OPEN) return;
          if (!authenticatedUser || authenticatedUser.role !== "student") {
            send(ws, {
              t: "error",
              code: authenticatedUser ? "ROLE_FORBIDDEN" : "UNAUTHORIZED",
              message: authenticatedUser ? "خدمة التسميع متاحة لحساب الطالب فقط" : "رمز الجلسة غير صالح",
            });
            closeConnection("authentication_rejected", 1008);
            return;
          }
          const existing = ACTIVE_USER_CONNECTIONS.get(authenticatedUser.id);
          if (existing && existing !== ws) {
            send(ws, { t: "error", code: "SESSION_ALREADY_ACTIVE", message: "يوجد اتصال تسميع نشط لهذا الحساب" });
            closeConnection("account_already_active", 1008);
            return;
          }
          user = authenticatedUser;
          authenticated = true;
          if (authTimer) clearTimeout(authTimer);
          authTimer = null;
          ACTIVE_USER_CONNECTIONS.set(authenticatedUser.id, ws);
          send(ws, { t: "authenticated" });
        }).catch(() => {
          send(ws, { t: "error", code: "UNAUTHORIZED", message: "تعذر التحقق من جلسة الحساب" });
          closeConnection("authentication_failed", 1008);
        });
        return;
      }

      if (!authenticated) {
        send(ws, { t: "error", code: "UNAUTHORIZED", message: "تحقق من جلسة الحساب أولاً" });
        closeConnection("message_before_auth", 1008);
        return;
      }

      if (message.t === "start") {
        if (upstream || startInProgress) {
          send(ws, { t: "error", code: "SESSION_ALREADY_ACTIVE", message: "جلسة التسميع نشطة بالفعل" });
          return;
        }
        const start = parseStart(message);
        if (!start) {
          send(ws, { t: "error", code: "BAD_START", message: "بيانات بدء جلسة التسميع غير صالحة" });
          return;
        }
        if (mode === "disabled") {
          send(ws, { t: "error", code: "PROVIDER_UNAVAILABLE", message: SAFE_PROVIDER_ERROR });
          return;
        }
        startInProgress = true;
        metrics.tabyanSessionId = start.sessionId;
        metrics.nabrSocketState = "starting";
        stopSent = false;
        try {
          upstream = createUpstream(mode, start, upstreamEvents, traceId);
          upstream.connect();
        } catch {
          upstream = null;
          startInProgress = false;
          metrics.nabrSocketState = "failed";
          reportProviderError();
          return;
        }
        startInProgress = false;
        return;
      }

      if (message.t === "reset") {
        void stopUpstream();
        return;
      }

      if (message.t === "close") {
        closeConnection("client_requested_close");
        return;
      }

      send(ws, { t: "error", code: "UNKNOWN_MESSAGE", message: "رسالة اتصال غير صالحة" });
    });

    ws.on("close", (code, reason) => {
      closeConnection("client_socket_closed", code, safeClientCloseReason(reason));
    });
    ws.on("error", () => closeConnection("client_socket_error", 1011));
  });
}
