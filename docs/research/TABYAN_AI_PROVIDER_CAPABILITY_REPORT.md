# TABYAN AI PROVIDER CAPABILITY REPORT

**Audit date:** 2026-10-11  
**Mode:** strict low-credit, report-only source/configuration audit.

No inference, provider request, GPU, download, database query/write, build, workflow
restart, deployment, implementation change, or benchmark was performed for this
report. Existing results are historical evidence, not new acceptance tests.
Environment inspection returned non-secret settings and secret **presence only**.
Production settings below are configured target settings, not proof of the
currently published process or a successful production connection.

## 1. Executive Summary

- Four executable ASR adapters exist: **OpenAI, Speechmatics, NVIDIA, and local
  Tarteel-derived Quran Whisper**. There is no fifth hosted “Tarteel API” adapter.
- Development selects the cached, CPU/int8 local model. Production configuration
  selects OpenAI. Neither selection was changed.
- OpenAI is implemented for streaming transcription, but the last recorded paired
  preflight failed before readiness because credits were exhausted. Current quota
  was **not checked**. Exact current URL/session acceptance remains unverified.
- The cached local model previously decoded a clear public Alafasy recording.
  Its **Tabyan-normalized Q-WER was 23.7%**, while its letter-form-preserving
  error rate was **57.9% (22/38)**. This is one recording, not student validation.
- Today's local adapter uses **10-second windows with 2-second overlap**, emits
  real final decodes only, and explicitly prohibits confirming mistakes from
  its transcripts. Older per-commit latency numbers do not measure this new flow.
- Web has the more complete matching, educational-state and sound-feedback
  implementation. Native has a separate position matcher, no equivalent
  educational engine/sounds, and significant transcript/stop-protocol gaps.
- **Production Ready: NO as an acceptance verdict.** Source and configuration
  readiness must not be confused with audio quality, security hardening,
  licensing, live provider acceptance, or physical-device verification.

**Evidence vocabulary:** `PASS` describes a inspected source capability unless
explicitly labeled historical test evidence. `SOURCE ONLY` is not a real-device
or live-service pass. `WORKING` requires applicable execution evidence; historical
adapter execution does not establish a complete user journey today.

### Configuration snapshot

| Setting | Development | Production configuration |
|---|---|---|
| `TABYAN_AI_ENABLED` | `true` | `true` |
| `TABYAN_AI_TRANSCRIPTION_ENABLED` | `true` | `true` |
| `TABYAN_AI_LIVE_TRACKING_ENABLED` | `true` | `true` |
| `TABYAN_AI_ASR_PROVIDER` | `tarteel` | `openai` |
| `TABYAN_AI_TARTEEL_TRIAL_ENABLED` | `true` | Not listed |
| `HF_HOME` | Workspace `.cache/huggingface` | Not listed |
| `TABYAN_TARTEEL_MODEL_PATH` | Pinned cached `whisper-quran-ct2` folder | Not listed |
| Provider secrets | OpenAI, Speechmatics, NVIDIA keys exist | Per-environment validity/access not tested |

The API package's development command explicitly sets `NODE_ENV=development`.
Tarteel selection requires that runtime value and the trial flag; production
cannot enable it merely by setting the provider name. Missing/invalid selections
fail closed, with no automatic paid fallback. [S1–S3]

## 2. Provider Inventory

Paths in this table are relative to `artifacts/api-server/src/recitation-providers/`.
“Web/Native” means a client can reach the shared gateway when explicitly selected,
not that that combination has passed acceptance.

| Name / source | Runtime | Status today | Web | Native | Dev-only | Production capable in source | Blocker |
|---|---|---|---|---|---|---|---|
| OpenAI / `OpenAiRealtimeProvider.ts` | Node `ws` → hosted OpenAI | Production-configured; live acceptance unverified | Yes, source | Yes, partial integration | No | Yes, structurally | Last recorded credit exhaustion; current URL/session preflight, ordering and grading validation |
| Speechmatics / `SpeechmaticsStreamingProvider.ts` | Node `ws` → hosted Realtime | Implemented, not selected | Yes, source | Yes, source | No | Structurally, not accepted | Recognition/audio/quality evidence, finish protocol and contract validation |
| NVIDIA / `NvidiaStreamingProvider.ts` | Node gRPC → hosted NVCF/Riva | Implemented, not selected; known Arabic endpoint failure | Source, format gap | Source | No | Not usable for Arabic on the documented current endpoint | Hosted function rejects `ar-AR`; premature readiness; Web 24k/16k mismatch |
| Local Quran Whisper / `TarteelWhisperProvider.ts`, `TarteelWhisperWorker.ts`, `tarteel_whisper_worker.py` | Node adapter → shared Python faster-whisper/CTranslate2 CPU/int8 | Opt-in Development trial; cached model and historical decode verified | Yes, current trial | Gateway accessible, stop flow incomplete | **Yes** | **No under current selection guard** | Accuracy/rights, device/E2E evidence, chunk latency, bounded capacity |

**Research-only, not implemented providers:** Nabr/Qurani QRC, WasimLHR Whisper
Quran v1/ONNX, Muno459 offline/streaming FastConformer Quran, Quran-Lab Zipformer
phoneme model, and DeepDML Whisper Base Mix-Norm. Their descriptions/model cards
exist in research, but they have no selectable runtime adapter here. Access,
licensing, memory, phoneme-to-word integration, or matched evaluation remain
unresolved. Publisher scores must not be compared as Tabyan measurements. [S15]

**Not ASR providers:** EveryAyah is recitation playback; alquran.cloud supplies
canonical text for the legacy/Native range flow. Successful playback/text fetches
are not evidence that student audio was recognized.

No separate OpenAI recorded-file transcription endpoint or LLM session-summary
provider was found in the audited application server/tRPC paths.

## 3. OpenAI Capabilities

### Exact configured model/protocol

| Field | Current implementation |
|---|---|
| Transcription model | **`gpt-live-transcribe`** |
| Connection URL | `wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1&intent=transcription` |
| Connection-model role | `gpt-realtime-2.1` is the URL model, not the selected transcription model |
| Session update | `session.update`, `session.type: "transcription"` |
| Audio format | `audio/pcm`, clients encode mono PCM16LE/base64 |
| Sample rate | **24,000 Hz** |
| Language/delay | `languages: ["ar"]`, `delay: "minimal"` |
| Turn detection | **`null`**, not provider server VAD |
| Commit strategy | Client `input_audio_buffer.commit`; Web segments on silence/length |
| Partial event | `conversation.item.input_audio_transcription.delta` |
| Final event | `conversation.item.input_audio_transcription.completed` |
| Readiness | `session.updated`, not socket-open |
| Commit acceptance | `input_audio_buffer.committed` |

The earlier report identifies a documentation scope discrepancy for `delay` and
the direct WebSocket/session combination. Mock payload tests do not resolve it;
the last live preflight never reached ready. Do not substitute the REST
`/v1/realtime/transcription_sessions` route for this WebSocket without validation.
[S4, S13, S16]

### Capability matrix

| Requested capability | Result | Source evidence / limit |
|---|---|---|
| Realtime microphone transcription | PARTIAL | Adapter + capture path exist; no current complete mic acceptance |
| Partial / final transcript events | PASS / PASS | Explicit event mapping, item IDs, delta/full-final distinction |
| Provider readiness | PASS in source | Waits for `session.updated`; live readiness unverified |
| Server-side WebSocket | PASS | Backend bearer header; client talks only to Tabyan |
| WebRTC ASR transport | MISSING | Current ASR path uses WebSocket, not WebRTC; meeting WebRTC is unrelated |
| PCM input / 24kHz | PASS / PASS | Session format and client encoders |
| Automatic provider turn detection | MISSING / disabled | `turn_detection: null`; Web client segmentation is a separate feature |
| Manual commit | PASS | Adapter sends commit; acknowledgement is mapped |
| Context prompt | MISSING | No context/prompt sent in session payload |
| Keyword hints | MISSING in implementation | Documented API hints are not configured |
| Language hints | PASS | Arabic list supplied |
| Retry | PARTIAL | Web UI/transport restarts; adapter has no internal retry loop |
| Reconnect | PARTIAL | Web reader retries eligible transport failures with matcher retained; Native lacks equivalent automatic recovery |
| Idle timeout | MISSING at provider/gateway level | Authentication/start/final-flush timeouts are not authenticated idle-session expiry |
| Transcript ordering | PARTIAL | Web buffers by item ID; no strict commit-chain/previous-item reorder queue |
| Cleanup | PASS in normal paths | Close guards and client stream/node cleanup; gateway repeated-auth issue remains |
| One active session protection | PARTIAL | Local single-flight/controller guards, no server-wide per-user/session socket lease |

The gateway does not forward adapter confidence or word timing fields. The
engine's “confidence” is matcher alignment confidence, not calibrated ASR
confidence. The cached official guide also says `gpt-live-transcribe` supplies no
word-level timestamps, speaker labels or transcription confidence scores. [S2, S16]

### Product fit: ASR versus Tabyan educational logic

| Use case | Classification | Current implementation / interpretation |
|---|---|---|
| A. Live Quran position tracking | NEEDS TABYAN LOGIC | ASR text → constrained canonical matcher; source exists |
| B. Ayah detection | NEEDS TABYAN LOGIC | Derived canonical verse key, not a Quran-aware OpenAI result |
| C. Word progression | NEEDS TABYAN LOGIC | Matcher provisional/committed positions |
| D. Mistake candidate detection | NEEDS TABYAN LOGIC | Alignment operations feed possible errors |
| E. Confirmed mistake detection | PARTIAL | Heuristic state engine exists; authoritative acoustic confirmation unsupported |
| F. Tashkeel mistake detection | UNSUPPORTED as a reliable product | Experimental text evidence only; no phonetic/tajweed grading |
| G. Voice Quran search | NEEDS TABYAN LOGIC | Web voice flow + canonical search index; live acceptance pending |
| H. Recorded-file transcription | PARTIAL | Development file-to-PCM injection exists; dedicated production file ASR API missing |
| I. Teacher review transcription | UNSUPPORTED currently | Teacher session access is not a transcription/review pipeline |
| J. Session summaries | PARTIAL | Deterministic engine statistics/local history; no LLM narrative-summary implementation |

## 4. Local Quran Model Capabilities

| Field | Evidence |
|---|---|
| Model family | Tarteel Arabic-Quran Whisper Base derivative, not an official Tarteel cloud API |
| Source model | `tarteel-ai/whisper-base-ar-quran` |
| Converted repository/subfolder | `kaylazima/quranic-model` / `whisper-quran-ct2` |
| Pinned revision | `9fee6e6bca1099abef1c280e79be43a8f74d78b9` |
| Expected path | Explicit `TABYAN_TARTEEL_MODEL_PATH`; otherwise cached pinned HF snapshot |
| Weights present | YES: inspected existing nonempty `model.bin`, `config.json`, `vocabulary.json` |
| Sizes inspected | 76,396,677 + 1,933 + 1,068,103 bytes = 77,466,713 bytes |
| Worker present | YES, Python private stdio worker |
| Runtime dependencies present | faster-whisper 1.2.1; CTranslate2 4.8.2; PyAV 19.0.1; NumPy 2.5.3 distribution directories |
| CPU support | YES, configured `device="cpu"`, `compute_type="int8"`, 1–4 threads |
| GPU support | NOT configured in this worker; framework capability is not an implemented GPU path |
| True streaming | **NO** |
| Chunked mode | YES, current 10s window, 2s overlap, 8s hop |
| Batch mode | YES, worker decodes bounded PCM requests; not a public recorded-file product |
| Partials / finals | No synthetic partials; real final decodes only |
| Input/internal rate | Mono PCM16 at 24kHz → PyAV resampling to 16kHz model input |
| Decode options | Arabic, beam 5, temperature 0, no previous-text conditioning, no worker VAD, word timestamps |
| Finalize | Current adapter drains queued remainder and emits matching `finalized(commitId)` |
| Offline | Offline HF env + local-only loading; no missing-weight download or paid fallback |

Source bounds: 30s buffered PCM, two pending adapter decodes, three shared worker
requests. One shared worker avoids one model per socket but introduces shared
capacity/queuing. The presence check does not import/load/run the model now.
**Runnable evidence: YES historically with the same cached checkpoint; current
end-to-end trial remains PARTIAL.** [S3, S5, S13]

### Historical baseline and limitations

The saved 43-second Al-Mulk 67:1–3 Alafasy benchmark reports:

- **Tabyan-normalized Q-WER: 23.7% (9/38). Do not call this raw WER.**
- **Letter-form-preserving error rate: 57.9% (22/38).**
- Final location 67:3:18; 38/38 words committed; zero partials/eight finals.
- One false confirmed error on a clear recording with no injected mistakes.
- Old per-commit decode latency P50 1,669ms/P95 2,063ms; display/commit latency
  P50 3,838ms/P95 9,217ms. Not current 10-second-window E2E latency.
- Historical peak inference RSS about 400MiB, four CPU threads, no GPU.

The current local adapter sends `confirmationEligible: false`; Web carries it
to the engine. Therefore the historical false confirmation is not a claim that
the guarded current local path still confirms errors. Current local transcripts
may guide **position tracking/development trials/review candidates**, not
authoritative mistake accusations. No multi-reciter/student/microphone accuracy
or rights clearance is established by this one sample.

The converted repository declares MIT; upstream declares Apache-2.0. This alone
does not establish exact derivative-weight, training-data, commercial-use and
redistribution permissions. Production selection is deliberately blocked. [S13, S15]

### OpenAI versus local provider

| Dimension | OpenAI `gpt-live-transcribe` | Local Quran Whisper |
|---|---|---|
| Live streaming | Implemented hosted delta/final stream; current acceptance unverified | Chunked near-realtime, not true streaming |
| Latency | No valid paired measurement while credit-blocked | First regular decode waits for ~10s audio + inference; old batch metrics above |
| Partial transcripts | Yes in protocol/adapter | None |
| Final transcripts | Yes in protocol/adapter | Real decoded chunk finals |
| Quran specialization | General ASR; no Tabyan grading rules | Quran-tuned model lineage; quality still inadequate for authoritative grading |
| Resources | Tabyan gateway + external provider | Python/runtime, cached weights, CPU/RAM and queue capacity |
| Replit compatibility | Node adapter fits existing project; external access/credits required | Historically ran in this workspace; not a validated deployment package |
| Cost | Existing note quotes $0.017/audio minute; hosted usage | No hosted-ASR per-minute fee; computing/hosting are not inherently free |
| Offline | No | Model inference can be offline after cache/runtime availability |
| Scalability | External service limits plus Tabyan socket/auth/budget controls | Shared serial decoder/bounded queues; capacity must be measured |
| False-positive risk | Not measured in this paired run; transcript errors still possible | Historical false positive; current confirmation flag blocks Web confirmation |
| Production readiness | Not accepted: last credit failure/current preflight unknown | Development-only; prohibited by selector, rights/quality unresolved |

## 5. Web Flow

`MushafReader` starts an authorized recitation session, prepares canonical words,
connects the Tabyan WebSocket, waits for provider ready, then starts microphone
capture. The hook's OpenAI-oriented name does **not** mean it bypasses provider
selection: it uses the same gateway for all four adapters. [S2, S6, S7]

| Flow step | Status | Detail |
|---|---|---|
| Microphone capture | SOURCE ONLY | `getUserMedia`, mono, echo/noise suppression and auto gain |
| Audio worklet | SOURCE ONLY | Dynamically loaded worklet, ~100ms frames |
| PCM conversion | SOURCE ONLY | Clamped PCM16, fixed 24kHz worklet output |
| WebSocket connection | SOURCE ONLY | Gateway bearer-token first message; no direct provider key |
| Provider readiness | PARTIAL | Proper OpenAI/Speechmatics/local signals; NVIDIA announces ready prematurely |
| Transcript delivery | SOURCE ONLY | Synchronous subscribers; Web accumulates deltas by item |
| Matcher update | SOURCE ONLY | Canonical matcher fed from subscribed transcript events |
| Visible position update | SOURCE ONLY | Committed/provisional word states, opacity-based reveal, page following |
| Retry | SOURCE ONLY | Single-flight start/stop; transport-only reader reconnection |
| Failure state | SOURCE ONLY | Explicit categorized failure; no fabricated recognized text |
| End-session flush | PARTIAL | Worklet tail flush, final commit, provider wait, then server finalize |

There is **no current complete real-microphone ASR→UI WORKING claim**. Historical
text tests, rendered fixtures and direct-adapter benchmarks cannot establish it.

Web stop waits up to 1.5s for worklet flush; local finalization requires matching
commit ID and waits up to 120s. Other adapters wait up to 10s, but resolve on a
final transcript rather than a correlated last-commit drain acknowledgement.
An earlier in-flight final could therefore satisfy the wait; full last-audio
drain is not proven. Speechmatics/NVIDIA commits are no-ops. [S6]

The Web worklet always emits 24kHz, while NVIDIA's ready message/config demands
16kHz. Merely creating an AudioContext at the requested rate does not change the
worklet's fixed output target. This combination needs format verification/fix
before NVIDIA acceptance; no fix was made.

Voice search has a canonical index/search engine, voice subscriptions and a
12-second capture limit. File injection decodes a selected recording, resamples
and paces PCM through the authenticated live gateway; it is a development QA
path, not a production upload/teacher-review transcription endpoint.

## 6. Native Flow

| Capability | Status | Evidence / limitation |
|---|---|---|
| Route | SOURCE ONLY | `artifacts/mobile/app/student/recitation.tsx`, student/session guards |
| Mic permission | SOURCE ONLY | `AudioManager.requestRecordingPermissions()` |
| Capture | SOURCE ONLY | `react-native-audio-api` AudioRecorder, 24kHz/2,400-sample buffers |
| Conversion | SOURCE ONLY | Channel averaging, linear resampling to advertised target, PCM16LE/base64 |
| WebSocket | SOURCE ONLY | Native socket → same authenticated gateway |
| Controller | SOURCE ONLY | Single-use `NativeRecitationControllerCore`, injected runtime, cleanup/pause/resume |
| Transcript handling | **PARTIAL** | Reads text/item/final, but ignores `textIsDelta` and does not assemble OpenAI deltas |
| Matcher | **PARTIAL** | Separate Native position matcher, not Web educational-state engine |
| Visual feedback | SOURCE ONLY | Revealed canonical words/progression; confidence is not a grading score |
| Sound feedback | **MISSING** | No AI cue player/controller wiring found in this flow |
| End-session flush | **PARTIAL / blocker** | Sends ordinary commit then close; does not await final transcript/drain |
| Real iPhone verification | **NOT VERIFIED** | Neither dependency presence nor deterministic fake tests proves hardware capture |

Native's matcher handles full/extended hypotheses, while OpenAI sends text
fragments. Feeding fragments without Web-style assembly loses the intended
transcript semantics. Final full transcripts still have a mapping path.

Native has no periodic/silence commit segmenter. For OpenAI that limits final
utterance closure during uninterrupted recording. For current local decoding,
ordinary commit does not decode a sub-10s remainder: stop must use finalization
and wait for `finalized`, but currently closes instead. Short final audio can be
lost; this is not a successfully flushed session.

Native canonical words come from the selected alquran.cloud Uthmani ayah range,
not the Web QCF page corpus. It is a bounded display/matcher range for GENERAL;
it does not implement Web's dynamic open-ended next-page corpus growth.
No equivalent confirmed-error, correction, tashkeel or sound engine is wired.
[S8, S9, S12]

## 7. Quran Matching Stack

### Layer separation

1. **Provider:** PCM → hypothesis text/events. Does not emit authoritative Quran
   grades; providers differ in finality, delta semantics and reliability evidence.
2. **Gateway/client transport:** authenticates, forwards audio, normalizes event
   shape, Web accumulates deltas; not itself a Quran recognizer.
3. **QuranNormalizer:** orthographic normalization of matching text, never QCF glyphs.
4. **QuranLiveMatcher:** canonical context → alignment, positions, confidence,
   committed/revisited operations and reveal map.
5. **RecitationStateEngine:** alignment + reliability/eligibility → word states,
   possible/confirmed/corrected/dismissed events and deterministic statistics.
6. **UI:** canonical word positioning/reveal/color/history/cues. ASR hypotheses
   must not be displayed as if they were authoritative Quran text.

Native implements layers 1–3 and a different layer-4 matcher; it does not share
Web's layer-5 educational engine. [S2, S6–S10]

### QuranNormalizer

| Capability | Status | Actual behavior |
|---|---|---|
| Diacritics | PASS for matching | Removes specified Quran/Arabic mark ranges, not pronunciation analysis |
| Hamza normalization | PARTIAL | Alif-carried variants unified; standalone hamza/ؤ/ئ preserved |
| Alif variants | PASS | ٱ/أ/إ/آ → ا; dagger alif → ا |
| Orthographic equivalences | PARTIAL | ى → ي, tatweel/format marks removed; not an exhaustive Uthmani lexicon |
| Punctuation removal | PARTIAL / separate layer | Matcher/search tokenizers remove punctuation; normalizer itself does not |
| Token normalization | PASS in composed pipeline | NFC, whitespace normalization; callers split tokens |
| Ayah markers | PARTIAL | Some marks fall in removed Unicode ranges; digits/compound markers not comprehensively handled |
| Special Quran spelling | PARTIAL | Limited exact character rules; no broad spelling/reading-equivalence dictionary |

Taa marbuta and root-letter hamzas are intentionally not broadly collapsed.
The Web/Native normalizer functions currently mirror these rules. Search
additionally strips digits; the live matcher punctuation regex does not. [S10]

### QuranLiveMatcher matrix

| Capability | Result | Scope |
|---|---|---|
| Current Surah | PASS | Canonical current word carries surah, within loaded corpus |
| Ayah tracking | PASS | Canonical verse key/ayah |
| Word position | PASS | Provisional + committed indices/positions |
| Page transition | PARTIAL | Matcher reports page; reader performs navigation with boundary evidence |
| Skip detection | PASS | Alignment skip/gap operations, not definitive acoustic omission proof |
| Repetition handling | PASS | Revisit operations/ambiguous restart protection |
| Backtracking | PASS | Backward context/revisits; committed progress generally monotonic |
| Next-page context | PASS in Web source | Append canonical next-page words to same matcher; preload alone is insufficient |
| Transcript overlap | PARTIAL | Per-item consumed tokens; local worker uses word timestamps; not universal reorder/dedupe |
| Partial stability | PASS | Two-hypothesis stability, rollback, confidence bounds/open-prefix safeguards |
| Final commit | PASS in matcher source | Final aligns/commits; receiving all final audio is a transport issue |

Matching uses bounded context, edit costs, recovery, a confidence threshold
default 0.68 and commit threshold 0.86. A forward jump greater than 12 words needs
multiword evidence; an exact single word can commit. These are **text alignment
heuristics**, not validated probabilities of correct pronunciation.
GENERAL has rolling context; EDUCATIONAL has a scoped corpus, but server
assignment readiness currently prevents starting that mode. [S7, S10, S12]

## 8. Educational Error Logic

Actual Web word-state names:

`UNREAD`, `EXPECTED`, `HEARD_PENDING`, `CORRECT`, `POSSIBLE_ERROR`,
`CONFIRMED_ERROR`, `CORRECTED`, `SKIPPED`, `PEEKED`.

Actual mistake kinds:

`OMISSION`, `WRONG_WORD`, `EXTRA_WORD`, `REPETITION`, `SKIP`, `UNEXPECTED_JUMP`.

Event statuses: `possible`, `confirmed`, `corrected`, `dismissed`, `unconfirmed`.
There are no literal `POSSIBLE_MISTAKE`, `CONFIRMED_MISTAKE`, `NEEDS_REVIEW` or
`REPEAT` word states. Review/repetition are represented through the actual
event/state model, not invented additional states.

Confirmation requires high matcher confidence, reliable audio, eligibility,
and a run of subsequent matching words (default two). Strict mode can hold and
rewind at an internally confirmed error; revisits can correct it. “ليست خطأ”
dismisses rather than erases its history. Unconfirmed candidates are not counted
as confirmed mistakes. This still does not make a `CONFIRMED_ERROR` an
authoritative educational/acoustic judgement. [S11]

Tashkeel code only compares text when vocalization exists and monitors whether
the provider supplies sufficient marks. The live reader observes evidence
level; it does not wire phonetic mismatch marking into the engine. Missing
marks produce insufficient evidence, not a tashkeel accusation.

Server EDUCATIONAL assignment source is explicitly **missing/fail-closed**.
`todayAssignment` supplies a level, not a server-verified assignment range.
GENERAL stays user-ended/open-ended; this audit did not change that contract.

### False-positive protection

| Risk | Protection rating | Evidence and remaining limit |
|---|---|---|
| ASR hallucination | PARTIAL | Canonical constrained matching/recovery; plausible hallucinated Quran can still align |
| Noisy microphone | PARTIAL on Web; WEAK on Native | Web PCM RMS/clipping/noise monitor gates confirmation; not speaker separation or phonetic certainty |
| Unstable partials | STRONG at Web text-contract level | Provisional positions, repeated-hypothesis stability and rollback; Native fragment handling incomplete |
| Repeated events | PARTIAL | Last-event dedupe/per-item consumption; no general replay/sequence enforcement across all providers |
| Chunk overlap | STRONG locally at source-contract level | Actual word-time filtering with monotonic emitted horizon; not independent acoustic validation |
| Wrong Quran location | PARTIAL | Context windows, recovery/anchor costs, jump and repeated-opening guards; repeated phrases remain ambiguous |
| False mistake accusation | PARTIAL overall | Reliability gate, later-word evidence, dismissal, local confirmation veto; hosted alignment confidence is not ASR confidence |

“STRONG” here rates the specific source mechanism, not a measured clinical/
educational false-positive rate. Fully automatic authoritative accusations are
**UNSAFE without stronger provider-specific ground truth**. Overall current
mistake support is **PARTIAL**.

## 9. Sound Feedback

| Cue | Platform support | Actual trigger |
|---|---|---|
| Session start | WEB | Once on capture/provider readiness, not merely the tap |
| Confirmed mistake | WEB | New `CONFIRMED_ERROR` only, not possible-error candidate |
| Correction | WEB | Correction of a previously signaled confirmation |
| Ayah complete | WEB, conditional | Whole canonical ayah CORRECT and a loaded next word proves boundary |
| Session end | WEB | Normal successful closure, not cancellation/failure |

Pause/resume Web tones also exist. Native AI sound feedback is **MISSING**, so
combined platform coverage is **PARTIAL**, not BOTH/COMPLETE. Local transcripts
cannot trigger a confirmed-mistake sound while confirmation eligibility is false.

- Per-session/word dedupe; start/end guards; ayah dedupe; 650ms burst throttling
  with correction exception. No stale sound backlog.
- Account-scoped mute preference and UI setting are supported.
- Browser AudioContext is prepared from the start user gesture; transcript events
  do not try to create/unlock it. Resume wait is bounded to 200ms.
- Playback failure/mute does not stop capture, recognition or finalization.
- At an unloaded/end-of-corpus boundary, the ayah cue deliberately does not
  invent completion. Source/tests exist; audible real-device proof is absent.
[S14]

## 10. Cost Model

### OpenAI

The existing provider-comparison report quotes the official model-page price of
**USD $0.017 per audio minute** for `gpt-live-transcribe`. This audit reused that
record and its official link; it did **not** refetch pricing or establish that
it is unchanged on this audit date. Treat it as a documented planning assumption,
not a fresh quote. Do not apply generic Realtime conversational token prices to
this transcription model, or this live price to an unpriced recorded-file model.
[S13]

Formulas only:

```text
estimated_monthly_live_transcription_cost_USD
  = billable_audio_minutes × verified_live_price_per_minute

100 minutes/month    → 100 × 0.017 USD
1,000 minutes/month  → 1,000 × 0.017 USD
10,000 minutes/month → 10,000 × 0.017 USD

recorded_review_cost
  = billable_recorded_minutes × separately_verified_file_model_price
```

Billable provider audio may include silence; spoken-word duration is not
necessarily the charged duration. Hosting/network/storage, applicable provider
limits and commercial terms are separate. No calculator/API was run.

### Local hosting

No external inference charge does not mean zero resource cost. Historical CPU
and memory measurements above show real model-serving work. Plan capacity using:

```text
CPU work = decoded_chunk_count × measured_CPU_seconds_per_chunk
capacity = available_worker_time / measured_service_time_per_request
hosting_cost = applicable_CPU_RAM_uptime_storage_costs
```

Overlap re-decodes audio, so decoded duration can exceed session duration.
Current window/capacity metrics require a later approved benchmark, not arithmetic
extrapolation from the old eight-commit sample. GPU is **not required by the
current CPU worker**; any GPU migration is a separate architecture/cost decision.
No Replit price, machine tier or billing total is invented here.

## 11. Privacy/Security

### Audio data flow

| Provider | Flow | Leaves Tabyan-hosted processing infrastructure? |
|---|---|---|
| OpenAI | Mic/file PCM → authenticated Tabyan gateway → OpenAI → transcript → client normalizer/matcher/UI | **YES**, hosted external ASR |
| Speechmatics | Mic PCM → gateway → Speechmatics → transcript → client matcher | **YES** |
| NVIDIA | Mic PCM → gateway → NVCF/Riva → transcript → client matcher | **YES if functioning**, despite current startup block |
| Local Quran Whisper | Mic/file PCM → gateway → local Python stdio/CPU → transcript → client matcher | **NO external ASR audio transfer**; still uploaded from phone/browser to Tabyan server |

“Local” is server-local, not phone-offline: Native has no bundled model/runtime.
HF model loading is offline in the configured worker. The local decoder holds
PCM in memory and creates an in-memory WAV, not a student-audio recording archive.
The audited ASR path logs counters/categories rather than transcript/audio text.
Other product recording/upload flows and provider contractual retention are
separate; this source audit cannot certify their complete privacy compliance.
Web history stores derived statistics/mistake references locally per account;
it is not a server-persisted transcription/educational transcript grade.

### Security matrix

| Control | Verdict | Evidence / limit |
|---|---|---|
| Server-side API key | PASS | Backend env → provider bearer/gRPC metadata only |
| Secret inspection/exposure | PASS for this audit | Presence only; no secret values read or recorded |
| Browser/Native provider keys | PASS in audited source | No provider-key references found in runtime client source |
| Auth before WebSocket | PARTIAL wording | Upgrade itself is open; first-message token auth precedes ASR/audio, with 10s timeout |
| Student role enforcement | PASS | Gateway requires student before provider setup |
| Student/session ownership | PASS at authorization | DB requires session ID + authenticated user ID + listening status |
| Teacher session ownership | PASS at query layer | Teacher/student session-link guard; educational-only records |
| Cross-user protection | PARTIAL | Initial ownership checks exist; no new real-device isolation test was run |
| Continuing session authorization | PARTIAL | No per-audio recheck of session status or token revocation |
| One active provider/session per account | PARTIAL / hardening gap | No server registry/unique active-session lease found |
| Resource/budget/abuse limits | PARTIAL | 32KiB base64 chunk bound/local queue caps; no complete hosted audio-time budget, rate/concurrency or idle enforcement |

Repeated `auth` messages are not explicitly rejected/serialized. They can replace
the socket's provider reference while earlier authentication/provider activity
remains in flight. Separate sockets can also authorize the same listening
session. No new authorization exploit was attempted; these are static
hardening findings, not claims of proven cross-account disclosure.

Provider confidence/start/end timestamps are omitted by gateway serialization.
That limits educational evidence even for adapters that produce those fields.
No origin policy or low explicit overall WebSocket payload cap is set in this
gateway. These deserve review before wide hosted usage, without changing them
as part of this report. [S2, S12]

## 12. Production Readiness

| Provider | Acceptance classification | Exact remaining gates |
|---|---|---|
| OpenAI | **BLOCKED for production acceptance** | Last observed credit exhaustion; current quota unknown; current session URL/payload ready + multiple commits not live-verified; full mic/device drain/order/quality and budget controls |
| Speechmatics | **BLOCKED for acceptance; source adapter exists** | Not selected; current RecognitionStarted/AudioAdded/partial/final evidence and Quran benchmark not established here; correlated stop/drain and terms |
| NVIDIA | **BLOCKED** | Known hosted Arabic config rejection; ready is emitted on config write, not recognition acknowledgement; Web rate mismatch and unstable fallback item IDs |
| Local Quran Whisper | **DEVELOPMENT READY**, not canary/production | Cached CPU model/historical decode; current Web/Native E2E acceptance, new-window latency, quality/rights/capacity; production selector explicitly rejects it |

No provider earns **CANARY READY** or **PRODUCTION READY** from this report.
Enabled production flags do not override acceptance gates. Historic quota
failure is not proof that quota remains exhausted today.

## 13. Recommended Architecture

Keep the existing explicit server provider boundary and configured production
selection unchanged. Require provider readiness, audio acceptance and drained
closure separately. Preserve canonical matching and review logic outside ASR.
Maintain a provider-specific evidence/confirmation policy; do not treat provider
finality or matching confidence as proof of pronunciation.

| Use case | Recommendation | Qualification |
|---|---|---|
| Live recitation | **OpenAI as provisional hosted baseline**, local trial for development | Not an accuracy winner: paid readiness and real-mic/device gates pending |
| Recorded student review | Separate bounded file-transcription path; OpenAI `gpt-transcribe` is the cached official guide's starting candidate | Not implemented here; model/price/privacy/teacher ownership need separate verification |
| Voice search | Any accepted Arabic transcript provider + existing canonical search engine | Search result is a canonical location, not a recitation grade; short capture budgets |
| Teacher review | Transcript assist + authorized teacher/human judgement | Teacher query exists, transcription product does not; do not auto-grade |
| Offline/local server mode | Existing cached CPU Quran Whisper for trials/assistance | Not device-offline; no production promotion until rights/quality and capacity clear |
| Low-cost fallback | Explicit opted-in local development trial, or stop with a clear unavailable state | No silent paid fallback and no automatic production switch |
| Quran-specialized accuracy track | Existing local model is runnable research baseline; FastConformer/Nabr are research candidates | Neither publisher WER nor claims establish Tabyan accuracy; gated/contract/rights checks first |

OpenAI is **OPTIONAL architecturally**, but currently required by the configured
production choice if that choice is left unchanged. No single provider is
recommended for every use case. Session summaries can remain deterministic
instead of adding another paid LLM.

## 14. Known Blockers

1. Live OpenAI acceptance/current quota not verified; last saved credit failure
   occurred before provider readiness/audio, not an accuracy test.
2. Native OpenAI delta assembly, silence/periodic commits and final-drain
   handshake are incomplete; local short remainder can be lost.
3. Native educational-state parity, AI sounds and real iPhone proof are absent.
4. Local checkpoint rights and varied, consented, rights-cleared acoustic
   evaluation remain unresolved; current accuracy does not justify accusation.
5. NVIDIA endpoint rejects Arabic; premature ready and Web sample-rate mismatch.
6. Hosted stop correlation/ordering, server concurrency/idle/rate/budget controls
   and repeated-auth lifecycle need hardening.
7. EDUCATIONAL lacks a server-assigned range source and remains fail-closed.
8. Recorded-file student/teacher transcription is not a production endpoint.
9. Tashkeel/tajweed/pronunciation evidence is insufficient; normalization removes
   the distinctions needed for a credible pronunciation judgement.
10. Current 10s-window local gateway→UI latency and cross-page/device behavior
    have no new measurement in this report.

## 15. Next Steps

These are recommendations only, not implementation, tasks submitted, provider
switches, or permission to spend:

1. Address Native delta/commit/drain parity and gateway authorization/resource
   lifecycle in a separately authorized implementation scope.
2. Keep local confirmation disabled; validate cached-model quality and rights
   before student canary. Do not download a new model without approval.
3. When explicitly approved and funded, verify hosted session readiness,
   accepted audio, multiple utterance commits and ordered final drain. Do not
   retry exhausted credits or infer provider access from a saved secret.
4. Then verify one complete Web and real-iPhone audio journey with authorized,
   non-sensitive test material, including interruption, cancellation and tail
   audio. Fake controller tests cannot replace this.
5. Define recorded-review ownership, privacy and human adjudication before
   exposing transcription to teachers; keep GENERAL/EDUCATIONAL contracts distinct.
6. Refetch official prices/terms only when planning actual spend, with the
   required approval if the action's cost is uncertain.

### Source and evidence index

- **S1:** `artifacts/api-server/src/recitation-providers/types.ts`,
  `providerSelection.ts`; `artifacts/api-server/package.json`.
- **S2:** `artifacts/api-server/src/recitationRealtime.ts`, especially
  `emitTranscript`, `providerEvents`, authorization and audio/commit handling.
- **S3:** `providerSelection.ts`, `TARTEEL_TRIAL.md`, Python local-only loader.
- **S4:** `artifacts/api-server/src/recitation-providers/OpenAiRealtimeProvider.ts`.
- **S5:** `TarteelWhisperProvider.ts`, `TarteelWhisperWorker.ts`,
  `tarteel_whisper_worker.py`, existing pinned cache and dependency directory metadata.
- **S6:** `artifacts/tabyan/src/lib/recitation-ai/useOpenAiRealtimeTranscription.ts`,
  `pcm-worklet-source.ts`, `latencyTelemetry.ts`, `audioQuality.ts`,
  `audioFileInjection.ts`.
- **S7:** `artifacts/tabyan/src/components/mushaf/MushafReader.tsx`,
  `artifacts/tabyan/src/lib/mushaf/useRecitationSession.ts`.
- **S8:** `artifacts/mobile/lib/native-recitation.ts`,
  `native-recitation-controller.ts`, `native-recitation-matcher.ts`.
- **S9:** `artifacts/mobile/app/student/recitation.tsx`,
  `artifacts/mobile/lib/quran-normalizer.ts`.
- **S10:** `artifacts/tabyan/src/lib/recitation-ai/normalizer.ts`,
  `QuranLiveMatcher.ts`, `quranSearch.ts`.
- **S11:** `artifacts/tabyan/src/lib/recitation-ai/recitationStateEngine.ts`,
  `tashkeel.ts`.
- **S12:** `lib/tabyan-trpc/src/routers/recitation.ts`,
  `lib/db/src/schema/index.ts` recitation table definition (source inspection only).
- **S13:** `docs/TABYAN_RECITATION_PROVIDER_LIVE_COMPARISON.md`. Historical
  CPU benchmark, 59 API tests/typecheck reported there; not rerun/current blanket PASS.
- **S14:** `artifacts/tabyan/src/lib/mushaf/recitation-cues.ts`,
  `recitation-feedback.ts` and existing adjacent tests.
- **S15:** `research/wave2-quran-asr-benchmark.md`,
  `research/quran-asr-provider-update-2026-10-10-ar.md`.
- **S16:** `research/sources/openai-realtime-transcription-guide.md`,
  `openai-realtime-api-reference.md`, `openai-speech-to-text-guide.md`
  (cached official pages fetched 2026-10-05).
- **S17:** `SpeechmaticsStreamingProvider.ts`, `NvidiaStreamingProvider.ts`;
  previously recorded protocol observations in
  `.agents/memory/speechmatics-realtime-preflight.md` and
  `.agents/memory/nvidia-hosted-arabic-asr-gate.md` (not fresh provider requests).
- **S18:** `verification/TABYAN_WEB_QURAN_AI_UPGRADE_REPORT.md`, historical
  Web text/fixture evidence, explicitly lacking live acoustic validation.

Official references retained by existing research:
[Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription),
[model/pricing](https://developers.openai.com/api/docs/models/gpt-live-transcribe),
[file transcription](https://developers.openai.com/api/docs/guides/speech-to-text).
No external page or provider API was requested for this audit.

### Final console summary

```text
TABYAN AI PROVIDER CAPABILITY REPORT

Providers Found:
OpenAI, Speechmatics, NVIDIA, local Tarteel-derived Quran Whisper
Research-only candidates are listed separately, not counted as runtime providers.

Recommended Live Provider:
OpenAI — provisional hosted baseline, pending live acceptance and approval.

Recommended Recorded-Audio Provider:
Separate OpenAI gpt-transcribe file path as a candidate; not implemented.

Recommended Quran-Specialized Provider:
Local Quran Whisper for development trials only; no production-approved winner.

OpenAI Required:
OPTIONAL architecturally; current production configuration selects it.

Local Model Runnable:
YES — cached weights/dependencies and historical CPU run; no new inference.

Web Recitation:
PARTIAL

Native Recitation:
PARTIAL

Mistake Detection:
PARTIAL — authoritative automatic accusation is unsafe.

Sound Feedback:
PARTIAL — Web source coverage; Native missing.

Production Ready:
NO — acceptance gates not passed.

Main Blockers:
Hosted readiness/quota unknown, Native delta/commit/drain gaps,
local accuracy/rights, device proof, server lifecycle/budget controls,
NVIDIA Arabic/format rejection, EDUCATIONAL assignment source missing.

Paid API Called:
NO

GPU Used:
NO

Large Model Downloaded:
NO

Deployment:
NO

REPLIT CREDITS INTENTIONALLY CONSUMED:
NO — no paid workload initiated; actual Agent/platform billing was not audited.

STOP.
```

## AI CAPABILITY CLOSURE WAVE — 2026-10-11

**This addendum supersedes the implementation-status snapshot above; historical
benchmarks, pricing provenance and acceptance failures remain unchanged.**
No new provider, production selection change, model download, GPU, database
migration, paid-provider request or deployment was performed.

### Before → change → proof → remaining blocker

| Area | Before | Change | Proof | Remaining blocker |
|---|---|---|---|---|
| OpenAI final drain | Any arriving final could satisfy client stop | Track outstanding commit acknowledgements/items; order completed transcripts by acknowledged commit order; correlated `finalized(commitId)` only after all finals delivered | Local mock WebSocket verifies out-of-order completion, replay rejection, non-empty commits, ordered delivery and drain | Real OpenAI URL/session/credits/audio acceptance not verified |
| Web stop/retry | Hosted final wait uncorrelated; reconnect budget reset after each successful connection | OpenAI now uses correlated finalization; total reconnect cap of three per logical reader session | Web TypeScript PASS; stop predicate/source traced; existing cue tests PASS | Real mic/proxy/last-audio acceptance remains unverified |
| Native transcript | Raw fragments fed independently; partials could commit positions | Per-item text accumulation; provider event-ID dedupe; final replaces hypothesis; completed-item replay/late delta rejected; only finals permanently reveal words | Focused Native transcript test PASS | Provider messages without identity cannot distinguish identical legitimate deltas from replay; no acoustic accuracy claim |
| Native end | Ordinary commit then immediate close | Single-flight stop; await real asynchronous `AudioRecorder.stop()` while tail callback stays active; final commit ID; wait correlated drain; await client socket closure; persist only on successful stop | Async tail test verifies remaining PCM precedes final commit, wrong ACK ignored, final updates matcher, duplicate stop shares one promise | Physical recorder tail behavior and real iPhone unverified |
| Native failure/cancel | Limited start-time cleanup | Dispose aborts immediately; bounded 15s readiness/10s hosted drain/120s local drain/3s close wait; interval/listener/promise cleanup; final-send failure fails closed | Timeout, cancellation, startup/disposal and synchronous-send tests PASS | Device/network interruption acceptance remains pending |
| Native cues | Missing | Existing `react-native-audio-api` synthesizes lightweight start/mistake/correction/end tones; screen mute; readiness start; end after drain, close and successful server persistence; failures bounded/isolated | Native cue-policy tests + Native TypeScript PASS | **No authoritative Native educational-state producer is wired. Mistake/correction branches are implemented/tested, not claimed operational from ASR.** |
| Mistake authority | Hosted OpenAI implicitly eligible despite no acoustic acceptance | OpenAI delta/final events explicitly `confirmationEligible: false`, matching conservative local policy; matcher still tracks position; review candidates remain possible | Mock final asserts false; gateway preserves flag; Web engine eligibility gate inspected | No authoritative ASR grading; Speechmatics/NVIDIA educational acceptance unchanged |
| Concurrency | Repeated auth/parallel providers possible | Auth single-flight; one process-local provider lease per student across session IDs; ownership-safe release; closed-socket check after async authorization; Native double-start lock | Lease acquisition/retry/stale-owner tests PASS; start/controller source traced | **Process-local, not fleet-wide/distributed exclusion** |
| Abandonment/budget | No authenticated idle/lifetime enforcement | 120s no-audio/commit idle cap; 2h logical-session wall-clock cap from existing DB `startedAt`, not reset by reconnect; payload cap; release provider/lease on close/error/expiry | Finite-limit/lease tests; timer/expiry handlers inspected; server TypeScript PASS | Timer limits not exercised as a real 2h/device test; no monetary quota invented |

### Sound authority and completeness

Native uses existing state labels (`POSSIBLE_ERROR`, `CONFIRMED_ERROR`,
`CORRECTED`) as cue inputs, not a second grading state machine.
`observeWordState` requires explicit qualified authority before a confirmed-error
cue; possible/uncertain errors stay silent. It is deliberately **not called from
raw Native matcher confidence or mismatches**.

Start/end are wired into the actual Native route/controller/persistence path.
Confirmed/correction policy and tone generation exist, but there is no legitimate
Native producer of those educational transitions today. This requirement is
therefore **PARTIAL**, not an end-to-end confirmed-error sound PASS.
Mute is a screen/controller setting, not a new persistent cross-platform account
preference. No tone plays for every correct word.

The Web cue player/policy was not rewritten. Its 20 focused tests remain PASS.
Unvalidated OpenAI/local transcripts intentionally cannot trigger confirmed-error
tones; refusing false accusations takes priority over demonstrating a sound.

### Verification performed

- **27 distinct focused Node tests** passed across the initial focused run and
  the targeted post-fix passes: Native lifecycle/transcripts/flush/cues, OpenAI
  mock protocol/drain, process-local leases and unchanged mocked local-provider
  contracts. Initial cancellation-state regression was fixed and rechecked.
- **20 Web sound tests** passed. Total: **47 distinct focused tests**.
- Native TypeScript: **PASS**.
- Server TypeScript: **PASS**.
- Web TypeScript: **PASS**.
- `git diff --check`: **PASS**.
- API development workflow restarted **once**, with its one required service
  build. It bound port 8080 and attached `/api/ws/recitation`; no repeated
  repository builds, exports or whole-repository test suites.
- Public Expo preview screenshot rendered the expected splash. This is only
  startup/manifest evidence, **not signed-in recitation or an iPhone test**.
- Existing workflow startup may initialize the cached local model; no new
  inference benchmark or model download was initiated by this work.
- Live OpenAI acceptance: **NOT RUN**. Last saved observation remains
  credit exhaustion; current funded quota is unverified. No paid retry was made.
- Real iPhone: **UNVERIFIED**.

### Files changed for this wave

- `artifacts/api-server/src/recitationRealtime.ts`
- `artifacts/api-server/src/recitation-providers/{types.ts,OpenAiRealtimeProvider.ts,sessionLease.ts}`
- `artifacts/api-server/src/recitation-providers/{OpenAiFinalization.test.ts,sessionLease.test.ts}`
- `artifacts/mobile/lib/native-recitation{,-controller,-matcher,-feedback,-cues}.ts`
- `artifacts/mobile/app/student/recitation.tsx`
- `artifacts/mobile/tests/{native-recitation.test.ts,native-recitation-closure.test.ts}`
- `artifacts/tabyan/src/lib/recitation-ai/useOpenAiRealtimeTranscription.ts`
- `artifacts/tabyan/src/components/mushaf/MushafReader.tsx`

Speechmatics implementation/selection: **UNCHANGED**. NVIDIA: **BLOCKED,
UNCHANGED**. Local Quran Whisper adapter/model/selection: **UNCHANGED**, remains
development-only; its Native finalization consumer now respects the existing
drain contract. No migrations, data fixtures or direct database writes were
performed by the agent; normal application-user traffic is not an audit of
global database immutability.

### Closure verdict

**PARTIAL.** The source/protocol gaps in Native assembly, stop ordering and
single-process session ownership are closed with local evidence. Active
unvalidated providers are kept out of authoritative accusations. The actual
OpenAI microphone→gateway→transcript→Web matcher/UI chain, qualified Native
educational transitions, audible device cues and physical last-audio behavior
still require separate acceptance.

**Paid provider calls: 0. Repeated paid retries: NO. GPU: NO. Large model
download: NO. Deployment: NO.**
**REPLIT CREDITS INTENTIONALLY CONSUMED: NO paid workload initiated; actual
Agent/platform billing was not audited.**
