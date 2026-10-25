# Running Tabyan locally (Windows)

Run these from Git Bash in this folder. Packages are managed with **npm workspaces**
(`npm install` at the root installs every app and lib).

```bash
# 0. Install dependencies (once, or after package.json changes)
npm install

# 1. Database (portable Postgres 16, port 5433, data in .local-pg/data)
.local-pg/bin/pg_ctl.exe -D .local-pg/data -l .local-pg/pg.log start

# 1b. File storage (SeaweedFS S3 on :9000, data in .local-s3/data, keys in .local-s3/s3.json)
.local-s3/bin/weed.exe server -ip=127.0.0.1 -ip.bind=127.0.0.1 -dir=.local-s3/data -master.port=19333 -volume.port=18080 -filer -filer.port=18888 -s3 -s3.port=9000 -s3.config=.local-s3/s3.json -s3.allowedOrigins="*"
#     Android emulator: adb reverse tcp:9000 tcp:9000 (upload URLs point at localhost:9000)

# 2. API server on :8080
cd apps/api && NODE_ENV=development node ./build.mjs && PORT=8080 NODE_ENV=development node --env-file=../../.env --enable-source-maps ./dist/index.mjs

# 3. Web app on :5173 (in another terminal), proxies /api to :8080
cd apps/web && MSYS_NO_PATHCONV=1 PORT=5173 BASE_PATH=/ LOCAL_API_TARGET=http://localhost:8080 npx vite --config vite.config.ts --host localhost
```

Stop the database: `.local-pg/bin/pg_ctl.exe -D .local-pg/data stop`

Tests: `npm test --workspace @workspace/tabyan` (the API and tRPC suites also need
`DATABASE_URL` from `.env` in the environment).

Notes
- `.env` points DATABASE_URL/PG* at the local DB (restored from the Replit dev DB on 2026-10-25).
- OPENAI_API_KEY, NVIDIA_API_KEY, SPEECHMATICS_API_KEY, NABR_QRC_API_KEY and
  SESSION_SECRET in `.env` are REAL production values.
- Keys the code never reads (production DB URL, GitHub/Railway/Expo tokens, Clerk,
  Replit leftovers) were moved to `../tabyan-secrets-backup.env`.
- `apps/web/vite.config.ts` reads `LOCAL_API_TARGET` to proxy `/api` locally.
- Replit-only files were moved to `../tabyan-replit-backup`; the old pnpm files
  (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) are in `../tabyan-pnpm-backup`.
- File storage uses `TABYAN_OBJECT_STORAGE_PROVIDER=railway` pointed at the local
  SeaweedFS bucket `tabyan-local`. For the real Railway bucket, replace the
  `RAILWAY_BUCKET_*` values in `.env`.
