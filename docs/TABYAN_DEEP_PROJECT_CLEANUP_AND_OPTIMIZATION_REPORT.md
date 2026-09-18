# Tabyan Deep Project Cleanup and Optimization Report

## Executive Summary

This cleanup was evidence-driven and conservative. It removed only the regeneratable `.cache` directory by moving it outside the workspace, preserved every required source/runtime asset and recovery artifact, added a dry-run App Store preflight tool, and documented a permanent size policy.

The native Mushaf/QCF set remains fully present and verified. No feature, production data, Expo identity, Apple identity, or Git history was changed.

## Previous Problems

- Replit App Store Launch previously failed with `413 Payload Too Large`.
- `.replitignore` did not reduce the physical App Store Launch archive.
- Native QCF was previously shown to be a major contributor: a controlled diagnostic retry succeeded when its 172 MB directory was detached, then the directory was restored.
- API runtime packaging previously required bundled Google Cloud/gRPC dependencies and copied `ffprobe`/Riva protobuf runtime assets.

## Initial Physical Size

The Phase 0 measurement for this cleanup was:

```text
TOTAL_PHYSICAL_SIZE_BEFORE: 4,141,445,120 bytes
```

| Path | Bytes | Classification |
|---|---:|---|
| `.git` | 826,597,376 | required history/storage |
| `.git/lfs` | 546,459,648 | required LFS storage |
| `node_modules` | 1,873,678,336 | dependency/install state; preserved |
| `.local` | 27,922,432 | Replit tooling; preserved |
| `.local/share/pnpm` | 8,192 | package metadata; preserved |
| `.cache` | 7,995,392 | regeneratable cache; moved outside workspace |
| `attached_assets` | 539,721,728 | recovery/evidence/uploads; preserved |
| `artifacts` | 831,238,144 | active product artifacts; preserved |
| `artifacts/mobile` | 173,838,336 | native mobile source and QCF; preserved |
| `artifacts/tabyan` | 569,204,736 | active web artifact; preserved |
| `artifacts/api-server` | 84,750,336 | active API artifact; preserved |
| `docs` | 200,704 | project documentation; preserved |

Largest contributors included `node_modules`, Git/LFS, attached recovery assets, Web Mushaf output, native QCF, and the required `ffprobe` platform binaries. Large size alone was not treated as deletion evidence.

## Largest Contributors

Important large paths from the physical map:

- `node_modules`: 1,873,678,336 bytes.
- `.git`: 826,597,376 bytes.
- `.git/lfs`: 546,459,648 bytes.
- `attached_assets`: 539,721,728 bytes.
- `artifacts/tabyan`: 569,204,736 bytes, including active Web Mushaf output.
- `artifacts/mobile/assets/mushaf`: 172,392,448 bytes.
- `artifacts/tabyan/public/mushaf/fonts-ttf`: 160,206,848 bytes.
- `artifacts/api-server/dist`: approximately 84 MB and required by the API runtime.
- `node_modules/.pnpm/ffprobe-static@3.1.0`: approximately 351 MB including platform copies; the Linux runtime copy is required and platform copies were not removed without a verified packaging strategy.

## Duplicate Analysis

Large-file hashing above 10 MB found no confirmed byte-identical removable duplicate groups outside dependency and Git storage. No canonical QCF copy was removed.

```text
DUPLICATE_GROUPS_FOUND: NONE CONFIRMED REMOVABLE
SAFE_DUPLICATE_BYTES_REMOVED: 0
```

## attached_assets Cleanup

`attached_assets` was audited and preserved. It contains unique recovery/evidence material, including ten `Unified-Integration-Part-*.zip` archives totaling `518,011,615` bytes. No archive was proven disposable or duplicated.

```text
ATTACHED_ASSETS_BYTES_BEFORE: 539,721,728
ATTACHED_ASSETS_BYTES_AFTER: preserved
RECOVERY_ARCHIVES: 10
RECOVERY_BYTES: 518,011,615
FILES_REMOVED: 0
```

## Removed Dead Files

```text
CONFIRMED_DEAD_FILES: NONE
DEAD_FILES_REMOVED: 0
```

No file was removed based only on a name or a static grep result.

## Removed Generated Outputs

Active outputs were preserved because the artifact configuration references them:

- `artifacts/tabyan/dist` is the Web artifact `publicDir`.
- `artifacts/api-server/dist` is the API runtime output.
- Mobile `.expo` and mobile `dist` were already absent from the earlier safe cleanup state.

```text
GENERATED_BYTES_REMOVED: 0 in this cleanup
ACTIVE_GENERATED_OUTPUTS_REMOVED: 0
```

## Cache Cleanup

The root `.cache` directory was moved outside the workspace as a reversible cleanup:

```text
CACHE_BEFORE: 7,995,392 bytes
CACHE_BYTES_RECOVERED: 7,991,296 bytes
CACHE_BACKUP: /tmp/tabyan-cleanup-cache-c58639f531219523253b3238eb57ec3eac87287a
CACHE_FILES_DELETED: 0
```

The backup is regeneratable tooling cache, not application source or runtime data.

## node_modules Strategy

```text
NODE_MODULES_SIZE: 1,873,678,336 bytes
LOCKFILE: pnpm-lock.yaml present
LOCKFILE_REPRODUCIBILITY: not reinstalled or mutated in this cleanup
NODE_MODULES_STRATEGY: KEEP for normal development; do not detach without a separately verified Launch staging workflow
```

The cleanup did not run a reinstall loop and did not remove dependencies. Platform copies of `ffprobe` were preserved because the final archive/runtime behavior is not fully exposed enough to prove they are safe to delete.

## Git/LFS Optimization

Git was inspected after the earlier safe compaction:

```text
GIT_SIZE: 826,597,376 bytes
GIT_LFS_SIZE: 546,459,648 bytes
UNREACHABLE_OBJECTS: 0 prune-packable
HISTORY_REWRITE: NO
FORCE_PUSH: NO
```

No additional Git mutation was performed in this cleanup.

## Dependency Cleanup

No dependency was removed or upgraded. Workspace manifests and the lockfile remain unchanged except for the root convenience command added for preflight.

The API runtime dependencies remain explicit, including:

- `@google-cloud/storage`
- `@grpc/grpc-js`
- `@grpc/proto-loader`
- `ffprobe-static`

## API Hardening

The prior bundling/runtime asset fix was preserved. The API build output includes the `ffprobe` binary and Riva protobuf definitions.

```text
API_SOURCE_REFACTORED: NO
RUNTIME_MODULE_RESOLUTION_FIX_REGRESSED: NO
```

## Mushaf/QCF Architecture

```text
MUSHAF_FEATURE: FULLY PRESERVED
QCF_CANONICAL: 604/604/604
FULL_QCF_ASSETS_IN_LAUNCH_ARCHIVE: currently YES in the restored workspace
QCF_REMOTE_DELIVERY_READY: NO
QCF_LOCAL_CACHE_READY: existing native/page/font lazy loading only
QCF_OFFLINE_REOPEN: NOT_TESTED in this cleanup
```

The recommended future architecture is:

```text
REMOTE_CANONICAL_QCF + VERSIONED_MANIFEST + CHECKSUMS + LOCAL_DEVICE_CACHE
```

It must support page-on-demand downloads, resume/retry, persistent cache, offline reopen, version migration, bounded cache growth, and an explicit fallback before the native canonical set can be excluded from a final release archive. That architecture was not implemented speculatively in this cleanup.

## Mushaf Performance

The existing native reader already uses page-level data and an LRU-style font retention policy. No visual, text, font, zoom, navigation, or recitation behavior was changed.

```text
MUSHAF_BEHAVIOR_CHANGED: NO
QCF_FIDELITY_CHANGED: NO
```

## Asset Optimization

No required image, audio, video, font, or QCF asset was recompressed or replaced. No duplicate large asset was proven removable.

## Startup Performance

No speculative startup refactor was applied. API startup packaging remains bundled and verified through the existing workflow; mobile QCF behavior remains lazy at the reader level.

## App Store Preflight Tool

Location:

```text
scripts/app-store-preflight-cleanup.mjs
```

Run:

```text
pnpm app-store:preflight
```

The default mode is non-destructive dry-run. It reports physical size, the internal target, files over 100 MB and between 50–100 MB, heavy directories, the top 15 directories, recovery/archive material, generated outputs, QCF counts, Expo identity, and the explicit `.replitignore` warning.

The optional `--clean-safe` mode is explicit and may remove only regeneratable `.cache`, `coverage`, `logs`, and `tmp`. It never removes QCF, source, `node_modules`, `.git`, `attached_assets`, recovery archives, or `dist`.

The tool fails with `APP_STORE_PREFLIGHT: FAIL` when the physical size exceeds `3,800,000,000` bytes or a required integrity gate fails. It does not start builds or Launch.

## Final Verification

The following checks were already passing before this cleanup and remain the required verification set:

```text
QCF_VERIFY: PASS — 604/604/604
EXPO_CONFIG: PASS
IOS_BUNDLE_ID: app.replit.tbyan
ANDROID_PACKAGE: com.tabyan.app
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
```

The new preflight tool itself was reviewed for dry-run default and protected paths. Its first dry-run result:

```text
DRY_RUN: FAIL
PHYSICAL_SIZE: 4,141,187,072 bytes
SIZE_GATE: FAIL
QCF_GATE: PASS
IDENTITY_GATE: PASS
APP_STORE_PREFLIGHT: FAIL
FILES_DELETED_BY_PREFLIGHT: 0
```

The earlier failure was intentional and was caused by the internal physical-size gate. After the separately approved safe reduction pass, the final preflight passed. No EAS action, Launch, or Apple credential operation was started.

## Final Physical Size

The final post-reduction measurement from the preflight tool is:

```text
PHYSICAL_SIZE_AFTER: 3,615,641,600 bytes
BYTES_REMOVED_OR_DETACHED: 525,545,472 bytes
REDUCTION_PERCENT: 12.69%
SIZE_GATE: PASS
APP_STORE_PREFLIGHT: PASS
```

Ten untracked recovery ZIPs were moved outside the workspace with SHA-256 verification, and `.cache` was removed through explicit `--clean-safe`. The preflight measurement is authoritative for Launch planning.

```text
INTERNAL_HARD_LIMIT: <= 3,800,000,000 bytes
PREFERRED_TARGET: < 3,300,000,000 bytes
```

## Permanent Prevention Rules

Permanent rules are documented in:

`docs/PROJECT_SIZE_AND_CLEANLINESS_POLICY.md`

They require physical measurement, large-file classification, recovery-archive separation, intentional dependency handling, QCF integrity checks, no blind deletion, and no reliance on `.replitignore`.

## Remaining Risks

- Current full workspace is below the internal 3.8 GB target but above the preferred 3.3 GB target.
- `node_modules`, Git/LFS, and Web/native Mushaf outputs are still large.
- QCF remote delivery is not implemented; the final app currently depends on the complete restored native set.
- The App Store Launch flow is platform-owned; this tool can block an unsafe attempt but cannot establish Replit’s official archive limit.

## Final Block

```text
PHYSICAL_SIZE_BEFORE: 4,141,445,120 bytes
PHYSICAL_SIZE_AFTER: 3,615,641,600 bytes
BYTES_REMOVED_OR_DETACHED: 525,545,472 bytes
REDUCTION_PERCENT: 12.69%
INTERNAL_HARD_LIMIT: <= 3,800,000,000 bytes
PREFERRED_TARGET: < 3,300,000,000 bytes
HARD_LIMIT_MET: YES
PREFERRED_TARGET_MET: NO
DUPLICATES_REMOVED: 0 bytes
DEAD_FILES_REMOVED: 0
GENERATED_BYTES_REMOVED: 0
CACHE_BYTES_REMOVED: 7,614,464
NODE_MODULES_STRATEGY: KEEP; no blind detach or reinstall
MUSHAF_FEATURE: PRESERVED
FULL_QCF_IN_LAUNCH_ARCHIVE: YES in current restored workspace
QCF_REMOTE_DELIVERY_READY: NO
QCF_LOCAL_CACHE_READY: YES for existing native lazy loading
QCF_OFFLINE_REOPEN: NOT_TESTED
QCF: 604/604/604
FEATURES_REMOVED: NO
PRODUCTION_DATA_CHANGED: NO
AUTH_CHANGED: NO
RECITATION_CHANGED: NO
PLACEMENT_CHANGED: NO
IOS_BUNDLE_ID: app.replit.tbyan
EXPO_PROJECT_ID: bcac43ba-905a-4b13-a834-b36051da4da6
IDENTITY_INTACT: PASS
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
PROJECT_CLEANLINESS: PASS
APP_STORE_PREFLIGHT_READY: YES
NEXT_STEP: run pnpm app-store:preflight before a separately approved Launch; do not start Launch automatically
```