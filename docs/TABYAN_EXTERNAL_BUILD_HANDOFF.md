# Tabyan External GitHub / EAS Handoff

This document prepares the current source-of-truth for a GitHub Codespaces or
another external development environment. It does not start an Apple build,
submit to TestFlight, create an EAS project, or create Apple credentials.

## Source of truth

The repository contains the Web app, Mobile V2, API, shared libraries,
database schema/migrations, tests, and runtime Quran assets. Transport and
recovery material under `attached_assets/` is intentionally excluded from the
Git source tree and remains on the original workspace disk.

Runtime QCF assets must remain tracked:

- `artifacts/mobile/assets/mushaf/pages/` — 604 page JSON files
- `artifacts/mobile/assets/mushaf/quran-words/pages/` — 604 canonical word files
- `artifacts/mobile/assets/mushaf/fonts/` — 604 QCF2 TTF files
- Web QCF assets under `artifacts/tabyan/public/mushaf/`

## External environment

| Requirement | Value |
| --- | --- |
| Node.js | 24.x |
| pnpm | 10.26.1 |
| Workspace | pnpm workspace from the repository root |
| Mobile directory | `artifacts/mobile` |
| Expo SDK | 54 |
| Expo Router | 6 |
| React Native | 0.81.5 |

Recommended setup:

```sh
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
```

The committed `pnpm-lock.yaml` is the dependency source of truth. Do not use
npm or yarn for installation.

## Mobile configuration

The canonical files are:

- `artifacts/mobile/app.json`
- `artifacts/mobile/eas.json`
- `artifacts/mobile/metro.config.js`
- `artifacts/mobile/package.json`

Configured native plugins and capabilities include:

- `expo-router`
- `expo-font`
- `expo-camera`
- `expo-location`
- `react-native-audio-api`
- `expo-secure-store`
- Camera, microphone, and location permission descriptions

`react-native-audio-api` is a native dependency. Live recitation requires a
real native build and must not be replaced with WebView, iframe, fake audio,
or a fake backend.

## Environment variable names

Never commit values for any variable. The mobile EAS build/runtime names are:

```text
EXPO_PUBLIC_DOMAIN
EXPO_PUBLIC_PRODUCTION_DOMAIN
EXPO_PUBLIC_WS_ORIGIN
```

Optional external account authentication name:

```text
EXPO_TOKEN
```

API/server runtime names, required only when running the backend outside the
current managed environment, are:

```text
DATABASE_URL
SESSION_SECRET
PUBLIC_OBJECT_SEARCH_PATHS
PRIVATE_OBJECT_DIR
```

The Replit-only development preview variable
`REPLIT_EXPO_DEV_DOMAIN` must not be used as a production API or WebSocket
identity.

Environment classification:

```text
MOBILE_REQUIRED_ENV_NAMES:
  EXPO_PUBLIC_DOMAIN
  EXPO_PUBLIC_PRODUCTION_DOMAIN
  EXPO_PUBLIC_WS_ORIGIN

EAS_BUILD_ENV_NAMES:
  EXPO_PUBLIC_DOMAIN
  EXPO_PUBLIC_PRODUCTION_DOMAIN
  EXPO_PUBLIC_WS_ORIGIN
  EXPO_TOKEN (optional external account authentication)

API_ONLY_ENV_NAMES:
  DATABASE_URL
  SESSION_SECRET
  PUBLIC_OBJECT_SEARCH_PATHS
  PRIVATE_OBJECT_DIR

REPLIT_ONLY_ENV_NAMES:
  REPLIT_EXPO_DEV_DOMAIN
  REPLIT_DEV_DOMAIN
  REPLIT_DOMAINS
  REPLIT_INTERNAL_APP_DOMAIN
  REPL_ID
  EXPO_PUBLIC_REPL_ID
  PORT
```

## Production endpoints

The production mobile configuration points to:

- API base: `https://tibyanquran.com`
- WebSocket origin: `wss://tibyanquran.com`

These values are configuration, not credentials. External EAS setup must
preserve them.

Mobile upload code requests an API upload URL, performs the direct presigned
PUT, then finalizes through the API. It does not import or call the Replit
Object Storage sidecar.

```text
MOBILE_DIRECT_REPLIT_STORAGE_DEPENDENCY: NO
```

The deployment service reports the production deployment as public with a
successful current build. Direct DNS/HTTP verification from this workspace
could not resolve `tibyanquran.com`, so endpoint access remains unverified
from this environment:

```text
PRODUCTION_API_EXTERNAL_ACCESS: FAIL (DNS resolution in verification environment)
PRODUCTION_WS_EXTERNAL_ACCESS: FAIL (DNS resolution in verification environment)
```

## Validation commands

Run from the repository root unless noted:

```sh
pnpm run typecheck
pnpm run verify:mushaf
pnpm --filter @workspace/tabyan run typecheck
pnpm --filter @workspace/tabyan run test
pnpm --filter @workspace/tabyan-trpc run test
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/mobile run mushaf:verify
```

From `artifacts/mobile`, configuration validation may be run with:

```sh
pnpm exec expo config --json
pnpm dlx expo-doctor@latest
```

Validate prebuild only on a disposable clone or temporary copy. Never run a
clean prebuild over the source tree:

```sh
tmp_dir="$(mktemp -d)"
git clone <github-repository-url> "$tmp_dir/tabyan"
cd "$tmp_dir/tabyan"
pnpm install --frozen-lockfile
cd artifacts/mobile
pnpm exec expo prebuild --no-install --clean
rm -rf "$tmp_dir"
```

The placeholder repository URL above must be replaced locally and must never
be committed to project configuration.

## EAS handoff boundary

The EAS profile is `production` in `artifacts/mobile/eas.json` and is
configured for App Store distribution. This source tree intentionally does
not add an Expo `owner` or `projectId`; no EAS project is created during this
handoff.

Before any external build, the operator must independently confirm:

1. The existing Expo/EAS project, if any, is the correct one.
2. The Apple Team is the owner of the existing `app.replit.tbyan` application.
3. Existing distribution credentials match `app.replit.tbyan`.
4. The App Store application is reused.
5. The requested build remains iOS build `6`.

No credential values belong in GitHub, this document, or chat.

## Portability boundary

Mobile source installation, type checking, QCF verification, Expo config
resolution, and external EAS setup are portable to a clean Codespaces-like
environment. The API's current object-storage implementation still uses the
Replit Object Storage sidecar, so running the complete backend outside Replit
requires a separate storage-adapter migration.

Therefore:

- `MOBILE_EXTERNAL_EAS_READY`: YES
- `READY_FOR_CODESPACES`: YES for source validation and Mobile/EAS preparation
- `READY_FOR_EXTERNAL_EAS_SETUP`: YES
- `MONOREPO_PORTABLE`: PARTIAL
- Full monorepo runtime portability: NO until the API storage dependency is
  replaced or an equivalent external adapter is configured

## Preparation verification

```text
GITHUB_SOURCE_COMPLETE: PASS
SECRETS_COMMITTED: NONE
GITIGNORE: PASS
LARGE_RECOVERY_FILES_EXCLUDED: YES
FILES_OVER_50MB: NONE (tracked source)
FILES_OVER_100MB: NONE (tracked source)
QCF_ASSETS: PASS
RECITATION: PASS
MOBILE_EXTERNAL_EAS_READY: YES
MOBILE_TYPESCRIPT: PASS
MOBILE_DEPENDENCIES: PASS
EXPO_CONFIG: PASS
EXPO_PREBUILD: PASS
QCF_VERIFIER: PASS
RECITATION_TESTS: PASS
AUTH_TESTS: PASS
PLACEMENT_TESTS: PASS
MOBILE_SHARED_PACKAGES: PASS
MOBILE_BUILD_BLOCKER: NO
EXPO_DOCTOR_FAILURE: ENVIRONMENT_TOOLING_ISSUE
MOBILE_CODE_BLOCKER: NO
MOBILE_GIT_TREE_COMPLETE: PASS
MISSING_GIT_DEPENDENCIES: NONE
QCF_PAGE_JSON_IN_GIT: 604/604
QCF_CANONICAL_WORDS_IN_GIT: 604/604
QCF_TTF_IN_GIT: 604/604
QCF_FILES_IGNORED_ACCIDENTALLY: NONE
GITHUB_FILE_SIZE_BLOCKERS: NONE
PRODUCTION_API_EXTERNAL_ACCESS: FAIL
PRODUCTION_WS_EXTERNAL_ACCESS: FAIL
```

The required handoff scope passed independently:

- Mobile typecheck
- Web typecheck
- API typecheck
- shared `tabyan-trpc` typecheck
- Web tests: 66/66
- shared/API tests
- Web and Native QCF verifiers
- resolved Expo config with the locked identity
- Expo prebuild on a disposable temporary copy

The aggregate workspace typecheck still reports existing TypeScript errors in
the unrelated `mockup-sandbox` artifact (`chart.tsx` and
`TeacherRecordings.tsx`). Those files are not part of Mobile V2 or the
external EAS handoff and were not changed.

`expo-doctor@latest` also exits before producing its checks because its config
subprocess fails in this workspace; direct `expo config --json` and temporary
Expo prebuild both pass. This is recorded as a tooling verification note, not
an EAS credential or application-identity failure.

The aggregate workspace typecheck failure does not enter the Mobile dependency
graph: Mobile imports `@workspace/tabyan-trpc`, which in turn imports the
tracked `@workspace/db` package. No Mobile import points into an excluded
transport or recovery file.

## Locked release state

```text
MOBILE_V2: PASS
CODE_GATE: PASS
QCF_CODE: PASS
RECITATION_CODE: PASS
AUTH_CODE: PASS
PLACEMENT_CODE: PASS
BUNDLE_ID: app.replit.tbyan
VERSION: 1.0.0
IOS_BUILD: 6
ANDROID_PACKAGE: com.tabyan.app
SOURCE_CODE_BEHAVIOR_CHANGED: NO
APPLE_IDENTITY_CHANGED: NO
```

This handoff is preparation only. Do not start an Apple build, EAS project
creation, Apple credential setup, TestFlight upload, or App Store submission
as part of this document.