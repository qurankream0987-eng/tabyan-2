# Tabyan Smart Mushaf — Realtime Performance Isolation

**Review date:** 2026-10-17  
**Status:** `Wave 1 complete; Wave 2 local following fix and trace implemented; independent realtime probe phases 1–6 validated in controlled Chromium; physical-device verification and session attribution pending`
**Product optimization:** Added a memoized per-ayah content boundary; Quran text, provider, stabilization, and event semantics are unchanged
**Live Nabr / database writes / deployment by this work:** None
**Current probe report:** [Realtime Truth Probe](TABYAN_MUSHAF_REALTIME_TRUTH_PROBE_REPORT.md)

## Conclusion

The original isolation run placed the largest measured cost in the **full-Surah render/state path**, not in normalization, resolution, or stabilization. Wave 1 added a memoized `AyahContent` boundary that compares the relevant state and rendering props for each ayah. On the deterministic rerun, C6 render-phase p95 fell from 134–150 ms to 17–22 ms across the same four logging/diagnostics modes (85.3–87.6% lower). The full scope remained mounted: 6,117 words, 286 ayahs, and 48 canonical pages. C6 still processed 36 observations, 72 reducer dispatches, and 36 App commits; the trace still counted 67 `QuranWordSpan` function calls.

In the corrected trace-only profile, `MushafRenderer` subtree p95 was 13.3 ms and its measured function self-time p95 was 11.4 ms; the corresponding pre-optimization trace measured 137.3 ms and 125.8 ms. The C5 page-render p95 was 1.6–2.0 ms without trace callbacks, down from the 3.9–4.0 ms baseline. These are headless Chromium render-phase measurements, not paint or device timings.

Repeated D1 trials still triggered all eight off-screen scrolls when enabled and none when disabled. The synchronous `scrollIntoView()` call p95 was 0.1 ms, while the smooth-scroll settle interval remained about 1.56 seconds. This is not a claim that 1.56 seconds of main-thread blocking occurred.

The harness used generated oscillator audio and the local mock provider. It did not request real microphone permission, connect to Nabr, send audio over a WebSocket, write database records, or publish a deployment. Browser emulation was headless Chromium at 1280 × 800, not a physical phone or Safari.

## Wave 2: Local real-microphone qualification

The development-only qualification page is `artifacts/tabyan/smart-mushaf-v3/real-mic-qualification.html`. It captures microphone PCM through `AudioWorklet`: mono downmix, 16 kHz resampling, 200 ms frames, local `SPEAKING` / `SILENT` state, and silent audio output. Vite emits the processor as a separate same-origin JavaScript asset; there is no `ScriptProcessorNode` fallback.

The product owner reported that a real microphone with this local fake showed working speech/silence detection but about **15 seconds of visible-following lag**. The pre-fix provider throttled synthetic positions to one every **600 ms** (1.67 positions/second), used the chunk-ready timestamp as its cadence clock, and did not drop stale audio. The engine also waited for asynchronous canonical resolution before displaying the fake candidate. No pre-fix per-stage trace was captured, and the source contains no explicit 15-second timer; the exact measured share of lag from each factor therefore remains unknown.

The fix emits the first position immediately on speaking and subsequent positions at a **400 ms live gateway-receive cadence**. It resets that cadence on speech resume and drops audio older than **750 ms**, rather than replaying old chunks. The local candidate now takes a separate fast provisional path: it validates integer WordKey fields and active-scope membership, updates the provisional cursor before the asynchronous resolver, and remains isolated from reducer state. The existing normalizer/resolver/stabilizer/confirmed-event pipeline still runs unchanged; Quran and confirmation semantics were not adjusted.

Each 200 ms chunk receives a monotonic capture sequence. The local trace records capture time, VAD state, chunk-ready time, fake-gateway receive, fake-observation emit, provisional apply, visible render, stage latencies, current sequence/index values, stale drops, and queue depth. The panel exposes gateway audio age, first visible movement, steady visual lag, visual lag in words, stage p95s, AudioWorklet message rate, an estimate of pending main-thread audio messages, full-app render p95, and long-task count/max. The latest 3,000 rows can be downloaded as local JSON. The fake provider discards PCM, performs no ASR, and creates no audio network request.

Automated checks completed:

- Local fake-gateway tests: the provisional candidate is applied synchronously before the resolver completes; the confirmed path still completes asynchronously; fresh audio advances at 400 ms, silence gates progress, resume advances immediately, and a 15-second stale chunk is dropped rather than replayed.
- Parent Tabyan tests: **341 passed**; Smart Mushaf v3 suite: **72 passed**; API tests: **110 passed**.
- Deterministic fresh-frame test age is about **200 ms** with fake-gateway queue maximum **1**; a separate 15-second-old frame is counted and dropped. These are synthetic fixture values, not post-fix physical-device measurements.
- Tabyan TypeScript check, production Vite build, color check, worklet JavaScript syntax check, and `git diff --check` passed. The production build still reports the existing large Smart Mushaf chunk warning.
- The development route was visually inspected. Controlled Chromium granted its fake-device microphone permission and played a synthetic audio fixture; no physical microphone permission or physical-device metric was collected.

**Post-fix physical-device qualification remains pending.** The controlled browser measurements in the linked report use a synthetic audio fixture, not a physical microphone. Re-run scenarios A–D on a real microphone and export the trace before labeling real-microphone qualification or live-Nabr readiness as passed. Physical-device audio-age p95, steady visible lag, and visual-lag-word p95 remain unmeasured. The local fake routes make no live provider connection, WebSocket request, audio upload, database write, or deployment.

## Source audit

### Audio path (Wave 1 baseline, before the Wave 2 change)

- `AudioCaptureService` uses `ScriptProcessorNode(4096, 1, 1)`, not `AudioWorklet`. PCM downsampling runs inside its audio callback on the main thread.
- The callback creates `timestamp: Date.now()` when it runs. There is no monotonic capture timestamp or capture-to-send measurement.
- `NabrAudioAdapter` aggregates samples in a JavaScript array into 3,200-sample (200 ms at 16 kHz) WAV chunks. The chunk timestamp is assigned when the chunk is emitted, rather than preserving the capture time of its first sample.
- `NabrQrcProvider` calls `WebSocket.send()` for each completed chunk but does not sample browser `bufferedAmount`.
- The server-side QRC transport checks its own socket `bufferedAmount` against 512 KiB and logs a backpressure event, but it does not expose a periodic queue-depth/high-water series. No live transport measurements were taken.

These are measurable-risk locations, not proof of a user-visible delay.

### Mushaf rendering and state

- `App` loads the entire selected Surah into `currentAyahs`. `MushafRenderer` still maps the full ayah list and does not window or virtualize by page. Each ayah now has a memoized `AyahContent` boundary: its comparator checks ayah identity, each word's state and mistake, and rendering callbacks/config. Unchanged ayah content does not rebuild its word-span elements; no valid event, word, state, or visual state is skipped.
- The bundled canonical corpus contains **77,433 words** under the same Basmala removal and annotation-token rules used by `getCanonicalSurah`. That is not the number mounted at once.
- The initial Surah (Al-Fatihah) contains **29** canonical words. Al-Baqarah contains **6,117**. C6 mounted **6,117 word spans, 286 ayahs, and 7,661 DOM elements**, representing canonical pages **2–49** (48 pages). The rendered scope is the selected Surah, not the full 77,433-word corpus.
- `START_TASMEE_SESSION` builds state for the selected Surah's words. Both `WORD_CONFIRMED` and `CURRENT_WORD_CHANGED` shallow-copy the `wordStates` record; for Al-Baqarah that means 6,117 property slots are copied per reducer action, including actions that do not change a word's state. The reducer does not rebuild per-word arrays or maps.
- `App` and `MushafRenderer` themselves remain un-memoized. The parent still visits every ayah and compares its word values on each update; only the changed ayah's `AyahContent` function and affected word spans need to run. `QuranWordSpan` remains memoized.
- Trace-only counters show C5 invoked `MushafRenderer`, `SurahHeader`, and `BasmalaHeader` once per reducer action; a `QuranWordSpan` ran for 67 of 72 actions. Post-optimization C6 committed 36 times, ran 36 `AyahContent` functions, and retained 67 `QuranWordSpan` invocations across 72 reducer events.
- Per-component `Profiler` boundaries and self-time callbacks are enabled only in trace runs. A per-ayah `Profiler` wrapper was removed after testing showed its callback fired for memo-skipped boundaries; the corrected render count uses function self-time samples instead.
- Confirmed-event diagnostics state was toggled independently in C6. Captured logging used an in-memory sink (not DevTools console output); its call-count mode was compared with no-op logging.

### Auto-scroll

When reciting, `MushafRenderer` runs an effect for each changed active word, looks it up with `querySelector`, reads `getBoundingClientRect()`, and calls smooth `scrollIntoView()` only when the word is outside the viewport. D1 used eight distinct off-screen targets: with auto-scroll off there were zero calls; with it on there were eight. For the enabled run, `scrollIntoView()` synchronous call p95 was **0.4 ms**, target-word rectangle read p95 **15.2 ms**, and smooth-scroll settle p95 **1,561 ms**. Settle time is an animation interval, not main-thread blocking time.

## Benchmark method

- Test page: `artifacts/tabyan/smart-mushaf-v3/hot-path-decomposition.html`.
- Headless Chromium, 1280 × 800. The harness used `AudioCaptureService` with a generated 220 Hz oscillator `MediaStream` (44.1 kHz), `MockNabrProvider`, deterministic canonical observations, React Profiler, and `PerformanceObserver`.
- C0–C2 used 120 deterministic observations. C3 used 800 reducer actions against the 6,117-entry Al-Baqarah word-state. C4 used 72 reducer actions without the Mushaf. C5 used 72 actions on canonical page 2 (2:1–2:5; 36 words). C6 ran the full `App` for 36 observations / 72 confirmed-event dispatches. D1 used eight off-screen active-word targets with auto-scroll separately off and on.
- Console logging was measured as captured in-memory calls versus a no-op sink. Captured call count is not the same as captured buffer length; the ring buffer is capped at 512 entries. Diagnostics were toggled independently for C6.
- The synthetic mock fixture now translates canonical keys to the provider's current wire/index contract. The production mapping semantics were not changed. Its focused regression test passes.
- C5 uses `getPageReference(2)`, not `Ayah.page` hints: the latter form only three groups for Al-Baqarah and do not define a reliable canonical page slice. This is a harness-only correction; production Quran/page mapping is unchanged.
- Values below are single-run browser observations, not confidence intervals. C6's four mode runs and the D1 on/off pair were each run once; background scheduling, GC, and browser timing can move results. Do not infer a causal logging/diagnostics delta from small differences.
- `requestAnimationFrame` timing is a frame proxy, not compositor paint. React Profiler `actualDuration` is render-phase time, not commit or paint time. C5's root layout-flush probe intentionally forces a `getBoundingClientRect()` read and is reported separately.

## C0–C2: engine pipeline isolation

All engine-event, normalization, resolution, and stabilization p95 observations rounded to at most **0.1 ms** in these 120-event synthetic runs. C0 substituted precomputed normalization/resolution and a no-op stabilizer; C1 used the real normalizer and resolver with stabilization bypassed; C2 added the real stabilizer. C2 accepted all 120 deterministic candidates as confirmed events; candidate-to-confirmed p95 was **0.1 ms**.

The post-optimization rerun again completed all 120 observations in each stage, with all 120 candidates confirmed in C2 and p95 at or below **0.1 ms** for each measured engine operation.

| Stage | Included work | Events | Captured log calls (on / off) | Key p95 |
|---|---|---:|---:|---|
| C0 | Engine shell; precomputed normalization/resolution; no-op stabilization | 120 | 480 / 0 | Engine event: 0.1 ms |
| C1 | Real normalization and resolution; stabilization bypassed | 120 | 480 / 0 | Engine, normalizer, resolver: each ≤0.1 ms |
| C2 | Real normalization, resolution, and stabilization | 120; 120 confirmed | 480 / 0 | Engine, normalizer, resolver, stabilizer, candidate-to-confirmed: each ≤0.1 ms |

These stages isolate compute on this synthetic fixture only; they do not measure ASR, network, provider, speech-to-visible latency, or live audio transport.

## C3–C5: reducer and renderer

| Stage / logging | Samples | React actualDuration p95 | Input-to-commit p95 | Frame proxy p95 | Other observations |
|---|---:|---:|---:|---:|---|
| C3 captured logs | 800 reducer actions | — | — | — | Reducer avg 1.682 ms; p50 1.5; p95 3.0; max 6.9; 800 log calls; 1 long task, max 63 ms |
| C3 no-op logs | 800 reducer actions | — | — | — | Reducer avg 1.806 ms; p50 1.4; p95 3.9; max 13.6; 0 log calls; 5 long tasks, max 95 ms |
| C4 captured logs | 72; 72 commits | 0.1 ms | 2.2 ms | 14.9 ms | No Mushaf renderer; 72 log calls |
| C4 no-op logs | 72; 72 commits | 0 ms | 2.0 ms | 14.7 ms | No Mushaf renderer; 0 log calls |
| C5 captured logs | 72; 72 commits | 3.9 ms | 8.9 ms | 13.1 ms | Page 2: 5 ayahs, 36 word spans, 73 DOM nodes; layout-flush probe p95 1.0 ms; 0 long tasks |
| C5 no-op logs | 72; 72 commits | 4.0 ms | 7.7 ms | 13.0 ms | Same page/DOM scope; layout-flush probe p95 0.7 ms; 0 long tasks |

The original table is the pre-optimization baseline. In the post-optimization deterministic rerun, C3 again processed 800 actions and copied 6,117 word-state entries per action (reducer avg 1.847 ms, p95 3.6 ms, max 9.3 ms; 3 long tasks, max 66 ms). C4 processed 72 actions/commits without a mounted Mushaf (render p95 0.1 ms, input-to-commit p95 2.8 ms, frame proxy p95 14.7 ms).

C3's measured reducer update shallow-copies **6,117 word-state properties per action**. A UTF-8 serialization of the record is **119,309 bytes**, useful only as a size proxy; exact V8 shallow-copy allocation bytes and GC cost are not observable in this harness. The reducer does not rebuild arrays or maps per word event. At least one sampled event changed no word-state value but still copied the record.

The C5 baseline timings were collected without component callbacks. A separate trace-only run counted:

| C5 component boundary | Function calls across 72 reducer actions | Per-action distribution |
|---|---:|---|
| `MushafRenderer` | 72 | 1 on every action |
| `SurahHeader` | 72 | 1 on every action |
| `BasmalaHeader` | 72 | 1 on every action |
| `QuranWordSpan` | 67 | avg 0.931; min 0; max 1; 5 actions rendered no word span |
| **Tracked renderer-subtree total** | **283** | avg 3.931; p50/p95 4; min 3; max 4 |

This total includes only the four named product component boundaries, not the harness component. The 36-word page slice is rendered under `MushafRenderer`. The pre-optimization implementation had no separate ayah component boundary; Wave 1 added memoized `AyahContent`.

Post-optimization C5 latency runs were uninstrumented (`trace=0`); both kept 36 word spans and five ayahs mounted:

| Captured logs | Events / commits | React render p95 | Input-to-commit p95 | Frame proxy p95 | Layout-flush probe p95 |
|---|---:|---:|---:|---:|---:|
| On | 72 / 72 | 1.6 ms | 5.2 ms | 13.9 ms | 1.0 ms |
| Off | 72 / 72 | 2.0 ms | 6.1 ms | 14.0 ms | 0.7 ms |

The post-optimization C5 trace still counted 67 word-span function calls over 72 reducer actions. The latency samples are single runs and should not be read as a controlled estimate of the logging effect.

## C6: full App, logging and diagnostics matrix

The full Al-Baqarah scope remained mounted throughout: **6,117 words, 286 ayahs, 7,661 DOM elements, canonical pages 2–49 (48 pages), no page windowing**. Each run contained 36 synthetic observations and 36 outer App commits. The trace run confirmed 72 reducer dispatches.

### Pre-optimization baseline

| Captured logs | Diagnostics | App render-phase p95 | Observation-to-commit p95 | Audio callback interval p95 | Long tasks (count; max) | Captured log calls |
|---|---|---:|---:|---:|---:|---:|
| On | On | 150.1 ms | 159.9 ms | 222.5 ms | 50; 181 ms | 216 |
| Off | On | 135.4 ms | 141.4 ms | 156.5 ms | 19; 172 ms | 0 |
| On | Off | 134.0 ms | 144.3 ms | 160.0 ms | 40; 177 ms | 216 |
| Off | Off | 138.8 ms | 145.8 ms | 204.6 ms | 50; 173 ms | 0 |

### Post-optimization rerun

| Captured logs | Diagnostics | App render-phase p95 | Observation-to-commit p95 | Audio callback interval p95 | Long tasks (count; max) | Captured log calls |
|---|---|---:|---:|---:|---:|---:|
| On | On | 22.1 ms | 28.8 ms | 192.5 ms | 31; 179 ms | 216 |
| Off | On | 19.5 ms | 30.4 ms | 135.3 ms | 26; 160 ms | 0 |
| On | Off | 19.6 ms | 25.8 ms | 143.9 ms | 23; 185 ms | 216 |
| Off | Off | 17.2 ms | 24.2 ms | 124.0 ms | 16; 91 ms | 0 |

Across matching modes, render-phase p95 fell by **85.3–87.6%**. Observation-to-commit p95 fell by **78.5–83.4%**. The one-run logging and diagnostics matrix still has no stable monotonic delta; do not infer a causal toggle effect from small differences.

A separate corrected trace-only C6 run counted **36 App commits**, **72 reducer dispatches**, **67 `QuranWordSpan` function calls**, and **36 `AyahContent` function calls**. It measured `MushafRenderer` subtree p95 at **13.3 ms**, self-time p95 at **11.4 ms**, and full App render-phase p95 at **23.2 ms**. The prior trace measured 137.3 ms and 125.8 ms for the renderer subtree and self-time respectively. Do not mix trace-only durations with the uninstrumented matrix. Trace-mode callbacks were removed from the per-ayah Profiler boundary after it was found to report callbacks for memo-skipped ayahs.

## D1: auto-scroll and target layout

Eight distinct targets were selected beyond the initial viewport. Auto-scroll-off caused zero scroll calls. Auto-scroll-on caused all eight expected `scrollIntoView()` calls.

| D1 mode | React render-phase p95 | Audio callback interval p95 | Scroll calls | `scrollIntoView()` call p95 | Target rect-read p95 | Smooth-scroll settle p95 | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|
| Auto-scroll off | 50.1 ms | 192.3 ms | 0 | — | — | — | 8; max 200 ms |
| Auto-scroll on | 179.0 ms | 140.4 ms | 8 | 0.4 ms | 15.2 ms | 1,561 ms | 11; max 238 ms |

Post-optimization D1 rerun:

| D1 mode | React render-phase p95 | Audio callback interval p95 | Scroll calls | `scrollIntoView()` p95 | Target rect-read p95 | Smooth-scroll settle p95 | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|
| Auto-scroll off | 9.5 ms | 129.3 ms | 0 | — | — | — | 6; max 265 ms |
| Auto-scroll on | 11.6 ms | 100.7 ms | 8 | 0.1 ms | 15.3 ms | 1,558.7 ms | 5; max 144 ms |

The enabled synchronous method call was brief; the much larger settle interval describes smooth movement, not a 1.56-second blocking task. The eight targets remained off-screen initially and all eight viewport crossings were observed in both modes. With only eight samples per mode, React/audio/long-task differences are descriptive, not controlled estimates of scroll's causal cost.

## Instrumentation limits and outstanding measurements

| Measurement | Status |
|---|---|
| Real speech-to-visible-recognition latency | N/A — no live ASR/provider |
| Audio capture-to-network send, browser WebSocket `bufferedAmount`, server audio queue | N/A — no provider socket or audio send |
| Browser GC events / exact allocation bytes | Not observable in this setup; `gcObservable` is false |
| Physical iPhone/Android, Safari, production font rendering | Not tested; headless desktop Chromium only |
| Real microphone, live Nabr, database writes, deployment | Not used |
| Nested `smart-mushaf-v3` lint/build | Blocked before product-source checking: the nested package cannot resolve its Vite executable or server imports `express`, `ws`, and `dotenv`. These dependencies are declared in its manifest but unavailable in that package's current resolution context; no install or dependency change was attempted. Parent artifact typecheck/build pass. |

The square glyphs were traced to the isolated benchmark entry, not to changed Quran text: `hot-path-decomposition.html` imports the V3 stylesheet, and `smart-mushaf-v3/src/index.css` contains only Tailwind. The renderer references font family names such as `Amiri Quran`, `Amiri`, `Scheherazade New`, and `Noto Naskh Arabic`, but that entry does not load their font faces. The parent artifact stylesheet's Google Fonts import is not part of this standalone entry; the browser recorded no font faces or font requests, and the screenshot showed missing glyph boxes. No font or Quran-data change was made. This is evidence about the benchmark route's fallback chain, not validation of the main reader's production fonts.

The only failed network request captured for the benchmark route was `GET /favicon.ico` (404, `text/plain`); no Quran, font, or application-data request failed. It does not explain the square glyphs. The original isolation baseline used `ScriptProcessorNode`; the Wave 2 qualification path now uses `AudioWorklet`.

## Verification and decision

- Focused TypeScript check and `@workspace/tabyan` parent typecheck passed.
- Parent Vite production build passed; it reported existing source-map, mixed auth-import, and large-chunk warnings.
- Focused `MockNabrProvider` index-contract regression test passed (1 test).
- The complete synthetic C0–C6 and D1 suite returned results after the change. Event counts and mounted word counts stayed at their specified workloads; no provider or stabilization code changed.
- `git diff --check` passed; the `tabyan-check-colors` workflow passed.
- The preview screenshot showed the expected synthetic Tasmee UI and the isolated-route font fallback. Browser logs contained no JavaScript exception; the only resource error was the identified favicon 404, plus the expected `ScriptProcessorNode` deprecation warning.

- `PRIMARY_BOTTLENECK`: **The full selected-Surah renderer/state path remains the largest measured React cost.** Per-ayah memoization reduced the measured C6 React render p95 by 85–88%; the optimized trace still measured a 13.3 ms renderer subtree p95.
- `MUSHAF_ITSELF_CAUSES_MEASURABLE_LATENCY`: **Yes, in this synthetic full-App update path.** The C5 page renderer p95 fell from about 4 ms to 1.6–2.0 ms, while the C6 full-Surah render p95 fell from 134–150 ms to 17–22 ms. These are render-phase results, not proof that rendering explains every user-visible delay or that the same timing holds on physical devices.
- `NEXT_FIX`: **The Wave 1 targeted React optimization and Wave 2 local following fix are implemented.** The full Surah is still traversed and the reducer still copies its 6,117-key word-state record; no optimization was made there. Preserve provider mapping/stabilization semantics; post-fix physical-microphone verification is still required before any live-provider test.

