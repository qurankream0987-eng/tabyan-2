# Tabyan Web — Quran Experience + Tabyan AI Upgrade Report

Date: 2026-09-25 · Scope: **website only** (`artifacts/tabyan`) · Base commit: `3324f32`
Nothing was deployed, published or pushed.

> **Honesty rule applied throughout.** Everything below is split into what was *verified*
> (tests, production build, real headless-Chromium rendering) and what is only *implemented*.
> Anything that depends on a live microphone plus ASR provider was **not** exercised
> end-to-end in this environment. Doing that needs a real login, which would write
> recitation rows to the database. Those items are marked PARTIAL or
> REAL_AUDIO_VALIDATION_REQUIRED. Tarteel-level quality is **not** claimed.

---

## 1. Result block

```
WEB_ONLY_SCOPE_PRESERVED:   YES
MUSHAF_VISUAL_POLISH:       PASS
ORNAMENTATION:              PASS
SURAH_HEADER:               PASS   (Makki/Madani omitted — not in the canonical data source)
READER_CONTROLS:            PASS
RESPONSIVE_MUSHAF:          PASS
DARK_MODE:                  PASS
LIGHT_MODE:                 PASS
RTL:                        PASS
TABYAN_AI_PRIMARY_FLOW:     PARTIAL  (state machine unit-tested; UI rendered with fixtures; no live mic/provider run)
LIVE_FOLLOW_ALONG:          PARTIAL  (text-level deterministic suite passes; REAL_AUDIO_VALIDATION_REQUIRED)
QURAN_MATCHER:              PASS     (text-level: 13/13 scenarios; acoustic validation pending)
MISTAKE_DETECTION:          PARTIAL  (synthetic precision 0.925 / recall 0.987; REAL_AUDIO_VALIDATION_REQUIRED)
SELF_CORRECTION:            PASS     (text-level: correction recovery 1.0 scenarios / 0.944 synthetic)
STRICT_MODE:                PASS     (engine tests + live toggle in session settings)
TASHKEEL:                   EXPERIMENTAL
MEMORIZATION_MODE:          PASS
HIDE_REVEAL:                PASS
PEEK_SYSTEM:                PASS
TEST_MODE:                  PARTIAL  (self-assessment path verified end-to-end in browser; AI-driven path implemented, not run with live audio)
CUSTOM_RANGES:              PARTIAL  (surah/juz/page/ayahs/custom exact; hizb & rub' unavailable — no ayah-level data)
SESSION_HISTORY:            PARTIAL  (local-first per user/device; server persistence needs the proposed migration)
WEAKNESS_ENGINE:            PASS
SMART_REVIEW:               PASS
VOICE_QURAN_SEARCH:         PARTIAL  (search engine verified; voice capture path not run with live audio)
EXTERNAL_FOLLOW_MODE:       PARTIAL  (implemented; not run with live audio)
ADAPTIVE_VIEW:              NOT_STARTED (no trusted translation source in the project)
FALSE_POSITIVE_HANDLING:    PARTIAL  (hysteresis, audio gate, «ليست خطأ», telemetry; "missed error"/"late correction" need ground truth)

P50_LATENCY:  BENCHMARK_REQUIRED end-to-end. Matcher only (text-level): P50 0.031 ms (30-page synthetic benchmark), 0.047 ms (scenario matrix)
P95_LATENCY:  BENCHMARK_REQUIRED end-to-end. Matcher only (text-level): P95 0.093 ms (30-page synthetic benchmark), 0.241 ms (scenario matrix)
LOCATION_ACCURACY:   1.00 scenario matrix · 1.00 clean synthetic · 0.983 exact / 0.994 within ±1 word with ≈8 % labelled deviations (synthetic)
MISTAKE_PRECISION:   1.00 scenario matrix · 0.925 synthetic deviations
MISTAKE_RECALL:      1.00 scenario matrix · 0.987 synthetic deviations
FALSE_POSITIVE_RATE: 0 scenario matrix · 0 clean synthetic · 0.0015 per clean word with deviations

WEB_TYPESCRIPT:  PASS   (tsc --noEmit exit 0)
WEB_TESTS:       PASS   (21 files, 195 tests)
WEB_BUILD:       PASS   (vite build exit 0)
GIT_DIFF_CHECK:  PASS   (commits and task files)

QURAN_TEXT_CHANGED:           NO
QCF_MAPPING_CHANGED:          NO
NATIVE_FILES_CHANGED:         NO
AUTH_CHANGED:                 NO
VIDEO_ARCHITECTURE_CHANGED:   NO
PUBLISHING_CHANGED:           NO
PRODUCTION_DATA_CHANGED:      NO
PUSH_PERFORMED:               NO
DEPLOY_STARTED:               NO

FINAL_STATUS: ADVANCED_FEATURES_PARTIAL — web Quran experience upgraded; REAL_AUDIO_VALIDATION_REQUIRED for all live-AI claims
```

**About the metrics.** All accuracy and latency figures come from **text-level** runs. The input is
canonical Mushaf words turned into synthetic "ASR" token streams with labelled deviations,
fed word by word the way partials arrive. They measure the matcher and engine logic only, not
ASR accuracy, provider latency, network time or rendering. Real P50/P95 feedback latency needs
consented recordings and a live provider. The instrumentation for it already exists: the
developer overlay reports provider, transport, matcher, render and total percentiles.

---

## 2. Scope and safety

- **Commits touch only `artifacts/tabyan/**`** (55 files). None of them touch `artifacts/mobile/**`,
  `artifacts/api-server/**`, `lib/tabyan-trpc/**`, `lib/db/**` or `lib/design-tokens/**`.
- **Pre-existing dirty files were preserved and never staged.** That covers `.replit`, the api-server
  video files, all mobile files, the dirty web files (`App.tsx`, `index.css`, `PhoneField.tsx`,
  `ReviewVideoPlayer.tsx`, `SplashScreen.css`), `pnpm-lock.yaml` and the untracked user files.
  New reader styles went into a new `mushaf-reader.css` precisely so the user's uncommitted
  `index.css` hunk would not be mixed into a commit.
- **Byte-for-byte unchanged:** the Quran page data (`public/mushaf/pages`), the QCF fonts,
  `quran-words/pages` and its manifest, `fonts.ts`, `page-index.ts`, `types.ts`, `normalizer.ts`
  and `quran-data.ts`.
- **The only new Quran-derived asset is `search-index.json`.** It is generated from the canonical
  word data with the matcher's own normalizer, and tests verify its checksum and agreement with
  the source pages. All displayed Quran text still comes from the canonical data.
- **No `git reset`, `git clean`, forced checkout or push.**
- **The temporary QA harness was deleted after use and never committed.** It was a Vite-served
  page rendering the real components with fixture state.

---

## 3. Audit — current Web Mushaf (before changes)

| CURRENT_COMPONENT | PURPOSE | QUALITY | ISSUE | SAFE_TO_IMPROVE | RISK |
|---|---|---|---|---|---|
| `MushafReader` | Reader shell, gestures, sessions, AI wiring | Functional, very large | Paper forced light even in dark mode; many coupled flags; AI always hid verses | Yes (incremental) | High: central file; changed in small phases |
| `MushafPage` | QCF v2 line-geometry renderer | Excellent (canvas-fitted lines) | Ink/paper hard-coded | Colour only | Low if geometry untouched (kept) |
| `SurahHeaderFrame` | Ornamental surah header | Good | No canonical metadata | Yes | Low |
| `MushafControls` | Top bar + bottom pill | Adequate | No theme, desktop zoom, page arrows or progress; unlabelled primary | Yes | Low |
| Index / Search / Hide / Ayah sheets | Navigation, tools | Adequate | Stretched phone sheets on desktop; no dialog semantics; search could not search Quran text | Yes | Low |
| `RecitationSessionBar` | Live session controls | Crowded | Mixed technical and manual controls; retry hidden | Yes | Medium |
| `RecitationAiCanaryOverlay` | Diagnostics | Useful to developers | **Shown to all users** with raw latency/RMS numbers | Gate | Low |
| `RecitationSetupSheet` | Educational range setup | OK | Reachable only via educational repeat (fail-closed) | Left as is | — |
| `RecitationResultSheet` | Summary | Basic | No weakest positions, suggestion or formula | Yes | Low |
| `useAudioPlayer` (EveryAyah) | Trusted reciter audio | Good | No single-ayah replay | Additive | Low |
| Bookmarks (`MushafFahd`) | Page bookmarks in localStorage | OK | Page-level only | Presentation only | Avoided a duplicate system |

### Tabyan AI pipeline map (traced end-to-end)

| Stage | Implementation |
|---|---|
| MICROPHONE | `getUserMedia` (echoCancellation, noiseSuppression, AGC) in `useOpenAiRealtimeTranscription` |
| AUDIO_CAPTURE | AudioWorklet `tabyan-pcm24k`, 100 ms frames |
| AUDIO_ENCODING | PCM16 → base64 JSON frames |
| CHUNKING | `UtteranceSegmenter`: silence 700 ms, soft 4 s at a dip, hard 8 s |
| WEBSOCKET | `/api/ws/recitation`; auth plus server session in `listening` state |
| ASR_PROVIDER | Server-side (OpenAI / NVIDIA / Speechmatics via env); not modified |
| PARTIAL_TRANSCRIPT | Delta accumulation per `itemId` |
| FINAL_TRANSCRIPT | `isFinal` events; the per-item matcher state is released |
| QURAN_MATCHER | `QuranLiveMatcher`: bounded tail, semi-global weighted alignment over a local window, recovery mode |
| WORD_ALIGNMENT | match / substitution / skip / extra ops |
| CONFIDENCE | Alignment confidence; HIGH ≥ 0.86 commits, MEDIUM ≥ 0.68 provisional, LOW nothing |
| WORD_STATE | `RecitationStateEngine` (UNREAD … PEEKED) |
| UI_HIGHLIGHT | `word-presentation.ts`: paint-only, no geometry |
| SESSION_STORAGE | Server: `recitation_sessions` (metadata only). Now also local history (see §7) |

No working architecture was replaced. The changes are additive guards, a derived state layer and new consumers.

---

## 4. Delivered by phase (each verified before commit)

| Phase | Commit | Verification |
|---|---|---|
| A — Visual polish + ergonomics | `72480d7` | tsc, tests, build, 16-shot responsive matrix, sheets on mobile and desktop |
| B — AI flow, latency and matcher stability | `6539f72` | 20 phase/audio tests, 13 scenarios, benchmark A/B vs base, fixture screenshots |
| C — Mistake/correction states | `e632809` | engine + tashkeel tests, popover and summary screenshots |
| D — Memorization hide/reveal | `9b1dcb7` | hidden-marker geometry screenshot, sheet screenshots |
| E — Memorization test | `980589e` | 14 tests + full browser flow (tools → setup → question → hint → reveal → grade → skip → finish → result) |
| F — History, weakness, smart review | `7006b70` | 11 store/engine tests + browser: test recorded, «ليست خطأ» reclassification persisted |
| G — Text/voice search, external follow | `ad7b9ec` | 8 search tests (index checksum and consistency) + browser search → open position |
| Polish — audio bar and contrast | `00d2f9b` | final 16-shot matrix |

### Phase A — Mushaf visual and reader ergonomics (Parts 3–12, 53–59)
- **Theme tokens, reader-scoped.** Light mode: ivory paper `#fbf7ec`, burgundy controls, restrained gold. Dark mode: deep wine paper `#1f1216`, warm ivory ink (14.5:1), muted gold. Quran ink changes by CSS colour only.
- **Page frame, generated SVG.** 8-fold rosettes, a double rule, medallions and rhythmic diamonds.
  - Desktop (aspect mode): drawn *outside* the page in a reserved 18 px gutter.
  - Phones: a hairline inside the 3 % side margin only, so the readable area is not reduced.
- **Surah header** now shows canonical «ترتيبها» and «آياتها» (hidden when too narrow). Makki/Madani is omitted because the data source doesn't have it.
- **Bismillah** gets side flourishes in container-query cells that collapse when space is tight. Its text and injection logic are unchanged, and At-Tawbah still has none (verified on page 187).
- **Controls.** A calm top bar: the title opens the index, plus search, theme switch, desktop zoom and a thin surah-progress line. The floating dock has one primary action, «ابدأ التلاوة» (labelled from 400 px).
  - Desktop page arrows are placed correctly for RTL (next page on the left).
  - Chrome space is reserved whenever line spacing stays ≥ 34 px, so tools never cover a Quran line. Very short screens (such as 320×568) keep the auto-hiding overlay.
- **`ReaderSheet`.**
  - Phones: a bottom sheet.
  - ≥ 1024 px: a side panel, with the Mushaf staying centred.
  - Always a real dialog, with Escape, focus return and tab roles.
- **Page transitions.** 170 ms fade with a 10 px shift; glyph geometry never animates. Reduced motion is respected everywhere.
- **Fixes along the way.** Widths of 768–803 px fell into phone mode once the gutter was subtracted (fixed, with a test). A shared dark-mode store keeps every theme switch in sync.

### Phase B — Primary AI flow and stability (Parts 13–16, 41–44, 47)
- **One derived phase** (`deriveAiPhase`): IDLE · REQUESTING_MIC · PREPARING · LISTENING · PROCESSING · PAUSED · RECONNECTING · ERROR · COMPLETED. It's computed from the server session phase plus transport state and replaces conflicting booleans. Labels: «ابدأ التلاوة» / «يستمع الآن».
- **Mic feedback under 100 ms.** The primary button switches to «يستعد…» before any network call. Session-start failures now show a message; previously they were an unhandled rejection.
- **Typed transport failures** with bounded auto-reconnect (0.8 s, then 2.5 s) that keeps the matcher position. Mic, server and paused cases never retry.
- **Bug fixed:** `cancel()` left the transport in a stale `failed` state after a normal close.
- **Audio quality gate** with hysteresis: low volume, clipping, persistent noise. Unreliable audio blocks mistake *confirmation*, never tracking. Detecting competing voices is **not** claimed (energy data alone can't support it).
- **Matcher fix, found by the new scenario suite.** Restarting an ayah whose opening words also start a nearby ayah (Al-Mulk 67:2 and 67:3, «الذي خلق») used to commit a false forward jump. The guard is limited to ayah starts; an A/B against the base benchmark shows no regression (precision 0.925 → 0.925, false-positive rate 0.0015 → 0.0015).
- **New session bar:** status text plus dot (never colour alone), mode, timer, hint, pause, settings, finish. Session settings include an in-sheet cancel confirmation (no `window.confirm`). The developer overlay is gated to DEV or `localStorage["tabyan.ai.devtools"]="1"`.
- **Performance.** The diagnostics timer ran every second even when idle, re-rendering the reader; it now runs only during live sessions.

### Phase C — Mistakes and corrections (Parts 17–21, 46, 48–49)
- **Mistake popover** on marked words:
  - the expected word as canonical Uthmani text
  - status and kind
  - «ليست خطأ» reclassification, audited and counted as a false-flag metric
  - single-ayah replay from the configured EveryAyah source, disabled while the mic is live; no TTS
- **Word visuals** harmonise with the ink:
  - CORRECT: faint tint
  - CURRENT: gold/burgundy focus
  - POSSIBLE: amber dotted underline
  - CONFIRMED: burgundy solid underline
  - CORRECTED: faint double line (historical)
  - PEEKED: dashed gold
  - SKIPPED: wavy

  Each state has a distinct pattern, and all of it is paint-only.
- **Session summary.** Duration, ayahs actually covered, words, mistakes, corrected, hints, accuracy with the formula shown, weakest positions, and a deterministic review suggestion.
- **Tashkeel: EXPERIMENTAL.** It measures whether the provider returns diacritics at all, and the comparison is conservative. With today's undiacritized ASR output it honestly reports "insufficient", and it never marks a word.

### Phase D — Memorization (Parts 22–24)
- «ابدأ التلاوة» is now true follow-along with visible verses.
- The «الحفظ» sheet offers إظهار / إخفاء الآيات and «إخفاء علامات الآيات» (memorization only), plus the old self-review modes that don't use the microphone. Both options can be switched live.
- Hiding is opacity only, so line geometry is unchanged (verified visually with markers hidden).
- The graduated peek (one word → several words → rest of the ayah) is recorded separately from mistakes.

### Phase E — Memorization test (Parts 25–27)
- Flow: cue → hidden continuation → live reveal → progress → outcome → result.
- **Scopes:**
  - Surah, page, ayah range and cross-surah custom range are exact.
  - Juz is exact because every Madani juz begins at a page top.
  - Hizb and rub' are shown disabled with the reason; see §8.
- **Settings:** question count, length (1–3 ayahs), cue words, show location, hide ayah markers, sound cue, temporary session.
- **During a question** only the cue and revealed words are visible. Headers and the title are masked until «إظهار الموضع», and swipes, search and the ayah menu are disabled so the answer can't leak.
- **Without AI** the test runs as explicit self-assessment. A «أصبت» after a hint counts as «صحيح بتلميح», not mastery.
- **Bug fixed during browser QA:** a skipped question was lost because state updates were lazy; updates are now synchronous.

### Phase F — History, weakness, smart review (Parts 28–31, 36)
- **Local history per user** (keyed by `auth.me` id, demo isolated) and linked to the server session id. It stores positions and counts only: no audio, no transcript, no heard words (tested).
- **Mistakes can be viewed** by session, surah, ayah and status. «ليست خطأ» reclassifies, keeping the previous status and a timestamp, and never deletes.
- **Weakness score:** `3×confirmed + 1.5×corrected + 1×hints + 2×failed reviews − 1.5×successful reviews`, plus bounded staleness for weak ayahs only. Every term is shown to the user as a reason.
- **Smart review** draws only on real history; an empty history gives no suggestions. It covers أضعف مواضعي / مراجعة اليوم (expanding intervals 1–3–7–14–30–60 days) / مواضع كثيرة الأخطاء / لم أراجعها منذ مدة / تهيئة سريعة, each with open and test actions.
- The ayah menu adds «أخطائي في هذه الآية».

### Phase G — Search and follow (Parts 32–33, 37)
- **Text search** over the whole Quran through a generated index: about 846 KB raw, 223 KB gzip, lazy-loaded.
  - Candidates come from an inverted index with fuzzy fallback for ASR spellings, then weighted phrase alignment that may cross ayahs.
  - Unrelated speech returns nothing, and refrains are listed in canonical order.
  - Results show canonical Uthmani text, with «فتح الموضع» and «ابدأ المتابعة من هنا».
- **«ابحث بالتلاوة»:** a short live transcription with throttled live results that auto-stops after 12 s. Its helper recitation session is **cancelled** afterwards, so it is not saved as a recitation, but it does create a `cancelled` row in `recitation_sessions` each time it is used.
- **«متابعة قارئ»:** follows an imam, teacher or recording with the mistake engine disabled, and is not recorded as the user's recitation.

---

## 5. Visual QA (real headless Chromium, local screenshots)

These were driven by a small CDP script with real waits; `--virtual-time-budget` was rejected because it fast-forwards font loading.

| Widths | Themes | Checks | Result |
|---|---|---|---|
| 320, 375, 390, 430, 768, 1024, 1280, 1440 | light + dark | horizontal overflow, overflowing lines, clipped QCF words, console errors, dock/page overlap | **All pass** (the 320×568 overlay mode is by design) |

- **Also rendered and reviewed:**
  - special pages 2, 187 (At-Tawbah, no Bismillah) and 604 (three surah headers)
  - index and search as a desktop side panel and as mobile bottom sheets
  - «الحفظ» sheet, tools sheet
  - memorization test (every step) and test result
  - history (review, sessions and mistakes tabs)
  - audio bar
  - fixture renders of the session bar in LISTENING, ERROR, RECONNECTING and strict-hold states, the settings sheet, the popover, the summary, and hidden memorization with and without markers
- **Contrast (WCAG):**
  - Quran ink on paper: 16.3:1 light, 14.5:1 dark.
  - Muted UI text was raised from 3.9:1 to 5.3:1.
  - The amber hint text is 6.2 / 9.8:1.
  - Error text is 7.7 / 7.9:1.
- **Not visually verifiable here:**
  - live microphone permission prompts
  - real provider transcripts
  - EveryAyah audio playback (the sandbox has no outbound network, so the player showed its own error state, which was restyled)

---

## 6. Performance notes (Part 60)
- The matcher never scans the whole Quran per token: it uses a bounded 24-token tail over a local window. The synthetic worst case was 13 ms, P95 < 0.1 ms. Search uses an inverted index built once.
- `MushafPage` is memoised, and word feedback is paint-only (no layout).
- Diagnostics no longer re-render the reader every second when idle.
- Ornaments are one small SVG per page, with no filters or images. Transitions use transform and opacity only.

---

## 7. Data model — additive migration (**design only, NOT applied**)

The server stores session metadata only. To move word-level history server-side (for multi-device use and teacher visibility), this is proposed:

```sql
-- Additive only. No audio or transcript columns by design.
CREATE TABLE recitation_session_results (
  session_id          varchar(36) PRIMARY KEY REFERENCES recitation_sessions(id) ON DELETE CASCADE,
  kind                varchar(20) NOT NULL,          -- tilawa | hifz | test | follow
  words_assessed      integer     NOT NULL DEFAULT 0,
  confirmed_mistakes  integer     NOT NULL DEFAULT 0,
  corrected_mistakes  integer     NOT NULL DEFAULT 0,
  hints               integer     NOT NULL DEFAULT 0,
  accuracy_percent    integer     NULL,
  test_score_percent  integer     NULL,
  engine_version      varchar(40) NOT NULL,
  created_at          timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE recitation_word_events (
  id               varchar(36) PRIMARY KEY,
  session_id       varchar(36) NOT NULL REFERENCES recitation_sessions(id) ON DELETE CASCADE,
  user_id          varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verse_key        varchar(16) NOT NULL,
  word_position    integer     NOT NULL,
  kind             varchar(20) NOT NULL,             -- WRONG_WORD | OMISSION | SKIP | ...
  status           varchar(12) NOT NULL,             -- confirmed | corrected | dismissed
  previous_status  varchar(12) NULL,
  reclassified_at  timestamp   NULL,
  created_at       timestamp   NOT NULL DEFAULT now()
);
CREATE INDEX recitation_word_events_user_verse_idx ON recitation_word_events (user_id, verse_key);
CREATE INDEX recitation_word_events_session_idx    ON recitation_word_events (session_id);
```

Follow-up work, not done: tRPC `recordResults` / `markNotMistake`, with owner checks mirroring `assertTeacherStudentLink` for teacher reads.

---

## 8. Not done, deliberately (with reasons)

| Item | Status | Reason |
|---|---|---|
| Translation / tafsir panel (Parts 35, 36) | Not built | No trusted translation or tafsir source in the project; nothing fabricated |
| Adaptive view (Part 34) | NOT_STARTED | Its value depends on translation, which is missing; Arabic live tracking already works on the Mushaf |
| Tajweed colours (Part 51) | Not built | No trusted tajweed annotation data; not faked |
| AI Tajweed scoring (Part 52) | Research track only | Needs audio ground truth, qualified annotation, precision/recall and false-positive testing |
| Optional recitation recording (Part 45) | Not built; retention stays **off** | Needs a consent flow, private storage, a delete action and a storage policy on the backend |
| Hizb / rub' test scopes | Disabled in the UI with the reason | Only a per-page hizb number exists, and boundaries fall mid-page |
| Ayah-level bookmarks (Part 38) | Not added | Would create a second bookmark system next to the page bookmarks |
| Goals (Part 40) | Not connected | No fake progress; needs a product decision on the existing progress data |
| Competing-voice detection (Part 41) | Not claimed | Not reliably detectable from energy alone |
| "missed error" / "late correction" telemetry (Part 42) | Not instrumented | Needs ground truth; wrong flags (dismissals), lost position, blocked wrong jumps and reconnects are instrumented |
| `RecitationSetupSheet` restyle | Kept as is | Reachable only via the fail-closed educational path |

---

## 9. Required next validation (before any quality claim)
1. Consented real recitations (several reciters, speeds, noise levels, mobile and desktop microphones), with word-level ground truth from qualified teachers.
2. Measure end-to-end P50/P95 (speech → committed word) through the existing overlay instrumentation, per provider.
3. Recompute location accuracy, mistake precision/recall and false-positive rate on real audio. Tune `confirmAfterWords`, the confidence tiers and the audio-quality thresholds from that evidence.
4. Exercise the live paths: memorization test in AI mode, voice search, follow mode and reconnect.

---

## 10. Commits (not pushed)

```
00d2f9b style(mushaf): align audio bar with reader chrome and raise text contrast
ad7b9ec feat(recitation-ai): add Quran text and voice search with external follow
7006b70 feat(recitation-ai): add session history, weakness engine and smart review
980589e feat(recitation-ai): add memorization testing workflow
9b1dcb7 feat(mushaf): add memorization hide and reveal
e632809 feat(recitation-ai): add correction-aware mistake states
6539f72 feat(recitation-ai): stabilize live Quran follow-along
72480d7 style(mushaf): refine premium Quran reader experience
```

## 11. Files changed (55, all under `artifacts/tabyan/`)

New: `components/mushaf/{MushafPageFrame, ReaderSheet, ReaderToolsSheet, RecitationSessionSettingsSheet, MistakePopover, MemorizeSheet, MemorizationTestSetupSheet, MemorizationTestBar, MemorizationTestResultSheet, RecitationHistorySheet}.tsx`, `components/mushaf/useMemorizationTestRunner.ts(+test)`, `components/mushaf/mushaf-reader.css`, `lib/recitation-ai/{aiSessionPhase(+test), audioQuality, tashkeel(+test), memorizationTest(+test), recitationHistoryStore, weaknessEngine(+test), quranSearch(+test), recitationScenarios.test}.ts`, `lib/mushaf/progress(+test).ts`, `lib/theme-preference.ts`, `scripts/build-quran-search-index.mjs`, `public/mushaf/quran-words/search-index.json`.

Modified: `MushafReader`, `MushafPage`, `MushafControls`, `SurahHeaderFrame`, `MushafIndexSheet`, `MushafSearchSheet`, `AyahActionSheet`, `MushafAudioBar`, `RecitationSessionBar`, `RecitationResultSheet`, `RecitationAiCanaryOverlay`, `RecitationSetupSheet` (type only), `app/AppHeader` (shared theme store), `lib/mushaf/{pages, word-presentation(+test), useAudioPlayer, recitation-ai-indicator}`, `lib/recitation-ai/{QuranLiveMatcher, recitationStateEngine(+test), recitationPreferences, useOpenAiRealtimeTranscription}`.

Removed: `components/mushaf/MushafHideModeSheet.tsx` (merged into «الحفظ»).
