# Tabyan — Nabr/QRC Live Acceptance Readiness

**Review date:** 2026-10-12  
**Mode:** Readiness only. The live acceptance test was not run.  
**Final gate:** `BLOCKED_BY_COMMERCIAL_TERMS`  
**Secondary blockers:** `BLOCKED_BY_PROTOCOL`, `BLOCKED_BY_CREDENTIALS`

## Decision

The code and offline checks are prepared for a future controlled test, but Tabyan is **not** ready to receive a real key or send audio yet. Pricing, privacy/data-processing and retention terms are incomplete; the exact server-owned start mapping for Tabyan session modes is unresolved; several QRC operating limits are undocumented; and no API key is configured. Do not open a provider session until these blockers are closed and the owner explicitly authorizes the one short test.

## Official transport contract

Sources reviewed on 2026-10-12:

- [Qurani.ai QRC technical guide](https://qurani.ai/en/docs/2-advanced-tools/qrc)
- [Nabr developer API overview](https://nabrquran.ai/en/api)
- [Nabr privacy summary](https://nabrquran.ai/en/privacy)
- [Nabr terms summary](https://nabrquran.ai/en/terms)

| Item | Current official documentation | Status |
|---|---|---|
| API / WebSocket host | The QRC example uses `wss://api.qurani.ai`. | **VERIFIED** as the documented example; vendor confirmation for the approved Tabyan contract remains outstanding. |
| Authentication | The QRC example places an API key in the `api_key` WebSocket query parameter; the guide says a subscription/API key is required. No auth header is documented. | **VERIFIED** as the example. Approved server-to-server credential handling is **UNVERIFIED**. |
| Credential name | The provider calls it an “API key.” No official environment-variable name is documented. | **VERIFIED** conceptually; no `NABR_API_KEY` or `QRC_API_KEY` environment name was invented. |
| Session start | Send `START_TILAWA_SESSION` with chapter, verse, word, hafz level (1–3), and tajweed level (1–5). | **VERIFIED**. Tabyan's GENERAL/EDUCATIONAL mapping and source of levels remain **UNVERIFIED**. |
| Wire protocol | Binary WebSocket messages encoded/decoded with MessagePack. | **VERIFIED**. |
| Audio formats | One complete 16 kHz mono WAV per message, or one raw 20 ms Opus packet. The current guide demonstrates 200 ms WAV frames. | **VERIFIED** for the documented formats/example. Mandatory min/max chunk size and timing rules are **UNVERIFIED**. |
| Audio message | `CHECK_TILAWA_AUDIO`, containing the binary `audio` bytes; the guide's example also uses `client_sent_at_ms`. | **VERIFIED**. |
| End/flush | `RESET_TILAWA_SESSION`; the guide says it flushes audio and resets the session. | **VERIFIED** method; reset acknowledgement, server cleanup timing, and replay behavior are **UNVERIFIED**. |
| Server events | `QRC_CLIENT_CONNECTED`, `TILAWA_SESSION_STARTED`, `TILAWA_RESULT`, `TILAWA_SESSION_ENDED`, `KEEP_ALIVE`, and `QRC_ERROR`. | **VERIFIED**. |
| Error shape | `QRC_ERROR` includes `websocket_id`, `code`, and `message`. | **VERIFIED**. |
| Result transcript | The current guide's result schema omits a transcript field. An older saved guide capture has a `text` field. | **UNVERIFIED**; the discrepancy must be resolved with the provider. The candidate transport does not emit transcript events. |
| Exit codes | The QRC guide documents 6 as success and 8 as Surah finished. | Those two meanings are **VERIFIED**. Other values are **UNVERIFIED**; the separate Nabr API overview must not be assumed to define QRC codes. |
| Result identity/replay | No stable result event ID or exactly-once/replay rule is documented. | **UNVERIFIED**. |
| Reconnect | No reconnect/resume rule is documented. | **UNVERIFIED**. The candidate transport never retries or reconnects. |
| Provider timeouts / session maximum | No numeric session timeout or maximum duration is documented. | **UNVERIFIED**. Local Tabyan safety timers are not provider limits. |
| Rate limits / concurrency | The terms say to follow API limits but do not state numeric limits or concurrency. | **UNVERIFIED**; obtain contract confirmation. |

The QRC guide describes results beginning after roughly three seconds of speech, then arriving about every 500 ms of new audio, and keep-alives around every 15 seconds. These are documentation statements, not Tabyan measurements or service-level commitments.

## Credential and configuration

- Required credential: a subscription-backed QRC API key, injected server-side.
- No QRC key is configured. No secret name was added to Replit Secrets or application environment variables.
- `NABR_QRC_ENABLED` defaults to `false`.
- `NABR_QRC_DRY_RUN` defaults to `true`.
- Dry-run executes before any live branch and needs no credential. When dry-run is off, the live branch checks the disabled flag, credential, and explicit server-supplied start parameters before constructing a socket.
- The candidate transport is not imported by the live recitation gateway and is not listed by provider selection. No secret reaches React, browser, Expo, or a mobile bundle.

## Readiness scaffold and safety

- Server-only `NabrQrcTransport` uses binary MessagePack, the documented lifecycle methods, and provider observations. It is intentionally not a `SpeechRecognitionProvider`: QRC's current contract does not establish the transcript events required by Tabyan's current live matcher.
- Dry-run round-trips a local start payload, processes synthetic documented fixtures, and converts synthetic silence to WAV. It has no socket factory call, HTTP request, uploaded audio, or provider-credit consumption. The test injects a socket factory that would fail if invoked.
- Audio conversion is confined to the API provider layer: existing mono 24 kHz PCM16LE input is resampled to mono 16 kHz PCM16 WAV frames (200 ms, with one shorter final WAV if needed). No audio was recorded or transmitted.
- The transport has no retry, reconnect, or automatic failover. It enforces one in-process session lease. This is **not** a distributed guard across multiple server processes.
- Local safety values (not provider claims): 10 s connection/start timeout, 45 s heartbeat watchdog, 180 s acceptance cap, 10 s reset-ack timeout, and a 64 KiB incoming-message cap.
- Failures stay explicit (`FEATURE_DISABLED`, `PROVIDER_NOT_CONFIGURED`, `SESSION_ALREADY_ACTIVE`, protocol/connection/timeout errors). A provider error does not fabricate a transcript.
- QRC positions, correct/skipped words, and mistake labels remain observations. Skips remain unclassified; duplicate provider events cannot directly create learner feedback. Only the existing Tabyan matcher/state engine may produce a confirmed event.
- Raw QRC observations, normalized events, and supplied confirmed Tabyan events can be held in a bounded **in-memory-only** comparison trace. Audio is not in the trace; nothing is persisted.

## One future short acceptance scenario

The existing canonical Mushaf page-1 JSON contains verse key `1:1` and word positions 1–5. Use coordinates only to identify the scenario; do not synthesize Quran text:

1. Correctly recite `1:1:1–2`.
2. Deliberately omit `1:1:3`.
3. Recite `1:1:4–5`.
4. Deliberately repeat `1:1:5` once.

This is a plan, not a recording or uploaded sample. For the later test, use one short, rights-cleared prerecorded recitation and one provider session only. The server must derive the start and levels from an approved Tabyan session policy; the current code deliberately does not invent the GENERAL/EDUCATIONAL mapping.

## Acceptance metrics

The local diagnostics and comparison trace are prepared to capture:

- WebSocket connection time, QRC-connected time, QRC-ready time, first QRC result latency, provider errors, disconnect code/behavior, and total session duration.
- Provider word-position and ayah-position hint counts. These counts are **not** canonical alignment accuracy.
- `skipped_words` as an omission observation only, not a confirmed omission.
- Repetition observation and provider confidence as unavailable unless the provider documents those fields; they are `null` in the diagnostics.
- First partial/final transcript latency as unavailable (`null`) until transcript support is confirmed.
- Raw provider observation, normalized event, and confirmed Tabyan event as separate in-memory trace layers.

## Local baseline

**NOT RUN.** No approved local recording of this scenario was available. The scenario is not yet recorded, and the existing benchmark can fetch remote Quran.com recordings. No benchmark, model download, GPU work, or paid inference was started.

## Targeted verification

- `pnpm --filter @workspace/api-server exec tsx --test src/recitation-providers/NabrQrcTransport.test.ts src/recitation-providers/recitation-contracts.test.ts` — **17 passed, 0 failed**.
- `pnpm --filter @workspace/api-server typecheck` — **passed**.
- Managed API workflow rebuilt and restarted successfully; local `GET /api/healthz` returned **HTTP 200**.
- Covered: safe defaults, invalid flag handling, endpoint/auth payload shape, start validation, WAV conversion and chunk boundaries, dry-run zero-network guarantee, disabled and missing-key fail-closed paths, mocked MessagePack lifecycle, duplicate/unknown observations, single-session guard, timeout release, provider error, malformed audio, and cleanup.
- The unrelated full API suite was not rerun; its prior offline-contract baseline was 72/72. The managed workflow performed its normal API build during restart.

## Required final fields

| Gate | Result |
|---|---|
| Official endpoint | **VERIFIED** as documented; server-to-server approval still needed |
| Authentication | **VERIFIED** as the documented `api_key` query example; approved deployment handling still needed |
| Streaming protocol | **PARTIAL** |
| Audio format | **VERIFIED** for complete 16 kHz mono WAV / raw 20 ms Opus and the current 200 ms WAV example |
| Required credential | Subscription-backed QRC API key; no documented environment-variable name; not configured |
| Feature flag | **PASS** — false by default |
| Dry-run | **PASS** |
| Dry-run network requests | **0** |
| Single-session guard | **PASS**, process-local only |
| Privacy terms | **PARTIAL** |
| Pricing | **AGREEMENT_REQUIRED** |
| Local baseline | **NOT RUN** |
| Current provider changed | **NO** |
| Nabr connection made | **NO** |
| External audio sent | **NO** |
| Paid provider calls | **0** |
| Production database changes | **NO** |
| GPU / model download | **NO / NO** |
| Deployment | **NO** |

Public documentation pages were reviewed; no QRC service endpoint was contacted. No paid provider call or paid platform action was intentionally initiated. Replit credit metering was not inspected, so this report does not claim actual credit billing. The API restart triggered the pre-existing development-only Tarteel Whisper cache warmup on CPU (about 4.4 seconds); it was not a baseline run, and no model download or GPU use was observed.

**FINAL GATE: `BLOCKED_BY_COMMERCIAL_TERMS`**, additionally blocked by unresolved protocol/mode mapping and the absent credential. Do not request or use a key until the privacy/commercial gate is complete.
