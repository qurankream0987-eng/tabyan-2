# Tabyan — Apple Build 6 Physical iPhone Video Script

## Purpose

This is the recording plan requested by Apple after the previous Build 5
submission was rejected under Guideline 2.1 — Information Needed — New App
Submission. The recording must be made later on a **real physical iPhone**
running the latest available iOS version at the time of recording.

This document is a plan only. It does not claim that a recording exists.

## Recording rules

- Record the complete flow from the iPhone Home Screen through the end of the
  review journey.
- Use a stable network and the production configuration, never Preview or
  Development.
- Keep the status bar, permission prompts, navigation, and user-visible errors
  readable.
- Do not show passwords, private tokens, internal dashboards, or secrets.
- If a feature is unavailable because its production dependency is not ready,
  do not fake a success state; show the truthful state and explain it in the
  App Review Notes instead.
- Include an on-screen or opening slate with the device model and iOS version.

## Recording metadata to fill after testing

| Field | Value |
|---|---|
| Device model | `[IPHONE_MODEL]` |
| iOS version | `[IOS_VERSION]` |
| Build shown | `1.0.0 (6)` |
| Recording date | `[YYYY-MM-DD]` |
| Network | `[WIFI_OR_CELLULAR]` |
| Account used | `[APPLE_REVIEW_STUDENT_USERNAME]` |

## Exact sequence

### 1. Device and launch

1. Show the physical iPhone briefly and show Settings → General → About
   (model and iOS version), where practical without exposing personal data.
2. Return to the Home Screen.
3. Tap the Tabyan icon.
4. Show the cold launch, splash screen, and first screen.
5. Confirm that no diagnostic, “feature unavailable”, mock, or fake-success
   screen appears.

### 2. Registration and login

1. Open registration.
2. Demonstrate the required fields and validation without exposing a real
   password.
3. If a temporary account is created for the recording, use a disposable
   review-safe account and delete it at the end.
4. Log in with the dedicated review account:
   `[APPLE_REVIEW_STUDENT_USERNAME]`
5. Show the home screen and the main navigation.
6. If the app is restarted, show session restoration without requiring an
   obsolete phone OTP flow.

### 3. Student home and learning

1. Open the student home screen.
2. Visit the learning paths and show the available Quran and educational
   content.
3. Open progress, notifications, library, and help as relevant.
4. Keep the navigation labels and visible role clear.

### 4. Mushaf

1. Open the Mushaf from the main navigation.
2. Show a normal page render.
3. Navigate to at least one early page, one middle page, and page 604.
4. Zoom or resize the page.
5. Navigate forward and backward.
6. If bookmarks are exposed, create and reopen one bookmark.
7. If the app is placed offline for a controlled check, show the documented
   cached/offline behavior and do not imply that a missing page is available.

### 5. Placement video

1. Open the placement test.
2. Explain on screen why camera and microphone access is requested.
3. Grant camera/microphone permissions only when prompted by the feature.
4. Record a short, clear recitation.
5. Stop recording.
6. Show the in-app preview.
7. Use “delete recording and retry” once, then record a second short clip.
8. Upload the second clip.
9. Show upload progress, server finalization, and the truthful success state.
10. If the student-facing app exposes a submitted status, show it.
11. Supervisor/admin playback must be demonstrated in a separate recording or
    provided as a reviewer instruction if the submitted iOS app exposes the
    supervisor role. Do not claim playback was verified until it is verified.

### 6. Live recitation

If live recitation is enabled in the production backend:

1. Open live recitation after the placement eligibility condition is satisfied.
2. Grant microphone access when requested.
3. Start a session.
4. Show the Quran page and the live transcript/partial result.
5. Show at least one final result and word reveal.
6. Pause, resume, end, and cancel a session.
7. If the production provider is unavailable, show the truthful error and
   explain the limitation in App Review Notes; never record a fake success.

### 7. Prayer times, Qibla, and location

1. Open prayer times.
2. Show the location permission prompt at the point of need.
3. Grant permission and show the resulting prayer times.
4. Open Qibla and show the calculated direction.
5. Repeat the flow with location permission denied.
6. Show the clear fallback/error message and confirm that the app does not
   crash or dead-end.

### 8. Account deletion and logout

1. Open Account → Settings.
2. Open the account deletion section.
3. Show the warning that deletion is permanent.
4. Enter the exact confirmation phrase shown by the app.
5. Confirm deletion.
6. Show that the session ends and the app returns to login.
7. Attempt to reopen a protected screen and show that authentication is
   required.
8. If a dedicated test account was used, do not reuse it after deletion.

### 9. Teacher and supervisor roles

If these roles are part of the submitted iOS app and Apple is given access:

1. Sign in with the dedicated teacher account and show only the role-relevant
   navigation.
2. Show review of a placement submission and playback of the uploaded video.
3. Sign in with the dedicated supervisor account and show the relevant
   monitoring/review controls.
4. Do not show internal credentials or unrelated user data.

## Closing slate

Show:

- `Tabyan — Build 6`
- `Version 1.0.0`
- `iOS build 6`
- Device model and iOS version
- “All flows shown were tested on a physical iPhone”

Only display the closing slate after the corresponding physical-device matrix
has been completed with evidence.