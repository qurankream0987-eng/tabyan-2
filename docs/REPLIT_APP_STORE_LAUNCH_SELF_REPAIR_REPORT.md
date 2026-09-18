# Tabyan — Replit App Store Launch Self-Repair Report

**Inspection date:** 2026-09-03  
**Scope:** Read-only inspection of project-side state and available deployment diagnostics. No new Repl, Expo project, App Store Connect app, Apple Identifier, EAS Build, TestFlight upload, Apple credential, cleanup, reinstall, or Launch retry was performed.

## Executive Summary

The current project-side prerequisites are present: the Expo configuration contains the existing Expo project ID, the intended iOS Bundle ID, the Android package, version `1.0.0`, and iOS build `6`. The previous evidence also records passing mobile typecheck, valid Expo configuration, intact QCF assets, and an addressed payload-size issue.

The inspection found no local or project-side Replit Mobile Publishing launch session, stale launch record, or repairable publishing metadata. The only local publishing-related files found are the normal Expo/EAS configuration and artifact serving configuration. No incorrect iOS reference to the Android package was found in current mobile configuration.

Because the App Store Launch wizard still fails immediately with the generic message before Apple authentication, local self-repair is exhausted and Replit Mobile Publishing backend investigation is required.

## Current Launch Failure

```text
ACTION: Publishing → Start publishing to the App Store
VISIBLE_ERROR: Something unexpected happened. Contact support@replit.com if the issue persists.
LAUNCH_WIZARD: NOT_OPEN
```

The available evidence indicates the failure occurs at the Launch entry point, before Apple login or any iOS build step.

## Mobile Publishing State

The project contains ordinary Expo/EAS and artifact configuration, but no Replit Mobile Publishing state or launch-session record is exposed in the workspace.

```text
MOBILE_PUBLISHING_STATE_FOUND: NO
LAUNCH_SESSION_RECORD_FOUND: NO
LAUNCH_SESSION_ID: NONE
PUBLISHING_METADATA_FOUND: YES — Expo/EAS and artifact configuration only; no Replit Launch metadata
BACKEND_OR_LOCAL_STATE_ACCESSIBLE: PARTIAL
```

The available deployment APIs expose web deployment/build records, not the internal App Store Launch session state.

## Expo Project Association

Current local association:

```text
EXPO_OWNER: abdalrhmanq8
EXPO_PROJECT: mobile
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
```

The existing EAS project link was previously verified. The workspace does not expose a separate Replit Mobile Publishing association record that can be independently compared.

```text
REPLIT_MOBILE_PUBLISHING_EXPO_LINK: UNKNOWN
EXPO_OWNER_MATCH: YES — current local configuration matches the verified owner
EXPO_PROJECT_ID_MATCH: YES — current local configuration matches the verified project ID
```

No local association was changed.

## iOS Identity Audit

The current mobile configuration contains:

```text
CURRENT_IOS_BUNDLE_REFERENCE: app.replit.tbyan
ANDROID_PACKAGE: com.tabyan.app
```

Search results for `com.tabyan.app` point to Android configuration or historical documentation, not an iOS publishing metadata field.

```text
OLD_IOS_BUNDLE_REFERENCE_FOUND: NO
OLD_REFERENCE_LOCATION: NONE
```

No iOS identity was changed.

## Legacy Build 5 State

No local Build 5 launch session or publishing-state record was found. Build 5 references appear only in documentation describing release history and support context.

```text
LEGACY_BUILD5_STATE_FOUND: NO
LEGACY_SESSION_ACTIVE: UNKNOWN
LEGACY_STATE_CONFLICT: UNKNOWN
```

The workspace cannot inspect or reset server-side historical publishing state. No state was removed or reset.

## Launch Preconditions

```text
EXPO_CONFIG_READY: YES
EAS_PROJECT_READY: YES
IOS_IDENTITY_READY: YES
MOBILE_PROJECT_PRESENT: YES
DEPLOYMENT_HEALTHY: YES — latest recorded web deployment build is successful
LAUNCH_PRECONDITIONS: PASS
```

The deployment health result applies to the existing web/API publication and is not proof that the App Store Launch backend is healthy.

## Launch Request Diagnostics

There is no exposed workspace API or diagnostic record for the Replit App Store Launch button request. The request was not repeated.

```text
LAUNCH_REQUEST_ATTEMPTED: NO
LAUNCH_REQUEST_STATUS: NOT AVAILABLE — no accessible Launch API/diagnostic
LAUNCH_REQUEST_ID: UNKNOWN
LAUNCH_BACKEND_ERROR_CODE: UNKNOWN
LAUNCH_BACKEND_MESSAGE: UNKNOWN — only the generic UI message is exposed
```

## Self-Repair Performed

```text
SELF_REPAIR_PERFORMED: NO
SELF_REPAIR_DETAILS: No repairable local/project-side Mobile Publishing state was found.
```

No source, mobile feature, QCF, Expo configuration, Bundle ID, Apple identity, Auth, production data, or deployment configuration was changed during this inspection.

## Retest Result

Because no safe, evidence-based self-repair was available, the exact Launch action was not retried. This avoids repeated creation attempts against an unknown backend state.

```text
LAUNCH_SESSION_CREATED: UNKNOWN — request was not retried
LAUNCH_WIZARD: NOT_OPEN
SOMETHING_UNEXPECTED_HAPPENED: YES — based on the supplied observed Launch result
```

## Remaining Backend Blocker

The remaining blocker is not visible or repairable from the project workspace. Replit Mobile Publishing Engineering should inspect:

- Launch session creation and request handling
- Mobile Publishing backend state for this Repl
- Stale/orphaned publishing metadata
- Legacy Build 5 state and any conflict with Build 6
- Historical iOS bundle metadata
- The backend exception represented by the generic UI message
- Whether server-side publishing-state repair or reset is required

```text
LOCAL_SELF_REPAIR_EXHAUSTED: YES
BACKEND_INTERVENTION_REQUIRED: YES
```

## Final Status

```text
MOBILE_PUBLISHING_STATE_FOUND: NO
LAUNCH_SESSION_RECORD_FOUND: NO
OLD_IOS_BUNDLE_REFERENCE_FOUND: NO
REPLIT_MOBILE_PUBLISHING_EXPO_LINK: UNKNOWN
LEGACY_BUILD5_STATE_FOUND: NO
LEGACY_STATE_CONFLICT: UNKNOWN
LAUNCH_PRECONDITIONS: PASS
SELF_REPAIR_PERFORMED: NO
SELF_REPAIR_DETAILS: No repairable local/project-side state found
LAUNCH_REQUEST_STATUS: NOT AVAILABLE
LAUNCH_SESSION_CREATED: UNKNOWN
LAUNCH_WIZARD: NOT OPEN
SOMETHING_UNEXPECTED_HAPPENED: YES
LOCAL_SELF_REPAIR_EXHAUSTED: YES
BACKEND_INTERVENTION_REQUIRED: YES
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
APPLE_CREDENTIALS_CREATED: NO
EAS_BUILD_STARTED: NO
NEXT_STEP: REPLIT SUPPORT / MOBILE PUBLISHING ENGINEERING
```