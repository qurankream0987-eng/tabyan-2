# Tabyan Full Backend Migration to Railway — Execution Report

**Review date:** 2026-10-19
**Scope:** The complete Tabyan backend and PostgreSQL migration in the attached execution brief.
**Actions taken:** Read-only Railway PostgreSQL audit through a temporary internal Railway Function; the Function was deleted after its successful run. Replit Production was queried through its read-only database interface. Implemented and tested a Railway S3-compatible storage adapter. Created and verified the private `railway/migration-ams` branch in `qurankream0987-eng/tabyan` from the current workspace source. Configured private PostgreSQL/bucket references and a new Railway-only signing key on `tabyan-api`. The owner approved its first deployment, but Railway rejected source attachment because its GitHub user lacks access to the private repository; no API deployment started. The new PostgreSQL service is live with a 500 MB volume in `europe-west4`; the bucket is in `ams` and remains empty. The existing IAD PostgreSQL service and its staged public-access changes remain untouched. No production rows or source objects were modified.

## Executive summary

The backend is a single Express API artifact backed by PostgreSQL and shared tRPC/domain packages. Phase 1 defines an `ObjectStorageProvider` boundary, isolates Google Cloud/Replit Sidecar code in a Replit-only adapter, and now includes a Railway S3-compatible adapter that preserves logical `/objects/...` keys, ACL metadata, signed uploads, Range reads, and private inventory. Runtime selection defaults to Replit until explicitly switched. The API also exposes database-only `/readiness` and process-only `/health`, and binds to `0.0.0.0:$PORT`.

The system is **not ready for deployment or production cutover**. The private migration branch is created and verified, and the owner approved the first API deployment. Railway still has no access to the private repository, so `tabyan-api` has no source attachment, deployment, instance, or domain. Its database and bucket references and a fresh Railway-only signing key are configured, but untested. The new Amsterdam PostgreSQL service and volume are live but empty, and the bucket is empty. The existing IAD PostgreSQL service remains unchanged for rollback and is not the production target. A secure Production export route is still required before copying any rows or objects. Replit-specific CORS inputs remain. Three active WebSocket routes and part of recitation state are process-local; the reminder scheduler can race across replicas. The separate V3 server is unused by current managed workflows, but remains in source and must not be deployed.

The repository identifies PostgreSQL through `DATABASE_URL`, Drizzle, a 55-table schema, and 13 checked-in SQL migrations. Replit Production has 55 public tables and 2,015 total rows; the Railway PostgreSQL target has zero application tables and is `EMPTY_OR_EFFECTIVELY_EMPTY`. The workspace's direct `DATABASE_URL` is Development, not Production; its accidental temporary dump was deleted and never uploaded or restored. A secure Production export connection is still needed. **No production data has been copied.**

## Required report

### CURRENT_BACKEND_SERVICES

- **Primary API:** `artifacts/api-server`, a Node/Express service. The Replit artifact build runs the API build and starts `dist/index.mjs` on `PORT=8080`; its configured startup health path is `/api/healthz`.
- **REST:** health, diagnostics, and storage routes. Storage handles upload request/finalize, private and public object serving, book downloads, media/placement playback, and recording finalization.
- **tRPC:** app-managed authentication and student, teacher, admin, recitation, sharia, library, fatwa, notifications, daily-verse, and Quran Foundation procedures are implemented in `lib/tabyan-trpc`.
- **WebSockets in the primary API:** session-call signaling, recitation realtime, and the Nabr/QRC gateway. These are attached to the same Node HTTP server.
- **Background work:** session reminders run every minute; private-media cleanup is scheduled every five minutes. Both schedulers start when the API process listens.
- **Provider integrations in code:** Nabr/QRC, OpenAI Realtime, Speechmatics, NVIDIA/Riva, and a local Tarteel/Whisper worker. The repo's Replit environment configuration disables live Nabr and marks dry-run/shadow settings; effective deployed values were not inspected. No live Nabr call was made.
- **Additional server entry points:** `artifacts/mobile/server/serve.js` serves the Expo static export and is not a business API. `artifacts/tabyan/smart-mushaf-v3/server.ts` is not referenced by the current Tabyan package scripts or managed workflows, but contains a separate Express/Vite server and direct Nabr WebSocket gateway at `/api/qrc-ws`. No authentication check is visible in that gateway's connection handler. Treat it as an inactive/legacy entry point until its intended status is confirmed; do not deploy it as a second gateway as-is.
- **Storage boundary:** API routes, ACL checks, cleanup, and the recovery-audit script now call `ObjectStorageService`/`ObjectStorageProvider`; only `ReplitObjectStorageProvider` imports `@google-cloud/storage` or addresses the Replit sidecar. A Railway S3-compatible adapter is implemented and tested. The empty Amsterdam bucket's private variable references and target prefixes are configured on the undeployed Railway API; no objects have been copied or verified. The Replit runtime still defaults to Replit storage.
- **Health/readiness:** `GET /health` reports process health; `GET /readiness` runs `SELECT 1` against PostgreSQL and does not call Nabr or AI providers. Existing `/api/healthz` remains for the Replit artifact health check.

### CURRENT_DATABASE

- PostgreSQL accessed via `DATABASE_URL`, using `pg` and Drizzle in `lib/db`.
- The checked-in Drizzle schema declares **55 tables** across accounts/authentication, students/teachers, schedules/sessions, progress/recitation, media ownership/deletion, library, fatwa, assessments, notifications, and sharia content.
- There are **13 checked-in SQL files** under `lib/db/migrations`; the package also exposes `drizzle-kit push`. Those files alone do not prove that the live production schema is fully represented or current.
- The latest read-only Production audit is recorded below. It collected exact per-table counts and schema metadata without reading private row contents. The workspace's direct `DATABASE_URL` was separately verified as Development, not Production, and was not used for the migration.

### BACKEND_PORTABLE

**PARTIAL**

Positive portability indicators:

- The main API validates and listens on `process.env.PORT`.
- The server now explicitly binds to `0.0.0.0`; `/health` and `/readiness` are available for a future Railway health check.
- The API is a conventional Node/Express app, and PostgreSQL access is through the standard `pg` driver and Drizzle.
- Object-storage operations are expressed through a provider interface with a single runtime composition point. The Replit adapter preserves current upload capabilities, ACL metadata, object paths, Range reads, and confirmed deletion behavior.
- The API build explicitly copies the `ffprobe` binary and Riva protobuf files needed at runtime.

Blockers before a Railway staging deploy:

1. Verify the linked Railway bucket references and exercise the S3-compatible adapter with synthetic objects; the Replit sidecar is already isolated behind its adapter.
2. Replace Replit-specific origin/domain inputs with an explicit Railway/frontend origin configuration.
3. Resolve the legacy V3 server entry point so two Nabr gateways cannot be deployed unintentionally.
4. Address process-local WebSocket state and single-runner requirements for scheduled jobs before using multiple replicas.
5. Pin and validate the Railway Node runtime. If the local Tarteel provider is retained, provision its Python runtime, worker, model, cache, and resource limits; the current development model path points into the Replit workspace cache.
6. The existing `/readiness` endpoint checks PostgreSQL connectivity only; verify it against the Railway target after the controlled restore.

### DATABASE_PORTABLE

**PARTIAL**

The database engine and application schema are PostgreSQL-compatible, but restore readiness is unproven. After obtaining a verified Production dump, restore it into the audited empty Railway target and compare schema, migration state, all row counts, key relationships, sequences, indexes, constraints, and privacy-preserving checksums. Do not treat row counts or a successful `drizzle-kit push` alone as proof of equivalence.

### REPLIT_RUNTIME_DEPENDENCIES

- **Object storage:** `@google-cloud/storage` uses a Replit external-account credential source and hard-coded local Sidecar endpoints (`127.0.0.1:1106`). Bucket/path configuration uses `PRIVATE_OBJECT_DIR` and `PUBLIC_OBJECT_SEARCH_PATHS`. This is the primary portability blocker.
- **Origins:** `app.ts` and auth-origin logic read `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, and `REPLIT_EXPO_DEV_DOMAIN`; these must be replaced with a narrow, explicit allowlist for the chosen frontend/backend domains.
- **Database:** runtime expects `DATABASE_URL`; the undeployed Railway API has a private service-reference-based URL to the new Amsterdam PostgreSQL service. No database password or rendered connection string was read.
- **Development inference:** `HF_HOME`, `HF_HUB_CACHE`, `TABYAN_TARTEEL_MODEL_PATH`, and Python-worker configuration point to local model/cache locations. The project config selects OpenAI in production and Tarteel for development; do not assume the development model can run in Railway without a packaging/resource decision.
- **Temporary filesystem:** storage diagnostics and recovery/video checks use temporary files. Keep these ephemeral; no durable user-media flow should depend on the Railway service filesystem.
- **Deployment shape:** Replit is configured for autoscaling. Session-call signaling rooms and parts of recitation session state are held in API-process memory, so multiple replicas can split participants or state.
- **Legacy identity:** auth is app-managed, with password/token and role-backed flows plus persisted OTP/WebAuthn/admin-session state. Preserve existing behavior and legacy identity columns; domain, origin, and session compatibility require staging tests.

### RAILWAY INVENTORY AND SETUP

The selected Railway target is the existing `grateful-creativity` project. The original IAD PostgreSQL service was audited through a temporary internal Function using a private service reference; the Function and its temporary variable were removed. The new `tabyan-postgres-ams` service is live in `europe-west4` on `postgres:16-alpine`, with one 500 MB volume and no public TCP proxy or domain. The `tabyan-api` service has its build/start commands, `/health` check, and private database/bucket variable references configured, but no code source, deployment, instance, or domain.

The `tabyan-objects-ams` bucket is provisioned in `ams` and is empty. The two staged IAD PostgreSQL changes that would expose TCP 5432 and add `DATABASE_PUBLIC_URL` remain unapplied.

### RAILWAY_SERVICES_PLANNED

Initial target, consistent with the attached brief:

1. One `tabyan-api` service for Express/tRPC/REST and the WebSocket endpoints.
2. One Railway PostgreSQL service in the same project/environment.
3. Keep Nabr/QRC inside `tabyan-api` initially; do not split microservices without a demonstrated need.
4. Select and configure persistent object storage separately. Railway service disk is not a substitute for the current bucket-backed user media. Preserve object metadata, ACL/ownership rules, upload-finalize behavior, private playback, and Range handling.
5. Ensure scheduled work has a single active runner or a verified distributed coordination/idempotency design.

The region layout is settled: API and new PostgreSQL in `europe-west4`, bucket in `ams`. The private current-source branch is ready but not attached. The new PostgreSQL service and bucket are empty. The secure Production export route, staging validation, and production domains remain unresolved.

## Readiness gates

| Required field | Status | Evidence / blocker |
|---|---|---|
| `RAILWAY_API_SERVICE` | **SOURCE ATTACHMENT BLOCKED** | The owner approved the first private deployment. Railway reports its GitHub user cannot access `qurankream0987-eng/tabyan`; the verified `railway/migration-ams` branch is ready, but the service remains source-less and undeployed until Railway gets repository access. |
| `RAILWAY_POSTGRES` | **AMSTERDAM SERVICE LIVE; EMPTY** | `tabyan-postgres-ams` runs one `postgres:16-alpine` replica in `europe-west4` with a 500 MB volume and no public TCP proxy/domain. The old IAD service and staged public-access changes remain untouched for rollback. |
| `AUTH_MIGRATION` | **BLOCKED** | Preserve app-managed auth; target domain, CORS/origins, token/session behavior, and Web/Native compatibility have not been tested on staging. |
| `WEBSOCKETS` | **FAIL for multiple replicas** | Three active routes use process-local connection/session state. Mitigate initially with one API instance; horizontal scaling remains blocked. |
| `STORAGE` | **RAILWAY ADAPTER CONFIGURED; MIGRATION BLOCKED** | Private references point to the empty AMS bucket. Source inventory, object transfer, and ACL verification are outstanding; Replit remains the active provider. |
| `BACKGROUND_JOBS` | **PARTIAL** | Media cleanup uses conditional DB claims and idempotent deletion; session reminders use read-before-insert deduplication without a proven cross-replica lock. Start with one API instance. |
| `NABR_GATEWAY` | **PLAN READY; LIVE DISABLED** | Keep the authenticated API gateway canonical; the V3 source is unused in managed workflows. No Nabr calls were made. |
| `STAGING_READY` | **NO** | Railway GitHub access blocks source attachment; the API has not been deployed or validated. Runtime-origin/provider configuration also remains to be checked. |
| `PRODUCTION_CUTOVER_READY` | **NO** | No production data copy, dependency validation, frontend switch, or explicit cutover approval. |
| `ROLLBACK_READY` | **YES (SOURCE INTACT)** | Replit backend, database, and objects remain available; no cutover has started. Railway routing rollback has not been exercised. |

## Phase 1 execution — 2026-10-17

### OBJECT_STORAGE_DEPENDENCIES

| File / function | Object type | Read | Write | Delete | Signed URL | Public/private | Production critical |
|---|---|---:|---:|---:|---|---|---|
| `lib/ReplitObjectStorageProvider.ts`: credential client, `createWriteCapability`, `headObject`, `getObjectStream`, `updateObjectMetadata`, `deleteObject`, `findPublicObject`, `listPrivateObjects` | Existing Replit object operations | Yes | Signed PUT capability; metadata ACL update | Yes, through service | 15-minute write capability; read capability is available but not used by app routes | Both | Yes for product media and assets |
| `lib/RailwayObjectStorageProvider.ts` | New S3-compatible Railway target provider | Yes | Signed PUT capability; metadata ACL update | Yes, through service | Bounded presigned capability; app routes retain authenticated private reads | Both | Not active until a target bucket is configured and verified |
| `routes/storage.ts`: request URL / finalize / private playback / public objects / library access | `PLACEMENT_VIDEO`, teacher KYC video, live-session recording | Yes, including Range and ffprobe reads | Client uploads with provider-signed PUT; finalize writes ACL metadata | Via durable account-deletion cleanup only when ownership is proven | Write capability; private reads are authenticated API streams/capabilities, not provider-signed GET | Private | Yes |
| `routes/storage.ts`: book upload, certificate upload, authorized book and certificate routes | `DOCUMENT` (`book_pdf`, `qiraat_certificate`) | Yes; book access is checked against publication/eligibility | Client signed PUT; finalize/ACL metadata | No ordinary delete; explicit cleanup policy applies only to proven-owned private objects | 15-minute write capability | Private; public static assets are separate | Yes |
| `routes/storage.ts`: `/storage/public-objects/*` and configured public search paths | `OTHER` public/static object | Yes | No application write path found | No application delete path found | No | Public | Yes for any referenced app asset |
| `scheduler/privateMediaCleanup.ts` | Owned private media, including videos/documents | Metadata read for automatic-retention policy | No | Yes, durable jobs; verifies absence before completion; missing object is idempotent success | No | Private only | Yes for explicit account-deletion requests |
| `scripts/videoRecoveryAudit.ts` | Video objects and legacy prefixes | Lists/reads object metadata and byte ranges; optional `--deep` downloads temporarily | No object-store writes; `--apply` is a guarded database URL repair only | No | No | Private namespace | Operationally critical; manual tool only |
| `lib/objectAcl.ts` | ACL metadata on any private object | Parse/check | Encodes `custom:aclPolicy` metadata through provider | No | No | Public/private policy | Yes |

**Classification findings:** no dedicated `PROFILE_IMAGE` upload path was found; no `GENERATED_FILE` write path was found. `RECITATION_AUDIO` is streamed over `/api/ws/recitation` to the selected speech provider and is not stored through Object Storage in the audited API paths. The `user_storage_objects` registry and database media references remain authoritative for upload ownership and deletion. Presigned URLs are temporary capabilities and must be regenerated; they are not durable object identifiers.

### OBJECT_STORAGE_ABSTRACTION

**READY (Replit and Railway adapters).** `ObjectStorageProvider` exposes opaque logical object references, metadata reads, streams/Range reads, metadata updates, deletion, read/write capabilities, public lookup, and private inventory. `ObjectStorageService` and a single runtime composition point are separate from provider implementations. API routes, the cleanup scheduler, and the audit script no longer import Google Cloud Storage types or the Replit Sidecar directly.

The `ReplitObjectStorageProvider` preserves existing behavior. The new `RailwayObjectStorageProvider` maps `/objects/...` paths to a configured private bucket prefix, keeps public prefixes behind the API, preserves ACL metadata and source MD5 metadata during updates, streams byte ranges, paginates private inventory, and creates bounded S3 presigned URLs. `TABYAN_OBJECT_STORAGE_PROVIDER=railway` selects it; otherwise the runtime remains on Replit. Its environment configuration and real-bucket behavior are unverified until a bucket is created and linked.

### STORAGE_MIGRATION_PLAN

**IMPLEMENTED (provider); migration pending.** The owner has authorized the full backend/storage migration and specified that source objects must not be deleted. No source object inventory or copy has run because the target bucket and immutable region have not been selected:

1. Copy objects without changing their logical `/objects/...` keys. Keep temporary signed URLs out of database references.
2. Preserve content type, byte size, available source checksums (for example MD5), creation metadata where required, and `custom:aclPolicy`.
3. Preserve ownership/purpose/status in `user_storage_objects` and exact database references; do not infer ownership from names or prefixes.
4. Compare source/target object counts and total bytes by namespace; compare hashes where available; verify database references and ACL decisions; exercise private GET, Range, public assets, upload finalize, and confirmed deletion against synthetic staging objects.
5. Do not delete or mutate source objects during the copy. Keep the Replit provider available until cutover is separately approved.

`OBJECT_COUNT`, `TOTAL_BYTES`, prefixes, content-type counts, largest objects, orphan risk, and missing-metadata risk are **NOT YET MEASURED**. The approved source inventory/copy is deferred until the permanent bucket exists and its region is selected. No private filenames, object keys, or user data are included in this report.

### LEGACY_V3_NABR_STATUS

- `LEGACY_V3_GATEWAY_REACHABLE`: **NO in current managed Replit workflows; UNKNOWN outside this workspace**. No managed service starts it, and the active API does not import it.
- `LEGACY_V3_GATEWAY_IN_USE`: **NO in this workspace**. `artifacts/tabyan/package.json` only starts Vite; no active workflow or script invokes `smart-mushaf-v3/server.ts`.
- `AUTHENTICATION_PRESENT`: **NO** in its `/api/qrc-ws` connection handler. The handler accepts a WebSocket and processes `START_TILAWA_SESSION` without a visible Tabyan authentication/authorization check.
- API key ownership: the legacy file reads the server-side `NABR_QRC_API_KEY` environment value. No key value was read; no upstream connection was made. The legacy server contains no database write path.
- **Disposition:** `ARCHIVE_CANDIDATE`. Do not delete it in this phase; do not deploy it.

### SINGLE_NABR_GATEWAY_PLAN

**READY.** The canonical implementation is the active API gateway at `/api/ws/nabr-qrc-gateway` in `artifacts/api-server/src/nabrQrcGateway.ts`: it authenticates through Tabyan's app token/context and fails closed on invalid auth. Keep this as the only server-side Nabr authority; leave the inactive V3 file out of the Railway service. Staging must use fake/dry-run behavior. The live provider remains gated, and **live Nabr calls this phase: 0**.

### WEBSOCKET INVENTORY AND PROCESS-LOCAL STATE

| Path | Purpose / authentication | State and database | External provider / reconnect | Multi-instance safety |
|---|---|---|---|---|
| `/api/ws/session-call` | WebRTC signaling; token is authenticated through Tabyan context, then session membership and `in_progress` status are checked against PostgreSQL | Room peers, consent, and heartbeat are process-local; membership is DB-backed | No speech provider. Reconnect requires auth and join again; room state is not shared or restored | **No**; all peers for a room must reach the same process |
| `/api/ws/recitation` | Live recitation transcription; Tabyan token, student role, and owned listening session are checked | Recitation session is DB-backed; per-student session lease, provider, timers, and diagnostics are process-local | Selected speech adapter may connect to OpenAI/Speechmatics or the separately gated Nabr path. Reconnect re-authenticates and revalidates the session; no provider-stream resume is shared | **No** while the session lease/provider lifecycle is process-local |
| `/api/ws/nabr-qrc-gateway` | Canonical QRC transport; Tabyan token authentication, origin check, one active connection per account | `ACTIVE_USER_CONNECTIONS` and transport/session lifecycle are process-local; gateway has no direct domain DB write | Nabr/QRC only when live is explicitly enabled; reconnect starts a newly authenticated gateway session | **No**; active-user map and session transport are local |
| `/api/qrc-ws` (V3) | Legacy direct Nabr gateway; no visible authentication | Per-socket state is local; no database writes found | Direct upstream `wss://api.qurani.ai`; no durable reconnect state | Not deployed by current managed workflows; never enable as a second gateway |

Other in-memory maps include session-call rooms, recitation leases, diagnostic-session tokens, and a short-lived immutable-object metadata cache. The cache is safely reconstructible; room/session leases and diagnostic tokens are process-local and are not safe to route between replicas. **Horizontal scaling is not safe yet.**

`INITIAL_REPLICA_COUNT: 1` for staging and initial production. Do not add Redis solely for this migration. Before horizontal scaling, either externalize room/session ownership and coordinate jobs, or prove a complete affinity/ownership design that routes every participant and reconnect for one logical session consistently.

### SCHEDULED / BACKGROUND JOB AUDIT

| Job | Trigger / frequency | Side effects and idempotence | Multi-replica safety | Initial target |
|---|---|---|---|---|
| Session reminders | Startup catch-up plus `* * * * *` (every calendar minute) | Reads sessions/settings/existing reminders; inserts notification rows and updates the last-success marker. Per-process read-before-insert dedupe is not an atomic cross-instance claim; no unique notification key proving cross-replica dedupe was found. | **Not proven safe**; concurrent processes may both observe no reminder before inserting | `KEEP_IN_API_SINGLETON` |
| Private media cleanup | Startup pass plus every five minutes | Claims durable deletion jobs with a conditional DB update/lease, rechecks ownership/policy, deletes the object, confirms absence, then completes or schedules retry. Missing objects are idempotent success. | **Partial/pass for claimed rows**; durable claims reduce duplicate processing, but the API still starts one scheduler per process | `KEEP_IN_API_SINGLETON` initially; no separate worker needed for staging |
| WebSocket heartbeat/session timers | Connection lifecycle; 30-second call heartbeat, bounded recitation timers | Ephemeral socket liveness and session cleanup only | Process-local by design | Keep with the single API instance |

`BACKGROUND_JOB_SAFETY: PARTIAL`. One API instance avoids the known reminder race during initial staging/migration. Before running multiple instances, add and test an atomic reminder claim/dedup constraint or move reminders to a single coordinated worker. Cleanup's existing durable claims and retry semantics must remain intact.

### PRODUCTION DATABASE READ-ONLY AUDIT

`PRODUCTION_DB_READONLY_AUDIT: PASS`. The owner approved a read-only audit. Railway was inspected through a temporary internal Function using Railway private networking and a read-only repeatable-read transaction; Replit Production was queried through its read-only interface. The Function was deleted after the audit. Exact results are recorded in **Actual database audit — 2026-10-19** below. No private row contents were read. The following SQL is retained as a reference checklist, not an outstanding audit step:

```sql
-- PostgreSQL version and current database size
SELECT current_setting('server_version') AS postgres_version,
       pg_database_size(current_database()) AS database_size_bytes,
       pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Application schemas
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name <> 'information_schema'
  AND schema_name NOT LIKE 'pg_%'
ORDER BY schema_name;

-- Generate one exact COUNT(*) statement per ordinary/partitioned table.
-- Review the generated statements before executing them.
SELECT format(
         'SELECT %L AS schema_name, %L AS table_name, count(*)::bigint AS row_count FROM %I.%I;',
         n.nspname, c.relname, n.nspname, c.relname
       ) AS read_only_count_query
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname, c.relname;

-- Installed extensions
SELECT extname, extversion FROM pg_catalog.pg_extension ORDER BY extname;

-- Sequences
SELECT sequence_schema, sequence_name, data_type, start_value, minimum_value,
       maximum_value, increment, cycle_option
FROM information_schema.sequences
WHERE sequence_schema <> 'information_schema'
  AND sequence_schema NOT LIKE 'pg_%'
ORDER BY sequence_schema, sequence_name;

-- Index definitions
SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname <> 'information_schema'
  AND schemaname NOT LIKE 'pg_%'
ORDER BY schemaname, tablename, indexname;

-- Foreign keys
SELECT tc.table_schema, tc.table_name, tc.constraint_name,
       kcu.column_name, ccu.table_schema AS referenced_schema,
       ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
 AND kcu.constraint_schema = tc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- Views and definitions
SELECT schemaname, viewname, definition
FROM pg_catalog.pg_views
WHERE schemaname <> 'information_schema'
  AND schemaname NOT LIKE 'pg_%'
ORDER BY schemaname, viewname;

-- Functions/procedures
SELECT routine_schema, routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_schema <> 'information_schema'
  AND routine_schema NOT LIKE 'pg_%'
ORDER BY routine_schema, routine_name;

-- Triggers
SELECT event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema <> 'information_schema'
  AND trigger_schema NOT LIKE 'pg_%'
ORDER BY event_object_schema, event_object_table, trigger_name;

-- Discover the deployed Drizzle migration ledger; inspect its rows only after
-- confirming the returned schema/table and columns.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = '__drizzle_migrations'
ORDER BY table_schema;
```

The audit collected exact row counts without returning user values. No additional production query is required for the completed audit. Do not query user rows, media paths, or personal values during any later verification.

### DATABASE MIGRATION COMPATIBILITY

`DATABASE_SCHEMA_RAILWAY_COMPATIBLE: PARTIAL`. Replit Production is PostgreSQL 16.15; the audited legacy IAD service is PostgreSQL 18.6, while the new Amsterdam target runs the `postgres:16-alpine` image (its exact minor version has not been queried). The source has 55 public tables, 13 checked-in SQL migration files, and no live Drizzle migration ledger; the new target has not received application data. The restore, schema/data parity, sequence values, constraints, and application readiness remain untested until a secure Production dump is available.

### RAILWAY API SERVICE FOUNDATION

The owner authorized the complete migration. The `tabyan-api` service was configured in `grateful-creativity/production` without attaching a code source or starting a deployment:

| Setting | Current value |
|---|---|
| Railway project/environment | `grateful-creativity` / `production` |
| API service | `tabyan-api` (`cc18620c-0093-489d-9ce8-c6e20a4cd332`), no source attached |
| Root directory | Repository root (`.`) |
| Build command | `pnpm --filter @workspace/api-server run build` |
| Start command | `pnpm --filter @workspace/api-server exec node --enable-source-maps dist/index.mjs` |
| Health check | `/health` |
| Sleep mode | Disabled |
| Source / deployment / domain | None attached or created |
| Runtime versions | Node `24.13.0` and pnpm `10.26.1` observed in this workspace; pin/verify for Railway before first deployment |
| Database variable | Private service-reference-based `DATABASE_URL` configured; no rendered value read |
| Initial replicas | Set to `1` before first deploy; no instance currently exists |
| Storage | Private references to the empty AMS bucket configured; prefixes are `private` and `public/assets,public/images`; no objects copied |
| Signing key | Fresh Railway-only `SESSION_SECRET` set without displaying or recording its value; signs short-lived placement/video capabilities |

`RAILWAY_API_SERVICE: CONFIGURED_WITH_PRIVATE_REFS; SOURCE_ATTACHMENT_BLOCKED_BY_RAILWAY_GITHUB_ACCESS; DEPLOY_NOT_STARTED`.
`RAILWAY_POSTGRES: AMSTERDAM_SERVICE_LIVE; 500_MB_VOLUME; NO_PUBLIC_PROXY; EMPTY`.
`RAILWAY_BUCKET: AMS_LIVE_EMPTY; PRIVATE_REFERENCES_CONFIGURED`.
`EMPTY_DB_MIGRATION_TEST: BLOCKED` (secure Production dump required).
`STAGING_READY: NO`.

### REPLIT DEPENDENCY ELIMINATION MATRIX

| Dependency | Current use | Railway replacement | Status |
|---|---|---|---|
| Replit Object Storage Sidecar | Isolated to `ReplitObjectStorageProvider`; supplies credentials and signed PUT/GET capabilities | `RailwayObjectStorageProvider` uses private S3-compatible references and configured prefixes; copy/verify objects separately | **IMPLEMENTED; CONFIGURED; NOT EXERCISED** |
| Replit-specific environment variables | CORS allowlist still reads `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, and `REPLIT_EXPO_DEV_DOMAIN` | Explicit configured web/mobile origins for each environment | **REMAINS** |
| Replit host/domain assumptions | API CORS and auth-origin logic include Replit origins; production domains remain separately allowlisted | Railway service/frontend domains and explicit public origins | **REMAINS** |
| Replit proxy assumptions | Express reads forwarded headers through middleware/platform proxy behavior; no Replit-only proxy API is used for storage after provider split | Confirm Railway forwarded headers and WebSocket upgrade routing in staging | **VERIFY IN STAGING** |
| Replit filesystem assumptions | `ffprobe` is packaged; temporary media probes use OS temp. Optional Tarteel worker searches Replit `.pythonlibs` and model-cache paths | Package Python/model only if Tarteel remains enabled; use ephemeral temp only | **PARTIAL** |
| Replit deployment/runtime APIs | API uses standard Express/Node plus the storage Sidecar; no Replit deployment API call found | Railway service config and ordinary environment variables | **PARTIAL** |

`BACKEND_REQUIRES_REPLIT_RUNTIME: YES` **in the current Replit runtime**. The undeployed Railway API is configured to select its new adapter, but it has not been exercised. The target state is `NO` only after the Railway provider is exercised and Replit origins/runtime dependencies are removed from that Railway path.

### PHASE 1 REQUIRED STATUS

```text
OBJECT_STORAGE_DEPENDENCIES: inventoried above; source bucket aggregate inventory pending target creation
OBJECT_STORAGE_ABSTRACTION: READY (Replit and Railway adapters)
STORAGE_MIGRATION_PLAN: IMPLEMENTED (Railway adapter; no objects copied)
LEGACY_V3_NABR_STATUS: UNUSED in this workspace; ARCHIVE_CANDIDATE
SINGLE_NABR_GATEWAY_PLAN: READY (authenticated API gateway is canonical)
WEBSOCKET_MULTI_INSTANCE_SAFETY: FAIL; mitigate with one replica
INITIAL_RAILWAY_REPLICA_POLICY: 1
BACKGROUND_JOB_SAFETY: PARTIAL; one replica required initially
PRODUCTION_DB_READONLY_AUDIT: PASS
DATABASE_SCHEMA_RAILWAY_COMPATIBLE: PARTIAL
RAILWAY_API_SERVICE: PRIVATE_SOURCE_READY; PRIVATE_REFS_AND_NEW_SIGNING_KEY_CONFIGURED; SOURCE_ATTACHMENT_BLOCKED_BY_RAILWAY_GITHUB_ACCESS
RAILWAY_POSTGRES: NEW AMSTERDAM SERVICE LIVE AND EMPTY; EXISTING IAD PRESERVED
RAILWAY_BUCKET: AMS LIVE AND EMPTY; PRIVATE REFS CONFIGURED
EMPTY_DB_MIGRATION_TEST: BLOCKED (secure Production dump needed)
READY_FOR_PRODUCTION_DATA_COPY: NO
READY_FOR_PRODUCTION_CUTOVER: NO
PRODUCTION_TRAFFIC_SWITCHED: NO
PRODUCTION_DB_COPIED: NO
PRODUCTION_STORAGE_COPIED: NO
REPLIT_BACKEND_DISABLED: NO
LIVE_NABR_CALLS: 0
```

### VERIFICATION AND WORKFLOW SAFETY

- API TypeScript check: **PASS**.
- API test suite: **PASS, 119/119**.
- API build: **PASS**; the build copied the packaged `ffprobe` binary and Riva protobuf definitions.
- Isolated source-level `GET /health`: **HTTP 200**, `{"status":"ok"}`.
- `GET /readiness` was not called because it executes SQL against the API's configured database.
- The API workflow is running; `GET /health` returned HTTP 200 and the managed health request to `/api/healthz` returned HTTP 200. The runtime selector still defaults to Replit storage; no Railway bucket is configured.
- The Expo workflow is running again and Metro is waiting on its preview URL after package installation completed.
- The API build/tests used local workspace dependencies; no external AI/ASR request was made.
- `git diff --check`: **PASS**.

## Required safe sequence

1. Keep all Railway work inside `grateful-creativity`; do not apply its staged public TCP 5432 or `DATABASE_PUBLIC_URL` changes.
2. After Railway is granted access to the private repository, attach the verified branch to `tabyan-api`, keep one replica, and deploy the canonical backend without creating a public domain. The owner has approved this first deployment.
3. Verify the bucket's private references and exercise upload, read, ACL, Range, listing, metadata update, and deletion with synthetic objects.
4. Obtain a secure Replit Production connection/export route, verify its identity, create a protected dump, and restore into the audited empty Railway PostgreSQL target; compare schema, migration state, row counts, sequences, constraints, and references.
5. Inventory and copy Production object storage without changing or deleting source objects; verify counts, bytes, metadata, hashes where available, and database references.
6. Validate Railway health/readiness, authentication, CRUD/progress, notifications, uploads/media/Range, WebSockets, Smart Mushaf dependencies, fake Nabr, and each background job.
7. Keep Replit resources intact for rollback. Do not switch production traffic or disable Replit until all checks pass and the owner explicitly accepts the release.

## Earlier access blocker — superseded

An earlier Railway project link was inaccessible to the connected identity. The owner then selected the accessible existing `grateful-creativity` project, and the current Railway connection can inspect and manage that project. The old access-denied status below is historical and no longer applies.

### Owner-selected target and pre-migration audit — 2026-10-19

The owner selected the already-accessible `grateful-creativity` project as Tabyan's Railway destination, without renaming it, and authorized continuing the full migration after a safe audit. This replaces the earlier inaccessible project link as the currently selected destination. Do not create another project or rename this one; source-data transfer still requires a secure Production export route.

#### Railway control-plane inventory and setup

| Resource | Observed state |
|---|---|
| Project | `grateful-creativity`, ID `65c1622c-dc31-4fe5-ad46-866a91094f52`, in the owner's personal workspace |
| Environment | `production`, ID `ddab74b5-63f0-45db-8fa3-65a824544a8f` |
| API service | `tabyan-api` (`cc18620c-0093-489d-9ce8-c6e20a4cd332`), empty source; build/start commands and `/health` configured; no deployment or domain |
| PostgreSQL service | `Postgres`, ID `6487fad9-b8ad-4059-a639-b9c0198a242f`; latest deployment status `SUCCESS`; one replica; region `iad`; image tag `postgres-ssl:18` |
| Persistent volume | `postgres-volume`, 500 MB, mounted at `/var/lib/postgresql/data` in `iad` |
| Object-storage buckets | **None** |
| Pending Railway changes | **Two** changes on `Postgres`: add a TCP proxy for port `5432`, and add `DATABASE_PUBLIC_URL` (value redacted by the Railway tool). Both remain staged and were not applied. |

The 24-hour Railway metrics report about `0.0854 GB` current disk use and zero reported network RX/TX. These control-plane metrics do **not** prove the database is empty, nor do they provide table or row counts. The service has a persistent volume, so it is not empty at the resource level.

#### Database-content audit boundary

The audit used a temporary Railway Function in the same `grateful-creativity` production environment. It connected to PostgreSQL using the private `${{Postgres.DATABASE_URL}}` service reference and ran the entire inspection inside a `REPEATABLE READ READ ONLY` transaction. The Function completed successfully and was deleted. PostgreSQL's public TCP 5432 proxy was not enabled; the two staged changes remain unapplied.

#### Application and source review for migration

- The repository is a pnpm monorepo with a shared TypeScript domain and tRPC contract, an Express 5 API, a React/Vite Web client, and an Expo SDK 54 / React Native 0.81.5 client.
- The Web inventory contains 73 page files and 145 component files. It covers public/legal/support pages, student Quran/Mushaf/recitation/booking/library/fatwa/sharia/prayer/Qibla/progress/notifications flows, teacher scheduling/evaluation/session flows, and administration. Its tRPC client sends requests to the same-origin `BASE_URL + /api/trpc`; the Vite build requires both `PORT` and `BASE_PATH`.
- The Native inventory contains 87 Expo Router route files across student, teacher, admin, auth, and public flows. Its API client requires `EXPO_PUBLIC_DOMAIN`, uses the shared `/api/trpc` contract and authenticated bearer token, and binds requests to the active account generation. `EXPO_PUBLIC_WS_ORIGIN` is a separate realtime configuration input.
- A separate staff-preview Web artifact exists; it is not a Railway API service and should remain a distinct preview surface.
- The shared PostgreSQL schema declares 55 tables; 13 checked-in SQL migrations are present. These source declarations are not evidence that the Railway database has those tables or that its migration history matches.
- The active API includes REST health/readiness and storage routes, the tRPC domain routers, and WebSocket endpoints for sessions, recitation, and the canonical Nabr/QRC gateway. `/readiness` performs a database query; Railway readiness has not been tested.
- Railway portability remains incomplete: the Railway S3-compatible provider is implemented but unconfigured, and media has not been copied. API CORS still includes Replit origins, while Web currently assumes same-origin API routing. The Railway API domain and Web routing need explicit staging configuration before any frontend switch.
- Session/WebSocket ownership and some recitation state are process-local; session reminders are not protected by a proven cross-replica atomic claim. Keep the initial API replica count at one. Do not deploy the unused legacy V3 Nabr gateway as a second gateway.

#### Actual database audit — 2026-10-19

| Check | Replit Production source | Railway target |
|---|---:|---:|
| PostgreSQL version | `16.15 (2a05339)` | `18.6 (Debian 18.6-1.pgdg13+2)` |
| Database size | `11,583,488` bytes | `7,861,951` bytes (`7,678 kB`) |
| Non-system schemas | `_system`, `public` | `public` |
| Application tables | `55` public tables | `0` |
| Extensions | `plpgsql 1.0` | `plpgsql 1.0` |
| Public enums | `0` | `0` |
| Public sequences | `0` | `0` |
| Indexes | `94` | `0` |
| Primary keys | `55` | `0` |
| Foreign keys | `83` | `0` |
| Unique constraints | `12` | `0` |
| Views / functions / triggers | `0 / 0 / 0` | `0 / 0 / 0` |
| `public.__drizzle_migrations` | Absent | Absent |
| Classification | Source production DB | **`EMPTY_OR_EFFECTIVELY_EMPTY`** |

The source also has Replit's separate `_system.replit_database_migrations_v1` table and its sequence; that platform metadata is not an application table and will not be copied. The live source's 55 public tables exactly match the source-defined table count. No Drizzle migration ledger exists in either database, so migration history must be established from the checked-in SQL/source rather than copied from a Drizzle ledger.

The Production row counts were obtained with exact `COUNT(*)` queries. The aggregate is 2,015 rows; no private row values were read:

| Table | Rows | Table | Rows | Table | Rows |
|---|---:|---|---:|---|---:|
| `account_deletion_requests` | 0 | `admin_login_attempts` | 17 | `admin_notifications_sent` | 0 |
| `admin_sessions` | 64 | `assessment_attempts` | 0 | `assessment_questions` | 0 |
| `assessments` | 0 | `audit_logs` | 156 | `auth_tokens` | 200 |
| `book_assignments` | 3 | `bookmarks` | 2 | `books` | 10 |
| `daily_verses` | 50 | `downloads` | 0 | `email_otp_codes` | 4 |
| `evaluations` | 0 | `fatwa_answers` | 0 | `fatwa_questions` | 3 |
| `fatwa_ratings` | 0 | `fatwa_views` | 0 | `levels` | 20 |
| `mufti_assignments` | 3 | `notification_settings` | 5 | `notifications` | 246 |
| `otp_codes` | 113 | `placement_attempts` | 2 | `private_media_deletion_jobs` | 0 |
| `promotion_requests` | 0 | `qiraat_certificates` | 2 | `recitation_sessions` | 55 |
| `recordings` | 0 | `schedule_change_requests` | 0 | `security_events` | 496 |
| `session_participants` | 0 | `sessions` | 2 | `sharia_content` | 39 |
| `sharia_content_progress` | 46 | `sharia_exam_attempts` | 0 | `sharia_exam_questions` | 0 |
| `sharia_subjects` | 3 | `student_password_login_attempts` | 7 | `student_progress` | 9 |
| `student_settings` | 115 | `students` | 115 | `system_settings` | 2 |
| `teacher_broadcasts` | 0 | `teacher_certificates` | 1 | `teacher_messages` | 0 |
| `teacher_settings` | 25 | `teachers` | 25 | `user_storage_objects` | 10 |
| `users` | 143 | `webauthn_challenges` | 9 | `webauthn_credentials` | 8 |
| `weekly_schedules` | 5 |  |  |  |  |

#### Production source connection and export status

The direct `DATABASE_URL` available to the workspace was checked read-only against the explicit Development database capability. It matched Development (`heliumdb`, PostgreSQL `16.10`, 11,850,211 bytes, identical postmaster-start metadata) and did **not** match Production (`neondb`, PostgreSQL `16.15`). A temporary dump made from that direct connection was deleted after this identity check; it was never uploaded or restored. The Production `executeSql` path is read-only and cannot provide a `pg_dump`. A secure Production connection/export route is still required before copying any source rows.

#### Deployment source and code privacy

The current local branch is `feature/real-lightweight-mushaf`; it is not present on the linked public repository and has no common commit ancestry with `github/main`. The linked repository `qurankream0987-eng/tabyan-2` is public and remains untouched. In the approved private repository `qurankream0987-eng/tabyan`, the `main` branch remains the September 18 snapshot. A private `railway/migration-ams` branch was created and verified against all 73 current API/workspace file blobs, including deletion of the obsolete API file. The Railway source-attachment attempt returned “User does not have access to the repo”; the owner approved deployment, but Railway must be granted private-repository access before retrying. No API deployment has been created.

#### Selected regions and provisioned resources

The owner selected Amsterdam for the API, new PostgreSQL service, and permanent bucket. The API and PostgreSQL services are configured in `europe-west4`; the empty `tabyan-objects-ams` bucket is provisioned in `ams`. No Middle East service region appears in the available choices. Bucket location is immutable after creation.

The Amsterdam region choice is settled. The owner approved provisioning and starting the new PostgreSQL service and volume. It is live with one `postgres:16-alpine` replica and a 500 MB volume in `europe-west4-drams3a`; no public TCP proxy or domain exists. Exact Railway cost cannot be determined from the current project data. No live Saudi latency measurement has been made. The existing IAD PostgreSQL stays unchanged and available for rollback; it is not to be used for Tabyan production.

#### Current execution status

```text
RAILWAY_PROJECT: grateful-creativity
POSTGRES_PUBLIC_5432_ENABLED: NO
SAFE_PRIVATE_DB_AUDIT: PASS
ACTUAL_RAILWAY_DB_CLASSIFICATION: EMPTY_OR_EFFECTIVELY_EMPTY
ACTUAL_SCHEMA_COUNT: 1
ACTUAL_TABLE_COUNT: 0
SOURCE_EXPECTED_TABLE_COUNT: 55
SOURCE_PRODUCTION_TABLE_COUNT: 55
SOURCE_PRODUCTION_ROWS: 2015
DRIZZLE_MIGRATION_STATE: no __drizzle_migrations table in source or target
RAILWAY_API_SERVICE: CONFIGURED_IN_EUROPE_WEST (no source/deployment/domain)
RAILWAY_AMS_BUCKET: LIVE_EMPTY (tabyan-objects-ams; region ams)
NEW_RAILWAY_POSTGRES: LIVE_EMPTY (europe-west4; one replica; 500 MB volume; no public proxy)
PRIVATE_SOURCE: VERIFIED; RAILWAY GITHUB ACCESS REQUIRED BEFORE ATTACHMENT
DATABASE_MIGRATION: BLOCKED (secure Production connection/export route required)
OBJECT_STORAGE: ADAPTER AND PRIVATE REFERENCES CONFIGURED; bucket empty; no object copy
WEBSOCKETS: SINGLE REPLICA REQUIRED; horizontal scaling blocked
FRONTEND_USING_RAILWAY: NO
PRODUCTION_BACKEND_ON_RAILWAY: NO
PRODUCTION_BACKEND_ON_REPLIT: ACTIVE
ROLLBACK_AVAILABLE: YES
MIGRATION_STATUS: PARTIAL / BLOCKED ON RAILWAY PRIVATE-REPO ACCESS, SECURE PRODUCTION EXPORT, AND STAGING VALIDATION
```

Next steps: grant Railway's GitHub integration access to `qurankream0987-eng/tabyan` (do not make it public), then retry the approved source attachment and deployment. Make a secure Production database export route available. Keep the current IAD PostgreSQL service, Replit Production database, Replit backend, and source objects intact. Do not apply the staged public proxy changes or cut over production traffic.
