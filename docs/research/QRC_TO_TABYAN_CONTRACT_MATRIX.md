# QRC → Tabyan Contract Matrix

**Review date:** 2026-10-12  
**Source reviewed:** [Qurani.ai QRC technical guide](https://qurani.ai/en/docs/2-advanced-tools/qrc)  
**Disposition:** Server gateway and provider-selector path are wired behind disabled, dry-run, shadow, development-only, and one-shot gates. No Nabr connection or provider selection has occurred in the current runtime.

## Message and lifecycle matrix

| QRC contract item | QRC documentation | Tabyan handling / status |
|---|---|---|
| Wire format | Binary WebSocket messages encoded/decoded with MessagePack | Integrated into the authenticated realtime gateway behind explicit provider, enabled, shadow, development, and one-shot gates. Current flags prevent any Nabr socket creation. |
| Authentication | Guide example uses `wss://api.qurani.ai?api_key=…`; a subscription/API key is required | Key remains server-only and is read only when enabled outside dry-run. It was not inspected or used in this work. |
| Start method | `START_TILAWA_SESSION` with `chapter_index`, `verse_index`, `word_index`, `hafz_level` (1–3), and `tajweed_level` (current guide 1–5; archived guide 1–3) | Start position comes only from the authenticated server-owned Tabyan session. Official examples support one-based coordinates; level meanings and Tabyan policy mappings remain unresolved. |
| Audio method | `CHECK_TILAWA_AUDIO`; each message contains one complete 16 kHz mono WAV or one raw 20 ms Opus packet; current guide example shows 200 ms WAV frames | Isolated transport resamples existing server-side mono 24 kHz PCM16LE into complete 200 ms mono PCM16 WAV frames. Unit-tested only; no live or external audio. Mandatory chunk bounds remain unverified. |
| Stop method | `RESET_TILAWA_SESSION`; guide says the server flushes audio and resets the session | Isolated transport sends reset, waits for `TILAWA_SESSION_ENDED`, applies a local 10 s ack timeout, and releases its in-process lease. Live acknowledgement behavior remains unverified. |
| `QRC_CLIENT_CONNECTED` | `websocket_id`; optional `credits_balance` | Normalized to `session_status: ready`. Credit balance is not propagated. The connection ID remains `providerRawId`, not a session or Quran identity. |
| `TILAWA_SESSION_STARTED` | `session_id`, `exit_code`; only `6 = success` is documented here | Code 6 maps to `started`. Other codes are retained as hints with `unverified` status, not turned into provider errors or learner mistakes. |
| `TILAWA_SESSION_ENDED` | `session_id`, `asr_call_count`; described as reset or Surah completion | Normalized to `ended`; call count is diagnostic only. |
| `KEEP_ALIVE` | `websocket_id`, `timestamp` in Unix seconds; optional echoed `client_sent_at_ms`; about every 15 seconds | Normalized to `heartbeat`. Provider seconds and client milliseconds remain separately named; neither is a word timestamp. |
| `TILAWA_RESULT` | `exit_code` (6 success, 8 Surah finished), current `chapter_index` / `verse_index` / `word_index`, and result arrays | Results can enter a separate sanitized `QrcStructuredObservation` shadow channel. A client-side canonical resolver can resolve coordinates against the canonical Quran corpus and session scope; results remain unconfirmed and do not enter the transcript matcher or grading path. |
| `QRC_ERROR` | `websocket_id`, `code`, `message` | Normalized as provider/session error information only. It is not learner feedback. |
| Unknown event | The guide lists the six server event names above | Preserved as `type: unknown`; no matcher or feedback input. |

## Result fields and Tabyan interpretation

| QRC field | Documented meaning / shape | Normalized representation | Not inferred |
|---|---|---|---|
| `correct_words[]` | `{ chapter, verse, word }` | `type: word`, `claim: reported_correct`, `positionHint` | Not a Tabyan-confirmed correct word; not directly graded. |
| `skipped_words[]` | `{ chapter, verse, word }` | `type: word`, `claim: reported_skipped`, `mistakeHint.type: unclassified` | Not categorized as omission, substitution, unexpected jump, ASR uncertainty, or confirmed mistake. |
| `tajweed_mistakes[]` | Chapter/verse/word, optional `letter`, `speachLike`, `message`, optional `errorCode` | `type: mistake`, `mistakeHint.type: tajweed` | No canonical word identity, confidence, or Tabyan confirmation. |
| `letter_mistakes[]` | Same documented mistake shape, including optional `letter` | `type: mistake`, `mistakeHint.type: pronunciation` | No more specific phonetic diagnosis or Tabyan confirmation. |
| `chapter_index`, `verse_index`, `word_index` | Current position in a result | `type: position_hint` with provider coordinates | No direct `verseKey`, canonical word index, or trusted cursor movement. |
| `exit_code` | QRC guide defines only 6 (success) and 8 (Surah finished) | 6 = result received; 8 = session ended; all other values remain `unverified` | Do not port other codes from a different Nabr product page into this QRC protocol without provider confirmation. |
| `confidence` / probability | No confidence field is documented in the QRC message types | Absent | No confidence value or confidence threshold is fabricated. |
| Word-level time / transcript | Current guide result schema has no word timestamps or transcript text, partial or final; an older saved guide capture shows a `text` property | Not emitted; transcript support is unverified pending resolution of the documentation discrepancy | Do not invent partial/final transcript events, word timing, or a generic ASR transcript from structured results. |

## Current Tabyan comparison

| Concern | Current Tabyan contract | QRC difference / closure status |
|---|---|---|
| Canonical Quran text | Tabyan canonical word corpus plus `QuranLiveMatcher` | QRC coordinates are resolved only against Tabyan's canonical word corpus and session scope. Provider text is not copied; the result remains an unconfirmed provider observation. |
| Transcript stream | Existing provider boundary emits provider-neutral partial/final transcript events with an utterance ID where supplied | QRC guide documents structured result messages, not transcript events. QRC partial/final transcript capabilities remain **unverified**, not unsupported. |
| Mistake confirmation | `RecitationStateEngine` confirms matcher-derived errors only after its own confidence, audio-reliability, and follow-up-word gates | QRC mistake/skipped labels do not bypass this engine and are not forwarded to its learner-feedback path. |
| Reliability and repetition | Tabyan owns its matcher/state-machine and event dedupe | QRC says results arrive roughly every 500 ms after initial speech, but documents no stable result-event ID or exactly-once semantics. Repeated positions stay observations; no cross-message dedupe guarantee is claimed. |
| Timing | Tabyan records audio/provider/transport milestones separately; current transcript providers do not supply exact spoken-word time | QRC has optional chunk-send echo and heartbeat time only. Neither is an utterance/word timestamp. |
| Start/authorization | Authenticated Tabyan session, role, session mode, and server-owned range | QRC requires a start location and recitation levels. Mapping needs an approved server-side contract for both GENERAL and EDUCATIONAL modes. |
| Cost, privacy, consent | Tabyan's release and provider gates remain in force | QRC requires a subscription. Contract, billing, retention/deletion, data processing, region/subprocessors, and user consent need approval before any live audio test. |

## Fixture boundaries

`artifacts/api-server/src/recitation-providers/fixtures/qrc-contract-fixtures.ts` holds synthetic shapes for the documented QRC events. It contains no provider responses, API keys, or audio.

- Partial/final transcript fixtures are separate generic-ASR normalized events. They do **not** claim QRC transcript support.
- “Possible omission” and “possible substitution” scenarios both remain `reported_skipped` and `unclassified`.
- A duplicate-position shape exercises harmless observation handling only; it does not establish QRC repetition semantics.
- Silence is an absent event, not a fabricated QRC message.

## Gate before any live implementation

The candidate transport is deliberately not a `SpeechRecognitionProvider` and is not routed by the current gateway. `NABR_QRC_ENABLED` defaults false; `NABR_QRC_DRY_RUN` defaults true. The dry-run uses local fixtures/synthetic silence only and has a tested zero-socket path. The live guard allows one session per Node.js process, but is not distributed; the local 10 s connection/start timeout, 45 s heartbeat watchdog, 180 s acceptance cap, and 10 s reset timeout are Tabyan safeguards, not provider limits. No retry or failover is implemented.

Do not connect QRC until the provider confirms the host/authentication arrangement for server-to-server use, versioned schema (including transcript support), semantics of non-6/non-8 exit codes, result/event identity and replay behavior, provider timeout/reconnect/session/rate/concurrency limits, and supported GENERAL/EDUCATIONAL start-position mapping. Obtain explicit billing, privacy/data-processing, retention/deletion, consent, and release approval first.
