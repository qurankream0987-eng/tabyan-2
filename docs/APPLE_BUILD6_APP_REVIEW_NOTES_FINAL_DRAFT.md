# Tabyan — App Store Connect Review Notes (Final Draft Template)

> Replace every bracketed placeholder and attach the physical-device
> recording before submitting. Do not paste passwords into Git. Enter review
> credentials only in Apple’s secure review-account fields.

## App purpose

Tabyan is an Arabic Quran-learning application that helps learners read the
Quran, follow structured learning paths, submit a placement recitation, and,
when eligible and enabled in production, practice live recitation feedback.

## Target audience

Arabic-speaking Quran learners, teachers who review learning and placement
submissions, and supervisors who manage the educational workflow.

## Core features

- Account registration, login, session restoration, logout, and account
  deletion.
- A 604-page native Mushaf with Quran page rendering, navigation, zoom, and
  bookmarks where enabled.
- Quran and Sharia learning paths, progress, library, and notifications.
- Placement-test video recording, preview, retry, secure upload, server
  finalization, and teacher/supervisor review.
- Prayer times and Qibla calculation using location when the user opens those
  features.
- Live recitation with microphone access and server speech recognition when the
  production provider is enabled and available.

## Review accounts

Use the secure Apple review account fields:

```text
Student username: [APPLE_REVIEW_STUDENT_USERNAME]
Student password: [APPLE_REVIEW_STUDENT_PASSWORD]
Teacher username: [APPLE_REVIEW_TEACHER_USERNAME]
Teacher password: [APPLE_REVIEW_TEACHER_PASSWORD]
Supervisor username: [APPLE_REVIEW_SUPERVISOR_USERNAME]
Supervisor password: [APPLE_REVIEW_SUPERVISOR_PASSWORD]
```

The student account does not require OTP. Include teacher/supervisor accounts
only if those roles are visible or required in the submitted iOS app.

## Registration, login, and deletion

1. Open the app and choose registration or login.
2. Use the provided student review account for the main journey.
3. To delete the account, open **Account → Settings → Delete account**.
4. Read the permanent-deletion warning.
5. Type `حذف حسابي` and submit.
6. The app calls the authenticated deletion endpoint, clears the local
   session, and returns to login.

Physical verification:

```text
[INSERT TESTED IPHONE MODEL]
[INSERT IOS VERSION]
[INSERT ACCOUNT-DELETION VIDEO TIMESTAMP]
```

## Camera usage

Open the placement test to request camera access. The camera is used to record
the placement-test video. Permission is requested only when the placement
feature needs it. If denied, the app displays an explanation and settings
fallback.

## Microphone usage

The placement-test recording and live recitation use the microphone. The app
requests microphone access when the relevant feature is opened. If denied or
unavailable, the app displays an error rather than claiming success.

## Location usage

Open Prayer Times or Qibla to request location access. Prayer times vary by
location and date. Qibla is calculated from the device location. If access is
denied, the app displays a fallback/error state.

## Placement test

1. Open the placement test.
2. Grant camera and microphone permissions when prompted.
3. Record a short recitation.
4. Stop and review the video.
5. Retry if necessary.
6. Submit the final video.
7. Wait for upload and server finalization to complete.

Physical production evidence:

```text
[INSERT PLACEMENT VIDEO TIMESTAMPS]
[INSERT SUPERVISOR PLAYBACK TIMESTAMP]
```

## Live recitation

If live recitation is enabled for this review:

1. Complete the required placement eligibility.
2. Open live recitation.
3. Grant microphone permission.
4. Start the session and read the displayed page.
5. Demonstrate partial/final results and word reveal.
6. Demonstrate pause, resume, end, and cancel.

If the production provider is unavailable, the reviewer will see the truthful
unavailable/error state; no fake success is shown.

## External services

The active production configuration uses the Replit backend, PostgreSQL,
private object storage, Expo/Apple distribution services, and the external
service(s) enabled for prayer or live speech. Before submission, replace this
sentence with the verified production inventory from
`docs/APPLE_BUILD6_REVIEW_READINESS_REPORT.md`; do not list unused providers.

## Regional behavior

Core account, Mushaf, and learning behavior is intended to be consistent in
supported regions where production services are reachable. Prayer times vary
by device location/date and calculation method. Qibla varies by device
location. Phone-country validation supports international numbers. Service
availability and speech-provider behavior may vary by region or network.

## Content rights

```text
[INSERT VERIFIED RIGHTS STATEMENT FOR QURAN TEXT, QCF FONTS,
LIBRARY BOOKS, SHARIA LESSONS, IMAGES, AND THIRD-PARTY SERVICES]
```

Do not submit while the content-rights audit is UNKNOWN.

## Physical testing

```text
Device: [INSERT TESTED IPHONE MODEL]
iOS: [INSERT IOS VERSION]
Build: 1.0.0 (6)
Testing date: [INSERT DATE]
```

## Physical recording

```text
[ATTACH PHYSICAL DEVICE RECORDING]
Recording begins at the physical iPhone Home Screen and demonstrates the
launch, login, navigation, Mushaf, placement, relevant permissions, location
flows, account deletion, and logout. No recording is claimed until attached.
```