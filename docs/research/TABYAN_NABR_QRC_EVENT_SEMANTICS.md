# TABYAN — Nabr/QRC Live Event Semantics

**Analysis date:** 2026-10-15
**Session observed:** 2026-10-14 UTC
**Scope:** Read-only analysis of the already captured first live Nabr/QRC shadow-session logs. No second session, provider request, audio, database query or mutation, provider switch, paid request, or deployment was performed.

## Findings at a glance

The logs establish that QRC repeatedly emitted the same top-level word coordinate, often with different `exit_code` or word-claim fields. There was one backward coordinate transition. They do **not** establish whether a result is a newly recognized word, a cumulative result, an overlapping window, or a correction. No per-result event ID or ordering key was captured, and the raw MessagePack frames were not retained. Repeated logged signatures therefore cannot identify the provider-versus-gateway source or prove byte-identical retransmission.

**Current decision:** keep every QRC position unconfirmed. The evidence does not support safe word highlighting or a stable-position threshold.

## Evidence and limits

Sources used:

- The original API log from the one authorized live session and its paired browser trace.
- The existing [first live acceptance report](TABYAN_NABR_QRC_FIRST_LIVE_SHADOW.md).
- The saved [QRC protocol guide](sources/qurani-ai-qrc-technical-docs.md) and the existing diagnostic/transport code, used only to interpret what the log fields mean.

No refreshed workflow logs or new network evidence were used. The API log contains 63 `Nabr/QRC shadow provider event` entries. Each entry is a sanitized diagnostic packet, not a stored raw MessagePack frame. `observedAt` is added locally after the frame is received; it is a gateway receive time, not a provider event timestamp. The gateway also logs `arrivalIntervalMs`, which is a local interval between received result callbacks.

The diagnostic whitelist contains event type, optional `providerEventId`/error code, position, `exit_code`, confidence/status fields, and correct/skipped/mistake arrays. It does not retain the full provider frame. None of the 59 results has a logged `providerEventId`, `confidence`, or `word_status`. The saved guide documents connection/session IDs (`websocket_id`, `session_id`), but not a stable per-result ID, frame/window ID, or result sequence number. A session ID is not an event-order key.

The table's `sig10` is the first 10 hex characters of SHA-256 over the logged diagnostic fields, excluding local receive time and `arrivalIntervalMs`. It includes the whitelisted mistake fields in the digest, but does not print their free-text `message` or `speachLike` values. Matching signatures mean the logged diagnostic fields match; they do not prove the underlying raw MessagePack frames were identical, because unlogged frame fields are unavailable.

## Chronological event table

Times are gateway log receive times in UTC. `—` means the field was absent from the captured diagnostic packet. Coordinates and mistake locations use the logged one-based values.

| # | UTC receive time | Event | Position | `exit_code` | Confidence / `word_status` | `correct_words` | `skipped_words` | Letter mistake (location/index/code) | Tajweed mistake | `providerEventId` | `sig10` |
|---:|---|---|---|---:|---|---|---|---|---|---|---|
| 1 | 21:15:11.752 | `QRC_CLIENT_CONNECTED` | — | — | — | — | — | — | — | — | `d61f3e30a8` |
| 2 | 21:15:11.769 | `TILAWA_SESSION_STARTED` | — | 6 | — | — | — | — | — | — | `6cf192da42` |
| 3 | 21:15:12.844 | `TILAWA_RESULT` | 1:1:1 | 7 | — | — | — | — | — | — | `928a6a8f6a` |
| 4 | 21:15:13.780 | `TILAWA_RESULT` | 1:1:1 | 7 | — | — | — | — | — | — | `928a6a8f6a` |
| 5 | 21:15:14.588 | `TILAWA_RESULT` | 1:1:1 | 7 | — | — | — | — | — | — | `928a6a8f6a` |
| 6 | 21:15:15.385 | `TILAWA_RESULT` | 1:1:1 | 7 | — | — | — | — | — | — | `928a6a8f6a` |
| 7 | 21:15:16.013 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1 | — | — | — | — | `fb8f95a4bc` |
| 8 | 21:15:16.192 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 9 | 21:15:16.687 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 10 | 21:15:16.986 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 11 | 21:15:17.728 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 12 | 21:15:17.784 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 13 | 21:15:18.714 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 14 | 21:15:18.781 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 15 | 21:15:19.684 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 16 | 21:15:19.817 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 17 | 21:15:20.750 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 18 | 21:15:20.806 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 19 | 21:15:21.766 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 20 | 21:15:21.787 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 21 | 21:15:22.804 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 22 | 21:15:22.804 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 23 | 21:15:23.786 | `TILAWA_RESULT` | 1:1:2 | 6 | — | 1:1:1, 1:1:2 | — | — | — | — | `52c34ca784` |
| 24 | 21:15:23.798 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 25 | 21:15:24.788 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 26 | 21:15:24.796 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 27 | 21:15:25.813 | `TILAWA_RESULT` | 1:1:2 | 7 | — | — | — | — | — | — | `5eca017c18` |
| 28 | 21:15:25.842 | `TILAWA_RESULT` | 1:2:1 | 6 | — | 1:1:2, 1:1:4 | 1:1:3 | 1:1:4 / L5 / `letters_extra` | — | — | `594ebd78a5` |
| 29 | 21:15:26.814 | `KEEP_ALIVE` | — | — | — | — | — | — | — | — | `0f51cb9634` |
| 30 | 21:15:26.815 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 31 | 21:15:26.836 | `TILAWA_RESULT` | 1:1:3 | 6 | — | 1:1:1, 1:1:2, 1:1:3 | — | — | — | — | `28fd395607` |
| 32 | 21:15:27.805 | `TILAWA_RESULT` | 1:1:3 | 7 | — | — | — | — | — | — | `cba494226f` |
| 33 | 21:15:27.820 | `TILAWA_RESULT` | 1:1:3 | 6 | — | 1:1:1, 1:1:2, 1:1:3 | — | — | — | — | `28fd395607` |
| 34 | 21:15:28.802 | `TILAWA_RESULT` | 1:1:3 | 7 | — | — | — | — | — | — | `cba494226f` |
| 35 | 21:15:28.820 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:1, 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `da2bb3a9a7` |
| 36 | 21:15:29.757 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 37 | 21:15:29.787 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 38 | 21:15:30.787 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 39 | 21:15:30.801 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 40 | 21:15:31.789 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 41 | 21:15:31.798 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 42 | 21:15:32.796 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 43 | 21:15:32.815 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 44 | 21:15:33.855 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 45 | 21:15:33.880 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 46 | 21:15:34.893 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 47 | 21:15:34.918 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:2, 1:1:3, 1:1:4 | — | — | — | — | `d5616e42d8` |
| 48 | 21:15:35.911 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 49 | 21:15:35.937 | `TILAWA_RESULT` | 1:1:4 | 6 | — | 1:1:3, 1:1:4 | — | — | — | — | `ee9c923814` |
| 50 | 21:15:36.885 | `TILAWA_RESULT` | 1:1:4 | 7 | — | — | — | — | — | — | `a0648a21d4` |
| 51 | 21:15:36.916 | `TILAWA_RESULT` | 1:2:1 | 6 | — | 1:1:4 | — | — | — | — | `0387002b3c` |
| 52 | 21:15:37.888 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 53 | 21:15:37.907 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 54 | 21:15:39.127 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 55 | 21:15:40.121 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 56 | 21:15:40.966 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 57 | 21:15:42.328 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 58 | 21:15:42.328 | `KEEP_ALIVE` | — | — | — | — | — | — | — | `0f51cb9634` |
| 59 | 21:15:43.535 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 60 | 21:15:43.536 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 61 | 21:15:44.528 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 62 | 21:15:44.564 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |
| 63 | 21:15:44.576 | `TILAWA_RESULT` | 1:2:1 | 7 | — | — | — | — | — | — | `4bf27cae3a` |

## Repeated positions and packet identity

- The 59 result events contain **50 correct-word claims**, **1 skipped-word claim**, **1 letter-mistake observation**, and **0 tajweed-mistake observations**.
- Five top-level positions appeared: `1:1:1` (4 events), `1:1:2` (21), `1:2:1` (14), `1:1:3` (4), and `1:1:4` (16).
- Of the 58 adjacent result-to-result transitions, **53 kept the same top-level coordinate**, 4 advanced, and 1 moved backward.
- Among those 53 same-coordinate transitions, 18 retained the same `exit_code` and 35 changed it. Seventeen adjacent same-coordinate pairs had the same logged-payload signature; 36 had different logged fields.
- Across all results, there were 13 distinct logged-payload signatures; 8 signatures occurred more than once, accounting for 46 repeated occurrences after each signature's first appearance.
- The one backward transition was event 30 → 31: `1:2:1` → `1:1:3`. The capture contains no transcript or provider event-order key with which to correlate it to a spoken repeat, a correction, a window overlap, or packet reordering.

These counts show repeated positions and repeated logged payloads, not why they occurred. QRC's saved guide describes `TILAWA_RESULT` fields but does not define per-event accumulation, windowing, correction, or retransmission semantics. It documents result `exit_code` 6 as success and 8 as Surah finished; **38** observed results use `exit_code=7`, whose meaning is not given in the saved guide. Do not interpret 7 as a particular status.

**Identical duplicate packet?** Not provable. The logged-field signatures identify repeated diagnostic content, but raw MessagePack frames and unwhitelisted fields were not retained.
**Same coordinate with changed status/claims?** Yes: 35 adjacent same-coordinate pairs changed `exit_code`; 36 changed at least one logged payload field.
**Provider re-evaluation, overlapping window, retransmission, or gateway duplication?** Unknown. Neither the captured IDs nor the protocol documentation lets this analysis distinguish those causes. No result is classified as learner regression.

## Event IDs, timestamps, and ordering

- No `providerEventId` was present in any of the 63 diagnostic entries. No result sequence, segment, frame, or window ID is documented in the saved guide or visible in this diagnostic capture.
- The logged receive timestamps are monotonic in arrival order. They are generated by Tabyan after decoding each incoming MessagePack frame; they do not prove provider-generation order.
- The adapter can accept an optional timestamp on a `KEEP_ALIVE`, but the diagnostic record used for this analysis did not preserve that field. The raw frames are unavailable, so this capture cannot establish whether the two keep-alives included a provider timestamp.
- **Provider events arrived out of order:** **UNKNOWN.** No out-of-order arrival is visible by gateway receive time, but a provider sequence/time key was not captured for comparison.

## Event model

The stored QRC guide calls these `TILAWA_RESULT` packets and describes a current position plus correct/skipped word and mistake arrays. It does not state whether a packet is a new word, cumulative state, a sliding/overlapping window, or a correction. In this capture, identical coordinates sometimes have empty arrays and sometimes non-empty arrays; `exit_code` 6 and 7 also alternate at the same coordinate. Those observations are compatible with multiple models and do not prove any one of them.

**EVENT MODEL: UNKNOWN** — do not label the stream `NEW_WORD`, `CUMULATIVE`, `WINDOWED`, or `REVISION` without a provider contract or additional retained evidence.
**DUPLICATION SOURCE: UNKNOWN** — repeated diagnostic signatures alone cannot attribute duplication to QRC or the gateway.

## Design-only `QRCPositionStabilizer`

No code or learner-facing behavior was implemented.

**Input:** raw structured QRC observations, gateway receive time, and the server-owned session scope.
**Output:** optional canonical Quran position candidate and one of `UNSTABLE`, `CANDIDATE`, `STABLE`, or `REVISED`.

Evidence-based design constraints:

1. Resolve a position only through the existing canonical Quran corpus and session scope. Keep the provider's `correct_words`, `skipped_words`, and mistake lists as unconfirmed claims.
2. A valid coordinate may be held as a **CANDIDATE**, but it must not be highlighted or written as confirmed progress.
3. Use **UNSTABLE** when the input is invalid/out of scope, its ordering or semantics are unknown, or the stream presents conflicting candidates. The observed repeated/backward positions and undocumented `exit_code=7` are reasons to keep this capture unconfirmed.
4. **STABLE** cannot be reached under the present contract. Do not select an arbitrary count, timer, confidence threshold, or high-water rule. Require documented provider semantics and a defensible confirmation rule first.
5. **REVISED** requires an explicit provider correction relationship or equivalent documented revision signal. A lower coordinate by itself is not evidence of correction.

**Position stabilization possible:** **UNKNOWN** with the current provider contract. A conservative candidate/unstable layer is designable, but this capture cannot establish when a position becomes stable.

## Monotonic progress and learner controls

Do not equate the provider's latest coordinate with learner progress. A future design should keep an ephemeral reading/playhead candidate separate from confirmed progress. The raw candidate may repeat or move backward; a provider backstep must not be presented as learner regression.

Preserving repetition, correction, rewind, repeated ayah, and explicit restart requires Tabyan-owned attempt/segment boundaries or explicit user actions. QRC supplied no event or segment ID here, so its positions cannot distinguish those learner actions from provider revisions or window overlap. A future high-water rule should apply only within a clearly defined Tabyan attempt segment and only after the provider observation is independently confirmed. No such rule is enabled by this analysis.

## Session-close analysis

The original server log reports `recitation realtime client closed` at **21:15:44.729 UTC**. Its close summary confirms authentication, received audio, 321 chunks / 1,540,800 bytes, zero dropped chunks, zero provider errors, and zero transcript partial/final events. The paired browser trace contains no explicit stop/close trace event. There is no logged QRC `TILAWA_SESSION_ENDED`, QRC error, provider close acknowledgement, timeout, QRC socket close code/reason, or `CLEAN_CLOSE` marker.

The QRC guide says to stop by sending `RESET_TILAWA_SESSION`. The current transport's active `close()` path attempts that reset and then closes the socket, but the live logs do not record whether the reset frame was sent or acknowledged. The client-close callback alone does not prove a clean QRC end.

| Close check | Finding |
|---|---|
| `CLIENT_CLOSE_SENT` | **UNKNOWN** — no close-frame/send record in the captured logs |
| `PROVIDER_CLOSE_ACK` | **NO** — no `TILAWA_SESSION_ENDED` or equivalent acknowledgement observed |
| `SOCKET_CLOSED` | **YES** — the Tabyan realtime client socket close callback was logged; QRC provider socket code/reason was not |
| `CLEAN_QRC_END_PROVEN` | **NO** |

## Scope and final report

This phase used only existing local logs, the saved protocol capture, and source code to interpret logging semantics. It made no new Nabr connection, sent no audio, made no paid request, changed no provider, deployed nothing, queried or mutated no database, and did not change learner state. The previous live session created two ordinary session rows; they were later changed to `cancelled` only after explicit user approval, as recorded in the live acceptance report. **No database mutation occurred in this analysis phase.**

| Field | Result |
|---|---|
| `EVENTS ANALYZED` | 63 total: 1 `QRC_CLIENT_CONNECTED`, 1 `TILAWA_SESSION_STARTED`, 59 `TILAWA_RESULT`, 2 `KEEP_ALIVE` |
| `REPEATED POSITION COUNT` | 53 of 58 adjacent result transitions |
| `BACKWARD POSITION COUNT` | 1 (`1:2:1` → `1:1:3`) |
| `EVENT MODEL` | **UNKNOWN** |
| `DUPLICATION SOURCE` | **UNKNOWN** |
| `OUT-OF-ORDER EVENTS` | **UNKNOWN**; gateway receive order is monotonic, provider ordering key absent |
| `TRANSCRIPT PROVIDED` | **NO** to the Tabyan transcript pipeline: 0 partial / 0 final events. The diagnostic capture has no transcript field; raw MessagePack frames were not retained |
| `POSITION STABILIZATION POSSIBLE` | **UNKNOWN** under the present contract; stable promotion is unsupported |
| `SAFE WORD HIGHLIGHTING NOW` | **NO** |
| `CLEAN PROVIDER END PROVEN` | **NO** |
| `NEW NABR CONNECTIONS` | 0 |
| `AUDIO SENT` | No, in this analysis phase |
| `PAID REQUESTS` | 0 |
| `DB MUTATIONS` | 0, in this analysis phase |
| `DEPLOYMENT` | No |
