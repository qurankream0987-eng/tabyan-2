import assert from "node:assert/strict";
import test from "node:test";
import {
  toQrcStructuredObservation,
  type QrcStructuredObservation,
} from "@workspace/tabyan-domain";
import { NabrProviderAdapter } from "./NabrProviderAdapter";
import { NabrQrcTranscriptBridge } from "./NabrQrcSpeechProvider";
import { qrcContractFixtures } from "./fixtures/qrc-contract-fixtures";

test("QRC result arrays map to a separate unconfirmed structured path without transcript text", () => {
  const adapter = new NabrProviderAdapter();
  const normalized = adapter.normalizeServerMessage(qrcContractFixtures.result, 12);
  const structured = normalized
    .map(toQrcStructuredObservation)
    .filter((event): event is QrcStructuredObservation => event !== null);

  assert.ok(structured.some((event) => event.kind === "WORD_CURRENT"));
  assert.ok(structured.some((event) => event.kind === "WORD_REPORTED_CORRECT"));
  assert.ok(structured.some((event) => event.kind === "WORD_REPORTED_SKIPPED"));
  assert.ok(structured.some((event) => event.kind === "LETTER_OBSERVATION"));
  assert.ok(structured.some((event) => event.kind === "TAJWEED_OBSERVATION"));
  assert.ok(structured.every((event) => event.confirmation === "unconfirmed"));
  assert.ok(structured.every((event) => event.authority === "provider_observation"));
  assert.ok(structured.every((event) => !("transcript" in event)));
  assert.ok(structured.every((event) => event.providerCoordinate.chapterIndex === 1));
  assert.ok(structured.every((event) => event.providerCoordinate.verseIndex >= 1));

  const transcriptBridge = new NabrQrcTranscriptBridge();
  assert.deepEqual(
    normalized.map((event) => transcriptBridge.toCanonicalTranscript(event)).filter(Boolean),
    [],
  );
});

test("unknown provider events do not enter the structured event contract", () => {
  const adapter = new NabrProviderAdapter();
  const [unknown] = adapter.normalizeServerMessage(
    { event: "UNRECOGNIZED_FUTURE_QRC_EVENT" },
    1,
  );

  assert.equal(unknown?.type, "unknown");
  assert.equal(unknown ? toQrcStructuredObservation(unknown) : null, null);
});

test("raw letter coordinates, including zero, are preserved but not promoted to canonical indexes", () => {
  const adapter = new NabrProviderAdapter();
  const mistake = adapter.normalizeServerMessage({
    event: "TILAWA_RESULT",
    chapter_index: 1,
    verse_index: 1,
    word_index: 1,
    letter_mistakes: [{
      chapter: 1,
      verse: 1,
      word: 1,
      letter: 0,
      speachLike: "fixture",
      message: "fixture",
    }],
  }, 1).find((event) => event.type === "mistake");
  const structured = mistake ? toQrcStructuredObservation(mistake) : null;

  assert.equal(structured?.kind, "LETTER_OBSERVATION");
  assert.equal(structured?.providerLetterIndex, 0);
});
