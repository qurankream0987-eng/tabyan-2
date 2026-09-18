---
name: Tabyan admin panel restoration rules
description: Admin panel CSS must be scoped under .admin-shell; restoration is phase-based with user approval per phase; protected-logic list must never be touched.
---

# Tabyan admin panel restoration rules

The supervision panel (لوحة الإشراف) is being restored in user-approved phases.

- **Scoped namespace:** all admin-panel-only styling lives under `.admin-shell` selectors at the end of `artifacts/tabyan/src/index.css`. `AdminShell.tsx` uses semantic classes (`admin-sidebar`, `admin-nav-item`, `admin-user-badge`, …). Never add admin styles as global/unscoped rules.
- **Phase-based execution:** the user approves each phase separately via an uploaded instructions file. Phase 1 (shell + CSS foundation) and the approved existing-admin-actions phase are separate; do not infer approval for later product expansion.
- **Protected logic — never touch:** trpc routers, DB schema, authStore, business logic, demo data files (`src/lib/demo/*`), Mushaf/QCF, page content/texts, routes, CRUD logic. Known backend bugs to leave alone until a dedicated phase: `admin.sessionsList` ignores status/teacherId filters; `admin.fatwaReviewAnswer` notifies questionId instead of studentId; mass notifications loop without transaction.

**Why:** the user demanded zero risk to data/logic and explicitly required stopping if a UI fix needs backend changes.

**How to apply:** any future admin-panel UI work goes into the `.admin-shell` section; any discovered backend bug gets documented and reported, not fixed silently.

For native Admin action work, Web is the contract source: map each exposed destination to its Web query/mutations before editing Mobile, and treat read-only Web pages as complete read-only destinations rather than inventing actions.

**Why:** The native generic-list count can differ from the product destination count because some Admin destinations are already bespoke (for example accounts and notifications), while the actual server contracts remain shared.

**How to apply:** preserve the existing backend contracts and report the exact destination count plus remaining gaps in the phase handoff.
