# Tabyan Local Tarteel Whisper — Live Mushaf Acceptance

**Date:** 2026-10-14  
**Final classification:** `BLOCKED_BY_MATCHER`

## Scope and safeguards

This acceptance used the authenticated Web Mushaf and the local Tarteel Whisper
worker in development. No remote ASR provider, paid API, external audio download,
database change, deployment, or production-provider change was made. Production
remains on OpenAI. No microphone audio file was saved.

The earlier
[`TABYAN_LOCAL_TARTEEL_REAL_ACCEPTANCE.md`](./TABYAN_LOCAL_TARTEEL_REAL_ACCEPTANCE.md)
still describes the separate file-based test; no eligible audio file was added.

## Live-session evidence

Eight sessions have a complete close/end sequence in the API logs:

| Session | Model input windows | Inference time per window | Close evidence |
| --- | --- | --- | --- |
| A | 10s, 10s, 10s, 5.493s final remainder | 3188, 3720, 2413, 2102ms | `receivedFinal=true`, 4 completed events, 0 dropped chunks; `recitation.end` returned 200 |
| B | 1.500s final remainder | 2619ms | `receivedFinal=true`, 1 completed event, 0 dropped chunks; `recitation.end` returned 200 |
| C | 10s, 10s, 4.080s final remainder | 3164, 1800, 1791ms | `receivedFinal=true`, 3 completed events, 0 dropped chunks; `recitation.end` returned 200 |
| D | 10s, 10s, 5.531s final remainder | 4259, 2244, 4047ms | 3 completed events, 0 dropped chunks; WebSocket closed and `recitation.end` returned 200 |
| E | 10s, 8.699s final remainder | 2414, 1560ms | 2 completed events, 0 dropped chunks; WebSocket closed and `recitation.end` returned 200 |
| F | 10s, 10s, 10s, 2.629s final remainder | 2960, 2054, 2509, 1782ms | 4 completed events, 0 dropped chunks; final commit acknowledged, audio/socket closed, `recitation.end` returned 200 |
| G | 10s × 16, 2.288s final remainder | 3575, 3444, 2197, 4360, 3768, 3862, 3221, 3520, 3454, 3072, 3844, 3053, 3102, 1490, 3169, 4404, 1938ms | 17 completed events, 0 dropped chunks; final commit acknowledged, audio/socket closed, `recitation.end` returned 200 |
| H | 10s, 5.184s final remainder | 3661, 1525ms | 2 completed events, 0 dropped chunks; final commit acknowledged, audio/socket closed, `recitation.end` returned 200 |

These are authenticated real-microphone Mushaf sessions, not file fixtures.
They confirm that finalization waited for local inference, including short
remainders, before the clean session-end requests. Session A also has a browser
position/reveal update after its final decode: stable position `1:5`, word 4,
confidence 74; matcher 1ms and render 24ms. Session C’s 4.080s remainder reached
the worker and emitted a final event, but its exact text-to-matcher result is
not present in the old logs.

A later 10s decode took 3229ms in a paused session. Its WebSocket closed with
zero dropped chunks, but no matching `recitation.end` request appears in the
available logs. It is excluded from the clean-stop evidence and was not stopped
or altered by this acceptance.

Another session began before the API restart completed. The restart overlapped
that active session: the browser scheduled reconnects and tried the WebSocket
again, but no clean `recitation.end` was recorded. This attempt is not evidence
for final-flush acceptance.

## Transcript and matcher findings

The original no-match in the older session remains unknown because its logs
omitted transcript text. A separate, interrupted pre-restart attempt did record
four new no-match events in the expected range `1:1-7`; all had confidence
10–14 and committed no position. Their client-side raw/normalized outputs were:

| Client completion | Raw transcript | Normalized transcript |
| --- | --- | --- |
| 1 | `بِسْمِهِ فَمَا فَقِدُوا كَمَا يَسْرَكُ سَبَقِ زَبْقًا` | `بسمه فما فقدوا كما يسرك سبق زبقا` |
| 2 | `زَبْغَكُمْ وَصْرَكُمْ وَصْرَكْ بَلْغِي أَفَحَقِّهَا الْوَدَى أَخْرُكُمْ شَيَابَ الْكِسْطِيرِ ذِرْ` | `زبغكم وصركم وصرك بلغي افحقها الودي اخركم شياب الكسطير ذر` |
| 3 | `اسْتَوْكِ اسْتَوْكِ اسْتَوْكِ اسْتَوْكِ ذِرَةٌ فَسَبَّسَ وَالْمُسْلِمُ` | `استوك استوك استوك استوك ذرة فسبس والمسلم` |
| 4 | `سَبَلًا وَصَدَّ صَبِّ السَّبِيلِ بِالسَّبِّيلِ` | `سبلا وصد صب السبيل بالسبيل` |

These outputs explain why those four events were rejected: their tokens did not
align with the expected range. They do **not** establish what was spoken. No
reference audio was retained, so the upstream cause (recognition error, spoken
content, or capture conditions) remains unknown. They are not evidence of a
matcher false positive.

Development-only diagnostics have now been added:

- The local provider logs a decode sequence, input-window duration, inference
  duration, raw model transcript, and emitted (overlap-filtered) transcript.
- The Web client logs the emitted raw/normalized transcript and sequence.
- The Mushaf logs matcher input, match/no-match outcome, confidence, and the
  committed canonical position.
- Text diagnostics are gated to development and the Tarteel trial. Audio is
  not logged or persisted.

The Web client hot-reloaded the diagnostics. The API workflow restarted
successfully; the local model warmed at 14:46:46. An earlier post-restart
Mushaf attempt produced two sequence-correlated 10s windows before being paused:

| Sequence | Model output / emitted text | Inference | Matcher result |
| --- | --- | --- | --- |
| 1 | `بِسْمِ اللَّهِ وَالطُّورِ` / same | 3948ms | Stable match, confidence 70; committed only through `1:1` word 2 |
| 2 | `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ وَالْمُسْلِمُ` / overlap-filtered `الرَّحْمَنِ الرَّحِيمِ وَالْمُسْلِمُ` | 3044ms | No match, confidence 54; stayed at `1:1` word 2 |

Sequence 2's emitted text begins with the expected remaining words
`الرحمن الرحيم` but also includes `المسلم`. Its confidence was below the
matcher’s 68% threshold, so it did not advance. This may be an under-advance
case, but does not establish a matcher defect without audio ground truth.
Sequence 1 committed only the shared opening words and did not advance through
`والطور`.

The API logged the client WebSocket closing at 14:51:12 with two completed
provider events and zero dropped chunks. In this logger, `receivedFinal=true`
means at least one final transcript event occurred; it does not prove that the
remaining audio tail was flushed. No `recitation.end` request or third
remainder decode is recorded. The session had forwarded about 25.8s of audio;
after the second window covered audio through 18s, roughly 7.8s of new audio
still lacked a recorded decode. The close occurred about 123s after the UI
pause, consistent with the server's 120s idle timeout. The browser continued to
report a paused session and live microphone track until its Vite connection was
lost; forwarded-audio count stayed unchanged after pause. Local microphone
release was later confirmed by the user (the Mushaf microphone indicator was
off). This confirms local capture release, but does not supply the missing
server-side `recitation.end` or final-tail decode evidence.

## Latency and memory

### Controlled clean-end session D

The UI was tracking `1:1-7` (Al-Fatiha). The canonical text loaded from the
local Mushaf word corpus for that range was:

> بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ مَـٰلِكِ يَوْمِ ٱلدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ

| Sequence | Raw model transcript → emitted / normalized matcher input | Matcher result |
| --- | --- | --- |
| 1 | `مِسْمِهِ فَادْخُلْتُمْ حَلَمٌ ذَكَّرَ` → same / `مسمه فادخلتم حلم ذكر` | No match, confidence 10; no committed position |
| 2 | `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ` → same / `بسم الله الرحمن الرحيم` | Stable match, confidence 88; committed through `1:1` word 4 |
| 3 | `فَاسْتَجَبَّتْ سُتَّبَةً سَتَّبَتْ سُتَّبَةً سَبِيلًا مِنْهُمْ سُبُرُونَ وَالْمُؤْمِنِينَ` → `سُتَّبَةً سَتَّبَتْ سُتَّبَةً سَبِيلًا مِنْهُمْ سُبُرُونَ وَالْمُؤْمِنِينَ` / `ستبة ستبت ستبة سبيلا منهم سبرون والمؤمنين` | No match, confidence 10; position remained `1:1` word 4 |

The matcher threshold is 68%; sequences 1 and 3 scored 10 and therefore did not
advance. Sequence 2 aligns with the first four canonical words, showing a
correct stable match on the same matcher. The user confirmed that Al-Fatiha was
recited in session D. Therefore the root cause for D's sequences 1 and 3 is
proven to be `ASR_ERROR`: their transcripts diverge from the known recitation,
while sequence 2 correctly recognizes its opening words. The matcher rejected
the low-scoring outputs as designed; this is not evidence of a matcher defect
or a false positive.

Sequence 3 was a 5.531s remainder starting at 16s. Since the provider's
automatic windows are 10s with 2s overlap, this remainder could only be decoded
by the explicit final commit. The worker emitted its final transcript at
20:00:45.632; the WebSocket then closed at 20:00:48 with 3 completed provider
events, zero errors, and zero dropped chunks. `POST /api/trpc/recitation.end`
returned 200. This proves the final tail reached local inference before the
explicit server-side session end; it does not establish the spoken contents of
that tail.

A later session E in the same UI range produced two events: raw/emitted
`بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ وَالْمُؤْمِنِينَ` (normalized
`بسم الله الرحمن الرحيم والمؤمنين`) matched through `1:1` word 4 at confidence
72, without committing the extra token; the final remainder emitted only
`وَالْمُؤْمِنِينَ` (normalized `والمؤمنين`) and was rejected at confidence 10.
The user has not separately confirmed what was recited in E, so that run does
not independently establish its ASR root cause.

Session E's 8.699s remainder began at 8s and was decoded at 1560ms before the
WebSocket close and the 200 `recitation.end` response. It is a second explicit
final-tail pass, not an idle-timeout result.

Sessions F–H also completed explicit stops. F's 2.629s final remainder took
1.782s; G's 2.288s remainder took 1.938s; H's 5.184s remainder took 1.525s.
Each browser trace recorded one `TARTEEL_END_TAP`, then one PCM drain, final
commit/ack, clean socket/audio close, and saved session result. No second
end-handler invocation appeared, so these runs do not prove rapid double-tap
deduplication. The spoken samples in E–H were not separately confirmed.

Across the thirty-six clean-session inference windows, durations were
1490–4404ms; median inference time was 3087ms. The windows total 315.404s of
model input, including overlap, against 105.285s of inference time
(windowed RTF 0.334). Session D's 5.531s final remainder took 4.047s; session
E's 8.699s remainder took 1.560s; session F's 2.629s remainder took 1.782s;
session G's 2.288s remainder took 1.938s; session H's 5.184s remainder took
1.525s.

The user-facing end-to-end p50/p95 is **not available**: seven matcher/render
observations are too few and have `totalMs=null` (matcher/render: 1/24ms,
3/22ms, 3/22315ms, 16/29ms, 18/35ms, 4/39ms, and 2/268ms). The 22.315s render
observation is an outlier, not a reliable percentile. No p95 is reported.

Observed worker peak RSS was 389,620 KB (about 380 MiB) across these single
worker sessions. Two- and four-session concurrent memory/latency were not
tested. The worker is shared and queues inference, so memory must not be
projected linearly; concurrency safety remains unproven.

## Duplicate-stop and chunk-size checks

All eight clean sessions A–H show one finalization/end sequence each. Sessions
D–H each produced one final remainder inference/transcript event and one
`/recitation.end` response; none showed a duplicate final flush. F–H each
recorded only one `TARTEEL_END_TAP`; no second handler call is evidenced. The
separate paused attempt ended by idle timeout and is excluded.
The focused Web lifecycle suite passes 11/11, including its shared-action
double-end case; this is code-level evidence, not proof of two live taps.

The current 10s model window remains unchanged. A later controlled comparison
should test only 5s, 7.5s, and 10s windows on the same authorized recitation and
environment; no broad benchmark was run.

## Verification and remaining gate

- Web typecheck: passed.
- Web production build: passed with the artifact’s configured `PORT` and
  `BASE_PATH`; Vite emitted non-fatal source-map/dynamic-import warnings.
- API typecheck: passed.
- API build: passed.
- Tarteel provider tests: 5/5 passed, including short-tail finalization,
  duplicate flush suppression, and failure not acknowledging finalization.
- Web session audio lifecycle tests: 11/11 passed, including concurrent
  double-end calls sharing one finalization action.
- Development-only Tarteel stop traces now expose stop taps/in-flight dedupe,
  PCM flush, final commit/ack, clean socket/audio release, and session-end
  result; they do not log audio. Web workflow restarted successfully.
- Authenticated Mushaf telemetry confirms the live path was exercised. Visual
  screenshot verification remains `REAL_UI_PENDING` because the available
  screenshot browser cannot sign in.
- The API workflow restarted successfully, and the new diagnostics captured
  sequence-correlated raw/emitted text and matcher outcomes.
- Session D captured all three raw/emitted and normalized transcripts. The
  user confirmed Al-Fatiha; sequences 1 and 3 are proven ASR errors, while
  sequence 2 matched the first four canonical words at confidence 88.
- Session E captured two more transcripts and one stable prefix match. Its
  spoken sample was not separately confirmed.
- Sessions D and E both processed their final remainders, closed the socket
  with no dropped chunks, and received HTTP 200 from `/api/trpc/recitation.end`.
- Sessions F–H also processed their final remainders, acknowledged the final
  commit, released audio and socket cleanly, and received HTTP 200 from
  `/api/trpc/recitation.end`.
- F–H each logged one end-handler invocation only; no rapid two-tap event
  reached the handler, so live double-stop remains unverified.

## Final checklist

- Matcher cause: `PROVEN — ASR_ERROR` for user-confirmed Al-Fatiha in session D
- Raw transcript captured: `YES`
- Normalized transcript captured: `YES`
- Explicit `recitation.end`: `PASS` (sessions D–H, HTTP 200)
- Tail flush: `PASS` (5.531s, 8.699s, 2.629s, 2.288s, and 5.184s remainders decoded before end)
- Tail audio preserved: `PASS` (all five remainders reached local inference; audio itself was not stored)
- Double stop: `FAIL` (F–H each logged one end-handler invocation)
- Duplicate final flush: `NO` (one final remainder event in each session)
- Idle timeout used as acceptance: `NO`
- Final status: `BLOCKED_BY_MATCHER`

**Why `BLOCKED_BY_MATCHER`:** clean explicit finalization and tail processing
are now evidenced, but the user-confirmed Al-Fatiha still produced two ASR
errors at confidence 10. The matcher correctly accepted a stable canonical
prefix and rejected low-scoring text. A real rapid double-stop is also
unverified. Do not promote this beyond an experimental development trial. No
production change is authorized by this report.
