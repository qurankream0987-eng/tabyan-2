import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { decode, encode } from "@msgpack/msgpack";
import { WebSocket } from "ws";
import { qrcContractFixtures } from "./fixtures/qrc-contract-fixtures";
import {
  encodeMonoPcm16Wav,
  NabrQrcWavChunker,
  TABYAN_PCM_INPUT_RATE_HZ,
  validateNabrQrcWavChunk,
} from "./nabr-qrc-audio";
import {
  createNabrQrcStartPayload,
  createNabrQrcWebSocketUrl,
  parseNabrQrcConfig,
  type NabrQrcStartInput,
} from "./nabr-qrc-config";
import { runNabrQrcDryRun } from "./nabr-qrc-dry-run";
import { NabrQrcAcceptanceTrace } from "./nabr-qrc-acceptance-trace";
import { NabrQrcTransport } from "./NabrQrcTransport";

const fixtureStart: NabrQrcStartInput = {
  chapterIndex: 1,
  verseIndex: 1,
  wordIndex: 1,
  hafzLevel: 1,
  tajweedLevel: 1,
};

class FakeSocket extends EventEmitter {
  readyState: number = WebSocket.CONNECTING;
  binaryType: "nodebuffer" | "arraybuffer" | "fragments" = "nodebuffer";
  bufferedAmount = 0;
  sent: Buffer[] = [];

  send(data: Uint8Array | string): void {
    this.sent.push(typeof data === "string" ? Buffer.from(data) : Buffer.from(data));
  }

  close(code = 1000): void {
    this.readyState = WebSocket.CLOSING;
    queueMicrotask(() => {
      this.readyState = WebSocket.CLOSED;
      this.emit("close", code, Buffer.alloc(0));
    });
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.emit("open");
  }

  receive(message: unknown): void {
    this.emit("message", Buffer.from(encode(message)), true);
  }

  asWebSocket(): WebSocket {
    return this as unknown as WebSocket;
  }
}

function sentMessage(socket: FakeSocket, index: number): Record<string, unknown> {
  return decode(socket.sent[index]!) as Record<string, unknown>;
}

test("QRC config defaults to disabled and dry-run; malformed flags fail closed", () => {
  assert.deepEqual(parseNabrQrcConfig({}), {
    enabled: false,
    dryRun: true,
    shadowMode: false,
  });
  assert.deepEqual(parseNabrQrcConfig({
    NABR_QRC_ENABLED: "true",
    NABR_QRC_DRY_RUN: "false",
  }), { enabled: true, dryRun: false, shadowMode: false });
  assert.deepEqual(parseNabrQrcConfig({ NABR_QRC_ENABLED: "yes" }), {
    enabled: false,
    dryRun: true,
    shadowMode: false,
  });
  assert.equal("NABR_QRC_API_KEY" in parseNabrQrcConfig({}), false);
});

test("documented server URL and required server-owned start values are validated", () => {
  const url = new URL(createNabrQrcWebSocketUrl("fake-test-key"));
  assert.equal(url.protocol, "wss:");
  assert.equal(url.hostname, "api.qurani.ai");
  assert.equal(url.searchParams.get("api_key"), "fake-test-key");
  assert.equal(url.searchParams.get("lang"), "ar");
  assert.equal(url.searchParams.get("audio_format"), "wav");

  assert.deepEqual(createNabrQrcStartPayload(fixtureStart), {
    method: "START_TILAWA_SESSION",
    chapter_index: 1,
    verse_index: 1,
    word_index: 1,
    hafz_level: 1,
    tajweed_level: 1,
  });
  assert.throws(() => createNabrQrcStartPayload({ ...fixtureStart, tajweedLevel: 6 }));
});

test("QRC WAV converter preserves 200 ms frames across arbitrary PCM chunk boundaries", () => {
  const chunker = new NabrQrcWavChunker();
  const pcm = new Uint8Array((TABYAN_PCM_INPUT_RATE_HZ / 5) * 2);
  const splitAt = 4_800;
  assert.deepEqual(chunker.push(pcm.subarray(0, splitAt)), []);
  const frames = chunker.push(pcm.subarray(splitAt));
  assert.equal(frames.length, 1);
  assert.deepEqual(chunker.finish(), []);

  const wav = frames[0]!;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  assert.equal(new TextDecoder().decode(wav.subarray(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(wav.subarray(8, 12)), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 6_400);
  assert.equal(wav.byteLength, 6_444);
  assert.throws(() => chunker.push(new Uint8Array([1])));
});

test("server WAV validation accepts bounded mono PCM16 and rejects malformed or oversized frames", () => {
  const wav = encodeMonoPcm16Wav(new Array(3_200).fill(0));
  assert.equal(validateNabrQrcWavChunk(wav).isValid, true);
  assert.equal(validateNabrQrcWavChunk(encodeMonoPcm16Wav(new Array(800).fill(0))).isValid, true);

  const wrongRate = new Uint8Array(wav);
  new DataView(wrongRate.buffer).setUint32(24, 8_000, true);
  assert.equal(validateNabrQrcWavChunk(wrongRate).isValid, false);

  const wrongLength = new Uint8Array(wav);
  new DataView(wrongLength.buffer).setUint32(40, 6_398, true);
  assert.equal(validateNabrQrcWavChunk(wrongLength).isValid, false);

  assert.equal(validateNabrQrcWavChunk(encodeMonoPcm16Wav(new Array(3_216).fill(0))).isValid, false);
  assert.equal(validateNabrQrcWavChunk(new Uint8Array([1, 2, 3])).isValid, false);
});

test("offline dry-run exercises fixtures and audio framing with zero sockets or uploads", () => {
  const report = runNabrQrcDryRun(fixtureStart);
  assert.equal(report.externalSocketOpened, false);
  assert.equal(report.networkRequestCount, 0);
  assert.equal(report.audioUploaded, false);
  assert.equal(report.startPayloadRoundTripped, true);
  assert.equal(report.silentWavFrameCount, 1);
  assert.equal(report.silentWavSampleRateHz, 16_000);
  assert.ok(report.normalizedFixtureEvents.some((event) => event.type === "session_status"));

  let factoryCalls = 0;
  let receivedReport = false;
  const transport = new NabrQrcTransport(
    { enabled: false, dryRun: true },
    {},
    fixtureStart,
    { onDryRun: () => { receivedReport = true; } },
    { socketFactory: () => { factoryCalls += 1; throw new Error("must not run"); } },
  );
  transport.connect();
  assert.equal(transport.state, "dry_run");
  assert.equal(receivedReport, true);
  assert.equal(factoryCalls, 0);
});

test("disabled flag and missing key fail closed without constructing a socket", () => {
  let factoryCalls = 0;
  const socketFactory = () => {
    factoryCalls += 1;
    return new FakeSocket().asWebSocket();
  };
  const disabledErrors: string[] = [];
  new NabrQrcTransport(
    { enabled: false, dryRun: false },
    { apiKey: "unused" },
    fixtureStart,
    { onError: (code) => disabledErrors.push(code) },
    { socketFactory },
  ).connect();
  assert.deepEqual(disabledErrors, ["FEATURE_DISABLED"]);

  const missingKeyErrors: string[] = [];
  new NabrQrcTransport(
    { enabled: true, dryRun: false },
    {},
    fixtureStart,
    { onError: (code) => missingKeyErrors.push(code) },
    { socketFactory },
  ).connect();
  assert.deepEqual(missingKeyErrors, ["PROVIDER_NOT_CONFIGURED"]);
  assert.equal(factoryCalls, 0);
});

test("mocked protocol lifecycle packs start/audio/reset and captures observations only", async () => {
  const fake = new FakeSocket();
  const observations: unknown[] = [];
  const trace = new NabrQrcAcceptanceTrace();
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    { onObservation: (record) => observations.push(record) },
    { socketFactory: () => fake.asWebSocket(), trace },
  );
  transport.connect();
  assert.equal(transport.state, "connecting");
  fake.open();
  fake.receive(qrcContractFixtures.connected);
  assert.equal(transport.state, "starting");
  assert.equal(sentMessage(fake, 0).method, "START_TILAWA_SESSION");
  fake.receive(qrcContractFixtures.started);
  assert.equal(transport.state, "active");
  fake.receive(qrcContractFixtures.unknown);
  assert.equal(transport.state, "active");

  const pcm = Buffer.alloc((TABYAN_PCM_INPUT_RATE_HZ / 5) * 2).toString("base64");
  assert.equal(transport.appendAudio(pcm), true);
  assert.equal(sentMessage(fake, 1).method, "CHECK_TILAWA_AUDIO");
  const audio = sentMessage(fake, 1).audio as Uint8Array;
  assert.equal(new TextDecoder().decode(audio.subarray(0, 4)), "RIFF");

  fake.receive(qrcContractFixtures.result);
  fake.receive(qrcContractFixtures.result);
  const stop = transport.stop();
  assert.equal(transport.state, "stopping");
  assert.equal(sentMessage(fake, 2).method, "RESET_TILAWA_SESSION");
  fake.receive(qrcContractFixtures.ended);
  await stop;
  assert.equal(transport.state, "closed");
  assert.ok(observations.length >= 3);

  const snapshot = trace.snapshot();
  assert.ok(snapshot.providerEvents.length >= 5);
  assert.ok(snapshot.providerEvents.every((record) => record.normalizedEvents.every(
    (event) => event.evidence === "provider_observation",
  )));
  assert.deepEqual(snapshot.confirmedTabyanEvents, []);
  assert.equal(transport.getDiagnostics().firstPartialLatencyMs, null);
  assert.equal(transport.getDiagnostics().confirmedOmissionCount, null);
  assert.equal(transport.getDiagnostics().confirmedRepetitionCount, null);
});

test("QRC session-start failure never reports READY", () => {
  const fake = new FakeSocket();
  const errors: string[] = [];
  let readyCount = 0;
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    {
      onReady: () => { readyCount += 1; },
      onError: (code) => errors.push(code),
    },
    { socketFactory: () => fake.asWebSocket() },
  );
  transport.connect();
  fake.open();
  fake.receive(qrcContractFixtures.connected);
  fake.receive({ event: "TILAWA_SESSION_STARTED", exit_code: 7 });
  assert.equal(transport.state, "failed");
  assert.equal(readyCount, 0);
  assert.deepEqual(errors, ["PROVIDER_PROTOCOL_ERROR"]);
});

test("direct gateway WAV path forwards a validated WAV unchanged and rejects an invalid frame", () => {
  const fake = new FakeSocket();
  const errors: string[] = [];
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    { onError: (code) => errors.push(code) },
    { socketFactory: () => fake.asWebSocket() },
  );
  transport.connect();
  fake.open();
  fake.receive(qrcContractFixtures.connected);
  fake.receive(qrcContractFixtures.started);

  const wav = encodeMonoPcm16Wav(new Array(3_200).fill(0));
  assert.equal(transport.appendWavChunk(wav), true);
  const forwarded = sentMessage(fake, 1).audio as Uint8Array;
  assert.deepEqual([...forwarded], [...wav]);

  const invalid = new Uint8Array(wav);
  new DataView(invalid.buffer).setUint32(4, 1, true);
  try {
    assert.equal(transport.appendWavChunk(invalid), false);
    assert.deepEqual(errors, ["BAD_AUDIO_CHUNK"]);
  } finally {
    transport.close();
  }
});

test("unexpected QRC close captures the code and redacted reason", () => {
  const fake = new FakeSocket();
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    {},
    { socketFactory: () => fake.asWebSocket() },
  );
  transport.connect();
  fake.open();
  fake.readyState = WebSocket.CLOSED;
  fake.emit("close", 1012, Buffer.from("provider unavailable"));
  assert.equal(transport.getDiagnostics().disconnectCode, 1012);
  assert.equal(transport.getDiagnostics().disconnectReason, "provider unavailable");
  transport.close();
});

test("a second concurrent QRC session is rejected and a timeout releases the guard", async () => {
  const sockets: FakeSocket[] = [];
  let firstError: string | null = null;
  const createTransport = (timeoutMs = 10_000) => new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    { onError: (code) => { firstError = code; } },
    {
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket.asWebSocket();
      },
      connectionTimeoutMs: timeoutMs,
    },
  );

  const first = createTransport();
  first.connect();
  first.connect();
  assert.equal(sockets.length, 1);
  const second = createTransport();
  second.connect();
  assert.equal(second.state, "failed");
  assert.equal(firstError, "SESSION_ALREADY_ACTIVE");
  assert.equal(sockets.length, 1);
  first.close();

  const timeoutTransport = createTransport(5);
  timeoutTransport.connect();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(timeoutTransport.state, "failed");
  assert.equal(firstError, "PROVIDER_TIMEOUT");

  const afterTimeout = createTransport();
  afterTimeout.connect();
  assert.equal(afterTimeout.state, "connecting");
  afterTimeout.close();
});

test("provider errors and malformed audio fail cleanly without transcripts", () => {
  const fake = new FakeSocket();
  const errors: string[] = [];
  const transcriptLikeEvents: unknown[] = [];
  const transport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    {
      onError: (code) => errors.push(code),
      onObservation: (record) => transcriptLikeEvents.push(record),
    },
    { socketFactory: () => fake.asWebSocket() },
  );
  transport.connect();
  fake.open();
  fake.receive(qrcContractFixtures.connected);
  fake.receive(qrcContractFixtures.started);
  assert.equal(transport.appendAudio("not-base64"), false);
  assert.equal(transport.state, "failed");
  assert.deepEqual(errors, ["BAD_AUDIO_CHUNK"]);
  assert.ok(transcriptLikeEvents.every((record) => !("transcript" in (record as object))));

  const providerSocket = new FakeSocket();
  const providerErrors: string[] = [];
  const providerTransport = new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    { onError: (code) => providerErrors.push(code) },
    { socketFactory: () => providerSocket.asWebSocket() },
  );
  providerTransport.connect();
  providerSocket.open();
  providerSocket.receive(qrcContractFixtures.error);
  assert.deepEqual(providerErrors, ["PROVIDER_STREAM_ERROR"]);
  assert.equal(providerTransport.getDiagnostics().providerErrorCount, 1);
  assert.equal(providerTransport.getDiagnostics().disconnectBehavior, "error");
});

test("active transport cleanup sends one reset and releases the process guard", () => {
  const sockets: FakeSocket[] = [];
  const createTransport = () => new NabrQrcTransport(
    { enabled: true, dryRun: false },
    { apiKey: "fake-test-key" },
    fixtureStart,
    {},
    {
      socketFactory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket.asWebSocket();
      },
    },
  );

  const transport = createTransport();
  transport.connect();
  sockets[0]!.open();
  sockets[0]!.receive(qrcContractFixtures.connected);
  sockets[0]!.receive(qrcContractFixtures.started);
  transport.close();
  assert.equal(sentMessage(sockets[0]!, 1).method, "RESET_TILAWA_SESSION");
  assert.equal(transport.state, "closed");

  const next = createTransport();
  next.connect();
  assert.equal(next.state, "connecting");
  next.close();
});
