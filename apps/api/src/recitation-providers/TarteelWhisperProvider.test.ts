import assert from "node:assert/strict";
import test from "node:test";
import { TarteelWhisperProvider } from "./TarteelWhisperProvider";
import type { TarteelTranscriber } from "./TarteelWhisperWorker";
import type { SpeechRecognitionProviderEvents } from "./types";

function makeEvents(): SpeechRecognitionProviderEvents & {
  readyCount: number;
  forwardedBytes: number[];
  acceptedCount: number;
  commitAcceptedCount: number;
  providerEventCount: number;
  transcripts: { text: string; isFinal: boolean; itemId?: string }[];
  errors: string[];
} {
  const events = {
    readyCount: 0,
    forwardedBytes: [] as number[],
    acceptedCount: 0,
    commitAcceptedCount: 0,
    providerEventCount: 0,
    transcripts: [] as { text: string; isFinal: boolean; itemId?: string }[],
    errors: [] as string[],
    onReady() { events.readyCount += 1; },
    onTranscript(event: { text: string; isFinal: boolean; itemId?: string }) { events.transcripts.push(event); },
    onProviderEvent() { events.providerEventCount += 1; },
    onAudioForwarded(bytes: number) { events.forwardedBytes.push(bytes); },
    onAudioAccepted() { events.acceptedCount += 1; },
    onCommitAccepted() { events.commitAcceptedCount += 1; },
    onError(message: string) { events.errors.push(message); },
    onClose() {},
  };
  return events;
}

test("Tarteel adapter emits a final transcript from a committed PCM utterance", async () => {
  let completeTranscription!: (result: { text: string; inferenceMs: number; audioMs: number }) => void;
  const transcription = new Promise<{ text: string; inferenceMs: number; audioMs: number }>((resolve) => {
    completeTranscription = resolve;
  });
  const worker: TarteelTranscriber = {
    async start() {},
    async transcribe(pcm, sampleRateHz) {
      assert.equal(sampleRateHz, 24_000);
      assert.equal(pcm.length, 4);
      return transcription;
    },
  };
  const events = makeEvents();
  const provider = new TarteelWhisperProvider(events, worker);
  provider.connect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(provider.isOpen(), true);
  provider.appendAudio(Buffer.from([1, 0, 2, 0]).toString("base64"));
  assert.deepEqual(events.forwardedBytes, [4]);
  provider.commit(true);
  assert.equal(events.acceptedCount, 0);
  assert.equal(events.commitAcceptedCount, 0);
  completeTranscription({ text: "بسم الله", inferenceMs: 25, audioMs: 1 });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(events.readyCount, 1);
  assert.equal(events.acceptedCount, 1);
  assert.equal(events.commitAcceptedCount, 1);
  assert.equal(events.providerEventCount, 1);
  assert.deepEqual(events.transcripts.map(({ text, isFinal }) => ({ text, isFinal })), [
    { text: "بسم الله", isFinal: true },
  ]);
  provider.close();
  assert.equal(provider.isOpen(), false);
});

test("Tarteel adapter fails closed when the local worker cannot start", async () => {
  const worker: TarteelTranscriber = {
    async start() { throw new Error("missing local model"); },
    async transcribe() { throw new Error("unreachable"); },
  };
  const events = makeEvents();
  const provider = new TarteelWhisperProvider(events, worker);
  provider.connect();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(provider.isOpen(), false);
  assert.deepEqual(events.errors, ["missing local model"]);
  provider.close();
});

test("ten-second windows ignore short VAD commits and timestamp-deduplicate only overlapping audio", async () => {
  const sizes: number[] = [];
  const worker: TarteelTranscriber = {
    async start() {},
    async transcribe(pcm) {
      sizes.push(pcm.length);
      return {
        text: "الرحيم", inferenceMs: 1, audioMs: 10000,
        words: sizes.length === 1
          ? [{ word: "الرحيم", start: 8.5, end: 9 }]
          : [{ word: "الرحيم", start: 0.5, end: 1 }, { word: "الرحيم", start: 3, end: 4 }],
      };
    },
  };
  const events = makeEvents();
  const provider = new TarteelWhisperProvider(events, worker);
  provider.connect(); provider.connect();
  await new Promise((r) => setImmediate(r));
  provider.appendAudio(Buffer.alloc(48000).toString("base64"));
  provider.commit();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(sizes, []);
  provider.appendAudio(Buffer.alloc(48000 * 9).toString("base64"));
  await new Promise((r) => setImmediate(r));
  provider.appendAudio(Buffer.alloc(48000 * 8).toString("base64"));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(sizes, [480000, 480000]);
  assert.equal(events.readyCount, 1);
  assert.deepEqual(events.transcripts.map((t) => t.text), ["الرحيم", "الرحيم"]);
  assert.ok(events.transcripts.every((t) => t.isFinal));
  provider.close();
});

test("explicit final flush waits for queued decoding and the remainder; duplicate flush is ignored", async () => {
  const requests: { pcm: Buffer; resolve: (result: { text: string; inferenceMs: number; audioMs: number; words: { word: string; start: number; end: number }[] }) => void }[] = [];
  const worker: TarteelTranscriber = {
    async start() {},
    transcribe(pcm) { return new Promise((resolve) => requests.push({ pcm, resolve })); },
  };
  const events = makeEvents();
  const finalized: (string | undefined)[] = [];
  events.onFinalized = (id) => finalized.push(id);
  const provider = new TarteelWhisperProvider(events, worker);
  provider.connect(); await new Promise((r) => setImmediate(r));
  provider.appendAudio(Buffer.alloc(480000).toString("base64"));
  await new Promise((r) => setImmediate(r));
  provider.appendAudio(Buffer.alloc(48000).toString("base64"));
  provider.commit(true, "end-1"); provider.commit(true, "end-2");
  assert.deepEqual(finalized, []);
  requests[0].resolve({ text: "بسم", inferenceMs: 1, audioMs: 10000, words: [{ word: "بسم", start: 0, end: 1 }] });
  await new Promise((r) => setImmediate(r));
  assert.equal(requests.length, 2);
  assert.equal(requests[1].pcm.length, 48000 * 3);
  assert.deepEqual(finalized, []);
  requests[1].resolve({ text: "الله", inferenceMs: 1, audioMs: 3000, words: [{ word: "الله", start: 2.3, end: 2.5 }] });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(events.transcripts.map((t) => t.text), ["بسم", "الله"]);
  assert.deepEqual(finalized, ["end-1"]);
  provider.close();
});

test("failed decoding never acknowledges successful finalization", async () => {
  const events = makeEvents();
  let finalized = false;
  events.onFinalized = () => { finalized = true; };
  const provider = new TarteelWhisperProvider(events, {
    async start() {},
    async transcribe() { throw new Error("decode failed"); },
  });
  provider.connect(); await new Promise((r) => setImmediate(r));
  provider.appendAudio(Buffer.alloc(48000).toString("base64"));
  provider.commit(true, "end");
  await new Promise((r) => setImmediate(r));
  assert.equal(finalized, false);
  assert.equal(provider.isOpen(), false);
  assert.deepEqual(events.errors, ["decode failed"]);
  provider.close();
});