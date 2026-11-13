import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalTranscriptEvent, SpeechRecognitionProviderEvents } from "../types";
import { CtcDecoder, type CtcWord } from "./ctcDecoder";
import { MODEL_SAMPLE_RATE_HZ, pcm16ToModelInput } from "./pcm";
import { FRAME_SECONDS, type Transcriber } from "./tilawiModel";
import { TILAWI_INPUT_SAMPLE_RATE_HZ, TilawiStreamingProvider } from "./TilawiStreamingProvider";
import { WordStabilizer } from "./wordStabilizer";

const settle = () => new Promise((resolve) => setImmediate(resolve));

/** 100 ms of 24 kHz PCM16, loud enough to count as speech (or silent, or at `amplitude`). */
function chunk(silent = false, amplitude = 3000): string {
  const samples = TILAWI_INPUT_SAMPLE_RATE_HZ / 10;
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) pcm.writeInt16LE(silent ? 0 : (i % 2 ? amplitude : -amplitude), i * 2);
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

  preferred: readonly string[] | undefined;
  async transcribe(audio: Float32Array, preferred?: readonly string[]): Promise<CtcWord[]> {
    this.calls += 1;
    this.preferred = preferred;
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
  const feed = async (count: number, silent = false, amplitude?: number) => {
    for (let i = 0; i < count; i++) {
      seconds += 0.1;
      model.heardUntilSeconds = seconds;
      provider.appendAudio(chunk(silent, amplitude));
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
  for (const event of h.transcripts) {
    assert.deepEqual(event.wordConfidences, event.text.split(" ").filter(Boolean).map(() => 1), "one confidence per word");
  }
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

test("recitation under the breath in a quiet room is decoded", async () => {
  const model = new TimelineModel(TIMELINE.map((word) => ({ ...word, start: word.start + 1, end: word.end + 1 })));
  const h = harness(model);
  h.provider.connect();
  await settle();
  // A second of a quiet room, then recitation at about 0.15% of full scale.
  await h.feed(10, false, 10);
  await h.feed(30, false, 50);
  await h.feed(10, true);
  const heard = h.transcripts.filter((event) => event.isFinal).map((event) => event.text).join(" ");
  assert.equal(heard, "بسم الله الرحمن الرحيم");
  assert.ok(h.transcripts.filter((event) => event.isFinal).every((event) => event.confirmationEligible === true));
});

const word = (text: string, startSeconds: number, endSeconds: number) => ({ text, startSeconds, endSeconds, confidence: 0.9 });

test("a pause commit does not settle a word whose first letter is all that is heard yet", () => {
  // Fast recitation: only "و" of "وعلى" has been decoded when the client asks to settle.
  const stabilizer = new WordStabilizer();
  const first = stabilizer.update([word("سمعهم", 0.2, 0.8), word("و", 1.0, 1.08)], 1.3, "flush");
  assert.deepEqual(first.settled.map((w) => w.text), ["سمعهم"]);
  assert.deepEqual(first.pending.map((w) => w.text), ["و"]);
  const next = stabilizer.update([word("وعلى", 1.0, 1.5), word("أبصارهم", 1.6, 2.4)], 2.6, "flush");
  assert.deepEqual(next.settled.map((w) => w.text), ["وعلى"]);
});

test("a word that is not the expected one is kept back until a second decode still says it", () => {
  const stabilizer = new WordStabilizer();
  const expected = ["فكذبنا", "بها"];
  const first = stabilizer.update([word("فقلنا", 0.2, 0.9), word("بها", 1.0, 1.4)], 2.2, "agreed", expected);
  assert.deepEqual(first.settled.map((item) => item.text), []);
  assert.deepEqual(first.pending.map((item) => item.text), ["فقلنا", "بها"]);

  const corrected = stabilizer.update([word("فكذبنا", 0.2, 0.9), word("بها", 1.0, 1.4)], 2.4, "agreed", expected);
  assert.deepEqual(corrected.settled.map((item) => item.text), ["فكذبنا", "بها"]);
});

test("a mistake that the next decode repeats is settled, so the reader can be stopped on it", () => {
  const stabilizer = new WordStabilizer();
  const expected = ["فكذبنا"];
  const first = stabilizer.update([word("فقلنا", 0.2, 0.9)], 2.2, "agreed", expected);
  assert.deepEqual(first.settled.map((item) => item.text), []);
  const repeated = stabilizer.update([word("فقلنا", 0.2, 0.9)], 2.4, "agreed", expected);
  assert.deepEqual(repeated.settled.map((item) => item.text), ["فقلنا"]);
});

test("the start of a long expected word is not settled as a word of its own", () => {
  // The model shows the first letters of a drawn-out word as a short word for a few decodes.
  const stabilizer = new WordStabilizer();
  const expected = ["خلقك", "فسواك"];
  assert.deepEqual(stabilizer.update([word("خلق", 0.8, 0.9)], 1.2, "agreed", expected).settled, []);
  // Two decodes agree and the word is clear of the edge, but little audio has followed it yet.
  assert.deepEqual(stabilizer.update([word("خلق", 0.8, 0.9)], 1.6, "agreed", expected).settled, []);
  const whole = stabilizer.update([word("خلقك", 0.8, 1.7), word("فس", 1.8, 2.0)], 2.2, "agreed", expected);
  assert.deepEqual(whole.settled.map((item) => item.text), ["خلقك"]);
});

test("expected words are handed to the next decode and an empty list clears them", async () => {
  const model = new TimelineModel(TIMELINE);
  const h = harness(model);
  h.provider.connect();
  await settle();
  h.provider.noteExpected(["بسم", "الله", "الرحمن"]);
  await h.feed(5);
  assert.deepEqual(model.preferred, ["بسم", "الله", "الرحمن"]);
  h.provider.noteExpected([]);
  await h.feed(5);
  assert.deepEqual(model.preferred, []);
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
