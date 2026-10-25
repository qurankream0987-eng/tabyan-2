# Smart Mushaf — Live Recitation Engine (Phase 1: Mushaf engine)

Route: `/student/smart-mushaf-v3` (`src/pages/student/SmartMushafV3.tsx` → `smart-mushaf-v3/src/App.tsx`).
This document supersedes the provider/renderer descriptions in the older RC1 handoff files
(`handoff-status.json`, `TABYAN_SMART_MUSHAF_RC1_VERIFICATION.md`), which describe the
removed `MockNabrProvider` / `RecitationSessionEngine` pipeline.

## Canonical Quran data

| Source | Role |
|---|---|
| `src/quran/data/tanzil-uthmani.txt` (sha256 `6933e133…`) | Word identity: 6,236 ayahs, 77,433 WordKeys after Basmala separation |
| `artifacts/tabyan/public/mushaf/pages/{1..604}.json` + `fonts/p{n}.woff2` (QCF v2) | Printed page/line geometry and glyphs |

The two corpora segment four ayahs differently (QDC joins two Tanzil words):
2:181, 8:6, 13:37 («بَعْدَ مَا») and 37:130 («إِلْ يَاسِينَ»). 2:181 additionally carries the QDC
end-marker-as-word quirk, so its word *count* matches while positions after word 3 do not.
`quran/layout/qcfAlignment.ts` binds each joined glyph-word to both WordKeys; neither dataset
is modified. `qcfCanonicalAlignment.test.ts` checks all 77,433 WordKeys against all 604 pages
and fails on any undocumented difference.

Never hand-type Quran text in code: typed Arabic gets canonically re-ordered (e.g. fatha
before shadda), silently changing bytes. Derive it from the Tanzil source
(see `quran/data/basmala.ts`).

## Architecture

```
mic (AudioWorklet, 20 ms PCM16 @16 kHz) ─► EnergyVad (main thread, never gates audio)
        │                                       │
        ▼                                       ▼
 BoundedFrameQueue (3 s, pre-connect) ─► LiveRecitationProvider ─► canonical LiveRecitationEvent
                                          (NabrLiveAdapter | FakeStreamProvider[dev])
                                                         │
LiveRecitationController ── sessionMachine (IDLE … ERROR) │
        │                                                ▼
        └──────────────► PositionTracker (global ordinals, bounded movement)
                                   │
                                   ▼
                     WordPresentationStore (typed arrays, per-word subscriptions,
                     ordinal → element registry)
                                   │  notifies only touched ordinals
                                   ▼
                     QcfWord glyphs (useSyncExternalStore) — pages never re-render
```

- **Event contract** (`live/contracts/events.ts`): `session.ready`, `audio.started`,
  `speech.started/ended`, `position.candidate/confirmed`, `word.candidate/confirmed`,
  `word.flagged` (MISTAKE, TASHKEEL_WARNING, SKIPPED, RECOVERED), `ayah.changed`,
  `provider.partial/final`, `provider.error` (classified code + recoverable), and
  `connection.changed`. Every positioning event carries the WordKey, surah, ayah, wordIndex,
  confidence, event and audio timestamps, and status. Each event also has a per-session `seq`.
- **Provider boundary** (`live/contracts/provider.ts`): `startSession`, `pushAudioFrame`,
  `pause`, `resume`, `stop`, `subscribeToEvents`, `getConnectionState`. The Mushaf never sees
  vendor payloads, auth, or socket details.
- **Position rules** (`live/position/PositionTracker.ts`):
  - Small forward steps advance immediately. Gaps are flagged as skipped only after later
    forward evidence (delayed skip).
  - Small backward steps are treated as repetition, with no penalty.
  - Larger jumps need 3 agreeing events, or an explicit "start from here" tap.
  - Stale, duplicate, and foreign-session events are dropped.
  - After a reconnect, the tracker keeps its progress and does not flag words lost during
    the gap.
- **Follow mode** (`live/follow/followPolicy.ts`, `mushaf/qcf/QcfMushafView.tsx`):
  - The reading line stays in a comfort band, with no scroll for movement on the same line.
  - When the line nears the bottom edge, one conservative step scrolls it back to the top of
    the band.
  - Long moves jump instead of animating.
  - Follow is suspended for 4 s after user touch, wheel, or keyboard input. A
    "العودة إلى موضع التلاوة" pill rejoins the recitation position.
- **Responsiveness**:
  - The tap switches to "جارٍ تجهيز الميكروفون" synchronously.
  - The microphone and provider start in parallel.
  - The audio device is pre-warmed during idle time when a live mode opens. Constructing the
    first `AudioContext` blocks the main thread for about 115 ms in Chromium.
  - Page mounts are React transitions, so they never block a word update.

## Production safety

- `createLiveProvider` builds only the Nabr adapter in production. The fake stream's dynamic
  imports sit inside `import.meta.env.DEV` branches, so the chunk is absent from production
  builds. Verify a build with `node smart-mushaf-v3/scripts/audit-production-bundle.mjs dist/public`.
- The dev diagnostics panel and the `sm*` URL switches are DEV-only.
- The `/student/smart-mushaf` mock prototype route is registered only in DEV.
- Provider credentials stay in the API server (`artifacts/api-server/src/nabrQrcGateway.ts`).
  The browser sends only the Tabyan token and audio.
- Gateway errors are classified by code. Server message text is never shown. All learner
  copy lives in `live/session/messages.ts`.
- Audio exists only in memory on its way to the provider. Nothing is recorded or uploaded
  elsewhere.

## Nabr readiness (no live calls made in this phase)

- **Path:** browser → `wss://…/api/ws/nabr-qrc-gateway` (Tabyan token auth, `start` with the
  1-based surah/ayah/word) → 200 ms 16 kHz mono WAV chunks → server → QRC (MessagePack).
  Observations come back as `NabrQrcGatewayObservation`.
- **Live mode** requires `NABR_QRC_GATEWAY_LIVE_ENABLED=true` on the server. Development
  uses the server's fake QRC transport.
- **Translation** (`live/providers/NabrLiveAdapter.ts`):
  - The default policy is `candidate-only`: `currentPosition` becomes `position.candidate`.
  - `confirm-correct-words` (opt-in) turns `correctWords` into `word.confirmed` plus a
    confirmed cursor.
  - Skipped words and letter/tajweed mistakes become `word.flagged`.
  - Non-canonical coordinates are dropped.
- **Evidence** (`research/TABYAN_NABR_QRC_EVENT_SEMANTICS.md`, the only live capture):
  - Results arrived at about 1 Hz, often repeating the same coordinate.
  - The cursor advanced 4 times in about 30 s, and moved backward once.
  - There were no event IDs or confidence values, and `exit_code=7` is undocumented.
- **Phase-2 conclusion:** QRC as captured is **not** word-incremental at Tarteel cadence.
  The client forwards each result immediately and never waits for a phrase, but the
  provider cadence itself must be re-measured live. If it stays near 1 Hz, phrase-level
  updates are the ceiling and should be marked unacceptable for the live path.
- **Open questions for phase 2:**
  - Does QRC `word_index` follow Tanzil or QDC segmentation? The adapter supports both
    through `segmentation: 'tanzil' | 'qdc'`.
  - What do the result windows mean, and what does `exit_code=7` mean?
  - What chunk size or latency trade-off does the provider accept? It currently receives
    200 ms WAV chunks; the client captures 20 ms frames.

## Platform differences

| | Web (this route) | Native (Expo, `artifacts/mobile`) |
|---|---|---|
| Capture | AudioWorklet, 20 ms PCM16 frames, true streaming | `react-native-audio-api` `AudioRecorder.onAudioReady`, 100 ms buffers @24 kHz, true streaming |
| Current consumer | Live engine → Nabr gateway | `/api/ws/recitation` transcription gateway (base64 JSON), separate native matcher |
| Smart Mushaf QCF renderer + live engine | Yes | **Not yet.** Native can feed the same canonical contract: resample to 16 kHz and send binary WAV chunks to the Nabr gateway. Expo Go cannot stream. |

## Verification

- Unit and integration tests: `pnpm --filter @workspace/tabyan run test:smart-mushaf`.
- Gateway e2e (local fake QRC upstream): `npx vitest run --config e2e/vitest.config.ts`.
- Real-browser benchmark against a running DEV server:
  `node smart-mushaf-v3/scripts/browser-live-check.mjs --base http://127.0.0.1:<port>`
  - `[--fake-audio file.wav]` supplies a synthetic speech-like signal for VAD timing only.
    It is not recitation.
  - `[--mode TASMEE] [--dark x]` switches the session mode and theme.
- Measurement caveat: the headless container has no GPU (4 CPUs, software raster).
  - At DPR 3 on 412–430 px-wide viewports, occasional frames take 130–250 ms, with no
    script time and no style or layout cost.
  - The same viewport at DPR 1 shows none (p99 ≈ 20 ms).
  - Confirm paint latency on real phones before claiming device-level numbers.
