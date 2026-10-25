# TABYAN — TARTEEL-LIKE FEATURE RESTORATION ROADMAP

| Document field | Value |
|---|---|
| Version | 1.0 |
| Updated | 2026-10-05 |
| Status | Draft — planning only; not approved for implementation |
| Decision supported | Choose a safe first implementation scope after the foundation checks. |
| Audience | Product and engineering; Driver/Approver are not assigned in the supplied brief. |

## Scope and planning rules

- Source of truth: [`TABYAN_TARTEEL_FEATURE_RECOVERY_AUDIT.md`](TABYAN_TARTEEL_FEATURE_RECOVERY_AUDIT.md), 21 audited feature groups.
- This is a roadmap, not a task queue or implementation authorization. No product code, Mushaf, QCF, provider, database/schema, or deployment changes are included.
- Preserve the current, verified Mushaf design: QCF and page geometry, Surah headers, Tabyan palette, burger menu, recording-button placement, and responsive layout. No visual revert or redesign.
- Keep the current provider. Do not add an official Tarteel dependency or change OpenAI/provider selection.
- **Origin labels:** `HISTORICALLY_IMPLEMENTED`, `HISTORICALLY_SPECIFIED`, `CURRENTLY_PRESENT`, `PARTIAL`, `CURRENT_CHECKLIST_ONLY`. A feature may carry more than one label. “Current checklist only” is not historical product evidence and does not authorize implementation.
- **Estimates:** T-shirt size is relative scope across design, engineering, and QA, not a calendar estimate. Team capacity is unknown; no delivery dates are proposed.
- **Wave order:** Waves show dependency and topic grouping, not a promise of calendar order. A conditional P4/checklist-only item is a hold point, not a priority over historically evidenced features in a later wave.
- **Database caution:** the audit read the repository schema, not the production schema. It found no recitation `assignmentId` or `teacherId`, and no word-level server snapshot. Any future migration needs separate product approval and a development/production schema comparison first.
- **Native caution:** the audit establishes the Web recitation path. Native recitation-screen wiring was not established; do not assume parity or start Native work without a separate inventory.

## Wave 0 — FOUNDATIONS

Wave 0 is a set of evidence gates, not a feature build. Only the first two gates block a Web-first Wave 1. Native and Educational gates block only their respective future scopes.

### W0.1 — Prove the current Web provider and microphone path

- **Priority:** P0 · **Origin:** `CURRENTLY_PRESENT` · **Current status:** Runtime/device accuracy not proven by the audit.
- **Evidence / gap:** The existing Web recitation path and provider are in code; unit tests are not a real microphone or provider-health test.
- **Check:** Confirm current feature flags and the configured provider’s readiness without exposing credentials or changing provider selection.
- **Acceptance:** Given a permitted Web microphone and the existing provider, recite a known passage for 20–30 seconds. The session receives real audio, tracks canonical words, and reports errors honestly; no mock transcript is used.
- **Decision:** If the real path fails, diagnose the first failure point before planning a feature change. No provider swap is implied.

### W0.2 — Prove session lifecycle and GENERAL stop behavior

- **Priority:** P0 · **Origin:** `CURRENTLY_PRESENT` · **Current status:** Lifecycle code exists; the full live journey still needs acceptance evidence.
- **Evidence / gap:** GENERAL does not auto-complete a range. `endSession` waits for server confirmation; the user must retain a retry path if the request fails.
- **Acceptance:** Start → pause → resume keeps the same session and position; a failed end request does not falsely show a completed result; an explicit successful user end ends GENERAL without emitting `RANGE_COMPLETED`.
- **Dependency:** W0.1 for a real end-to-end audio session; lifecycle/unit tests can be reviewed independently.

### W0.3 — Inventory Native scope without treating it as a blocker for Web

- **Priority:** P0 if Native recitation is in the release scope · **Origin:** audit coverage unknown.
- **Evidence / gap:** The audit proves the Web reader and matcher path, not Native screen wiring or native microphone-to-session parity.
- **Acceptance:** Produce a route/component map showing whether Native exposes recitation, which shared contracts it calls, and which parts are absent. If no Native recitation is in scope, record that and leave it untouched.
- **Safety:** Do not restore the intentionally removed Native Mushaf/QCF reader.

### W0.4 — Identify an authoritative Educational assignment source

- **Priority:** P2 · **Origin:** `HISTORICALLY_SPECIFIED`, current source missing.
- **Evidence / gap:** `educationalAssignmentSourceReady()` is false; the current `todayAssignment` result supplies a level, not an approved range or `assignmentId`.
- **Acceptance:** Name the existing authoritative assignment/lesson source, its owner, the authorization rule, and the exact student/teacher/range/session fields—or record that no usable source exists. Do not invent a new source in this roadmap.
- **Blocks:** Wave 2 and assignment-linked Wave 5 features.

### W0.5 — Decide data purpose, retention, and access before persistence

- **Priority:** P2 · **Origin:** `HISTORICALLY_SPECIFIED` for minimum mistake evidence; persistence scope otherwise unresolved.
- **Evidence / gap:** History and weakness/review are local. The audit says raw audio and ASR text are not in the durable history. Teacher access would introduce a different data purpose and authorization boundary.
- **Acceptance:** Decide what evidence may be retained (normalized recognized word, confidence, canonical position, review status), for how long, who can read/delete it, and whether cross-device sync is required. Default remains no permanent raw audio.
- **Blocks:** Teacher review and any server-side history, snapshots, or sync.

### W0.6 — Verify schema constraints before proposing migrations

- **Priority:** P2 for any persistent Educational or teacher feature.
- **Evidence / gap:** Repository schema includes session lifecycle and `expectedRange`; it does not establish production schema parity or assignment/teacher links on recitation records.
- **Acceptance:** Before any future DB work, compare the authoritative development and production schemas using the database migration process. Identify whether existing session tables can represent the approved contract; do not migrate based on a guessed table shape.
- **Blocks:** Persistent Wave 2, Wave 3 teacher review, and any server-backed Wave 4/5 scope.

### W0 go/no-go

- **Web core:** proceed to Wave 1 verification after W0.1 and W0.2 pass.
- **Native:** separate scope decision after W0.3; not a Web blocker.
- **Educational:** remain fail-closed until W0.4 yields a trusted source.
- **Teacher/shared history:** remain local-only until W0.5 and W0.6 are resolved.

## Wave 1 — CORE RECITATION UX

This is a regression-proofing and gap-only wave. The audit says most core behavior is already present; do not rewrite the matcher or Mushaf. A change is justified only if W0 acceptance finds a reproducible failure.

### W1.1 — Inline recitation in the Mushaf

- **Priority:** P0 · **Origin:** `HISTORICALLY_SPECIFIED`, `CURRENTLY_PRESENT` · **Current status:** Present; live journey needs W0 verification.
- **Why now:** It is the entry point for a real recitation session, but only a real Web journey can establish that the current path works end to end.
- **Evidence:** Mushaf experience specification, sections 7–10 and 45; `3324f32`.
- **Gap:** No structural gap established. Protect the in-reader flow from regressions.
- **Dependencies:** W0.1–W0.2.
- **Current code to reuse / likely modules:** `artifacts/tabyan/src/components/mushaf/MushafReader.tsx`, `RecitationSetupSheet.tsx`, `AyahActionSheet.tsx`.
- **Change surface:** DB no; backend no for existing behavior; Native no in this Web-first scope; Web yes only for a demonstrated defect.
- **Implementation layer:** WEB + FRONTEND.
- **Visual risk:** Low for regression tests; high if controls are moved or the reader is rebuilt.
- **Visual change required?** No. Keep the current inline flow; fix only a demonstrated behavior defect.
- **Size:** XS for verification; S for a narrow, evidenced fix.
- **Acceptance:** Given a loaded Mushaf page, when the user starts recitation, then the same Mushaf page remains visible and recitation starts without navigating to a separate training screen.
- **Safe to implement now?** Safe to verify. Do not rebuild a currently present flow.

### W1.2 — Start GENERAL at the current visible page or ayah

- **Priority:** P0 · **Origin:** `HISTORICALLY_SPECIFIED`, `CURRENTLY_PRESENT`; `startWordPosition` is `CURRENT_CHECKLIST_ONLY` · **Current status:** Page/ayah context present; setup UI does not pass a word position.
- **Why now:** Starting at the visible page or ayah is part of the required P0 session context; exact-word start is not established as a historical requirement.
- **Evidence:** Mushaf experience specification, sections 9–10; Task 101.1, section 9; migration `0008_recitation_contract_separation.sql`.
- **Gap:** No historical product requirement was found for selecting an exact starting word. Do not promote that checklist item into scope.
- **Dependencies:** W0.1; preserve the existing GENERAL contract.
- **Current code to reuse / likely modules:** `RecitationSetupSheet.tsx`, `MushafReader.tsx`, `useRecitationSession.ts`, `lib/tabyan-trpc/src/recitation-contract.ts`.
- **Change surface:** DB no; backend no for page/ayah; Native not assessed; Web only if W0 finds a start-position bug.
- **Implementation layer:** WEB + FRONTEND + SHARED DOMAIN.
- **Visual risk:** Low if the existing setup is reused; no Mushaf geometry change.
- **Visual change required?** No; use the current setup and visible page/ayah context.
- **Size:** XS for verification; S for a reproducible UI fix.
- **Acceptance:** Given the Mushaf is open on page P at ayah A, when GENERAL starts, then the session’s optional start context is P/A, no manual Surah range is required, and no expected end range is sent.
- **Safe to implement now?** Safe to test. Exact-word selection requires separate product approval.

### W1.3 — Canonical current-word and ayah tracking

- **Priority:** P0 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present in code; real-audio accuracy is not established by unit tests.
- **Why now:** Word tracking is required for a real recitation session, and unit tests alone cannot establish live provider/microphone behavior.
- **Evidence:** `fc9908a`, `3324f32`, `6539f72`; live-recitation engine specification.
- **Gap:** Real provider/microphone acceptance and false-jump evidence, not a missing matcher implementation.
- **Dependencies:** W0.1 and W0.2.
- **Current code to reuse / likely modules:** `artifacts/tabyan/src/lib/recitation-ai/QuranLiveMatcher.ts`, `recitationStateEngine.ts`, `artifacts/tabyan/src/components/mushaf/MushafReader.tsx`, `MushafPage.tsx`, `lib/mushaf/word-presentation.ts`.
- **Change surface:** DB no; backend/provider no unless a distinct defect is proven; Native not assessed; Web yes for verification or a minimal fix.
- **Implementation layer:** WEB + SHARED DOMAIN.
- **Visual risk:** Medium if word-state rendering changes; preserve QCF line and glyph geometry.
- **Visual change required?** No; validate the existing highlight and only repair a proven rendering defect.
- **Size:** XS for live verification; M for a narrowly scoped matcher/UI defect.
- **Acceptance:** Given a known recitation and a working microphone, when the reader recites successive canonical words, then the current word advances, the prior word returns to normal, and the UI never claims character-level alignment.
- **Safe to implement now?** Safe to verify; do not rewrite matching thresholds without evidence.

### W1.4 — Quran text hide, reveal, and hint

- **Priority:** P1 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present.
- **Why now:** It is a core recitation aid already in use; verification should protect it without changing the accepted page layout.
- **Evidence:** Mushaf experience specification, sections 28–33; `9b1dcb7`, `3324f32`.
- **Gap:** No restoration gap established; only regression/device verification remains.
- **Dependencies:** W1.3 state updates.
- **Current code to reuse / likely modules:** `MushafReader.tsx`, `MushafPage.tsx`, `useRecitationSession.ts`, `recitationStateEngine.ts`.
- **Change surface:** DB no; backend no; Native not assessed; Web yes only for a demonstrated behavior gap.
- **Implementation layer:** WEB + FRONTEND.
- **Visual risk:** High if CSS/DOM changes alter QCF lines; low for state-only regression coverage.
- **Visual change required?** No; preserve opacity/state behavior and QCF geometry.
- **Size:** XS for verification; M if a QCF-safe fix is proven necessary.
- **Acceptance:** Given FULL_HIDE or a progressive mode, when a word is revealed by the selected rule or user hint, then it appears in its canonical position with identical page, line, and ayah-marker geometry.
- **Safe to implement now?** Safe to test; no layout refactor or visual redesign.

### W1.5 — Local recovery and backward tracking

- **Priority:** P0 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present with tested local windows.
- **Why now:** Recovery and nearby backward movement prevent normal pauses or corrections from ending a real GENERAL session incorrectly.
- **Evidence:** `fc9908a`, `6539f72`; matcher and recitation-scenario tests.
- **Gap:** Unit/scenario coverage is not real-world proof; avoid expanding recovery into EDUCATIONAL.
- **Dependencies:** W0.1 and W1.3.
- **Current code to reuse / likely modules:** `QuranLiveMatcher.ts`, `recitationScenarios.test.ts`, `QuranLiveMatcher.test.ts`.
- **Change surface:** DB no; backend no; Native not assessed; Web/shared-domain tests.
- **Implementation layer:** SHARED DOMAIN + WEB.
- **Visual risk:** Low unless a changed stable position triggers page navigation.
- **Visual change required?** No; tests or a narrowly proven matching fix only.
- **Size:** XS for additional scenario tests; S for a narrowly evidenced matcher fix.
- **Acceptance:** Given a brief pause or nearby backward recitation in GENERAL, when the next stable canonical words arrive, then matching recovers locally without a distant false jump; the same input is not treated as a completed assignment.
- **Safe to implement now?** Safe to add/keep regression tests. Do not broaden the recovery window without accuracy evidence.

### W1.6 — Same-session page and Surah continuation

- **Priority:** P0 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present; the earlier Task 101.1 evidence records a prior cross-Surah defect.
- **Why now:** Page-boundary continuation is required for uninterrupted recitation, and historical evidence identifies this as a real regression risk.
- **Evidence:** Task 101.1, sections 1–8 and 19–25; `6539f72`; `appendNextGeneralPage`/`appendWords`.
- **Gap:** Protect boundary behavior, including Basmala and Surahs sharing a page; preloading alone must not count as continuation.
- **Dependencies:** W1.3 and W1.5.
- **Current code to reuse / likely modules:** `MushafReader.tsx`, `QuranLiveMatcher.ts`, `recitationScenarios.test.ts`.
- **Change surface:** DB no; backend/provider no; Native not assessed; Web/shared-domain tests.
- **Implementation layer:** SHARED DOMAIN + WEB.
- **Visual risk:** Medium because automatic navigation can affect visible page; no styling change.
- **Visual change required?** No; retain the current page-follow behavior and geometry.
- **Size:** S for a focused boundary regression suite; M only if a failure is reproduced.
- **Acceptance:** Given recitation across same-Surah page, same-page Surah, and next-page Surah boundaries, when the next stable canonical position is matched, then the correct Mushaf page follows once, the same session/provider/matcher continue, and reveal continues.
- **Safe to implement now?** Safe to test. Fix only a reproduced boundary failure.

### W1.7 — GENERAL remains open-ended and ends explicitly

- **Priority:** P0 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present and deliberately separate from EDUCATIONAL.
- **Why now:** A real GENERAL session must end by user action and must never report completion of a display-only range.
- **Evidence:** `0008_recitation_contract_separation.sql`; Task 101.1; audit’s contract inspection.
- **Gap:** Preserve the contract under future UI or API changes; no automatic completion for a local display range.
- **Dependencies:** W0.2 and W1.6.
- **Current code to reuse / likely modules:** `lib/tabyan-trpc/src/recitation-contract.ts`, `lib/tabyan-trpc/src/routers/recitation.ts`, `useRecitationSession.ts`.
- **Change surface:** DB no; backend/shared contract regression tests only; Native not assessed; Web yes only if a real failure exists.
- **Implementation layer:** SHARED DOMAIN + BACKEND + WEB.
- **Visual risk:** Low.
- **Visual change required?** No; preserve the existing session controls.
- **Size:** XS.
- **Acceptance:** Given an open-ended GENERAL session, when the user reads past the visible page or stops before any manually selected display range ends, then no `RANGE_COMPLETED` event is emitted; successful user end closes the session, while failed end confirmation leaves retry available.
- **Safe to implement now?** Safe to add contract tests; do not add a GENERAL endpoint or auto-completion.

## Wave 2 — EDUCATIONAL MODE

This wave is **blocked**, not scheduled. Historical specification supports assignment/teacher context and a bounded `expectedRange`; the audit does not identify a trusted source that can supply it.

### W2.1 — Trusted assignment, teacher, student, and lesson context

- **Priority:** P2 · **Origin:** `HISTORICALLY_SPECIFIED`, `PARTIAL` · **Current status:** Structural mode/range only; start is fail-closed because the trusted source is missing.
- **Evidence:** Mushaf experience specification, section 61; Task 101.1, section 10; audit findings for `todayAssignment` and `educationalAssignmentSourceReady()`.
- **Gap:** Identify the actual authoritative assignment source and authorization rule. The current `todayAssignment` response is not sufficient; no `assignmentId`/`teacherId` is linked to a recitation record.
- **Dependencies:** W0.4 and W0.6. No invented assignment service or client-supplied “trusted” range.
- **Likely modules:** `lib/tabyan-trpc/src/routers/recitation.ts`, `routers/teacher.ts`, `recitation-contract.ts`, student-assignment source (TBD), `useRecitationSession.ts`, `MushafReader.tsx`.
- **Change surface:** DB unknown until source/schema comparison; backend yes; Native only if separately scoped; Web yes; provider no.
- **Implementation layer:** MULTI-LAYER — BACKEND + SHARED DOMAIN + WEB; DATABASE only if the verified source/schema requires it.
- **Visual risk:** Low if the existing setup is reused; no Mushaf redesign.
- **Size:** L if a suitable source exists; XL if the assignment source/authorization contract must first be created.
- **Acceptance:** Given an authorized student and a server-owned assignment with range R, when EDUCATIONAL starts, then the server derives R and its assignment/teacher/session context; a client range mismatch or missing assignment is rejected before session creation.
- **Safe to implement now?** No. Keep fail-closed until W0.4 identifies an approved source and W0.6 verifies schema needs.

### W2.2 — Enforced range completion and saved educational progress

- **Priority:** P2 · **Origin:** `HISTORICALLY_SPECIFIED`, `PARTIAL` · **Current status:** Policy/types exist; no proven active educational completion or saved per-verse/word progress.
- **Evidence:** Task 101.1, section 10; GO Task 102, section 20; `recitation-contract.ts`.
- **Gap:** Enforce the server-assigned `expectedRange`, emit a trustworthy completion result once, and decide what “saved educational progress” means. Do not equate a client range with an assignment.
- **Dependencies:** W2.1; stable W1 canonical tracking; W0.5–W0.6.
- **Likely modules:** `lib/tabyan-trpc/src/recitation-contract.ts`, `routers/recitation.ts`, recitation session schema if necessary, `useRecitationSession.ts`, `MushafReader.tsx`.
- **Change surface:** DB conditional/likely if durable assignment linkage or progress is not representable by the verified schema; backend yes; Native only if separately scoped; Web yes.
- **Implementation layer:** MULTI-LAYER — BACKEND + SHARED DOMAIN + WEB; DATABASE conditional.
- **Persistence classification:** `NOT_IMPLEMENTED` for trusted Educational progress; current server session lifecycle metadata is not a word/ayah progress record.
- **Visual risk:** Low; this is a session-state/result change, not a Mushaf redesign.
- **Size:** L.
- **Acceptance:** Given a trusted assigned range R, when stable canonical tracking reaches R’s final position, then the server records one `RANGE_COMPLETED` result and does not follow beyond R. If the user ends early or tracking is uncertain, the session is not reported as completed.
- **Safe to implement now?** No. The assignment source, progress semantics, and production schema must be resolved first.

## Wave 3 — MISTAKE EVIDENCE / TEACHER REVIEW

The mistake state engine already exists. This wave concerns missing evidence fields and a possible teacher surface; only the evidence shape is historically specified. Teacher confirmation is not evidenced by the audit and remains an uncommitted, approval-gated idea.

### W3.1 — Preserve explainable mistake evidence without raw audio

- **Priority:** P2 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `PARTIAL` · **Current status:** Possible/confirmed/corrected/dismissed state exists; current history/popover omit recognized text and confidence.
- **Evidence:** Live-recitation engine specification, sections 52–66; `1b6e6dd`, `e632809`; `recitationStateEngine.ts`, `MistakePopover.tsx`.
- **Gap:** Decide whether the product should expose/store the normalized recognized word, confidence tier, canonical expected word/position, evidence, and review state. Raw ASR mismatch must remain a hypothesis, never an automatic authoritative mistake.
- **Dependencies:** W0.1 for provider evidence quality; W0.5 for retention/purpose; W1.3 stable canonical matching.
- **Likely modules:** `recitationStateEngine.ts`, `recitationHistoryStore.ts`, `MistakePopover.tsx`, `RecitationResultSheet.tsx`, their tests.
- **Change surface:** DB no for an explicitly local/session-only slice; backend/DB yes only if evidence must be shared with a teacher or survive devices; Native not assessed; Web yes.
- **Implementation layer:** WEB + SHARED DOMAIN for local evidence; MULTI-LAYER if evidence becomes teacher-shared.
- **Persistence classification:** `SESSION_ONLY` for the missing full evidence fields today; the existing durable local history is partial and omits recognized text/confidence.
- **Visual risk:** Low if existing popover is extended carefully; preserve current Mushaf and QCF visuals.
- **Size:** M local-only; L multi-layer/shared.
- **Acceptance:** Given a candidate mismatch, when there is not yet reliable follow-up evidence, then it remains “possible”; after the required high-confidence continuation it may become confirmed; a later correct recitation or “not a mistake” action updates the state. The evidence includes canonical position and the approved minimal transcript/confidence fields, but never stores permanent raw audio by default.
- **Safe to implement now?** Not before W0.5. A local-only implementation is a possible later scope; shared/persistent evidence needs separate approval.

### W3.2 — Teacher confirms, rejects, or edits an AI suggestion

- **Priority:** P4 discovery-only; if approved, reclassify before sequencing · **Origin:** `CURRENT_CHECKLIST_ONLY` · **Current status:** No AI mistake-review queue; current teacher session list exposes metadata, not word evidence.
- **Historical evidence:** None found for teacher confirmation of AI mistakes. The older spec asks for mistake records, not a teacher decision surface.
- **Gap:** Product and teacher-policy decision required before building a role-authorized review workflow. Do not describe this as historically required or as existing.
- **Dependencies:** W2.1–W2.2; W3.1 evidence contract; teacher authorization and audit trail; W0.5–W0.6.
- **Likely modules:** `lib/tabyan-trpc/src/routers/teacher.ts`, teacher `StudentProfile.tsx`, recitation evidence service/schema (TBD).
- **Change surface:** DB likely yes for shared evidence and review history; backend yes; Native not assessed; Web yes.
- **Implementation layer:** MULTI-LAYER — BACKEND + DATABASE + WEB.
- **Persistence classification:** `NOT_IMPLEMENTED` for teacher review decisions.
- **Visual risk:** Medium for a new teacher surface; no changes to Mushaf visuals.
- **Size:** XL.
- **Acceptance if separately approved:** Given an assigned student session with a linked AI suggestion, when the authorized teacher opens it, then only linked students’ evidence is visible and the teacher can confirm/reject/correct with an attributable audit record. Until then, AI output remains non-authoritative.
- **Safe to implement now?** No. This item is not committed by this roadmap.

## Wave 4 — SMART REVIEW / ERROR MEMORY

The local foundation already exists. The default plan is to preserve and test it locally; cross-device or teacher-shared persistence is a separate product decision, not an assumed migration.

### W4.1 — Recitation history

- **Priority:** P3 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `PARTIAL` · **Current status:** Local browser history is present; not server-synced.
- **Evidence:** Mushaf experience specification, sections 37–38 and 67; `7006b70`; `recitationHistoryStore.ts`.
- **Gap:** Cross-device/server history is absent, but not required to preserve the current local behavior. The record intentionally excludes raw audio and transcript.
- **Dependencies:** W1 session lifecycle; W0.5 before adding any new stored fields.
- **Likely modules:** `RecitationHistorySheet.tsx`, `recitationHistoryStore.ts`, `MushafReader.tsx`.
- **Change surface:** DB/backend no for local behavior; both required for shared history; Native not assessed; Web yes.
- **Implementation layer:** WEB + FRONTEND; MULTI-LAYER only for a separately approved sync feature.
- **Persistence classification:** `LOCAL_ONLY` (browser-local history; no server sync).
- **Visual risk:** Low; retain the current sheet and reader.
- **Size:** XS for regression verification; L for approved cross-device sync.
- **Acceptance:** Given a completed session, when the same user refreshes the same browser, then the local session remains available and opens the correct Quran position; a voice-search/helper follow session is not recorded as the user’s recitation.
- **Safe to implement now?** Safe to preserve/test locally. Do not add server sync without a stated need and retention decision.

### W4.2 — Student error memory and weak ayat

- **Priority:** P3 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `PARTIAL` · **Current status:** Local per-user aggregates are present.
- **Evidence:** `7006b70`; `weaknessEngine.ts`, `recitationHistoryStore.ts`.
- **Gap:** Aggregates do not transfer across devices or appear in teacher tools. They depend on local history and are not a teacher-validated grade.
- **Dependencies:** W4.1; preserve the current evidence-state distinctions in W3.1.
- **Likely modules:** `weaknessEngine.ts`, `recitationHistoryStore.ts`, `RecitationHistorySheet.tsx`.
- **Change surface:** DB/backend no for local; both required only for approved account-level persistence; Native not assessed; Web yes.
- **Implementation layer:** WEB + SHARED DOMAIN; MULTI-LAYER only for approved server persistence.
- **Persistence classification:** `LOCAL_ONLY`.
- **Visual risk:** Low; existing review sheet only.
- **Size:** XS to verify existing behavior; L for cross-device persistence.
- **Acceptance:** Given confirmed/corrected/dismissed local events, when weak-ayah summaries are calculated, then the existing deterministic rules are used and possible/unconfirmed mismatches are not presented as confirmed learning failures.
- **Safe to implement now?** Safe to preserve/test locally; not safe to centralize without approval.

### W4.3 — Smart/spaced review recommendations

- **Priority:** P3 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` locally · **Current status:** Local deterministic suggestions are present.
- **Evidence:** `7006b70`; `weaknessEngine.ts`, `weaknessEngine.test.ts`.
- **Gap:** No shared queue or synchronized result of later review. This is not a reason by itself to add server persistence.
- **Dependencies:** W4.1–W4.2.
- **Likely modules:** `weaknessEngine.ts`, `RecitationHistorySheet.tsx`.
- **Change surface:** DB/backend no for local recommendations; conditional yes for a shared queue; Native not assessed; Web yes.
- **Implementation layer:** WEB + SHARED DOMAIN; MULTI-LAYER only for an approved shared queue.
- **Persistence classification:** `LOCAL_ONLY`.
- **Visual risk:** Low if using the current review sheet.
- **Size:** XS for regression checks; M for an approved local-only refinement; L for a shared queue.
- **Acceptance:** Given sufficient local history, when the review sheet opens, then recommendations show their existing reasons and open/test the intended range; with no eligible history, no weak-ayah recommendation is fabricated.
- **Safe to implement now?** Safe to preserve/test; new recommendation rules need product approval and measurable examples.

### W4.4 — Generic memorization self-test

- **Priority:** P3 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** General range-based test exists; it is not assignment-linked.
- **Evidence:** `980589e`; `MemorizationTestSetupSheet.tsx`, `useMemorizationTestRunner.ts`.
- **Gap:** Keep it distinct from a pre-halaqa/assignment test; current audit found no teacher summary link.
- **Dependencies:** W1 reader/session stability; existing optional AI/self-assessment behavior.
- **Likely modules:** `MemorizationTestSetupSheet.tsx`, `MemorizationTestBar.tsx`, `MemorizationTestResultSheet.tsx`, `useMemorizationTestRunner.ts`.
- **Change surface:** DB no for the existing general test; backend/provider only as already configured; Native not assessed; Web yes.
- **Implementation layer:** WEB + FRONTEND; existing session/provider integration only.
- **Persistence classification:** `SESSION_ONLY` for the test result unless a durable behavior is separately verified; do not claim it is persistent.
- **Visual risk:** Low; reuse current bottom-sheet/result pattern.
- **Size:** XS to verify; M for a narrowly scoped defect.
- **Acceptance:** Given a user-selected general range, when the test finishes, then the result and weak questions are shown without representing self-assessment as teacher approval or converting unavailable AI evidence into a fake mistake.
- **Safe to implement now?** Safe to preserve/test; do not attach it to an assignment without W2.

### Wave 4 persistence state map

| State | Audited scope |
|---|---|
| `LOCAL_ONLY` | Recitation history, student error memory/weak positions, and smart-review recommendations. |
| `SESSION_ONLY` | Full mistake evidence fields absent from durable history; generic test-result persistence is not established by the audit. |
| `PERSISTENT` | Server-side recitation session lifecycle metadata only; this is not a word/ayah snapshot or teacher-reviewed result. |
| `NOT_IMPLEMENTED` | Trusted Educational progress, teacher review decisions, assignment-linked pre-test results, and server-side progress snapshots. |

## Wave 5 — ADVANCED INTELLIGENCE

All items here are later and uncommitted. Historical uncertainty must remain visible; this wave does not authorize speculative intelligence features.

### W5.1 — Assignment-linked pre-session test and teacher summary

- **Priority:** P4 discovery-only; if approved, reclassify before sequencing · **Origin:** `CURRENT_CHECKLIST_ONLY` · **Current status:** General memorization test exists; no assignment-linked pre-test or teacher summary was found.
- **Historical evidence:** None found for the assignment-linked pre-session flow.
- **Gap:** Define whether a pre-test is wanted, what score/evidence means, and which assignment/session it belongs to.
- **Dependencies:** W2.1–W2.2; W3.1 and W0.5 if the summary contains mistake evidence.
- **Likely modules:** Existing memorization-test components; assignment/session API and teacher result surface (TBD).
- **Change surface:** DB/backend likely for a durable teacher summary; Native not assessed; Web yes.
- **Implementation layer:** MULTI-LAYER — BACKEND + DATABASE + WEB.
- **Persistence classification:** `NOT_IMPLEMENTED` for assignment-linked pre-test results and teacher summaries.
- **Visual risk:** Medium for a new result/teacher surface; preserve current Mushaf.
- **Size:** L.
- **Acceptance if approved:** Given a trusted assignment range, when the student completes a pre-test, then every test item is within that server-assigned range and the teacher summary is linked to the correct student, assignment, and session; self-assessment remains labeled as such.
- **Safe to implement now?** No. Checklist-only and blocked by W2.

### W5.2 — Mutashabihat detection and targeted review

- **Priority:** P4 discovery-only; if approved, reclassify before sequencing · **Origin:** `CURRENT_CHECKLIST_ONLY` · **Current status:** No historical product specification or implementation was found.
- **Historical evidence:** None found; the concept appears only in the current audit checklist.
- **Gap:** Product definition, authoritative similar-ayah set or validated method, false-positive criteria, and whether results are local or stored.
- **Dependencies:** User/product approval; a validated Quran-domain dataset; W4 review only if results are intentionally used for recommendations.
- **Likely modules:** New shared-domain matcher/data tests; UI only after behavior is validated.
- **Change surface:** DB/backend not justified by current evidence; Native not assessed; Web only after validation.
- **Implementation layer:** SHARED DOMAIN + WEB; DATABASE only if persistence is later approved.
- **Persistence classification:** `NOT_IMPLEMENTED`.
- **Visual risk:** Low for computation; medium if surfaced inside the Mushaf.
- **Size:** XL.
- **Acceptance if approved:** Given a curated test set with known similar passages and known non-matches, when the detector runs, then it returns only validated pairs with an explainable relation and never labels a mere lexical overlap as a student mistake.
- **Safe to implement now?** No. Do not build from the audit checklist alone.

### W5.3 — Teacher assistant based on recitation evidence

- **Priority:** P4 discovery-only; if approved, reclassify before sequencing · **Origin:** `CURRENT_CHECKLIST_ONLY` · **Current status:** No assistant or AI-evidence teacher surface was established.
- **Historical evidence:** None found for a teacher assistant based on a student’s recitation evidence.
- **Gap:** Define its audience, permitted data, output source, review responsibility, and whether it summarizes rather than grades.
- **Dependencies:** W2 assignment linkage; W3 reviewed evidence; W4 weak-ayah data; authorization and retention decisions.
- **Likely modules:** New teacher UI and backend service (TBD); do not infer requirements from the existing StudentProfile session list.
- **Change surface:** DB/backend likely if it reads shared history; Native not assessed; Web yes.
- **Implementation layer:** MULTI-LAYER — BACKEND + DATABASE + WEB.
- **Persistence classification:** `NOT_IMPLEMENTED` for shared assistant inputs/results.
- **Visual risk:** Medium for new teacher UI; none to the Mushaf.
- **Size:** XL.
- **Acceptance if approved:** Given a teacher linked to a student, when the assistant summarizes a session, then every statement traces to an authorized assignment/session/evidence record, uncertainty is shown, and no unsupported grade is produced.
- **Safe to implement now?** No. Checklist-only, and dependent on W2–W4 decisions.

### W5.4 — Server-side progress snapshots

- **Priority:** P4 discovery-only; if approved, reclassify before sequencing · **Origin:** `CURRENT_CHECKLIST_ONLY` · **Current status:** Session lifecycle metadata is server-side; word/ayah progress snapshots are not.
- **Historical evidence:** No independent requirement for resumable word/ayah snapshots was found.
- **Gap:** No historical snapshot requirement, resume behavior, snapshot frequency, retention, or source-of-truth contract was found.
- **Dependencies:** A concrete resume/review use case; W0.5–W0.6; W2 if snapshots are assignment-scoped.
- **Likely modules:** `lib/tabyan-trpc/src/routers/recitation.ts`, schema/migration only if approved, client session lifecycle.
- **Change surface:** DB/backend likely; Native only if resume parity is approved; Web yes.
- **Implementation layer:** MULTI-LAYER — BACKEND + DATABASE + WEB; NATIVE only if separately approved.
- **Persistence classification:** `NOT_IMPLEMENTED` for word/ayah snapshots.
- **Visual risk:** Low unless resume UI is added; preserve current reader.
- **Size:** L.
- **Acceptance if approved:** Given an interrupted session and an authorized resume action, when the user resumes, then the server restores only a validated canonical position in the same permitted scope; stale or cross-user snapshots are rejected.
- **Safe to implement now?** No. Do not add a migration until the resume requirement and production schema are verified.

### W5.5 — Preserve current Mushaf visual system

- **Priority:** P4 · **Origin:** `HISTORICALLY_SPECIFIED`, `CURRENTLY_PRESENT` · **Current status:** Verified and authoritative per the supplied roadmap brief.
- **Evidence:** Existing audit and visual-design requirements; current `MushafReader`, `MushafPageFrame`, `SurahHeaderFrame`, and QCF system.
- **Gap:** No restoration gap. The only roadmap requirement is to avoid regressions when another approved feature touches the reader.
- **Dependencies:** Any approved feature that changes the reader.
- **Likely modules:** No change planned; regression checks may cover `MushafReader.tsx`, `MushafPage.tsx`, `MushafPageFrame.tsx`, `SurahHeaderFrame.tsx`.
- **Change surface:** DB no; backend no; Native no unless a separately approved Native feature; Web only for regression verification.
- **Implementation layer:** WEB + FRONTEND for regression checks only.
- **Visual risk:** High if a feature changes layout, headers, palette, menu, or recording-button position; zero for a test-only change.
- **Size:** XS for a focused regression check.
- **Acceptance:** Given the approved current Mushaf at its supported responsive widths, when an approved recitation feature is used, then QCF/page geometry, Surah headers, Tabyan palette, burger menu, recording-button placement, and responsive behavior remain unchanged.
- **Safe to implement now?** No visual implementation is proposed. Preserve and regression-test only.

### W5.6 — Preserve Quran text/voice search and external follow

- **Priority:** P4 · **Origin:** `HISTORICALLY_IMPLEMENTED`, `CURRENTLY_PRESENT` · **Current status:** Present and separate from recitation history.
- **Evidence:** `ad7b9ec`; `MushafSearchSheet.tsx`, `quranSearch.ts`.
- **Gap:** No restoration gap. Avoid accidentally treating helper voice search or following an imam/recording as the user’s own recitation.
- **Dependencies:** None for preservation; use W0 only if a future runtime test exercises the microphone.
- **Likely modules:** `MushafSearchSheet.tsx`, `MushafReader.tsx`, `lib/recitation-ai/quranSearch.ts`.
- **Change surface:** DB no; backend/provider no for existing behavior; Native not assessed; Web yes for regression tests.
- **Implementation layer:** WEB + FRONTEND.
- **Visual risk:** Low if the current sheet is preserved.
- **Size:** XS.
- **Acceptance:** Given a voice-search or external-follow helper session, when it returns a canonical result or follows an external reciter, then it opens/follows the correct Quran position without being stored as the student’s recitation or creating a teacher mistake record.
- **Safe to implement now?** Safe to preserve/test; no feature rewrite is needed.

## Dependency graph

```text
W0.1 current Web provider + microphone ─┐
W0.2 session lifecycle ────────────────┴→ W1.2 current page/ayah context
                                             → W1.3 canonical matcher/tracking
                                             → W1.5 local recovery/backward
                                             → W1.6 same-session page/Surah follow
                                             → W1.4 hide/reveal state
                                             → W1.7 explicit GENERAL end; never range-complete

W0.4 authoritative assignment source
  + W0.6 schema comparison
    → W2.1 assignment/student/teacher/lesson contract
      → W2.2 bounded expectedRange + completion/progress
        → W5.1 (optional) assignment-linked pre-test

W0.5 retention/access decision
  + W1.3 stable canonical evidence
    → W3.1 minimal mistake evidence (AI suggestion only)
      → W3.2 teacher review only after explicit product approval
        → W5.3 (optional) teacher assistant

W4.1 local history → W4.2 weak-position memory → W4.3 local smart review
                                      └────────→ W4.4 generic self-test

W5.2 mutashabihat and W5.4 server snapshots remain independent, gated proposals;
neither is a prerequisite for the existing local review features.
```

## Cost and change-surface summary

| Area | Planned scope | Database | Backend | Native | Web |
|---|---|---|---|---|---|
| Wave 0 | Runtime, lifecycle, source, privacy, and schema gates | No change; inspect before any future migration | Readiness checks only | Inventory only | Real microphone/session acceptance |
| Wave 1 | Existing core flow: verification and targeted fixes only | No | No for current behavior; only if a reproduced contract defect requires it | Not assessed; separate scope | Yes |
| Wave 2 | Trusted assignment and bounded educational result | Conditional/likely; verify repository and production schema first | Yes | Separate decision | Yes |
| Wave 3 | Minimal mistake evidence; teacher review is uncommitted | No for explicitly local evidence; likely yes for shared teacher review | Conditional; yes for teacher review | Not assessed | Yes if approved |
| Wave 4 | Keep local history, weak memory, smart review, and generic test | No for current local behavior; yes only for approved cross-device persistence | No for current local behavior | Not assessed | Yes |
| Wave 5 | Checklist-only advanced ideas and preservation checks | Not justified for checklist-only ideas; conditional for snapshots | Conditional | Not assessed | Conditional |

## Decisions still required

1. Is Wave 1 Web-only until its live microphone acceptance passes? Native screen wiring is not established by the audit.
2. Which existing data source, if any, is authoritative for a student’s assignment, teacher, lesson, and Quran range? Do not invent one.
3. Is local-only review sufficient, or is cross-device/teacher-visible persistence an explicit product requirement?
4. If mistake evidence is retained, which minimum fields and retention period are approved? Permanent raw audio remains off by default.
5. Is a teacher confirmation surface desired despite no historical product evidence? If yes, define who can confirm/reject/correct and whether the result is an annotation or a formal evaluation.
6. Are the current audit-checklist-only items—starting at an exact word, assignment-linked pre-test, mutashabihat, teacher assistant, and server snapshots—approved as product requirements, or should they remain out of scope?

## Final report

**TABYAN — TARTEEL-LIKE RESTORATION ROADMAP**

- **Total feature groups:** 21.
- **Wave 0:** Verify current Web provider/microphone and lifecycle; identify Native scope; identify an authoritative assignment source; decide retention; compare production schema before any migration.
- **Wave 1:** Protect and acceptance-test the 7 existing core recitation groups; implement only a defect reproduced by Wave 0.
- **Wave 2:** Blocked on a real assignment source and schema/authorization decisions.
- **Wave 3:** Historical evidence model is partially implemented; teacher review is checklist-only and not approved for implementation.
- **Wave 4:** Preserve local history, error memory, smart review, and generic self-test; server sync is optional and requires a separate persistence decision.
- **Wave 5:** Pre-session test, mutashabihat, teacher assistant, and progress snapshots remain conditional/checklist-only; preserve current Mushaf visuals and search behavior.
- **Safe without DB changes:** Wave 1 verification and narrow Web fixes; current local-only Wave 4 behavior; regression checks for visuals/search.
- **Requires backend work:** Trusted assignment linkage and bounded Educational outcome; teacher review only if approved; any server-backed persistence.
- **Requires persistence:** Teacher-visible mistake evidence, assignment-linked progress, cross-device history, and server snapshots. These are not approved by this plan.
- **Blocked:** Educational mode by missing trusted assignment source; teacher review by absent product/policy decision; persistent features by retention and production-schema verification.
- **Current-checklist-only items:** Exact-word start, teacher confirmation surface, assignment-linked pre-test, mutashabihat, teacher assistant, and server progress snapshots.
- **Best first implementation wave:** Wave 1, after W0 passes, limited to acceptance/regression tests and any narrowly demonstrated P0 defect. If all gates pass, no broad restoration rewrite is justified by the audit.

- **Product code changed:** NO
- **Mushaf changed:** NO
- **Quran/QCF changed:** NO
- **Database changed:** NO
- **Provider changed:** NO
- **Deployment:** NO

**Next step:** Review/approve this roadmap and its open decisions before creating implementation tasks or changing product code.
