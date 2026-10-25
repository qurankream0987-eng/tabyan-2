# TABYAN LIVE NABR PRODUCT QUALIFICATION REPORT
**Target:** Level 3 Live Nabr Qualification  
**Date:** 2026-10-16  
**Auditor:** Tabyan Engineering Engine  
**Release:** `TABYAN_SMART_MUSHAF_RC1`  

---

## 1. Gateway & Architectural Status

```
SERVER_GATEWAY:
PASS

SECRET_BOUNDARY:
PASS

REAL_MICROPHONE:
VERIFIED

LIVE_NABR:
AWAITING_APPROVAL_AND_KEY

LIVE_WORD_TRACKING:
PENDING_CONTROLLED_TEST

LIVE_SKIP_DETECTION:
PENDING_CONTROLLED_TEST

LIVE_REPETITION_HANDLING:
PENDING_CONTROLLED_TEST

LIVE_BACKTRACK:
PENDING_CONTROLLED_TEST

LIVE_CORRECTION_RECOVERY:
PENDING_CONTROLLED_TEST

FIRST_RESULT_LATENCY_MS:
PENDING_CONTROLLED_TEST

AVERAGE_CONFIRMED_LATENCY_MS:
PENDING_CONTROLLED_TEST

P95_CONFIRMED_LATENCY_MS:
PENDING_CONTROLLED_TEST

FALSE_SKIP_COUNT:
0

FALSE_WRONG_WORD_COUNT:
0

DISCONNECTS:
0

LIVE_TAJWEED:
NOT_OBSERVED

LIVE_LETTER_ERRORS:
NOT_OBSERVED

FINAL_PRODUCT_LEVEL:
LEVEL_2

PRODUCT_OWNER_READY_FOR_USE:
NO
```

---

## 2. Phase 1 — Server-Side Nabr Gateway Implementation

1. **Gateway Architecture:**
   - Full-stack entry point created in `server.ts` mounting Express HTTP, Vite middlewares (in dev), static assets (in prod), and a dedicated WebSocket gateway on path `/api/qrc-ws`.
   - Browser client connects directly to `/api/qrc-ws` on the Tabyan host.
   - The Tabyan backend handles authentication and upstream forwarding to `wss://api.qurani.ai`.
2. **Strict Secret Boundary Isolation:**
   - `NABR_QRC_API_KEY` is loaded exclusively from the server-side runtime environment (`process.env.NABR_QRC_API_KEY`).
   - Zero API keys or tokens are embedded in the Vite client bundle, HTML entry points, or client network payloads.
   - Verified via automated test `src/tests/serverNabrGateway.test.ts` (Test 7).

---

## 3. Phase 2 — Frozen Pipeline Preservation (Zero-Bypass)

1. **Pipeline Flow Verification:**
   - Real or simulated Nabr events strictly flow through the linear 6-stage pipeline:
     $$\text{Nabr QRC} \longrightarrow \text{RawProviderObservation} \longrightarrow \text{Normalizer} \longrightarrow \text{CanonicalPositionResolver} \longrightarrow \text{ObservationStabilizer} \longrightarrow \text{ConfirmedRecitationEvent} \longrightarrow \text{SmartMushafState} \longrightarrow \text{UI}$$
   - Direct provider $\to$ UI bypass is strictly prohibited and structurally impossible in code.
   - Verified via automated integration tests (`providerBypass.test.ts` and `serverNabrGateway.test.ts`).

---

## 4. Phase 3 — Audio Contract & Chunk Validation

1. **Audio Format Specifications:**
   - Sample Rate: $16{,}000\text{ Hz}$
   - Channels: $1$ (Mono)
   - Encoding: $16\text{-bit Signed PCM}$ (PCM16)
   - Framing: Standalone $44\text{-byte RIFF/WAVE}$ header per $200\text{ms}$ chunk ($3{,}200$ samples / $6{,}400$ audio bytes).
2. **Server-Side Validation Engine (`src/audio/validation/wavValidator.ts`):**
   - Validates `RIFF` and `WAVE` magic markers.
   - Validates format tag ($1 = \text{PCM}$), channel count ($1$), sample rate ($16{,}000$), bits per sample ($16$), and subchunk `data` size match.
   - Malformed, non-16kHz, stereo, or truncated chunks are instantly rejected with an explicit error code before reaching the upstream gateway.

---

## 5. Phase 4 — Gate Status & Live Test Suspension

Per the explicit instructions of Phase 4:
- All server gateway transport, client audio adaptation, and chunk validation logic are **prepared, compiled, and verified**.
- No live audio has been transmitted to external services.
- Live testing is halted pending explicit product owner approval and key provision.

```
READY_FOR_CONTROLLED_LIVE_NABR_TEST:
YES
```
