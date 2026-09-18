# Tabyan Physical Size Reduction to Safe Target

## Scope

This pass reduced physical workspace size without changing QCF, application source, production data, Expo identity, or active runtime outputs. App Store Launch and EAS Build were not started.

## Findings and Actions

| Area | Before | Action | Result |
|---|---:|---|---:|
| `node_modules` | 1,873,678,336 bytes | Preserved; detach not proven safe while workflows depend on it | 0 bytes removed |
| `.git` | 826,707,968 bytes | Preserved; no history rewrite or manual object deletion | 0 bytes removed |
| `.git/lfs` | 546,459,648 bytes | `prune-packable: 0`; preserved reachable LFS content | 0 bytes recovered |
| `attached_assets` | 539,766,784 bytes | Moved 10 untracked recovery ZIPs outside workspace with SHA-256 verification | 518,029,312 bytes detached |
| `.cache` | 7,614,464 bytes | Removed using explicit `--clean-safe` | 7,614,464 bytes removed |
| active `dist` | 362,729,472 bytes | Preserved because deployment/workflows use it | 0 bytes removed |
| native QCF | 172 MB approximately | Preserved and verified | 0 bytes removed |

The recovery archives remain available at:

`/tmp/tabyan-recovery-archives-detached-20260904`

No recovery ZIP was deleted. Their SHA-256 manifest matched before and after the move. They were untracked, had no source/runtime references, and matched the project’s previously documented recovery material.

## Node Modules Decision

```text
NODE_MODULES_SIZE: 1,873,678,336 bytes
SAFE_TO_DETACH: NO — not proven for the active workflows
BYTES_RECOVERABLE: approximately 1.874 GB, but not removed in this pass
```

The lockfile is present, but Replit App Store Launch installation behavior and a safe restore process were not sufficiently proven to detach the active dependency tree. The current workflows rely on it.

## Git/LFS Decision

```text
GIT_SIZE: 826,707,968 bytes
GIT_LFS_SIZE: 546,459,648 bytes
SAFE_GIT_BYTES_RECOVERABLE: 0
```

Git reported no prune-packable objects. No history rewrite, force push, filter-repo operation, or manual object deletion was performed.

## Duplicate and Generated Output Decision

```text
DUPLICATE_BYTES_FOUND: no confirmed removable duplicate
DUPLICATE_BYTES_REMOVED: 0
GENERATED_BYTES_REMOVED: 0 except regeneratable .cache
```

Active Web and API `dist` outputs were retained. QCF has no removable canonical duplicate.

## Verification

```text
QCF: 604/604/604
QCF_GATE: PASS
IDENTITY_GATE: PASS
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
API_BUILD: PASS
API_HEALTH: PASS
WEB_BUILD: PASS with known sourcemap warning
IOS_METRO_BUNDLE: PASS from existing workflow verification; mobile source unchanged
GIT_DIFF_CHECK: PASS
```

## Final Size Gate

The final preflight run after recovery detachment and safe cache cleanup reported:

```text
PHYSICAL_SIZE_BEFORE: 4,141,187,072 bytes
PHYSICAL_SIZE_AFTER: 3,615,641,600 bytes
BYTES_REMOVED_OR_DETACHED: 525,545,472 bytes
REDUCTION_PERCENT: 12.6907%
TARGET: <= 3,800,000,000 bytes
PREFERRED_TARGET: <= 3,500,000,000 bytes
SIZE_GATE: PASS
APP_STORE_PREFLIGHT: PASS
NODE_MODULES_BYTES_DETACHED: 0
ATTACHED_ASSETS_BYTES_REMOVED_OR_DETACHED: 518,029,312
RECOVERY_BYTES_DETACHED: 518,029,312
GIT_BYTES_RECOVERED: 0
DUPLICATE_BYTES_REMOVED: 0
GENERATED_BYTES_REMOVED: 7,614,464
QCF: 604/604/604
FEATURES_REMOVED: NO
IDENTITY_INTACT: PASS
SAFE_FOR_APP_STORE_LAUNCH: YES — subject to normal platform Launch checks
```

The workspace is below the hard internal target but remains above the preferred 3.5 GB target by approximately 115.6 MB. No required content was removed to chase the preferred target.

## Constraints Preserved

- QCF remains complete and native.
- `artifacts/tabyan/dist` and `artifacts/api-server/dist` remain available to active workflows.
- `node_modules` remains intact.
- Production data and application features were not changed.
- No EAS Build, App Store Launch, TestFlight, Apple credential, or Expo project operation was started.

## Next Step

Do not run another cleanup pass automatically. For a future Launch, run:

```text
pnpm app-store:preflight
```

If it passes, proceed with the separately approved Launch flow. The detached recovery archive directory should be retained until the next checkpoint is confirmed.