import assert from "node:assert/strict";
import test from "node:test";
import { CtcDecoder, Lexicon, preferredWordSet } from "./ctcDecoder";
import { sharedLexicon } from "./tilawiModel";

// pieces: 0 blank, 1 ▁ب, 2 ي, 3 ف, 4 ت, 5 ▁ك, 6 ▁عندك, 7 ▁ذ, 8 لك, 9 ا, 10 ▁نهاية, 11 ▁ج
const VOCAB = {
  "0": "<blank>", "1": "▁ب", "2": "ي", "3": "ف", "4": "ت", "5": "▁ك", "6": "▁عندك",
  "7": "▁ذ", "8": "لك", "9": "ا", "10": "▁نهاية", "11": "▁ج",
};
const V = Object.keys(VOCAB).length;
const lexicon = new Lexicon(["بيت", "كفيت", "ذلك", "ذالك", "عندك", "جا"]);

/** Log-softmax frames from {id: probability} maps; the rest shares the remainder. */
function frames(steps: Array<Record<number, number>>): Float32Array {
  const out = new Float32Array(steps.length * V);
  steps.forEach((step, t) => {
    const given = Object.values(step).reduce((a, b) => a + b, 0);
    const rest = Math.max(1e-6, (1 - given) / (V - Object.keys(step).length));
    for (let id = 0; id < V; id++) out[t * V + id] = Math.log(step[id] ?? rest);
  });
  return out;
}

test("the lexicon folds hamza seats and alef maqsura and knows prefixes", () => {
  assert.ok(lexicon.isWord("بيت"));
  assert.ok(lexicon.isWord("عندك"));
  assert.ok(lexicon.advance("بي"));
  assert.equal(lexicon.advance("بي")?.terminal, false);
  assert.equal(lexicon.advance("فت"), null);
  assert.ok(new Lexicon(["آمنوا"]).isWord("امنوا"));
  assert.ok(new Lexicon(["هدى"]).isWord("هدي"));
});

test("constrained decoding spells a smeared word as the Quran word it sounds like", () => {
  const decoder = new CtcDecoder(VOCAB);
  // "ف" narrowly beats "ب" at the word start; only "بيت" is a word.
  const logprobs = frames([
    { 0: 0.9 },
    { 3: 0.45, 1: 0.40 },
    { 0: 0.9 },
    { 2: 0.9 },
    { 4: 0.9 },
    { 0: 0.9 },
  ]);
  // Greedy hears "فيت" (not a word), the constrained beam "بيت".
  assert.deepEqual(decoder.decode(logprobs, 6, V).map((w) => w.text), ["فيت"]);
  const words = decoder.decodeConstrained(logprobs, 6, V, { lexicon });
  assert.deepEqual(words.map((w) => w.text), ["بيت"]);
  assert.equal(words[0].startFrame, 1);
  assert.equal(words[0].endFrame, 5);
  assert.ok(words[0].confidence > 0.4 && words[0].confidence < 1);
});

test("a clearly heard word outside the lexicon is kept, not forced into a Quran word", () => {
  const decoder = new CtcDecoder(VOCAB);
  // "نهاية" is unmistakable; forcing it into "عندك" would cost far more than the penalty.
  const logprobs = frames([{ 0: 0.9 }, { 10: 0.98 }, { 0: 0.9 }, { 0: 0.9 }]);
  const words = decoder.decodeConstrained(logprobs, 4, V, { lexicon });
  assert.deepEqual(words.map((w) => w.text), ["نهاية"]);
});

test("the last word of a window may be an unfinished prefix", () => {
  const decoder = new CtcDecoder(VOCAB);
  const logprobs = frames([{ 7: 0.95 }, { 0: 0.9 }, { 9: 0.9 }]);
  const words = decoder.decodeConstrained(logprobs, 3, V, { lexicon });
  assert.deepEqual(words.map((w) => w.text), ["ذا"]);
});

test("a word that stops short before the next word costs the penalty, so the whole word wins when close", () => {
  const decoder = new CtcDecoder(VOCAB);
  // "ذ" then either "لك" (0.5) or a new word "ج" + "ا" (0.5): "ذلك" completes a word, "ذ جا" leaves "ذ" unfinished.
  const logprobs = frames([{ 7: 0.95 }, { 0: 0.9 }, { 8: 0.5, 11: 0.5 }, { 9: 0.6, 0: 0.3 }]);
  const words = decoder.decodeConstrained(logprobs, 4, V, { lexicon });
  assert.deepEqual(words.map((w) => w.text), ["ذلك"]);
});

test("an expected word wins a near miss, and a clearly different word is still heard", () => {
  const decoder = new CtcDecoder(VOCAB);
  const near = new Lexicon(["بيت", "كيت"]);
  const preferred = preferredWordSet(["بيت"]);
  // "ك" is a little more likely than "ب"; both "كيت" and "بيت" are Quran words here.
  const close = frames([{ 0: 0.9 }, { 5: 0.55, 1: 0.42 }, { 2: 0.9 }, { 4: 0.9 }, { 0: 0.9 }]);
  assert.deepEqual(decoder.decodeConstrained(close, 5, V, { lexicon: near }).map((w) => w.text), ["كيت"]);
  assert.deepEqual(
    decoder.decodeConstrained(close, 5, V, { lexicon: near, preferred }).map((w) => w.text),
    ["بيت"],
  );
  // The other word is unmistakable: the penalty must not hide a real mistake.
  const sure = frames([{ 0: 0.9 }, { 5: 0.99, 1: 0.01 }, { 2: 0.95 }, { 4: 0.95 }, { 0: 0.9 }]);
  assert.deepEqual(
    decoder.decodeConstrained(sure, 5, V, { lexicon: near, preferred }).map((w) => w.text),
    ["كيت"],
  );
});

test("a prefix of the expected word is not pushed off the path", () => {
  const decoder = new CtcDecoder(VOCAB);
  const logprobs = frames([{ 7: 0.95 }, { 0: 0.9 }, { 9: 0.9 }]);
  const words = decoder.decodeConstrained(logprobs, 3, V, { lexicon, preferred: preferredWordSet(["ذلك"]) });
  assert.deepEqual(words.map((w) => w.text), ["ذا"]);
});

test("the shared lexicon holds the Quran's words as the recognizer spells them", () => {
  const quran = sharedLexicon();
  assert.ok(quran.size > 14_000);
  for (const word of ["بسم", "الله", "الرحمن", "الرحيم", "ذلك", "أذاعوا", "بيت", "لاتبعتم", "آمنوا", "موسى", "عليهم"]) {
    assert.ok(quran.isWord(word), word);
  }
  assert.equal(quran.isWord("شوفيش"), false);
  assert.equal(quran.isWord("رتبععتم"), false);
});
