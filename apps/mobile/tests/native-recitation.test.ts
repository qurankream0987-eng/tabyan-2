import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NativeRecitationControllerCore,
  type NativeAudioBuffer,
  type NativeAudioRecorder,
  type NativeRecitationRuntime,
  type NativeSocket,
} from "../lib/recitation/native-recitation-controller";
import {
  confirmedWordKey,
  NativeQuranLiveMatcher,
  type CanonicalQuranWord,
  type NativeRecitationState,
} from "../lib/recitation/native-recitation-matcher";
import { normalizeQuranText } from "../lib/recitation/quran-normalizer";

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

function monoBuffer(samples: number[]): NativeAudioBuffer {
  const data = Float32Array.from(samples);
  return { numberOfChannels: 1, sampleRate: 24_000, getChannelData: () => data };
}

function pcmBase64(samples: number[]) {
  const bytes = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => bytes.writeInt16LE(Math.trunc(sample < 0 ? sample * 0x8000 : sample * 0x7fff), index * 2));
  return bytes.toString("base64");
}

function makeRig(
  permission: boolean | Promise<boolean> = true,
  createRecorder?: () => FakeRecorder,
  timing: Pick<NativeRecitationRuntime, "keepaliveIntervalMs" | "gatewaySilenceTimeoutMs" | "conditionAudio" | "reconnectDelaysMs" | "maxReconnects" | "readyTimeoutMs"> = {},
) {
  const sockets: FakeSocket[] = [];
  const recorders: FakeRecorder[] = [];
  const states: NativeRecitationState[] = [];
  const matches: ReturnType<NativeQuranLiveMatcher["feed"]>[] = [];
  const runtime: NativeRecitationRuntime = {
    ...timing,
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

test("Native matcher lists confirmed word positions from final alignments only", () => {
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  const partial = matcher.feed("بسم الله", "item-1", false);
  assert.equal(partial.confirmedWordKeys.size, 0);
  const final = matcher.feed("بسم الله", "item-1", true);
  assert.deepEqual([...final.confirmedWordKeys].sort(), ["1:1:1", "1:1:2"]);
  assert.equal(final.confirmedWordKeys.has(confirmedWordKey(canonicalWords[2])), false);
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

test("Native reading pointer follows partials forward and holds through an unaligned partial", () => {
  const matcher = new NativeQuranLiveMatcher(canonicalWords);
  assert.equal(matcher.feed("بسم الله", "item-1", false).reading?.position, 2);
  assert.equal(matcher.feed("بسم الله الرحمن", "item-1", false).reading?.position, 3);
  // A garbled partial does not send the pointer back to the start.
  const garbled = matcher.feed("بسم الله الرحمن كذا وكذا وكذا وكذا", "item-1", false);
  assert.equal(garbled.reading?.position, 3);
  const final = matcher.feed("بسم الله الرحمن", "item-1", true);
  assert.equal(final.reading?.position, 3);
  assert.equal(final.readingWords, 3);
});

test("Native matcher stops a reader who goes on past words left out, at the first of them", () => {
  const words = ["بسم", "الله", "الرحمن", "الرحيم", "الحمد", "لله"].map((displayText, index) => ({
    surah: 1, ayah: 1, verseKey: "1:1", position: index + 1, displayText, normalizedText: normalizeQuranText(displayText),
  })) satisfies CanonicalQuranWord[];
  // Two heard words cannot carry the reader over a gap: a wrong ending often repeats a nearby
  // one. They wait for the next phrase; three can, and stop the reader at the gap.
  const waiting = new NativeQuranLiveMatcher(words).feed("الرحمن الرحيم", "item-1", true);
  assert.equal(waiting.progressionWords, 0);
  const result = new NativeQuranLiveMatcher(words).feed("الرحمن الرحيم الحمد", "item-1", true);

  assert.equal(result.wordFeedback.get("1:1:1"), "mistake");
  assert.equal(result.progressionWords, 0);
  assert.equal(result.readingWords, 0);
  assert.equal(result.wordFeedback.has("1:1:3"), false);
  assert.equal("completionState" in result, false);
});

const fatihaWords = [
  ["1:2", ["الحمد", "لله", "رب", "العالمين"]],
  ["1:3", ["الرحمن", "الرحيم"]],
  ["1:4", ["مالك", "يوم", "الدين"]],
].flatMap(([verseKey, words]) => (words as string[]).map((displayText, index) => ({
  surah: 1,
  ayah: Number((verseKey as string).split(":")[1]),
  verseKey: verseKey as string,
  position: index + 1,
  displayText,
  normalizedText: normalizeQuranText(displayText),
}))) satisfies CanonicalQuranWord[];

test("Native matcher stops on a wrong word at once and holds there until it is read right", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  const first = matcher.feed("الحمد لله قال العالمين الرحمن الرحيم", "item-1", true);
  assert.equal(first.wordFeedback.get("1:2:3"), "mistake");
  assert.equal(first.wordFeedback.get("1:2:1"), "correct");
  assert.ok(first.changedWordStates.some((change) => change.key === "1:2:3" && change.state === "CONFIRMED_ERROR"));
  assert.equal(first.reading?.position, 2);
  assert.equal(first.progressionWords, 2);

  // Going on without correcting it is not followed.
  const ignored = matcher.feed("مالك يوم الدين", "item-2", true);
  assert.equal(ignored.reading?.position, 2);
  assert.equal(ignored.wordFeedback.has("1:4:1"), false);

  const corrected = matcher.feed("رب العالمين الرحمن الرحيم مالك يوم الدين", "item-3", true);
  assert.equal(corrected.wordFeedback.get("1:2:3"), "corrected");
  assert.equal(corrected.reading?.verseKey, "1:4");
  assert.deepEqual(matcher.finish(), {
    wordsRecited: 9,
    totalWords: 9,
    confirmedMistakes: 1,
    skippedWords: 0,
    correctedWords: 1,
    peekedWords: 0,
  });
});

test("Native matcher takes a single short word the recognizer dropped as heard", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  matcher.feed("الحمد لله العالمين الرحمن الرحيم", "item-1", true);
  const result = matcher.feed("مالك يوم الدين", "item-2", true);
  assert.equal(result.wordFeedback.get("1:2:3"), "correct");
  assert.equal(result.reading?.verseKey, "1:4");
  const summary = matcher.finish();
  assert.equal(summary.confirmedMistakes, 0);
  assert.equal(summary.skippedWords, 0);
});

test("Native matcher stops at words left out, and never counts them as skipped", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  matcher.feed("الحمد الرحمن الرحيم", "item-1", true);
  const result = matcher.feed("مالك يوم الدين", "item-2", true);
  assert.equal(result.wordFeedback.get("1:2:2"), "mistake");
  assert.equal(result.reading?.position, 1);
  for (const key of ["1:2:3", "1:2:4", "1:3:1"]) assert.equal(result.wordFeedback.has(key), false);
  const summary = matcher.finish();
  assert.equal(summary.skippedWords, 0);
  assert.equal(summary.confirmedMistakes, 1);
});

test("Native hint on the word a reader is stopped on lets him go on once he reads it", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  assert.equal(matcher.feed("الحمد لله الدين", "item-1", true).wordFeedback.get("1:2:3"), "mistake");
  assert.equal(matcher.peek(1)?.wordFeedback.get("1:2:3"), "peeked");
  const result = matcher.feed("رب العالمين الرحمن الرحيم", "item-2", true);
  assert.equal(result.wordFeedback.get("1:2:3"), "peeked");
  assert.equal(result.reading?.verseKey, "1:3");
  const summary = matcher.finish();
  assert.equal(summary.confirmedMistakes, 1);
  assert.equal(summary.peekedWords, 1);
  assert.equal(summary.correctedWords, 0);
});

test("Native hint reveals the words after the reading pointer as peeked, not correct", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  matcher.feed("الحمد لله", "item-1", true);
  assert.equal(matcher.peek(1)?.wordFeedback.get("1:2:3"), "peeked");
  const more = matcher.peek(2);
  assert.deepEqual(["1:2:3", "1:2:4", "1:3:1"].map((key) => more?.wordFeedback.get(key)), ["peeked", "peeked", "peeked"]);
  const summary = matcher.finish();
  assert.equal(summary.peekedWords, 3);
  assert.equal(summary.confirmedMistakes, 0);
});

test("Native matcher lists flagged words for an assignment submission", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  matcher.feed("الحمد لله قال العالمين الرحمن الرحيم", "item-1", true);
  matcher.feed("مالك يوم الدين", "item-2", true);
  matcher.finish();
  assert.deepEqual(matcher.flaggedWords(), [{ key: "1:2:3", kind: "mistake" }]);
});

test("Native matcher shows an immediate self-correction as corrected", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  const result = matcher.feed("الحمد لله قال رب العالمين", "item-1", true);
  assert.equal(result.wordFeedback.get("1:2:3"), "corrected");
  assert.equal(matcher.finish().correctedWords, 1);
});

test("Native matcher counts a wrong word the session ended on as a mistake", () => {
  const matcher = new NativeQuranLiveMatcher(fatihaWords);
  matcher.feed("الحمد لله قال العالمين", "item-1", true);
  const summary = matcher.finish();
  assert.equal(summary.confirmedMistakes, 1);
  assert.equal(summary.wordsRecited, 2);
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

test("WebSocket disconnect during authorization rejects start, stops early capture and sends no audio", async () => {
  const rig = makeRig();
  const starting = rig.controller.start("token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  socket.open();
  rig.recorders[0]?.callback?.({ buffer: monoBuffer([0.1, 0.2]) });
  socket.disconnect();

  await assert.rejects(starting);
  assert.equal(rig.recorders[0]?.stopped, true);
  assert.equal(socket.sent.some((item) => JSON.parse(item).t === "audio"), false);
  assert.equal(rig.states.at(-1), "error");
});

test("audio captured before the provider is ready is buffered, then flushed in order before live audio", async () => {
  // Exact sample values: filtering and gain are covered by their own tests.
  const rig = makeRig(true, undefined, { conditionAudio: false });
  const starting = rig.controller.start("token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  const recorder = rig.recorders[0];
  assert.equal(recorder?.started, true);
  socket.open();
  recorder?.callback?.({ buffer: monoBuffer([0.5]) });
  recorder?.callback?.({ buffer: monoBuffer([-0.5]) });
  assert.equal(socket.sent.filter((item) => JSON.parse(item).t === "audio").length, 0);
  socket.receive({ t: "ready", audioSampleRateHz: 24_000 });
  await starting;
  recorder?.callback?.({ buffer: monoBuffer([0.25]) });

  const audio = socket.sent.map((item) => JSON.parse(item)).filter((item) => item.t === "audio");
  assert.deepEqual(audio.map((item) => item.audio), [[0.5], [-0.5], [0.25]].map((samples) => pcmBase64(samples)));
  assert.equal(rig.states.at(-1), "recording");
  await rig.controller.dispose();
});

test("pre-ready audio buffer is bounded and keeps the most recent audio", async () => {
  const rig = makeRig(true, undefined, { conditionAudio: false });
  const starting = rig.controller.start("token", "session-1");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const socket = rig.sockets[0];
  assert.ok(socket);
  socket.open();
  // Twelve one-second chunks exceed the ten-second bound.
  for (let second = 0; second < 12; second += 1) {
    rig.recorders[0]?.callback?.({ buffer: monoBuffer(new Array(24_000).fill(second / 100)) });
  }
  socket.receive({ t: "ready", audioSampleRateHz: 24_000 });
  await starting;

  const audio = socket.sent.map((item) => JSON.parse(item)).filter((item) => item.t === "audio");
  assert.equal(audio.length, 10);
  assert.equal(audio[0].audio, pcmBase64(new Array(24_000).fill(0.02)));
  await rig.controller.dispose();
});

test("keepalive pings continue while paused, and a silent gateway reconnects then fails closed", async () => {
  const rig = makeRig(true, undefined, {
    keepaliveIntervalMs: 10,
    gatewaySilenceTimeoutMs: 45,
    reconnectDelaysMs: [15],
    maxReconnects: 1,
    readyTimeoutMs: 20,
  });
  const socket = await openSession(rig);
  rig.controller.pause();
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  assert.ok(socket.sent.some((item) => JSON.parse(item).t === "ping"));
  assert.equal(rig.states.at(-1), "paused");
  socket.receive({ t: "pong" });
  await new Promise<void>((resolve) => setTimeout(resolve, 30));
  assert.equal(rig.states.at(-1), "paused");
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  assert.equal(rig.states.at(-1), "reconnecting");
  assert.equal(rig.recorders[0]?.stopped, false);
  await new Promise<void>((resolve) => setTimeout(resolve, 80));
  assert.equal(rig.states.at(-1), "error");
  assert.equal(rig.recorders[0]?.stopped, true);
});

test("WebSocket disconnect during recording keeps the microphone and resumes the same session", async () => {
  const rig = makeRig(true, undefined, { reconnectDelaysMs: [10], maxReconnects: 2, conditionAudio: false });
  const socket = await openSession(rig);

  socket.disconnect();

  assert.equal(rig.recorders[0]?.stopped, false);
  assert.equal(rig.matches.length, 0);
  assert.equal(rig.states.at(-1), "reconnecting");
  rig.recorders[0]?.callback?.({ buffer: monoBuffer([0.25]) });

  await new Promise<void>((resolve) => setTimeout(resolve, 20));
  const next = rig.sockets[1];
  assert.ok(next);
  next.open();
  next.receive({ t: "authenticated" });
  next.receive({ t: "ready", audioSampleRateHz: 24_000 });
  await new Promise<void>((resolve) => setTimeout(resolve, 10));

  assert.equal(rig.states.at(-1), "recording");
  assert.equal(rig.recorders[0]?.stopped, false);
  assert.equal(rig.recorders.length, 1);
  const sent = next.sent.map((item) => JSON.parse(item));
  assert.equal(sent.find((item) => item.t === "auth")?.sessionId, "session-1");
  assert.equal(sent.some((item) => item.t === "audio"), true);
  await rig.controller.dispose();
});

test("a provider stream error reconnects, and a refusal does not", async () => {
  const rig = makeRig(true, undefined, { reconnectDelaysMs: [5], maxReconnects: 1, readyTimeoutMs: 15 });
  const socket = await openSession(rig);
  socket.receive({ t: "error", code: "PROVIDER_CLOSED", message: "انقطع اتصال خدمة التفريغ الحي" });
  assert.equal(rig.states.at(-1), "reconnecting");
  assert.equal(rig.recorders[0]?.stopped, false);

  await new Promise<void>((resolve) => setTimeout(resolve, 40));
  assert.equal(rig.states.at(-1), "error");
  assert.equal(rig.recorders[0]?.stopped, true);

  const refused = makeRig(true, undefined, { reconnectDelaysMs: [5], maxReconnects: 2 });
  const refusedSocket = await openSession(refused);
  refusedSocket.receive({ t: "error", code: "UNAUTHORIZED", message: "رمز الجلسة غير صالح" });
  assert.equal(refused.states.at(-1), "error");
  assert.equal(refused.sockets.length, 1);
  assert.equal(refused.recorders[0]?.stopped, true);
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

test("automatic gain raises quiet speech, leaves loud speech and never clips", async () => {
  const { AutoGain } = await import("../lib/recitation/auto-gain");
  const gain = new AutoGain();
  const peak = (samples: Float32Array) => Math.max(...Array.from(samples, Math.abs));
  let quiet = new Float32Array();
  for (let chunk = 0; chunk < 30; chunk += 1) quiet = gain.apply(Float32Array.from({ length: 240 }, (_, i) => 0.06 * Math.sin(i / 5)));
  assert.ok(peak(quiet) > 0.25, "quiet speech is raised");
  assert.ok(peak(quiet) <= 0.06 * 16 + 1e-6, "gain is bounded");
  const loud = gain.apply(Float32Array.from({ length: 240 }, (_, i) => 0.9 * Math.sin(i / 5)));
  assert.ok(peak(loud) <= 1, "loud speech never clips");
});

test("automatic gain raises recitation under the breath above a quiet room", async () => {
  const { AutoGain } = await import("../lib/recitation/auto-gain");
  const gain = new AutoGain();
  const peak = (samples: Float32Array) => Math.max(...Array.from(samples, Math.abs));
  // A quiet room first, then a whisper at 1% of full scale.
  for (let chunk = 0; chunk < 20; chunk += 1) gain.apply(Float32Array.from({ length: 240 }, (_, i) => 0.001 * Math.sin(i * 1.7)));
  let whisper = new Float32Array();
  for (let chunk = 0; chunk < 30; chunk += 1) whisper = gain.apply(Float32Array.from({ length: 240 }, (_, i) => 0.01 * Math.sin(i / 5)));
  assert.ok(peak(whisper) > 0.1, "a whisper is raised well above its recorded level");
});

test("speech filter keeps the speech band and removes hiss above it and DC below it", async () => {
  const { SpeechFilter } = await import("../lib/recitation/speech-filter");
  const rate = 24_000;
  const level = (hz: number, offset = 0) => {
    const filter = new SpeechFilter();
    let out = new Float32Array();
    // Several chunks, so the filter state carries over and settles.
    for (let chunk = 0; chunk < 10; chunk += 1) {
      out = filter.apply(Float32Array.from({ length: 2_400 }, (_, i) => offset + Math.sin((2 * Math.PI * hz * (chunk * 2_400 + i)) / rate)), rate);
    }
    return Math.max(...out.map(Math.abs));
  };
  assert.ok(level(1_000) > 0.95, "speech passes");
  assert.ok(level(10_000) < 0.15, "hiss that would alias at 16 kHz is removed");
  assert.ok(level(1_000, 0.5) < 1.1, "DC offset is removed");
});
