import assert from "node:assert/strict";
import test from "node:test";
import {
  createNabrQrcDiagnosticPacket,
  qrcIntervalSummary,
} from "./nabr-qrc-diagnostics";

test("QRC diagnostics retain whitelisted event coordinates and raw letter/tajweed fields only", () => {
  const packet = createNabrQrcDiagnosticPacket({
    event: "TILAWA_RESULT",
    api_key: "must-not-be-copied",
    code: "PROVIDER_PROTOCOL_ERROR",
    chapter_index: 1,
    verse_index: 1,
    word_index: 2,
    confidence: 0.91,
    word_status: "correct",
    correct_words: [{ chapter: 1, verse: 1, word: 2, text: "ignored" }],
    skipped_words: [{ chapter: 1, verse: 1, word: 3 }],
    tajweed_mistakes: [{ chapter: 1, verse: 1, word: 2, errorCode: "T1", message: "fixture" }],
    letter_mistakes: [{
      chapter: 1, verse: 1, word: 2, letter: 0, speachLike: "fixture", secret: "ignored",
    }],
  }, 1234, "event-1");

  assert.deepEqual(packet, {
    observedAt: 1234,
    eventType: "TILAWA_RESULT",
    providerErrorCode: "PROVIDER_PROTOCOL_ERROR",
    providerEventId: "event-1",
    chapter_index: 1,
    verse_index: 1,
    word_index: 2,
    confidence: 0.91,
    word_status: "correct",
    correct_words: [{ chapter: 1, verse: 1, word: 2 }],
    skipped_words: [{ chapter: 1, verse: 1, word: 3 }],
    tajweed_mistakes: [{
      chapter: 1, verse: 1, word: 2, errorCode: "T1", message: "fixture",
    }],
    letter_mistakes: [{ chapter: 1, verse: 1, word: 2, letter: 0, speachLike: "fixture" }],
  });
  assert.equal("api_key" in packet, false);
});

test("interval percentiles are withheld until at least five samples exist", () => {
  assert.deepEqual(qrcIntervalSummary([10, 20, 30, 40]), {
    medianMs: null,
    p95Ms: null,
    enoughSamples: false,
  });
  assert.deepEqual(qrcIntervalSummary([50, 10, 40, 20, 30]), {
    medianMs: 30,
    p95Ms: 50,
    enoughSamples: true,
  });
});
