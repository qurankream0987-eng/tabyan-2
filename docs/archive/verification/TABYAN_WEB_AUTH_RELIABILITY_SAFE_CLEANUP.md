# TABYAN — Web auth reliability + safe cleanup

## Scope and evidence

Web and server only. No production database access or modification, no schema
change, no Native edits, no deployment, no paid APIs. Unit-test fixtures were
in-memory. The approved browser round additionally used four temporary Development
accounts after matching the runtime identity to the explicitly Development SQL
capability. Exact fixture and identity-owned rows were removed and verified absent.
No valid passwords, tokens, hashes, cookies or environment-secret values were emitted.

Two pre-fix regression tests failed against the original implementation:

1. A 403 permission denial erased a valid student session.
2. A queued 401 handler, deferred through dynamic import, erased the newly
   committed administrator session and navigated to Guest.

These demonstrate concrete client defects, not a claim that every production
failure was reproduced. One browser round was explicitly approved and performed.

## Exact login trace

| Stage | Student | Teacher | Supervisor/admin |
|---|---|---|---|
| Submit | StudentRegisterFlow.submitLogin | TeacherRegisterFlow.submitPasswordLogin | AdminGateModal.submitAccount |
| Identifier dispatch | loginIdentifierTarget | loginIdentifierTarget | username |
| Client request | trpc.auth.studentPasswordLogin / passwordLogin | same two existing server contracts | api.passwordLogin → trpcClient.auth.passwordLogin |
| Server | authRouter.studentPasswordLogin | studentPasswordLogin / passwordLogin | authRouter.passwordLogin |
| Validation | IP/identifier limits; bcrypt; role/activity checks | bcrypt and existing account rules | bcrypt; role/activity checks |
| Session persistence | issueToken in awaited DB transaction | issueToken awaited | authTokens, adminSessions and audit insertion awaited before success |
| Verify new identity | loginWebSession → explicit-token auth.me | same | same, requiring admin |
| Session resolution | createContext → authTokens/users | same | same + active adminSessions |
| Cache/store publication | authStore.set, clear previous private state, seed exact auth.me query key, notify | same | same |
| Navigation | finishLogin → /student/home (or authenticated server role) | finishLogin → /teacher | enter → /admin |
| Protected guard | AuthGate → token subscription + server me role | same | same |
| First page | StudentShell / StudentHome | TeacherShell / TeacherHome, existing onboarding gate preserved | AdminShell / AdminDashboard |

### Transport and timing

- This application uses bearer tokens, not authentication cookies. Cookie
  SameSite/Secure/Domain/Path are not applicable to this custom session contract.
- Both existing Web tRPC clients use the shared same-origin session fetch.
  credentials=include is retained; no host or deployment URL is hardcoded.
- The request token and local identity revision are captured before HTTP dispatch.
- Only an owned, authenticated 401 may clear the current session; public login
  errors stay in the form. Mixed HTTP 207 batches are checked per procedure.
- Identity is rechecked after asynchronous work. A pending login suppresses
  obsolete-session redirection. Logout and cross-tab identity changes invalidate
  pending login publication.
- Protected pages await me on reload. Freshly verified me is already cached before
  login notification, avoiding the old unauthenticated/role-hydration race.
- A database lookup exception now becomes an Arabic 500 rather than an invented
  401. Genuine missing/expired/revoked tokens remain rejected.
- There is no cookie dependency, automatic second login, timer-based workaround,
  editable-form role inference, or provider migration.

## Cleanup classification and proof

| Candidate | Classification | Decision/evidence |
|---|---|---|
| Old global handleAuthError | DEAD_CODE / replaced unsafe policy | Removed; ownership-blind 401/403 invalidation caused both failing regressions |
| api.completeProfile wrapper | DUPLICATE / SAFE_TO_REMOVE | Removed; no consumers, registration uses typed mutation hooks |
| api.adminLogin wrapper | DEAD_CODE / LEGACY_AUTH_CODE | Removed; no consumers; server procedure remains untouched |
| Duplicate unsafe raw error extraction | DUPLICATE | Shared Arabic error sanitizer used in current login paths |
| Web/server Google, Clerk, OIDC callbacks/providers | No ACTIVE_AUTH references found | No active runtime provider removal needed |
| users.googleId/replitAuthSub/clerkUserId | SCHEMA_LEGACY / MUST_PRESERVE | No changes |
| Historical provider comments and verification documents | COMMENT / MUST_PRESERVE | Historical evidence retained |
| Google storage/fonts/STUN/Play | UNRELATED / ACTIVE_CODE | Preserved |
| StudentAuthModal old development entry | UNKNOWN / DO_NOT_TOUCH | No consumers found, but prior audit protected it; retained rather than deleting on assumption |
| OAuth/Clerk variable names in workspace configuration | LEGACY_AUTH_CODE / UNKNOWN | No values read; no secrets deleted |
| Runtime routes, server adminLogin, old test scripts | ACTIVE_CODE or UNKNOWN | No route/server-procedure deletion without separate evidence |
| Dependencies | ACTIVE_CODE / UNKNOWN | No removals or upgrades; no Clerk/OAuth packages in the three relevant package manifests |
| QCF, Quran data/page map, media, uploads, migrations | DO_NOT_TOUCH | Preserved |
| Native/mobile artifact | DO_NOT_TOUCH | No source changes |
| Screenshot/benchmark/debug evidence and generated outputs | UNKNOWN or needed evidence | No file deletion |

Whole-project cleanup remained conservative: protected data and other artifacts
were excluded from edits; candidates without complete runtime/build/test proof
were retained. No mass formatting, dependency reinstall, secret change or broad
rewrite.

## Verification

- Focused Web tests: auth ownership, first-submit roles, cache-before-notify,
  double click, logout cancellation, account sequence, normalization, reload
  storage, permission/outage behavior, and Arabic error redaction.
- Focused server tests: password-login account guards and actual session context
  resolution with in-memory database fixtures.
- Web/server TypeScript, one final Web build and whitespace validation.
- Node tests do not substitute for browser acceptance. The approved pass proved
  Student A navigation/persistence/logout only. Other roles, sequential switching,
  and multi-tab behavior remain unverified in a real browser.

## Safety

### Measured local results

- Web: 21 focused tests passed (19 auth/cache + 2 drawer-role-dialog regressions).
- Server: 6 session-context tests plus 8 focused password-login tests passed.
- Web TypeScript: PASS. Server/shared TypeScript: PASS.
- Web build: PASS; one actual full build. The first command was rejected while
  loading configuration because managed PORT/BASE_PATH were missing; no build
  had started. Explicit local command settings resolved this without config edits.
- git diff --check: PASS.
- Original batch: Web/API workflows restarted once each. After the browser-found
  drawer fix, only Web was restarted; clean startup and final Web TypeScript passed.
- Public login modal screenshot: rendered normally, no runtime exception.
- Approved browser round: real Student A wrong-password rejection, first valid
  submit, credential/me HTTP 200, dashboard identity, reload, direct protected URL,
  Back/Forward, actual UI logout and logged-out reload all PASS.
- The round stopped at a real teacher-entry defect: the drawer returned null when
  closed, hiding its independently opened teacher modal. Teacher/admin/Student B
  first submits and sequential role switching remain UNVERIFIED in the browser.
- The drawer visibility was separated from its role dialogs. Two focused render
  regressions cover teacher/admin dialogs surviving drawer closure. No further
  browser round or full build was started; the prior build predates this small fix.
- Cleanup: all four fixture users and their identified profiles, tokens, admin
  sessions, audit/login-attempt rows verified absent. IP-only rate-limit security
  events were retained, not deleted by shared IP.
- An automatic intermediate tester snapshot showed the deliberately incorrect
  password string, not any valid credential. It was cleared immediately.

Files removed: 0. Unknown files deleted: NO. Dependencies removed: 0.
QCF/Quran/schema/production/user data/secrets changed: NO.
EAS/GPU/paid APIs/deployment/Publish: NO.
No full test suite or repeated full Web build.
Actual Agent credit accounting is not visible; zero billing is not claimed.

## TABYAN — WEB AUTH RELIABILITY + SAFE CLEANUP — Final report

PASS/FAIL below describes completed acceptance evidence. A FAIL qualified as
unverified is an incomplete acceptance check, not a claim that untested login fails.

| Required field | Result |
|---|---|
| AUTH ROOT CAUSE | Ownership-blind global 401/403 invalidation; late asynchronous rejection clearing a new admin session; identity/cache publication before verified server me; DB lookup failures misreported as unauthenticated. Browser also found the teacher modal hidden by the drawer's closed-state return. |
| Existing Account First-Login Bug | FIXED for the proven defects; existing-before-login Development student passed actual first valid submit. No production-account claim. |
| Supervisor Double-Login Bug | FIXED for the locally reproduced late-401 defect; actual supervisor browser acceptance is incomplete. |
| Session Commit | PASS: focused all-role checks and actual student credential/me sequence. |
| Auth Cache Refresh | PASS: exact me key seeded before identity notification; previous private cache cleared. |
| Role Resolution | PASS in focused all-role checks; student additionally verified in browser. |
| Student First Submit | PASS, real Development browser. |
| Teacher First Submit | FAIL / acceptance incomplete: entry defect fixed and render regression passed, but actual login was not submitted during the stopped round. |
| Supervisor First Submit | FAIL / acceptance incomplete: focused test passed; real browser submit not attempted. |
| Refresh Persistence | PASS for tested student browser; focused storage checks passed. |
| Logout | PASS for actual student UI logout, cleared identity and logged-out reload. |
| Account Switching | FAIL / browser acceptance incomplete; focused A → teacher → admin → B cache-isolation test passed. |
| Auth Loop | NONE in tested student Back/Forward/direct-URL/logout navigation; other roles unverified. |
| Google/Clerk Active Web Auth | REMOVED / no active runtime auth found; historical identity columns preserved. |
| Files Removed | 0. |
| Dead Code Removed | Obsolete ownership-blind global handler; unused api.adminLogin wrapper. |
| Duplicate Code Removed | Unused api.completeProfile wrapper; unsafe duplicated login-error extraction replaced by shared sanitizer. |
| Unused Dependencies Removed | 0; none deleted without sufficient proof. |
| Legacy Auth Cleanup | No active external auth provider/routes/packages found; historical schema/comments/secrets and unrelated Google services untouched. |
| Unknown Files Deleted | NO. |
| QCF Changed | NO. |
| Quran Data Changed | NO. |
| Database Changed | NO schema/production/pre-existing user-record changes. Temporary Development fixture/session/profile/audit data was created and exact-owned data removed; ordinary IP-only rate-limit events retained. |
| Production Changed | NO by this work. |
| User Data Deleted | NO existing user data; only our disposable fixture-owned rows removed. |
| Secrets Exposed | NO valid credentials or environment secrets; tester snapshot briefly showed its deliberately incorrect input. |
| Focused Auth Tests | 35 passed: 21 Web and 14 server. |
| Web TypeScript | PASS after final drawer fix. |
| Server TypeScript | PASS. |
| Web Build | PASS before final drawer visibility fix; final fix has focused render/TypeScript proof, not a second full build. |
| git diff --check | PASS after final code changes. |
| Paid APIs Used | NO external paid APIs. |
| GPU Used | NO. |
| Deployment | NO. |
| Publish | NO. |
| REPLIT CREDITS INTENTIONALLY CONSUMED | One potentially credit-consuming browser round explicitly approved by the user; actual credit usage is unknown. No zero-billing assertion. |
| UNNECESSARY FULL TEST RUNS | NO; no full suite, one actual full Web build. |
| FINAL VERDICT | PARTIAL: core proven defects repaired; live student acceptance passed, but teacher/supervisor/sequential browser acceptance and a build of the last small fix remain incomplete. |

STOP. No additional browser round, publishing or further cleanup was performed.
