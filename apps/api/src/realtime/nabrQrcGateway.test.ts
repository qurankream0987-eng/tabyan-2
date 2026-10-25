import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { WebSocket } from "ws";
import { encodeMonoPcm16Wav } from "../recitation-providers/nabr-qrc-audio";
import { attachNabrQrcGateway } from "./nabrQrcGateway";
import type {
  NabrQrcGatewayUpstream,
  NabrQrcGatewayUpstreamEvents,
} from "./nabrQrcGateway";

type GatewayMessage = Record<string, unknown>;

function waitForMessage(
  socket: WebSocket,
  predicate: (message: GatewayMessage) => boolean,
  timeoutMs = 5_000,
): Promise<GatewayMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for gateway response"));
    }, timeoutMs);
    const onMessage = (raw: Buffer) => {
      let message: unknown;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (message === null || typeof message !== "object" || Array.isArray(message)) return;
      const record = message as GatewayMessage;
      if (!predicate(record)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(record);
    };
    socket.on("message", onMessage);
  });
}

async function startGatewayServer(
  options: Parameters<typeof attachNabrQrcGateway>[1] = {},
) {
  const server = createServer();
  attachNabrQrcGateway(server, {
    mode: "fake",
    authenticate: async (token) => token === "fake-test-session"
      ? { id: "gateway-test-student", role: "student" }
      : null,
    ...options,
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test gateway did not bind a TCP port");
  return {
    server,
    endpoint: `ws://127.0.0.1:${address.port}/api/ws/nabr-qrc-gateway`,
  };
}

async function openAuthenticatedSocket(endpoint: string): Promise<WebSocket> {
  const socket = new WebSocket(endpoint);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  const authenticated = waitForMessage(socket, (message) => message.t === "authenticated");
  socket.send(JSON.stringify({ t: "auth", token: "fake-test-session" }));
  await authenticated;
  return socket;
}

test("fake QRC gateway authenticates, starts, forwards WAV, normalizes results, handles keepalive, and resets", async () => {
  const { server, endpoint } = await startGatewayServer();
  const socket = await openAuthenticatedSocket(endpoint);
  try {
    const ready = waitForMessage(socket, (message) => message.t === "ready");
    socket.send(JSON.stringify({
      t: "start",
      sessionId: "gateway-smoke-session",
      start: { surah: 1, ayah: 1, wordIndex: 1 },
    }));
    assert.equal((await ready).mode, "fake");

    const keepAlive = waitForMessage(socket, (message) => message.t === "keep_alive");
    const firstResult = waitForMessage(socket, (message) => message.t === "observation");
    const duplicateResult = waitForMessage(socket, (message) => message.t === "observation");
    const silenceWav = Buffer.from(encodeMonoPcm16Wav(new Array(3_200).fill(0)));
    socket.send(silenceWav);

    await keepAlive;
    const first = await firstResult;
    const duplicate = await duplicateResult;
    const firstObservation = first.observation as GatewayMessage;
    const duplicateObservation = duplicate.observation as GatewayMessage;
    assert.deepEqual(firstObservation.currentPosition, {
      chapter_index: 1,
      verse_index: 1,
      word_index: 1,
    });
    assert.equal(firstObservation.observedAt !== undefined, true);
    assert.equal(firstObservation.providerEventId, duplicateObservation.providerEventId);
    assert.equal("raw_vendor_field" in firstObservation, false);

    const stopped = waitForMessage(socket, (message) => message.t === "stopped");
    socket.send(JSON.stringify({ t: "reset" }));
    await stopped;
  } finally {
    socket.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("gateway rejects invalid WAV before forwarding it", async () => {
  const { server, endpoint } = await startGatewayServer();
  const socket = await openAuthenticatedSocket(endpoint);
  try {
    const ready = waitForMessage(socket, (message) => message.t === "ready");
    socket.send(JSON.stringify({
      t: "start",
      sessionId: "gateway-invalid-audio",
      start: { surah: 1, ayah: 1, wordIndex: 1 },
    }));
    await ready;
    const error = waitForMessage(socket, (message) => message.t === "error");
    socket.send(Buffer.from([1, 2, 3]));
    const response = await error;
    assert.equal(response.code, "BAD_AUDIO_CHUNK");
    assert.equal(response.message, "تعذر معالجة مقطع الصوت");
  } finally {
    socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("gateway reports upstream start failure with a safe Arabic error only", async () => {
  const failedUpstream: NabrQrcGatewayUpstream = {
    connect() {
      handlers?.onError("INTERNAL_PROVIDER_DETAIL");
    },
    pushWavChunk: () => false,
    stop: async () => {},
    close: () => {},
  };
  let handlers: NabrQrcGatewayUpstreamEvents | null = null;
  const { server, endpoint } = await startGatewayServer({
    createUpstream: (_mode, _start, events) => {
      handlers = events;
      return failedUpstream;
    },
  });
  const socket = await openAuthenticatedSocket(endpoint);
  try {
    const error = waitForMessage(socket, (message) => message.t === "error");
    socket.send(JSON.stringify({
      t: "start",
      sessionId: "gateway-start-failure",
      start: { surah: 1, ayah: 1, wordIndex: 1 },
    }));
    const response = await error;
    assert.equal(response.code, "PROVIDER_UNAVAILABLE");
    assert.equal(response.message, "تعذر الاتصال بخدمة التسميع");
    assert.equal(JSON.stringify(response).includes("INTERNAL_PROVIDER_DETAIL"), false);
  } finally {
    socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("gateway rejects invalid authentication before session creation", async () => {
  const { server, endpoint } = await startGatewayServer();
  const socket = new WebSocket(endpoint);
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    const response = waitForMessage(socket, (message) => message.t === "error");
    socket.send(JSON.stringify({ t: "auth", token: "not-a-student-token" }));
    const message = await response;
    assert.equal(message.code, "UNAUTHORIZED");
    assert.equal(message.message, "رمز الجلسة غير صالح");
  } finally {
    socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
