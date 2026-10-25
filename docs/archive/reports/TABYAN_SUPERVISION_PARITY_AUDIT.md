# TABYAN — supervision Web/Mobile parity audit and fix

## Acceptance status

**WEB_MOBILE_SUPERVISION_PARITY: FAIL — acceptance is not demonstrated yet.**

This report records the current implementation, the gaps corrected in this pass, and what remains unverified. It does **not** inherit the older UX report's MATCHED claims. After explicit cost approval, the paired **text-book workflow passed in the Web and Expo-web browsers**. That is real evidence for books, not acceptance of every supervision workflow or physical Native behavior.

The implementation targets are `artifacts/tabyan` and `artifacts/mobile`. The separate staff-preview demo is not the canonical supervision product.

No production publishing, Railway work, database/schema migration, storage migration, Nabr work, Smart Mushaf work or Tabyan AI work was performed for this parity pass.

## Evidence and status meanings

- The matrix below is primarily a **source-level comparison**, with the paired browser-book evidence recorded explicitly. It is not a completed device acceptance matrix.
- `FUNCTIONALLY_EQUAL` means the inspected code exposes equivalent business controls and canonical API operations, using platform-specific presentation. It is provisional until the paired signed-in scenario succeeds.
- `PARTIAL` identifies a remaining evidence or platform limitation explicitly; it must not be read as accepted.
- No module is marked `EXACT`: identical endpoint names alone do not prove identical forms, data, permissions or runtime outcomes.
- State notation: `L` loading, `E` empty, `R` recoverable error/retry, `S` success feedback/refetch, `D` disabled/pending, `A` approved/rejected review states. These are code paths, not a claim that each state was driven in a browser.
- Where a Web capability does not exist, this pass does not invent an unrelated Mobile-only administrative capability.

## Module matrix

Routes are application routes, relative to each artifact's preview base. “Same” in a Mobile column refers to the explicit Web values in that row, not to the older audit.

| MODULE | WEB_ROUTE | MOBILE_ROUTE | WEB_ACTIONS | MOBILE_ACTIONS | WEB_DATA | MOBILE_DATA | WEB_STATES | MOBILE_STATES | PARITY_STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| Supervision home | `/admin` | `/admin` | Open work queues, shortcuts, refresh KPI data | Same destinations and 30-second KPI polling | KPIs, urgent queues, active supervisors | Same canonical KPI/admin queries | L, R, navigation | L, R, navigation | FUNCTIONALLY_EQUAL |
| Students | `/admin/users` student filter | `/admin/users` student filter | Search/filter, details, message, warn, ban, delete, CSV export | Same actions; native sharing replaces browser CSV download | Identity/status, level/Juz, student file, progress rows, session history, placement media, school/parent data | Same canonical file data; actual progress and sessions now rendered | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Teachers | `/admin/users` teacher filter | `/admin/users` teacher filter | Search/filter, details, message, warn, ban, deactivate, export | Same exposed actions | Identity, KYC/status, rating, mufti flag | Same returned teacher summary fields | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Supervisor accounts | `/admin/accounts` | `/admin/accounts` | List, create, reset password; existing confirmation/permission rules | Same protected operations and sheet forms | Accounts/status and creation/reset inputs | Same account endpoint surface | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Placement review | `/admin/students-review` | `/admin/students-review` | List submissions, view details/video, select canonical path level, approve, reject without required reason | Same workflow; no extra rejection-note payload | Submission/student/path metadata, media, eligible levels | Same review data and canonical placement-level query | L/E/R/S/D/A | L/E/R/S/D/A; media needs device proof | PARTIAL |
| Teacher verification | `/admin/teachers-review` | `/admin/teachers-review` | Inspect application and media, approve/reject | Same protected KYC review; sticky action sheet | Teacher/application fields and submitted media | Same workflow data | L/E/R/S/D/A | L/E/R/S/D/A; media needs device proof | PARTIAL |
| Weekly schedules | `/admin/schedules` schedules tab | `/admin/schedules` schedules tab | Create, activate/deactivate, open/close booking, delete | Same actions | Teacher, session type/mode, level, days, time slots, duration, capacity, status | Same; Arabic weekdays and visible mode/capacity/status | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Bookings | `/admin/schedules` bookings tab | `/admin/schedules` bookings tab | List and cancel eligible bookings | Same cancellation operation | Student/teacher/type, date, status | Same endpoint data | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Session monitoring | `/admin/sessions-monitoring` | `/admin/sessions-monitoring` | Live/upcoming lists; join only live sessions | Same live-only entry; upcoming entries disabled | Participants, topic/type, level, date/duration | Same monitoring endpoint fields | L/E/R, live/upcoming | L/E/R, live/upcoming | FUNCTIONALLY_EQUAL |
| Supervisor live session | `/admin/session/:id` | `/admin/session/[id]` | Observe an authorized live session | Existing Native observer route retained | Authorized session and real media | Native WebRTC transport differs | Permission/media/lifecycle | Native hardware/media lifecycle not exercised | PARTIAL |
| Books/library | `/admin/library` | `/admin/library` | List, search, filter, details, add/edit, upload, archive/restore, delete | Same shared library contract; native sheet/pickers | Metadata, source/media, curriculum levels, status | Same contract; selected details clear on delete and update on archive | Paired text-book CRUD/search/archive/discard passed in browser | Same browser outcomes passed; upload/playback/Native share not exercised | PARTIAL |
| Quran/other levels | `/admin/levels` | `/admin/levels` | Create/edit, visibility/activation and available level controls | Same canonical level operations | Level/path/order, thresholds and state fields | Same level API surface | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Sharia administration | `/admin/sharia` | `/admin/sharia` | Subjects, associated levels/reorder and session booking-open controls | Same protected subjects/levels/schedule operations | Subject metadata, levels/order, schedules | Same canonical query/mutation surface | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Assessments/questions | `/admin/assessments` | `/admin/assessments` | Create/toggle assessment, add/copy question, inspect attempts | Same endpoints and sheet workflows | Assessment settings, bank questions, choices/answer and attempt results | Same canonical query/mutation surface | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Muftis | `/admin/muftis` | `/admin/muftis` | Assign/unassign eligible teacher; workload threshold | Same protected operations | Muftis, eligible teachers and workload stats | Same three query sources | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Fatwa supervision | `/admin/fatwas` | `/admin/fatwas` | Inbox/filter, inspect and existing assignment/management controls | Same protected query/mutation surface | Question, student/status and assignment data | Same canonical sources | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Promotions/requests | `/admin/promotions` | `/admin/promotions` | Pending + reviewed categories, inspect, approve/reject | Same `promotionsList` source; reviewed history retained; teacher-request marker is not treated as a video URL | Student, level, request/media and review information | Same canonical source instead of pending-only source | L/E/R/S/D/A | L/E/R/S/D/A | FUNCTIONALLY_EQUAL |
| Qiraat certificates | `/admin/qiraat` | `/admin/qiraat` | List, open certificate, approve/reject with canonical rejection validation | Same review operation; persistent confirmed actions | Student, status, timestamp, certificate | Same; Arabic status labels | L/E/R/S/D/A | L/E/R/S/D/A; external media opening unverified | PARTIAL |
| Analytics | `/admin/analytics` | `/admin/analytics` | Open available analytics views; refresh/retry | Same canonical query surface | Server analytics/aggregates | Same sources | L/E/R | L/E/R | FUNCTIONALLY_EQUAL |
| Notification management | `/admin/notifications` | `/admin/notifications` | Create, select audience/type/template, recurrence, sent log, stop recurrence | Same operations; creation in sticky-footer sheet | Templates, audience/target, type/title/body, recurrence, log author/time | Same fields; no Native-only required schedule timestamp | L/E/R/S/D | L/E/R/S/D | FUNCTIONALLY_EQUAL |
| Personal inbox/preferences/detail | `/admin/inbox`, `/admin/inbox/settings`, `/admin/inbox/:id` | `/admin/inbox`, `/admin/inbox/settings`, `/admin/inbox/[id]` | Existing shared notification reading/preferences flows | Existing role-specific wrappers retained | Notification and preference data | Existing shared notification components | Existing query/form states | Not exercised in this pass | PARTIAL |
| Audit log | `/admin/audit-log` | `/admin/audit-log` | Select action/target filters, clear, paginate | Same, with selectable/searchable pickers rather than cyclic buttons | Actor/action/target/time, totals and available filters | Same `auditLogsList` source | L/E/R, pagination | L/E/R, pagination | FUNCTIONALLY_EQUAL |
| Settings | `/admin/settings` | `/admin/settings` | Edit allowed settings, master-password workflow, daily-verse preview/set/clear | Same protected operation surface | Allowed settings, verse and password form state | Same API sources; native sheets | L/R/S/D | L/R/S/D | FUNCTIONALLY_EQUAL |
| Student path selection (explicit ancillary gap) | `/student/path` | `/student/path` | Select available Quran, Tajweed and Sharia destinations | Added reachable all-paths variant of existing path screen | Canonical available paths and progress/gates | Same `student.paths`; no fabricated paths | L/E/R, gates | L/E/R, gates | FUNCTIONALLY_EQUAL |
| Sharia level booking (explicit ancillary gap) | Web Sharia level booking entry | `/student/sharia/[subject]/[level]` → `/student/booking` | Book a matching subject/level group | Added context-preserving entry and schedule filtering; closed/full disabled | Subject, level, group schedules and capacity | Canonical teachers/schedules and booking mutation, selected level retained | Loading/error/availability/result | Same code paths; completed booking not exercised | PARTIAL |
| Terms (explicit ancillary gap) | `/terms` | `/terms` | Read current legal draft and navigate to support/privacy | Added public readable draft with those navigation destinations | Current legal draft sections; unapproved status preserved | Ten draft sections, not a claim of legal approval | Public content/navigation | Content rendered/readable at 430×932 after startup; link interactions not exhaustively tested | PARTIAL |

### Capability boundaries

- The current Web user-management screen is the reference for teacher management. Dedicated teacher edit/workload/assigned-student CRUD is not invented when Web does not expose it.
- Supervisor account capabilities follow the current Web account screen; this audit is not permission-system expansion.
- Content work covers the actual library, levels, Sharia and assessments modules. “Lessons” is not treated as a missing standalone screen merely because it appeared as an example in the request.
- Permission equivalence requires runtime denied-role tests in addition to both clients naming the same protected server procedures.
- Sending/storing a notification or disabling recurrence does not prove FCM/Push delivery or scheduling. The backend's current behavior was not rewritten.

## Gaps corrected in this pass

1. Fixed conditional hook ordering in the Native generic review screen; changing loading state must not change the number of React hooks.
2. Enabled only the selected review workflow's query, not unrelated placement/KYC/promotion queries.
3. Used canonical path-specific placement levels without an extra hardcoded client whitelist.
4. Aligned placement rejection with Web: no required reason and no Mobile-only rejection-note payload.
5. Kept review mutation failures inside their open sheet and invalidated the supervision KPIs after successful review.
6. Put placement, KYC, promotion, certificate and notification actions in persistent sheet footers with pending/dirty guards.
7. Rendered actual student progress/session rows and additional profile metadata, rather than counts alone; retained retry and search state.
8. Aligned ban text-length/duration checks and escaped CSV formula prefixes on both platforms.
9. Kept reviewed promotions visible through `promotionsList`; handled `teacher_request_` without trying to play it as a video.
10. Added the missing Mobile path-selection and public terms routes without changing Quran/Mushaf scope.
11. Added Sharia-level booking entry with subject/level/group context, closed/full eligibility and post-booking availability refresh.
12. Added library level-query recovery, selected-book cleanup after deletion, selected-book status refresh after archive/restore and upload-time dismissal protection.
13. Matched home KPI polling to Web's 30 seconds.
14. Aligned notification recipient/title/type submission; removed the Native-only required scheduled timestamp, retained templates/recurrence, and exposed author/time/type/audience information in the sent log.
15. Added missing Web recovery paths across promotions, analytics, audit log, student files, certificates, notification history/recurrence, levels, muftis, settings, fatwas, Sharia and assessments.
16. Replaced cyclic Native audit filters with selectable/searchable controls.
17. Matched schedule duration to the canonical 15–180-minute range; validated capacity/duration instead of silently clamping values.
18. Prevented entry to upcoming sessions and displayed their not-started state.
19. Corrected Expo development startup to explicitly target the verified Development API. Separated Metro transform caches by API origin so a stale compiled release fallback cannot survive that target change. Release/build domain resolution was not changed.
20. Cleared the Native library's generic validation banner when a form field changes; the tester had observed that stale message after correcting required input.

## Verification actually performed

Successful:

```text
pnpm --filter @workspace/tabyan run typecheck
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/tabyan exec vitest run \
  src/lib/admin-library.test.ts \
  src/pages/admin/supervision-ux.test.ts \
  src/pages/admin/supervision-parity.test.ts
pnpm --filter @workspace/tabyan exec vitest run \
  --root ../mobile tests/supervision-ux.test.ts
git diff --check
```

- Web/shared: **43 checks passed** across three files after adding the Expo routing/cache regression assertion.
- Mobile interaction rules: **5 checks passed**.
- The new parity suite compares query/mutation names for **17 paired admin modules**, guards the generic-review hook/query changes, checks reviewed promotions/student-history/sheet coverage and Development preview routing, and exercises the **pure helpers actually used by Sharia booking** for subject/level/mode/capacity.
- Source-contract assertions are not end-to-end tests, and their count is not the number of accepted supervisor scenarios.
- The Web managed workflow was restarted once after the implementation batch. Expo was restarted for the development-routing correction and again for its stale-cache correction; the served bundle was checked locally before the final Mobile browser continuation.
- The initial screenshot of `/terms` captured the startup splash. A later signed-in browser run waited past startup and independently rendered the public terms page successfully at 430×932.

### Approved signed-in browser acceptance

The same tester continued the same acceptance unit; the successful Web workflow was not rerun during the Mobile routing repairs.

**Web books — passed:**

- Actual normal custom password login using a disposable Development fixture, not a demo-token shortcut.
- List/search, add a text-only book, view metadata, edit author/category/text/description, archive/restore, dirty edit/discard, exact typed-delete confirmation, success feedback and UI refresh.
- Development DB readbacks proved the created/edited fields and status transitions; deletion was confirmed by exact fixture ID/title.
- Empty required-title validation blocked creation. Pending delete controls were disabled; a second submit was not issued.
- Desktop 1440×900, tablet 768×1024 and narrow 375×812 had no horizontal overflow. Narrow dialog footer actions were reachable and list scroll position was retained.
- The details view displays metadata/description; the edit form, not the details drawer, exposes the full stored text body. This was not silently represented as an in-drawer reader.

**Expo-web Mobile books — passed after routing correction:**

- Before login, the served bundle's Development API origin was verified and a request-abort guard prohibited production/non-Development API calls.
- Actual fixture login, list/search, required-title validation, create, details/edit, persisted metadata/text changes, archive/restore, dirty edit/discard and delete all completed successfully.
- Development DB checks matched the persisted content/status changes and confirmed fixture/bookmark deletion.
- The 375×812 sheet retained reachable primary/cancel actions during form scrolling. A 430×932 library view had no horizontal overflow.
- All recorded resumed Mobile API calls went to the verified Development origin. Production/non-Development guard-hit counts were zero.
- Limited read-only navigation smoke also rendered Mobile home, analytics and public terms. Student path selection was not forced under an admin identity.
- The tester observed a non-blocking stale generic validation banner; the field-change handler was corrected locally afterward. No additional full browser pass was run for this straightforward message-state fix.

**Cleanup and warnings:**

- Both exact book fixtures were deleted. The disposable admin and its two associated session/token rows were removed; final Development checks found no remaining fixture user/session/book/bookmark rows.
- No existing account/master credential was changed, and no shared-IP security history was deleted.
- Non-blocking browser warnings: password input outside a form; React Native Web `useNativeDriver` JavaScript fallback. Neither prevented the demonstrated book workflow.
- Physical Native execution, storage upload/media playback and native sharing were not part of this browser result.

**Focused placement acceptance — blocked, not failed UI:**

- A focused continuation attempted to arrange an honest disposable pending-placement fixture after reconfirming the explicit Development database identity.
- The real `admin.placementList` requires both pending placement status **and a non-null placement video URL**.
- No authorized active disposable QA placement-video object or local video was available. A placeholder URL, borrowed real-user video or fabricated storage proof was not used.
- This browser approval did not authorize storage uploads or additional external-service use. The tester stopped before creating fixtures or entering the review workflow.
- Consequently approval, no-reason rejection, canonical level selection, review hook transitions, sticky actions and KPI refresh have **source/test-contract evidence only**, not a paired browser success claim.
- No placement fixture writes, production requests, borrowed user media or leftover placement test accounts resulted from that continuation.

### Important safety incident disclosed

Before the fix, the first Mobile fixture-login attempt unintentionally went to the release API because its preview bundle fell back to the configured production domain. It failed with HTTP 401. The tester stopped immediately, before Mobile library access or any book mutation. That login may have created a production security-attempt entry; it was not inspected or deleted.

The subsequent check was guarded and made no login/API request while the bundle was still stale. After the Development startup and cache correction, a cheap served-bundle check confirmed the intended Development origin before browser testing resumed. The successful final Mobile run made no further production-directed API calls.

### Still not performed

- Signed-in paired CRUD outside the demonstrated text-book workflow, and placement/KYC/promotion approval/rejection scenarios.
- Cross-role denied-operation tests.
- Representative visual/interaction review of every supervision module beyond the tested books views and limited Mobile smoke.
- Physical iOS/Android keyboard, safe-area, media, share-sheet or WebRTC checks.
- Actual Push delivery, scheduled delivery, external media/storage acceptance or production verification.

## Final acceptance fields — current evidence

```text
WEB_SUPERVISION_FEATURES:
Home, students/teachers, supervisor accounts, placement/KYC, schedules/bookings,
session monitoring/observer, books, levels, Sharia, assessments, muftis/fatwas,
promotions, certificates, analytics, notification management/inbox, audit, settings.

MOBILE_SUPERVISION_FEATURES:
Equivalent routes and canonical operation surfaces exist in the audited modules;
the known path/terms and Sharia-booking entry gaps were implemented.
Paired text-book browser acceptance passed; other modules remain source-level
or limited smoke evidence, not completed runtime acceptance.

WEB_ONLY_ACTIONS_REMAINING:
No confirmed missing business action in the compared control surfaces.
Exhaustive paired runtime button/form/permission verification remains outstanding;
this is not a certified zero-gap count.

MOBILE_ONLY_ACTIONS_REMAINING:
No new privileged Mobile-only operation introduced.
Native sharing, pickers and sheets are presentation adaptations.

MISSING_MOBILE_SCREENS:
Known /student/path and /terms omissions corrected.
No additional missing route confirmed in the inventoried modules.
Books/home/analytics and public terms reachability verified; other routes remain
unverified in this browser pass.

MISSING_WEB_SCREENS:
None identified relative to the canonical current Web capability inventory.

FORM_FIELD_PARITY: FAIL — final paired form acceptance not run
BUTTON_ACTION_PARITY: FAIL — final paired action acceptance not run
STATUS_WORDING_PARITY: FAIL — books reviewed, exhaustive rendered Arabic review not run
VALIDATION_PARITY: FAIL — book required-field checks passed, other invalid-input scenarios not run
AUTHORIZATION_PARITY: FAIL — canonical protected calls retained, denied-role tests not run
SEARCH_FILTER_PARITY: FAIL — book search passed on both; exhaustive module/filter acceptance not run
CRUD_PARITY: FAIL — real book round trip passed on both; other administrative CRUD not demonstrated
PLACEMENT_REVIEW_PARITY: FAIL — source workflow fixed, signed-in media/review not demonstrated
SESSION_MANAGEMENT_PARITY: FAIL — schedule controls aligned, actual booking/observer not demonstrated
CONTENT_MANAGEMENT_PARITY: FAIL — paired books passed; levels/Sharia/assessment workflows not demonstrated
VISUAL_DESIGN_PARITY: FAIL — tested book viewports pass; other modules and Native devices not fully reviewed
UX_FLOW_PARITY: FAIL — paired book workflow passed; remaining core workflows not demonstrated
WEB_MOBILE_SUPERVISION_PARITY: FAIL — books accepted in browser; full supervision/device acceptance remains open

FILES_CHANGED:
See exact Mobile/Web/documentation lists below; pre-existing changes were preserved.

TESTS:
Both application type checks passed. 43 Web/shared + 5 Mobile focused checks passed.
Real paired text-book browser workflow passed with Development DB readback and cleanup.
Placement browser acceptance is blocked by the missing authentic disposable video.

REMAINING_GAPS:
Authentic placement media fixture; remaining paired supervisor workflows;
physical iOS/Android checks; external media/upload/share and delivery verification.
```

`FAIL` here deliberately means **not accepted on the available evidence**, not that all implemented modules are known to be broken. There is no silent conversion of untested work into PASS.

## Files changed by this implementation pass

Pre-existing uncommitted supervision work was present when this pass began and was preserved. The following paths include this pass's edits; this does not claim ownership of their entire working-tree diff.

### Mobile

```text
artifacts/mobile/app/admin/_common.tsx
artifacts/mobile/app/admin/users.tsx
artifacts/mobile/app/admin/promotions.tsx
artifacts/mobile/app/admin/library.tsx
artifacts/mobile/app/admin/index.tsx
artifacts/mobile/app/admin/notifications.tsx
artifacts/mobile/app/admin/audit-log.tsx
artifacts/mobile/app/admin/qiraat.tsx
artifacts/mobile/app/admin/schedules.tsx
artifacts/mobile/app/admin/sessions-monitoring.tsx
artifacts/mobile/app/student/path.tsx
artifacts/mobile/app/student/quran.tsx
artifacts/mobile/app/student/booking.tsx
artifacts/mobile/app/student/sharia/[subject]/[level].tsx
artifacts/mobile/app/terms.tsx
artifacts/mobile/components/navigation-menu.tsx
artifacts/mobile/lib/sharia-booking.ts
artifacts/mobile/package.json
artifacts/mobile/metro.config.js
```

### Web

```text
artifacts/tabyan/src/pages/admin/AdminUsers.tsx
artifacts/tabyan/src/pages/admin/AdminPromotions.tsx
artifacts/tabyan/src/pages/admin/AdminAnalytics.tsx
artifacts/tabyan/src/pages/admin/AdminAuditLog.tsx
artifacts/tabyan/src/pages/admin/AdminStudentsReview.tsx
artifacts/tabyan/src/pages/admin/AdminNotifications.tsx
artifacts/tabyan/src/pages/admin/AdminQiraat.tsx
artifacts/tabyan/src/pages/admin/AdminLevels.tsx
artifacts/tabyan/src/pages/admin/AdminMuftis.tsx
artifacts/tabyan/src/pages/admin/AdminSettings.tsx
artifacts/tabyan/src/pages/admin/AdminFatwas.tsx
artifacts/tabyan/src/pages/admin/AdminSharia.tsx
artifacts/tabyan/src/pages/admin/AdminAssessments.tsx
artifacts/tabyan/src/pages/admin/AdminSchedules.tsx
artifacts/tabyan/src/pages/admin/supervision-parity.test.ts
```

### Documentation

```text
docs/TABYAN_SUPERVISION_PARITY_AUDIT.md
.agents/memory/stage5-screen-parity.md
.agents/memory/tabyan-development-fixture-safety.md
```

## Remaining acceptance work and exact blockers

1. **Remaining signed-in paired acceptance:** the approved browser pass proved the text-book journey. Other administrative CRUD, reviews, filters, notifications, booking and observer work were not driven through paired success/failure scenarios. No global PASS is inferred from book acceptance or route smoke.
2. **Real devices:** this workspace pass has no physical iOS/Android execution evidence. Browser mobile emulation would still not prove Native keyboard, media/share-sheet, permissions or WebRTC behavior.
3. **Protected placement media and observer sessions:** require an authorized fixture and actual playable media/session. The placement list excludes pending fixtures without a video URL, and no authorized disposable placement video was available. Placeholder URLs, real-user media and fake attachment proofs were not used; storage uploads were outside this approval. That is the exact blocker for the attempted review-browser continuation. Observer sessions likewise need a real authorized live session.
4. **All surfaced errors and labels:** code paths were improved and book validation was exercised, but exhaustive fault injection and rendered Arabic review remain outstanding.
5. **Student path/Sharia booking:** the code/helper tests cover the new entries and filters, but an actual student-role navigation/booking completion was not performed. The public terms content was rendered successfully; its link interactions were not exhaustively tested.

These are remaining steps of the same parity request, not separately completed work or a reason to publish.

## Cost and scope disclosure

- Intentionally invoked paid external APIs/inference/GPU: **none in this parity pass**.
- New paid services, paid builds, production deployment/publishing: **none**.
- Browser testing subagent: **explicitly approved and used**; the same tester was continued for the safety-gate resolution and focused Mobile routing fixes. The successful Web book pass was not repeated.
- Verification used installed dependencies, targeted type checks/tests and existing previews. No dependency reinstall or full application build was required.
- A public-route screenshot and browser screenshot evidence were captured; limitations and completed flows are recorded above.
- Exact Replit credit/billing consumption is **not observable here**; zero actual billing is not claimed.
- No additional services, paid builds or external paid APIs were invoked. Exact browser-agent credit usage remains unknown. This approval is not treated as permission for production operations or an unlimited new test campaign.
