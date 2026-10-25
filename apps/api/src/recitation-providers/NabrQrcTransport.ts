import { decode, encode } from "@msgpack/msgpack";
import type {
  ConfirmedTabyanRecitationEvent,
  NormalizedRecitationEvent,
  ProviderObservation,
} from "@workspace/tabyan-domain";
import { normalizeProviderObservation } from "@workspace/tabyan-domain";
import { WebSocket } from "ws";
import { logger } from "../lib/logger";
import { NabrProviderAdapter } from "./NabrProviderAdapter";
import { NabrQrcAcceptanceTrace } from "./nabr-qrc-acceptance-trace";
import { NabrQrcWavChunker, validateNabrQrcWavChunk } from "./nabr-qrc-audio";
import { runNabrQrcDryRun, type NabrQrcDryRunReport } from "./nabr-qrc-dry-run";
import {
  createNabrQrcStartPayload,
  createNabrQrcWebSocketUrl,
  type NabrQrcConfig,
  type NabrQrcCredential,
  type NabrQrcStartInput,
} from "./nabr-qrc-config";

export type NabrQrcTransportState =
  | "idle"
  | "disabled"
  | "dry_run"
  | "connecting"
  | "awaiting_server_connected"
  | "starting"
  | "active"
  | "stopping"
  | "closed"
  | "failed";

export interface NabrQrcDiagnostics {
  connectionMs: number | null;
  qrcConnectedMs: number | null;
  readyMs: number | null;
  firstResultMs: number | null;
  /** QRC does not document transcript partial/final events. */
  firstPartialLatencyMs: null;
  firstFinalLatencyMs: null;
  positionHintCount: number;
  wordPositionHintCount: number;
  ayahPositionHintCount: number;
  reportedCorrectWordCount: number;
  reportedSkippedWordHintCount: number;
  omissionObservationCount: number;
  /** QRC does not document a repetition claim. */
  repetitionObservationCount: null;
  tajweedMistakeHintCount: number;
  pronunciationMistakeHintCount: number;
  /** QRC has no confidence field and does not classify skips/repetitions. */
  providerConfidence: null;
  confirmedOmissionCount: null;
  confirmedRepetitionCount: null;
  providerErrorCount: number;
  disconnectBehavior: "not_connected" | "connected" | "clean" | "closed_by_tabyan" | "error";
  failureCode: string | null;
  disconnectCode: number | null;
  disconnectReason: string | null;
  totalDurationMs: number | null;
}

export interface NabrQrcTransportEvents {
  onState?: (state: NabrQrcTransportState) => void;
  onReady?: () => void;
  onObservation?: (record: {
    observedAt: number;
    rawProviderObservation: unknown;
    providerObservations: ProviderObservation[];
    normalizedEvents: NormalizedRecitationEvent[];
  }) => void;
  onError?: (code: string, message: string) => void;
  onDryRun?: (report: NabrQrcDryRunReport) => void;
}

export interface NabrQrcTransportDependencies {
  socketFactory?: (url: string) => WebSocket;
  now?: () => number;
  diagnosticTraceId?: string;
  connectionTimeoutMs?: number;
  heartbeatTimeoutMs?: number;
  stopTimeoutMs?: number;
  /** Tabyan acceptance cap, not a QRC-documented maximum session duration. */
  maxAcceptanceSessionMs?: number;
  trace?: NabrQrcAcceptanceTrace;
}

export const NABR_QRC_LOCAL_CONNECTION_TIMEOUT_MS = 10_000;
export const NABR_QRC_LOCAL_HEARTBEAT_TIMEOUT_MS = 45_000;
export const NABR_QRC_LOCAL_STOP_TIMEOUT_MS = 10_000;
export const NABR_QRC_LOCAL_ACCEPTANCE_SESSION_CAP_MS = 180_000;
const MAX_PROVIDER_MESSAGE_BYTES = 64 * 1024;
const MAX_AUDIO_BASE64_CHARS = 32 * 1024;

let activeSessionOwner: NabrQrcTransport | null = null;

function bytesFromRawMessage(raw: unknown): Uint8Array {
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (Array.isArray(raw) && raw.every((part) => part instanceof Uint8Array)) {
    return Buffer.concat(raw as Uint8Array[]);
  }
  throw new Error("PROVIDER_PROTOCOL_ERROR");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

/**
 * Server-only QRC transport used by the authenticated gateway. QRC emits
 * structured observations, not transcripts; its adapter must not turn provider
 * positions or assessments into learner state.
 */
export class NabrQrcTransport {
  private stateValue: NabrQrcTransportState = "idle";
  private socket: WebSocket | null = null;
  private readonly adapter = new NabrProviderAdapter();
  private readonly wavChunker = new NabrQrcWavChunker();
  private readonly now: () => number;
  private readonly connectionTimeoutMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly stopTimeoutMs: number;
  private readonly maxAcceptanceSessionMs: number;
  private readonly socketFactory: (url: string) => WebSocket;
  private readonly diagnosticTraceId?: string;
  private readonly diagnosticEnabled = process.env.NODE_ENV === "development";
  private readonly trace: NabrQrcAcceptanceTrace;
  private ownsSessionLease = false;
  private intentionalClose = false;
  private connectedAt: number | null = null;
  private socketOpenedAt: number | null = null;
  private qrcConnectedAt: number | null = null;
  private readyAt: number | null = null;
  private closedAt: number | null = null;
  private firstResultAt: number | null = null;
  private providerErrorCount = 0;
  private positionHintCount = 0;
  private wordPositionHintCount = 0;
  private ayahPositionHintCount = 0;
  private reportedCorrectWordCount = 0;
  private reportedSkippedWordHintCount = 0;
  private tajweedMistakeHintCount = 0;
  private pronunciationMistakeHintCount = 0;
  private disconnectCode: number | null = null;
  private disconnectReason: string | null = null;
  private disconnectBehavior: NabrQrcDiagnostics["disconnectBehavior"] = "not_connected";
  private failureCode: string | null = null;
  private closeCause: string | null = null;
  private outgoingAudioFrameCount = 0;
  private outgoingAudioByteCount = 0;
  private lastOutgoingAudioAt: number | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private stopResolver: (() => void) | null = null;

  constructor(
    private readonly config: NabrQrcConfig,
    private readonly credential: NabrQrcCredential,
    private readonly startInput: NabrQrcStartInput | undefined,
    private readonly events: NabrQrcTransportEvents = {},
    dependencies: NabrQrcTransportDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.connectionTimeoutMs = dependencies.connectionTimeoutMs ?? NABR_QRC_LOCAL_CONNECTION_TIMEOUT_MS;
    this.heartbeatTimeoutMs = dependencies.heartbeatTimeoutMs ?? NABR_QRC_LOCAL_HEARTBEAT_TIMEOUT_MS;
    this.stopTimeoutMs = dependencies.stopTimeoutMs ?? NABR_QRC_LOCAL_STOP_TIMEOUT_MS;
    this.maxAcceptanceSessionMs = dependencies.maxAcceptanceSessionMs
      ?? NABR_QRC_LOCAL_ACCEPTANCE_SESSION_CAP_MS;
    this.socketFactory = dependencies.socketFactory
      ?? ((url) => new WebSocket(url, { perMessageDeflate: false }));
    this.diagnosticTraceId = dependencies.diagnosticTraceId;
    this.trace = dependencies.trace ?? new NabrQrcAcceptanceTrace();
  }

  get state(): NabrQrcTransportState {
    return this.stateValue;
  }

  connect(): void {
    if (this.stateValue !== "idle") {
      this.notifyError("SESSION_ALREADY_ACTIVE", "QRC transport has already been started");
      return;
    }

    if (this.config.dryRun) {
      if (!this.startInput) {
        this.failWithoutSocket("PROVIDER_NOT_CONFIGURED", "Server-owned QRC start settings are missing");
        return;
      }
      try {
        this.setState("dry_run");
        this.events.onDryRun?.(runNabrQrcDryRun(this.startInput));
      } catch (error) {
        this.failWithoutSocket(
          "PROVIDER_NOT_CONFIGURED",
          error instanceof Error ? error.message : "QRC dry run configuration is invalid",
        );
      }
      return;
    }

    if (!this.config.enabled) {
      this.setState("disabled");
      this.notifyError("FEATURE_DISABLED", "Nabr/QRC transport is disabled");
      return;
    }

    if (!this.credential.apiKey?.trim() || !this.startInput) {
      this.failWithoutSocket("PROVIDER_NOT_CONFIGURED", "QRC API key or server-owned start settings are missing");
      return;
    }

    let startPayload: ReturnType<typeof createNabrQrcStartPayload>;
    let url: string;
    try {
      // Fail closed before socket creation when Tabyan has no approved server-side
      // mapping for the QRC location and recitation levels.
      startPayload = createNabrQrcStartPayload(this.startInput);
      url = createNabrQrcWebSocketUrl(this.credential.apiKey);
    } catch (error) {
      this.failWithoutSocket(
        "PROVIDER_NOT_CONFIGURED",
        error instanceof Error ? error.message : "QRC configuration is invalid",
      );
      return;
    }

    if (activeSessionOwner && activeSessionOwner !== this) {
      this.failWithoutSocket("SESSION_ALREADY_ACTIVE", "A QRC acceptance session is already active in this process");
      return;
    }
    activeSessionOwner = this;
    this.ownsSessionLease = true;
    this.connectedAt = this.now();
    this.disconnectBehavior = "connected";
    this.setState("connecting");
    this.traceLifecycle("QRC_CONNECT_ATTEMPT");
    this.armConnectionTimeout("QRC WebSocket connection timed out");

    try {
      // Do not log this URL: the official protocol carries the API key in its query.
      this.socket = this.socketFactory(url);
    } catch {
      this.fail("PROVIDER_CONNECTION_FAILED", "QRC WebSocket could not be created");
      return;
    }

    const socket = this.socket;
    this.traceLifecycle("QRC_SOCKET_CREATED");
    socket.binaryType = "arraybuffer";
    socket.on("open", () => {
      if (this.stateValue !== "connecting") return;
      this.socketOpenedAt = this.now();
      this.traceLifecycle("QRC_SOCKET_OPEN");
      this.setState("awaiting_server_connected");
    });
    socket.on("message", (raw, isBinary) => {
      if (!isBinary) {
        this.traceLifecycle("QRC_NONBINARY_MESSAGE", { payloadBytes: Buffer.byteLength(String(raw)) });
        this.fail("PROVIDER_PROTOCOL_ERROR", "QRC response was not binary MessagePack");
        return;
      }
      this.handleMessage(raw, startPayload);
    });
    socket.on("error", (error) => {
      this.traceLifecycle("QRC_SOCKET_ERROR", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      this.fail("PROVIDER_CONNECTION_FAILED", "QRC WebSocket transport error");
    });
    socket.on("ping", (data) => {
      this.traceLifecycle("QRC_WEBSOCKET_PING_RECEIVED", { payloadBytes: data.byteLength });
    });
    socket.on("pong", (data) => {
      this.traceLifecycle("QRC_WEBSOCKET_PONG_RECEIVED", { payloadBytes: data.byteLength });
    });
    socket.on("close", (code, reason) => {
      const closeState = socket as WebSocket & {
        _closeFrameReceived?: boolean;
        _closeFrameSent?: boolean;
      };
      const wasClean = typeof closeState._closeFrameReceived === "boolean"
        && typeof closeState._closeFrameSent === "boolean"
        ? closeState._closeFrameReceived && closeState._closeFrameSent
        : null;
      this.traceLifecycle("QRC_SOCKET_CLOSE", {
        code,
        reason: redactedCloseReason(reason),
        wasClean,
        closeInitiator: this.intentionalClose ? "TABYAN_API" : "UNKNOWN",
        closeCause: this.closeCause,
      });
      this.disconnectCode = code;
      this.disconnectReason = redactedCloseReason(reason);
      if (!this.intentionalClose && this.stateValue !== "closed" && this.stateValue !== "failed") {
        this.fail("PROVIDER_CLOSED", "QRC WebSocket closed before the session completed");
      } else {
        this.releaseSessionLease();
      }
    });
  }

  /** Input is the existing gateway's mono 24 kHz PCM16LE chunk. */
  appendAudio(base64Pcm: string): boolean {
    if (this.stateValue !== "active" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    if (base64Pcm.length === 0 || base64Pcm.length > MAX_AUDIO_BASE64_CHARS
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Pcm)) {
      this.fail("BAD_AUDIO_CHUNK", "QRC audio input was invalid");
      return false;
    }

    let pcm: Buffer;
    try {
      pcm = Buffer.from(base64Pcm, "base64");
      if (pcm.byteLength % 2 !== 0) throw new Error("odd PCM byte length");
      const frames = this.wavChunker.push(pcm);
      for (const wav of frames) {
        this.sendAudioFrame(wav);
      }
      return true;
    } catch {
      this.fail("BAD_AUDIO_CHUNK", "QRC audio conversion failed");
      return false;
    }
  }

  /** Forward one already-framed 16 kHz mono PCM16 WAV received by the Web gateway. */
  appendWavChunk(wav: Uint8Array): boolean {
    if (this.stateValue !== "active" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const validation = validateNabrQrcWavChunk(wav);
    if (!validation.isValid) {
      this.fail("BAD_AUDIO_CHUNK", "QRC WAV chunk failed server validation");
      return false;
    }
    try {
      this.sendAudioFrame(wav);
      return true;
    } catch {
      this.fail("PROVIDER_STREAM_ERROR", "QRC audio frame could not be forwarded");
      return false;
    }
  }

  /**
   * QRC has no commit method: RESET flushes its audio queue and ends the
   * session. The method sends at most one reset and never reconnects/retries.
   */
  stop(): Promise<void> {
    if (this.stateValue !== "active" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.close();
      return Promise.resolve();
    }

    this.setState("stopping");
    this.traceLifecycle("QRC_STOP_REQUESTED", {
      audioFrameCount: this.outgoingAudioFrameCount,
      audioByteCount: this.outgoingAudioByteCount,
      lastAudioAt: this.lastOutgoingAudioAt === null
        ? null
        : new Date(this.lastOutgoingAudioAt).toISOString(),
    });
    return new Promise((resolve) => {
      this.stopResolver = resolve;
      this.stopTimer = setTimeout(() => {
        this.fail("PROVIDER_TIMEOUT", "QRC did not acknowledge session reset in time");
      }, this.stopTimeoutMs);

      try {
        for (const wav of this.wavChunker.finish()) {
          this.sendAudioFrame(wav);
        }
        this.sendPacked({ method: "RESET_TILAWA_SESSION" });
      } catch {
        this.fail("PROVIDER_STREAM_ERROR", "QRC session reset could not be sent");
      }
    });
  }

  /** Immediate local cleanup, used for cancellation and all failure paths. */
  close(reason = "api_cleanup"): void {
    this.intentionalClose = true;
    this.closeCause = reason;
    this.clearTimers();
    this.resolveStop();
    const wasActive = this.stateValue === "active" || this.stateValue === "stopping";
    if (this.stateValue === "active" && this.socket?.readyState === WebSocket.OPEN) {
      try { this.sendPacked({ method: "RESET_TILAWA_SESSION" }); } catch { /* Best-effort server release. */ }
    }
    this.traceLifecycle("QRC_CLOSE_REQUESTED", {
      code: 1000,
      closeInitiator: "TABYAN_API",
      closeCause: reason,
      audioFrameCount: this.outgoingAudioFrameCount,
      audioByteCount: this.outgoingAudioByteCount,
      lastAudioAt: this.lastOutgoingAudioAt === null
        ? null
        : new Date(this.lastOutgoingAudioAt).toISOString(),
    });
    this.closedAt = this.now();
    this.disconnectBehavior = wasActive ? "closed_by_tabyan" : this.disconnectBehavior;
    this.setState("closed");
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      try { socket.close(1000); } catch { /* Already closed. */ }
    }
    this.releaseSessionLease();
  }

  getDiagnostics(): NabrQrcDiagnostics {
    const now = this.now();
    const durationOrigin = this.connectedAt;
    const durationEnd = this.closedAt
      ?? (this.stateValue === "active" || this.stateValue === "stopping" ? now : null);
    return {
      connectionMs: this.connectedAt !== null && this.socketOpenedAt !== null
        ? this.socketOpenedAt - this.connectedAt
        : null,
      qrcConnectedMs: this.connectedAt !== null && this.qrcConnectedAt !== null
        ? this.qrcConnectedAt - this.connectedAt
        : null,
      readyMs: this.connectedAt !== null && this.readyAt !== null
        ? this.readyAt - this.connectedAt
        : null,
      firstResultMs: this.connectedAt !== null && this.firstResultAt !== null
        ? this.firstResultAt - this.connectedAt
        : null,
      firstPartialLatencyMs: null,
      firstFinalLatencyMs: null,
      positionHintCount: this.positionHintCount,
      wordPositionHintCount: this.wordPositionHintCount,
      ayahPositionHintCount: this.ayahPositionHintCount,
      reportedCorrectWordCount: this.reportedCorrectWordCount,
      reportedSkippedWordHintCount: this.reportedSkippedWordHintCount,
      omissionObservationCount: this.reportedSkippedWordHintCount,
      repetitionObservationCount: null,
      tajweedMistakeHintCount: this.tajweedMistakeHintCount,
      pronunciationMistakeHintCount: this.pronunciationMistakeHintCount,
      providerConfidence: null,
      confirmedOmissionCount: null,
      confirmedRepetitionCount: null,
      providerErrorCount: this.providerErrorCount,
      disconnectBehavior: this.disconnectBehavior,
      failureCode: this.failureCode,
      disconnectCode: this.disconnectCode,
      disconnectReason: this.disconnectReason,
      totalDurationMs: durationOrigin !== null && durationEnd !== null
        ? Math.max(0, durationEnd - durationOrigin)
        : null,
    };
  }

  captureConfirmedTabyanEvent(event: ConfirmedTabyanRecitationEvent): void {
    this.trace.captureConfirmedTabyanEvent(event);
  }

  private handleMessage(raw: unknown, startPayload: ReturnType<typeof createNabrQrcStartPayload>): void {
    let message: unknown;
    try {
      const bytes = bytesFromRawMessage(raw);
      if (bytes.byteLength > MAX_PROVIDER_MESSAGE_BYTES) {
        throw new Error("oversize QRC response");
      }
      message = decode(bytes);
    } catch {
      this.fail("PROVIDER_PROTOCOL_ERROR", "QRC MessagePack response could not be decoded");
      return;
    }
    if (!isRecord(message) || typeof message.event !== "string") {
      this.fail("PROVIDER_PROTOCOL_ERROR", "QRC response did not contain an event name");
      return;
    }

    const observedAt = this.now();
    this.traceLifecycle("QRC_MESSAGE_RECEIVED", {
      eventType: message.event.slice(0, 80),
    });
    const providerObservations = this.adapter.observeServerMessage(message, observedAt);
    const normalizedEvents = providerObservations
      .map((observation) => {
        // The adapter's normalizer owns structural validation and preserves
        // QRC claims as observations, never as learner grades.
        return normalizeProviderObservation(observation);
      })
      .filter((event): event is NormalizedRecitationEvent => event !== null);
    const capture = {
      observedAt,
      rawProviderObservation: message,
      providerObservations,
      normalizedEvents,
    };
    this.trace.captureProviderEvent(capture);
    try { this.events.onObservation?.(capture); } catch { /* Observer callbacks cannot disrupt transport state. */ }
    this.countObservations(normalizedEvents);

    switch (message.event) {
      case "QRC_CLIENT_CONNECTED":
        if (this.stateValue !== "awaiting_server_connected") return;
        this.qrcConnectedAt = observedAt;
        this.clearConnectionTimer();
        try {
          this.sendPacked(startPayload);
        } catch {
          this.fail("PROVIDER_STREAM_ERROR", "QRC session start could not be sent");
          return;
        }
        this.setState("starting");
        this.armConnectionTimeout("QRC session start timed out");
        return;
      case "TILAWA_SESSION_STARTED":
        if (this.stateValue !== "starting") return;
        this.clearConnectionTimer();
        if (message.exit_code !== 6) {
          this.fail("PROVIDER_PROTOCOL_ERROR", "QRC session start returned an undocumented exit code");
          return;
        }
        this.readyAt = observedAt;
        this.setState("active");
        try { this.events.onReady?.(); } catch { /* Observer callbacks cannot disrupt transport state. */ }
        this.armSessionAndHeartbeatTimers();
        return;
      case "KEEP_ALIVE":
        if (this.stateValue === "active") this.armHeartbeatTimeout();
        return;
      case "TILAWA_RESULT":
        if (this.firstResultAt === null) this.firstResultAt = observedAt;
        if (message.exit_code === 8) this.finish("closed");
        return;
      case "TILAWA_SESSION_ENDED":
        this.finish("closed");
        return;
      case "QRC_ERROR":
        this.providerErrorCount += 1;
        this.fail("PROVIDER_STREAM_ERROR", "QRC reported a provider error");
        return;
      default:
        // Unknown QRC messages stay harmless observations.
        return;
    }
  }

  private countObservations(events: NormalizedRecitationEvent[]): void {
    for (const event of events) {
      if (
        (event.type === "position_hint" || event.type === "word" || event.type === "mistake")
        && event.positionHint
      ) {
        this.positionHintCount += 1;
        // Both dimensions are provider coordinates, not validated alignment.
        if (event.positionHint.wordIndex !== undefined) this.wordPositionHintCount += 1;
        if (event.positionHint.ayah !== undefined) this.ayahPositionHintCount += 1;
      }
      if (event.type === "word") {
        if (event.claim === "reported_correct") this.reportedCorrectWordCount += 1;
        if (event.claim === "reported_skipped") this.reportedSkippedWordHintCount += 1;
      }
      if (event.type === "mistake") {
        if (event.mistakeHint.type === "tajweed") this.tajweedMistakeHintCount += 1;
        if (event.mistakeHint.type === "pronunciation") this.pronunciationMistakeHintCount += 1;
      }
    }
  }

  private sendPacked(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("QRC socket is not open");
    }
    const record = isRecord(message) ? message : {};
    const method = typeof record.method === "string" ? record.method : "unknown";
    const audioBytes = record.audio instanceof Uint8Array ? record.audio.byteLength : 0;
    const bufferedAmountBefore = this.socket.bufferedAmount;
    if (bufferedAmountBefore > 512 * 1024) {
      this.traceLifecycle("QRC_SEND_BACKPRESSURE", {
        method,
        bufferedAmount: bufferedAmountBefore,
        queuedAudioFrames: this.outgoingAudioFrameCount,
      });
      throw new Error("QRC socket send queue exceeded the local safety limit");
    }
    this.socket.send(Buffer.from(encode(message)));
    if (audioBytes > 0) {
      this.outgoingAudioFrameCount += 1;
      this.outgoingAudioByteCount += audioBytes;
      this.lastOutgoingAudioAt = this.now();
      if (this.outgoingAudioFrameCount === 1) {
        this.traceLifecycle("QRC_FIRST_AUDIO_SENT", {
          method,
          audioBytes,
          bufferedAmountBefore,
          bufferedAmountAfter: this.socket.bufferedAmount,
        });
      }
    } else {
      this.traceLifecycle("QRC_CONTROL_MESSAGE_SENT", {
        method,
        bufferedAmountBefore,
        bufferedAmountAfter: this.socket.bufferedAmount,
      });
    }
  }

  private sendAudioFrame(wav: Uint8Array): void {
    this.sendPacked({
      method: "CHECK_TILAWA_AUDIO",
      audio: wav,
      client_sent_at_ms: this.now(),
    });
  }

  private armConnectionTimeout(message: string): void {
    this.clearConnectionTimer();
    this.connectionTimer = setTimeout(() => {
      this.traceLifecycle("QRC_CONNECTION_TIMER_FIRED", {
        timeoutMs: this.connectionTimeoutMs,
      });
      this.fail("PROVIDER_TIMEOUT", message);
    }, this.connectionTimeoutMs);
  }

  private armHeartbeatTimeout(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      this.traceLifecycle("QRC_HEARTBEAT_TIMER_FIRED", {
        timeoutMs: this.heartbeatTimeoutMs,
      });
      this.fail("PROVIDER_TIMEOUT", "QRC heartbeat timed out");
    }, this.heartbeatTimeoutMs);
  }

  private armSessionAndHeartbeatTimers(): void {
    this.sessionTimer = setTimeout(() => {
      this.traceLifecycle("QRC_SESSION_CAP_EXPIRED", {
        capMs: this.maxAcceptanceSessionMs,
      });
      void this.stop();
    }, this.maxAcceptanceSessionMs);
    this.armHeartbeatTimeout();
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) clearTimeout(this.connectionTimer);
    this.connectionTimer = null;
  }

  private clearTimers(): void {
    this.clearConnectionTimer();
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.heartbeatTimer = null;
    this.stopTimer = null;
    this.sessionTimer = null;
  }

  private failWithoutSocket(code: string, message: string): void {
    this.closedAt = this.now();
    this.disconnectBehavior = "error";
    this.failureCode = code;
    this.setState("failed");
    this.notifyError(code, message);
    this.releaseSessionLease();
  }

  private fail(code: string, message: string): void {
    if (this.stateValue === "failed" || this.stateValue === "closed") return;
    this.traceLifecycle("QRC_LOCAL_FAILURE", {
      failureCode: code,
      failureMessage: message,
    });
    this.closedAt = this.now();
    this.disconnectBehavior = "error";
    this.failureCode = code;
    this.setState("failed");
    this.notifyError(code, message);
    this.intentionalClose = true;
    this.closeCause = code;
    this.clearTimers();
    this.resolveStop();
    const socket = this.socket;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      this.traceLifecycle("QRC_CLOSE_REQUESTED", {
        code: 1011,
        closeInitiator: "TABYAN_API",
        closeCause: code,
      });
    }
    this.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      try { socket.close(1011); } catch { /* Already closed. */ }
    }
    this.releaseSessionLease();
  }

  private finish(state: "closed"): void {
    this.intentionalClose = true;
    this.closeCause = "qrc_session_ended";
    this.clearTimers();
    this.resolveStop();
    this.closedAt = this.now();
    this.disconnectBehavior = "clean";
    this.setState(state);
    const socket = this.socket;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      this.traceLifecycle("QRC_CLOSE_REQUESTED", {
        code: 1000,
        closeInitiator: "TABYAN_API",
        closeCause: this.closeCause,
      });
    }
    this.socket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      try { socket.close(1000); } catch { /* Already closed. */ }
    }
    this.releaseSessionLease();
  }

  private resolveStop(): void {
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    const resolve = this.stopResolver;
    this.stopResolver = null;
    resolve?.();
  }

  private releaseSessionLease(): void {
    if (!this.ownsSessionLease) return;
    if (activeSessionOwner === this) activeSessionOwner = null;
    this.ownsSessionLease = false;
  }

  private setState(state: NabrQrcTransportState): void {
    this.stateValue = state;
    try { this.events.onState?.(state); } catch { /* Observer callbacks cannot block cleanup. */ }
  }

  private notifyError(code: string, message: string): void {
    try { this.events.onError?.(code, message); } catch { /* Observer callbacks cannot block cleanup. */ }
  }

  private traceLifecycle(event: string, details: Record<string, unknown> = {}): void {
    if (!this.diagnosticEnabled) return;
    const at = this.now();
    const socket = this.socket;
    logger.info({
      ...details,
      diagnosticTraceId: this.diagnosticTraceId ?? null,
      pid: process.pid,
      event,
      timestamp: new Date(at).toISOString(),
      elapsedMs: this.connectedAt === null ? null : Math.max(0, at - this.connectedAt),
      state: this.stateValue,
      readyState: socket?.readyState ?? null,
      bufferedAmount: socket?.bufferedAmount ?? null,
    }, "Nabr/QRC WebSocket lifecycle");
  }
}
