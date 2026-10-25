import assert from "node:assert/strict";
import test from "node:test";
import { NativeRecitationControllerCore, type NativeSocket, type NativeAudioRecorder, type NativeAudioBuffer } from "../lib/recitation/native-recitation-controller";
import { NativeQuranLiveMatcher } from "../lib/recitation/native-recitation-matcher";
import { NativeRecitationFeedback } from "../lib/recitation/native-recitation-feedback";

const words = ["بسم", "الله", "الرحمن", "الرحيم"].map((text, index) => ({
  surah: 1, ayah: 1, verseKey: "1:1", position: index + 1,
  displayText: text, normalizedText: text,
}));

class Socket implements NativeSocket {
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: Record<string, unknown>[] = [];
  send(raw: string) { this.sent.push(JSON.parse(raw)); }
  receive(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

async function rig(options: { flush?: () => Promise<void>; timeout?: number; tailSamples?: Float32Array } = {}) {
  const socket = new Socket();
  const cues: string[] = [];
  const matches: ReturnType<NativeQuranLiveMatcher["feed"]>[] = [];
  let recording = false;
  let audioCallback: ((event: { buffer: NativeAudioBuffer }) => void) | null = null;
  const recorder: NativeAudioRecorder = {
    onAudioReady: (_options, callback) => { audioCallback = callback; return { status: "ok" }; },
    start: async () => { recording = true; return { status: "ok" }; },
    stop: async () => {
      await options.flush?.();
      if (options.tailSamples) audioCallback?.({ buffer: {
        numberOfChannels: 1, sampleRate: 24_000, getChannelData: () => options.tailSamples!,
      } });
      recording = false;
    },
    clearOnAudioReady: () => { audioCallback = null; },
    pause: () => {}, resume: () => {}, isRecording: () => recording,
  };
  const controller = new NativeRecitationControllerCore(
    new NativeQuranLiveMatcher(words), { onMatch: (match) => matches.push(match) }, {
      isWeb: false, requestMicrophonePermission: async () => true,
      getWebSocketUrl: () => "wss://fake.invalid",
      createSocket: () => socket, createRecorder: () => recorder,
      playCue: (cue) => cues.push(cue), finalTimeoutMs: options.timeout ?? 100,
    });
  const start = controller.start("fake", "fake");
  await new Promise<void>((resolve) => setImmediate(resolve));
  socket.onopen?.();
  socket.receive({ t: "ready", provider: "openai", audioSampleRateHz: 24_000 });
  await start;
  return { controller, socket, cues, matches };
}

test("Native assembles per-item deltas, does not commit partials, and rejects final/delta replay", async () => {
  const r = await rig();
  r.socket.receive({ t: "transcript", itemId: "a", eventId: "e1", text: "بسم", textIsDelta: true });
  r.socket.receive({ t: "transcript", itemId: "a", eventId: "e2", text: " الله", textIsDelta: true });
  r.socket.receive({ t: "transcript", itemId: "a", eventId: "e2", text: " الله", textIsDelta: true });
  assert.equal(r.matches.length, 2);
  assert.equal(r.matches.at(-1)?.progressionWords, 0);
  r.socket.receive({ t: "transcript", itemId: "a", text: "بسم الله", isFinal: true });
  assert.equal(r.matches.at(-1)?.progressionWords, 2);
  r.socket.receive({ t: "transcript", itemId: "a", text: "بسم الله", isFinal: true });
  r.socket.receive({ t: "transcript", itemId: "a", text: " الرحمن", textIsDelta: true });
  assert.equal(r.matches.length, 3);
  await r.controller.dispose();
});

test("Native end is single-flight, waits asynchronous capture flush and correlated drain, then permits persisted-end cue", async () => {
  let flush!: () => void;
  const r = await rig({
    flush: () => new Promise<void>((resolve) => { flush = resolve; }),
    tailSamples: new Float32Array([0.25, -0.25]),
  });
  const end = r.controller.stop();
  assert.equal(r.controller.stop(), end);
  assert.equal(r.socket.sent.filter((m) => m.final).length, 0);
  flush();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const commit = r.socket.sent.find((m) => m.final);
  assert.ok(commit);
  const tail = r.socket.sent.find((m) => m.t === "audio");
  assert.ok(tail);
  assert.ok(r.socket.sent.indexOf(tail) < r.socket.sent.indexOf(commit));
  assert.equal(Buffer.from(String(tail.audio), "base64").length, 4);
  r.socket.receive({ t: "finalized", commitId: "wrong" });
  assert.equal(r.socket.readyState, 1);
  r.socket.receive({ t: "transcript", itemId: "tail", text: "بسم الله", isFinal: true });
  r.socket.receive({ t: "finalized", commitId: commit.commitId });
  assert.equal(await end, true);
  assert.equal(r.matches.at(-1)?.progressionWords, 2);
  assert.deepEqual(r.cues, ["start"]);
  await r.controller.completeSuccessfully();
  await r.controller.completeSuccessfully();
  assert.deepEqual(r.cues, ["start", "end"]);
  await r.controller.dispose();
});

test("Native missing acknowledgement fails closed with no success/end cue", async () => {
  const r = await rig({ timeout: 5 });
  assert.equal(await r.controller.stop(), false);
  assert.equal(r.socket.readyState, 3);
  await r.controller.completeSuccessfully();
  assert.deepEqual(r.cues, ["start"]);
});

test("Native cancellation during finalization rejects pending work and closes capture/socket", async () => {
  const r = await rig();
  const end = r.controller.stop();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await r.controller.dispose();
  assert.equal(await end, false);
  assert.equal(r.socket.readyState, 3);
  assert.deepEqual(r.cues, ["start"]);
});

test("Native synchronous final-commit send failure has no unhandled drain waiter or end cue", async () => {
  const r = await rig();
  r.socket.send = () => { throw new Error("socket failed"); };
  assert.equal(await r.controller.stop(), false);
  assert.equal(r.socket.readyState, 3);
  await r.controller.completeSuccessfully();
  assert.deepEqual(r.cues, ["start"]);
});

test("Native cue policy: possible/uncertain silent, qualified confirmation and correction once, mute, failure isolation", async () => {
  const cues: string[] = [];
  const feedback = new NativeRecitationFeedback((cue) => cues.push(cue));
  feedback.ready(); feedback.ready();
  feedback.observeWordState("w1", "POSSIBLE_ERROR", true);
  feedback.observeWordState("w1", "CONFIRMED_ERROR");
  feedback.observeWordState("w1", "CONFIRMED_ERROR", true);
  feedback.observeWordState("w1", "CONFIRMED_ERROR", true);
  feedback.observeWordState("w1", "CORRECTED");
  feedback.observeWordState("w1", "CORRECTED");
  await feedback.complete(true); await feedback.complete(true);
  assert.deepEqual(cues, ["start", "mistake", "correction", "end"]);
  const muted = new NativeRecitationFeedback(() => { throw new Error("must not play"); });
  muted.enabled = false; muted.ready(); await muted.complete(true);
  const failing = new NativeRecitationFeedback(() => Promise.reject(new Error("audio unavailable")));
  failing.ready(); await failing.complete(true);
});
