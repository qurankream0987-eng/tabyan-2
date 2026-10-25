# TABYAN — First Nabr/QRC Session: App vs Provider Diagnosis

**Analysis date:** 2026-10-15  
**Session observed:** 2026-10-14 UTC  
**Scope:** Static diagnosis using only the existing first-session API/browser logs, the saved QRC guide, existing session reports, and current source code. No new provider connection, audio, paid request, database query or mutation, provider switch, deployment, or application change was made.

## Executive finding

The evidence does **not** support one verified root cause for the poor tracking:

- The browser capture path was active and delivered **321 chunks / 1,540,800 bytes** to the Tabyan gateway, with zero gateway-reported dropped chunks and zero provider errors.
- Those chunks represent **32.1 seconds** of the configured 24 kHz mono PCM16 stream. This is consistent, within one 100 ms frame, with the **32.006 seconds** from the first forwarded audio frame to the logged client close. The browser heartbeats show about 10 frames per second and recent audio, but there are no per-frame timestamps or retained audio with which to assess sound quality.
- Tabyan’s Nabr adapter passed through the raw top-level QRC coordinates unchanged. The **53 repeated-coordinate transitions and one backward transition are already present in the QRC result sequence**; the adapter did not introduce them. QRC’s event semantics are undocumented in the saved guide, so the repeats/backstep cannot be called errors, retransmissions, or corrections.
- The QRC input framing has a **conditional 100 ms tail-loss risk**: a graceful final `commit` uses `stop()` and flushes a partial WAV frame, while an immediate close uses `close()` and does not flush it. Existing logs do not establish which path was used, so actual tail loss in this session is **unverified**.
- The saved provider guide does not specify an exact required audio codec, sample rate, channel count, or bit depth. Tabyan requests WAV and builds mono 16 kHz PCM16 WAV frames, but an exact numeric format match to a documented QRC requirement cannot be confirmed.
- The configured Mushaf context was Al-Fatiha `1:1`, word 1, matching the displayed `1:1-7` range and `currentVerseKey=1:1`. The actual spoken words and the numeric `hafz_level` / `tajweed_level` sent over the wire were not retained.

**Conclusion:** the raw QRC position stream is the earliest captured source of the observed repeats/backstep; there is no evidence of a Tabyan coordinate-conversion error. The evidence is insufficient to determine whether those raw events indicate poor recognition or normal provider windowing/correction behavior. The possible close-tail truncation is a separate Tabyan transport risk, not an explanation for the earlier repeated/backward coordinates.

## Requested diagnostic fields

| Field | Finding |
|---|---|
| `MIC_CAPTURE` | **PASS for capture/activity only; audio quality unknown.** The browser reported a live microphone track and running AudioContext; the gateway received 321 chunks. No audio was retained for listening or signal-level review. |
| `AUDIO_FORMAT_MATCH` | **UNKNOWN.** The local stream is converted to WAV, matching Tabyan’s `audio_format=wav` URL parameter. The saved QRC guide does not state the required sample rate, channels, bit depth, or codec. |
| `FRAME_CADENCE_STABLE` | **YES at nominal cadence; exact per-frame cadence unknown.** The worklet creates 100 ms frames; heartbeat counts rise by about 10 frames per second and `lastAudioAgeMs` stays below 90 ms in the captured active heartbeats. |
| `AUDIO_GAPS_POSSIBLE` | **YES, conditionally.** The final 100 ms of converted QRC audio remains buffered if the immediate `close()` path is used; graceful `stop()` flushes it. The session logs do not identify which finalization path ran. A sub-100 ms worklet remainder may also be omitted on immediate close. |
| `RAW_QRC_DUPLICATES` | **53 same-coordinate transitions** among 58 adjacent result transitions; 46 repeated occurrences of logged diagnostic signatures after each signature’s first appearance. This is repeated captured content, not proof of duplicate wire frames. |
| `TABYAN_DUPLICATES` | **The same 53 position repeats are preserved by the adapter.** It emits a position observation for each result and does not deduplicate or stabilize them. |
| `FRAME_ORDER` | **Preserved by the single-socket send path in code; end-to-end delivery is not acknowledged per frame.** No reconnect/retry loop is present. |
| `NETWORK_LATENCY` | **Not independently measurable.** |
| `PROVIDER_LATENCY` | **Not independently measurable.** |
| `TABYAN_PROCESSING_LATENCY` | **Not independently measurable.** |
| `FINAL ROOT CAUSE` | **UNKNOWN — low confidence.** Raw QRC coordinates contain the observed repeats/backstep, the adapter preserves them, and the audio/finalization evidence is not sufficient to judge recognition quality or isolate latency. |

## Audio capture, framing, and transport

### Browser microphone and chunk format

The microphone request asks for one channel and enables echo cancellation, noise suppression, and automatic gain control. The browser creates an `AudioContext` requesting **24,000 Hz**. Its worklet takes the first input channel, targets 24 kHz, converts samples to signed 16-bit values, and emits a frame every 100 ms:

- **Input rate requested:** 24,000 samples/second.
- **Channels:** 1 (requested; the worklet also uses only the first input channel).
- **Sample width:** signed 16-bit.
- **Frame size:** 2,400 samples × 2 bytes = **4,800 bytes**.
- **Frame duration:** 2,400 / 24,000 = **100 ms**.

The browser uses an `Int16Array` buffer, while the gateway decodes the PCM as little-endian. The WAV encoder writes little-endian PCM explicitly. No live audio bytes were retained to verify the byte order or signal contents. The requested AudioContext rate is 24 kHz, but the live trace records only `audioContextState=running`, not the actual `context.sampleRate`.

The captured gateway totals reconcile exactly:

```text
321 chunks × 4,800 bytes = 1,540,800 bytes
1,540,800 bytes ÷ (24,000 samples/s × 2 bytes/sample) = 32.1 seconds
```

The first audio was forwarded at approximately **21:15:12.723 UTC** and the client close was logged at **21:15:44.729 UTC**, an elapsed **32.006 seconds**. The encoded stream’s 32.1 seconds differs by 94 ms—less than one 100 ms frame and consistent with the first chunk having accumulated before it was sent. This does not show a large missing interval. It does not prove continuous intelligible microphone audio.

The paired browser heartbeats report the AudioContext as running and the microphone track as live. They show chunk counts increasing by roughly 10 per second of recitation-session age and `lastAudioAgeMs` between 13 and 89 ms in the active snapshots. These are heartbeat-level observations, not per-frame timing records.

### Conversion and QRC framing

The gateway passes the 24 kHz mono PCM16 bytes to the Nabr transport. That transport:

1. Reads the incoming samples as signed little-endian PCM16.
2. Converts them from 24 kHz to 16 kHz mono PCM16.
3. Packages output into **200 ms WAV frames**: 3,200 samples / 6,400 PCM bytes, plus a 44-byte WAV header (**6,444 bytes total** per full frame).
4. Sends each completed frame in order as a MessagePack `CHECK_TILAWA_AUDIO` message with `client_sent_at_ms`.

For 321 complete 100 ms input frames, the arithmetic yields **160 full 200 ms QRC frames** plus **one 100 ms remainder** (1,600 output samples). The remainder’s actual fate depends on the finalization path:

- `commit(final=true)` calls the transport’s `stop()`, which calls `wavChunker.finish()` and sends any remaining samples before `RESET_TILAWA_SESSION`.
- Immediate `close()` sends a best-effort reset and closes the socket but does **not** call `wavChunker.finish()`.
- The browser’s graceful `stop()` also requests a worklet flush before committing; the immediate `close()` disconnects the processor without requesting that flush.

The original browser trace has no explicit stop/close marker, and the gateway logs do not record whether it received a final `commit` or only a close. There is no `TILAWA_SESSION_ENDED` acknowledgement in the existing QRC event capture. Therefore, **the 100 ms remainder is a proven risk in the immediate-close code path, but actual loss in this specific session remains unverified**.

### Ordering, queues, gaps, and retry behavior

- The browser sends each available PCM frame once over one WebSocket. The browser-side code records `bufferedAmount` and a derived queue depth after sending, but does not wait for the buffer to drain or stop sending at a threshold. Those queue metrics are not present in the captured heartbeat records, so actual browser-side backlog cannot be measured.
- The API reports **zero dropped audio chunks** at the gateway. That means it did not count incoming chunks rejected because the provider was not open; it is not a per-frame QRC acknowledgement.
- The Nabr socket checks for `bufferedAmount > 512 KiB` and fails the stream rather than retrying. The session recorded zero provider errors, so there is no evidence that this guard fired.
- WebSocket ordering and the sequential send calls preserve frame order within the connection. The code has no automatic reconnect or resend loop, so it does not intentionally replay frames after reconnect. No provider-side per-frame acknowledgement or sequence ID was captured; end-to-end delivery and hidden provider-side buffering cannot be proven.

### Comparison with the saved QRC guide

The saved guide documents binary MessagePack, `CHECK_TILAWA_AUDIO` with a `Uint8Array`, and an example using browser `MediaRecorder` chunks every 250 ms. It does **not** specify a required audio codec, sample rate, channel count, bit depth, or exact frame duration. Tabyan’s endpoint URL sets `audio_format=wav`; the transport sends complete WAV data, so the container matches that local setting. The guide does not provide enough numeric requirements to confirm that 16 kHz mono PCM16 is exactly what QRC expects. This is **underdocumented**, not evidence of a mismatch.

## Session start configuration

The authenticated session context is the source of the QRC start coordinates. The one-shot live-test gate allowed only a GENERAL session beginning at Al-Fatiha `1:1`, word 1. The browser displayed `range=1:1-7` and `currentVerseKey=1:1`; the first QRC result coordinate was `1:1:1`. The code derives the start payload as:

```text
chapter_index=1, verse_index=1, word_index=1
```

The successful `TILAWA_SESSION_STARTED` event (`exit_code=6`) confirms that QRC accepted a start request, but the outgoing MessagePack start frame was not logged. Thus these coordinates are strongly constrained by the authenticated session and test gate, not directly verified from a captured wire payload. The visible Mushaf context matches the configured starting coordinate; without retained audio or a transcript, the student’s actual spoken location cannot be confirmed.

The start payload also requires `hafz_level` and `tajweed_level`, sourced from server configuration. The provider guide gives a `hafz_level` range of 1–3; its saved copy conflicts with the current guide on `tajweed_level` (the saved capture says 1–3; its recheck note/current code say 1–5). The guide does not define the semantic meaning of either level. The live logs do not record the numeric values in the outgoing start frame, and the prior acceptance report only records that temporary test levels were removed afterward. **The exact live values and whether they matched an intended learner policy cannot be verified.** Do not infer the values from the documentation example.

## QRC raw events versus Tabyan interpretation

The following table pairs each captured `TILAWA_RESULT` with the adapter mapping. Packet numbers are the original chronology numbers in the [full raw event report](TABYAN_NABR_QRC_EVENT_SEMANTICS.md). `SUCCESS` is Tabyan’s mapped status for QRC `exit_code=6`; QRC `exit_code=7` is kept as `unverified / EXIT_CODE_7`, because the saved guide does not define 7.

| Packet # | Raw QRC position | Raw `exit_code` | Tabyan adapter position hint | Tabyan adapter status |
|---:|---|---:|---|---|
| 3 | 1:1:1 | 7 | 1:1:1 | unverified / EXIT_CODE_7 |
| 4 | 1:1:1 | 7 | 1:1:1 | unverified / EXIT_CODE_7 |
| 5 | 1:1:1 | 7 | 1:1:1 | unverified / EXIT_CODE_7 |
| 6 | 1:1:1 | 7 | 1:1:1 | unverified / EXIT_CODE_7 |
| 7 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 8 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 9 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 10 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 11 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 12 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 13 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 14 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 15 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 16 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 17 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 18 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 19 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 20 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 21 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 22 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 23 | 1:1:2 | 6 | 1:1:2 | result / SUCCESS |
| 24 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 25 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 26 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 27 | 1:1:2 | 7 | 1:1:2 | unverified / EXIT_CODE_7 |
| 28 | 1:2:1 | 6 | 1:2:1 | result / SUCCESS |
| 30 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 31 | 1:1:3 | 6 | 1:1:3 | result / SUCCESS |
| 32 | 1:1:3 | 7 | 1:1:3 | unverified / EXIT_CODE_7 |
| 33 | 1:1:3 | 6 | 1:1:3 | result / SUCCESS |
| 34 | 1:1:3 | 7 | 1:1:3 | unverified / EXIT_CODE_7 |
| 35 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 36 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 37 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 38 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 39 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 40 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 41 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 42 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 43 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 44 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 45 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 46 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 47 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 48 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 49 | 1:1:4 | 6 | 1:1:4 | result / SUCCESS |
| 50 | 1:1:4 | 7 | 1:1:4 | unverified / EXIT_CODE_7 |
| 51 | 1:2:1 | 6 | 1:2:1 | result / SUCCESS |
| 52 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 53 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 54 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 55 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 56 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 57 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 59 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 60 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 61 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 62 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |
| 63 | 1:2:1 | 7 | 1:2:1 | unverified / EXIT_CODE_7 |

### Interpretation and UI boundary

- The adapter reads the positive `chapter_index`, `verse_index`, and `word_index` and copies them to `surah`, `ayah`, and `wordIndex` without subtracting 1. The canonical resolver also compares the provider’s one-based coordinate directly with the canonical corpus’s one-based word position. **No off-by-one conversion is present in these paths.**
- The adapter retains the provider’s correct/skipped/mistake fields as claims/observations; it does not turn them into learner grades. It maps QRC 6 to `result / SUCCESS`, QRC 8 to `ended / SURAH_FINISHED`, and other numeric result codes—including 7—to `unverified / EXIT_CODE_n`.
- The live API recorded **174 normalized provider events**. The captured raw fields account for that total: 59 result positions + 50 correct claims + 1 skipped claim + 1 letter observation + 59 result statuses + 4 connection/session/keepalive statuses. This agrees with the adapter emitting those observations; it does not establish that the learner-facing Mushaf rendered them.
- The available canonical resolver returns `authority=provider_observation` and `confirmation=unconfirmed`; it performs canonical corpus/scope lookup only. The Mushaf UI has no live consumer of the QRC observation subscription/resolver in this path. The browser logged zero transcript deltas/finals, matcher updates, or reveals. Therefore there is no observed Tabyan highlight/progress interpretation to compare beyond the adapter’s unchanged position hints.
- The adapter’s position sequence has the same 53 same-coordinate transitions and the same single backstep (`1:2:1` → `1:1:3`) as the raw sequence. The raw event report contains the per-packet claim arrays, timestamps, signature counts, and event-model limitations.

## Latency separation

The first QRC result arrived **119.6 ms** after the gateway logged the first audio frame forwarded to the provider. That is a combined interval. The live capture has no separate QRC audio-send acknowledgement, provider-generation timestamp, provider-to-gateway network measurement, or frontend receipt/render timestamp for each structured observation.

The browser and gateway carry audio creation/send/receive timing fields for transcript events, but Nabr’s structured observations do not provide a transcript delta carrying those timing milestones. The single 119.6 ms figure cannot be divided into:

1. Tabyan-to-provider network time,
2. QRC processing time,
3. provider-to-Tabyan network time, or
4. Tabyan normalization / frontend delivery / UI processing time.

No estimate of an individual component should be inferred from the combined number.

## Layer assessment

| Layer | Assessment | Evidence and limit |
|---|---|---|
| Microphone capture | **No clear capture failure observed** | Browser context/track were active and all 321 full chunks reached the gateway. Actual audio clarity, clipping, room noise, and spoken words cannot be checked without retained audio. |
| PCM format / resampling | **Not proven wrong; exact QRC match unknown** | Tabyan requests 24 kHz mono PCM16, then builds 16 kHz mono PCM16 WAV. The actual AudioContext rate and QRC’s required numeric format are not logged/documented in the saved guide. |
| Audio framing / close | **Conditional app-side tail risk** | 321 inputs leave a 100 ms remainder at the 200 ms QRC frame boundary. Graceful stop flushes it; immediate close does not. The live stop path is unverified. |
| Browser/API transport | **No gateway drop observed; backlog unmeasured** | Zero dropped chunks and no provider errors; no per-frame acknowledgement. The browser queue metrics were not retained in the trace. |
| QRC raw results | **Repeated/backward sequence observed; meaning unknown** | Repeats and one backstep occur in QRC result coordinates before any Tabyan coordinate conversion. The guide does not define result accumulation/windowing/revision semantics or `exit_code=7`. |
| Tabyan adapter/resolver | **No coordinate-shift cause found** | The adapter preserves one-based values and maps 7 to unverified. The resolver is observation-only and does not confirm progress. No live Mushaf resolver consumer was found. |
| Start/session configuration | **Coordinates align; levels unverified** | The one-shot gate and display context constrain the start to `1:1`, word 1. The outgoing frame and numeric level values were not captured. |

## Final verdict

**The observed repeated and backward position values originated in the raw QRC event sequence, not in Tabyan’s coordinate conversion.** That attribution is strong for the coordinates themselves. It does **not** prove that QRC misrecognized the recitation: the provider event model is unknown, and no synchronized transcript or audio exists for comparison.

The separate app-side concern is a possible 100 ms tail omission if the session used immediate close rather than graceful stop. Its occurrence in this session is not established. The existing evidence therefore cannot distinguish provider tracking quality from audio-format/content effects, nor identify a sole cause.

**Stop point:** this is a diagnostic report only. No application code, provider configuration, learner state, database, workflow, or deployment was changed.
