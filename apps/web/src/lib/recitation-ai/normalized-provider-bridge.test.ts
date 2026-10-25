import { describe, expect, it } from "vitest";
import {
  NormalizedTranscriptMatcherBridge,
  normalizeProviderObservation,
  type ProviderObservation,
} from "@workspace/tabyan-domain";
import type { CanonicalQuranWord } from "./canonicalWords";
import { ConfirmedTabyanEventProjector } from "./confirmedTabyanEventBridge";
import type { RecitationEngineEvent } from "./recitationStateEngine";

function normalize(observation: ProviderObservation) {
  const event = normalizeProviderObservation(observation);
  if (!event) throw new Error("Fixture observation must normalize");
  return event;
}

const canonicalWord: CanonicalQuranWord = {
  surah: 1,
  ayah: 1,
  verseKey: "1:1",
  position: 2,
  page: 1,
  line: 1,
  displayText: "ٱلْحَمْدُ",
  normalizedText: "الحمد",
};

describe("normalized provider-to-Tabyan bridges", () => {
  it("bridges transcript deltas and final text while preserving optional authority gates", () => {
    const bridge = new NormalizedTranscriptMatcherBridge();
    const first = bridge.toMatcherInput(normalize({
      observationKind: "transcript",
      provider: "openai",
      providerEventType: "partial",
      observedAt: 100,
      providerEventId: "delta-1",
      providerUtteranceId: "utterance-1",
      transcript: "بسم",
      completeness: "partial",
      textIsDelta: true,
      confidenceHint: 0.99,
    }));
    expect(first).toMatchObject({ text: "بسم", isFinal: false, itemId: "utterance-1", confidence: 0.99 });
    expect(first).not.toHaveProperty("confirmationEligible");

    const second = bridge.toMatcherInput(normalize({
      observationKind: "transcript",
      provider: "openai",
      providerEventType: "partial",
      observedAt: 101,
      providerEventId: "delta-2",
      providerUtteranceId: "utterance-1",
      transcript: " الله",
      completeness: "partial",
      textIsDelta: true,
    }));
    expect(second?.text).toBe("بسم الله");

    const final = normalize({
      observationKind: "transcript",
      provider: "openai",
      providerEventType: "final",
      observedAt: 102,
      providerEventId: "final-1",
      providerUtteranceId: "utterance-1",
      transcript: "بسم الله",
      completeness: "final",
      textIsDelta: false,
      confirmationEligible: false,
    });
    expect(bridge.toMatcherInput(final)).toMatchObject({
      text: "بسم الله",
      isFinal: true,
      confirmationEligible: false,
    });
    expect(bridge.toMatcherInput(final)).toBeNull();
  });

  it("deduplicates transcript replays without merging different utterances", () => {
    const bridge = new NormalizedTranscriptMatcherBridge();
    const observation: ProviderObservation = {
      observationKind: "transcript",
      provider: "speechmatics",
      providerEventType: "partial",
      observedAt: 100,
      providerUtteranceId: "same-utterance",
      transcript: "الحمد",
      completeness: "partial",
    };
    expect(bridge.toMatcherInput(normalize(observation))).not.toBeNull();
    expect(bridge.toMatcherInput(normalize({ ...observation, observedAt: 101 }))).toBeNull();
    expect(bridge.toMatcherInput(normalize({
      ...observation,
      providerUtteranceId: "next-utterance",
      observedAt: 102,
    }))).not.toBeNull();
  });

  it("does not turn provider word, mistake, position, status, or unknown events into matcher input", () => {
    const bridge = new NormalizedTranscriptMatcherBridge();
    const observations: ProviderObservation[] = [
      {
        observationKind: "word",
        provider: "nabr",
        providerEventType: "TILAWA_RESULT",
        observedAt: 1,
        claim: "reported_correct",
        positionHint: { surah: 999, ayah: 1, wordIndex: 1 },
      },
      {
        observationKind: "mistake",
        provider: "nabr",
        providerEventType: "TILAWA_RESULT",
        observedAt: 2,
        positionHint: { surah: 1, ayah: 1, wordIndex: 2 },
        mistakeHint: { type: "unclassified", errorCode: "provider-code" },
      },
      {
        observationKind: "position",
        provider: "nabr",
        providerEventType: "TILAWA_RESULT",
        observedAt: 3,
        positionHint: { surah: 1, ayah: 1, wordIndex: 2 },
      },
      {
        observationKind: "session_status",
        provider: "nabr",
        providerEventType: "KEEP_ALIVE",
        observedAt: 4,
        status: "heartbeat",
      },
      {
        observationKind: "unknown",
        provider: "nabr",
        providerEventType: "FUTURE_EVENT",
        observedAt: 5,
      },
    ];
    for (const observation of observations) {
      const event = normalizeProviderObservation(observation);
      expect(event).not.toBeNull();
      if (event) expect(bridge.toMatcherInput(event)).toBeNull();
    }
  });

  it("projects only confirmed canonical engine events and deduplicates each transition", () => {
    const projector = new ConfirmedTabyanEventProjector();
    const event: RecitationEngineEvent = {
      kind: "WRONG_WORD",
      index: 1,
      word: { verseKey: "1:1", position: 2 },
      heard: "synthetic",
      tier: "HIGH",
      at: 100,
      status: "possible",
    };
    const wordAt = (index: number) => index === 1 ? canonicalWord : null;

    expect(projector.project([event], wordAt)).toEqual([]);
    event.status = "corrected";
    expect(projector.project([event], wordAt)).toEqual([]);
    event.status = "possible";
    projector.project([event], wordAt);
    event.status = "confirmed";
    const confirmed = projector.project([event, event], wordAt);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]).toMatchObject({
      authority: "tabyan_state_engine",
      type: "mistake_confirmed",
      canonicalWord: { surah: 1, ayah: 1, verseKey: "1:1", wordIndex: 2 },
    });
    expect(projector.project([event], wordAt)).toEqual([]);

    event.status = "corrected";
    const corrected = projector.project([event, event], wordAt);
    expect(corrected).toHaveLength(1);
    expect(corrected[0]?.type).toBe("mistake_corrected");
    expect(corrected[0]?.eventId).toBe(confirmed[0]?.eventId);
    expect(projector.project([event], wordAt)).toEqual([]);
  });

  it("rejects provider-position mismatches against the canonical matcher word", () => {
    const projector = new ConfirmedTabyanEventProjector();
    const event: RecitationEngineEvent = {
      kind: "OMISSION",
      index: 1,
      word: { verseKey: "1:1", position: 9 },
      tier: "HIGH",
      at: 100,
      status: "possible",
    };
    projector.project([event], () => canonicalWord);
    event.status = "confirmed";
    expect(projector.project([event], () => canonicalWord)).toEqual([]);
  });
});
