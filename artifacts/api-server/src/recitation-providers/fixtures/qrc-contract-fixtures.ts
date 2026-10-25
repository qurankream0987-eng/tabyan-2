/**
 * Synthetic, non-audio examples copied to the documented QRC message shapes.
 * They contain no credentials, learner records, or provider-call output.
 */
export const qrcContractFixtures = {
  connected: {
    event: "QRC_CLIENT_CONNECTED",
    websocket_id: "fixture-ws",
    credits_balance: 0,
  },
  started: {
    event: "TILAWA_SESSION_STARTED",
    exit_code: 6,
    session_id: "fixture-session",
  },
  ended: {
    event: "TILAWA_SESSION_ENDED",
    session_id: "fixture-session",
    asr_call_count: 4,
  },
  keepAlive: {
    event: "KEEP_ALIVE",
    websocket_id: "fixture-ws",
    timestamp: 1_800_000_000,
    client_sent_at_ms: 1_800_000_000_000,
  },
  result: {
    event: "TILAWA_RESULT",
    exit_code: 6,
    chapter_index: 1,
    verse_index: 2,
    word_index: 3,
    correct_words: [{ chapter: 1, verse: 2, word: 1 }],
    skipped_words: [{ chapter: 1, verse: 2, word: 2 }],
    tajweed_mistakes: [{
      chapter: 1,
      verse: 2,
      word: 3,
      letter: 2,
      speachLike: "sample",
      message: "synthetic tajweed note",
      errorCode: "madd_missed_02",
    }],
    letter_mistakes: [{
      chapter: 1,
      verse: 2,
      word: 4,
      speachLike: "sample",
      message: "synthetic letter note",
      errorCode: "letters_missed",
    }],
  },
  possibleOmission: {
    scenario: "QRC skipped_words; its documented contract does not classify this as omission",
    message: {
      event: "TILAWA_RESULT",
      exit_code: 6,
      chapter_index: 1,
      verse_index: 2,
      word_index: 3,
      skipped_words: [{ chapter: 1, verse: 2, word: 2 }],
    },
  },
  possibleSubstitution: {
    scenario: "QRC skipped_words; its documented contract does not classify this as substitution",
    message: {
      event: "TILAWA_RESULT",
      exit_code: 6,
      chapter_index: 1,
      verse_index: 2,
      word_index: 3,
      skipped_words: [{ chapter: 1, verse: 2, word: 2 }],
    },
  },
  duplicatePosition: {
    event: "TILAWA_RESULT",
    exit_code: 6,
    chapter_index: 1,
    verse_index: 2,
    word_index: 3,
    correct_words: [
      { chapter: 1, verse: 2, word: 1 },
      { chapter: 1, verse: 2, word: 1 },
    ],
  },
  error: {
    event: "QRC_ERROR",
    websocket_id: "fixture-ws",
    code: "FIXTURE_ERROR",
    message: "synthetic protocol error",
  },
  unknown: {
    event: "FUTURE_QRC_EVENT",
    websocket_id: "fixture-ws",
  },
  silence: null,
} as const;

/** Generic current-ASR normalized examples; these are deliberately not QRC payloads. */
export const genericTranscriptFixtures = {
  partial: {
    observationKind: "transcript",
    provider: "openai",
    providerEventType: "transcript.partial",
    observedAt: 100,
    providerEventId: "fixture-partial",
    providerUtteranceId: "fixture-utterance",
    transcript: "بسم",
    completeness: "partial",
    textIsDelta: false,
  },
  final: {
    observationKind: "transcript",
    provider: "openai",
    providerEventType: "transcript.final",
    observedAt: 200,
    providerEventId: "fixture-final",
    providerUtteranceId: "fixture-utterance",
    transcript: "بسم الله",
    completeness: "final",
    textIsDelta: false,
  },
} as const;
