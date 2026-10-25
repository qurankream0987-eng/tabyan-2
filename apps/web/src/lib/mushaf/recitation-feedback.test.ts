import { describe, expect, it, vi } from "vitest";
import type { RecitationWordState } from "@/lib/recitation-ai/recitationStateEngine";
import type { ConfirmedTabyanRecitationEvent } from "@workspace/tabyan-domain";
import { RecitationFeedback } from "./recitation-feedback";

function confirmedEvent(
  eventId: string,
  type: ConfirmedTabyanRecitationEvent["type"],
  wordIndex = 1,
): ConfirmedTabyanRecitationEvent {
  return {
    authority: "tabyan_state_engine",
    eventId,
    type,
    canonicalWord: { surah: 1, ayah: 1, verseKey: "1:1", wordIndex },
    mistake: { kind: "WRONG_WORD" },
    occurredAt: 123,
  };
}

function fixture() {
  let now = 0;
  const play = vi.fn();
  const feedback = new RecitationFeedback(play, () => now);
  const states = new Map<number, RecitationWordState>();
  const words = [
    { verseKey: "1:1", position: 1 },
    { verseKey: "1:1", position: 2 },
    { verseKey: "1:2", position: 1 },
  ];
  const source = {
    stateAt: (index: number) => states.get(index) ?? "UNREAD" as RecitationWordState,
    wordAt: (index: number) => words[index] ?? null,
  };
  feedback.begin("session-a");
  const ready = () => { feedback.providerReady(); play.mockClear(); };
  const change = (index: number, state: RecitationWordState) => {
    now += 1000;
    states.set(index, state);
    feedback.observeProgress([index], source);
  };
  return { play, feedback, ready, change, states, words, source };
}

describe("provider-aware recitation feedback", () => {
  it("waits for actual READY and emits the start cue only once", () => {
    const f = fixture();
    f.change(0, "CONFIRMED_ERROR");
    expect(f.play).not.toHaveBeenCalled();
    f.feedback.providerReady();
    f.feedback.providerReady();
    expect(f.play.mock.calls).toEqual([["start"]]);
  });

  it("sounds once for a confirmed mistake, never repeated transcripts", () => {
    const f = fixture(); f.ready();
    f.change(0, "CONFIRMED_ERROR"); f.change(0, "CONFIRMED_ERROR");
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_confirmed")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_confirmed")]);
    expect(f.play.mock.calls).toEqual([["mistake"]]);
  });

  it("possible, pending and weak mismatch states remain silent", () => {
    const f = fixture(); f.ready();
    f.change(0, "HEARD_PENDING"); f.change(0, "POSSIBLE_ERROR");
    f.change(0, "CORRECTED");
    expect(f.play).not.toHaveBeenCalled();
  });

  it("requires a confirmed error at the SAME Quran position before correction", () => {
    const f = fixture(); f.ready();
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_confirmed")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-b", "mistake_corrected", 2)]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_corrected")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_corrected")]);
    expect(f.play.mock.calls).toEqual([["mistake"], ["correction"]]);
  });

  it("allows a genuinely new mistake/correction episode after state changes", () => {
    const f = fixture(); f.ready();
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_confirmed")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_corrected")]);
    f.change(0, "PENDING");
    f.feedback.observeConfirmed([confirmedEvent("mistake-b", "mistake_confirmed")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-b", "mistake_corrected")]);
    expect(f.play.mock.calls).toEqual([["mistake"], ["correction"], ["mistake"], ["correction"]]);
  });

  it("normal words are silent; a fully correct ayah has one milestone cue", () => {
    const f = fixture(); f.ready();
    f.change(0, "CORRECT"); expect(f.play).not.toHaveBeenCalled();
    f.change(1, "CORRECT"); f.change(1, "CORRECT");
    expect(f.play.mock.calls).toEqual([["ayah"]]);
  });

  it("never calls an ayah correct when an earlier word was wrong or peeked", () => {
    for (const state of ["POSSIBLE_ERROR", "CONFIRMED_ERROR", "PEEKED", "UNREAD"] as const) {
      const f = fixture(); f.ready();
      f.states.set(0, state); f.change(1, "CORRECT");
      expect(f.play).not.toHaveBeenCalled();
    }
  });

  it("does not invent completion at a truncated page or middle-of-ayah start", () => {
    const f = fixture(); f.ready();
    f.words[0].position = 2; f.change(0, "CORRECT"); f.change(1, "CORRECT");
    f.change(2, "CORRECT");
    expect(f.play).not.toHaveBeenCalled();
  });

  it("failure prevents success sounds; retry has a fresh safe lifecycle", () => {
    const f = fixture(); f.ready();
    f.feedback.providerFailed(); f.feedback.complete(true);
    expect(f.play).not.toHaveBeenCalled();
    f.feedback.begin("session-b"); f.feedback.providerReady();
    f.feedback.complete(true); f.feedback.complete(true);
    expect(f.play.mock.calls).toEqual([["start"], ["end"]]);
  });

  it("cancellation and an unready session never sound successful", () => {
    const f = fixture(); f.feedback.complete(true);
    expect(f.play).not.toHaveBeenCalled();
    f.feedback.begin("new"); f.ready(); f.feedback.complete(false);
    expect(f.play).not.toHaveBeenCalled();
  });

  it("coalesces a burst of multiple mistakes into one tone", () => {
    const f = fixture(); f.ready();
    f.feedback.observeConfirmed([
      confirmedEvent("mistake-a", "mistake_confirmed"),
      confirmedEvent("mistake-b", "mistake_confirmed", 2),
    ]);
    f.feedback.observeConfirmed([
      confirmedEvent("mistake-a", "mistake_confirmed"),
      confirmedEvent("mistake-b", "mistake_confirmed", 2),
    ]);
    expect(f.play.mock.calls).toEqual([["mistake"]]);
  });

  it("does not throttle away a fast genuine self-correction", () => {
    const f = fixture(); f.ready();
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_confirmed")]);
    f.feedback.observeConfirmed([confirmedEvent("mistake-a", "mistake_corrected")]);
    expect(f.play.mock.calls).toEqual([["mistake"], ["correction"]]);
  });

  it("sound exceptions and autoplay rejections never break feedback processing", async () => {
    const feedback = new RecitationFeedback(() => { throw new Error("blocked"); });
    feedback.begin("s");
    expect(() => feedback.providerReady()).not.toThrow();
    const rejected = new RecitationFeedback(() => Promise.reject(new Error("autoplay")));
    rejected.begin("s"); rejected.providerReady();
    await Promise.resolve();
  });
});
