# Tabyan–Tarteel Full Quran Parity Master Plan

**Plan date:** 2026-10-07  
**Status:** Research and sequencing only; no implementation authorized by this document.  
**Baseline:** [`TABYAN_TARTEEL_CURRENT_FEATURE_MATRIX.md`](./TABYAN_TARTEEL_CURRENT_FEATURE_MATRIX.md) — 68 scoped groups, with current behavior, status, gaps, dependencies, layer and priority.

## 1. Objective and fixed boundaries

Build a Tabyan Quran experience that is functionally comparable to current publicly documented Tarteel features where those features fit Tabyan, without cloning Tarteel. Keep Tabyan's brand, visual identity, current QCF Mushaf, Quran text, educational system and teacher/student architecture.

This is a roadmap, not permission to change code, data, provider, policy, database, authentication or deployment. Each implementation wave needs its own approved scope. The existing detailed recitation roadmap remains the source for its previously specified regression boundaries: [`TABYAN_TARTEEL_FEATURE_RESTORATION_WAVES.md`](./TABYAN_TARTEEL_FEATURE_RESTORATION_WAVES.md).

Non-negotiable constraints:

1. **Preserve Quran/QCF integrity.** Do not rewrite the canonical text, glyph data, page mapping or current Web Mushaf layout to obtain a feature match.
2. **Keep modes separate.** READ, RECITE, LISTEN and TEST have different semantics. GENERAL recitation remains open-ended and ends explicitly; EDUCATIONAL recitation remains fail-closed unless the server can supply an authoritative assignment and range.
3. **Do not overstate recognition.** Provider confidence is not an educational score. A raw transcript mismatch is not a confirmed mistake. Tashkeel recognition stays blocked until independently proven.
4. **No audio by default.** Do not store recitation audio or transcripts merely because a microphone or transcription provider is active. Recordings require a separate approved purpose, consent, access and retention contract.
5. **Keep provider-independent product design.** Do not change the current OpenAI provider or make product features depend on Tarteel API access. The 2025 public API answer is historical evidence, not a permanent assertion that no later/private API exists.
6. **Use independent, legally usable data and assets.** Do not copy Tarteel source, UI, artwork, branding, audio or proprietary datasets.
7. **Do not imply platform parity.** Current QCF reader evidence is Web-specific. Native Mushaf and real-device audio behavior require their own acceptance proof.
8. **No database migration by assumption.** First compare the approved contract with existing schema. Add or change persistence only when the feature requires it, data ownership/retention are settled, and the change is explicitly approved.

## 2. Priority and sequencing rules

- **P0 — correctness, privacy or trust boundary:** failures can falsely mark learning, expose sensitive data, break core reading or make a session result untrustworthy.
- **P1 — core Quran experience:** reading, following, search and test behaviors needed for a coherent daily Quran workflow.
- **P2 — educational continuity:** durable student progress, teacher assignment/review, history and goal integration.
- **P3 — optional enrichment:** new datasets, alternative presentations, analytics, social or motivational features.

Priority describes impact, not authorization or immediate implementation order. A P0 feature with an unresolved gate remains blocked. Do not start a later wave simply because a prior wave is large; satisfy its entry conditions first.

## 3. Dependency map

```text
Approved privacy + retention + consent
  └─> any stored audio, transcript, or shared mistake evidence

Canonical QCF text + stable matcher + device/provider evidence
  └─> confirmed mistakes, test scoring, reliable review signals

Server-owned assignment + authorization + teacher/student linkage
  └─> EDUCATIONAL mode, assigned-range completion, memorization authority,
      pre-halaqa reports, teacher review and teacher-aware recommendations

Licensed/verified Quran data + integrity tests
  └─> translations, Tafsir, Tajweed colors, mutashabihat, adaptive/layout variants

Defined event and goal contracts + actual persisted activity
  └─> Today's Goals, schedules, streaks, analytics, heatmaps and group metrics

Audio-source rights + storage lifecycle + device acceptance
  └─> offline downloads and any Native-specific playback claims
```

The dependency map is directional. A UI surface does not satisfy the underlying evidence, authority, rights or retention dependency.

## 4. Waves

The numbered sequence below follows the supplied specification's Waves 0–10. Readiness gates are prerequisites, not a renumbered Wave 0. Each feature group has one primary wave; #63, #67 and #68 are cross-wave requirements.

### Pre-wave readiness gates — apply before the affected work

| Gate | Feature groups affected | Required decision/evidence |
|---|---|---|
| Recitation privacy | #13, #67 | Decide whether Quran audio/transcripts are collected, for what purpose, who can access them, consent and opt-out, transmission, retention and deletion. No recording work or silent storage without approval. |
| Tashkeel and Tajweed | #7, #52 | Evaluate diacritic recognition separately from word matching; source a verified Tajweed dataset and define glyph-safe acceptance. Keep #7 and #52 blocked until their separate evidence gates pass. |
| Educational authority | #26, #41–43 | Identify a server-owned assignment source, student/teacher authorization, expected-range derivation and completion meaning. Otherwise EDUCATIONAL remains fail-closed. |
| Data and licensing | #29–31, #47–49, #52–54 | Verify rights, source/version, canonical alignment, offline rights and integrity tests before adopting Quran-adjacent text, audio, Tajweed, mutashabihat or alternate layouts. |
| Minors and community | #61 | Decide audience, visibility, opt-in, role access and safety controls before group metrics or competition. No public-by-default student leaderboards. |
| Product independence | #63, #68 | Keep Arabic-first Tabyan UX, current QCF visual authority, and independent code, assets, data and branding. Tarteel evidence informs behavior only; it is not a design or asset source. |

The Tarteel privacy snapshot is not a Tabyan policy source. These gates do not authorize policy publication, schema changes, provider changes or production work.

### Wave 0 — Runtime, provider and session reliability

**Purpose:** Establish reliable lifecycle and failure behavior before adding or expanding recitation features.

**Feature groups:** #65–66.

**Work:** Verify session startup, ready state, timeout, disconnect, cancellation, provider failure, reconnect and explicit resume for existing paths. Preserve the server-side provider boundary; do not replace the provider, add a Tarteel API dependency, or log/store audio or transcripts as a debugging shortcut.

**Acceptance:** Session state transitions are deterministic; disconnects cannot fabricate a match, completed test or successful result; retry/cancel behavior is idempotent; logs contain only approved, non-sensitive diagnostics. Provider readiness must reflect the provider's actual ready event, not merely an open socket.

**Dependencies:** Existing provider/session contracts and target devices for real-audio checks.  
**Layer:** Shared session lifecycle, server/provider integration, Web/Native clients as applicable.  
**Priority:** P0.

### Wave 1 — Recitation follow-along, hide/reveal and current position

**Purpose:** Prove and complete the core Quran reading/recitation path without changing QCF text, glyphs or page geometry.

**Feature groups:** #1–3, #5, #15–16, #44, #62.

**Work:** Verify free Web reading; live follow-along; hidden text/markers and reveal behavior; current-word tracking; voice and text search; Surah/Juz/page navigation; and separation of READ, RECITE, LISTEN and TEST. Voice search, external-recitation follow and the student's evaluated recitation must remain distinct paths.

**Acceptance:** Real-device microphone evidence is recorded separately from source/unit tests. GENERAL recitation remains open-ended and ends explicitly; a local display range never becomes server completion. Hide/reveal preserves canonical text and QCF layout. Do not claim Native QCF parity or microphone accuracy without device proof.

**Dependencies:** Wave 0 lifecycle reliability; canonical Quran/QCF assets; real-device microphone acceptance for audio claims.  
**Layer:** Web reader/shared matcher; Native behavior only where separately verified.  
**Priority:** P0 for follow-along and Quran integrity; P1 for search/navigation.

### Wave 2 — Mistake detection, evidence and history

**Purpose:** Make mistake states reviewable and trustworthy without treating raw ASR disagreement as a confirmed educational error.

**Feature groups:** #6–11, #13.

**Work:** Separate candidate, confirmed, corrected and dismissed states; preserve canonical location and review provenance; determine the minimum evidence needed for local history and any teacher-visible records. #7 tashkeel recognition remains a distinct blocked research gate, not an implied extension of word matching. #13 recording remains disabled unless its privacy gate is explicitly approved.

**Acceptance:** Tests distinguish provider uncertainty from a confirmed mistake; corrected errors retain their history; false-positive dismissal is not silently treated as teacher adjudication; empty history produces no invented evidence. No raw audio or full transcript is stored by default.

**Dependencies:** Wave 0 failure semantics; Wave 1 stable matching; privacy, consent and retention gate for any new stored evidence.  
**Layer:** Web history/shared domain; server or private storage only if separately approved.  
**Priority:** P0 for error truth and privacy; P2 for durable synced history.

### Wave 3 — Testing mode

**Purpose:** Complete the test interaction contract, including help, range/length, scoring and interruption behavior.

**Feature groups:** #4, #17–25.

**Work:** Verify test start, prompt, hide/reveal/help, skip, self-assessment versus AI-following, question counts and boundaries, temporary sessions, result/retry, saved ranges and pause/recovery. Do not invent Hizb/Rub boundaries from page-only data.

**Acceptance:** Hints, answer reveals, skips, confirmed mistakes and self-grades stay distinct; provider/network failure cannot complete a question; temporary tests do not pollute long-term history or weakness; tests cover backgrounding, silence, cancellation and resume.

**Dependencies:** Wave 0 session reliability; Wave 1 matcher/QCF baseline; approved persistence contract before adding durable test records.  
**Layer:** Web test runner/shared domain; server/database only where an approved contract requires it.  
**Priority:** P0 for safe recovery/scoring; P1/P2 for additional controls.

### Wave 4 — Goals, memorization tracker and review

**Purpose:** Add learner planning and review while keeping activity, self-report, AI suggestions and verified memorization separate.

**Feature groups:** #26–28, #32–40.

**Work:** Define goal ownership, activity types, schedules/timezones and completion; provide flexible goals and Today's Goals; build a provenance-aware memorization tracker and explainable review/weakness recommendations. Manual/off-platform activity must be labeled as manual. The authoritative assignment/teacher path for #26 and teacher-confirmed states depends on Wave 9; without it, do not infer memorization from page opens or AI confidence.

**Acceptance:** Every goal or tracker state has a defined source event and authority; absent history stays empty; completed activity is not rewritten when a goal changes; synchronization and teacher access are explicit, not assumed.

**Dependencies:** Wave 0/1/3 evidence; Wave 9 assignment authority for server-confirmed ranges; privacy and schema review before new persistence.  
**Layer:** Student Web/shared domain; server/database only where approved and necessary.  
**Priority:** P2, with P0 authorization and evidence constraints.

### Wave 5 — Mutashabihat

**Purpose:** Add independently sourced similar-phrase/verse study only after canonical alignment and data rights are proven.

**Feature groups:** #29–31.

**Work:** Choose or build an independent dataset/index, define similarity and ranking, and design shared-text highlighting without confusing QCF glyphs, current-word, mistake or Tajweed states.

**Acceptance:** Dataset provenance/license is documented; every result is reconciled against canonical Quran text; empty/error states do not substitute unverified passages; no Tarteel proprietary dataset or scrape is used.

**Dependencies:** Data/licensing gate; canonical identifiers and QCF visual acceptance.  
**Layer:** Data pipeline + Web reader.  
**Priority:** P3.

### Wave 6 — Listening and downloads

**Purpose:** Expand reciter selection, playback and offline audio only where source rights and device behavior are proven.

**Feature groups:** #14, #45–47, #64.

**Work:** Audit EveryAyah/replacement-source terms; verify play/pause, repeat, seek, background behavior and reciter catalog; specify download size/progress/cancel/retry/delete and storage reclamation. #14 user-audio comparison remains dependent on the separate #13 recording approval.

**Acceptance:** Every downloadable asset has a documented source/license; interrupted downloads recover safely and can be deleted; airplane-mode, network-loss, audio-focus and app-background tests are run on intended devices. Classify each function as OFFLINE, ONLINE_REQUIRED or HYBRID; never claim offline AI.

**Dependencies:** Audio source rights, storage lifecycle, Wave 0 recovery; #13 privacy approval for user-audio comparison.  
**Layer:** Web/Native audio and storage; backend only if entitlement/metadata requires it.  
**Priority:** P1 for truthful connectivity behavior; P3 for optional downloads.

### Wave 7 — Translations, Tafsir and bookmarks

**Purpose:** Add verified study data and reader actions without replacing the current QCF Mushaf.

**Feature groups:** #48–56.

**Work:** License translations/Tafsir and align them to canonical ayahs; define bookmarks and read-position persistence; add only real-data actions to the ayah menu; separately assess Tajweed colors, alternate layouts, adaptive text and dark-paper presentation. The Native QCF reader remains out of scope unless separately approved.

**Acceptance:** Rights/versioning and canonical reconciliation pass before bundling; layout/page mappings are tested; QCF screenshots and fixtures remain unchanged absent explicit visual approval; Tajweed colors require verified rules and domain review, not AI approximation.

**Dependencies:** Data/licensing and Tajweed gates; QCF identifiers; explicit sync and visual decisions.  
**Layer:** Data pipeline + Web reader; Native is separately scoped.  
**Priority:** P2 for translations/bookmarks; P3 for Tafsir, Tajweed colors, alternate/adaptive layouts and dark paper. #52 remains BLOCKED until its gate passes.

### Wave 8 — Analytics, badges and streaks

**Purpose:** Add honest, non-punitive progress summaries only from events whose meaning and authority are defined.

**Feature groups:** #12, #57–60.

**Work:** Define each metric, source event, thresholds and timezone; distinguish sessions, confirmed mistakes, goals, self-report and teacher approval; consider badges, streaks and heatmaps as optional enrichment.

**Acceptance:** No metric infers memorization from page opens or uncertain ASR; missing data produces a clear empty state; users can explain/delete their history under the approved retention contract; streaks do not penalize missed days or make religious-value claims.

**Dependencies:** Wave 2/4 evidence and event definitions; privacy and retention decisions.  
**Layer:** Web dashboards/shared domain; server/database only if approved.  
**Priority:** P2 for useful progress; P3 for badges, streaks and heatmaps.

### Wave 9 — Teacher educational integration

**Purpose:** Connect authorized assignments and student evidence to teacher workflows without treating AI as the authority.

**Feature groups:** #41–43.

**Work:** Use the server-owned assignment source; bind EDUCATIONAL sessions to an authorized student, teacher and expected range; define completion/review states; provide pre-halaqa reports and teacher preparation context only from provenance-bearing records.

**Acceptance:** Missing or client-substituted assignments fail closed; role checks prevent cross-student access; completion is recorded only after stable matching reaches the assigned end; AI suggestions, student self-report and teacher decisions remain distinct and auditable.

**Dependencies:** Assignment/role gate; Waves 0–4 stable lifecycle and evidence; explicit privacy and persistence approval.  
**Layer:** Server/shared contracts + teacher/student Web; database only if approved and necessary.  
**Priority:** P0 for authorization and correctness; P2/P3 for reports and assistant surfaces.

### Wave 10 — Groups and community, if approved

**Purpose:** Consider private cohort metrics or competition only after an explicit product, minor-safety and privacy decision.

**Feature groups:** #61.

**Work:** Decide if the feature is needed; define opt-in, audience, role permissions, visibility, moderation and deletion before designing group metrics or leaderboards.

**Acceptance:** No public-by-default student exposure; membership and visibility are authorization-tested; participation is optional and does not expose private recitation or weakness evidence.

**Dependencies:** Owner approval; minor/privacy review; approved event definitions and access rules.  
**Layer:** Server + teacher/student Web.  
**Priority:** P3; skip this wave if the owner does not approve it.

### Cross-wave requirements

- **#63 Arabic-first Tabyan UX:** preserve Arabic-first copy, RTL and Tabyan visual identity throughout.
- **#67 Privacy:** document collection, transmission, storage, retention, access, user control and deletion for every affected AI/audio feature.
- **#68 Do not copy Tarteel:** no proprietary code, UI, artwork, logo, branding, screenshots as production assets or datasets in any wave.
- Keep QCF/canonical Quran text, mode semantics and role authorization intact in every wave. Numbered waves do not override the pre-wave gates.

## 5. Cross-wave release gates

Every approved implementation slice must pass the relevant gates below before release:

1. **Quran integrity:** canonical Arabic text, verse identity, QCF glyphs, page order and pagination remain unchanged.
2. **Mode integrity:** external follow/search is not user grading; GENERAL remains open-ended; EDUCATIONAL is server-assigned or rejected.
3. **Result integrity:** hints, skips, self-grades, uncertain provider output and confirmed mistakes remain distinct.
4. **Privacy:** collection, transmission, storage, retention, access, user control and deletion are documented for every new audio/evidence field.
5. **Role security:** a student cannot select or claim a trusted assignment; teacher access is scoped to authorized students and records.
6. **Platform truth:** Web, Native, offline, microphone, playback and account-sync claims match tested surfaces only.
7. **Content rights:** new Quran-adjacent text, audio, font, layout or similarity data has source/license review and version tracking.
8. **Failure handling:** missing network, provider error, absent data and empty history show explicit states and never fabricate completion.
9. **Accessibility and Arabic UX:** RTL, keyboard/screen-reader labels, contrast and non-color cues are checked without changing the approved QCF typography/layout.
10. **Deployment:** no publish or production migration is implied by a passing development check; deployment decisions remain separate.

## 6. First implementation candidate after approval

The first implementation candidate is **Wave 0: runtime/provider/session reliability**. Start by verifying current behavior and writing a scoped defect list; fix only reproduced failures within an approved Wave 0 slice.

- Do not replace the provider, change Quran/QCF, add recording, or alter privacy claims in this wave.
- Keep EDUCATIONAL fail-closed until a trusted assignment source is identified.
- Do not migrate production data or deploy as part of Wave 0.
- After Wave 0 passes, proceed in the supplied 1–10 order, subject to each wave's gates and a separately approved implementation scope.

