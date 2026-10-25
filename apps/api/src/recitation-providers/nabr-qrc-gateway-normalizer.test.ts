import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNabrQrcGatewayResult } from "./nabr-qrc-gateway-normalizer";

test("normalizes only bounded TILAWA_RESULT fields and preserves QRC assessments/timestamps", () => {
  const result = normalizeNabrQrcGatewayResult({
    event: "TILAWA_RESULT",
    event_id: "result-7",
    timestamp: 1_800_000_000,
    chapter_index: 1,
    verse_index: 2,
    word_index: 3,
    correct_words: [{ chapter: 1, verse: 2, word: 1 }],
    skipped_words: [{ chapter: 1, verse: 2, word: 2 }],
    letter_mistakes: [{
      chapter: 1,
      verse: 2,
      word: 3,
      letter: 0,
      errorCode: "LETTER_HINT",
      message: "safe text",
      speachLike: "heard text",
    }],
    tajweed_mistakes: [{
      chapter: 1,
      verse: 2,
      word: 3,
      errorCode: "TAJWEED_HINT",
      ruleName: "idgham",
      message: "rule hint",
    }],
    confidence: 0.75,
    raw_vendor_field: "must not be forwarded",
  }, 1234);

  assert.deepEqual(result, {
    currentPosition: { chapter_index: 1, verse_index: 2, word_index: 3 },
    correctWords: [{ chapter_index: 1, verse_index: 2, word_index: 1 }],
    skippedWords: [{ chapter_index: 1, verse_index: 2, word_index: 2 }],
    letterMistakes: [{
      position: { chapter_index: 1, verse_index: 2, word_index: 3 },
      errorCode: "LETTER_HINT",
      description: "safe text",
      heard: "heard text",
      providerLetterIndex: 0,
    }],
    tajweedMistakes: [{
      position: { chapter_index: 1, verse_index: 2, word_index: 3 },
      errorCode: "TAJWEED_HINT",
      description: "rule hint",
      ruleName: "idgham",
    }],
    observedAt: 1234,
    providerTimestamp: 1_800_000_000,
    providerEventId: "result-7",
    confidence: 0.75,
  });
});

test("keeps keepalive, provider errors, unknown events, and invalid coordinates out of learner results", () => {
  assert.equal(normalizeNabrQrcGatewayResult({ event: "KEEP_ALIVE" }), null);
  assert.equal(normalizeNabrQrcGatewayResult({ event: "QRC_ERROR", message: "private detail" }), null);
  assert.equal(normalizeNabrQrcGatewayResult({ event: "UNRECOGNIZED" }), null);
  assert.equal(normalizeNabrQrcGatewayResult({
    event: "TILAWA_RESULT",
    chapter_index: 0,
    verse_index: 1,
    word_index: 1,
  }), null);
});
