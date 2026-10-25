# Supervision (لوحة الإشراف) UX rebuild — Web + Native

Phase scope: supervision UI only. No tRPC router, DB schema, auth, Railway, Nabr, Smart Mushaf or AI changes.
Server authorization is unchanged: every supervision mutation still goes through `adminProcedure`.

## Interaction rules (enforced by tests)

| Situation | Web | Native |
|---|---|---|
| Simple create / edit | `AdminModal` (bottom-anchored on phones) | `AdminSheet` |
| Long form / details | `AdminDrawer` | `AdminSheet fullScreen` |
| Save / Cancel | `StickyFormFooter` (always visible) | sticky sheet footer above keyboard + home indicator |
| Close an edited form | «تجاهل التعديلات؟» guard, none if unchanged | same |
| Destructive action | `ConfirmDialog`: item name + impact, optional typed «حذف» | `ConfirmAction`: item name + impact |
| More row actions | `ActionMenu` (Radix, RTL) | `MobileActionSheet` |
| Feedback | toast (now above dialogs) | `useAdminFeedback` snackbar |
| Loading | `ListSkeleton`, per-row `pendingId`, button-level spinners | same |
| Primary action reachable at any depth | sticky `AdminFilterBar` with action slot | `HeaderAction` in the screen header |
| Search + filters | inline selects (≥ 640px), filter sheet on phones, «مسح الفلاتر» + count | `AdminSearchBar` + `FilterSheet` + `ActiveFilters` |
| Touch size | px-based 44px controls (root font is 14px on phones) | 44pt icon actions, 48pt buttons |

Primitives: `artifacts/tabyan/src/components/admin/AdminUi.tsx`, `artifacts/mobile/components/admin-ui.tsx`.

iOS note: a Native modal shown while another is presented is rendered inside that modal's children; replacing one sheet with another goes through `useSheetChain` (waits for dismissal).

## Books (acceptance module)

Both platforms use `@workspace/tabyan-domain/admin-library` for options, validation, payloads, filters and copy, so behaviour cannot drift. Bugs fixed on Native while moving to the shared contract:
- category `other` (rejected by the server) offered; `quran`/`fatwa`/`hadith` missing
- uploaded PDF never set `fileObjectKey` → server rejected uploaded books
- «نشر» on a hidden book called `librarySetStatus('published')`, which the server only allows from `archived`
- status and levels not editable; edit form appended below the list

## Parity — actions per module

| Module | Web actions | Native actions | Status |
|---|---|---|---|
| Home | urgent queue (sorted), KPIs, shortcuts, active admins | same | MATCHED |
| Books | list, search, 4 filters, add, edit, view, archive/restore, delete, upload PDF/media/cover | same | MATCHED |
| Levels | add, edit, enable/disable, show/hide, reorder, delete | same | MATCHED |
| Sharia | subjects add/edit/delete (key locked after create), level reorder, circle booking toggle | same | MATCHED |
| Accounts | create teacher/supervisor, reset password, suspend/activate, end sessions | same | MATCHED |
| Users | file, message, warn, ban, soft-delete teacher, delete student | same | MATCHED |
| Schedules | create, activate/deactivate, open/close booking, delete, cancel booking | same (Web gained the two toggles) | MATCHED |
| Assessments | create, add question (assessment or bank), copy bank question, results, activate/deactivate | same (Web gained copy + Native validation rules) | MATCHED |
| Fatwas | search, priority/category/mufti filters, assign/reassign, review (public/private/reject), reject question, change category | same (Web gained filters; reject reason min aligned to server: 5) | MATCHED |
| Muftis | assign, unassign (now confirmed) | same | MATCHED |
| Promotions | pending + review history, approve/reject with confirmation | same (Native now uses `promotionsList`) | MATCHED |
| Qiraat / Students review / Teachers review | review drawer, specific approve/reject confirmations | review sheet, specific confirmations | MATCHED |
| Settings | edit setting, change master password (confirmed), daily verse | same | MATCHED |

## Verification

- `pnpm --filter @workspace/tabyan run test` — includes `src/lib/admin-library.test.ts` (shared contract vs server enums) and `src/pages/admin/supervision-ux.test.ts`.
- Native: `artifacts/mobile/tests/supervision-ux.test.ts` (vitest).
- Browser: `node artifacts/tabyan/scripts/supervision-browser-check.mjs --base http://127.0.0.1:<port>` (Books acceptance A–E at 5 viewports) and `--sweep` (every supervision route: exceptions, overflow, ≥ 40px controls).
- Not verified here: Native on physical devices / simulators (no iOS/Android runtime in this environment).
