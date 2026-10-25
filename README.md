# Tabyan

Quran learning platform: web app, mobile app (Expo), and API, in one npm workspace.

| Path | What it is |
|---|---|
| `artifacts/tabyan` | Web app (React + Vite) |
| `artifacts/mobile` | Mobile app (Expo / React Native) |
| `artifacts/api-server` | API server (Express + tRPC, WebSocket recitation) |
| `artifacts/tabyan-staff-preview` | Staff preview web app |
| `artifacts/mockup-sandbox` | Design mockup sandbox (not product) |
| `lib/db` | PostgreSQL schema and access (Drizzle) |
| `lib/tabyan-trpc` | API procedures (tRPC routers) |
| `lib/tabyan-domain` | Shared product/domain content |
| `verification/scripts` | Verification and asset scripts |
| `docs` | Living docs; old reports are in `docs/archive` |

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the empty values.
3. Follow [LOCAL_DEV.md](LOCAL_DEV.md) to start the database, file storage, API and web app.

Production still runs on Replit; the move to Railway is planned in
[docs/TABYAN_REPLIT_EXIT_MIGRATION_PLAN.md](docs/TABYAN_REPLIT_EXIT_MIGRATION_PLAN.md).
For a full tour of the code, start with
[docs/TABYAN_DEVELOPER_HANDOFF.md](docs/TABYAN_DEVELOPER_HANDOFF.md).
