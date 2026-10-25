# TABYAN — Nabr/QRC Disconnect and No-Tracking Diagnosis

**Analysis date:** 2026-10-15  
**Session examined:** 2026-10-14 first authorized development-only Nabr/QRC session  
**Scope:** Existing first-session API and browser logs, the saved QRC guide, existing reports, current source/workflow configuration, and Replit documentation. No new live connection, audio, provider request, database query or mutation, provider switch, deployment, or code change.

## Summary

The session successfully opened the QRC connection, received a successful session-start response, and forwarded 321 audio chunks. The API process stayed at PID `8185` during the captured 33.333-second client connection. QRC result events continued until 153 ms before the API logged its client WebSocket close.

The logs do **not** identify the initiator or close code/reason of the QRC provider socket. The only recorded close is the Tabyan browser/client-to-gateway socket’s server-side `close` callback. That callback invokes cleanup, which in code calls `provider.close()`; if the QRC socket is still active, this path attempts `RESET_TILAWA_SESSION` and closes it with code `1000`. The live capture does not record whether that cleanup action ran against an open QRC socket, whether QRC had already closed it, or whether the reset was acknowledged. The actual upstream disconnect classification is therefore **UNKNOWN**.

No server restart, Replit deployment restart, API idle timeout, or QRC heartbeat timeout is evidenced during the captured interval. This does not establish that the Replit preview proxy was uninvolved: neither side recorded a close code/reason or a client close-request marker. Replit documentation search found no specific preview-proxy WebSocket idle-timeout or close-code guidance.

For tracking, the raw QRC coordinates include 53 repeated adjacent positions and one backward transition. Tabyan preserves those one-based coordinates; no adapter offset or UI matcher conversion is evidenced as the source. The audio contract is not fully specified by the saved QRC guide, and the actual recited audio was not retained, so the underlying tracking cause remains **UNKNOWN**.

## 1. One-connection lifecycle

Times are UTC from the original API log and the linked raw-event report. The WebSocket close at the end is the **Tabyan client-to-gateway** close callback, not a logged QRC socket close time.

| Event | Time | Evidence |
|---|---:|---|
| Tabyan realtime client connected | 21:15:11.396 | API log |
| Client authenticated | 21:15:11.555 | API log |
| QRC connection acknowledged (`QRC_CLIENT_CONNECTED`) | 21:15:11.752 | QRC event capture |
| QRC start acknowledged (`TILAWA_SESSION_STARTED`, `exit_code=6`) | 21:15:11.769 | QRC event capture |
| Tabyan provider-ready event | 21:15:11.769 | API log |
| First audio chunk received/forwarded | 21:15:12.723 | API log |
| Last captured QRC result | 21:15:44.576 | QRC event capture |
| Tabyan client-to-gateway WebSocket close callback | 21:15:44.729 | API log |
| One-shot session summary | 21:15:44.730 | API log |

Elapsed time was **33.333 seconds** from API client connection to its close callback, **33.174 seconds** from authentication, and **32.960 seconds** from QRC session-start acknowledgement. The last QRC result arrived **153 ms** before the API client close callback. The exact upstream QRC socket-close time was not logged.

The original API log shows the same PID (`8185`) across the connection, QRC events, audio handling, and client close. No server-start, shutdown, signal, restart, or timeout marker appears in this captured interval. No client-side `close requested` event or close code/reason appears in the paired browser trace.

## 2. Who closed each socket?

The capture contains two distinct WebSocket lifecycles; they should not be conflated.

| Socket | Classification | What the evidence establishes |
|---|---|---|
| Browser/client → Tabyan API gateway | **UNKNOWN** | The API’s `ws.on("close")` callback ran at 21:15:44.729. The callback does not log close code/reason, and the browser trace has no explicit close-request event. A user/client close, proxy termination, or network close cannot be distinguished. |
| Tabyan API → QRC provider | **UNKNOWN** | `closeAll()` calls `provider.close()` after the gateway client close. The QRC transport’s active `close()` path attempts `RESET_TILAWA_SESSION` and `socket.close(1000)`, but the live capture has no QRC socket close event, close code/reason, reset-send record, or reset acknowledgement. QRC may already have closed before cleanup; this is not ruled out. |

**Close code:** **UNKNOWN** for the observed upstream close. Source code intends `1000` for an orderly local close/finish and `1011` for an error, but the QRC `close` callback’s stored code is not in the captured session summary.  
**Close reason:** **UNKNOWN**; it is not recorded by the transport.  
**QRC clean close:** **NOT PROVEN**; no `TILAWA_SESSION_ENDED` event or clean-close marker was captured.

The session therefore cannot be classified as `CLIENT_INITIATED`, `TABYAN_SERVER_INITIATED`, `REPLIT_PROXY`, `QRC_PROVIDER_INITIATED`, `IDLE_TIMEOUT`, `PROCESS_RESTART`, or `NETWORK_ERROR` with confidence. The required classification is **UNKNOWN**.

## 3. Replit process lifetime and proxy

### Process and workflow

- The API is an artifact-managed development workflow. Its configured command is `pnpm --filter @workspace/api-server run dev`.
- `artifacts/api-server/package.json` defines `dev` as a build followed by `start`; `start` launches `node dist/index.mjs`. This is not `tsx watch`, `nodemon`, or another source-watching restart loop.
- Replit’s workflow guidance describes managed workflows as long-running until stopped or restarted; it does not establish a timeout for the browser preview proxy.
- The original session’s API events all carry PID `8185`. There is no restart marker during the active connection.
- `index.ts` exits on `SIGTERM`/`SIGINT` after stopping the Tarteel worker; it does not explicitly drain the HTTP server or close QRC transports first. A future process restart could therefore interrupt active WebSockets, but there is no evidence that this occurred in this session.
- The provider itself is a server-to-server WebSocket to QRC. It does not traverse the browser’s Replit preview proxy. The browser-to-API WebSocket does traverse the preview route.

### Replit behavior and limits of available documentation

Replit documentation distinguishes published deployment types: Autoscale deployments can scale down after inactivity, while Reserved VM deployments run continuously. The observed session was in the **development API workflow**, not a published Autoscale deployment, and lasted about 33 seconds with audio and QRC results continuing near the end. Published Autoscale behavior is not evidence for this close.

Official documentation search did not return a specific development-preview proxy WebSocket idle timeout, close-code behavior, or rule that would identify this session’s close. The session’s successful WebSocket traffic for more than 33 seconds proves the preview route carried the connection during that interval; it does not establish why it closed.

References:

- [Replit deployment types](https://docs.replit.com/features/publishing/deployment-types)
- [Replit workspace Shell](https://docs.replit.com/features/workspace-tools/shell)
- Local workflow definition: `artifacts/api-server/.replit-artifact/artifact.toml`

**Server restart involved:** **NO evidence in the captured interval** (one PID; no restart/shutdown markers).  
**Replit proxy involved:** **UNKNOWN**; the proxy is on the browser-to-API path, but no close code/reason or proxy diagnostic was captured.

## 4. Heartbeat and timeout checks

### Implemented behavior

- The QRC transport has a **45-second receive-side heartbeat watchdog**. Once the QRC session is active, it starts the timer and resets it when a `KEEP_ALIVE` event arrives.
- The code does not send a QRC application heartbeat. There is no explicit `ping()`/`pong()` handling in the Tabyan transport source.
- The existing capture contains two QRC `KEEP_ALIVE` events, at **21:15:26.814** and **21:15:42.328**. The last is about 2.4 seconds before the API client close. QRC results also continue until 21:15:44.576. No heartbeat-timeout provider error was recorded.
- The saved QRC guide does not document a `KEEP_ALIVE` requirement or interval. Therefore whether QRC requires a particular heartbeat is **UNKNOWN**.

### Other application timeouts

- Gateway inactivity timeout: **120 seconds** (`RECITATION_IDLE_MS`), checked every 10 seconds. Audio or commit messages update activity.
- Gateway maximum connection/session deadline: **2 hours**.
- QRC connection/start acknowledgement timeout: **10 seconds**.
- QRC heartbeat timeout: **45 seconds**.
- QRC acceptance-session cap: **180 seconds**, after which the code calls graceful `stop()`.
- QRC graceful-stop acknowledgement timeout: **10 seconds**.

The captured session ended after about 33 seconds, with continuing audio/result activity and recent keepalives. No `SESSION_EXPIRED`, `PROVIDER_TIMEOUT`, heartbeat-timeout, or provider-error event appears. **No application idle timeout is evidenced as the cause.**

**HEARTBEAT_IMPLEMENTED:** **YES**, as a receive-side `KEEP_ALIVE` watchdog; no outgoing application heartbeat.  
**REQUIRED_BY_QRC:** **UNKNOWN**.  
**HEARTBEAT ISSUE:** **NO evidence in this session**; QRC’s documented requirement is unknown.  
**IDLE_TIMEOUT_SOURCE:** gateway 120-second inactivity check and QRC 45-second receive watchdog; neither is evidenced as having fired.

## 5. Audio contract

### What the saved QRC guide specifies

The saved QRC guide specifies binary MessagePack, `CHECK_TILAWA_AUDIO` with an `audio: Uint8Array` field, and demonstrates `MediaRecorder` chunks every 250 ms. It does **not** specify a required sample rate, codec, raw PCM versus WAV/Opus container, channel count, bit depth, byte order, or an audio-format field in `START_TILAWA_SESSION`.

The saved guide’s `START_TILAWA_SESSION` payload contains the start coordinates and `hafz_level` / `tajweed_level`; no audio format is declared in that payload. Tabyan’s QRC WebSocket URL adds `audio_format=wav`, but the saved guide does not state the precise numeric WAV format required by QRC.

### What Tabyan sends

- Browser → gateway: requested 24 kHz, mono, signed PCM16, 4,800 bytes per nominal 100 ms chunk.
- Gateway → QRC: resampled 16 kHz, mono, signed PCM16 in WAV frames, normally 200 ms per full frame, sent as MessagePack `CHECK_TILAWA_AUDIO`.
- The WAV encoder explicitly writes little-endian PCM. The browser uses `Int16Array` buffers; the server reads them as little-endian.

**QRC_REQUIRED_AUDIO:** MessagePack `CHECK_TILAWA_AUDIO` carrying a `Uint8Array`; exact sample/container parameters **UNKNOWN** from the saved guide.  
**TABYAN_AUDIO:** 24 kHz mono PCM16 / 100 ms to the gateway; converted to 16 kHz mono PCM16 WAV / 200 ms frames for QRC.  
**AUDIO CONTRACT VERIFIED:** **NO** — the provider’s exact required audio contract is not established by the saved guide.  
**AUDIO FORMAT MATCH:** **UNKNOWN** — WAV matches Tabyan’s `audio_format=wav` URL setting, but the required QRC sample rate/channel/depth is undocumented here.

No audio was retained, so the session cannot establish signal quality, clipping, noise, actual sample contents, or whether the spoken recitation matched the configured context. The existing evidence is not sufficient to attribute tracking failure to the matcher or to rule out an audio-contract problem.

## 6. Send backpressure and continuity

### Backpressure

- Browser `sendPcmChunk()` calls `WebSocket.send()` for each frame, then samples `bufferedAmount` and computes a queue-depth estimate. It does not wait for the queue to drain or stop capture when the queue grows.
- Those browser queue metrics are not present in the saved heartbeat/log records. There is no retained per-frame send interval or queue history.
- The server’s QRC transport checks its WebSocket `bufferedAmount` against 512 KiB and fails the stream if exceeded. The session has zero logged provider errors, so no such failure is evidenced.
- No per-frame QRC acknowledgement is available in the capture.

**BACKPRESSURE:** **UNKNOWN** — the browser does not apply send-side flow control, but no queue measurements show that it actually fell behind.  
**FRAMES_DROPPED:** **0** counted by the gateway between client and provider readiness. This does not prove QRC acknowledged every encoded WAV frame.  
**FRAMES_QUEUED:** **UNKNOWN** — queue metrics were not retained.  
**Capture versus send rate:** nominal capture is one 100 ms chunk per 100 ms; the active browser heartbeats show about 10 chunks per second. Exact frame-by-frame send timing is unavailable.

### Existing continuity evidence only

The gateway received **321 chunks / 1,540,800 bytes**, zero dropped chunks, and zero provider errors. At 24 kHz mono PCM16 this is **32.1 seconds** of nominal PCM. These totals match the approximately 32-second span from first audio forwarding to the client close to within one frame. There are no sequence numbers, content hashes per audio frame, provider acknowledgements, or individual timestamps in the retained capture. Therefore:

- A large missing interval is **not evidenced**.
- Exact missing, duplicate, or out-of-order frame counts are **unknown**.
- Browser send-queue growth and QRC-side buffering are **unknown**.
- The QRC chunker can hold a final 100 ms remainder. Graceful `stop()` flushes it; immediate `close()` does not. The exact close/finalization path in this session is not logged, so actual tail loss is **unverified**.

No new live test was run; the attached request did not authorize one.

## 7. QRC session state and close sequence

### Start sequence

The current code performs the following sequence:

```text
QRC WebSocket open
→ QRC_CLIENT_CONNECTED
→ send START_TILAWA_SESSION
→ wait for TILAWA_SESSION_STARTED with exit_code=6
→ mark provider active / send provider-ready to the gateway client
→ accept audio only while the provider is open
```

The first live session follows that observed order: QRC connected, session started with `exit_code=6`, provider-ready logged, then audio first received/forwarded. The first audio arrived about 954 ms after the QRC session-start acknowledgement. **The start sequence was correct**, and the gateway did not forward audio before provider readiness.

### End sequence

The QRC guide says to send `RESET_TILAWA_SESSION` to stop. The current code has two paths:

- Graceful final commit calls `NabrQrcTransport.stop()`: flush pending WAV audio, send reset, wait for end/stop resolution, then close.
- Immediate cleanup calls `NabrQrcTransport.close()`: best-effort reset, then local `socket.close(1000)` if active; it does not wait for a QRC end acknowledgement and does not flush the WAV remainder.

The captured event sequence ends with a Tabyan client-to-gateway close callback. It contains no `TILAWA_SESSION_ENDED`, reset-send trace, provider socket close event, provider close code/reason, or `CLEAN_CLOSE` marker. The exact end path used is therefore **UNKNOWN**.

## 8. Reconnect and session reuse

- No automatic browser or provider reconnect loop was found in this path.
- A `NabrQrcTransport` instance connects once; it does not reconnect or resend prior audio.
- The live QRC socket and acceptance lease are process-local. A second QRC connection cannot reuse the first transport’s in-memory state.
- The development-only one-shot gate prevents a second Nabr acceptance connection in the process. It does not demonstrate a successful recovery/reconnect path.
- The immediate close path does not resume from the last Quran coordinate or replay buffered audio; it discards local transport state after cleanup.

These are design facts, not evidence that reconnect behavior caused the first session’s close.

## 9. No-tracking diagnosis

| Candidate | Finding |
|---|---|
| `AUDIO_BAD` | **UNKNOWN.** Frames arrived and the capture was active; no audio or synchronized reference was retained. The exact QRC audio requirements are also incomplete. |
| `SESSION_CONTEXT_BAD` | **Not indicated for the configured start.** The one-shot gate and UI trace align at Al-Fatiha `1:1`, word 1. Actual spoken content was not verified. |
| `QRC_RAW_RESULTS_UNSTABLE` | **Observed.** The raw QRC stream has 53 repeated-coordinate transitions and one backward transition. Event semantics remain undocumented, so these values alone do not prove misrecognition. |
| `TABYAN_INTERPRETATION_BAD` | **Not supported by the coordinate path.** The adapter passes through positive one-based coordinates; it does not subtract 1 or deduplicate. The canonical resolver is observation-only, and the Mushaf UI did not render QRC observations as confirmed progress. |
| `UNKNOWN` | **Primary conclusion.** Without retained audio, exact audio requirements, provider event semantics, and provider close telemetry, the underlying tracking failure cannot be assigned to one layer. |

**PRIMARY TRACKING ROOT CAUSE:** **UNKNOWN**. The raw QRC event stream is visibly repetitive/backward, but the underlying recognition cause is not proven.  
**PRIMARY DISCONNECT ROOT CAUSE:** **UNKNOWN**. The API client socket closed; the actor and close code/reason for the QRC socket were not captured.  
**CONFIDENCE:** **LOW** for either root-cause attribution; high that the recorded start sequence succeeded and that the API client close callback ran.

## 10. Required final fields

| Field | Result |
|---|---|
| `SOCKET OPENS` | **YES** — QRC acknowledged `QRC_CLIENT_CONNECTED` and `TILAWA_SESSION_STARTED` (`exit_code=6`). |
| `WHO CLOSES IT` | **UNKNOWN** — API client close is observed; actual QRC socket initiator is not recorded. Gateway cleanup then attempts local provider cleanup. |
| `CLOSE CODE` | **UNKNOWN** for the actual provider close. Local cleanup intends code `1000`; error cleanup intends `1011`; neither is confirmed from this session’s QRC close event. |
| `CLOSE REASON` | **UNKNOWN** — not logged. |
| `TIME UNTIL DISCONNECT` | **33.333 s** from API client connection to its close callback; **32.977 s** from QRC connection acknowledgement. Actual QRC socket close time is unknown. |
| `SERVER RESTART INVOLVED` | **NO** in the captured interval; the original API trace uses one PID and contains no restart marker. |
| `IDLE TIMEOUT INVOLVED` | **NO evidence of a timeout**; API inactivity limit is 120 s, and the QRC heartbeat watchdog is 45 s. Audio/keepalive/result activity continued near close. |
| `HEARTBEAT ISSUE` | **NO evidence in this session**; whether QRC requires an application heartbeat is **UNKNOWN**. |
| `AUDIO CONTRACT VERIFIED` | **NO** — the saved QRC guide omits the exact numeric format requirements. |
| `AUDIO FORMAT MATCH` | **UNKNOWN**. |
| `BACKPRESSURE` | **UNKNOWN** — no retained queue measurements. |
| `QRC START SEQUENCE CORRECT` | **YES** — start acknowledgement preceded provider-ready and audio forwarding. |
| `PRIMARY DISCONNECT ROOT CAUSE` | **UNKNOWN**. |
| `PRIMARY TRACKING ROOT CAUSE` | **UNKNOWN**; raw QRC results repeat/backtrack, but the reason is unproven. |
| `CONFIDENCE` | **LOW** for root-cause attribution. |

## Sources and scope guard

- Original API log from the first live session and its paired browser trace; no refreshed workflow/browser logs were used.
- `research/TABYAN_NABR_QRC_FIRST_LIVE_SHADOW.md`
- `research/TABYAN_NABR_QRC_EVENT_SEMANTICS.md`
- `research/TABYAN_NABR_APP_VS_PROVIDER_DIAGNOSIS.md`
- `research/sources/qurani-ai-qrc-technical-docs.md`
- `artifacts/api-server/src/recitationRealtime.ts`
- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts`
- `artifacts/api-server/src/recitation-providers/NabrQrcSpeechProvider.ts`
- `artifacts/api-server/src/recitation-providers/sessionLease.ts`
- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/package.json`
- `artifacts/api-server/.replit-artifact/artifact.toml`
- Replit documentation search for development workflow and deployment lifecycle; no specific preview-proxy WebSocket close-code/idle-timeout result was found.

No code or configuration was changed. No new live session, audio, paid provider request, database query or mutation, provider switch, deployment, GPU use, application build, or product test suite run occurred. Replit credit use was not measured.
