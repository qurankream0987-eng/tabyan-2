---
name: Tabyan uploaded project study
description: Context on the "Tabyan" Quran-learning app the user uploaded as 10 zip parts, and the instruction to wait for an explicit signal before acting on it.
---

## What it is
- User uploaded `attached_assets/Unified-Integration-Part-1.zip` … `Part-10.zip`: a full backup/export of a previous Replit project called **Tabyan (تبيان)** — a free Arabic RTL Quran/Islamic-learning platform with Student/Teacher/Admin roles.
- It is a pnpm monorepo built on the same Replit template as this workspace (artifacts/, lib/, scripts/), so it's an export of a sibling project, not a from-scratch app.
- Stack: Express 5 + tRPC backend (`lib/tabyan-trpc`, mounted at `/api/trpc`), Postgres + Drizzle (`lib/db`, ~25+ tables), custom token auth (no OAuth, OTP for student/teacher, master-password + bcrypt for admin), React/Vite frontend (`artifacts/tabyan`, 288 files incl. prebuilt `dist/`), plus `artifacts/api-server` and `artifacts/mockup-sandbox`.
- Extensive reference docs live in `attached_assets/backup_design/`: `study/MASTER_SRS.md` (master requirements spec, Arabic), `backend_ref/BACKEND_SPEC.md` + `schema.ts`, `plan.md` (a prior "round 4" polish/rebrand request list), `info.md` (consolidated screen/design reference), a `.agents/memory/`-style Do-Not-Touch list from the original project (backend/DB/complex components are off-limits; treat as UI-polish-only unless a backend change is proven necessary), and 44 UI evolution screenshots.
- Demo credentials noted in backend spec: student `0511111111`, teacher `0500000010`, admin master password `Tabyan@2026`.

## Current status / instruction
- The user explicitly and repeatedly said: study deeply first, take **no action whatsoever** (no code changes, no artifact creation, no running anything) until they give an explicit go-ahead signal.
- As of the last session, a full read-only study was completed (schema, all tRPC routers, memory/spec docs, screen inventory, design system) and extracted to `/tmp/study/extract/` (ephemeral — re-extract from `attached_assets/*.zip` if gone).
- **Why this matters:** if this conversation is compacted again before the user gives the signal, do not restart the deep study from scratch — this file plus the extracted zips are enough context. Resume by asking the user for the signal and what "run/develop it" should concretely mean (resume as-is vs. migrate into this workspace's current stack/conventions).
