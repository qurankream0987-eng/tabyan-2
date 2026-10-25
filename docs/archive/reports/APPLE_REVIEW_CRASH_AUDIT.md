# Apple Review Crash Audit

**Audit mode:** read-only evidence audit  
**Audit date:** 2026-09-07 (Asia/Riyadh)
**Scope:** current workspace, current Replit deployment, and retained Expo Launch metadata  
**Changes made:** this report only; no application, database, Apple, signing, or Expo configuration changes were made

## Executive summary

The available Expo Launch metadata contains one newer iOS workflow with status `SUCCESS`:

- Workflow run: `01a0787d-0241-7769-8b45-e0f612c8d443`
- Dashboard: https://expo.dev/workflows/01a0787d-0241-7769-8b45-e0f612c8d443
- Retained log characters: `0`

This proves that Expo reported a successful workflow, but it does **not** expose an IPA checksum, App Store Connect build record, Apple crash log, source commit used by the runner, or the final embedded `Info.plist`. The exact binary currently visible to Apple/TestFlight therefore cannot be independently identified from the available evidence.

The current production domain is healthy at audit time:

- `tibyanquran.com` resolves to `34.111.179.208`.
- `https://tibyanquran.com/` returns HTTP 200.
- `https://tibyanquran.com/api/healthz` returns HTTP 200 and `{"status":"ok"}`.
- `/privacy` and `/support` return HTTP 200.
- `www.tibyanquran.com` does not resolve; the app and release configuration use the apex domain, not `www`.

No Apple/TestFlight crash log was available. A crash cause cannot be asserted.

## APPLE BUILD INVESTIGATION

### APPLE BUILD

```text
Version: 1.0.0 (reported for rejected Build 5; also current source version)
Build: 5 (reported rejected build) / 6 (current source configuration)
Upload date: UNKNOWN
Processing date: UNKNOWN
Review submission date: UNKNOWN
Current review state: UNKNOWN
Bundle ID: app.replit.tbyan
Source commit: UNKNOWN for the Apple binary
Current workspace commit: f1c68d35544e7b79dd10add8f5c4079bbb4ad83f
Expo Launch workflow: 01a0787d-0241-7769-8b45-e0f612c8d443 (SUCCESS)
Source match confirmed: NO
```

Evidence and limitations:

- `docs/APPLE_BUILD6_REVIEW_READINESS_REPORT.md` identifies the previously rejected binary as Build 5, version 1.0.0.
- The current `app.json` identifies the local release configuration as Build 6, version 1.0.0.
- Retained Expo metadata identifies one successful iOS workflow but contains no build logs, source revision, package manifest, IPA checksum, upload timestamp, or App Store Connect build number.
- No App Store Connect/TestFlight export is present in the workspace.
- Therefore Build 5, the current Build 6 source configuration, and the successful Expo workflow must not be treated as the same binary without external Apple/Expo metadata.

```text
APPLE BUILD SOURCE MATCH: NOT CONFIRMED
```

### APPLE REVIEW

```text
Guideline: 2.1 — Information Needed — New App Submission
Device: UNKNOWN
iOS: UNKNOWN
Exact reproduction steps: UNKNOWN
Crash step: UNKNOWN
Review timestamp: UNKNOWN
Screenshot attachments: NOT AVAILABLE
Crash attachments: NOT AVAILABLE
```

The prior review-preparation source explicitly states that Apple had **not** reported a specific crash. It records a request for:

1. A physical-device screen recording.
2. Tested devices and OS versions.
3. App purpose, functionality, and target audience.
4. Review access/accounts.
5. External-service inventory.
6. Regional differences.
7. Regulatory or third-party-content documentation where applicable.

This is evidence of an information/completeness request. It is not evidence of a process crash.

### CRASH LOG

```text
CRASH LOG: NOT AVAILABLE
CRASH TYPE: UNKNOWN
TERMINATION REASON: UNKNOWN
CRASHING THREAD: UNKNOWN
LAST KNOWN ACTION: UNKNOWN
EXACT CRASH STEP: UNKNOWN
CRASH CONFIRMED BY LOG: NO
```

Searches performed:

- No `.crash` file was found.
- No `.ips` file was found.
- No TestFlight/App Store Connect diagnostic export was found.
- No Apple Review crash attachment was found.
- The successful Expo workflow has zero retained log characters.
- No crash/fatal/exception signature tied to an Apple review session was found in available Replit runtime log snapshots.

The historical `ARCHIVE FAILED` compiler output is a **build failure**, not an application process crash. A successful Expo workflow is also not proof that runtime launch and review flows are crash-free.

### SERVER CORRELATION

```text
SERVER CORRELATION: NOT POSSIBLE
```

There is no Apple review timestamp, crash timestamp, review-device identifier, request ID, review-account identifier, or backend trace ID. A reliable sequence such as launch → API request → error → client termination cannot be constructed.

Current HTTP 200 results only show that the service is healthy at audit time. They do not prove what occurred during Apple review.

### POTENTIAL CRASH VECTORS

These are static risks only. None is a confirmed root cause.

1. **Module-scope API client initialization**
   - `lib/trpc.tsx` creates the API client during module initialization.
   - `apiOrigin()` throws if neither `EXPO_PUBLIC_DOMAIN` nor `extra.productionDomain` is available.
   - Current config contains the fallback domain, so the condition is not reproduced in the current source.
   - Classification: `POTENTIAL CRASH VECTOR`, not confirmed.

2. **No application-level root error boundary found**
   - No React error boundary was found around the root provider/navigation tree.
   - An uncaught render-time JavaScript exception could therefore become a fatal React Native error rather than a recoverable screen.
   - No such exception is present in Apple logs because no Apple logs are available.
   - Classification: `POTENTIAL CRASH VECTOR`, not confirmed.

3. **Fire-and-forget native splash promises**
   - `SplashScreen.preventAutoHideAsync()` and `SplashScreen.hideAsync()` are invoked without an attached rejection handler.
   - No rejection has been observed, and this is not enough to identify a crash.
   - Classification: `POTENTIAL CRASH VECTOR`, low confidence.

4. **Apple binary may contain a different native audio dependency**
   - Historical failed logs contained `react-native-audio-api@0.12.0`.
   - Current source/lockfile contains `0.13.3`.
   - The successful Expo workflow exposes no package manifest, so its embedded version is not independently confirmed.
   - The known 0.12.0 issue caused compilation failure, not a proven runtime crash.
   - Classification: build provenance risk, not a confirmed crash vector.

5. **Detached Mushaf assets create a broken visible flow in current source**
   - QCF assets are detached and `MUSHAF_ASSETS_ENABLED = false`.
   - The Mushaf remains visible in Quran navigation and the student tab bar.
   - Opening a page is expected to show a handled preparation error rather than terminate the process.
   - Classification: `BROKEN FLOW / REVIEW COMPLETENESS RISK`, not a crash.

### PERMISSION CRASH CHECK

```text
CRITICAL CRASH VECTOR: NOT ESTABLISHED
```

Current source config contains usage descriptions for camera, microphone, and foreground location. Those permissions are requested on their relevant screens, not during root startup.

- Camera: configured and requested through `expo-camera`.
- Microphone: configured and requested through `react-native-audio-api`.
- Location: configured and requested through `expo-location`.
- Photos: `expo-image-picker` is installed, but no ImagePicker API use was found in the audited runtime source.
- Face ID/biometrics: no local-authentication API use was found.
- Notifications: notification-list UI exists, but no native notification-permission API/package use was found.

There is no generated `ios/` directory or extracted IPA in the workspace, so the final Apple binary’s `Info.plist` cannot be inspected. Permission safety for the shipped binary remains unconfirmed.

### EXACT APPLE SCENARIO

```text
A. Crash immediately after icon: UNKNOWN
B. Crash after splash: UNKNOWN
C. Crash in login: UNKNOWN
D. Crash after demo-account entry: UNKNOWN
E. Crash when opening Mushaf: UNKNOWN
F. Crash when opening camera: UNKNOWN
G. Crash when requesting location: UNKNOWN
H. Crash around notifications: UNKNOWN
I. Crash on another screen: UNKNOWN
```

No scenario may be selected without an Apple message, crash log, or physical reproduction from the exact signed build.

### CONFIRMED ROOT CAUSE

```text
CONFIRMED ROOT CAUSE: NOT ESTABLISHED
CONFIDENCE: NOT ESTABLISHED
NEW IOS BUILD REQUIRED: UNKNOWN
SAFE TO RESUBMIT: NO
```

### DATA REQUIRED FROM APPLE

The investigation cannot progress from repository evidence alone. Obtain and provide the following without sharing account passwords:

1. **Exact build record**
   - App Store Connect → My Apps → the Tabyan app → TestFlight → iOS → select the reviewed build.
   - Capture/export: marketing version, build number, upload date, processing status/date, minimum iOS, and build metadata.

2. **Review submission and original message**
   - App Store Connect → My Apps → the Tabyan app → App Review / the relevant submission → Review Messages or Resolution Center.
   - Export/copy the complete Apple message, review date/time, device, iOS version, reproduction steps, and all screenshot/crash attachments.

3. **Crash diagnostics**
   - App Store Connect/TestFlight → select the exact build → Crashes/Diagnostics, if present.
   - Download the original `.ips` or `.crash` file without editing or reformatting it.
   - If the crash was reproduced on a physical iPhone: Settings → Privacy & Security → Analytics & Improvements → Analytics Data → select the Tabyan entry matching the time, then share the original `.ips`.

4. **Expo provenance**
   - Open the successful Expo workflow dashboard and export/copy its build details: EAS build ID, source revision/commit, build profile, version/build number, start/end time, and package/dependency evidence.

With those files, the crash can be symbolized/correlated and the Apple binary can be matched or disproved against the current source.

## APPLE BUILD IDENTIFIED

| Field | Result | Evidence |
|---|---|---|
| Version | `1.0.0` (current source configuration) | `artifacts/mobile/app.json` |
| Build | `6` (current source configuration) | `artifacts/mobile/app.json` |
| Bundle ID | `app.replit.tbyan` (current source configuration) | `artifacts/mobile/app.json` |
| Source commit | `f1c68d35544e7b79dd10add8f5c4079bbb4ad83f` (current workspace) | `git rev-parse HEAD` |
| Expo project | `bcac43ba-905a-4b13-a834-b36051da4da6` | `app.json` and `eas.json` |
| Expo workflow ID | `01a0787d-0241-7769-8b45-e0f612c8d443` | `getExpoLaunchLogs()` |
| EAS/Expo build ID | **UNKNOWN** | Not present in retained Expo Launch metadata |
| Build time | **UNKNOWN** | Not present in retained Expo Launch metadata |
| Upload time to Apple | **UNKNOWN** | Not present in retained Expo Launch metadata |
| Environment | `production` is configured in `eas.json`; exact environment embedded in Apple binary is **UNKNOWN** | `artifacts/mobile/eas.json` |
| Exact binary currently on Apple | **NOT IDENTIFIED** | No App Store Connect/TestFlight build record or IPA metadata available |

The current Git commit message is `Published your App`, dated `2026-09-06T13:31:04Z`. This identifies the current workspace commit, not proof that Apple’s binary was built from that commit.

## CHECK 1 — Expo Updates

**Result: PASS for current project configuration; Apple binary compatibility: INCONCLUSIVE**

Evidence:

- `expo-updates` is not a direct mobile dependency.
- `app.json` has no `updates.url`.
- `app.json` has no `runtimeVersion`.
- `app.json` has no OTA update configuration.
- `eas.json` defines build channels (`development`, `preview`, `production`) but no update URL or runtime policy.

Conclusion:

- The current source does not show an Expo OTA update path that could silently deliver a newer JavaScript bundle.
- Because the exact Apple binary and Expo account update history are unavailable, it is not possible to prove that no external update was ever associated with the submitted binary.

## CHECK 2 — Production Environment

**Result: PASS for current release configuration and external endpoints**

Configured production values (non-secret):

```text
EXPO_PUBLIC_DOMAIN=https://tibyanquran.com (configured without scheme as tibyanquran.com)
EXPO_PUBLIC_PRODUCTION_DOMAIN=tibyanquran.com
EXPO_PUBLIC_WS_ORIGIN=wss://tibyanquran.com
```

Evidence:

- `eas.json` production profile uses `tibyanquran.com` and `wss://tibyanquran.com`.
- `lib/trpc.tsx` constructs `https://tibyanquran.com/api/trpc`.
- `lib/native-recitation.ts` uses `wss://tibyanquran.com/api/ws/recitation`.
- No runtime mobile source reference to `localhost`, `127.0.0.1`, or a Replit development URL was found.
- The current public API health endpoint returns `{"status":"ok"}`.

Limitation:

- This validates the current production endpoint, not every authenticated API call from the binary that Apple reviewed.

## CHECK 3 — Fresh Install

**Result: INCONCLUSIVE**

No clean physical iPhone install or TestFlight session was available to this audit.

Static evidence is favorable:

- `AuthProvider` initializes with `token: null`, `role: null`, `name: null`, and `ready: false`.
- Storage restore is asynchronous and failure sets `ready: true`.
- The root route redirects to `/login` when no valid session is present.
- SecureStore is used on native; AsyncStorage is used on web.

Required evidence still missing:

- Fresh install on an iPhone.
- First launch and splash completion.
- Login, logout, force-kill, relaunch, and network-error behavior on the submitted binary.

## CHECK 4 — iOS Permissions

**Result: INCONCLUSIVE for the shipped Info.plist; current source configuration: PARTIAL/PASS**

Current `app.json` configures:

- `NSCameraUsageDescription`.
- `NSMicrophoneUsageDescription`.
- `NSLocationWhenInUseUsageDescription`.
- `expo-camera` camera and microphone plugin messages.
- `expo-location` foreground location message.
- `react-native-audio-api` microphone message.

Current source requests permissions before the relevant operation:

- Camera: `useCameraPermissions` in `app/student/placement.tsx`.
- Microphone: `AudioManager.requestRecordingPermissions()` in `lib/native-recitation.ts`.
- Location: `Location.requestForegroundPermissionsAsync()` in prayer/Qibla screens.
- SecureStore is configured as an Expo plugin.

No direct use of photo-library permission, notification permission, or Face ID/local-authentication APIs was found in the searched mobile source.

Limitation:

- The actual generated `Info.plist` inside the Apple binary was not available. Therefore Apple-build permission status cannot be marked fully PASS.

## CHECK 5 — Authentication

**Result: INCONCLUSIVE**

Static evidence:

- The current login route uses `trpc.auth.studentPasswordLogin`.
- Session state is restored defensively from storage.
- A 401 from the query or mutation cache invalidates the native session.
- The current source does not show the old phone OTP flow in the login screen.

Missing evidence:

- Successful production login with a real review/demo account.
- The exact authentication code embedded in the Apple binary.
- Apple review account credentials and review-session logs.

## CHECK 6 — Production API

**Result: PASS for public health and legal/support endpoints; INCONCLUSIVE for full authenticated API coverage**

External checks at audit time:

| Endpoint | Result |
|---|---|
| `https://tibyanquran.com/` | HTTP 200 |
| `https://tibyanquran.com/api/healthz` | HTTP 200, `{"status":"ok"}` |
| `https://tibyanquran.com/privacy` | HTTP 200 |
| `https://tibyanquran.com/support` | HTTP 200 |

The application’s API client has one retry for non-auth query errors, disables retries for mutations, and invalidates the session on 401.

Limitation:

- No authenticated production account was used in this audit, so endpoint-level 401/403/500 coverage is not proven.

## CHECK 7 — Release Mode

**Result: PASS for local production-like export; Apple release binary: INCONCLUSIVE**

Evidence:

- `expo export --platform ios` completed successfully in the current workspace.
- The mobile workflow starts Metro with `--no-dev --minify`.
- Current TypeScript typecheck passed after the audio dependency/API alignment.
- The current mobile workflow starts without a Metro startup error.

This is not a substitute for installing the signed Apple binary on a physical iPhone.

## CHECK 8 — Startup

**Result: INCONCLUSIVE**

Startup trace reviewed:

```text
iOS launch
→ Expo Router entry
→ RootLayout
→ font loading and splash gate
→ SafeAreaProvider / ThemeProvider / TRPCProvider / AuthProvider
→ session restore
→ root redirect
```

Static safeguards:

- Splash screen is hidden only after fonts load or a font error occurs.
- Auth restore failure does not leave the app permanently blocked.
- Missing `EXPO_PUBLIC_DOMAIN` throws explicitly rather than silently targeting localhost.
- Current production build configuration supplies the production domain.

No Apple crash log or device console log was available, so no startup crash point can be proven.

## CHECK 9 — iOS Compatibility

**Result: INCONCLUSIVE for the exact Apple binary; current source/build configuration: PASS**

Evidence:

- Bundle ID and iPhone-only configuration are present.
- `supportsTablet` is `false`.
- Expo Launch has a newer iOS workflow with status `SUCCESS`.
- The previous archived native audio failure referenced `react-native-audio-api@0.12.0` and an iOS 26.2 symbol unavailable in the iPhoneOS 26.0 SDK.
- The current source and lockfile use `react-native-audio-api@0.13.3`, whose source uses a compatibility mask instead of the unavailable symbol.

Limitation:

- The successful workflow’s retained logs are empty, so the exact native dependency graph used by that workflow cannot be independently inspected here.

## CHECK 10 — IPv6

**Result: PASS by static endpoint review; device-only IPv6 proof unavailable**

Evidence:

- Mobile API and WebSocket connections use DNS hostnames over HTTPS/WSS.
- No hard-coded IPv4 address or IP-only application endpoint was found.
- External public domain checks work over HTTPS at the time of audit.

No Apple IPv6-only network test was available.

## CHECK 11 — Preview vs Apple Build

**Result: NO / INCONCLUSIVE**

Known current workspace values:

```text
Version: 1.0.0
Build: 6
Bundle ID: app.replit.tbyan
Expo project: bcac43ba-905a-4b13-a834-b36051da4da6
Source commit: f1c68d35544e7b79dd10add8f5c4079bbb4ad83f
Audio dependency: react-native-audio-api@0.13.3
QCF assets: currently detached from the workspace; loader disabled
```

Known historical failed Expo Launch log:

```text
react-native-audio-api@0.12.0
AVAudioSessionCategoryOptionFarFieldInput
ARCHIVE FAILED
Exit status: 65
```

The historical failed workflow is not proof of the contents of the newer successful workflow or of the binary currently visible to Apple. There is no IPA manifest, App Store Connect build metadata, or retained successful-build log available to establish exact source/dependency parity.

## CRASH LOG AVAILABLE

**NO**

Available:

- Expo Launch status metadata.
- A historical failed native build log.
- Current Replit deployment health.

Unavailable:

- TestFlight crash logs.
- Apple review device logs.
- App Store Connect build metadata.
- Successful Expo Launch build logs.
- IPA `Info.plist` and binary checksum.

## MOST LIKELY ROOT CAUSE

**Not determinable from available crash evidence.**

The only concrete native failure previously captured was the build-time `react-native-audio-api@0.12.0` SDK incompatibility. The current source has been updated to `0.13.3`, and a newer Expo Launch workflow reports `SUCCESS`. That historical compiler failure cannot be used as the cause of an Apple Review runtime crash without a new Apple/TestFlight crash log.

## CONFIDENCE

**HIGH** for:

- Current production domain/API health.
- Current app identity in source configuration.
- Historical audio build failure.
- Absence of a configured Expo Updates runtime/update URL in current source.

**LOW** for:

- Exact binary currently on Apple.
- Apple Review runtime behavior.
- Any crash root cause.

## REQUIRED FIX

No source fix is justified by the available Apple evidence. Do not make a speculative crash fix.

To continue the diagnosis, obtain one of:

1. TestFlight/App Store Connect crash report with timestamp and exception.
2. Apple review crash/feedback log.
3. IPA metadata or an accessible build record for the successful workflow.
4. A reproducible crash on the exact signed build on a physical iPhone.

## DOES THIS REQUIRE A NEW IOS BUILD?

**UNKNOWN.**

The historical audio compiler issue requires a new iOS build, but the current successful Expo Launch workflow may already include the dependency fix. The submitted Apple binary cannot be confirmed.

## DOES THIS REQUIRE ONLY AN OTA UPDATE?

**NO EVIDENCE.**

No OTA update configuration is present in the current project. Native changes must not be treated as OTA-only.

## IS THE CURRENT APPLE BUILD SAFE TO RESUBMIT?

**NO — INCONCLUSIVE.**

The absence of Apple crash evidence prevents a safe resubmission decision. Also, the current workspace intentionally has QCF assets detached and the Mushaf loader disabled, so it is not the full final Mushaf release state.

## FINAL VERDICT

**INCONCLUSIVE / NOT SAFE TO DECLARE READY**

The current infrastructure and production API are healthy, and Expo reports a successful newer workflow. However, the exact Apple binary, its embedded permissions/runtime configuration, and the alleged Review crash are not verifiable from the available logs. No fix or new build was started by this audit.