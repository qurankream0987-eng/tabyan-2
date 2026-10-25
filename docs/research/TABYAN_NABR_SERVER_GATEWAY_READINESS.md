# Tabyan — Nabr/QRC Server Gateway Readiness

**Review date:** 2026-10-17  
**Scope:** Pre-live implementation and fake-only verification  
**Live Nabr test:** Not run  
**Final decision:** `NOT_READY_FOR_LIVE_TEST`

## Decision

The authenticated server gateway and fake smoke path are implemented and pass the local checks below. The fake path uses the real MessagePack transport with an in-memory QRC socket, then sends sanitized results through Smart Mushaf's normal Normalizer → Resolver → Stabilizer path.

This is **not** approval to send a real recording. Live readiness remains **NO**: Hafz/Tajweed level meanings and the approved Tabyan-to-QRC policy are unresolved, vendor/commercial/privacy terms remain incomplete, and a separate explicit authorization is required before any live test. Development always selects the fake upstream; non-development mode is disabled unless separately configured.

## Implemented path and safeguards

- Added `/api/ws/nabr-qrc-gateway` as an explicit API artifact route alongside `/api`; the artifact TOML was updated with the validated replacement workflow.
- Reuses existing Tabyan bearer-session authentication and permits student accounts only. A user has at most one active gateway connection. Authentication has a timeout; no database session or history row is created by the gateway.
- The browser connects only to the same-origin Tabyan gateway. It does not contain QRC credentials or connect directly to the provider.
- The application continues to default to the existing mock recitation provider. Selecting Nabr is an explicit development smoke choice.
- Development uses a local fake WebSocket behind the actual `NabrQrcTransport`; its QRC packets use MessagePack. The fake emits no external requests and consumes no provider credits.
- Binary client frames must be complete mono PCM16 WAV at 16 kHz, with valid RIFF/data lengths and a maximum duration of 200 ms. The validated WAV bytes are forwarded unchanged to the transport.
- Only bounded, whitelisted `TILAWA_RESULT` fields are normalized. Position, correct/skipped-word claims, letter/tajweed claims, event identity, and timestamps stay observations; no transcript is fabricated.
- QRC wire coordinates use the user's explicit **1-based** choice. The Smart Mushaf raw-provider contract stays **0-based**; the client adapter converts once at that boundary, then the existing canonical normalizer creates WordKeys.
- Keep-alives update connection diagnostics only. Duplicate provider event IDs are filtered in the browser adapter. Unknown events and invalid coordinates do not enter learner results. Provider errors are returned as safe Arabic errors.
- Reset sends the QRC reset operation once. Connection close code/reason and bounded lifecycle counters are captured without logging audio, provider packets, auth tokens, or the provider URL/key.
- No raw audio or observation history is persisted.

## Verification

| Check | Result |
|---|---|
| API server typecheck | **PASS** |
| API server test suite | **110 passed, 0 failed** |
| Gateway route/auth/WAV/ready/keep-alive/result/reset tests | **4 passed, 0 failed** |
| QRC MessagePack transport/WAV/start-failure/close/reset tests | **13 passed, 0 failed** |
| Gateway result normalizer tests | **2 passed, 0 failed** |
| Smart Mushaf suite | **71 passed, 0 failed** |
| Fake gateway → Nabr provider → canonical confirmation end-to-end smoke | **1 passed, 0 failed** |
| Tabyan core suite | **339 passed, 0 failed** |
| API production bundle build | **PASS** |
| Tabyan production Vite build | **PASS**; emitted existing source-map/chunk-size/dynamic-import warnings |
| Smart Mushaf Vite build | **PASS**; emitted a large-chunk warning |
| Tabyan package typecheck | **PASS** |
| Shared workspace library typecheck | **PASS** |
| Smart Mushaf package `tsc --noEmit` | **NOT PASS** — the nested package's install lacks declarations for `express`, `ws`, and `dotenv`, imported by its `server.ts`; Vitest and its production Vite build both pass. No dependency installation was made. |
| Shared-proxy `GET /api/healthz` | **HTTP 200** |
| Shared-proxy WebSocket route | **PASS** — an intentionally invalid synthetic token received `UNAUTHORIZED`; no session was started |
| Compiled client bundle and app-source secret scan | **PASS** — no QRC key variable names, provider host, or `api_key` parameter in the client output/app runtime source; no client source maps were emitted |
| Signed-in browser UI or authenticated audio/network capture | **NOT RUN** — preview screenshot remained on the timed splash; this work did not sign in or initiate microphone interaction. The separate Tarteel activity below was not part of this test. |

The API workflow restarted in development mode. It loaded the existing local Tarteel model from its cache on CPU during startup; no model download or GPU work was started. The gateway's development mode remained fake.

While collecting final preview logs, I observed a separate Tarteel recitation session with a live microphone track and approximately 4.97 MB sent through the existing Tarteel development path, followed by a saved-result log. This was **not** a Nabr/QRC session or part of the fake gateway test. I did not start, resume, or interact with that session, and I did not inspect its database environment or account. Its initiator and environment were not established from the available logs.

## Live-test gates still open

1. Resolve the existing commercial, privacy, data-processing, and retention questions in `NABR_QRC_LIVE_ACCEPTANCE_READINESS.md`.
2. Obtain vendor confirmation for QRC contract ambiguities and the meanings of Hafz/Tajweed levels, then approve explicit server-owned values for the intended Tabyan session mode.
3. Obtain separate owner approval for one controlled live test before enabling the live gateway or sending any audio.

Do not infer that an available workspace secret is authorized for use. Its value was not read or logged; live credentials were not accessed by this implementation or verification.

## Activity guardrails

| Activity | This task |
|---|---|
| Live Nabr/QRC connections | **0** |
| Real microphone audio initiated by this work | **NO**; the separate pre-existing Tarteel activity above is noted |
| QRC API key value read or logged | **NO** |
| Production database access by this work | **NO** |
| Deployment or publish | **NO** |
| Paid provider requests | **0** |

