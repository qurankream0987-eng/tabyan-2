import { afterEach, describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { runSessionAction, waitForCleanSocketClose } from "./session-audio-lifecycle";
import { RecitationFeedback } from "./recitation-feedback";
import { PROCESSOR_SOURCE } from "@/lib/recitation-ai/pcm-worklet-source";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

class Socket extends EventTarget {
  readyState = 1;
  close(code = 1005) {
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event("close"), { code }));
  }
  message(t: string) {
    this.dispatchEvent(Object.assign(new Event("message"), { data: JSON.stringify({ t }) }));
  }
  get ws() { return this as unknown as WebSocket; }
}

afterEach(() => vi.useRealTimers());

describe("session start/end audio ordering", () => {
  it("double start taps share initialization and wait for the READY audio path", async () => {
    const play = vi.fn();
    const feedback = new RecitationFeedback(play);
    const ready = deferred();
    const flight = { current: null as Promise<void> | null };
    const initialize = vi.fn(async () => {
      feedback.begin("s");
      await ready.promise;
      await feedback.providerReady();
    });
    const first = runSessionAction(flight, initialize);
    const second = runSessionAction(flight, initialize);
    expect(second).toBe(first);
    expect(initialize).toHaveBeenCalledOnce();
    expect(play).not.toHaveBeenCalled();
    ready.resolve(); await first;
    await feedback.providerReady();
    expect(play.mock.calls).toEqual([["start"]]);
  });

  it("rejection before READY is silent; a successful retry starts exactly once", async () => {
    const play = vi.fn();
    const feedback = new RecitationFeedback(play);
    feedback.begin("s");
    feedback.providerFailed();
    expect(play).not.toHaveBeenCalled();
    await feedback.providerReady(); await feedback.providerReady();
    expect(play.mock.calls).toEqual([["start"]]);
    feedback.providerFailed(); await feedback.providerReady();
    expect(play.mock.calls).toEqual([["start"]]);
  });

  it("double end taps finalize once, then sound once, then show the completed state", async () => {
    const order: string[] = [];
    const feedback = new RecitationFeedback((cue) => { order.push(cue); });
    feedback.begin("s"); await feedback.providerReady(); order.length = 0;
    const closed = deferred(), saved = deferred();
    const flight = { current: null as Promise<void> | null };
    const finalize = vi.fn(async () => {
      order.push("stop-input");
      await closed.promise;
      order.push("released");
      await saved.promise;
      order.push("saved");
      await feedback.complete(true);
      order.push("completed-screen");
    });
    const first = runSessionAction(flight, finalize);
    const second = runSessionAction(flight, finalize);
    expect(second).toBe(first);
    expect(finalize).toHaveBeenCalledOnce();
    expect(order).toEqual(["stop-input"]);
    closed.resolve(); await Promise.resolve();
    expect(order).toEqual(["stop-input", "released"]);
    saved.resolve(); await first;
    await feedback.complete(true);
    expect(order).toEqual(["stop-input", "released", "saved", "end", "completed-screen"]);
  });

  it("critical finalization failure cannot emit an end cue and releases the action lock", async () => {
    const play = vi.fn();
    const feedback = new RecitationFeedback(play);
    feedback.begin("s"); await feedback.providerReady(); play.mockClear();
    const flight = { current: null as Promise<void> | null };
    await expect(runSessionAction(flight, async () => {
      throw new Error("save failed");
    })).rejects.toThrow("save failed");
    expect(flight.current).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it("sound disabled or blocked never prevents session finalization", async () => {
    const feedback = new RecitationFeedback(() => Promise.resolve(false));
    feedback.begin("s"); await feedback.providerReady();
    const finalize = vi.fn(async () => { await feedback.complete(true); return "completed"; });
    await expect(runSessionAction({ current: null }, finalize)).resolves.toBe("completed");
    expect(finalize).toHaveBeenCalledOnce();
  });
});

describe("clean provider socket closure", () => {
  it.each([1000, 1005])("accepts a normal close handshake (%i)", async (code) => {
    const socket = new Socket();
    const closed = waitForCleanSocketClose(socket.ws);
    socket.close(code);
    await expect(closed).resolves.toBe(true);
  });
  it("rejects an already-closed session", async () => {
    const socket = new Socket(); socket.close();
    await expect(waitForCleanSocketClose(socket.ws)).resolves.toBe(false);
  });
  it("rejects provider errors during close, even with a normal close code", async () => {
    const socket = new Socket();
    const closed = waitForCleanSocketClose(socket.ws);
    socket.message("error"); socket.close();
    await expect(closed).resolves.toBe(false);
  });
  it("rejects a provider crash and a stalled close handshake", async () => {
    const socket = new Socket();
    const closed = waitForCleanSocketClose(socket.ws); socket.close(1006);
    await expect(closed).resolves.toBe(false);
    vi.useFakeTimers();
    const stalled = waitForCleanSocketClose(new Socket().ws);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(stalled).resolves.toBe(false);
  });
});

describe("real PCM worklet flush", () => {
  it("stops accepting input, drains PCM before acknowledgement, and never replays the buffer", () => {
    const messages: unknown[] = [];
    interface Processor {
      port: { onmessage: (event: { data: { t: string } }) => void };
      process(inputs: Float32Array[][]): boolean;
    }
    let Constructor!: new () => Processor;
    runInNewContext(PROCESSOR_SOURCE, {
      sampleRate: 24000,
      AudioWorkletProcessor: class {
        port = { onmessage: null, postMessage: (value: unknown) => messages.push(value) };
      },
      registerProcessor: (_name: string, ctor: new () => Processor) => { Constructor = ctor; },
    });
    const processor = new Constructor();
    processor.process([[new Float32Array([0.1, 0.2, 0.3])]]);
    processor.port.onmessage({ data: { t: "flush" } });
    expect(messages).toHaveLength(2);
    expect((messages[0] as ArrayBuffer).byteLength).toBe(6);
    expect(messages[1]).toEqual({ t: "flushed" });
    processor.process([[new Float32Array(2400)]]);
    expect(messages).toHaveLength(2);
    processor.port.onmessage({ data: { t: "flush" } });
    expect(messages).toHaveLength(3);
    expect(messages[2]).toEqual({ t: "flushed" });
  });
});
