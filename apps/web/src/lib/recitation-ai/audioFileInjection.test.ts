import { describe, expect, it } from "vitest";
import { PCM_SAMPLE_RATE, pcm16Chunks, resampleToMonoPcm16 } from "./audioFileInjection";

describe("development audio-file PCM conversion", () => {
  it("keeps 24 kHz mono samples and converts them to signed PCM16", () => {
    const pcm = resampleToMonoPcm16(
      [new Float32Array([0, 0.5, -0.5, 1])],
      PCM_SAMPLE_RATE,
    );

    expect([...pcm]).toEqual([0, 16_384, -16_384, 32_767]);
  });

  it("downmixes stereo and resamples from 48 kHz to 24 kHz", () => {
    const left = new Float32Array([0.5, 0.5, -0.5, -0.5]);
    const right = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const pcm = resampleToMonoPcm16([left, right], 48_000);

    expect([...pcm]).toEqual([16_384, 0]);
  });

  it("splits a recording into bounded 100 ms frames, including its final short frame", () => {
    const chunks = [...pcm16Chunks(new Int16Array(4_801))];

    expect(chunks.map((chunk) => chunk.length)).toEqual([2_400, 2_400, 1]);
  });

  it("rejects empty or invalid audio", () => {
    expect(() => resampleToMonoPcm16([], 24_000)).toThrow();
    expect(() => resampleToMonoPcm16([new Float32Array([0])], 0)).toThrow();
  });
});
