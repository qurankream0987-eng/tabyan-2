# Running Tabyan locally (Windows)

Run these from Git Bash in this folder. Packages are managed with **npm workspaces**
(`npm install` at the root installs every app and lib).

## Quick start

```bash
npm install
npm run dev          # Postgres :5433, S3 storage :9000, API :8080, web :5173
npm run dev:mobile   # same, plus Metro :8082 and adb reverse for the Android emulator
npm run dev:db:stop  # Postgres keeps running after Ctrl+C; this stops it
```

`npm run dev` skips any service whose port is already in use and prefixes each
service's output with its name. Before committing: `npm run typecheck` and
`npm run lint` (0 errors expected; warnings are known debt to work down).

## Starting services by hand

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

## Mobile app on the Android emulator

```bash
# Native build (only needed again after adding a native library). x86_64 is the emulator ABI.
cd apps/mobile/android && ./gradlew.bat app:assembleDebug -PreactNativeDevServerPort=8082 -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Metro on :8082 (8081 is often taken by other projects); the app reaches the API via 10.0.2.2
cd apps/mobile && EXPO_PUBLIC_DOMAIN=http://10.0.2.2:8080 npx expo start --dev-client --port 8082

# Route the emulator's localhost to this machine (Metro + file storage), then open the app on Metro
adb reverse tcp:8082 tcp:8082 && adb reverse tcp:9000 tcp:9000
adb shell am start -a android.intent.action.VIEW -d "tabyan://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082" com.tabyan.app
```

Mobile tests: `cd apps/mobile && npx vitest run tests` — four files use `node:test`
(`ios-splash-lifecycle`, `native-recitation`, `native-recitation-closure`,
`native-welcome-layout`); run those with `npx tsx --test <file>`.

Stop the database: `.local-pg/bin/pg_ctl.exe -D .local-pg/data stop`

Tests: `npm test --workspace @workspace/tabyan`, `npm run test:parity`, `npm run test:integration`
(the API, tRPC and integration suites also need
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
