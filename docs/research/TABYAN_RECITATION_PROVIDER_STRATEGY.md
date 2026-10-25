# Tabyan Recitation Provider Strategy

**Review date:** 2026-10-12  
**Status:** Nabr/QRC's server provider path and separate structured shadow-observation channel are prepared behind disabled/dry-run flags. No live connection has been made; semantic level mapping and provider terms remain unresolved.

## Current Tabyan path

- The server already has a provider boundary implemented by `SpeechRecognitionProvider`. OpenAI, Speechmatics, NVIDIA, and the development-only local Tarteel Whisper adapter produce provider-neutral transcript events.
- The authenticated Tabyan WebSocket owns authorization and forwards audio to the selected server-side provider. Provider credentials do not cross to Web or Native clients.
- `QuranLiveMatcher` aligns transcript text against Tabyan's canonical Quran words; `RecitationStateEngine` applies confidence and confirmation rules. Provider labels are not themselves authoritative learner mistakes.
- The local Tarteel Whisper adapter is already behind the same server interface. It emits completed transcripts only; it does not synthesize partial transcripts or replace the current route.
- The current OpenAI/Speechmatics/NVIDIA selection and the existing provider lifecycle are unchanged.

## Provider-neutral contracts

- The shared `@workspace/tabyan-domain` package now defines three separate layers: `ProviderObservation`, `NormalizedRecitationEvent`, and `ConfirmedTabyanRecitationEvent`.
- Existing transcript output passes through the shared structural normalizer and a client bridge that accepts only partial/final transcript events. It preserves optional confirmation eligibility rather than converting an absent value to `false`; provider confidence does not bypass matcher/state-engine confirmation.
- Arabic token normalization remains in Tabyan's existing `normalizeQuranText` → `QuranLiveMatcher` path. Provider coordinates are hints and do not become canonical Quran identity.
- A confirmed-event projector reads only `RecitationStateEngine` events transitioning to `confirmed`, validates the engine word against the canonical matcher word, and emits a correction only for a previously confirmed event. Sound feedback consumes that typed stream; tentative state remains ungraded.
- The QRC parser produces provider observations and normalized events. The acceptance path is selectable only in development with explicit `nabr`, `NABR_QRC_ENABLED=true`, `NABR_QRC_DRY_RUN=false`, `NABR_QRC_SHADOW_MODE=true`, and `NABR_QRC_ONE_SHOT_TEST=true`; the shared runtime remains disabled and dry-run.
- QRC structured observations use a separate sanitized WebSocket message and listener API. They do not cross the transcript matcher, do not create `ConfirmedTabyanRecitationEvent`, and are emitted to clients only in development shadow mode. A canonical resolver maps coordinates against the existing Tabyan Quran corpus and server-owned session scope, while keeping results unconfirmed.
- The transport has no transcript synthesis, retry/failover, one process-local session lease, local timeouts, and a bounded in-memory comparison trace. Provider-specific audio conversion stays inside the transport boundary.
- QRC `skipped_words` remains `reported_skipped` / `unclassified`; the documented protocol does not distinguish omissions, substitutions, jumps, or ASR uncertainty. Unknown events remain harmless.
- Full contracts and source-vs-Tabyan details: [canonical contract](TABYAN_RECITATION_CANONICAL_CONTRACT.md) and [QRC-to-Tabyan matrix](QRC_TO_TABYAN_CONTRACT_MATRIX.md).

## Nabr documentation findings

1. The QRC technical guide documents a binary MessagePack WebSocket, `START_TILAWA_SESSION`, `CHECK_TILAWA_AUDIO`, `RESET_TILAWA_SESSION`, and the server messages `QRC_CLIENT_CONNECTED`, `TILAWA_SESSION_STARTED`, `TILAWA_SESSION_ENDED`, `TILAWA_RESULT`, `KEEP_ALIVE`, and `QRC_ERROR`.
2. QRC audio is documented as 16 kHz mono: one complete WAV per message or one raw 20 ms Opus packet. The current guide shows 200 ms WAV frames. It describes results beginning after about 3 seconds of speech, then roughly every 500 ms of new audio, and a heartbeat about every 15 seconds; these are guide statements, not measured service levels. No live audio was tested.
3. The current guide's result schema contains position, `correct_words`, `skipped_words`, tajweed mistakes, and letter mistakes, but no transcript text, partial/final transcript events, confidence, word timestamps, or stable result event IDs. An older saved documentation snapshot includes a `text` field, so transcript support remains unverified and is not forwarded.
4. The QRC guide defines result exit codes 6 (success) and 8 (Surah finished). Other values remain unverified in the QRC adapter. The separate [Nabr API overview](https://nabrquran.ai/en/api) describes a broader 0–8 status list; Tabyan does not assume that page's semantics apply to the QRC protocol hosted on `qurani.ai`.
5. The [QRC guide](https://qurani.ai/en/docs/2-advanced-tools/qrc) identifies `wss://api.qurani.ai` and shows an API key in the `api_key` query parameter. Tabyan's candidate transport keeps that key server-side and does not log the URL. No provider-defined environment-variable name is documented or invented. Vendor confirmation of the approved server-to-server credential arrangement is still required.
6. QRC's `skipped_words` entries do not identify a Tabyan omission or substitution. `speachLike`, `message`, `errorCode`, and optional letter index are preserved only as mistake hints; they do not establish canonical word identity or confirmation.
7. The QRC guide requires a subscription. The [privacy summary](https://nabrquran.ai/en/privacy) and [terms summary](https://nabrquran.ai/en/terms), both dated 2026-05-05, leave retention, deletion, deployment-specific controls, commercial terms, service levels, and support commitments to a separate agreement/contact. The Nabr terms prohibit public benchmarking of returned data unless an agreement allows it.

## Local model license and comparison

- The upstream [Tarteel Whisper model card](https://huggingface.co/tarteel-ai/whisper-base-ar-quran) currently identifies its license as Apache-2.0. This is a positive upstream license signal; verify provenance and notices for the exact converted/quantized local artifact before redistributing weights. No weights were downloaded or redistributed for this work.
- The existing real-audio benchmark can compare the local adapter with OpenAI, but no local audio fixtures are present; it fetches public Quran.com recordings when run. It has not been run as part of this work. There is no Nabr transport in the benchmark yet.
- A like-for-like Nabr/local comparison still needs an approved test set, a confirmed vendor API contract, and a cost/privacy-approved route. Public claims are not a substitute for Tabyan measurements.

## Readiness scaffold

- `NABR_QRC_ENABLED` remains `false`; `NABR_QRC_DRY_RUN` remains `true`; `NABR_QRC_SHADOW_MODE=true` is explicit; the one-shot test flag is unset. Dry-run validates local MessagePack payloads, 24 kHz PCM16LE-to-16 kHz mono WAV framing, and synthetic fixtures with zero sockets, HTTP requests, uploaded audio, or provider credits.
- The provider path is wired to the authenticated realtime gateway and a separate development-only structured-observation listener. A process-local gate accepts at most one GENERAL session starting at Al-Fatiha 1:1 word 1. It is not selected by the current development or production route; no live Nabr session has occurred.
- Whitelisted development diagnostics capture decoded event fields and event timing without audio or API-key values; median/P95 intervals are withheld until at least five intervals exist.
- Local safeguards are not vendor limits: 10 s connection/start timers, a 45 s heartbeat watchdog, a 180 s acceptance cap, a 10 s reset-ack timeout, and one in-process session lease. The transport never reconnects or fails over. The guard is not distributed across multiple server processes.
- Audio conversion accepts the existing server-side mono 24 kHz PCM16LE boundary and emits complete 200 ms 16 kHz mono PCM16 WAV frames, with a final shorter WAV at stop. The provider's mandatory chunk size and exact timing requirements remain unverified.
- Bounded raw/normalized/confirmed traces are in-memory only. They contain no audio and are not persisted. Confirmed Tabyan events can be supplied only by the existing state-engine bridge; QRC observations do not produce them.
- The future short scenario is anchored to canonical Mushaf page 1, verse `1:1`, whose page JSON contains word indices 1–5: correctly recite words 1–2, omit word 3, recite words 4–5, then repeat word 5. This is a coordinate plan only; no Quran text was generated and no recording exists in the repository. The server-owned QRC start-level mapping remains unresolved.

## Phase status

| Phase | Result |
|---|---|
| A — Trace the current runtime | PASS |
| B — Provider capability contract | IMPLEMENTED; unverified is distinct from unsupported |
| C — Canonical three-layer contract | IMPLEMENTED; normalized transcript bridge is in the existing client path |
| D — Nabr/QRC parser and adapter boundary | Parser stays offline; isolated candidate transport and dry-run implemented, default-disabled and not routed |
| E — Reuse local Quran Whisper | ALREADY IMPLEMENTED behind the server provider interface |
| F — Provider comparison harness | Existing local/OpenAI harness found; Nabr comparison not yet possible |
| G — Contract fixtures and safety tests | Focused mocked transport, audio-boundary, disabled/dry-run, timeout, cleanup, and contract tests pass |
| H — Stop before paid Nabr testing | PASS; no Nabr service endpoint or audio request made |

## Verification

- Previous offline-closure baseline: API tests 72/72 and API build passed before this readiness scaffold.
- Current focused check: `pnpm --filter @workspace/api-server exec tsx --test src/recitation-providers/NabrQrcTransport.test.ts src/recitation-providers/recitation-contracts.test.ts` — 17 passed, 0 failed.
- Current `pnpm --filter @workspace/api-server typecheck` — passed. The unrelated full API suite was not rerun, as required by the readiness work order.
- `pnpm --filter @workspace/tabyan exec vitest run src/lib/mushaf/recitation-feedback.test.ts src/lib/recitation-ai/normalized-provider-bridge.test.ts` — 18 passed, 0 failed.
- `pnpm --filter @workspace/tabyan typecheck` — passed.
- `PORT=4173 BASE_PATH=/tabyan/ pnpm --filter @workspace/tabyan build` — passed; Vite reported non-fatal source-map and mixed static/dynamic-import warnings outside the changed provider contract.
- The API and Web workflows had previously restarted successfully. For this readiness scaffold, the managed API workflow rebuilt and restarted successfully; `GET /api/healthz` returned HTTP 200. The signed-in Mushaf/recitation screen was not visually verified because the preview browser has no authenticated session.

## Required before enabling Nabr

- Written confirmation of the QRC host/authentication arrangement for server-to-server use, versioned schema (including the transcript-field discrepancy), non-6/non-8 exit-code meanings, result/event identity and replay behavior, provider timeout/reconnect/session/rate/concurrency limits, and supported GENERAL/EDUCATIONAL start-position mapping.
- Commercial subscription/quote and billing approval.
- Agreement covering audio retention/deletion, model-improvement use, data-processing roles, region/subprocessors, security, and support/SLA.
- A server-owned or explicitly local-only start-position contract compatible with Tabyan's GENERAL and EDUCATIONAL session rules.
- Confirmation of non-6/non-8 QRC exit-code meanings and result replay/event-identity semantics.
- An approved comparison corpus and an explicitly tested, canonical matcher/state-engine mapping for any future QRC word/mistake hints.

## Safety and cost record

- Paid API calls: **0**
- Student audio sent to an external provider: **0**
- GPU or model download: **0**
- Production provider changes: **0**
- Database/auth/user-data changes: **0**
- Nabr connection / external audio: **NO / 0**
- Dry-run network requests: **0**
- Official public documentation pages reviewed; no Nabr service endpoint called.
- The API restart triggered the existing development-only Tarteel Whisper cache warmup on CPU (about 4.4 s); this was not a baseline run, and no model download or GPU use was observed.
- No paid platform action was intentionally initiated; Replit credit metering was not inspected.
- Deployment/publish: **NO**

**Final gate: `BLOCKED_BY_COMMERCIAL_TERMS`**, with additional credential and protocol/mapping blockers. Do not run a live session until those are closed and the user explicitly authorizes the single test.
