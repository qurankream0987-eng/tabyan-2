import { describe, expect, it } from "vitest";
import { deriveAiPhase, presentAiPhase, shouldAutoReconnect, type AiPhaseInput } from "./aiSessionPhase";
import { AudioQualityMonitor, frameStats } from "./audioQuality";

const base: AiPhaseInput = { recitation: "active", transport: "idle", preparing: false, reconnecting: false, aiEnabled: true };

describe("deriveAiPhase", () => {
  it.each([
    [{ recitation: "idle" as const }, "IDLE"],
    [{ preparing: true }, "PREPARING"],
    [{ transport: "connecting" as const }, "PREPARING"],
    [{ transport: "requesting_mic" as const }, "REQUESTING_MIC"],
    [{ transport: "listening" as const }, "LISTENING"],
    [{ transport: "stopping" as const }, "PROCESSING"],
    [{ transport: "listening" as const, recitation: "paused" as const }, "PAUSED"],
    [{ transport: "failed" as const }, "ERROR"],
    [{ transport: "failed" as const, reconnecting: true }, "RECONNECTING"],
    [{ recitation: "result" as const, transport: "failed" as const }, "COMPLETED"],
  ])("%o → %s", (patch, expected) => {
    expect(deriveAiPhase({ ...base, ...patch })).toBe(expected);
  });

  it("maps every phase to a single, text-labelled presentation", () => {
    expect(presentAiPhase("LISTENING").label).toBe("يستمع الآن");
    expect(presentAiPhase("IDLE").label).toBe("ابدأ التلاوة");
    expect(presentAiPhase("ERROR").canRetry).toBe(true);
  });

  it("without a live provider, an active session is shown as manual listening", () => {
    expect(deriveAiPhase({ ...base, aiEnabled: false, transport: "failed" })).toBe("LISTENING");
  });
});

describe("shouldAutoReconnect", () => {
  it("retries transient transport failures a bounded number of times", () => {
    expect(shouldAutoReconnect("transport", 0, "active")).toBe(true);
    expect(shouldAutoReconnect("timeout", 1, "active")).toBe(true);
    expect(shouldAutoReconnect("transport", 2, "active")).toBe(false);
  });

  it("never retries a denied microphone, server rejection, or paused session", () => {
    expect(shouldAutoReconnect("mic", 0, "active")).toBe(false);
    expect(shouldAutoReconnect("server", 0, "active")).toBe(false);
    expect(shouldAutoReconnect("transport", 0, "paused")).toBe(false);
  });
});

function feed(monitor: AudioQualityMonitor, frames: number, rms: (i: number) => number, clippedRatio = 0) {
  let snapshot = monitor.snapshot();
  for (let i = 0; i < frames; i += 1) snapshot = monitor.observe({ rms: rms(i), clippedRatio });
  return snapshot;
}

describe("AudioQualityMonitor", () => {
  it("stays reliable for normal recitation with natural pauses", () => {
    const monitor = new AudioQualityMonitor();
    const snapshot = feed(monitor, 80, (i) => (i % 8 < 6 ? 0.08 : 0.003));
    expect(snapshot).toEqual({ issue: null, reliable: true });
  });

  it("flags a quiet reciter as low volume and unreliable", () => {
    const monitor = new AudioQualityMonitor();
    expect(feed(monitor, 60, (i) => (i % 5 === 0 ? 0.004 : 0.011))).toEqual({ issue: "low_volume", reliable: false });
  });

  it("flags repeated clipping", () => {
    const monitor = new AudioQualityMonitor();
    expect(feed(monitor, 40, () => 0.3, 0.05).issue).toBe("clipping");
  });

  it("flags a noise floor that never drops, even between words", () => {
    const monitor = new AudioQualityMonitor();
    expect(feed(monitor, 60, (i) => (i % 6 < 4 ? 0.09 : 0.03)).issue).toBe("noisy");
  });

  it("does not flicker: one bad moment does not raise, and recovery clears after sustained good audio", () => {
    const monitor = new AudioQualityMonitor();
    feed(monitor, 40, (i) => (i % 8 < 6 ? 0.08 : 0.003));
    expect(monitor.observe({ rms: 0.3, clippedRatio: 0.2 }).issue).toBeNull();
    feed(monitor, 40, () => 0.3, 0.05);
    expect(monitor.snapshot().issue).toBe("clipping");
    expect(feed(monitor, 80, (i) => (i % 8 < 6 ? 0.08 : 0.003)).issue).toBeNull();
  });

  it("computes frame statistics from PCM samples", () => {
    const samples = new Int16Array([32767, -32768, 0, 0]);
    const stats = frameStats(samples);
    expect(stats.clippedRatio).toBe(0.5);
    expect(stats.rms).toBeCloseTo(Math.sqrt(0.5), 2);
  });
});
