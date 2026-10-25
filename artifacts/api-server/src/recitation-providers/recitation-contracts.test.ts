import assert from "node:assert/strict";
import test from "node:test";
import {
  NormalizedTranscriptMatcherBridge,
  normalizeProviderObservation,
} from "@workspace/tabyan-domain";
import { NabrProviderAdapter } from "./NabrProviderAdapter";
import {
  normalizeTranscriptEvent,
  RECITATION_PROVIDER_CAPABILITIES,
} from "./recitation-contracts";
import { genericTranscriptFixtures, qrcContractFixtures } from "./fixtures/qrc-contract-fixtures";

test("provider capability claims distinguish unverified features from unsupported ones", () => {
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.tarteel.partialTranscript, "not_supported");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.integration, "documented_only");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.wordAlignment, "supported");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.partialTranscript, "unverified");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.finalTranscript, "unverified");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.omissionDetection, "unverified");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.substitutionDetection, "unverified");
  assert.equal(RECITATION_PROVIDER_CAPABILITIES.nabr.makharijDetection, "unverified");
});

test("existing provider transcripts normalize without granting mistake authority", () => {
  const event = normalizeTranscriptEvent("speechmatics", {
    text: "بسم الله",
    isFinal: true,
    confidence: 0.92,
    itemId: "item-1",
    confirmationEligible: false,
  }, 1234);

  assert.equal(event.type, "final");
  assert.equal(event.provider, "speechmatics");
  assert.equal(event.timestamp, 1234);
  assert.equal(event.transcript, "بسم الله");
  assert.equal(event.confidenceHint, 0.92);
  assert.equal(event.confirmationEligible, false);
});

test("QRC result locations remain position hints and its skips are not classified", () => {
  const adapter = new NabrProviderAdapter();
  const observations = adapter.observeServerMessage(qrcContractFixtures.result, 5678);
  const events = observations.map(normalizeProviderObservation).filter((event) => event !== null);

  assert.deepEqual(events.map((event) => event.type), [
    "position_hint", "word", "word", "mistake", "mistake", "session_status",
  ]);
  assert.equal(events[0].type === "position_hint" && events[0].positionHint?.wordIndex, 3);
  assert.equal(events[1].type === "word" && events[1].claim, "reported_correct");
  assert.equal(events[1].type === "word" && events[1].positionHint?.surah, 1);
  assert.equal(events[2].type === "word" && events[2].claim, "reported_skipped");
  assert.equal(events[2].type === "word" && events[2].mistakeHint?.type, "unclassified");
  assert.equal(events[3].type === "mistake" && events[3].mistakeHint.type, "tajweed");
  assert.equal(events[3].type === "mistake" && events[3].mistakeHint.heard, "sample");
  assert.equal(events[4].type === "mistake" && events[4].mistakeHint.type, "pronunciation");
  assert.equal(events[5].type === "session_status" && events[5].status, "result");
  assert.ok(events.every((event) => event.timestamp === 5678));
  assert.ok(events.every((event) => event.evidence === "provider_observation"));
});

test("possible omission and possible substitution share the documented unclassified skipped hint", () => {
  const adapter = new NabrProviderAdapter();
  for (const fixture of [qrcContractFixtures.possibleOmission, qrcContractFixtures.possibleSubstitution]) {
    const event = adapter.normalizeServerMessage(fixture.message, 42)
      .find((candidate) => candidate.type === "word");
    assert.equal(event?.type, "word");
    assert.equal(event?.type === "word" && event.claim, "reported_skipped");
    assert.equal(event?.type === "word" && event.mistakeHint?.type, "unclassified");
  }
});

test("QRC messages cover lifecycle/heartbeat; undocumented codes and event types fail safe", () => {
  const adapter = new NabrProviderAdapter();
  const connected = adapter.normalizeServerMessage(qrcContractFixtures.connected, 10);
  assert.equal(connected[0]?.type === "session_status" && connected[0].status, "ready");
  const started = adapter.normalizeServerMessage(qrcContractFixtures.started, 11);
  assert.equal(started[0]?.type === "session_status" && started[0].status, "started");
  const ended = adapter.normalizeServerMessage(qrcContractFixtures.ended, 12);
  assert.equal(ended[0]?.type === "session_status" && ended[0].countHint, 4);
  const heartbeat = adapter.normalizeServerMessage(qrcContractFixtures.keepAlive, 13);
  assert.equal(heartbeat[0]?.type === "session_status" && heartbeat[0].status, "heartbeat");
  assert.equal(heartbeat[0]?.type === "session_status" && heartbeat[0].providerTimestampSeconds, 1_800_000_000);

  const unknownCode = adapter.normalizeServerMessage({
    event: "TILAWA_RESULT", exit_code: 7,
  }, 14).find((event) => event.type === "session_status");
  assert.equal(unknownCode?.type === "session_status" && unknownCode.status, "unverified");
  assert.equal(unknownCode?.type === "session_status" && unknownCode.exitCodeHint, 7);

  const unknownEvent = adapter.normalizeServerMessage(qrcContractFixtures.unknown, 15);
  assert.equal(unknownEvent[0]?.type, "unknown");
  assert.deepEqual(adapter.normalizeServerMessage(qrcContractFixtures.silence, 16), []);
  assert.equal(adapter.normalizeServerMessage(qrcContractFixtures.error, 17)[0]?.type, "session_status");
});

test("duplicate structured QRC positions stay out of matcher input and cannot double-grade", () => {
  const adapter = new NabrProviderAdapter();
  const events = adapter.normalizeServerMessage(qrcContractFixtures.duplicatePosition, 20);
  const bridge = new NormalizedTranscriptMatcherBridge();
  const wordEvents = events.filter((event) => event.type === "word");
  assert.equal(wordEvents.length, 2);
  assert.ok(wordEvents.every((event) => bridge.toMatcherInput(event) === null));
});

test("generic normalized transcript fixtures bridge partial/final text only", () => {
  const bridge = new NormalizedTranscriptMatcherBridge();
  const partial = normalizeProviderObservation(genericTranscriptFixtures.partial);
  const final = normalizeProviderObservation(genericTranscriptFixtures.final);
  assert.equal(partial?.type, "partial");
  assert.equal(final?.type, "final");
  if (!partial || !final) throw new Error("Transcript fixtures must normalize");
  assert.equal(bridge.toMatcherInput(partial)?.text, "بسم");
  assert.equal(bridge.toMatcherInput(partial), null);
  const matcherFinal = bridge.toMatcherInput(final);
  assert.equal(matcherFinal?.text, "بسم الله");
  assert.equal(matcherFinal?.isFinal, true);
});

test("Nabr adapter ignores malformed positions and handles protocol errors as session state", () => {
  const adapter = new NabrProviderAdapter();
  const results = adapter.normalizeServerMessage({
    event: "TILAWA_RESULT",
    exit_code: 6,
    correct_words: [
      { chapter: 115, verse: 1, word: 1 },
      { chapter: 1, verse: 0, word: 1 },
      { chapter: 1, verse: 1, word: 1 },
    ],
  }, 42);
  const validWords = results.filter((event) => event.type === "word");
  assert.equal(validWords.length, 1);
  assert.equal(validWords[0].type === "word" && validWords[0].positionHint?.surah, 1);
  assert.ok(results.some((event) => event.type === "session_status" && event.status === "result"));

  const error = adapter.normalizeServerMessage({
    event: "QRC_ERROR", code: "AUTH", message: "synthetic error",
  }, 43);
  assert.deepEqual(error, [{
    type: "session_status",
    status: "error",
    provider: "nabr",
    providerEventType: "QRC_ERROR",
    timestamp: 43,
    evidence: "provider_observation",
    code: "AUTH",
    message: "synthetic error",
  }]);
});
