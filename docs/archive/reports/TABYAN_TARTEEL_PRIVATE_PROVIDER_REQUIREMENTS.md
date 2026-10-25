# Tabyan AI — Tarteel private-provider requirements

## Current decision

- Keep the current server-side provider gateway and `SpeechRecognitionProvider` adapter boundary.
- Keep OpenAI as the existing hosted provider. Do not change provider defaults, production selection, or production routing in this work.
- The local CTranslate2/int8 Whisper conversion is an experimental, development-only benchmark path. It is not an official Tarteel API and must not be used as a production fallback.
- No official Tarteel private API contract, endpoint, credential flow, or service capability has been provided. Do not infer or implement any of them.
- Do not send real student audio to a new provider until the owner approves the exact audio-routing, retention, and privacy disclosures. No privacy policy was changed as part of this work.

## Existing Tabyan adapter boundary

The current flow is:

1. The Native student client creates a Tabyan `general` session through `recitation.start`.
2. The client opens the authenticated Tabyan WebSocket at `/api/ws/recitation` and sends its session authorization. The client does not select a provider or hold provider credentials.
3. Native capture is converted to mono PCM16LE and base64-encoded. The client resamples to the sample rate announced by the gateway's `ready` event (currently 24 kHz for the default/OpenAI path and 16 kHz for NVIDIA).
4. Audio arrives in the existing WebSocket `audio` envelope. The gateway checks the base64 payload and passes it to the selected server adapter. `commit` asks the provider to flush a segment when that provider supports it.
5. Providers emit normalized ready, transcript, error, and close events through `SpeechRecognitionProviderEvents`. The adapter's `close()` owns provider resource cleanup.
6. Provider selection, credentials, and Tarteel's development-only opt-in remain on the server. Provider errors shown to the client are generic; logs contain a low-detail category rather than the raw provider message.

The current boundary is enough for a new adapter only after Tarteel confirms its actual contract. Do not add a second client-side provider architecture or an endpoint guessed from a public website.

## Required written confirmation from Tarteel

Every item below is unresolved and must remain explicitly pending until Tarteel supplies written documentation or contract terms.

### API and authentication

- **PENDING TARTEEL CONFIRMATION** — Whether a private API or partner integration is available to Tabyan at all.
- **PENDING TARTEEL CONFIRMATION** — Official base URLs, regional endpoints, supported environments, and any test/sandbox endpoint.
- **PENDING TARTEEL CONFIRMATION** — Supported transport and protocol: WebSocket, HTTP, SDK, or another documented interface.
- **PENDING TARTEEL CONFIRMATION** — Authentication method, server-side credential format, scopes, tenant/account binding, rotation, and revocation.
- **PENDING TARTEEL CONFIRMATION** — API/versioning policy, deprecation notice period, and compatibility guarantees.

### Audio and transcript contract

- **PENDING TARTEEL CONFIRMATION** — Supported codecs, PCM encoding, sample rates, channel counts, maximum chunk and utterance sizes, and whether resampling is required.
- **PENDING TARTEEL CONFIRMATION** — Session initialization, streaming/commit/finalize semantics, idle timeout, close behavior, and ordering guarantees.
- **PENDING TARTEEL CONFIRMATION** — Transcript event schema, partial/final behavior, stable event identifiers, timestamps, confidence semantics, and empty/malformed response behavior.
- **PENDING TARTEEL CONFIRMATION** — Supported Arabic varieties, Quran-specific behavior, model identity, and whether output is intended for Quran position matching.
- **PENDING TARTEEL CONFIRMATION** — Documented latency, availability/SLA, concurrency, request quotas, throttling behavior, and provider error codes.
- **PENDING TARTEEL CONFIRMATION** — Whether the provider exposes a non-sensitive readiness/health check that can be used before creating a student session.

### Privacy, security, and commercial terms

- **PENDING TARTEEL CONFIRMATION** — Whether audio or transcripts are stored, for how long, and whether either is used for training or product improvement.
- **PENDING TARTEEL CONFIRMATION** — Deletion procedure, backup-retention behavior, and whether deletion can be confirmed for a specific request.
- **PENDING TARTEEL CONFIRMATION** — Processing regions, subprocessors, data-transfer terms, and available DPA or other required agreements.
- **PENDING TARTEEL CONFIRMATION** — Encryption, access controls, audit logging, security incident notification, and credential-handling requirements.
- **PENDING TARTEEL CONFIRMATION** — Commercial authorization, pricing, billing unit, trial restrictions, and permitted production use.
- **PENDING TARTEEL CONFIRMATION** — Whether Tarteel permits processing student recitation audio and what disclosures or consent language it requires.

## Acceptance gates before implementation or student audio

1. Receive and review the written answers above; do not substitute assumptions for missing answers.
2. Obtain owner approval for the exact provider routing, audio/transcript retention, and privacy disclosures before sending real student audio. Update policy copy only in a separately approved task.
3. Keep credentials in server secrets and select the adapter only on the server. The client continues to authenticate only to Tabyan.
4. Implement the provider behind the existing `SpeechRecognitionProvider` boundary, preserving the current Tabyan session and WebSocket authorization checks.
5. Add tests for readiness, valid/invalid transcript events, error/close cleanup, rate/size limits, and absence of raw provider errors in client messages and logs.
6. Run controlled audio fixtures first. Any test with real student audio requires the approvals in gate 2.
7. Benchmark Arabic Quran position tracking independently from provider transcript quality. A transcript or provider confidence value is not a Tabyan recitation score or proof of range completion.
8. Keep `general` sessions open-ended. Enable `educational` only after the server has an approved assignment source and an explicit expected range.

## Explicit non-goals

- No guessed Tarteel URL, SDK, endpoint, credential, or request payload.
- No client-side Tarteel credentials or provider selection.
- No production switch to the local model or automatic fallback.
- No invented transcript, score, provider health, or successful acceptance claim.
- No changes to QCF data, Mushaf geometry, Native reader visuals, database schema, deployment, or privacy policy in this task.
