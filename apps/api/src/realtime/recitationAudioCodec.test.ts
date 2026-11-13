import assert from "node:assert/strict";
import { test } from "node:test";
import { AdpcmEncoder, decodeAdpcm, decodeMulaw, encodeMulaw } from "@workspace/tabyan-domain/recitation-audio-codec";

/** A voice-like signal at 16 kHz: a 180 Hz tone with harmonics under a slow envelope. */
function voice(samples: number) {
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const t = i / 16_000;
    const envelope = 0.3 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t));
    out[i] = envelope * (Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 540 * t) + 0.25 * Math.sin(2 * Math.PI * 1_260 * t)) / 1.75;
  }
  return out;
}

function signalToNoiseDb(source: Float32Array, decoded: Int16Array) {
  let signal = 0;
  let noise = 0;
  for (let i = 0; i < source.length; i += 1) {
    const sample = source[i] * 0x8000;
    signal += sample * sample;
    noise += (sample - decoded[i]) ** 2;
  }
  return 10 * Math.log10(signal / noise);
}

test("mu-law keeps one byte a sample and the voice it carried", () => {
  const source = voice(16_000);
  const bytes = encodeMulaw(source);
  assert.equal(bytes.length, source.length);
  assert.ok(signalToNoiseDb(source, decodeMulaw(bytes)) > 30);
});

test("ADPCM frames are four bits a sample and decode on their own", () => {
  const source = voice(16_000);
  const encoder = new AdpcmEncoder();
  const decoded = new Int16Array(source.length);
  const frames: Uint8Array[] = [];
  for (let offset = 0; offset < source.length; offset += 1_600) {
    const frame = encoder.encode(source.subarray(offset, offset + 1_600));
    assert.equal(frame.length, 3 + 800);
    frames.push(frame);
  }
  // Decoded in reverse order: no frame needs the one before it.
  for (let index = frames.length - 1; index >= 0; index -= 1) decoded.set(decodeAdpcm(frames[index]), index * 1_600);
  assert.ok(signalToNoiseDb(source, decoded) > 20);
});

test("silence and a frame cut short decode without throwing", () => {
  assert.equal(decodeAdpcm(new Uint8Array(2)).length, 0);
  assert.deepEqual([...decodeMulaw(encodeMulaw(new Float32Array(4)))], [0, 0, 0, 0]);
  assert.equal(decodeAdpcm(new AdpcmEncoder().encode(new Float32Array(5))).length, 6);
});
