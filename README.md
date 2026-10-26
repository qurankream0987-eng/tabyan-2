# Tabyan

Quran learning platform: web app, mobile app (Expo), and API, in one npm workspace.

| Path | What it is |
|---|---|
| `apps/web` | Web app (React + Vite) |
| `apps/mobile` | Mobile app (Expo / React Native) |
| `apps/api` | API server (Express + tRPC, WebSocket recitation) |
| `apps/staff-preview` | Staff preview web app |
| `packages/db` | PostgreSQL schema and access (Drizzle) |
| `packages/trpc` | API procedures (tRPC routers) |
| `packages/domain` | Shared product/domain content |
| `packages/design-tokens` | Shared colors and design tokens |
| `tools/scripts` | Verification and asset scripts |
| `tools/benchmarks` | Recitation provider benchmark (web + API code) |
| `tests/parity` | Cross-app checks: web/mobile parity, shared domain rules (`npm run test:parity`) |
| `tests/integration` | Web client against API server in one process (`npm run test:integration`) |
| `docs` | Living docs; old reports are in `docs/archive` |

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the empty values.
3. `npm run dev` starts the database, file storage, API and web app (`npm run dev:mobile` adds Metro).
   Details and manual steps: [LOCAL_DEV.md](LOCAL_DEV.md).
4. Before committing: `npm run typecheck` and `npm run lint`.

Production still runs on Replit; the move to Railway is planned in
[docs/TABYAN_REPLIT_EXIT_MIGRATION_PLAN.md](docs/TABYAN_REPLIT_EXIT_MIGRATION_PLAN.md).
For a full tour of the code, start with
[docs/TABYAN_DEVELOPER_HANDOFF.md](docs/TABYAN_DEVELOPER_HANDOFF.md).
