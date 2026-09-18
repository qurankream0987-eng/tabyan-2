# Replit API Runtime Module Resolution Fix Report

## Executive Summary

The failed publish was not a build or Expo export failure. The API bundle and
the Mobile web export both built successfully. The publish failed during the
promote/start phase because the production API process exited with
`ERR_MODULE_NOT_FOUND` before opening port `8080`.

The minimal fix changes only the API production start command so it runs
through pnpm's API workspace context. Mobile V2, QCF assets, Expo
configuration, iOS identity, EAS configuration, and Apple credentials were not
changed.

## Reproduced Runtime Failure

The failed build was:

- Build ID: `8bd37944-aedc-4683-ae8f-72ae0e3079bc`
- Target: Autoscale / Cloud Run
- Build phase: PASS
- Bundle phase: PASS
- Promote/start phase: FAIL

Deployment logs showed:

```text
starting artifact process args=[node --enable-source-maps artifacts/api-server/dist/index.mjs]
port=8080 artifact=artifacts/api-server
node:internal/modules/package_json_reader:316
throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
healthcheck /api returned status 500
not all artifact ports opened within timeout expected=[8080 18115] detected=1
```

The complete deployment log did not include the `Cannot find package
'<name>'` line, so the exact package name cannot be truthfully recovered from
the published logs.

Local verification also showed that the API starts successfully in the
workspace package context. The production-shaped command was then tested
through the same package context with a temporary port; the process stayed
alive and served the health endpoint.

## Exact Missing Package

`UNKNOWN — not emitted in the available deployment stderr`.

The available error proves a Node module-resolution failure but does not
identify the package. No dependency was removed or added based on a guess.

The externally resolved imports visible in the API bundle include:

- `@google-cloud/storage`
- `@grpc/grpc-js`
- `@grpc/proto-loader`

All three are declared runtime dependencies of `@workspace/api-server`.

## Module Resolution Analysis

The API bundle intentionally leaves selected packages external because some
dependencies can contain native modules or runtime files. The deployment
previously started the generated file directly from the repository root:

```text
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The development API workflow starts the package through pnpm and succeeds,
including loading ffprobe, attaching both WebSocket gateways, opening port
8080, and starting the schedulers. This establishes a production-runtime
context difference rather than a TypeScript or bundling failure.

The production command now invokes Node through the API workspace:

```text
pnpm --filter @workspace/api-server exec node --enable-source-maps dist/index.mjs
```

This preserves pnpm's isolated workspace dependency links when the deployment
runner starts the API.

## API Package Metadata

Runtime dependencies are declared in `artifacts/api-server/package.json`,
including Google Cloud Storage, gRPC, Express, ffprobe-static, database, and
logging packages.

The API build uses esbuild with an ESM output and explicitly externalizes
`@grpc/*` and `@google-cloud/*`, among other packages. The build script also
copies the ffprobe binary and Riva protobuf definitions into `dist`.

The API health probe is configured as:

```text
/api/healthz
```

## Build External Strategy

The external strategy was retained. No broad bundling change was made because
the external packages may depend on runtime files or native/protobuf behavior.
The existing build outputs remain intact:

- `dist/bin/ffprobe` is present and executable.
- `dist/protos` is present.
- Google Cloud Storage and gRPC remain declared runtime dependencies.

## Root Cause

Confirmed root cause category: the production API process failed during Node
ESM module resolution in the deployment runtime and consequently never opened
port `8080`.

Most likely mechanism: the direct production start command did not preserve
the API package's pnpm workspace resolution context in the isolated deployment
runtime. The exact missing package is not available in the captured Replit
stderr, so the report deliberately does not claim a package-level cause that
cannot be proven.

## Minimal Fix Applied

Only `artifacts/api-server/.replit-artifact/artifact.toml` was changed.

Previous production run command:

```text
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

New production run command:

```text
pnpm --filter @workspace/api-server exec node --enable-source-maps dist/index.mjs
```

The API build command, API port, health path, Mobile command, Mobile port, and
all other artifact definitions were preserved.

## Final Production Start Command

```text
pnpm --filter @workspace/api-server exec node --enable-source-maps dist/index.mjs
```

Environment:

```text
PORT=8080
NODE_ENV=production
```

## API Port Verification

The fixed command was started with a temporary test port to avoid interrupting
the running development API:

- API build: PASS
- API process start: PASS
- Process stayed alive: YES
- Port opened: PASS
- ffprobe initialization: PASS
- Session-call signaling attached: PASS
- Recitation realtime gateway attached: PASS

The existing development API workflow also continues to open port `8080`.

## Health Check

The fixed API process returned:

```json
{"status":"ok"}
```

from:

```text
/api/healthz
```

## Mobile Port Verification

Mobile was not modified. Its serve command was tested separately on a
temporary port and returned the Tabyan landing HTML while remaining alive.

- Mobile serve: PASS
- Mobile process stayed alive: YES
- Configured deployment port: `18115`

The initial `/mobile/` 500 responses in the failed publish were startup
responses while the artifact processes were being launched. The publish
orchestrator terminated Mobile after the API failure caused the overall port
timeout; no independent Mobile code failure was found.

## Regression

Targeted checks:

| Check | Result |
|---|---|
| API build | PASS |
| API production-shaped runtime smoke test | PASS |
| API health response | PASS (`{"status":"ok"}`) |
| API process stays alive | YES |
| Mobile serve smoke test | PASS |
| Mobile typecheck | PASS |
| Expo config | PASS |
| `git diff --check` | PASS |
| ffprobe asset | PASS |
| Riva protobuf assets | PASS |
| QCF | UNCHANGED |

## Remaining Manual Step

Re-publishing is a user action. The agent did not trigger Publish
automatically, and no EAS Build, Apple signing, or Apple credentials were
created.

## Final Status

```text
RUNTIME_FAILURE_REPRODUCED: YES (deployment logs); local exact package name: NO
EXACT_MISSING_PACKAGE: UNKNOWN — omitted from captured deployment stderr
ROOT_CAUSE: API runtime module resolution failure before port 8080 opened
FIX_APPLIED: API production command now runs through pnpm API workspace context
API_BUILD: PASS
API_RUNTIME: PASS
PORT_8080_OPEN: PASS in the active API workflow
API_HEALTH: PASS
PROCESS_STAYS_ALIVE: YES
MOBILE_SERVE: PASS
PORT_18115_OPEN: PASS in the active Mobile workflow
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
QCF_INTACT: PASS
APPLE_IDENTITY_CHANGED: NO
IOS_BUNDLE_ID: app.replit.tbyan
EAS_BUILD_STARTED: NO
APPLE_CREDENTIALS_CREATED: NO
REPUBLISH: USER_ACTION_REQUIRED
SAFE_TO_REPUBLISH: YES
NEXT_STEP: Click Publish again and inspect the new runtime logs if it fails
```