import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NativeRecitationControllerCore,
  type NativeAudioBuffer,
  type NativeAudioRecorder,
  type NativeRecitationRuntime,
  type NativeSocket,
} from "../lib/native-recitation-controller";
import {
  NativeQuranLiveMatcher,
  type CanonicalQuranWord,
  type NativeRecitationState,
} from "../lib/native-recitation-matcher";
import { normalizeQuranText } from "../lib/quran-normalizer";

const canonicalWords = ["بسم", "الله", "الرحمن", "الرحيم"].map((displayText, index) => ({
  surah: 1,
  ayah: 1,
  verseKey: "1:1",
  position: index + 1,
  displayText,
  normalizedText: normalizeQuranText(displayText),
})) satisfies CanonicalQuranWord[];

class FakeSocket implements NativeSocket {
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string) {
    this.sent.push(data);
    const message = JSON.parse(data);
    if (message.t === "commit" && message.final) {
      queueMicrotask(() => this.receive({ t: "finalized", commitId: message.commitId }));
    }
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: unknown) {
    this.onmessage?.({ data: typeof message === "string" ? message : JSON.stringify(message) });
  }

  disconnect() {
    this.readyState = 3;
    this.onclose?.();
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

class FakeRecorder implements NativeAudioRecorder {
  callback: ((event: { buffer: NativeAudioBuffer }) => void) | null = null;
  started = false;
  stopped = false;

  onAudioReady(
    _options: { sampleRate: number; bufferLength: number; channelCount: number },
    callback: (event: { buffer: NativeAudioBuffer }) => void,
  ) {
    this.callback = callback;
    return { status: "ok" };
  }

  async start() {
    this.started = true;
    return { status: "ok" };
  }

  pause() {
    this.started = false;
  }

  resume() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
    this.started = false;
  }

  clearOnAudioReady() {
    this.callback = null;
  }

  isRecording() {
    return this.started;
  }
}

class DeferredFakeRecorder extends FakeRecorder {
  private resolveStart!: (result: { status: string }) => void;
  private readonly pendingStart = new Promise<{ status: string }>((resolve) => {
    this.resolveStart = resolve;
  });

  override start() {
    this.started = true;
    return this.pendingStart;
  }

  completeStart() {
    this.resolveStart({ status: "ok" });
  }
}

function makeRig(permission: boolean | Promise<boolean> = true, createRecorder?: () => FakeRecorder) {
  const sockets: FakeSocket[] = [];
  const recorders: FakeRecorder[] = [];
  const states: NativeRecitationState[] = [];
  const matches: ReturnType<NativeQuranLiveMatcher["feed"]>[] = [];
  const runtime: NativeRecitationRuntime = {
    isWeb: false,
    requestMicrophonePermission: async () => await permission,
    getWebSocketUrl: () => "wss://test.invalid/api/ws/recitation",
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    createRecorder: () => {
      const recorder = createRecorder?.() ?? new FakeRecorder();
      recorders.push(recorder);
      return recorder;
    },
  };
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  const controller = new NativeRecitationControllerCore(
    matcher,
    {
      onState: (state) => states.push(state),
      onMatch: (match) => matches.push(match),
    },
    runtime,
  );
  return { controller, sockets, recorders, states, matches };
}

async function openSession(rig: ReturnType<typeof makeRig>) {
  const starting = rig.controller.start("user-session-token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  socket.open();
  socket.receive({ t: "authenticated" });
  socket.receive({ t: "ready", audioSampleRateHz: 24_000 });
  await starting;
  return socket;
}

test("Native matcher exposes position and committed progression without a score or completion state", () => {
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  const result = matcher.feed("بسم", "item-1", true);

  assert.equal(result.current?.verseKey, "1:1");
  assert.equal(result.current?.position, 1);
  assert.equal(result.progressionWords, 1);
  assert.equal(result.totalWords, 4);
  assert.equal(result.diagnostics.unmatched, false);
  assert.equal("accuracyScore" in result, false);
  assert.equal("completionState" in result, false);
});

test("Native matcher reports a repeated position and leaves committed progression unchanged", () => {
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  matcher.feed("بسم", "item-1", true);
  const repeated = matcher.feed("بسم", "item-2", true);
  const unrelated = matcher.feed("نص بعيد", "item-3", true);

  assert.equal(repeated.diagnostics.repeatedPosition, true);
  assert.equal(repeated.progressionWords, 1);
  assert.equal(unrelated.diagnostics.unmatched, true);
  assert.equal(unrelated.diagnostics.unmatchedTokenCount, 2);
  assert.equal(unrelated.progressionWords, 1);
});

test("Native matcher reports skipped words without counting them as confirmed progression", () => {
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  const result = matcher.feed("الرحمن", "item-1", true);

  assert.equal(result.current?.position, 3);
  assert.equal(result.progressionWords, 1);
  assert.equal(result.diagnostics.skippedRegionWords, 2);
  assert.equal("completionState" in result, false);
});

test("controller authenticates before recording and ignores malformed or empty transcript events", async () => {
  const rig = makeRig();
  const socket = await openSession(rig);
  const auth = JSON.parse(socket.sent[0]) as { t: string; token: string; sessionId: string };
  assert.deepEqual(auth, { t: "auth", token: "user-session-token", sessionId: "session-1" });
  assert.equal(rig.recorders[0]?.started, true);

  socket.receive("{not json");
  socket.receive({ t: "transcript", isFinal: true, itemId: "missing-text" });
  assert.equal(rig.matches.length, 0);

  socket.receive({ t: "transcript", text: "بسم", isFinal: true, itemId: "valid" });
  assert.equal(rig.matches.length, 1);
  assert.equal(rig.matches[0]?.current?.position, 1);

  await rig.controller.stop();
  assert.equal(rig.recorders[0]?.stopped, true);
  assert.ok(socket.sent.some((item) => JSON.parse(item).t === "close"));
  assert.equal(rig.states.at(-1), "stopped");
});

test("microphone denial fails closed before socket or recorder creation", async () => {
  const rig = makeRig(false);

  await assert.rejects(rig.controller.start("token", "session-1"));
  assert.equal(rig.sockets.length, 0);
  assert.equal(rig.recorders.length, 0);
  assert.equal(rig.states.at(-1), "error");
});

test("disposing while microphone permission is pending cannot open a socket later", async () => {
  let resolvePermission!: (granted: boolean) => void;
  const permission = new Promise<boolean>((resolve) => {
    resolvePermission = resolve;
  });
  const rig = makeRig(permission);
  const starting = rig.controller.start("token", "session-1");

  await rig.controller.dispose();
  resolvePermission(true);

  await assert.rejects(starting);
  assert.equal(rig.sockets.length, 0);
  assert.equal(rig.recorders.length, 0);
});

test("disposing during recorder startup stops capture when startup eventually resolves", async () => {
  const recorder = new DeferredFakeRecorder();
  const rig = makeRig(true, () => recorder);
  const starting = rig.controller.start("token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  socket.open();
  socket.receive({ t: "authenticated" });
  socket.receive({ t: "ready", audioSampleRateHz: 24_000 });
  await new Promise<void>((resolve) => setImmediate(resolve));

  await rig.controller.dispose();
  recorder.completeStart();

  await assert.rejects(starting);
  assert.equal(recorder.stopped, true);
  assert.equal(rig.states.at(-1), "stopped");
});

test("WebSocket disconnect during authorization rejects start and never opens the recorder", async () => {
  const rig = makeRig();
  const starting = rig.controller.start("token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  socket.open();
  socket.disconnect();

  await assert.rejects(starting);
  assert.equal(rig.recorders.length, 0);
  assert.equal(rig.states.at(-1), "error");
});

test("WebSocket disconnect during recording stops capture and does not emit a fake match", async () => {
  const rig = makeRig();
  const socket = await openSession(rig);

  socket.disconnect();

  assert.equal(rig.recorders[0]?.stopped, true);
  assert.equal(rig.matches.length, 0);
  assert.equal(rig.states.at(-1), "error");
});

test("paused capture is stopped and the controller cannot silently reconnect", async () => {
  const rig = makeRig();
  const socket = await openSession(rig);

  rig.controller.pause();
  assert.equal(rig.states.at(-1), "paused");
  rig.controller.resume();
  assert.equal(rig.states.at(-1), "recording");
  await rig.controller.stop();
  assert.equal(rig.recorders[0]?.stopped, true);
  await assert.rejects(rig.controller.start("token", "session-2"));
  assert.equal(rig.sockets.length, 1);
});
