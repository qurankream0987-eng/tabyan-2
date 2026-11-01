import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocketServer } from "ws";
import { OPENAI_REALTIME_URL, OpenAiRealtimeProvider } from "./OpenAiRealtimeProvider";
import type { SpeechRecognitionProviderEvents } from "./types";

test("OpenAI Realtime adapter reports forwarded audio and a server-accepted commit", async (t) => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");

  const sessionConfigs: Record<string, unknown>[] = [];
  let appendedAudio: string | null = null;
  server.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const event = JSON.parse(String(raw)) as Record<string, unknown>;
      if (event.type === "session.update") {
        sessionConfigs.push(event.session as Record<string, unknown>);
        socket.send(JSON.stringify({ type: "session.updated" }));
      } else if (event.type === "input_audio_buffer.append") {
        appendedAudio = String(event.audio ?? "");
      } else if (event.type === "input_audio_buffer.commit") {
        socket.send(JSON.stringify({
          type: "input_audio_buffer.committed",
          item_id: "test-item",
        }));
      }
    });
  });

  let resolveReady!: () => void;
  let resolveCommitAccepted!: () => void;
  const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
  const commitAccepted = new Promise<void>((resolve) => { resolveCommitAccepted = resolve; });
  const forwardedBytes: number[] = [];
  const audioAcceptanceEvidence: string[] = [];
  const commitAcceptanceEvidence: string[] = [];
  const events: SpeechRecognitionProviderEvents = {
    onReady: resolveReady,
    onTranscript() {},
    onProviderEvent() {},
    onAudioForwarded: (bytes) => forwardedBytes.push(bytes),
    onAudioAccepted: (evidence) => audioAcceptanceEvidence.push(evidence),
    onCommitAccepted: (evidence) => {
      commitAcceptanceEvidence.push(evidence);
      resolveCommitAccepted();
    },
    onError: (message) => assert.fail(message),
    onClose() {},
  };
  const provider = new OpenAiRealtimeProvider(
    "test-only",
    events,
    `ws://127.0.0.1:${address.port}`,
  );
  t.after(async () => {
    provider.close();
    for (const client of server.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  provider.connect();
  await ready;
  const pcm = Buffer.from([1, 0, 2, 0]);
  provider.appendAudio(pcm.toString("base64"));
  provider.commit();
  await commitAccepted;

  assert.equal(sessionConfigs.length, 1);
  const sessionConfig = sessionConfigs[0]!;
  assert.deepEqual(
    (sessionConfig.audio as { input?: { format?: unknown; transcription?: unknown; turn_detection?: unknown } })
      .input?.format,
    { type: "audio/pcm", rate: 24_000 },
  );
  assert.deepEqual(
    (sessionConfig.audio as { input?: { transcription?: unknown } })
      .input?.transcription,
    { model: "gpt-live-transcribe", languages: ["ar"], delay: "minimal" },
  );
  assert.equal(
    (sessionConfig.audio as { input?: { turn_detection?: unknown } })
      .input?.turn_detection,
    null,
  );
  assert.equal(appendedAudio, pcm.toString("base64"));
  assert.deepEqual(forwardedBytes, [pcm.byteLength]);
  assert.deepEqual(audioAcceptanceEvidence, ["provider_commit_ack"]);
  assert.deepEqual(commitAcceptanceEvidence, ["provider_commit_ack"]);
});

test("OpenAI transcription connects with the transcription intent and no model parameter", () => {
  const url = new URL(OPENAI_REALTIME_URL);
  assert.equal(url.pathname, "/v1/realtime");
  assert.equal(url.searchParams.has("model"), false);
  assert.equal(url.searchParams.get("intent"), "transcription");
});
