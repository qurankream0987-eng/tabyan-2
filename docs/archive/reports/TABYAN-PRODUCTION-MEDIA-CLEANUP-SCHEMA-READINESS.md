# Production Media Schema Readiness

**As of:** 2026-10-02  
**Scope:** Read-only development/production schema comparison and readiness for the corrected account-deletion media policy.

## Decision

Videos have no age-based automatic deletion while an account is active: no 90-day, 180-day, or six-month rule. Explicit student account deletion may delete all proven-owned private media, including videos, after the storage deletion is confirmed.

Deletion eligibility depends on reason. `automatic_retention` is limited to the explicit non-video allowlist (`profile_asset`, `student_certificate`) and rejects video by media type, MIME type, and path extension. `account_deletion` accepts any proven-owned private media, including unknown media types, but rejects unresolved ownership, non-private/shared-library media, and recordings linked to another participant's live record. Authorized manual deletion has its own reason. Ownership is never inferred from filenames.

The student self-service deletion path and authorized admin hard-delete path are student-only. Teacher hard deletion remains forbidden; teacher deactivation and supervisor restrictions are unchanged. Teacher verification media is therefore outside the currently authorized hard-delete paths.

## Read-only schema comparison

The production check queried `information_schema.columns` only. It found:

| Table | Development | Production |
| --- | --- | --- |
| `user_storage_objects` | Present | Missing |
| `account_deletion_requests` | Present | Missing |
| `private_media_deletion_jobs` | Present; 0 rows | Missing |
| `recordings` | Present | Present |

Production `recordings` still has legacy `expires_at`, `retention_attempts`, and `retention_last_error` columns. These columns and the expiry index remain untouched and are no longer used by a deletion scheduler. No existing expiry value is treated as authority to delete a recording.

## Minimal additive schema delta

Create only the three missing tables and their declared indexes:

- `user_storage_objects`: unique object-path manifest, nullable `owner_user_id` without a user foreign key, purpose/status (including `retained`), creation/deletion timestamps, and owner/retention indexes.
- `account_deletion_requests`: durable request id, nullable target and requester identifiers without user foreign keys, requester role, pending/completed status, request/completion timestamps, and status/request-time index. Identifiers are nulled when media work completes.
- `private_media_deletion_jobs`: unique object path, optional FK to the deletion request (`ON DELETE SET NULL`), nullable owner id without a user foreign key, deletion reason (`automatic_retention`, `account_deletion`, or `manual_admin_delete`), media type, pending/processing/completed/retained status, attempts, due/lock/error/completion fields, and due-work index.

No existing table or column needs to be dropped, renamed, truncated, or backfilled. The `retained` job status is an application-level value in a `varchar` column; no enum migration is required. Do not add deletion jobs for historical media.

## Historical media safeguards

- Reconciled class **A** media is eligible for account deletion only when current ownership evidence links it to the account being deleted; age-based cleanup remains disabled.
- Class **D** unresolved media is not deleted and is not assigned to an owner by filename or similarity.
- Class **E** corrupt/truncated media is still eligible for account deletion when ownership is proven; corruption alone does not make it permanent.
- No historical ownership backfill or blanket job creation is part of this change.
- Runtime cleanup marks policy-blocked or unresolved jobs `retained` without calling object deletion. Storage failures remain `pending` with bounded retries; missing objects are idempotently completed.
- Shared recordings are retained only when a ready, undeleted recording still links another legitimate participant. After deletion completes, direct owner identifiers are removed from the media manifest and deletion request where possible.
- The current source contains no time-based video-retention scheduler or active `recording_retention_months` setting; the published production API is stale and still starts the legacy six-month deletion job (see the cutover audit below).

## Required readiness fields

| Check | Result |
| --- | --- |
| Missing production tables | `user_storage_objects`, `account_deletion_requests`, `private_media_deletion_jobs` |
| Intended media-table change additive in isolation | **YES** — create the three missing tables and indexes |
| Current production Publish diff isolated to media tables | **NO** — it also changes `users.clerk_user_id`/its unique constraint and replaces a `sessions` foreign key |
| Existing users touched | **NO** |
| Existing media rows touched | **NO** |
| Historical backfill performed | **NO** |
| Deletion jobs created | **NO** |
| Destructive operation executed | **NONE** |
| Publish truncation warning | **PRESENT** — the current diff warns about truncating 125 `users` rows for the unique constraint |
| Safe to apply current schema diff | **NO** — stop until the unrelated changes and truncation warning are resolved; **nothing was applied** |
| Time-based video deletion in production | **FAIL** — the stale published API still registers the legacy six-month recording-retention job |
| Explicit student account deletion of proven-owned private video | **ENABLED in code; awaiting production schema** |
| Teacher verification video deletion | **OUT OF CURRENT SCOPE** — teacher hard deletion is not authorized |
| 90-/180-day retention environment flags | **NOT CONFIGURED** in the current production environment inventory |
| Deployment | **NOT PERFORMED** |

## Current readiness

The development schema source and development database now contain the required structures and reason/requester fields. The three media tables existed in development with zero rows; only the three missing columns were added there. The unforced Drizzle push stopped before changing anything when it requested truncation of 74 development `users` rows; it was not forced. The latest read-only production comparison still finds all three media tables missing. The current production Publish diff also includes unrelated user/session schema changes and a truncation warning for the 125 production users, so the full diff is **not safe to apply as presented**.

No production DDL or data changes were made; no production media objects were accessed or deleted; no historical backfill or production jobs were created; and the application was not deployed. Automated deletion verification used synthetic/mock data only.

The production logs still show `recording retention scheduler started (cron: daily)` as recently as 2026-10-02 14:06 UTC, although that scheduler is absent from the current API source. Historical source shows the old startup path imported and called `startRecordingRetentionScheduler()` from `artifacts/api-server/src/index.ts`. That scheduler runs once at startup and daily at 03:17 UTC; the old finalize route assigned `expiresAt` six months after upload, and the job deleted the private object before marking its row deleted. Production currently has zero recording rows, and no recording-deletion event was found in the available logs, but the deployed runtime remains **stale and capable of future six-month deletion**.

The historical placement/KYC retention path depended on `PLACEMENT_VIDEO_RETENTION_DAYS` and `TEACHER_VERIFICATION_VIDEO_RETENTION_DAYS`; both are absent from the current production environment and secret inventory. The available production logs do not show the newer private-media cleanup scheduler starting. Do not treat this as a verified production cutover: the published API still does not match the current source.

## Production cutover audit — read-only (2026-10-02)

| Check | Result |
| --- | --- |
| Production schema before / after audit | Unchanged; no production DDL was run |
| Production users before / after | 125 / 125 |
| Students | 100; 11 placement-video references, including 6 with pending review |
| Teachers | 23; 1 KYC-video reference, 13 pending KYC reviews, 1 teacher-certificate file reference |
| Session recordings | 0 rows; 0 expired, undeleted rows |
| Other relevant references | 2 sessions, 0 participants, 0 promotion requests/videos, 1 qiraat-certificate reference, 0 user avatars |
| Media/object storage listing | **NOT AVAILABLE** — no object listing was performed; prior bucket metadata access returned 403 |
| Objects deleted by this audit/migration | 0 |
| Historical media changed by this audit | **NO** — earlier effects of the old published scheduler cannot be established from the available logs |
| Production deletion jobs created | 0 |
| Cleanup worker in production | **NOT CUT OVER** — the required media tables are absent, and its startup was not observed in available logs |
| 90-day / 180-day automatic deletion | **No current production flags configured; no active path observed** |
| Six-month session-recording deletion | **STILL ACTIVE in the stale published API**; no eligible recording rows exist in the current snapshot |
| Synthetic production test | **NOT RUN** |
| Post-publish verification | **NOT RUN** — no publish occurred |
| Deployment health evidence | Deployment metadata reports a successful public autoscale build, while recent logs contain `/api` health checks returning 500 |
| App Store readiness | **NO** — production policy/runtime are not aligned, and the current Publish diff is blocked |

No Publish, production migration, `--force`, user mutation, object access/deletion, historical backfill, or synthetic production test was performed. Stop here until the unrelated schema drift is safely resolved and the production deployment can be updated without truncating users.

## Verification

- Rebuilt `lib/db` and `lib/tabyan-trpc` declarations successfully.
- API server typecheck passed; **52 API tests** passed, including mocked worker checks for video policy denial, unresolved ownership, shared-record retention, storage retry, missing-object idempotency, and reruns.
- **130 tRPC tests** passed, including student-only self-service/admin deletion scope and rejection of the legacy retention setting.
- Web and mobile typechecks passed; the web color check passed; the web production bundle built successfully with `PORT` and `BASE_PATH` supplied as required by the artifact workflow.
- The development API restarted successfully and its private-media cleanup worker completed its startup pass without the prior schema error. The web bundler emitted non-blocking sourcemap/chunk-size warnings.
- No production migration, user/object mutation, or deployment was performed; production remains unchanged.