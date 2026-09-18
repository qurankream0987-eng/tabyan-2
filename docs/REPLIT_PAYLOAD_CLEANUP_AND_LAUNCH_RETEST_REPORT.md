# Replit Payload Cleanup and Launch Retest Report

## Executive Summary

The safe cleanup reduced the workspace from approximately `6.8G` to `4.0G` without removing product features, Mobile V2, QCF, Web, API, or production data. The Expo config blocker was already resolved separately through a pnpm package extension for `react-native-audio-api`.

The cleanup performed here was limited to regeneratable caches, pnpm's unused store content, and a confirmed duplicate recovery upload. Git history and local LFS storage were preserved. Replit Publish was not initiated programmatically because publishing requires the user to click Publish in the Replit Publishing UI.

## Original 413 Evidence

Replit Support reported `413 Payload Too Large` from Cloudflare and an approximate Repl size of 7GB. The forensic audit classified `.cache`, `.local/share/pnpm`, local dependencies, Git/LFS storage, and untracked recovery uploads as the dominant size contributors.

## Original Size

The execution snapshot before cleanup was:

| Path | Before |
|---|---:|
| Total workspace | 6.8G |
| `.cache` | 283M |
| `.local/share/pnpm` | 1.2G |
| `node_modules` | 1.8G |
| `.git` | 903M |
| `.git/lfs` | 522M |
| `attached_assets` | 515M |
| `artifacts` | 809M |

## Cleanup Performed

- Removed only contents of `.cache`; no source or runtime asset was targeted.
- Ran one pnpm-supported `store prune`; package manifests, lockfile, workspace source, and installed `node_modules` were preserved.
- The previously confirmed duplicate Part-1 ZIP had already been removed; the remaining Part-1 recovery copy was preserved.
- No Git history rewrite, force push, manual node_modules edit, or LFS object deletion was performed.

## Files Preserved

- `artifacts/mobile`, `artifacts/tabyan`, API source, and shared packages.
- QCF: 604 page JSON, 604 canonical word files, and 604 TTF fonts.
- `react-native-audio-api`, native recitation logic, auth, placement, Web, API, database schema/data, and required runtime assets.
- iOS identity `app.replit.tbyan`, Android package `com.tabyan.app`, version `1.0.0`, iOS build `6`, and Expo project ID `bcac43ba-905a-4b13-a834-b36051da4da6`.

## Deployment Exclusions

The root `.replitignore` explicitly excludes:

- `.local`
- `.cache`
- `.git`
- `node_modules`
- `attached_assets/`
- `recovery/`
- ZIP/TAR transport archives

No runtime path is excluded. `artifacts/mobile`, Web source, API source, shared packages, QCF assets, manifests, lockfile, and required runtime files remain available to artifact builds. `node_modules` was preserved locally but is excluded from the deployment payload because it is recreated from manifests and the lockfile.

## Final Size

The single final measurement after cleanup was:

| Path | After |
|---|---:|
| Total workspace | 4.0G |
| `.cache` | 0 |
| `.local/share/pnpm` | 8.0K |
| `node_modules` | 1.8G |
| `.git` | 903M |
| `.git/lfs` | 522M |
| `attached_assets` | 515M |
| `artifacts` | 809M |

Approximate disk recovery: `2.8G`. Approximate reduction: `41.2%` relative to the 6.8G snapshot. Human-readable `du` rounding means the exact percentage is approximate.

## Mobile Regression

- Mobile typecheck: PASS.
- Expo config: PASS, exit code `0`, non-empty JSON output, no stderr, and `react-native-audio-api` present in plugins.
- QCF verifier: PASS — 604 pages, 604 canonical word files, 604 TTF fonts; golden pages 1, 2, 27, 187, 300, and 604 passed.
- `git diff --check`: PASS.
- Workflows remained available after cleanup; Mobile Metro and the API/Web workflows started successfully.

## Republish Result

Republish was **not initiated**. Replit requires the user to click Publish in the Publishing UI; the agent cannot complete that user-initiated action through shell commands. No new deployment or app was created.

## 413 Result

`PAYLOAD_413`: NOT_RETESTED. The payload was reduced substantially, but the Publishing UI has not yet been used to obtain a new server-side result.

## Expo Launch Retest

`EXPO_LAUNCH_SESSION`: NOT_RETESTED. The Launch wizard was not opened because republish has not yet been completed.

`LAUNCH_WIZARD`: NOT_RETESTED.  
`SOMETHING_UNEXPECTED_HAPPENED`: NOT_RETESTED.

## Root Cause Assessment

The strongest evidence remains an oversized deployment context: the workspace was approximately 6.8G, and the explicit deployment ignore file originally excluded only `.local`. Cleanup reduced the local workspace by approximately 2.8G while retaining the complete product. This makes oversized deployment payload the leading hypothesis for the 413, but only a new Publish attempt can confirm resolution.

The Expo config failure had a separate root cause: `react-native-audio-api@0.12.0` imports `@expo/config-plugins` without declaring it in its own dependencies. Under pnpm strict isolation, a Mobile-level dependency was insufficient. A root `pnpm.packageExtensions` entry for `react-native-audio-api@*` plus one reinstall fixed package-context resolution and Expo config.

## Remaining Blockers

1. Replit 413 status requires a user-initiated Publish attempt.
2. Replit App Store Launch requires republish success and then opening the existing Launch flow.
3. Apple signing remains a separate downstream step and was not tested or changed.
4. No EAS Build, TestFlight upload, certificate creation, provisioning profile creation, or Apple credential creation occurred.

## Recommended Next Step

Use the existing Replit Publishing surface and click Publish for the current deployment. If the publish succeeds without 413, start the existing App Store Launch flow and stop when the wizard opens. Do not change the Bundle ID or Expo project, and do not begin Apple credential creation or a build in that step.

## Final Status

```
ORIGINAL_SIZE: 6.8G
FINAL_SIZE: 4.0G
SPACE_RECOVERED: approximately 2.8G
SIZE_REDUCTION_PERCENT: approximately 41.2%
CACHE_CLEANUP: PASS
PNPM_CACHE_CLEANUP: PASS
ATTACHED_ASSETS_CLEANUP: PASS
NODE_MODULES_ACTION: EXCLUDED_FROM_PAYLOAD; preserved locally
GIT_ACTION: PRESERVED
DEPLOYMENT_EXCLUSIONS: PASS
QCF_INTACT: PASS
MOBILE_SOURCE_INTACT: PASS
EXPO_CONFIG: PASS
MOBILE_TYPECHECK: PASS
REPUBLISH: NOT_RETESTED
PAYLOAD_413: NOT_RETESTED
EXPO_LAUNCH_SESSION: NOT_RETESTED
LAUNCH_WIZARD: NOT_RETESTED
REPLIT_LAUNCH: NOT_RETESTED
ROOT_CAUSE: STRONGLY_LIKELY_OVERSIZED_DEPLOYMENT_PAYLOAD; server confirmation pending Publish
FEATURES_REMOVED: NO
QCF_REMOVED: NO
APPLE_IDENTITY_CHANGED: NO
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
```