import { describe, expect, it } from "vitest";
import { RollingSamples, UtteranceSegmenter } from "./latencyTelemetry";

describe("RollingSamples", () => {
  it("keeps a bounded window but remembers the session-wide worst value", () => {
    const samples = new RollingSamples(4);
    [900, 10, 20, 30, 40, 50].forEach((value) => samples.push(value));
    expect(samples.count).toBe(6);
    expect(samples.percentile(0.5)).toBe(30);
    expect(samples.min()).toBe(20);
    expect(samples.max()).toBe(900);
  });

  it("ignores non-finite samples", () => {
    const samples = new RollingSamples();
    samples.push(Number.NaN);
    samples.push(Infinity);
    expect(samples.percentile(0.5)).toBeNull();
  });
});

describe("UtteranceSegmenter", () => {
  const frame = 100;
  const run = (segmenter: UtteranceSegmenter, levels: number[]) =>
    levels.map((rms, i) => segmenter.observe(rms, i * frame));

  it("commits after sustained silence following speech", () => {
    const decisions = run(new UtteranceSegmenter(), [...Array(10).fill(0.1), ...Array(8).fill(0.001)]);
    expect(decisions.filter(Boolean)).toEqual(["silence"]);
  });

  it("never commits during pure silence", () => {
    expect(run(new UtteranceSegmenter(), Array(100).fill(0.001)).filter(Boolean)).toEqual([]);
  });

  it("bounds continuous recitation that never reaches the silence threshold", () => {
    const segmenter = new UtteranceSegmenter();
    // 20s كلام متصل بلا صمت ≥700ms — مثال التلاوة المتصلة مع ضجيج خلفي.
    const decisions = run(segmenter, Array(200).fill(0.08));
    const commits = decisions.map((d, i) => (d ? i * frame : null)).filter((t) => t !== null) as number[];
    expect(commits.length).toBeGreaterThanOrEqual(2);
    expect(commits[0]).toBeLessThanOrEqual(8_000);
    expect(decisions.filter(Boolean).every((d) => d === "hard")).toBe(true);
  });

  it("prefers a short dip between words once the utterance is long", () => {
    const segmenter = new UtteranceSegmenter();
    const levels = Array(60).fill(0.1);
    levels[45] = 0.01; // توقف قصير بين كلمتين بعد 4.5s
    const decisions = run(segmenter, levels);
    expect(decisions[45]).toBe("dip");
    expect(segmenter.forcedCommitCount).toBe(1);
  });
});
