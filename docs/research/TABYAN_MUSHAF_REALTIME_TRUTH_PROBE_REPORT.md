# Tabyan Mushaf — Realtime Truth Probe Report

**Date:** 2026-10-17  
**Status:** Phases 1–6 passed in a production-built, controlled Chromium run using synthetic audio; physical-device qualification and attribution of the separate reader session remain open.  
**Product-route timing changes, Nabr calls, Quran-semantic changes, database writes, and deployment by this probe:** None.

## Purpose and scope

This probe isolates local microphone capture, VAD/position timing, the normal V3 observation pipeline, provisional display, and full V3 Mushaf rendering. It is a separate page at:

`/smart-mushaf-v3/realtime-truth-probe.html`

The page does not replace or alter the existing qualification page or the normal reader. It uses a local fake gateway; audio samples are discarded and no ASR, backend WebSocket, Nabr provider, audio upload, or database write is used. Phase 6 mounts the V3 app with that local provider override.

## Controlled-browser results

The final run loaded the production build in headless Chromium and supplied a synthetic audio file through Chromium's fake microphone. This is not a physical microphone test.

| Stage | Observation |
|---|---|
| Build identity | `v4-69d7c0efdae6ac71`; worklet asset `/assets/pcm-capture-worklet-B_CdIjDd.js?probe_build=v4-69d7c0efdae6ac71` |
| Phase 1: capture | Permission granted in the fake-device browser; AudioContext running; 44.1 kHz input converted to 16 kHz mono output; 26 chunks in the sample |
| Phase 2: speech position | First position appeared synchronously on speech detection (`0.0 ms`); position cadence p50 `400.0 ms`, p95 `400.3 ms`; the position froze in silence and advanced immediately on resumed speech |
| Phase 3: normal pipeline | Six local observations; maximum queue depth `1`; no pipeline errors. Normalizer, resolver, and stabilizer p95 each `0.1 ms`; observation-to-confirm p95 `0.5 ms` |
| Phase 4: provisional feedback | Audio age at the local gateway p95 `211.0 ms`; zero stale drops; provisional-to-DOM p95 `24.9 ms`; capture-to-provisional p95 `211.0 ms` |
| Phase 5: canonical strip | Rendered 15 canonical words; current position highlighted |
| Phase 6: full V3 app | Session active; 10 audio observations and 20 confirmed events; provisional-to-render p95 `7.1 ms`; expected Al-Fatihah content mounted |

The production-built page and versioned worklet both returned successfully. The controlled run recorded no browser exceptions and no requests to remote hosts. Earlier development runs showed the same phase behavior, including 12 local observations, maximum queue depth `1`, and zero stale drops.

## How this differs from the normal Web reader

The normal Web route is `/student/mushaf-fahd`, rendered by `MushafReader`. Its audio path uses a separate 24 kHz worklet loaded through a Blob and sends audio through the backend WebSocket/provider path. The probe instead uses the V3 16 kHz worklet and a local fake gateway.

Therefore, the probe proves that its own capture, VAD, local processing, provisional DOM update, and V3 render path are fast under the controlled fixture. It does **not** establish the latency of the normal reader's provider or explain a real user's session by itself.

## Separate reader-session evidence in app logs

While the probe was being tested, the API and browser logs also contained a separate normal-reader recitation session. The logs show the server selected **Tarteel** for that session. There is no evidence tying it to the probe, the product owner, or the earlier reported test, so it is treated as un-attributed evidence rather than an acceptance retest.

In that session:

- The server reported provider-ready at `10:56:46.876` and first audio at `10:56:49.125` (about `2.25 s` after provider-ready).
- The first 10-second audio window completed local inference at `10:57:03.768`, taking `4.74 s` of inference. The first final transcript therefore arrived about `16.9 s` after provider-ready.
- Subsequent rolling windows took about `3.06 s` and `1.68 s` to infer.
- Client heartbeats around the first result showed audio age around `90–100 ms` and `providerStalledDuringActiveSpeech: false`.
- The transcript produced a matcher `no_match`; there were no provisional or committed reveals. The later results also did not produce visible matches in the captured trace.

This is a concrete timing pattern in the same range as the reported delay. For that session, the evidence points to the Tarteel batch-window/inference path followed by transcript-to-canonical no-match—not a delayed DOM render. It is **not proof** that this was the product owner's session or the exact run behind the original report. The exact route action and provider used by the owner remain unconfirmed.

## Interpretation and next gate

The controlled probe does not show a local V3 processing or rendering bottleneck. The separate Tarteel session shows a plausible source of a roughly 15–17 second wait before the first final result, while its fresh-audio heartbeat and zero-match trace do not support a front-end queue or render delay as the cause for that session.

Do not change provider timing, throttling, Nabr, or Quran semantics based on this probe. Do not label physical-microphone or live-provider qualification as passed. Keep the product-owner retest blocked until the seven readiness conditions in the referenced note are confirmed; route/session attribution and physical-device evidence remain outstanding.

## Verification record

- Tabyan TypeScript check, parent tests (341), color check, whitespace check, and production Vite build passed.
- The production page was served from the build and exercised through all six phases.
- The build emits the probe as a separate HTML entry. No deployment was performed.
- An intermediate development HMR revision logged a missing `counter` element; it was corrected before the final run. The final development and production-controlled runs reported no browser exceptions.
- Existing build warnings about source maps and large chunks remain; the build completed successfully.
