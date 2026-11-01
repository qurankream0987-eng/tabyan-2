import assert from "node:assert/strict";
import { test } from "node:test";
import { pcm16ToWav } from "./recitationAudioRecorder";
import { mediaObjectPathSchema } from "../media/placementPlayback";

test("pcm16ToWav wraps 16-bit mono PCM in a playable WAV header", () => {
  const pcm = Buffer.alloc(48_000);
  const wav = pcm16ToWav(pcm, 24_000);
  assert.equal(wav.length, 44 + pcm.length);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt32LE(4), 36 + pcm.length);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 24_000);
  assert.equal(wav.readUInt32LE(28), 48_000);
  assert.equal(wav.readUInt32LE(40), pcm.length);
});

test("recitation audio paths are accepted for private media playback", () => {
  assert.equal(mediaObjectPathSchema.safeParse("/objects/uploads/recitation-audio/75957ff6-cbbd-4921-9a46-fa1f19bc1278").success, true);
  assert.equal(mediaObjectPathSchema.safeParse("/objects/uploads/recitation-audio/../x").success, false);
});
