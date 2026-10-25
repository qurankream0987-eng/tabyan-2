import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocketServer } from "ws";
import { OpenAiRealtimeProvider } from "./OpenAiRealtimeProvider";

test("OpenAI drain waits all acknowledged item finals (out of order), filters replay, and avoids an empty final commit", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  let commits = 0;
  let remote: import("ws").WebSocket | undefined;
  server.on("connection", (socket) => {
    remote = socket;
    socket.on("message", (raw) => {
      const e = JSON.parse(String(raw));
      if (e.type === "session.update") socket.send(JSON.stringify({ type: "session.updated" }));
      if (e.type === "input_audio_buffer.commit") {
        commits++;
        socket.send(JSON.stringify({ type: "input_audio_buffer.committed", item_id: `i${commits}`, event_id: `ack${commits}` }));
      }
    });
  });
  const events: string[] = [];
  let ready!: () => void, accepted!: () => void, finished!: () => void;
  const readyPromise = new Promise<void>((r) => { ready = r; });
  const acceptedPromise = new Promise<void>((r) => { accepted = r; });
  const finishedPromise = new Promise<void>((r) => { finished = r; });
  let acks = 0;
  const provider = new OpenAiRealtimeProvider("local-fake-not-a-secret", {
    onReady: ready, onProviderEvent: () => {},
    onCommitAccepted: () => { if (++acks === 2) accepted(); },
    onTranscript: (e) => {
      assert.equal(e.confirmationEligible, false);
      events.push(`final:${e.itemId}`);
    },
    onFinalized: (id) => { events.push(`drained:${id}`); finished(); },
    onError: (message) => { throw new Error(message); }, onClose: () => {},
  }, `ws://127.0.0.1:${address.port}`);
  try {
    provider.connect(); await readyPromise;
    provider.appendAudio(Buffer.alloc(4800).toString("base64")); provider.commit();
    provider.appendAudio(Buffer.alloc(4800).toString("base64")); provider.commit();
    await acceptedPromise;
    provider.commit(true, "end");
    assert.equal(commits, 2);
    assert.deepEqual(events, []);
    remote!.send(JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "i2", transcript: "الله", event_id: "f2" }));
    remote!.send(JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "i2", transcript: "الله", event_id: "f2" }));
    remote!.send(JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "i1", transcript: "بسم", event_id: "f1" }));
    await finishedPromise;
    assert.deepEqual(events, ["final:i1", "final:i2", "drained:end"]);
  } finally {
    provider.close();
    for (const client of server.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
