# Tabyan — Developer Handoff

Prepared 2026-10-24 from the `feature/real-lightweight-mushaf` working tree (HEAD `e1fd2862`).
This document only describes the project; preparing it changed no code, data, Railway resources or production traffic.

## How to read the status labels

Every status claim in this file carries one of these labels:

| Label | Meaning |
|---|---|
| **VERIFIED** | Checked against source code or by running a local test on 2026-10-24 |
| **RECORDED** | Stated in a dated in-repo record (`.agents/memory/*`, `research/*`, `docs/*`). Not re-checked live |
| **OWNER-REPORTED** | Supplied by the project owner. No matching record exists in the repository |
| **PENDING** | Not done yet |
| **UNKNOWN** | Could not be established from the repository |

Older reports in `docs/` and `research/` are historical. Several of them contradict each other or the current code (see §P). When a report disagrees with source, trust the source.

---

## A. Project overview

Tabyan (تبيان) is an Arabic Quran-education platform with three roles: **student**, **teacher** and **admin/supervisor**. It covers:

- placement tests (video)
- booking and live sessions (WebRTC)
- recordings and teacher evaluations
- level and path progression
- a digital library
- fatwa questions and answers with mufti assignment
- a sharia curriculum with exams and certificates
- notifications, prayer times and qibla
- a Quran reader with AI-assisted recitation ("Smart Mushaf")

Production domain: `tibyanquran.com`. Both the Web build and the Mobile builds point at it.

## B. Architecture

```
          Web (React 19 + Vite, static SPA)        Mobile (Expo SDK 54 / RN 0.81, expo-router)
                     │ same-origin /api                    │ https://tibyanquran.com (EXPO_PUBLIC_DOMAIN)
                     ▼                                     ▼
         ┌──────────────── API server (Express 5, Node 24, single process) ───────────────┐
         │ /health, /readiness              (app.ts)                                       │
         │ /api/healthz, /api/diagnostics/* , /api/storage/*   (REST, routes/*.ts)          │
         │ /api/trpc/*                      (tRPC v11 + superjson, lib/tabyan-trpc)         │
         │ WS /api/ws/session-call          (WebRTC signaling — signaling.ts)               │
         │ WS /api/ws/recitation            (Tabyan AI ASR gateway — recitationRealtime.ts) │
         │ WS /api/ws/nabr-qrc-gateway      (Nabr/QRC gateway — nabrQrcGateway.ts)          │
         │ schedulers: session reminders, private-media cleanup (TABYAN_SCHEDULERS_ENABLED) │
         └───────────────┬──────────────────────────────┬────────────────────────────────┘
                         ▼                              ▼
            PostgreSQL 16 (Drizzle ORM, lib/db)   Object Storage (provider switch:
                                                   TABYAN_OBJECT_STORAGE_PROVIDER = replit | railway)
```

**VERIFIED** from `artifacts/api-server/src/index.ts`, `app.ts` and `routes/index.ts`.

The three WebSocket routes keep their rooms, leases and diagnostics state in **process memory**. The reminder scheduler has no cross-replica claim. **Run exactly one API replica** until that changes. **RECORDED** in `.agents/memory/tabyan-live-session-deployment.md` and `tabyan-replit-exit.md`, and consistent with the source.

## C. Repository structure

pnpm workspace (`pnpm-workspace.yaml`), Node 24, TypeScript 5.9.

| Path | What it is |
|---|---|
| `artifacts/api-server` | Express API + WebSockets + schedulers (`@workspace/api-server`). esbuild bundle → `dist/index.mjs` |
| `artifacts/tabyan` | Web app (`@workspace/tabyan`), React 19, react-router, Tailwind 4, Vite 7 |
| `artifacts/tabyan/smart-mushaf-v3` | Smart Mushaf V3 engine + QCF reader (mounted by the Web route) |
| `artifacts/mobile` | Expo / React Native app (`@workspace/mobile`), expo-router file routes in `app/` |
| `artifacts/tabyan-staff-preview` | Separate "staff preview" web artifact at `/tabyan-staff-preview/` |
| `artifacts/mockup-sandbox` | Design mockup sandbox (not product) |
| `lib/db` | Drizzle schema (`src/schema`), SQL migrations (`migrations/0001…0013`), seed script |
| `lib/tabyan-trpc` | All tRPC routers: auth, student, teacher, admin, fatwa, library, notifications, sharia, dailyVerse, recitation, quranFoundation |
| `lib/tabyan-domain`, `lib/design-tokens` | Shared domain logic and design tokens |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | OpenAPI spec + Orval-generated Zod/hooks (small REST surface) |
| `verification/scripts` | Verification scripts (`verify-*.mjs`, mushaf manifest tools, `post-merge.sh`) |
| `projects/smart-mushaf-flutter` | Flutter spike. Not part of the pnpm build |
| `docs/`, `research/`, `verification/` | Historical reports (see the warning above) |
| `.agents/memory/` | Durable project decisions and constraints (≈86 notes). **Read the Railway/Replit ones before touching infra** |

Root clutter that is safe to ignore: `index.html`, `index.html.1–3` (identical 176 KB files), `main.py`, `generated/`, `generated-artifacts/`, `screenshots/` and `attached_assets/` (43 MB).

## D. How to run locally

```bash
pnpm install                                   # pnpm only; the preinstall hook rejects npm/yarn
pnpm run typecheck                             # libs (tsc --build) + every artifact
pnpm --filter @workspace/api-server run test   # API unit tests (node --test via tsx)
pnpm --filter @workspace/tabyan run test       # Web unit tests (vitest)
pnpm --filter @workspace/tabyan run test:smart-mushaf   # Smart Mushaf: 11 files / 90 tests — VERIFIED passing 2026-10-24
```

**API**: `PORT=8080 DATABASE_URL=<dev db> pnpm --filter @workspace/api-server run dev`

- `PORT` is required; startup throws without it.
- The default storage provider is `replit`, which needs the Replit sidecar. Outside Replit, uploads fail unless you configure the `railway` provider against a **non-production** bucket.
- The dev-only bearer tokens `dev-<role>-…` work only when `NODE_ENV=development`.

**Web**: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/tabyan run dev`

- `vite.config.ts` has **no `/api` proxy**. On Replit, the path router sends `/api` to the API. Off Replit, add a local proxy or reverse proxy.

**Mobile**: the `dev` script assumes Replit (it sets `EXPO_PACKAGER_PROXY_URL` from `REPLIT_EXPO_DEV_DOMAIN`).

- Off Replit, run `npx expo start` in `artifacts/mobile` with `EXPO_PUBLIC_DOMAIN` set to your API host.
- Live streaming and WebRTC need a dev client, not Expo Go.

**Dev DB seed**: `node lib/db/seed-tabyan.mjs`. It is idempotent and assigns a mufti to the «قراءات» category.

> ⚠️ **Broken root scripts (VERIFIED).** `pnpm run build`, `verify:mushaf`, `verify:contracts`, `verify:design-tokens`, `verify:product-registry`, `verify:home-navigation-parity` and `verify:screen-parity` all call `node scripts/…`. The root `scripts/` directory no longer exists; the files now live in `verification/scripts/`. So `pnpm run build` currently fails at `verify:mushaf` with `Cannot find module …/scripts/verify-mushaf.mjs`. Running `node verification/scripts/verify-mushaf.mjs` directly also fails: it reports a missing manifest. Build each package with `pnpm --filter <pkg> run build` until this is fixed.

## E. Web app — `artifacts/tabyan`

- Routes live in `src/App.tsx`, all lazy-loaded. Shells: `StudentShell`, `TeacherShell`, `AdminShell`, `SessionRoomLayout`.
- tRPC client (`src/providers/trpc.tsx`): `httpBatchLink` to `${BASE_URL}/api/trpc`, so it is same-origin.
- WebSockets are built from `location.host`:
  - `src/lib/webrtc.ts` → `/api/ws/session-call`
  - `src/lib/recitation-ai/useOpenAiRealtimeTranscription.ts` → `/api/ws/recitation`
- Replit production serves the build statically from `artifacts/tabyan/dist/public` with an SPA rewrite (`artifacts/tabyan/.replit-artifact/artifact.toml`).
- Admin-panel CSS must stay scoped under `.admin-shell` (**RECORDED** in `.agents/memory/tabyan-admin-shell-scope.md`).

## F. Mobile app — `artifacts/mobile`

| Item | Value |
|---|---|
| Expo / React Native / expo-router | `~54.0.20` / `0.81.5` / `~6.0.14`, New Architecture on |
| iOS bundle ID / build number | `app.replit.tbyan` / `6` (`app.json`) |
| Android package | `com.tabyan.app`, versionCode 1 |
| EAS project | `extra.eas.projectId` in `app.json`. Profiles in `eas.json` (development / preview / production) |
| API target | preview and production profiles hard-code `EXPO_PUBLIC_DOMAIN=tibyanquran.com` and `EXPO_PUBLIC_WS_ORIGIN=wss://tibyanquran.com` |

`lib/trpc.tsx` throws if no domain is configured.

Because shipped binaries call `tibyanquran.com`, the **backend cutover can happen at the domain or routing layer without a new mobile build**, as long as `tibyanquran.com/api/*`, including WebSocket upgrades, reaches the Railway API.

Before any EAS or App Store work, read `docs/TABYAN_APPLE_IDENTITY_LOCK.md` and `.agents/memory/eas-pnpm-project-link.md`. The bundle ID and the EAS project must stay tied to the existing App Store record.

## G. Backend / API — `artifacts/api-server`

**REST** (`src/routes/*`):

- `GET /api/healthz`
- `GET /api/diagnostics/placement-version`
- `/api/storage/*`: upload request and finalize, live-session recording finalize, book download, placement and media playback capabilities, diagnostic sessions, public and private object streaming

**Health**:

- `GET /health` always returns 200. This is the Railway health check.
- `GET /readiness` checks the DB, the exact table set and the Drizzle migration ledger. See the blocker in §J.

**tRPC** (`lib/tabyan-trpc/src/router.ts`): 11 routers. `admin` is the largest (≈93 procedures, 1,700 lines).

**Auth** (`lib/tabyan-trpc/src/context.ts`, `routers/auth.ts`, `middleware.ts`):

- Bearer tokens are stored in `auth_tokens`. Admin tokens must also have an active `admin_sessions` row, which allows revocation.
- Procedures: `checkPhone`, `completeProfile`, `passwordLogin`, `studentPasswordLogin`, `adminLogin`, WebAuthn register and login, `me`, `logout`, `deleteAccount`.
- Role guards: `protectedProcedure`, `studentProcedure`, `teacherProcedure`, `adminProcedure`, and `approvedTeacherProcedure` (requires teacher KYC `approved`).
- No Firebase, Google or Clerk SDK is used in the auth router. The `users` table has `google_id` and `clerk_user_id` columns from migrations 0001/0012. **UNKNOWN**: what Firebase access is needed for. Confirm with the owner (likely push or Android).

**Environment variables read by the server** (names only, no values):

- Core: `PORT`, `NODE_ENV`, `DATABASE_URL`, `SESSION_SECRET`, `LOG_LEVEL`, `TABYAN_SCHEDULERS_ENABLED`
- Storage: `TABYAN_OBJECT_STORAGE_PROVIDER`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `RAILWAY_BUCKET_ENDPOINT`, `RAILWAY_BUCKET_S3_NAME`, `RAILWAY_BUCKET_SIGNING_REGION`, `RAILWAY_BUCKET_URL_STYLE`, `RAILWAY_BUCKET_DISPLAY_NAME`, `RAILWAY_DEPLOYMENT_REGION`, `RAILWAY_BUCKET_ACCESS_KEY_ID`, `RAILWAY_BUCKET_SECRET_ACCESS_KEY`
- CORS: `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, `EXPO_PUBLIC_DOMAIN`
- AI: `TABYAN_AI_ENABLED`, `TABYAN_AI_TRANSCRIPTION_ENABLED`, `TABYAN_AI_LIVE_TRACKING_ENABLED`, `TABYAN_AI_ASR_PROVIDER`, `OPENAI_API_KEY`, `SPEECHMATICS_API_KEY`, `NVIDIA_API_KEY`, `TABYAN_AI_TARTEEL_TRIAL_ENABLED`, `TABYAN_TARTEEL_MODEL_PATH`, `TABYAN_TARTEEL_PYTHON`, `HF_HOME`, `HF_HUB_CACHE`
- Nabr: `NABR_QRC_ENABLED`, `NABR_QRC_SHADOW_MODE`, `NABR_QRC_ONE_SHOT_TEST`, `NABR_QRC_GATEWAY_LIVE_ENABLED`, `NABR_QRC_API_KEY`
- Quran Foundation: `QF_ENV`, `QF_CONTENT_ENABLED`, `QF_CLIENT_ID`, `QF_CLIENT_SECRET`
- Other: `LIVE_SESSION_RECORDING_ENABLED`

**CORS** (`app.ts`): allows `tibyanquran.com`, `www.tibyanquran.com`, the Replit domain env vars and `*.expo.pike.replit.dev`. It has no Railway-specific origin, which is fine as long as clients keep using `tibyanquran.com`.

**Video validation** needs the `ffprobe-static` binary at runtime. Startup logs an error if it is missing.

## H. Database — `lib/db`

- PostgreSQL + Drizzle ORM (`drizzle-orm` 0.45, `drizzle-kit` 0.31). The schema has **55 tables** (**VERIFIED**: `pgTable(` declarations in `lib/db/src/schema`).
- Checked-in SQL migrations: `lib/db/migrations/0001_users_google_id.sql` … `0013_placement_attempt_permits.sql`.
- `drizzle.config.ts` writes to `migrations/canonical`, which **does not exist** in this checkout (**VERIFIED**). The `@workspace/db` `migrate` script therefore has no canonical migration set locally. **RECORDED**: there is no Drizzle migration ledger in the Replit Production database.
- `pnpm --filter @workspace/db run push` is for development only. **Never run `push` or `push-force` against production or the Railway AMS database.**
- **RECORDED** (`research/TABYAN_FULL_BACKEND_RAILWAY_MIGRATION.md`, 2026-10-19): Replit Production runs PostgreSQL 16.15 with 55 public tables and 2,015 rows. The workspace's own `DATABASE_URL` points at **Development**, not Production.

## I. Object Storage

`artifacts/api-server/src/lib/objectStorageRuntime.ts` chooses the backend from `TABYAN_OBJECT_STORAGE_PROVIDER`:

- `replit` (default): `ReplitObjectStorageProvider`. Works only on Replit (sidecar signing).
- `railway`: `RailwayObjectStorageProvider` (S3-compatible, AWS SDK v3). Has unit tests in `RailwayObjectStorageProvider.test.ts`.

The Railway bucket's display name and its S3 contract are **different values**. Do not infer one from the other (**RECORDED**, and hard-coded as expectations in `amsStorageSmokeTest.ts` and `amsMigrationPreflight.ts`):

| | Value |
|---|---|
| Display name | `tabyan-objects-ams` |
| Deployment region | `ams` |
| S3 bucket name | `tabyan-objects-ams-jwidul` |
| Signing region | `auto` |
| Endpoint | `https://t3.storageapi.dev` |
| URL style | `virtual-host` |

`user_storage_objects` plus the exact DB references are authoritative for ownership. Presigned URLs are temporary and are not identifiers.

## J. Railway

**Target** (**RECORDED**, `.agents/memory/tabyan-railway-target.md`):

- Railway project `grateful-creativity`. Do not rename it or create another project.
- API service `tabyan-api` and PostgreSQL service `tabyan-postgres-ams`, both in `europe-west4`. Postgres runs as 1 replica on a 500 MB volume with **no public TCP proxy and no domain**.
- Bucket `tabyan-objects-ams` in `ams`.
- Deployment source: the private repo `qurankream0987-eng/tabyan`, branch `railway/migration-ams`. Railway has GitHub access to it.

**Operating rules** (all **RECORDED**):

1. The service is commit-pinned (`commitSha`). Pushing to the branch does not deploy while the pin holds. Before every push, check the pin and branch head. Afterwards, confirm the pin still holds.
2. Applying a source-pin change may need dashboard two-factor auth. If the MCP `accept-deploy` call is blocked, **do not retry**. Leave the change staged; the owner applies it in the dashboard.
3. The MCP `redeploy` on a failed GitHub deployment can start a **fresh paid build**. Treat it as a build.
4. Railpack may pick the **Python** provider because of the root `pyproject.toml`, then fail with `pnpm: not found`. Configure Node/pnpm explicitly. Check the provider Railpack detected in the build logs.
5. The workspace cannot resolve `*.railway.internal`. Run database audits **inside** an authorized Railway process, in a **read-only transaction**. Ask the owner before creating any temporary runner, because it costs money.
6. A Railway `Problem processing request` error is an API or request problem, not a credential failure. **Do not ask for token rotation** unless Railway returns `UNAUTHENTICATED` or `FORBIDDEN`.
7. During Railway "Limited Access" (variable editing or builds locked), prepare changes locally and **do not deploy**.
8. Start with **one API replica**.

> ⚠️ **Code-level readiness blockers found during this audit (VERIFIED in source, not yet fixed):**
>
> 1. `artifacts/api-server/src/databaseSchemaExpectations.ts` lists **54** tables. The schema and production have **55**: `placement_attempts` is missing from the list (production has 2 rows in it). Against the restored database, `/readiness` will treat `placement_attempts` as an unexpected table and return **503**.
> 2. `/readiness` also returns 503 unless `drizzle.__drizzle_migrations` exists with at least one row. The source database had **no Drizzle ledger** (RECORDED), so a faithful restore has none either, unless one was created afterwards (**UNKNOWN**).
> 3. Both failures make `/readiness` fail, which **keeps the schedulers stopped** (`index.ts` starts them only after readiness passes). `/health` still returns 200, so Railway will report the service healthy while readiness fails.
> 4. `pnpm --filter @workspace/api-server run ams-schema-setup` (`amsMigrationPreflight.ts`) is an **empty-database baseline tool**. It hard-codes `publicTables=54` and refuses a non-empty target. In `verify-only` mode (`TABYAN_AMS_SCHEMA_MODE=verify-only`) it fails on the restored database for the same reasons. **Do not run it in `apply-empty-baseline` mode against the restored AMS database.**
>
> Decide with the owner how readiness should treat the restored database before cutover: add the missing table to the list, and either establish a ledger or change the ledger requirement. That decision changes behaviour, so this handoff did not make it.

## K. Replit

Replit currently runs **production** (Web static + API + managed PostgreSQL + Object Storage).

- `.replit`: modules `nodejs-24`, `python-base-3.13`, `postgresql-16`. Deployment target `autoscale` (see the WebSocket single-instance caveat in §B). `postMerge` runs `verification/scripts/post-merge.sh`. `[objectStorage] defaultBucketID` is the Replit source bucket.
- The API artifact (`artifacts/api-server/.replit-artifact/artifact.toml`) listens on port 8080. Its health path is `/api/healthz`, and it serves `/api` and `/api/ws/nabr-qrc-gateway`.
- On Replit, **Publish is project-wide**: it redeploys every artifact and syncs the managed PostgreSQL schema. Never treat it as a web-only publish (**RECORDED**, `deployment-build-parity.md`).
- Secrets: a `[userenv.*]` entry in `.replit` with the same name **shadows** a Replit Secret, even when its value is empty. Check `.replit` before debugging a "missing" secret. Never print secret values; check only presence and length (**RECORDED**, `replit-secret-injection.md`).
- `replit.md` is a mostly unfilled template, and its "port 5000" is out of date (the API uses 8080).

## L. Smart Mushaf

Read `artifacts/tabyan/smart-mushaf-v3/docs/LIVE_RECITATION_ENGINE.md` first. It is current, and it supersedes the RC1 handoff files.

| Item | State |
|---|---|
| Route | `/student/smart-mushaf-v3` → `src/pages/student/SmartMushafV3.tsx` → `smart-mushaf-v3/src/App.tsx` (**VERIFIED**) |
| Route protection | Registered **outside** `StudentShell`, so there is no route-level role guard. The Nabr gateway enforces a student token server-side. No in-app link to the route was found; it is reached by URL (**VERIFIED**) |
| Other Mushaf routes | `/student/mushaf-fahd` (legacy reader), `/student/tilawah`, and the DEV-only mock `/student/smart-mushaf` |
| Renderer | QCF v2 page reader: `src/mushaf/qcf/{QcfMushafView,QcfPage,QcfWord}.tsx`. Pages mount as React transitions; each word subscribes individually via `useSyncExternalStore`, so pages do not re-render on word updates |
| Quran data | Word identity: `src/quran/data/tanzil-uthmani.txt` (sha256 prefix `6933e133dd56db77`, **VERIFIED**). Geometry and glyphs: `artifacts/tabyan/public/mushaf/pages/1..604.json` + `public/mushaf/fonts/` (604 + 604 files, **VERIFIED**) |
| Integrity | **6,236 ayahs and 77,433 recitable WordKeys**, all bound across 604 pages. **VERIFIED**: `qcfCanonicalAlignment.test.ts` and `quranDataIntegrity.test.ts` pass |
| QCF alignment exceptions | Exactly four, in `src/quran/layout/qcfAlignment.ts` (`QCF_ALIGNMENT_EXCEPTIONS`). In each, QDC joins two Tanzil words into one glyph-word, which binds to **both** WordKeys. Neither dataset is modified. See the table below |
| WordKeys | `{surah, ayah, wordIndex}`, 1-based per ayah: `src/quran/canonical/CanonicalWordIndex.ts`, `src/quran/layout/pageWordIndex.ts` |
| Follow / highlight | `live/position/PositionTracker.ts`: small forward steps advance at once; a skip is flagged only after later forward evidence; small backward steps count as repetition; big jumps need 3 agreeing events or a "start from here" tap. `live/follow/followPolicy.ts`: comfort band, one conservative scroll, 4 s suspension after user input, plus a "العودة إلى موضع التلاوة" pill. `live/store/WordPresentationStore.ts`: typed arrays, notifies only the words that changed |
| Audio pipeline | `live/audio/MicrophonePipeline.ts` + `pcm-frame-worklet.js` (AudioWorklet, 20 ms PCM16 @ 16 kHz) → `BoundedFrameQueue` (3 s buffer before connect) → provider |
| VAD | `live/audio/EnergyVad.ts`. Main thread, used for signals only; it **never gates audio** |
| Session | `live/LiveRecitationController.ts` + `live/session/sessionMachine.ts`. Learner messages: `live/session/messages.ts` |
| Fake provider | `live/providers/FakeStreamProvider.ts`. DEV-only: dynamic imports sit inside `import.meta.env.DEV`, so production builds exclude it. Check with `node smart-mushaf-v3/scripts/audit-production-bundle.mjs dist/public` |
| Nabr adapter | Client: `live/providers/NabrLiveAdapter.ts` (default policy `candidate-only`; segmentation configurable `tanzil`/`qdc`), `src/providers/nabr/*`, `src/audio/adapters/NabrAudioAdapter.ts`. Server: see §M |
| Performance work | Old hot-path / diagnostics pipeline removed (commit `8b1ac6f2`, about −10k lines). Per-word subscriptions, mic and provider start in parallel, audio device pre-warmed when idle, browser benchmark `smart-mushaf-v3/scripts/browser-live-check.mjs` |
| Mobile | **No Mushaf reader of any kind on mobile** (VERIFIED: no QCF/Smart Mushaf code in `artifacts/mobile`). Mobile recitation (`app/student/recitation.tsx`, `lib/native-recitation.ts`) uses `/api/ws/recitation` with a separate matcher |

The four QCF alignment exceptions:

| Ayah | QCF position | Tanzil words joined | Note |
|---|---|---|---|
| 2:181 | 3 | 3, 4 («بَعْدَ مَا») | Also `endMarkerTaggedAsWord: 14`: the word count matches, but positions after word 3 are shifted |
| 8:6 | 4 | 4, 5 («بَعْدَ مَا») | |
| 13:37 | 8 | 8, 9 («بَعْدَ مَا») | |
| 37:130 | 3 | 3, 4 («إِلْ يَاسِينَ») | |

**Remaining blockers** (RECORDED in the engine doc unless marked otherwise):

- The only live Nabr capture showed results at about **1 Hz**, with the cursor advancing 4 times in about 30 s and moving backward once. That is not word-incremental. Cadence must be re-measured live; if it stays near 1 Hz, phrase-level updates are the ceiling.
- Unknown: whether QRC `word_index` follows Tanzil or QDC segmentation, the meaning of `exit_code=7`, and the best chunk size (the client captures 20 ms frames; the server sends 200 ms WAV chunks).
- Paint latency has been measured only in a headless container with no GPU. Real-phone numbers are still needed.
- Native QCF renderer and live engine: not started.
- The rights and licensing status of the Mushaf assets is covered in `research/TABYAN_FINAL_SMART_MUSHAF_GO_NO_GO.md` and `research/TABYAN_SMART_MUSHAF_LICENSE_MATRIX.md`. It was not re-verified here.

**Rule: do not hand-type Quran text in code.** Derive it from the Tanzil source; see `src/quran/data/basmala.ts` for the reason.

## M. Nabr integration status

- **Server gateway** `WS /api/ws/nabr-qrc-gateway` (`artifacts/api-server/src/nabrQrcGateway.ts`), **VERIFIED**:
  - Tabyan-token `auth` message with a timeout. **Student role only**, one connection per user.
  - 64 KB maximum payload. Writes no DB rows. Never logs tokens, audio, or the QRC URL or key.
  - Transport: `NODE_ENV=development` uses the **fake** transport. Live requires `NABR_QRC_GATEWAY_LIVE_ENABLED=true`. Credentials stay server-side.
- **Older path**: Nabr through `/api/ws/recitation`. `providerSelection.ts` allows `nabr` only in development, with `NABR_QRC_ENABLED`, `NABR_QRC_SHADOW_MODE` and `NABR_QRC_ONE_SHOT_TEST` all set to `true`.
- **Tests**: `nabrQrcGateway.test.ts` and `recitation-providers/*.test.ts`. The Web e2e test against a local fake upstream is `artifacts/tabyan/e2e/nabrQrcGateway.e2e.test.ts` (`npx vitest run --config e2e/vitest.config.ts`).
- **Status**: integration code exists end-to-end against the fake transport. Live acceptance is **PENDING**. Privacy and commercial gates are in `research/NABR_QRC_PRIVACY_COMMERCIAL_GATE.md` and `research/NABR_QRC_LIVE_ACCEPTANCE_READINESS.md`.
- **No live Nabr calls were made while preparing this handoff.** Do not enable live mode without owner approval.

## N. Tabyan AI status

`WS /api/ws/recitation` (`recitationRealtime.ts`) is enabled only when `TABYAN_AI_ENABLED`, `TABYAN_AI_TRANSCRIPTION_ENABLED` and `TABYAN_AI_LIVE_TRACKING_ENABLED` are all `true`. **VERIFIED**.

Provider selection (`recitation-providers/providerSelection.ts`, **VERIFIED**):

- Allowed in production: `openai`, `speechmatics`, `nvidia`
- Development only: `tarteel` (local faster-whisper Python worker `tarteel_whisper_worker.py`; needs Python plus a model) and `nabr`

**RECORDED** (`research/TABYAN_AI_PROVIDER_CAPABILITY_REPORT.md`, 2026-10-15):

- Production config selects OpenAI. The last recorded OpenAI preflight failed because credits ran out; current quota has not been checked.
- NVIDIA's hosted function rejects `ar-AR`.
- The local model scored Q-WER 23.7% on one public recording.
- **Production-ready: NO.**
- That report lists Nabr as "research-only". That is **out of date**: Nabr adapters and a gateway now exist (see §M).

## O. Supervision / admin status

- Web: 20 admin pages under `artifacts/tabyan/src/pages/admin/` plus `/admin/session/:id`. Mobile: matching file routes under `artifacts/mobile/app/admin/`. Review queues use the generic `AdminWorkflow` in `app/admin/_common.tsx`.
- Supervisor accounts log in with a username (migration `0002_supervisor_accounts.sql`, nullable phone). `adminLogin` is backed by revocable `admin_sessions`.
- Fatwa assignment (`admin.fatwaAssign`) rejects any mufti without an active `mufti_assignments` row for that category. **Every new fatwa category needs at least one mufti assigned** in AdminMuftis.
- **Known backend bugs, left alone deliberately** (RECORDED in `tabyan-admin-shell-scope.md`; not re-verified):
  - `admin.sessionsList` ignores the status and teacherId filters.
  - `admin.fatwaReviewAnswer` notifies `questionId` instead of `studentId`.
  - Mass notifications loop without a transaction.
- The supervision panel is being restored in phases, each approved separately by the owner. Do not assume later phases are approved.

## Web / Mobile parity map

Method (**VERIFIED** 2026-10-24): each web route was matched to its expo-router file. Then the tRPC procedures each web page calls were compared with the procedures its mobile screen calls, following local component imports.

This shows **functional coverage**, not visual parity. "MATCHED" means the same server contract is reachable; it does not mean the design matches.

| WEB_ROUTE | MOBILE_ROUTE | STATUS | Notes |
|---|---|---|---|
| **Auth / public** | | | |
| `/` (GuestHome) | `guest.tsx`, `index.tsx` | MATCHED | |
| (login is part of the web home flow) | `(auth)/login.tsx`, `register.tsx`, `teacher-register.tsx` | DIFFERENT | Mobile has dedicated auth screens |
| `/privacy` | `privacy.tsx` | MATCHED | |
| `/terms` | — | MISSING | |
| `/support` | `support.tsx` | MATCHED | |
| **Student** | | | |
| `/student/home` | `student/(tabs)/home.tsx` | PARTIAL | Home does not read `student.settings` |
| `/student/placement` | `student/placement.tsx` | MATCHED | |
| `/student/pending` | — (status shown on home/placement) | DIFFERENT | `placementStatus` used inside other screens |
| `/student/path` | — | MISSING | `student.paths` (path selection) not called anywhere on mobile |
| `/student/levels/:pathId` | `student/levels/[pathId].tsx` | MATCHED | |
| `/student/quran` | `student/quran.tsx` | MATCHED | Also hosts recitation history on mobile |
| `/student/tilawah` | `student/tilawah.tsx` | MATCHED | |
| `/student/sharia` … `/content`, `/exam`, `/certificate` | `student/sharia*.tsx`, `sharia/[subject]/*` | MATCHED | URL shape differs (`[subject]/[level]` vs `level/:levelId`) |
| `/student/sharia/:subject` | `student/sharia/[subject].tsx` + `[subject]/[level].tsx` | PARTIAL | Booking from a sharia level (`student.bookSession`, `student.teachers`) not on mobile |
| `/student/booking`, `/schedule`, `/recordings` | `student/booking.tsx`, `(tabs)/schedule.tsx`, `(tabs)/recordings.tsx` | MATCHED | |
| `/student/library`, `/library/book/:id(/read)` | `(tabs)/library.tsx`, `library/[id].tsx`, `library/[id]/read.tsx` | MATCHED | |
| `/student/fatwa`, `/fatwa/:id`, `/fatwas` | `(tabs)/fatwa.tsx`, `fatwa/[id].tsx`, `fatwas.tsx` | MATCHED | Features split differently across screens |
| `/student/notifications` (+ `/settings`, `/:id`) | `student/notifications*.tsx` | MATCHED | via `components/notification-feed` |
| `/student/account` | `(tabs)/account.tsx` + `student/settings.tsx` | DIFFERENT | Delete account and settings live on mobile `settings.tsx`. `library.myLibrary` and `student.progress` are not on the account tab |
| `/student/progress`, `/ijazat`, `/help` | same names | MATCHED | |
| `/student/prayer-times`, `/qibla` | same names | MATCHED | |
| `/student/session/:id` | `student/session/[id].tsx` | MATCHED | |
| `/student/mushaf-fahd` | — | MISSING | No Mushaf reader on mobile |
| `/student/smart-mushaf-v3` | — | MISSING | Smart Mushaf is web-only |
| `/student/recitation/history` | inside `student/quran.tsx` | DIFFERENT | |
| `/student/recitation/connectivity-gate` | `student/recitation.tsx` | DIFFERENT | Mobile has its own recitation flow (`/api/ws/recitation`) |
| **Teacher** | | | |
| `/teacher`, `/onboarding`, `/schedule`, `/evaluate/:sessionId`, `/evaluations`, `/students(/:id)`, `/recordings`, `/fatwas`, `/broadcast`, `/settings`, `/session/:id` | same names under `teacher/` | MATCHED | |
| `/teacher/notifications` (+ `/settings`, `/:id`) | `teacher/notifications*.tsx` | MATCHED | |
| **Admin / supervision** | | | |
| `/admin` and 18 of 19 sub-pages (`users`, `accounts`, `schedules`, `sessions-monitoring`, `library`, `qiraat`, `levels`, `sharia`, `teachers-review`, `students-review`, `fatwas`, `muftis`, `assessments`, `analytics`, `notifications`, `inbox(+settings,/:id)`, `audit-log`, `settings`) | same names under `admin/` | MATCHED | Same procedures. Review queues reuse the generic `AdminWorkflow`, so their layout differs from web |
| `/admin/promotions` | `admin/promotions.tsx` | DIFFERENT | Web lists all requests (`promotionsList`); mobile lists only pending ones (`promotionsPendingList`) |
| `/admin/session/:id` | `admin/session/[id].tsx` | MATCHED | |

Older parity reports (`docs/TABYAN_WEB_MOBILE_FINAL_PARITY_MATRIX.md`, `docs/TABYAN_ADMIN_WEB_TO_NATIVE_EXACT_PARITY.md` and others) are historical. Visual parity was not assessed in this audit.

## P. Known bugs / blockers

| # | Item | Status |
|---|---|---|
| 1 | `/readiness` table list missing `placement_attempts` (54 vs 55) | VERIFIED, open |
| 2 | `/readiness` requires a Drizzle ledger that production never had | VERIFIED (code) + RECORDED (no ledger), open |
| 3 | Root `pnpm run build` and `verify:*` point at the removed `scripts/` directory | VERIFIED, open |
| 4 | `drizzle.config.ts` output directory `migrations/canonical` absent | VERIFIED, open |
| 5 | WebSocket state and schedulers are per-process, so the API must run as one replica. Replit deployment target is `autoscale` | VERIFIED + RECORDED |
| 6 | Smart Mushaf route has no route-level guard and no in-app link | VERIFIED |
| 7 | No Mushaf / Smart Mushaf on mobile | VERIFIED |
| 8 | Nabr cadence about 1 Hz; segmentation and `exit_code=7` unknown | RECORDED |
| 9 | OpenAI provider: credits ran out at the last recorded preflight | RECORDED, current state UNKNOWN |
| 10 | Three admin backend bugs (§O) | RECORDED |
| 11 | `/home/runner/workspace/.claude` is an empty **file** committed in `7702f99b`, so Claude Code cannot read `.claude/settings*.json` (ENOTDIR) | VERIFIED. Fix: replace it with a directory |
| 12 | Contradictory records: `tabyan-replit-exit.md` says the bucket region is Singapore (`sin`); later records and source say Amsterdam (`ams`). `research/TABYAN_FULL_BACKEND_RAILWAY_MIGRATION.md` (2026-10-19) still says the AMS DB and bucket are **empty**, which later records supersede | RECORDED. Trust `tabyan-railway-target.md` and the source |

## Q. Migration status

### COMPLETE

| Item | Evidence level | Evidence |
|---|---|---|
| Production DB restored to `tabyan-postgres-ams` | RECORDED | `tabyan-railway-target.md`: "The Amsterdam database restore and object copy are complete; do not repeat either unless read-only verification proves a gap." |
| 55 tables | RECORDED (source side) / OWNER-REPORTED (target) | Production source has 55 public tables, matching the 55 in the schema |
| 83 foreign keys | OWNER-REPORTED | No in-repo record |
| 94 indexes | RECORDED (restore plan) / OWNER-REPORTED (target) | `tabyan-pg-restore-toc.md`: 27 explicit `INDEX` entries plus 67 index-backed constraints = 94 |
| `users` = 143, `sessions` = 2, `system_settings` = 2, `user_storage_objects` = 10 | RECORDED (source side) / OWNER-REPORTED (target) | Exact `COUNT(*)` on Replit Production, `research/TABYAN_FULL_BACKEND_RAILWAY_MIGRATION.md` |
| Replit migration-ledger table `_system.replit_database_migrations_v1` excluded from the restore | RECORDED | `tabyan-pg-restore-toc.md` |
| Object Storage copied to Railway: 33 private objects, 732,796,236 bytes, SHA-256 verification passed | RECORDED (copy completed) / OWNER-REPORTED (counts, bytes, hash result) | `tabyan-railway-target.md` |
| Old Replit source storage preserved | RECORDED | "Source Replit objects remain intact." |
| IAD PostgreSQL not touched | RECORDED | Staged public TCP 5432 / `DATABASE_PUBLIC_URL` changes on IAD remain **unapplied** |
| Railway S3 storage adapter implemented and unit-tested | VERIFIED | `RailwayObjectStorageProvider.ts` + test |

**Before cutover, re-run a read-only count audit inside Railway** (FKs, indexes, the four row counts, object count and bytes). Record the output in-repo so the owner-reported figures become recorded ones.

### PENDING

| Item | Notes |
|---|---|
| `tabyan-api` variable alignment | Set `TABYAN_OBJECT_STORAGE_PROVIDER=railway` and the approved non-secret `RAILWAY_BUCKET_*` / `RAILWAY_DEPLOYMENT_REGION` settings (see §I table). DB and bucket credentials go through private Railway service references only. Preserve all other variables. If values are redacted, report each check as UNKNOWN |
| Fix the readiness blockers | §J items 1–2; needs an owner decision |
| Final Railway deployment | One deployment, one replica, commit pin verified before and after |
| Health / readiness | `/health` 200 **and** `/readiness` 200 with `tableCount` 55 |
| REST / tRPC / WebSocket verification | `/api/healthz`, an authenticated tRPC call per role, storage upload and playback round-trip, all three WS routes (`session-call`, `recitation`, `nabr-qrc-gateway` with fake transport) |
| Reference coverage audit | Every object key referenced in DB rows (`user_storage_objects` and media columns) exists in the Railway bucket |
| Scheduler decision | Enable `TABYAN_SCHEDULERS_ENABLED` on exactly one backend at a time |
| Web / Native cutover | Route `tibyanquran.com` `/api` and `/api/ws/*` to Railway. Mobile needs no rebuild while the domain is unchanged. **Requires explicit owner release acceptance** |
| Disable Replit production backend | Only after acceptance. Keep it restorable |
| Replit disk cleanup | Only after cutover is stable, and **each deletion needs separate owner approval** |

### Rollback resources — do not delete or modify

- Replit Production backend (API deployment).
- Replit Production PostgreSQL (the `neondb` database, PG 16.15). Note that the workspace `DATABASE_URL` is **Development**, not this one.
- Replit Object Storage source bucket (`.replit` → `[objectStorage] defaultBucketID`).
- Railway legacy **IAD PostgreSQL** service. Keep it unchanged and **never apply** its staged public-proxy changes.
- The `main` branch and the public GitHub repo `qurankream0987-eng/tabyan-2`.

## R. Deployment notes

- **Git remotes**: in this workspace, the remote named `github` points to the **public** repo `qurankream0987-eng/tabyan-2`. The Railway deployment repo is the **private** `qurankream0987-eng/tabyan`. **Never push migration or infra work to `tabyan-2`, and never make the private repo public.**
- Branch state at handoff: `feature/real-lightweight-mushaf` is 400 commits ahead of local `main` and 584 behind it. Coordinate with the owner before merging anything.
- Replit Publish redeploys **all** artifacts and syncs the managed DB schema (§K).
- iOS/EAS: keep `app.replit.tbyan`, build 6, and the existing EAS project. See `docs/TABYAN_APPLE_IDENTITY_LOCK.md` and `docs/TABYAN_EXTERNAL_BUILD_HANDOFF.md`. App Store preflight: `pnpm run app-store:preflight` (this one points at `verification/scripts`, so it resolves).
- Smart Mushaf production bundle check: `node artifacts/tabyan/smart-mushaf-v3/scripts/audit-production-bundle.mjs artifacts/tabyan/dist/public`.

## S. Security rules

1. **No passwords or credentials are handed over directly**, in chat, email, docs or commits. Access is granted only by **official invitation or role** on each platform:
   - Railway (project member on `grateful-creativity`)
   - Replit (workspace or team invite)
   - GitHub (collaborator on `qurankream0987-eng/tabyan`)
   - Apple App Store Connect (user role)
   - Google Play Console (user permissions)
   - Expo / EAS (organization or project member)
   - Firebase (project IAM role)
2. **Secrets stay in platform secret stores**: Railway variables (prefer service references), Replit Secrets, EAS secrets, and the GitHub/Firebase/Apple/Google consoles.
3. **Never commit**:
   - Railway tokens
   - DB URLs containing credentials
   - Firebase service-account files
   - Apple credentials (p8 / p12 / app-specific passwords)
   - Google service-account JSON
   - Nabr / QRC credentials
   - OpenAI, Speechmatics, NVIDIA or Quran Foundation keys
   - bucket access keys
   - `SESSION_SECRET`
4. Check secrets only by **presence and length**. Never print, log or copy a value. Do not reset bucket credentials or rotate tokens just to see them.
5. Never open a public TCP proxy on any PostgreSQL service. Never apply the staged IAD public-access changes.
6. No production writes, deploys, publishes or traffic changes without explicit owner approval for that specific action. Earlier approval does not carry over.
7. No live Nabr or paid-provider calls without owner approval.
8. A `[userenv]` entry in `.replit` with the same name shadows a Replit Secret. Never put secret values in `.replit`; that file is tracked by git.

## T. Immediate priorities

1. **Finish the Railway backend cutover safely.**
   - Resolve the readiness blockers (§J) with the owner.
   - Align `tabyan-api` variables.
   - Run the in-Railway read-only count audit.
   - Do one pinned deployment with one replica.
   - Verify health, readiness, REST, tRPC, all three WebSockets and storage.
   - Run the reference coverage audit.
   - Get owner release acceptance, then cut over `tibyanquran.com`.
2. **Make Mobile match Web in function and design.**
   - Start with the MISSING and DIFFERENT rows above: path selection, `/terms`, promotions list scope, sharia-level booking, account layout.
   - Then work on visual parity, using Web as the contract source.
3. **Rebuild and improve the supervision screens on Web and Mobile.**
   - Work in owner-approved phases.
   - Scope admin CSS under `.admin-shell`.
   - Fix the three recorded admin backend bugs only in a dedicated, approved phase.
4. **Complete Smart Mushaf real-time readiness.**
   - Measure on real phones.
   - Add a route guard and an entry point.
   - Plan the native renderer.
   - Keep the 77,433-WordKey and 4-exception alignment tests green.
5. **Integrate Nabr after the Mushaf engine is proven.**
   - Re-measure live cadence.
   - Settle segmentation and `exit_code=7`.
   - Clear the privacy and commercial gates.
   - Enable `NABR_QRC_GATEWAY_LIVE_ENABLED` only with approval.
6. **Reduce Replit runtime and disk weight after the cutover.**
   - Root `node_modules` is about 1.5 GB.
   - Leftover files: duplicate `index.html*`, `attached_assets/` (43 MB), `screenshots/` (31 MB).
   - Many stale `subrepl-*` remotes and branches.
   - Each deletion needs separate owner approval. Rollback resources (§Q) stay until the owner releases them.
