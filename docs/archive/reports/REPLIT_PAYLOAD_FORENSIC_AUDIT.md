# Replit Payload Forensic Audit

**Date:** 2026-09-02  
**Scope:** read-only size and deployment-payload audit. No cleanup, install, `git gc`, prebuild, Build, Submit, or Publish was run.

## Executive Summary

The workspace is `7,284,523,008` bytes (`6.8G` as reported by `du -xsh .`). The product source and runtime assets are not the main cause of the size. The largest areas are regeneratable tooling caches, the pnpm store, installed dependencies, Git/LFS local storage, and untracked recovery uploads.

The current `.replitignore` excludes only `.local`. Therefore, it is **observed** that the deployment-specific ignore file does not exclude `.cache`, `.git`, `node_modules`, or `attached_assets`. Whether each is finally copied by Replit's publishing service is not fully observable from the workspace; this is the strongest current explanation for the reported 413.

No product feature, database row, QCF runtime asset, Apple identity, EAS project, or Git history was changed by this audit.

## Support Evidence

Support reported:

- `413 Payload Too Large` from Cloudflare.
- Repl size approximately 7GB.
- Approximate areas: `.cache` 1.5G, `.local` 1.4G, `.git` 903M, `artifacts` 809M, `attached_assets` 571M.

Known separately:

- Replit Launch logs had `launches: []` and no Expo Launch session.
- Expo config previously had a `react-native-audio-api` plugin resolution blocker for `@expo/config-plugins`.
- Apple signing has not been authenticated or configured in EAS.

## Current Disk Usage

| Path | Size | % of total | Classification | Notes |
|---|---:|---:|---|---|
| `.` | 6.8G | 100.0% | UNKNOWN aggregate | `du -x` total: 7,284,523,008 bytes |
| `node_modules` | 1.8G | 25.7% | DEPENDENCIES | Regeneratable; needed locally, not source |
| `.cache` | 1.5G | 21.2% | REGENERATABLE_CACHE | Mostly Playwright, pnpm/dlx, TypeScript |
| `.local` | 1.4G | 20.1% | TOOLING / CACHE | `share/pnpm` is 1.4G |
| `.git` | 903M | 12.9% | GIT_HISTORY / LOCAL_LFS | Includes 522M `.git/lfs` and 380M Git objects |
| `artifacts` | 809M | 11.1% | APP_SOURCE / RUNTIME / GENERATED | Includes Web, API, Mobile, QCF and generated output |
| `attached_assets` | 571M (`598.4M` bytes) | 8.1% | RECOVERY_ARCHIVE | 314 untracked files, 11 ZIPs |

The percentages overlap conceptually because the displayed areas are nested or measured with filesystem rounding; the total is the authoritative aggregate.

## Top Large Paths

Top observed directories:

1. `node_modules` — 1.87G
2. `.cache` — 1.55G
3. `.local` — 1.47G
4. `.local/share/pnpm` — 1.44G
5. `.git` — 945.8M
6. `artifacts` — 847.7M
7. `.cache/ms-playwright` — 687.3M
8. `attached_assets` — 598.4M
9. `.git/lfs` — 546.5M
10. `.git/objects` — 398.3M
11. `artifacts/tabyan` — 409.6M
12. `artifacts/mobile` — 356.5M
13. `artifacts/mobile/assets` — 172.8M
14. `artifacts/mobile/dist` — 182.6M
15. `artifacts/tabyan/public` — 275.0M
16. `.cache/pnpm` — 564.6M
17. `.cache/pnpm/dlx` — 271.0M
18. `.cache/typescript/5.9` — 176.4M
19. `artifacts/tabyan/dist` — 118.9M
20. `node_modules/.pnpm/ffprobe-static@3.1.0` — 351.5M

## Top Large Files

The largest observed files were:

| Size | Path | Classification |
|---:|---|---|
| 277.15M | `.cache/ms-playwright/chromium-1234/.../chrome` | REGENERATABLE_CACHE |
| 239.06M | `.git/objects/pack/*.pack` | GIT_HISTORY |
| 187.85M | `.cache/ms-playwright/chromium_headless_shell-1234/.../chrome-headless-shell` | REGENERATABLE_CACHE |
| 72.97M | `node_modules/.pnpm/ffprobe-static.../darwin/arm64/ffprobe` | DEPENDENCY |
| 61.55M | `node_modules/.pnpm/ffprobe-static.../linux/x64/ffprobe` | DEPENDENCY |
| 61.55M | `artifacts/api-server/dist/bin/ffprobe` | GENERATED / RUNTIME BINARY |
| 60.14M | `node_modules/.pnpm/ffprobe-static.../win32/x64/ffprobe.exe` | DEPENDENCY |
| 58.35M | `attached_assets/Unified-Integration-Part-5...zip` | RECOVERY_ARCHIVE |
| 56.14M | each of the two Part-1 ZIP files | RECOVERY_ARCHIVE / DUPLICATE |
| 54.12M | Part-2 ZIP and matching local LFS object | RECOVERY_ARCHIVE / GIT-LFS |
| 51.08M–50.05M | Parts 3–9 ZIPs and matching local LFS objects | RECOVERY_ARCHIVE / GIT-LFS |

## Storage Classification

| Classification | Estimated size | Basis |
|---|---:|---|
| REAL_APP_SOURCE | approximately 10–20M | Mobile/Web/API source and configuration, excluding generated/dependency trees |
| RUNTIME_ASSETS | approximately 445–450M | QCF and Web/Mobile public assets; QCF is intentional runtime data |
| DEPENDENCIES | approximately 1.8G | Root pnpm virtual store and installed workspace dependencies |
| REGENERATABLE_CACHE | approximately 1.5G | `.cache`, especially Playwright and pnpm/dlx caches |
| GENERATED_BUILD_OUTPUT | approximately 300M | Mobile `dist` and Web `dist`; some outputs are deployment-build inputs/outputs |
| RECOVERY_ARCHIVE | approximately 533M | Eleven large Unified Integration ZIPs in `attached_assets` |
| DUPLICATE | 56.14M confirmed | The two Part-1 ZIPs have the same SHA-256 |
| GIT_HISTORY | approximately 380M packed/loose Git objects | Reachable Git data; separate from local LFS storage |
| TOOLING | approximately 1.44G | `.local/share/pnpm`; excluded from deployment by current `.replitignore` |
| UNKNOWN | remainder / rounding | Includes metadata and files not safely assigned from size alone |

Conclusion: the application is not unusually large by itself; the Replit environment is large.

## Cache Analysis

Largest `.cache` children:

| Path | Size | Tool | Regeneratable | Runtime required |
|---|---:|---|---|---|
| `.cache/ms-playwright` | 656M | Playwright browsers | YES | NO |
| `.cache/pnpm` | 539M | pnpm store/dlx/metadata cache | YES | NO |
| `.cache/typescript` | 169M | TypeScript cache | YES | NO |
| `.cache/node-gyp` | 64M | native package build cache | YES | NO |
| `.cache/node` | 21M | Node/Corepack cache | YES | NO |
| `.cache/uv` | 28M | Python tooling cache | YES | NO |

`CACHE_SAFE_CLEANUP_POTENTIAL`: approximately **1.5G**, without touching application source or runtime assets.

## `.local` Analysis

| Path | Size | Purpose | Regeneratable | Required for runtime |
|---|---:|---|---|---|
| `.local/share/pnpm/store/v10` | 1.4G | pnpm package store | YES | NO for deployed runtime |
| `.local/state/replit` | 22M | Replit durable/tool state | UNKNOWN | NO for app runtime |
| `.local/skills` and `.local/secondary_skills` | approximately 3M | Agent tooling | YES / managed | NO |

`.replitignore` currently excludes `.local`, so this is already excluded from the deployment payload according to Replit's documented ignore behavior.

`LOCAL_SAFE_CLEANUP_POTENTIAL`: approximately **1.4G** on disk, but deleting the active pnpm store would require a later dependency reinstall for local cold-start workflows. Do not remove it as part of this audit-only pass.

## `attached_assets` Analysis

There are 314 untracked files totaling approximately 598.4M on disk. Eleven large ZIPs total approximately 533M and are named `Unified-Integration-Part-1` through `Part-10`; Part-1 exists twice with an identical SHA-256.

| Group | Size | Source referenced | Runtime required | Recovery only | Duplicate |
|---|---:|---|---|---|---|
| Unified Integration ZIPs | approximately 533M | NO in app source; referenced by audit memory/docs only | NO | YES | Part-1 duplicate confirmed |
| Images/HTML/screenshots | approximately 65M combined | UNKNOWN individually | NO known runtime reference | YES / UNKNOWN | UNKNOWN |

`attached_assets/` is ignored by `.gitignore` and `.replitignore` is present, so its deployment exclusion is **UNKNOWN** unless Replit applies Git ignore rules in addition to the explicit `.replitignore`. It is not tracked by the current Git tree. No attached file was deleted.

`ATTACHED_ASSETS_RUNTIME_SIZE`: no confirmed runtime-required file.  
`ATTACHED_ASSETS_RECOVERY_SIZE`: approximately 533M for the ZIP set.  
`ATTACHED_ASSETS_POTENTIALLY_REMOVABLE`: approximately 56.14M confirmed duplicate; the remaining archive set is removable only after the user confirms recovery retention policy.

## `artifacts` Analysis

| Artifact | Size | Large children | Classification |
|---|---:|---|---|
| `artifacts/mobile` | 356.5M | `assets` 172.8M, `dist` 182.6M | SOURCE + QCF_RUNTIME + GENERATED |
| `artifacts/tabyan` | 409.6M | `public` 275.0M, `dist` 118.9M | WEB SOURCE + QCF_RUNTIME + GENERATED |
| `artifacts/api-server` | 75M | `dist` includes `ffprobe` | API SOURCE + GENERATED/RUNTIME BINARY |
| `artifacts/mockup-sandbox` | 3.3M | node_modules | DESIGN TOOLING |

The Mobile QCF page directory contains 604 JSON files. The verified project state also contains 604 canonical word files and 604 TTF runtime fonts. A generated Mobile `dist` copy also contains 604 font files. These are intentional runtime assets, not accidental duplication.

No QCF file is recommended for deletion. `artifacts/mobile`, Web source, API source, `react-native-audio-api`, and production configuration are protected.

## Git History Analysis

`git count-objects -vH`:

- loose objects: 1,568 objects / 140.54M
- packed objects: 7,475 objects / 239.26M
- packs: 1
- garbage: 0
- `.git/objects`: approximately 380M
- `.git/lfs`: approximately 522M

The largest reachable historical blob mapped to an attached Part-10 ZIP at approximately 22M; other large historical blobs include attached images/HTML and the Mobile/Web runtime tree. The local LFS store contains the large Unified Integration ZIP objects.

`GIT_LIVE_TREE_SIZE_ESTIMATE`: approximately 1.2–1.5G excluding caches, Git metadata, and recovery uploads; exact value depends on whether installed dependencies and generated outputs are counted.

`GIT_HISTORY_BLOAT_ESTIMATE`: approximately 380M Git object storage plus approximately 522M local LFS storage.  
Deleting working-tree files alone reduces neither reachable Git history nor local LFS objects.  
History rewrite would be required for a large reduction of reachable historical blobs; it was not performed and remains prohibited.

## Duplicate Analysis

Confirmed duplicate group:

- SHA-256 `f4a2100c...3366f`
- 56.14M per copy
- 2 copies
- 56.14M confirmed wasted space
- `attached_assets/Unified-Integration-Part-1_1785765818064.zip`
- `attached_assets/Unified-Integration-Part-1_1785766258550.zip`

The matching LFS objects correspond to the uploaded archive set, but no QCF duplicate was marked removable. The Mobile/Web QCF copies are separate runtime locations for separate artifacts.

`TOTAL_CONFIRMED_DUPLICATE_WASTE`: **56.14M**.

## Deployment Payload Analysis

### Observed

- A root `.replitignore` exists and contains only `.local`.
- Artifact production configuration builds Web and Mobile from their artifact directories.
- `.gitignore` excludes `.cache`, `.local`, `node_modules`, `dist`, `build`, `attached_assets`, and credentials.
- `attached_assets` is not tracked by the current Git tree.
- `.cache`, `.git`, `node_modules`, and `attached_assets` are not listed in `.replitignore`.

### Inferred

The missing explicit exclusions make `.cache`, `.git`, local dependencies, and recovery uploads plausible deployment-payload bloat. `.local` is already excluded. Adding safe non-runtime exclusions to `.replitignore` is the highest-impact low-risk remediation, but was not done because this pass is audit-only.

### Unknown

The exact internal Replit packaging boundary and whether it independently excludes Git metadata, ignored files, or local dependencies cannot be observed from this workspace. No claim is made that every measured byte is uploaded.

`DEPLOYMENT_PAYLOAD_SCOPE`: **PARTIALLY_KNOWN**  
`LIKELY_PAYLOAD_BLOAT_PATHS`: `.cache`, `.git`, `node_modules`, `attached_assets`, and recovery archives.  
`413_CAUSAL_LINK`: **STRONGLY_LIKELY** — the reported 7GB and the missing `.replitignore` exclusions are consistent with a payload-size rejection, but the exact uploaded byte set is not observable here.

## Replit Launch Analysis

1. **Replit deployment blocker:** 413 Payload Too Large; likely occurs before a valid launch session.
2. **Expo config blocker:** `react-native-audio-api` previously failed to resolve `@expo/config-plugins`; this is separate from payload size and must be rechecked after deployment payload remediation.
3. **Apple signing blocker:** EAS Apple login/credentials are not configured; this matters after the Launch wizard, not as evidence for the current 413.

The 413 can plausibly prevent the Expo Launch wizard from being created. It does not prove that Apple signing is the cause.

## Safe Cleanup Candidates

### LOW RISK — not executed

| Target | Estimated recovery | Risk | Why safe | Verification |
|---|---:|---|---|---|
| `.cache` | approximately 1.5G | Low | Regeneratable tooling cache; no runtime source | Restart workflows; rerun config/typecheck |
| Explicit `.replitignore` entries for `.cache`, `.git`, `node_modules`, recovery uploads | Payload reduction, not direct disk recovery | Low–Medium | Does not delete product files; deployment rebuilds dependencies | Inspect publishing payload and health |
| Confirmed duplicate Part-1 ZIP | 56.14M | Low–Medium | Identical hash; retain the other copy | Hash remaining copy |

### MEDIUM RISK — approval/verification required

| Target | Estimated recovery | Risk | Why not automatic |
|---|---:|---|---|
| `.local/share/pnpm/store/v10` | approximately 1.4G | Medium | Active local cold-start dependency store; requires reinstall afterward |
| Remaining Recovery ZIPs | approximately 477M after duplicate | Medium | Recovery retention has not been explicitly waived |
| `.git/lfs` unreachable objects | up to 522M | Medium | Requires LFS reachability verification; may remove local recovery copies |
| Generated `dist` outputs | approximately 300M | Medium | Artifact production commands may use/recreate them; verify deployment contract first |

### HIGH RISK — prohibited

- Git history rewrite or force push.
- Deleting QCF JSON, canonical word files, TTF fonts, source, API, Mobile V2, production data, or runtime assets.
- Removing `react-native-audio-api` or disabling its plugin.
- Changing Bundle ID, Expo project, Apple identity, or production database.

`LOW_RISK_RECOVERY_ESTIMATE`: approximately **1.5G disk** from cache cleanup, plus 56.14M if the duplicate archive is approved; deployment payload savings require ignore rules and are not represented by disk recovery.  
`LOW_PLUS_MEDIUM_RECOVERY_ESTIMATE`: approximately **3.0G** theoretical, but not safe to claim until pnpm/LFS/recovery retention is approved and verified.  
`POTENTIAL_FINAL_SIZE_AFTER_SAFE_CLEANUP`: approximately **5.2–5.7G** if only low-risk cache cleanup is performed; this is an estimate, not an executed result.

## App Preservation

- `CAN_REPL_SIZE_BE_REDUCED_WITHOUT_REMOVING_PRODUCT_FEATURES`: YES
- `CAN_MOBILE_V2_BE_PRESERVED`: YES
- `CAN_QCF_BE_PRESERVED`: YES
- Protected: Web source, API source, Mobile V2, QCF 604 JSON, 604 canonical word files, 604 TTF, `react-native-audio-api`, database schema/migrations, production data, EAS link, Apple identity.

## Final Decision

```
TOTAL_REPL_SIZE: 6.8G (7,284,523,008 bytes)
REAL_PRODUCT_SIZE: approximately 445–470M including runtime QCF/public assets; source itself approximately 10–20M
REGENERATABLE_CACHE: approximately 1.5G
RECOVERY_ONLY: approximately 533M ZIP archives
CONFIRMED_DUPLICATES: 56.14M
GIT_HISTORY_BLOAT: approximately 380M Git objects + 522M local LFS storage
LOW_RISK_REMOVABLE: approximately 1.5G cache; 56.14M duplicate only after approval
MEDIUM_RISK_REMOVABLE: approximately 1.4G pnpm store + approximately 477M remaining recovery ZIPs + possible LFS objects
POTENTIAL_FINAL_SIZE_AFTER_SAFE_CLEANUP: approximately 5.2–5.7G (estimate only)
413_PAYLOAD_ROOT_CAUSE: STRONGLY_LIKELY
REPLIT_LAUNCH_FAILURE_LINK: STRONGLY_LIKELY
EXPO_CONFIG_BLOCKER: react-native-audio-api cannot resolve @expo/config-plugins; separate blocker
APPLE_SIGNING_BLOCKER: Apple login and EAS signing credentials not configured; separate downstream blocker
CAN_PRESERVE_FULL_APP: YES
CAN_PRESERVE_MOBILE_V2: YES
CAN_PRESERVE_QCF: YES
SAFE_CLEANUP_AVAILABLE: YES
HISTORY_REWRITE_NEEDED: YES for further reachable-history reduction; prohibited and not performed
RECOMMENDED_NEXT_ACTION: approve a separate low-risk cleanup of caches and add explicit deployment exclusions, then verify payload and Expo config before republish
FILES_DELETED: NONE
SOURCE_CHANGED: NO
PRODUCTION_CHANGED: NO
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
```