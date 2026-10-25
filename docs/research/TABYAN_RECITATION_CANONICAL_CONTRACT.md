# Tabyan Recitation Canonical Contract

**Review date:** 2026-10-12  
**Status:** Offline contract closure; Nabr/QRC remains disconnected.

## Scope and trust boundary

This contract closes the boundary between a speech/recitation provider and Tabyan's existing Quran matcher and session engine. It does not select a new provider, alter the matcher algorithm, alter state-engine confirmation rules, or change Mushaf layout or reveal behavior.

Provider data is divided into three layers:

1. **`ProviderObservation` — what the provider reported.** This records the provider name and event type, local observation time, optional provider event/utterance identifiers, transcript completeness, provider position hints, and provider mistake hints. Provider IDs are diagnostics/deduplication inputs only, never canonical Quran identity.
2. **`NormalizedRecitationEvent` — structurally normalized provider data.** It has stable Tabyan-facing event names and preserves provider position/mistake data as hints. Its `evidence: "provider_observation"` marker means it is not a Tabyan grade. Structural normalization does not rewrite Arabic text.
3. **`ConfirmedTabyanRecitationEvent` — a Tabyan engine transition.** It can be emitted only after the existing `RecitationStateEngine` marks a matcher-derived mistake confirmed, or later corrected. Its Quran word comes from the matcher’s canonical word corpus and must agree with the engine event's word reference.

Unknown, malformed, or unsupported provider observations do not become learner feedback. Provider word, position, and mistake observations do not enter the matcher bridge.

## Current Tabyan path

1. The authenticated realtime gateway creates and owns the Tabyan session, authorizes the client, leases the session, and connects only the selected existing provider. Provider credentials remain server-side.
2. Existing provider transcript messages are structurally normalized by the shared `@workspace/tabyan-domain` contract. The gateway forwards provider name, event ID when present, utterance ID, transcript type, and the optional confirmation gate.
3. The client transcript bridge accepts only `partial` and `final` normalized events. It assembles declared deltas by utterance ID and suppresses replayed provider event IDs (or identical no-ID fingerprints). Word, mistake, position, session, and unknown event types return no matcher input.
4. `QuranLiveMatcher` applies the existing `normalizeQuranText` path to transcript tokens and aligns those tokens against Tabyan's canonical Quran word corpus. It does not trust provider Quran coordinates.
5. `RecitationStateEngine` consumes only matcher operations. Provider confidence remains a hint; engine confidence comes from matcher alignment. A provider's `confirmationEligible: false` can veto a confirmation, but `true` does not skip Tabyan's independent HIGH-confidence, reliable-audio, and follow-up-word requirements.
6. The confirmed-event projector emits feedback only for engine mistake records transitioning to `confirmed`, and emits a correction only when the same record had previously been confirmed. It verifies the event word against the canonical matcher word at that index.

`POSSIBLE_ERROR` remains a tentative word-display state from the existing engine; it is not counted as a confirmed grade and does not trigger mistake/correction sound feedback. Session summaries continue to use the existing engine summary rules. No provider's mistake label is copied into those states.

## Identity and deduplication

- `providerEventId` identifies a provider message only when that provider supplies one. `providerUtteranceId` groups partial/final transcript events when supplied. Neither is a Quran word key.
- The normalized transcript bridge keeps a bounded set of 512 recent dedupe keys. It uses provider event IDs when present; without one it uses provider + utterance ID + event type + transcript text.
- `QuranLiveMatcher` also ignores only the immediately repeated `itemId:isFinal:text` key. This is not a global replay guarantee.
- QRC documents no result event ID. Repeated `TILAWA_RESULT` positions therefore cannot be safely interpreted as distinct recitations or deduplicated as exactly-once provider events. Those results stay observation-only and never trigger duplicate Tabyan feedback.
- Confirmed-event IDs are generated locally per projector/session and remain stable through that event's confirmed-to-corrected transition.

## Contract types

The shared package exports:

- `ProviderObservation`
- `NormalizedRecitationEvent`
- `NormalizedTranscriptMatcherBridge`
- `ConfirmedTabyanRecitationEvent`

Provider observations may include transcript text, structured word claims, position hints, mistake hints, session status, or an unknown event. A `QuranPositionHint` uses provider coordinates only. Canonical identity is a separate type and can be created only from the Tabyan matcher/state-engine path.

## Offline fixture policy

- QRC fixtures contain only synthetic, non-sensitive documented message shapes and do not contain audio, keys, or real provider responses.
- QRC has no documented partial/final transcript payload. Partial/final fixtures test the generic existing-ASR transcript contract and are explicitly not QRC fixtures.
- `skipped_words` fixtures test that possible omission and possible substitution scenarios remain `reported_skipped` / `unclassified`; the adapter does not guess which one occurred.
- A duplicate-position fixture tests harmless handling, not QRC repetition semantics.
- Silence is represented by no provider event; the adapter does not invent a silence event.

## Explicit non-goals

No Nabr/QRC socket, key, package, provider selection, live audio, model inference, benchmark, production database write, deployment, or learner UI redesign is part of this closure.
