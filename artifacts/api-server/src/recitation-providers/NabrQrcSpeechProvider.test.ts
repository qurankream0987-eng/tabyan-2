import assert from "node:assert/strict";
import test from "node:test";
import { NabrProviderAdapter } from "./NabrProviderAdapter";
import {
  NabrQrcSpeechProvider,
  NabrQrcTranscriptBridge,
} from "./NabrQrcSpeechProvider";
import { qrcContractFixtures } from "./fixtures/qrc-contract-fixtures";

test("gateway provider dry-run constructs locally and never creates a socket", () => {
  let socketFactoryCalls = 0;
  let readyCalls = 0;
  let errorMessage = "";
  const provider = new NabrQrcSpeechProvider(
    { enabled: true, dryRun: true, shadowMode: true, hafzLevel: 1, tajweedLevel: 1 },
    {},
    {
      chapterIndex: 1,
      verseIndex: 1,
      wordIndex: 1,
      hafzLevel: 1,
      tajweedLevel: 1,
    },
    {
      onReady: () => { readyCalls += 1; },
      onTranscript: () => {},
      onProviderEvent: () => {},
      onError: (message) => { errorMessage = message; },
      onClose: () => {},
    },
    {
      socketFactory: () => {
        socketFactoryCalls += 1;
        throw new Error("socket factory must not run in dry-run");
      },
    },
  );

  provider.connect();
  assert.equal(socketFactoryCalls, 0);
  assert.equal(readyCalls, 0);
  assert.equal(provider.isOpen(), false);
  assert.match(errorMessage, /dry-run/);
});

test("QRC word, position, and mistake observations never bypass the transcript matcher", () => {
  const adapter = new NabrProviderAdapter();
  const bridge = new NabrQrcTranscriptBridge();
  const observations = adapter.normalizeServerMessage(qrcContractFixtures.result, 1);
  assert.ok(observations.length > 0);

  const toMatcher = (events: typeof observations) => events
    .map((event) => bridge.toCanonicalTranscript(event))
    .filter((event) => event !== null);

  assert.deepEqual(toMatcher(observations), []);
  // Replayed QRC results still cannot produce transcript commits or learner state.
  assert.deepEqual(toMatcher(observations), []);
});

test("unknown QRC event observations remain non-transcript data", () => {
  const adapter = new NabrProviderAdapter();
  const bridge = new NabrQrcTranscriptBridge();
  const events = adapter.normalizeServerMessage(
    { event: "UNRECOGNIZED_FUTURE_QRC_EVENT", session_id: "fixture-session" },
    1,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "unknown");
  assert.equal(bridge.toCanonicalTranscript(events[0]!), null);
});
