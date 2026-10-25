# Tabyan App Store Launch — Root Cause and Prevention Report

## Scope and Evidence

This report documents the last failed state and the first successful diagnostic state. It does not change the application, delete files, start a build, modify Expo or Apple settings, or retry App Store Launch.

The comparison is based on measured physical workspace snapshots:

- Last failed snapshot: complete workspace with native Mushaf/QCF present.
- First successful diagnostic snapshot: same workspace after the complete native Mushaf/QCF directory was temporarily moved outside the workspace.
- The user confirmed that the App Store Launch retry worked in the second state.

The successful state was diagnostic only. The Mushaf/QCF directory and original loader have since been restored.

## 1. Last Failed State

```text
LAST_FAILED_PHYSICAL_SIZE: 4,141,228,032 bytes
LAST_FAILED_NODE_MODULES_SIZE: 1,873,678,336 bytes
LAST_FAILED_ATTACHED_ASSETS_SIZE: 539,680,768 bytes
LAST_FAILED_RECOVERY_SIZE: 518,011,615 bytes
LAST_FAILED_GIT_SIZE: 826,384,384 bytes
LAST_FAILED_QCF_SIZE: 172,392,448 bytes
LAST_FAILED_ERROR: 413 Payload Too Large
```

What was physically present in the failed workspace:

- `node_modules`: present, approximately 1.87 GB.
- `attached_assets`: present, approximately 540 MB.
- Ten `Unified-Integration-Part-*.zip` recovery archives: present, 518,011,615 bytes combined.
- `.git` and Git LFS objects: present.
- Native Mushaf/QCF: present, 172,392,448 bytes.
- Generated API and Web outputs: present.
- Mobile source, Expo configuration, API, Web, Auth, and production data: present.

The recovery archives were all preserved and were not deleted.

## 2. First Successful State

```text
FIRST_SUCCESSFUL_PHYSICAL_SIZE: 3,968,835,584 bytes
NODE_MODULES_PRESENT: YES
ATTACHED_ASSETS_PRESENT: YES
RECOVERY_ARCHIVES_PRESENT: YES
QCF_PRESENT: NO
GIT_PRESENT: YES
```

The only intentional large-path change in the controlled diagnostic transition was:

```text
OTHER_MAJOR_PATHS_REMOVED_OR_MOVED:
artifacts/mobile/assets/mushaf moved temporarily outside the workspace
```

The QCF backup remained complete outside the workspace and contained:

```text
QCF page JSON: 604
QCF canonical word JSON: 604
QCF fonts: 604
TOTAL QCF FILES: 1812
```

`node_modules`, `attached_assets`, the recovery archives, `.git`, and the generated outputs remained in the successful diagnostic workspace. This is important: the success was not caused by removing those groups in that particular transition.

## 3. Measured Difference

| Path | Size before | Size at success | Bytes removed | Required for success |
|---|---:|---:|---:|---|
| `node_modules` | 1,873,678,336 | 1,873,678,336 | 0 | UNKNOWN; unchanged in the controlled test |
| `attached_assets` | 539,680,768 | 539,680,768 | 0 | UNKNOWN; unchanged in the controlled test |
| Recovery ZIP archives | 518,011,615 | 518,011,615 | 0 | UNKNOWN; unchanged in the controlled test |
| `.git` | 826,384,384 | 826,384,384 | 0 | UNKNOWN; unchanged in the controlled test |
| Native Mushaf/QCF | 172,392,448 | 0 | 172,392,448 | LIKELY; this was the controlled difference followed by success |
| Generated API/Web outputs | present | present | 0 | UNKNOWN; unchanged in the controlled test |
| Whole physical workspace | 4,141,228,032 | 3,968,835,584 | 172,392,448 | LIKELY; the only measured transition associated with success |

The total measured reduction was exactly the physical size of the native Mushaf/QCF directory:

```text
TOTAL_SIZE_DIFFERENCE: 172,392,448 bytes
```

The evidence establishes QCF as a significant contributor to crossing the archive threshold. It does not establish that QCF is the only large contributor or that the current App Store archive has a published threshold equal to either measured value.

## 4. Primary Root Cause

```text
PRIMARY_ROOT_CAUSE: COMBINED PHYSICAL WORKSPACE SIZE
```

The failure was an archive-size failure, not an Expo identity, Apple credential, API build, Web build, QCF integrity, or TypeScript failure.

The controlled result shows:

```text
QCF_WAS_PRIMARY_CAUSE: YES — significant causal contributor in the controlled test; not proven to be the sole cause
```

Classification of the candidate causes:

- `node_modules`: a major physical contributor by size, but not isolated because it remained present when the diagnostic retry succeeded.
- `attached_assets`: a major physical contributor by size, but not isolated because it remained present when the diagnostic retry succeeded.
- Recovery archives: a major subset of `attached_assets`, but not isolated because they remained present when the diagnostic retry succeeded.
- QCF: the only intentionally removed large path in the failed-to-successful controlled transition; therefore a likely decisive contributor.
- Git: large, but unchanged in the controlled transition.
- Other: combined physical workspace content remains the safest overall root-cause description.

No official Replit archive limit is inferred from these measurements.

## 5. Why `.replitignore` Did Not Help

```text
REPLITIGNORE_PROTECTS_APP_STORE_LAUNCH_ARCHIVE: NO
```

For this project and App Store Launch flow, `.replitignore` was not treated as a reduction of the Expo/App Store archive. It can affect normal deployment behavior, but the physical files remained present in the workspace used for this App Store archive diagnosis.

Therefore:

- `node_modules` still occupied physical workspace space.
- `attached_assets` still occupied physical workspace space.
- Recovery ZIPs still occupied physical workspace space.
- QCF still occupied physical workspace space until the diagnostic move.

Before App Store Launch, physical workspace size must be audited directly. A clean `.replitignore` file is not sufficient evidence.

## 6. Observed Safe Target

```text
LAST_FAILED_SIZE: 4,141,228,032 bytes
FIRST_SUCCESSFUL_SIZE: 3,968,835,584 bytes
```

The following is an internal project target, not an official Replit limit:

```text
INTERNAL_TABYAN_SAFE_TARGET: <= 3,800,000,000 bytes measured physically
```

This target leaves an approximate 168 MB margin below the first successful measured state. It is deliberately conservative because only one successful diagnostic point and one failed point are available.

The current restored full-Mushaf workspace is above this internal target. A final Mushaf-enabled release therefore needs a supported asset-distribution design before another final Launch attempt.

## 7. Permanent Prevention Rules

These are project rules, not actions performed by this report:

1. Do not treat `.replitignore` as protection for the App Store Launch archive.
2. Measure physical workspace bytes before every App Store Launch.
3. Classify every file larger than 100 MB as source, runtime asset, generated output, cache, recovery material, or disposable temporary data.
4. Keep recovery ZIPs and large exports outside an App Store Launch workspace/staging copy while retaining an external backup.
5. Do not leave `node_modules` in a Launch staging workspace unless that flow explicitly requires it; never delete the only recoverable dependency state without a verified reinstall path.
6. Remove only confirmed-regeneratable `dist`, build, cache, and local Expo state from a Launch staging workspace.
7. Never delete QCF, Mushaf, canonical word files, or fonts. Preserve and verify `604/604/604`.
8. Do not duplicate QCF assets across artifacts or recovery folders.
9. Keep Git history and LFS objects under periodic review, but do not rewrite history as an archive-size workaround.
10. Keep App Store Launch diagnostics separate from the final release state; a successful asset-detached test is not a releasable build.
11. Preserve Expo project identity, Bundle ID, Apple configuration, Auth, API, Web, and production data during size work.
12. If a Launch failure occurs before a workflow session is created, treat it as a Replit archive/Launch-path issue unless a local project error is independently observed.

## 8. Pre-Launch Checklist

Run this checklist against the physical workspace or a verified Launch staging workspace:

| Check | PASS criteria | FAIL criteria |
|---|---|---|
| 1. Physical workspace size | At or below `INTERNAL_TABYAN_SAFE_TARGET`, or explicitly approved diagnostic evidence exists | Above target without a documented reason |
| 2. `node_modules` size | Presence/absence is intentional and documented for the chosen Launch flow | Large dependency tree is present accidentally |
| 3. `attached_assets` size | Only required runtime/source assets remain in the Launch workspace; backups are external | Recovery material or large exports are included accidentally |
| 4. Recovery/archive files | No recovery ZIP or temporary export is in the Launch workspace unless required | Any unneeded archive is physically present |
| 5. Generated outputs | Stale `dist`, build, cache, and `.expo` output is removed when safely regeneratable | Stale generated output consumes space or masks the measurement |
| 6. QCF integrity | Full Mushaf assets are present for a final release and verify `604/604/604` | Any QCF asset is missing, duplicated, or unverified |
| 7. Expo config | `expo config --json` passes and identity matches the approved values | Config fails or identity differs |
| 8. Bundle ID | `app.replit.tbyan` is unchanged | Bundle ID changed |
| 9. Mobile typecheck | Mobile typecheck exits successfully | Any typecheck error remains |
| 10. Launch retry | User starts one controlled retry and records session/wizard/error outcome | Agent starts EAS/Apple flow or results are not recorded |

## 9. Safe Restore State

```text
MUSHAF_RESTORE_STATUS: RESTORED
QCF_AFTER_RESTORE: 604/604/604
QCF_TREE_HASH_MATCH: PASS
```

The temporary loader fallback was reverted. No Mushaf or QCF file was deleted.

Recommendations for future Launch staging, without executing them in this report:

```text
NODE_MODULES_RESTORE_RECOMMENDATION: RESTORE for normal development; KEEP_OUT only in a verified Launch staging strategy with a tested dependency path
ATTACHED_ASSETS_RESTORE_RECOMMENDATION: RESTORE required project assets; KEEP_OUT large recovery material from Launch staging while retaining external backups
RECOVERY_ARCHIVES_RESTORE_RECOMMENDATION: KEEP_OUT of Launch staging; preserve in a separate recoverable archive location
```

The current workspace remains the complete restored project. No restoration or deletion was performed as part of this postmortem task.

## 10. Final Report

```text
APP_STORE_LAUNCH: RESTORED
LAST_FAILED_PHYSICAL_SIZE: 4,141,228,032 bytes
FIRST_SUCCESSFUL_PHYSICAL_SIZE: 3,968,835,584 bytes
TOTAL_SIZE_DIFFERENCE: 172,392,448 bytes
PRIMARY_ROOT_CAUSE: COMBINED PHYSICAL WORKSPACE SIZE
QCF_WAS_PRIMARY_CAUSE: YES — significant contributor; not proven sole cause
NODE_MODULES_WAS_MAJOR_CONTRIBUTOR: YES by physical size; unchanged in the controlled success
ATTACHED_ASSETS_WAS_MAJOR_CONTRIBUTOR: YES by physical size; unchanged in the controlled success
RECOVERY_ARCHIVES_WERE_MAJOR_CONTRIBUTOR: YES by physical size; unchanged in the controlled success
GIT_WAS_MAJOR_CONTRIBUTOR: YES by physical size; unchanged in the controlled success
REPLITIGNORE_PROTECTS_APP_STORE_ARCHIVE: NO
INTERNAL_TABYAN_SAFE_TARGET: <= 3,800,000,000 bytes physical workspace
PERMANENT_PREVENTION_RULES_CREATED: YES — documented in this report
PRE_LAUNCH_CHECKLIST_CREATED: YES — documented in this report
SOURCE_CHANGED: NO — this postmortem made no source change; the temporary diagnostic fallback was already reverted
APPLE_IDENTITY_CHANGED: NO
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
FILES_DELETED: NO
PRODUCTION_DATA_CHANGED: NO
```