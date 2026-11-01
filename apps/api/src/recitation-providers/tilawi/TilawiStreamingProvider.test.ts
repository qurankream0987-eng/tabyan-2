import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalTranscriptEvent, SpeechRecognitionProviderEvents } from "../types";
import { CtcDecoder, type CtcWord } from "./ctcDecoder";
import { MODEL_SAMPLE_RATE_HZ, pcm16ToModelInput } from "./pcm";
import { FRAME_SECONDS, type Transcriber } from "./tilawiModel";
import { TILAWI_INPUT_SAMPLE_RATE_HZ, TilawiStreamingProvider } from "./TilawiStreamingProvider";

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** 100 ms of 24 kHz PCM16, loud enough to count as speech (or silent). */
function chunk(silent = false): string {
  const samples = TILAWI_INPUT_SAMPLE_RATE_HZ / 10;
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) pcm.writeInt16LE(silent ? 0 : (i % 2 ? 3000 : -3000), i * 2);
  return pcm.toString("base64");
}

/**
 * A fake model that "hears" a fixed timeline of words (absolute seconds) and
 * reports those inside each decoded window, the way the real model would.
 */
class TimelineModel implements Transcriber {
  calls = 0;
  heardUntilSeconds = 0;
  constructor(private readonly timeline: Array<{ text: string; start: number; end: number }>) {}

  async transcribe(audio: Float32Array): Promise<CtcWord[]> {
    this.calls += 1;
    const end = this.heardUntilSeconds;
    const start = end - audio.length / MODEL_SAMPLE_RATE_HZ;
    return this.timeline
      .filter((word) => word.start >= start - 1e-6 && word.start < end)
      .map((word) => ({
        text: word.text,
        startFrame: Math.round((word.start - start) / FRAME_SECONDS),
        endFrame: Math.round((Math.min(word.end, end) - start) / FRAME_SECONDS),
        confidence: 1,
      }));
  }
}

function harness(model: TimelineModel) {
  const transcripts: CanonicalTranscriptEvent[] = [];
  const finalized: Array<string | undefined> = [];
  const errors: string[] = [];
  let ready = false;
  const events: SpeechRecognitionProviderEvents = {
    onReady: () => { ready = true; },
    onTranscript: (event) => transcripts.push(event),
    onProviderEvent: () => {},
    onFinalized: (id) => finalized.push(id),
    onError: (message) => errors.push(message),
    onClose: () => {},
  };
  const provider = new TilawiStreamingProvider(events, async () => model);
  let seconds = 0;
  const feed = async (count: number, silent = false) => {
    for (let i = 0; i < count; i++) {
      seconds += 0.1;
      model.heardUntilSeconds = seconds;
      provider.appendAudio(chunk(silent));
      await settle();
    }
  };
  return { provider, transcripts, finalized, errors, feed, isReady: () => ready };
}

const TIMELINE = [
  { text: "بسم", start: 0.2, end: 0.6 },
  { text: "الله", start: 0.7, end: 1.1 },
  { text: "الرحمن", start: 1.3, end: 1.9 },
  { text: "الرحيم", start: 2.0, end: 2.6 },
];

test("CTC decoding keeps words and their frame spans", () => {
  const vocab = { "0": "<unk>", "1": "▁بس", "2": "م", "3": "▁الله", "4": "<blank>" };
  const decoder = new CtcDecoder(vocab);
  assert.equal(decoder.blankId, 4);
  // frames: بس بس م blank الله الله blank
  const ids = [1, 1, 2, 4, 3, 3, 4];
  const logprobs = new Float32Array(ids.length * 5).fill(-10);
  ids.forEach((id, t) => { logprobs[t * 5 + id] = 0; });
  assert.deepEqual(decoder.decode(logprobs, ids.length, 5), [
    { text: "بسم", startFrame: 0, endFrame: 3, confidence: 1 },
    { text: "الله", startFrame: 4, endFrame: 6, confidence: 1 },
  ]);
});

test("24 kHz PCM16 becomes 16 kHz float samples", () => {
  const pcm = Buffer.alloc(2400 * 2);
  for (let i = 0; i < 2400; i++) pcm.writeInt16LE(16384, i * 2);
  const out = pcm16ToModelInput(pcm, 24_000);
  assert.equal(out.length, 1600);
  assert.ok(Math.abs(out[800] - 0.5) < 1e-6);
});

test("words are emitted once, in order, as settled finals with a revisable tail", async () => {
  const model = new TimelineModel(TIMELINE);
  const h = harness(model);
  h.provider.connect();
  await settle();
  assert.equal(h.isReady(), true);
  await h.feed(30);
  // The pause after the last word lets it settle; a pending tail is never skipped as silence.
  await h.feed(10, true);

  const finals = h.transcripts.filter((event) => event.isFinal);
  assert.deepEqual(finals.map((event) => event.text).join(" ").split(" "), ["بسم", "الله", "الرحمن", "الرحيم"]);
  const itemIds = finals.map((event) => event.itemId);
  assert.equal(new Set(itemIds).size, itemIds.length, "each item is finalized exactly once");
  assert.ok(h.transcripts.some((event) => !event.isFinal && event.text), "a tail is shown before it settles");
  for (const event of h.transcripts) assert.equal(event.textIsDelta, false);
  assert.deepEqual(h.errors, []);
});

test("a final commit settles the tail and acknowledges with its commit id", async () => {
  const model = new TimelineModel(TIMELINE);
  const h = harness(model);
  h.provider.connect();
  await settle();
  await h.feed(26);
  h.provider.commit(true, "commit-1");
  await settle();
  await settle();

  const heard = h.transcripts.filter((event) => event.isFinal).map((event) => event.text).join(" ");
  assert.equal(heard, "بسم الله الرحمن الرحيم");
  assert.deepEqual(h.finalized, ["commit-1"]);
  h.provider.appendAudio(chunk());
  assert.equal(h.finalized.length, 1, "audio after the final commit is ignored");
});

test("silence is not decoded", async () => {
  const model = new TimelineModel([]);
  const h = harness(model);
  h.provider.connect();
  await settle();
  await h.feed(50, true);
  assert.equal(model.calls, 0);
  assert.deepEqual(h.transcripts, []);
});

test("a model that fails to load reports an error and closes", async () => {
  const errors: string[] = [];
  let closeCode: number | undefined;
  const provider = new TilawiStreamingProvider({
    onReady: () => assert.fail("must not become ready"),
    onTranscript: () => {},
    onProviderEvent: () => {},
    onError: (message) => errors.push(message),
    onClose: (code) => { closeCode = code; },
  }, () => Promise.reject(new Error("model missing")));
  provider.connect();
  await settle();
  assert.deepEqual(errors, ["model missing"]);
  assert.equal(closeCode, 1011);
  assert.equal(provider.isOpen(), false);
});
