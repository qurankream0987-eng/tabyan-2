# TABYAN — NABR/QRC FIRST LIVE SHADOW ACCEPTANCE

**Observed:** 2026-10-14 UTC

**Scope:** One explicitly authorized, development-only live shadow session with real microphone audio. This was not a benchmark.
**Final verdict:** **INSUFFICIENT for Mushaf word highlighting.** Nabr connected and returned structured events promptly, but the observed position stream repeated and moved backward, speech could not be checked against a transcript, and a clean QRC end acknowledgement was not recorded.

## User-facing clarification

The first live session used **Nabr**, not OpenAI. The API logged `provider: "nabr"`, QRC connection/start events, and forwarded audio. The browser trace showed the provider connected during the session. The later “disconnected” state coincided with the first socket closing and a second UI start being rejected by the one-shot gate; it does not show that the first session fell back to OpenAI.

QRC supplied structured position and assessment packets, not transcript text. The transcript counters, matcher updates, and Mushaf reveals therefore remained at zero. The current UI should not be treated as a Nabr transcript/word-highlight readiness indicator.

## Controlled session

| Check | Observed result |
|---|---|
| Development provider during first session | **Nabr** |
| Production provider | **OpenAI; unchanged** |
| Start request | Accepted; `recitation.start` returned HTTP 200 |
| Realtime authentication | **PASS** |
| QRC connection | **PASS** — `QRC_CLIENT_CONNECTED`; provider-ready event named `nabr` |
| QRC session start | **PASS** — `TILAWA_SESSION_STARTED`, `exit_code=6` |
| Real audio reached the provider adapter | **YES** — 321 chunks, 1,540,800 bytes; no dropped chunks |
| Provider errors | 0 |
| Transcript partial/final events | 0 / 0 |
| Actual spoken content verified | **NO** — no transcript or audio recording was retained for comparison |
| Deployment | **NO** |

The first realtime client closed at approximately 21:15:44 UTC, about 33 seconds after it connected. The close summary reported authenticated, audio received, zero provider errors, and zero dropped chunks.

## Structured QRC observations

| Metric | Result |
|---|---|
| Diagnostic packets | 63 total |
| `TILAWA_RESULT` packets | 59 |
| Reported correct-word claims | 50 |
| Reported skipped-word claims | 1 |
| Word-position observations | 110, counting packet coordinates and correct/skipped claims |
| Unique top-level coordinates | `1:1:1`, `1:1:2`, `1:2:1`, `1:1:3`, `1:1:4` |
| Consecutive repeated coordinates | 53 of 58 transitions |
| Forward coordinate transitions | 4 |
| Backward coordinate transitions | 1 (`1:2:1` back to `1:1:3`) |
| First-feedback latency | 119.6 ms from first audio forwarded by the server to the first `TILAWA_RESULT` |
| Result-packet intervals | 58 samples; median 769.4 ms, P95 1,207.7 ms |
| Letter observations | 1 raw observation at coordinate `1:1:4`; numeric letter index and provider code were retained but not mapped to a glyph |
| Tajweed observations | 0 |

**Word tracking quality: PARTIAL.** The provider emitted plausible one-based coordinates and advanced through several positions, but the stream repeated the same coordinate extensively and included a backward transition. Without a verified transcript or synchronized reference, this session cannot establish word-by-word agreement with the recitation. Do not use these claims for Mushaf highlighting or learner feedback.

## State, end, and database findings

- The server summary reported `learnerStateMutated=false` and `uiMistakesShown=false`. The browser trace showed no transcript deltas/finals, matcher updates, or reveals. QRC observations remained separate from transcript matching.
- A normal client WebSocket close was observed with zero provider errors. However, the logs contain no `recitation.end` request, `TILAWA_SESSION_ENDED` event, or explicit `CLEAN_CLOSE` marker. **Clean QRC shutdown is not fully verified.**
- **Database scope deviation:** two UI `recitation.start` requests returned successfully. The implementation inserts a `recitationSessions` row on each successful start, before the realtime provider is selected. Thus two operational session records were created: one for the Nabr run and one for the later UI start that the one-shot gate blocked before provider connection/audio. No `recitation.end` request was visible.
- After the user authorized a read-only check, runtime database identity metadata matched the explicit Replit Development database. A narrowly time-scoped, parameterized `SELECT` retrieved only session mode, start coordinates, status, and end/duration fields. Both rows were found in Development with `status=listening`, `ended_at=NULL`, and `duration_seconds=NULL`. No IDs or user identifiers were queried.
- After the user separately authorized cancellation, a parameterized update changed only `status` on those two exact timestamp-matched rows. The update's `RETURNING` output and a final read-only check confirmed both are now `cancelled`; `ended_at` and `duration_seconds` remain NULL. No other rows or columns were changed, and neither row was deleted.
- No QRC observation or learner-progress write was made, and no schema migration occurred.
- A second realtime socket was authenticated after the first session, then closed with zero audio and zero provider events. The already-claimed process-local gate prevented a second Nabr provider connection. This was **not** a second live Nabr audio request, but its preceding UI start did create the second session record described above.

## Restoration and final status

After the session, development-only QRC overrides and test levels were removed, the development provider was restored to Tarteel, and shared safety values were restored:

```text
NABR_QRC_ENABLED=false
NABR_QRC_DRY_RUN=true
NABR_QRC_SHADOW_MODE=true
NABR_QRC_ONE_SHOT_TEST=unset
TABYAN_AI_ASR_PROVIDER (development)=tarteel
TABYAN_AI_ASR_PROVIDER (production)=openai
```

The API was restarted with those restored values and came up successfully. No Nabr connection was made after restoration. The credential value was not viewed or logged; the one authorized live session used it. No production provider switch, deployment, database cleanup, retry loop, or broad benchmark was performed.

| Acceptance item | Verdict |
|---|---|
| Nabr connection and QRC session start | **PASS** |
| Real audio transport to Nabr | **PASS** |
| Feedback timing and structured events | **PASS — measured in this session only** |
| Word-by-word agreement suitable for highlighting | **INSUFFICIENT** |
| Letter mapping | **UNKNOWN** |
| Tajweed evidence | **NOT OBSERVED** |
| Clean provider end handshake | **NOT VERIFIED** |
| Learner-progress mutation / UI mistake display | **NO** |
| No database changes | **NO — the UI created two session records; with later user authorization, only their statuses were changed to `cancelled`; neither was deleted** |
| Production provider / deployment | **OpenAI unchanged / no deployment** |
| Safe flags restored | **YES** |
