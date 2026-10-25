# Tabyan — Final Size and Deployment Payload Audit

**Audit date:** 2026-09-03  
**Scope:** Read-only workspace and deployment-payload audit. No cleanup, deletion, reinstall, `git gc`, Publish, EAS Build, or Apple credential operation was performed.

## Executive Summary

The current workspace measures approximately **4.29 GB**. The largest local consumers are `node_modules` (about 1.87 GB), `.git` (about 946 MB), `attached_assets` (about 540 MB), and generated mobile/web/API outputs. The current `.replitignore` excludes the local dependency install, Git metadata, caches, and uploaded recovery/transport archives from the deployment image.

Based on the current configuration and the successful recent Replit build, the workspace is larger than the effective deployment input. The remaining size risk is primarily the intentionally tracked/runtime content and generated build outputs, not the excluded local caches or recovery archives. The App Store Launch blocker is separate from this size audit: the Launch wizard fails before Apple authentication.

## Current Workspace Size

```text
TOTAL_PROJECT_SIZE: 4,290,973,696 bytes (~4.00 GiB / ~4.29 GB decimal)
PREVIOUS_TOTAL_SIZE: ~6.8G
POST_CLEANUP_REPORTED_SIZE: ~4.0G
CURRENT_TOTAL_SIZE: ~4.29 GB
```

## Largest Directories

Largest measured paths (workspace-local disk usage):

| PATH | SIZE | TYPE | RUNTIME_REQUIRED |
|---|---:|---|---|
| `node_modules` | 1,873,678,336 B (~1.87 GB) | dependency install | NO — recreated by build |
| `.git` | 946,413,568 B (~946 MB) | Git metadata | NO |
| `artifacts` | 854,278,144 B (~854 MB) | application artifacts | PARTIAL |
| `attached_assets` | 539,652,096 B (~540 MB) | uploaded/recovery files | NO |
| `artifacts/tabyan` | 409,595,904 B (~410 MB) | web artifact | YES/PARTIAL |
| `artifacts/mobile` | 356,483,072 B (~356 MB) | mobile artifact | YES/PARTIAL |
| `.local` | 34,717,696 B (~34.7 MB) | workspace tooling | NO |
| `.pythonlibs` | 28,784,640 B (~28.8 MB) | local tooling | UNKNOWN |
| `.cache` | 7,992,? B (~8 MB) | build cache | NO |
| `artifacts/api-server` | 84,772,800 B (~84.8 MB) | API artifact | YES/PARTIAL |

The top direct file was Git's packed object database at approximately 250.7 MB. Other large local files include platform copies of `ffprobe` and ten uploaded ZIP recovery/integration archives.

## Largest Files

The largest observed files were:

| PATH | SIZE | CLASSIFICATION |
|---|---:|---|
| `.git/objects/pack/pack-*.pack` | ~250.7 MB | recovery/history metadata |
| `node_modules/.../ffprobe-static/.../darwin/arm64/ffprobe` | ~76.5 MB | regeneratable dependency binary |
| `artifacts/api-server/dist/bin/ffprobe` | ~64.5 MB | required runtime binary |
| `node_modules/.../ffprobe-static/.../linux/x64/ffprobe` | ~64.5 MB | local dependency copy |
| `node_modules/.../ffprobe-static/.../win32/x64/ffprobe.exe` | ~63.1 MB | regeneratable dependency binary |
| `.git/lfs/objects/*` | ~52–61 MB each | LFS/history objects |
| `attached_assets/Unified-Integration-Part-*.zip` | ~23.6–61.2 MB each | recovery/transport archives |
| `artifacts/mobile/dist` | ~182.6 MB total | generated mobile output |
| `artifacts/tabyan/dist` | ~118.9 MB total | generated web output |
| `artifacts/api-server/dist` | ~84.2 MB total | generated API output plus runtime assets |

## attached_assets Analysis

The directory is approximately **539.7 MB**. Its largest files are ten `Unified-Integration-Part-*.zip` archives, ranging from approximately 23.6 MB to 61.2 MB, plus screenshots and saved HTML captures.

| FILE GROUP | SIZE | TRACKED_BY_GIT | REFERENCED_BY_SOURCE | RUNTIME_REQUIRED | SAFE_TO_EXCLUDE_FROM_DEPLOYMENT |
|---|---:|---|---|---|---|
| `Unified-Integration-Part-*.zip` | ~502 MB combined | NO in current status | NO | NO | YES |
| screenshots/images | several MB combined | NO/UNKNOWN | UNKNOWN | NO | YES |
| saved HTML captures | ~4.3 MB combined | NO/UNKNOWN | NO | NO | YES |

No deletion was performed. `.replitignore` excludes `attached_assets/`, `*.zip`, `*.tar`, `*.tar.gz`, and `*.tgz`.

## Git LFS Analysis

```text
GIT_SIZE: ~946.4 MB
GIT_LFS_SIZE: ~546.5 MB
```

The largest LFS objects are approximately 52–61 MB each and correspond to uploaded integration/recovery archives in the current workspace evidence. They are history/recovery data, not required runtime inputs for the current API or web process.

```text
LFS_RUNTIME_REQUIRED: NO for the observed archive objects
```

No LFS object was deleted, pruned, or removed from history.

## node_modules Analysis

```text
NODE_MODULES_SIZE: ~1,873,678,336 bytes (~1.87 GB)
NODE_MODULES_INCLUDED_IN_DEPLOYMENT: NO
```

Evidence:

- `.replitignore` contains `node_modules`.
- Replit's production build log installs packages with `pnpm install` in the build environment.
- The artifact build bundles the API JavaScript and copies only explicit runtime files such as `ffprobe` and Riva protobuf definitions.

Therefore the local `node_modules` size should not be treated as deployment payload size.

## .replitignore Analysis

```text
REPLITIGNORE_PRESENT: YES
EXCLUDES_CACHE: YES
EXCLUDES_PNPM_STORE: PARTIAL/NOT EXPLICIT
EXCLUDES_NODE_MODULES: YES
EXCLUDES_RECOVERY_FILES: YES
EXCLUDES_GIT_INTERNALS: YES
EXCLUDES_RUNTIME_REQUIRED_FILES: NO
```

Important rules currently present:

```text
.local
.cache
.git
node_modules
attached_assets/
recovery/
*.zip
*.tar
*.tar.gz
*.tgz
```

No rule observed here excludes `artifacts/api-server/dist/bin/ffprobe` or `artifacts/api-server/dist/protos`, the runtime files explicitly copied by the API build.

## Estimated Deployment Payload

```text
WORKSPACE_SIZE: ~4.29 GB
ESTIMATED_DEPLOYMENT_PAYLOAD: approximately ~0.9–1.2 GB before Replit's build-layer compression and generated-layer handling
ESTIMATED_PAYLOAD_REDUCTION: approximately ~3.1–3.4 GB excluded from the local workspace
```

This is an estimate, not a byte-for-byte reproduction of Replit's internal image builder. The distinction is:

- **Workspace size** includes local installs, Git history, caches, uploaded recovery archives, and generated files.
- **Deployment payload** is the material remaining after deployment exclusions and the files consumed by the artifact build.

The latest recorded Replit build completed successfully, which is additional evidence that the payload is currently processable by the deployment builder.

## Generated Build Outputs

| PATH | SIZE | CURRENTLY_REQUIRED | GENERATED | SAFE_TO_EXCLUDE |
|---|---:|---|---|---|
| `artifacts/mobile/dist` | ~182.6 MB | for current mobile serving/publish flow | YES | only if regenerated during build |
| `artifacts/tabyan/dist` | ~118.9 MB | for current web serving/publish flow | YES | only if regenerated during build |
| `artifacts/api-server/dist` | ~84.2 MB | for API runtime | YES | only if regenerated during build |
| `artifacts/api-server/dist/bin/ffprobe` | ~64.5 MB | YES | copied by build | NO |
| `artifacts/api-server/dist/protos` | small | YES for Riva provider | copied by build | NO |

No generated output was removed. Build outputs must not be excluded if the relevant production service expects to run them after the build step.

## QCF Size

The audit did not alter QCF assets. The previously verified canonical structure remains:

```text
QCF_JSON: 604
QCF_CANONICAL: 604
QCF_FONTS: 604
QCF_INTACT: PASS
QCF_RUNTIME_REQUIRED: YES
QCF_TOTAL_SIZE: not recomputed independently in this read-only pass
QCF_DUPLICATES_FOUND: UNKNOWN
```

No QCF asset was deleted, reduced, moved, or excluded.

## Tracked vs Untracked Heavy Files

### Tracked

The largest tracked files observed were application logos, QCF font files, mobile image assets, and `pnpm-lock.yaml`. Individual tracked assets were well below the largest local recovery and dependency files.

### Untracked

The current Git status was clean. No untracked heavy files were reported by `git status --short`.

### Ignored

The largest ignored groups are `node_modules`, `.git`-adjacent local metadata, `attached_assets`, and generated/build tooling content. The ignore rules keep these out of the deployment input where applicable.

## Required vs Regeneratable Data

```text
LARGE_REQUIRED:
- API runtime binary: artifacts/api-server/dist/bin/ffprobe (~64.5 MB)
- Current mobile/web runtime assets, including QCF assets

LARGE_REGENERATABLE:
- node_modules and package-manager installs
- mobile/tabyan/API dist outputs when rebuilt by their artifact build commands
- platform copies of ffprobe inside node_modules

LARGE_RECOVERY_ONLY:
- attached_assets Unified-Integration-Part ZIP archives
- Git LFS objects associated with those recovery archives
- Git history pack data

LARGE_DUPLICATES:
UNKNOWN from this read-only audit

LARGE_UNKNOWN:
- any files not classifiable from path/configuration alone
```

## Remaining Size Risk

The local workspace is still large, but most of the largest groups are excluded or regenerated. The remaining meaningful deployment inputs are the tracked application artifacts and their runtime assets. No evidence from this audit shows that `node_modules`, `.git`, or the uploaded ZIP archives are entering the deployment payload.

## Safe Cleanup Candidates

No cleanup was performed. Candidates that appear safe to exclude from deployment, already covered by `.replitignore`, are:

- `attached_assets/`
- recovery archives (`*.zip`, `*.tar`, `*.tar.gz`, `*.tgz`)
- `.cache`
- `.local`
- `.git`
- local `node_modules`

Any deletion, LFS pruning, history rewrite, or removal of generated/runtime assets requires explicit approval and is outside this audit.

## Final Recommendation

Do not perform another cleanup cycle based on this evidence. Treat the current App Store Launch failure as a separate Replit Mobile Publishing/backend issue. Provide Replit Support with the App Store Launch evidence report and the deployment identifiers; do not start another EAS Build or Apple credential flow while the wizard fails before authentication.

```text
PREVIOUS_TOTAL_SIZE: ~6.8G
POST_CLEANUP_REPORTED_SIZE: ~4.0G
CURRENT_TOTAL_SIZE: ~4.29 GB
ESTIMATED_DEPLOYMENT_PAYLOAD: ~0.9–1.2 GB (estimate)
NODE_MODULES_SIZE: ~1.87 GB
NODE_MODULES_INCLUDED_IN_DEPLOYMENT: NO
GIT_SIZE: ~946.4 MB
GIT_LFS_SIZE: ~546.5 MB
ATTACHED_ASSETS_SIZE: ~539.7 MB
QCF_TOTAL_SIZE: NOT RECOMPUTED
QCF_INTACT: PASS
REPLITIGNORE: PASS
RUNTIME_FILES_EXCLUDED_BY_MISTAKE: NO
LARGE_DUPLICATES_FOUND: UNKNOWN
RECOVERY_ONLY_DATA_FOUND: YES
SAFE_ADDITIONAL_CLEANUP_AVAILABLE: NO (without explicit approval)
SIZE_STATUS: STILL_LARGE_BUT_MOSTLY_EXCLUDED
CURRENT_APP_STORE_LAUNCH_BLOCKER: SEPARATE_FROM_SIZE
SOURCE_CHANGED: NO
FILES_DELETED: NO
NEXT_RECOMMENDED_ACTION: REPLIT SUPPORT / MOBILE PUBLISHING ENGINEERING
```