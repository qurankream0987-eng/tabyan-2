# Tabyan — Apple Build 6 Review Readiness Report

**Audit date:** 2026-09-04  
**Audit scope:** source/configuration review, local technical gates, production
endpoint probe, and release-document preparation  
**Important limitation:** no EAS Build, App Store submission, or physical-iPhone
test was started by this audit.

## Final decision

```text
PREVIOUS_REJECTION: GUIDELINE_2_1_INFORMATION_NEEDED

SIZE_GATE: PASS
APP_STORE_PREFLIGHT: PASS
MUSHAF_RELEASE_READY: PASS_FOR_BUNDLED_STRATEGY; PHYSICAL_RENDERING_NOT_TESTED
ACCOUNT_REGISTRATION: CODE_PRESENT; REAL_DEVICE_NOT_TESTED
LOGIN: CODE_PRESENT; PRODUCTION_REVIEW_ACCOUNT_NOT_VERIFIED
ACCOUNT_DELETION: UI_AND_SERVER_PATH_PRESENT_AFTER_FIX; REAL_DEVICE_NOT_TESTED
REVIEW_ACCOUNTS: FAIL; DEDICATED_ACCOUNTS_NOT_VERIFIED
CAMERA_FLOW: CODE_PRESENT; REAL_DEVICE_REQUIRED
MIC_FLOW: CODE_PRESENT; REAL_DEVICE_REQUIRED
LOCATION_FLOW: CODE_PRESENT; REAL_DEVICE_REQUIRED
PLACEMENT_FLOW: CODE_PRESENT; REAL_DEVICE_AND_ADMIN_PLAYBACK_REQUIRED
RECITATION_FLOW: CODE_PRESENT; PROVIDER_AND_REAL_DEVICE_REQUIRED
PRODUCTION_API: EXTERNAL_VERIFICATION_REQUIRED
APP_REVIEW_NOTES_READY: YES_DRAFT_WITH_PLACEHOLDERS
PHYSICAL_DEVICE_VIDEO_PLAN_READY: YES
PHYSICAL_DEVICE_VIDEO_RECORDED: NO
REAL_IPHONE_GATE: NOT_TESTED

IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
IOS_BUILD: 6
VERSION: 1.0.0

APPLE_REVIEW_READINESS: FAIL
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```

The code-side deletion blocker found during this audit was fixed in the Mobile
UI: account settings now provide an explicit confirmation field, call the
server deletion mutation, clear the local session, and return to login. This
fix still requires real-iPhone evidence before the release gate can become
PASS.

## Previous Apple Rejection

Build 5 was rejected under **Guideline 2.1 — Information Needed — New App
Submission**, with Apple asking for evidence and information about app
completeness. The request was not limited to one crash or one screen. It
requires a physical-device recording and a complete review package.

## Exact Guideline 2.1 Requests

Apple asked for:

1. A physical-device recording beginning at app launch and showing typical
   flows, including registration, login, account deletion, paid content where
   applicable, user-generated-content reporting/blocking where applicable, and
   sensitive permissions.
2. The physical devices and OS versions tested.
3. A description of the problem solved, value provided, and target audience.
4. Setup and access instructions with review accounts.
5. An inventory of external services used by core functionality.
6. Regional differences or a statement of consistent behavior.
7. Documentation/authorization for regulated services or protected
   third-party material.

The physical recording plan is in
`docs/APPLE_BUILD6_PHYSICAL_DEVICE_VIDEO_SCRIPT.md`.

## Build 6 Identity

| Field | Locked value | Status |
|---|---|---|
| Existing App Store app | تبيان القرآني | Must reuse |
| iOS Bundle ID | `app.replit.tbyan` | PASS in `artifacts/mobile/app.json` |
| Android package | `com.tabyan.app` | PASS in `artifacts/mobile/app.json` |
| Expo owner | `abdalrhmanq8` | Locked by release handoff |
| Expo project | `mobile` | Locked by release handoff |
| Expo project ID | `bcac43ba-905a-4b13-a834-b36051da4da6` | PASS in config |
| Version | `1.0.0` | PASS |
| iOS build | `6` | PASS |

No new App Store app, Apple Identifier, Expo project, or duplicate Repl was
created.

## Archive Size Safety

The current preflight was rerun in dry-run mode:

```text
PHYSICAL_WORKSPACE_SIZE_BYTES: 3615756288
INTERNAL_SAFE_TARGET: <= 3800000000
SIZE_GATE: PASS
APP_STORE_PREFLIGHT: PASS
FILES_DELETED_BY_PREFLIGHT: 0
```

The active workspace remains clean. Recovery archives, ZIP backups, old
exports, and temporary build artifacts were not restored into the active
workspace. The preflight identified Git, dependency, generated output, and
ffprobe files as retained/review items; it did not identify a reason to remove
QCF runtime assets.

The release strategy currently remains **bundled native QCF**, not remote QCF:
the native artifact contains the verified page data and fonts. Do not switch to
remote delivery for Build 6 unless a separately tested integrity/checksum,
cache, offline, and failure-recovery strategy is ready.

## Feature Completeness

Source/configuration evidence shows the following reviewer-visible surfaces:

| Capability | Source status | Release evidence status |
|---|---|---|
| Mushaf UI and Quran content | Present | Physical rendering not tested |
| 604-page QCF package | Present and verified | Device navigation not tested |
| Student role | Present | Real account/device not tested |
| Teacher role | Present | Role account/device not tested |
| Supervisor/admin role | Present | Role account/device not tested |
| Authentication | Present | Production journey not tested |
| Placement | Present | Real camera/upload/playback not tested |
| Live recitation | Present | Provider/device sequence not tested |
| Notifications | Present | Device delivery not tested |
| Account management | Present | Deletion now wired; device not tested |

No diagnostic placeholder or fake-success route should be accepted in the
release package.

## Account Lifecycle

### Registration, login, password, restore, logout

The Mobile app exposes registration and login routes and uses the shared
authentication API. Session persistence is routed through the project storage
layer, and 401 responses invalidate the session per operation. These are code
observations, not physical-device PASS results.

### Account deletion

The server exposes `auth.deleteAccount` with an exact confirmation phrase,
rejects admin deletion from the client path, invalidates tokens and
credentials, and deletes the user transactionally.

The Mobile UI previously only showed a message saying deletion would be
requested later. That was insufficient for Apple’s account-deletion review.
It is now changed so that:

1. Account → Settings exposes the permanent deletion warning.
2. The user must type `حذف حسابي`.
3. The authenticated server mutation is called.
4. Local session data is cleared.
5. The app routes to login.
6. Server errors are shown rather than converted into fake success.

**Current status:** `CODE_READY / REAL_DEVICE_REQUIRED`. The flow remains a
release blocker until demonstrated on a real iPhone against production.

### Obsolete OTP

The current registration design does not require phone OTP for student
registration. Login/teacher verification code paths remain separate where
applicable. Source audit found no obsolete student-registration OTP screen.

```text
OLD_OTP_FLOW_PRESENT: NO (source audit)
```

## Review Accounts

Apple access is needed for every role that is visible or necessary to inspect
the submitted app:

| Role | Required status | Current status |
|---|---|---|
| Student | Required | NEEDED — dedicated credentials not verified |
| Teacher | Required if exposed to review | NEEDED — dedicated credentials not verified |
| Supervisor | Required if exposed to review | NEEDED — dedicated credentials not verified |

Passwords must be supplied through the secure review-account process and must
not be committed to Git, this report, or App Review Notes files. Accounts must
have no OTP dependency, remain valid throughout Apple’s review window, and
contain safe role-specific test data.

## Physical Device Test Matrix

No real iPhone evidence was available during this audit. Simulator, Metro,
Expo web, and source inspection do not satisfy this gate.

| Flow | Device | iOS | Result | Evidence |
|---|---|---|---|---|
| Cold launch | `[IPHONE_MODEL]` | `[IOS_VERSION]` | NOT_TESTED | `[VIDEO/TICKET]` |
| Registration | same | same | NOT_TESTED | `[EVIDENCE]` |
| Login | same | same | NOT_TESTED | `[EVIDENCE]` |
| Logout | same | same | NOT_TESTED | `[EVIDENCE]` |
| Session restore | same | same | NOT_TESTED | `[EVIDENCE]` |
| Account deletion | same | same | NOT_TESTED | `[EVIDENCE]` |
| Home/navigation | same | same | NOT_TESTED | `[EVIDENCE]` |
| Mushaf | same | same | NOT_TESTED | `[EVIDENCE]` |
| QCF page rendering | same | same | NOT_TESTED | `[EVIDENCE]` |
| Mushaf zoom | same | same | NOT_TESTED | `[EVIDENCE]` |
| Page navigation, including 604 | same | same | NOT_TESTED | `[EVIDENCE]` |
| Bookmarks, if exposed | same | same | NOT_TESTED | `[EVIDENCE]` |
| Prayer times | same | same | NOT_TESTED | `[EVIDENCE]` |
| Qibla | same | same | NOT_TESTED | `[EVIDENCE]` |
| Location allowed | same | same | NOT_TESTED | `[EVIDENCE]` |
| Location denied | same | same | NOT_TESTED | `[EVIDENCE]` |
| Camera permission | same | same | NOT_TESTED | `[EVIDENCE]` |
| Microphone permission | same | same | NOT_TESTED | `[EVIDENCE]` |
| Placement recording | same | same | NOT_TESTED | `[EVIDENCE]` |
| Placement preview/retry | same | same | NOT_TESTED | `[EVIDENCE]` |
| Placement upload/finalize | same | same | NOT_TESTED | `[EVIDENCE]` |
| Placement review playback | same | same | NOT_TESTED | `[EVIDENCE]` |
| Notifications | same | same | NOT_TESTED | `[EVIDENCE]` |
| Recitation | same | same | NOT_TESTED | `[EVIDENCE]` |
| Student role | same | same | NOT_TESTED | `[EVIDENCE]` |
| Teacher role | same | same | NOT_TESTED | `[EVIDENCE]` |
| Supervisor role | same | same | NOT_TESTED | `[EVIDENCE]` |

```text
REAL_IPHONE_GATE: NOT_TESTED
```

## Sensitive Permissions

The Expo configuration contains clear usage descriptions:

- Camera: recording the placement test.
- Microphone: recording recitation and live correction.
- Location: prayer times and Qibla direction.

The feature code requests permissions when the relevant feature is opened, not
at unrelated app launch. Placement has a denied-permission explanation and a
settings fallback. Prayer/Qibla show an error state when location is denied.
Native recitation surfaces a microphone-permission error.

These are code-level observations. The following remain unverified until
physical testing:

- permission prompts appear at the correct moment;
- denial never crashes or dead-ends;
- iOS generated Info.plist matches the config;
- camera recording includes usable audio;
- production location and prayer API behavior is available.

## Placement Video

The source flow contains record, preview, retry/delete, upload progress,
private object-storage URL acquisition, PUT upload, server finalization, and
the student submission mutation. The client refuses empty files and does not
mark success when upload/finalization fails.

Required evidence still missing:

1. actual iPhone recording;
2. actual iPhone preview;
3. retry path;
4. production upload;
5. server persistence;
6. supervisor/admin review playback.

```text
PLACEMENT_RECORD: REAL_DEVICE_REQUIRED
PLACEMENT_PREVIEW: REAL_DEVICE_REQUIRED
PLACEMENT_UPLOAD: REAL_DEVICE_REQUIRED
PLACEMENT_SERVER_FINALIZE: REAL_DEVICE_REQUIRED
ADMIN_PLAYBACK: REAL_DEVICE_REQUIRED
```

Admin playback is a release blocker if a submitted video cannot actually be
played by the supervisor.

## Recitation / Live Features

The Mobile flow includes microphone permission, a server-created session,
WebSocket connection, PCM audio capture, partial/final transcript callbacks,
word reveal, pause, resume, end, and cancel handling. It also cancels a
server session when startup fails after a session was created.

The feature depends on a configured production provider. The source includes
OpenAI, Speechmatics, and NVIDIA provider paths, but provider availability and
Arabic configuration must be verified in production. The app must not claim a
successful live session when the provider or WebSocket failed.

Required evidence remains missing for all of:

- microphone permission;
- WebSocket connection;
- PCM audio;
- partial result;
- final result;
- word reveal;
- pause/resume;
- end/cancel.

## External Services

The following inventory is based on source/configuration inspection only.
Actual credentials are not recorded here.

| Service | Purpose | Data sent | Auth method | Core functionality | Region dependency |
|---|---|---|---|---|---|
| Replit production backend | API, auth, TRPC, placement, recitation session orchestration | Account/session requests, placement metadata, recitation events | Session bearer token | Yes | Production availability |
| PostgreSQL | User, role, learning, session, notification, and submission persistence | Structured application records | Server `DATABASE_URL` | Yes | Hosting/DB availability |
| Replit/App Object Storage | Private placement video storage and review playback | Video bytes and object paths | Server-issued upload URL plus authenticated finalize | Yes for placement | Storage availability and access policy |
| Expo/EAS services | Native app packaging/runtime distribution | Build metadata and bundle artifacts | Expo project configuration/account | Required for release, not runtime core | Apple/Expo service availability |
| Apple services | iOS runtime permission model, App Store/TestFlight review and distribution | App binary, metadata, device permission interactions | Apple account/signing outside source | Required for iOS release | Apple availability |
| `api.aladhan.com` | Prayer-time calculation | Latitude, longitude, date, calculation method | Public HTTPS request in current client | Yes for current prayer-times screen | Network/service availability; location dependent |
| OpenAI Realtime | Live speech transcription provider when selected | Live PCM audio and session protocol messages | Server-held API key | Yes when live recitation is enabled | Provider/region/quota dependent |
| Speechmatics Realtime | Alternative live transcription provider when selected | Live PCM audio and session protocol messages | Server-held API key | Yes when selected | Provider/region dependent |
| NVIDIA hosted streaming | Alternative speech provider when selected | Live audio and provider protocol messages | Server-held API key | Not assumed available until Arabic endpoint is confirmed | Provider/model availability |
| `alquran.cloud` | Web daily-verse source/fallback path found in shared server code | Verse lookup request | Public HTTPS request | Only for daily verse behavior | Network/service availability |

The final App Review Notes must state only the services actually enabled in the
production Build 6 configuration. Unused provider paths must not be presented
as active core dependencies.

## Regional Behavior

```text
REGIONAL_DIFFERENCES: YES
```

Known differences/dependencies:

- Prayer times use the device’s latitude/longitude and a calculation method;
  results therefore vary by location and date.
- Qibla uses the device location and a fixed Kaaba coordinate.
- Phone registration uses a country selector and worldwide E.164 validation.
- Content and learning-path availability may depend on server data and role.
- Speech provider availability, quotas, and network routing may vary.
- Core account, Mushaf, and learning navigation should operate consistently
  across supported regions when the production backend and required services
  are reachable.

The final reviewer statement should not say “no regional differences” because
prayer/Qibla outputs and service availability are location-dependent.

## Content Rights

The source contains the following content categories:

| Content | Observed source | Rights status |
|---|---|---|
| Quran text | Native QCF page data and shared Quran content paths | OWNER/LICENCE DOCUMENTATION REQUIRED |
| QCF rendering/fonts | 604-page native QCF asset package | UNKNOWN in current repo audit |
| Books/library content | App/library and educational content paths | OWNER/LICENCE DOCUMENTATION REQUIRED |
| Religious lessons | Sharia/educational content paths and database content | OWNER/LICENCE DOCUMENTATION REQUIRED |
| Third-party APIs | Aladhan, alquran.cloud, selected speech providers | Provider terms/authorization must be retained |

No reliable license or permission document was found in the inspected mobile,
web, shared, or docs paths that is sufficient to claim rights for every
protected content source. This is an owner-review blocker before submission:
attach or obtain the applicable authorization, or remove any unsupported
content from the submitted app and metadata.

## App Review Notes Draft

The following draft is safe to complete after the remaining placeholders are
verified. It intentionally does not include passwords.

> **What Tabyan is:** Tabyan is an Arabic Quran-learning application for
> students who want to read the Quran, follow structured learning paths,
> submit a placement recitation, and—when eligible—practice live recitation
> feedback.
>
> **Target users:** Arabic-speaking Quran learners and the teachers/supervisors
> who review learning and placement submissions.
>
> **Core functionality:** authentication, account management, 604-page Mushaf,
> learning paths, progress, notifications, placement-video recording and
> upload, prayer times, Qibla, and live recitation when enabled in production.
>
> **Review account:** Use
> `[APPLE_REVIEW_STUDENT_USERNAME]` with password supplied through the secure
> App Store Connect review field. No OTP is required for this review account.
> If teacher/supervisor access is required, use
> `[APPLE_REVIEW_TEACHER_USERNAME]` and
> `[APPLE_REVIEW_SUPERVISOR_USERNAME]`.
>
> **Account deletion:** Open Account → Settings → Delete account, read the
> permanent-deletion warning, type `حذف حسابي`, and submit. The app calls the
> authenticated deletion endpoint, clears the session, and returns to login.
>
> **Camera/microphone:** Open the placement test to request camera and
> microphone access. Open live recitation to request microphone access. The
> app requests access only when the relevant feature is used. If permission is
> denied, the app shows a fallback/error message.
>
> **Location:** Open Prayer Times or Qibla to request location access. Prayer
> times vary by location/date; Qibla is calculated from the device location.
> Denial shows a fallback/error state.
>
> **External services:** Replit production API, PostgreSQL, private object
> storage, Expo/Apple distribution services, Aladhan for prayer times, and
> only the speech provider(s) enabled in the production environment.
>
> **Regional behavior:** Prayer and Qibla values vary by device location.
> Phone-country validation supports international numbers. Core account,
> Mushaf, and learning features are intended to behave consistently wherever
> the production services are reachable.
>
> **Content rights:** `[INSERT VERIFIED QURAN/QCF/EDUCATIONAL CONTENT RIGHTS
> STATEMENT BEFORE SUBMISSION]`.
>
> **Physical testing:** `[IPHONE_MODEL]`, iOS `[IOS_VERSION]`; all claims must
> be replaced with actual device evidence.

## Physical Device Video Plan

Ready as a plan in:
`docs/APPLE_BUILD6_PHYSICAL_DEVICE_VIDEO_SCRIPT.md`.

```text
PHYSICAL_DEVICE_VIDEO_PLAN_READY: YES
PHYSICAL_DEVICE_VIDEO_RECORDED: NO
```

## Metadata Audit

| Metadata item | Current evidence/status |
|---|---|
| App name | Native config says `تبيان`; App Store value needs owner confirmation |
| Description | Must match the actual submitted iOS feature set |
| Keywords | Not verified in source |
| Screenshots | Not verified; must not show absent features |
| Support URL | `https://tibyanquran.com/support` configured; external response not verified |
| Privacy URL | `https://tibyanquran.com/privacy` configured; external response not verified |
| Marketing URL | Not verified |
| Category | Not verified |
| Age rating | Not verified |
| App Privacy | Not verified |
| Review contact | Not verified |
| Review accounts | Needed; not verified |

All URLs must be checked from outside the development environment before
submission. The current container could not resolve `tibyanquran.com`, so no
external HTTP PASS is claimed.

## Production Backend

The local API workflow is running and its logs show successful local
`/api/healthz` requests with HTTP 200. This does **not** prove the production
backend is available to Apple.

An external probe of:

- `https://tibyanquran.com/`
- `https://tibyanquran.com/privacy`
- `https://tibyanquran.com/support`
- `https://tibyanquran.com/api/healthz`

failed in this environment at DNS resolution (`Could not resolve host`).
Therefore:

```text
PRODUCTION_WEB: NOT_VERIFIED
PRODUCTION_API: NOT_VERIFIED
AUTH_BACKEND: NOT_VERIFIED
OBJECT_STORAGE: NOT_VERIFIED
```

Apple must not depend on Preview or Development. Repeat these checks from a
network that can resolve the production domain and verify authenticated
placement/object-storage behavior separately.

## Technical Release Gates

| Gate | Result | Evidence |
|---|---|---|
| App Store preflight | PASS | 3,615,756,288 bytes; dry-run; no deletion |
| Size gate | PASS | Under 3,800,000,000-byte internal target |
| Native Mushaf verifier | PASS | 604 pages, 604 canonical word files, 604 TTF fonts |
| Mobile typecheck | PASS | `tsc -p artifacts/mobile/tsconfig.json --noEmit` |
| API build | PASS | API bundle and required ffprobe/protobuf outputs created |
| Web build | PASS | Completed with the required project `PORT` and registered `BASE_PATH` |
| Expo config | NOT_RUN_IN_THIS_AUDIT | Must be rerun before Build 6 |
| iOS Metro bundle | NOT_RUN | Must be run in final production configuration |
| API health | LOCAL PASS / PRODUCTION NOT_VERIFIED | Local workflow 200; public DNS probe failed |
| `git diff --check` | PASS | No whitespace errors |

The web-build command correctly requires both `PORT` and `BASE_PATH`. After
running it with the registered base path, the build completed successfully.

## Remaining Blockers

1. `REAL_IPHONE_GATE` is `NOT_TESTED`; simulator/Metro evidence cannot replace
   a physical iPhone.
2. The physical video requested by Apple has not been recorded.
3. Dedicated student, teacher, and supervisor review accounts are not
   verified as valid and accessible.
4. Production domain/API/storage availability is not externally verified.
5. Placement upload and supervisor playback are not verified on a real device
   against production.
6. Live recitation provider availability and the full audio/result sequence are
   not verified on a real device.
7. Metadata, screenshots, App Privacy, support/privacy URLs, and review contact
   are not fully audited.
8. Content-rights documentation for Quran/QCF/educational material is unknown
   and requires owner confirmation.
9. Final Expo config, iOS Metro bundle, and complete web build gates must be
   rerun in the correct artifact environment.

## Final Decision

```text
CODE_GATE: FAIL / INCOMPLETE_RELEASE_EVIDENCE
APPLE_REVIEW_READINESS: FAIL
REAL_IPHONE_GATE: NOT_TESTED
READY_TO_CREATE_BUILD_6: NO
```

Do not start EAS Build 6, TestFlight upload, or App Review submission until the
remaining blockers above are closed and the final report is updated with
evidence. In particular, do not convert `NOT_TESTED`, `UNKNOWN`, or
`NOT_VERIFIED` into `PASS` based on local workflows or simulator behavior.

## Final Gate Reconciliation — 2026-09-04

This section supersedes earlier interim labels in this report and reflects the
latest audit run.

```text
AUTOMATED_CODE_GATE: PASS
SIZE_GATE: PASS
PRODUCTION_GATE: EXTERNAL_VERIFICATION_REQUIRED
CONTENT_RIGHTS_GATE: FAIL
APPLE_METADATA_GATE: MANUAL_ACTION_REQUIRED
REVIEW_ACCOUNT_GATE: FAIL
ACCOUNT_DELETION_GATE: PASS_CODE_ONLY_REAL_DEVICE_REQUIRED
PLACEMENT_CODE_GATE: PASS
RECITATION_CODE_GATE: PASS
EXPO_CONFIG_FINAL: PASS
IOS_METRO_BUNDLE_FINAL: PASS
REAL_IPHONE_GATE: NOT_TESTED
VIDEO_GATE: NOT_RECORDED
READY_FOR_REAL_IPHONE_TEST: YES
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```

### Evidence added in this reconciliation

- `expo config --json` matched the locked Bundle ID, build number, version,
  Android package, and Expo project ID.
- `expo export --platform ios` completed successfully and included the native
  Mushaf assets.
- Production database inspection was read-only. It confirmed active role
  records but did not confirm dedicated Apple Review accounts or login
  credentials.
- External requests to `tibyanquran.com` were blocked by DNS resolution in the
  current environment. This is recorded as environment-blocked and requires
  verification from a real external network.
- The five detailed supporting documents are:
  `APPLE_BUILD6_CONTENT_RIGHTS_AND_SOURCES.md`,
  `APPLE_BUILD6_APP_STORE_METADATA_AUDIT.md`,
  `APPLE_BUILD6_REVIEW_ACCOUNTS_AUDIT.md`,
  `APPLE_BUILD6_APP_REVIEW_NOTES_FINAL_DRAFT.md`, and
  `APPLE_BUILD6_REAL_IPHONE_FINAL_CHECKLIST.md`.

The next user action is **real iPhone testing plus Apple’s requested physical
recording**. Build 6 must remain unstarted until that evidence and the
production/content/metadata/account gates are closed.