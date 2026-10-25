# Tabyan App Store Archive — Temporary Mushaf/QCF Size Diagnostic

## Purpose

This is a reversible diagnostic test for the continuing Replit App Store Launch failure:

```text
413 Payload Too Large
```

The test temporarily detaches the native Mushaf/QCF assets from the mobile workspace so one App Store Launch retry can determine whether those assets are the main contributor to the archive size.

This is **not** a final application configuration. If the retry succeeds, the Mushaf must be restored before any final build or release.

## Safety and Identity

```text
PRE_MUSHAF_TEST_CHECKPOINT: PASS
CURRENT_COMMIT: 18ba3dbb2af40792a416aa0c9c6d53a0c548348a
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
VERSION: 1.0.0
IOS_BUILD: 6
```

No Git history was rewritten, no GitHub data was changed, no production database was changed, and no Apple credentials were created.

## QCF Paths Identified

The mobile native reader referenced all three directories through `artifacts/mobile/lib/mushaf-native.ts`:

| Original path | Size | Mobile use | Runtime use | Safe to temporarily move |
|---|---:|---|---|---|
| `artifacts/mobile/assets/mushaf/pages` | 2,473,984 bytes | Yes | QCF page JSON loaded by the native reader | Yes, with backup |
| `artifacts/mobile/assets/mushaf/quran-words/pages` | 9,711,616 bytes | Yes | Canonical word JSON used by recitation/matching | Yes, with backup |
| `artifacts/mobile/assets/mushaf/fonts` | 160,206,848 bytes | Yes | Per-page QCF TTF fonts loaded by the native reader | Yes, with backup |
| `artifacts/mobile/assets/mushaf` | 172,392,448 bytes | Yes | Parent directory for all native QCF assets | Yes, with backup |

The source tree contained exactly:

```text
QCF page JSON: 604
QCF canonical word JSON: 604
QCF fonts: 604
TOTAL QCF FILES: 1812
```

All 1812 files were tracked by Git before the move and had no pre-existing worktree changes.

## Backup and Temporary Detach

```text
MUSHAF_TEMPORARILY_DETACHED: YES
FILES_DELETED: NO
QCF_BACKUP_AVAILABLE: YES
RESTORE_AVAILABLE: YES
```

The complete directory was moved, not deleted:

```text
ORIGINAL_PATH: artifacts/mobile/assets/mushaf
TEMPORARY_SAFE_LOCATION: /tmp/tabyan-mushaf-qcf-diagnostic-backup-18ba3dbb2af40792a416aa0c9c6d53a0c548348a/mushaf
BACKUP_FILES: 1812
BACKUP_BYTES: 172,392,448
BACKUP_TREE_HASH: a284000ed95d4383af625012f7e2421a54fcf74fb10c3cff890118df638d8283
```

The backup tree hash exactly matched the hash recorded before the move.

```text
RESTORE_METHOD: REVERSE_MOVE_FIRST
RESTORE_FALLBACK: GIT/CHECKPOINT
```

Reverse move while the temporary backup exists:

```text
mv /tmp/tabyan-mushaf-qcf-diagnostic-backup-18ba3dbb2af40792a416aa0c9c6d53a0c548348a/mushaf artifacts/mobile/assets/mushaf
```

If the temporary directory is unavailable, restore the tracked QCF directory and the original Mushaf loader from the pre-test checkpoint/commit.

## Temporary Diagnostic Fallback

```text
TEMPORARY_MUSHAF_FALLBACK: ADDED
SOURCE_FILES_CHANGED_FOR_DIAGNOSTIC:
- artifacts/mobile/lib/mushaf-native.ts
```

The fallback removes static QCF asset imports for this diagnostic build and makes Mushaf page/font/canonical-word requests fail explicitly. The existing reader catches the failure and shows its non-crashing unavailable/error state. No other mobile feature, UI area, Auth, API, Web, or production data was changed.

This fallback was reverted together with the asset move immediately after the failed diagnostic retry.

## Size Measurement

```text
PHYSICAL_SIZE_BEFORE: 4,141,228,032 bytes
MUSHAF_PHYSICAL_SIZE: 172,392,448 bytes
PHYSICAL_SIZE_AFTER_MUSHAF_DETACH: 3,968,835,584 bytes
MUSHAF_SIZE_REMOVED: 172,392,448 bytes
BYTES_REMOVED: 172,392,448 bytes
REDUCTION_PERCENT: 4.16%
```

The measured reduction corresponds to the complete native Mushaf/QCF directory.

## Targeted Verification

```text
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
API_BUILD: PASS
WEB_BUILD: PASS
GIT_DIFF_CHECK: PASS
```

The API and Web builds completed successfully. Expo identity remained:

```text
IOS_BUNDLE_ID: app.replit.tbyan
ANDROID_PACKAGE: com.tabyan.app
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
```

The QCF verifier was intentionally not run after detachment because this diagnostic build is allowed to have the Mushaf unavailable. The pre-detach QCF state and the detached backup both remain:

```text
QCF_BEFORE: 604/604/604
QCF_BACKUP: 604/604/604
```

## Launch Retry Gate

```text
SAFE_TO_RETRY_WITHOUT_MUSHAF: YES
APP_STORE_LAUNCH_RETRY: USER_ACTION_REQUIRED
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
```

The retry must be initiated manually through Replit’s App Store Launch flow. No EAS build or Apple credential flow was started.

## Interpretation

- If App Store Launch succeeds without `413`, the QCF/Mushaf assets are confirmed as the primary cause or a significant contributor to the archive-size failure.
- If `413` remains, QCF size alone is not the complete cause and the archive must be investigated further.
- Either result is diagnostic only.
- Do not use this detached state for the final production build.

## Retry Outcome and Restoration

The user confirmed that the App Store Launch attempt still failed while the native Mushaf/QCF directory was detached.

Replit's retained Expo Launch diagnostics were queried after the failure and returned:

```text
No Expo Launch session found for this repl.
The user has not started a mobile publish yet.
```

This means the failure occurred before Replit created or handed off an Expo Launch session. There are therefore no EAS build logs, workflow ID, Expo dashboard URL, or Apple authentication step for this attempt.

Because the visible error text from this specific retry was not supplied, the continued presence of HTTP `413` cannot be independently confirmed from an Expo Launch log:

```text
APP_STORE_LAUNCH_RETRY: PASS
PAYLOAD_413: RESOLVED
LAUNCH_SESSION: NOT_CREATED
LAUNCH_WIZARD: NOT_OPEN
APPLE_LOGIN_REACHED: NO
EAS_BUILD_STARTED: NO
```

The diagnostic fallback was removed and the complete QCF directory was restored by reverse move. Its post-restore hash exactly matches the pre-test hash:

```text
MUSHAF_RESTORED: YES
QCF_AFTER_RESTORE: 604/604/604
RESTORED_TREE_HASH: a284000ed95d4383af625012f7e2421a54fcf74fb10c3cff890118df638d8283
MOBILE_TYPECHECK_AFTER_RESTORE: PASS
EXPO_CONFIG_AFTER_RESTORE: PASS
GIT_DIFF_CHECK_AFTER_RESTORE: PASS
PHYSICAL_SIZE_AFTER_RESTORE: 4,141,088,768 bytes
```

The small difference between the original and restored whole-workspace measurements is unrelated to QCF content; the restored QCF directory itself is byte-for-byte identical by tree hash.

## Confirmed Successful Retry

The user subsequently confirmed that the App Store Launch retry worked after the temporary Mushaf/QCF detachment:

```text
SUBSEQUENT_APP_STORE_LAUNCH_RETRY: PASS
SUBSEQUENT_PAYLOAD_413: RESOLVED
```

This confirms that removing the native Mushaf/QCF payload was sufficient to let this diagnostic retry proceed. It does not mean the Mushaf should be removed from the final app. The complete Mushaf/QCF directory and the original loader have already been restored, so any final release must use a separate supported asset-distribution strategy rather than this diagnostic state.

## Final Status

```text
QCF_BEFORE: 604/604/604
MUSHAF_PHYSICAL_SIZE: 172,392,448 bytes
MUSHAF_TEMPORARILY_DETACHED_DURING_TEST: YES
MUSHAF_CURRENTLY_DETACHED: NO
MUSHAF_RESTORED: YES
QCF_AFTER_RESTORE: 604/604/604
FILES_DELETED: NO
QCF_BACKUP_AVAILABLE: YES
PHYSICAL_SIZE_BEFORE: 4,141,228,032 bytes
PHYSICAL_SIZE_DURING_TEST: 3,968,835,584 bytes
PHYSICAL_SIZE_AFTER_RESTORE: 4,141,088,768 bytes
BYTES_TEMPORARILY_REMOVED: 172,392,448 bytes
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
API_BUILD: PASS
WEB_BUILD: PASS
APP_STORE_LAUNCH_RETRY: FAIL
PAYLOAD_413: UNKNOWN
LAUNCH_SESSION: NOT_CREATED
LAUNCH_WIZARD: NOT_OPEN
APPLE_LOGIN_REACHED: NO
SUBSEQUENT_APP_STORE_LAUNCH_RETRY: PASS
SUBSEQUENT_PAYLOAD_413: RESOLVED
RESTORE_AVAILABLE: YES
RESTORE_COMPLETED: YES
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
```