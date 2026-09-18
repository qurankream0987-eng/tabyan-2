# Tabyan Mobile V2 — Web Source-of-Truth Inventory

## Scope

هذا الجرد قراءة فقط لمشروع Web الحالي، ويُستخدم كمرجع لبناء تطبيق React Native/Expo Native جديد. لم تتم إعادة استخدام واجهات Web داخل Native عبر WebView أو DOM.

## Exact counts

| Item | Count | Source |
|---|---:|---|
| Route elements | 82 | `artifacts/tabyan/src/App.tsx` |
| Routes with paths | 76 | `artifacts/tabyan/src/App.tsx` |
| Page files | 66 | `artifacts/tabyan/src/pages` |
| Reusable components | 122 | `artifacts/tabyan/src/components` |
| Main route layouts | 4 | `artifacts/tabyan/src/components/app/layouts` |
| tRPC namespaces | 10 | `lib/tabyan-trpc/src/router.ts` |
| Approximate tRPC procedures | 191 | `lib/tabyan-trpc/src/routers` |

## Web routes

### Public

- `/` — guest landing page.
- `*` — not-found.

### Student

- `/student`, `/student/home`
- `/student/placement`
- `/student/quran`, `/student/tilawah`, `/student/pending`
- `/student/path`, `/student/levels/:pathId`
- `/student/sharia`, `/student/sharia/:subject`
- `/student/sharia/level/:levelId`
- `/student/sharia/exam/:levelId`
- `/student/sharia/content/:contentId`
- `/student/sharia/certificate/:levelId`
- `/student/booking`, `/student/schedule`, `/student/session/:id`
- `/student/recordings`
- `/student/library`, `/student/library/book/:id`, `/student/library/book/:id/read`
- `/student/fatwa`, `/student/fatwa/:id`, `/student/fatwas`
- `/student/notifications`, `/student/notifications/settings`, `/student/notifications/:id`
- `/student/account`, `/student/progress`, `/student/ijazat`, `/student/help`
- `/student/mushaf-fahd`
- `/student/recitation/history`, `/student/recitation/connectivity-gate`
- `/student/prayer-times`, `/student/qibla`

### Teacher

- `/teacher/onboarding`
- `/teacher`, `/teacher/schedule`, `/teacher/session/:id`
- `/teacher/evaluate/:sessionId`, `/teacher/evaluations`
- `/teacher/students`, `/teacher/students/:id`
- `/teacher/recordings`, `/teacher/fatwas`
- `/teacher/notifications`, `/teacher/notifications/settings`, `/teacher/notifications/:id`
- `/teacher/broadcast`, `/teacher/settings`

### Supervisor/Admin

- `/admin`, `/admin/session/:id`
- `/admin/users`, `/admin/accounts`
- `/admin/schedules`, `/admin/sessions-monitoring`
- `/admin/library`, `/admin/qiraat`, `/admin/promotions`, `/admin/levels`
- `/admin/sharia`, `/admin/teachers-review`, `/admin/students-review`
- `/admin/fatwas`, `/admin/muftis`, `/admin/assessments`, `/admin/analytics`
- `/admin/notifications`, `/admin/inbox`, `/admin/inbox/settings`, `/admin/inbox/:id`
- `/admin/audit-log`, `/admin/settings`

## Navigation and role flows

### Student

- Seven bottom tabs: home, schedule, recordings, library, fatwa, mushaf, account.
- Drawer: account, schedule, progress, recordings, library, fatwa, ijazat, notifications, help.
- Auth: phone/profile registration, password login, Google ticket flow, optional Passkey/WebAuthn, logout, account deletion.
- Main learning flow: dashboard → path → levels → enrollment/progress → promotion/ijazat.
- Halaqa flow: teachers → booking → schedule/session room → recording.
- Recitation flow: connectivity gate → general/educational session → pause/resume/end/cancel → history.

### Teacher

- Dashboard, KYC/onboarding, schedules, session room, evaluations, students, recordings, fatwas, broadcasts, notifications, settings.
- Approved-teacher guard is required for operational features.

### Admin

- Dashboard/KPIs, user/account management, schedule/session monitoring, placement/KYC review.
- Levels, library, qiraat, sharia CMS, assessments, fatwa/mufti administration.
- Notifications, daily verse, audit log, settings/security.
- Admin screens are mobile-friendly operational surfaces, not a copied desktop sidebar.

## Feature inventory

| Feature | Native scope | Data/contract |
|---|---|---|
| Auth | All role login, registration, session persistence, logout, deletion | `auth.*` |
| Student home | Greeting, daily verse, progress, cards, next session, alerts | `student.dashboard`, `student.settings`, `dailyVerse.today` |
| Tracks | Quran, tilawah/correction, tajweed, sharia, qiraat as exposed by Web | `student.paths`, `student.levels` |
| Placement | Camera/video recording, preview, retry, upload, finalize, review state | `student.placementStatus`, `student.submitPlacement`, storage contract |
| Quran levels | Five current Quran level families and requirements | `student.levels`, progress/promotion |
| Tajweed | Four current tajweed levels, enrollment, progress, assessment relationships | student/content/library contracts |
| Sharia | Subjects, levels, content, progress, bookmarks, exam, certificate | `sharia.*` |
| Sharia exam | Server questions, server submission/scoring, attempt persistence | `sharia.exam`, `sharia.submitExam` |
| Library | Browse/filter/detail/read/bookmark/download and external content | `library.*`, object/external URLs |
| Mushaf | 604-page native QCF reader, bookmarks, last page, search, zoom/pan | local QCF assets; no tRPC |
| Recitation | Native microphone/session lifecycle and server WebSocket | `recitation.*`, `/api/ws/recitation` |
| Halaqa | Teachers, bookings, schedules, session room, changes, recordings | `student.*`, `teacher.*`, session WebSocket |
| Notifications | List/detail/read/pin/remove/settings | `notifications.*`, `student.*` |
| Fatwa | Ask, attachments, follow-up, details, rating, public browse | `fatwa.*` |
| Prayer | Location permission, fallback, Aladhan calculation/source, next prayer | local/external API |
| Qibla | Location, compass heading, bearing, calibration, lifecycle cleanup | native sensor/location |
| Account | Profile, settings, dark/light, notification preferences, logout/delete | `auth.me`, `student/teacher.settings` |
| Teacher app | KYC, students, schedule, evaluations, recordings, messages, fatwa, broadcast | `teacher.*`, `recitation.studentSessions` |
| Admin app | Mobile operational equivalents of current admin workflows | `admin.*`, shared contracts |

## API namespaces

- `ping`
- `auth`
- `student`
- `teacher`
- `admin`
- `fatwa`
- `library`
- `notifications`
- `sharia`
- `dailyVerse`
- `recitation`

The Web uses tRPC directly through `providers/trpc.tsx` with `/api/trpc`, `superjson`, and Bearer token authorization. Native must use the shared client contract and must not create a fake backend.

## Native data rules

- Secure token storage only; never use `localStorage` on Native.
- `401`/`403` must be handled per operation and must not cause silent retry loops.
- Server remains authoritative for score, exam result, role, permissions, promotion, recording readiness, and recitation policy.
- Uploads must preserve `/objects/<key>` contracts and use a real storage/presigned URL path.
- Recording playback must require a ready, non-deleted recording; never assume an uploading/legacy URL works.
- Demo fixtures are not production data; every missing data case must render a truthful empty/error state.

## Design tokens

### Brand

- Burgundy: `#800020`
- Burgundy light: `#A02040`
- Maroon: `#4C091B`
- Deep maroon: `#360512`
- Gold: `#D4AF37`
- Gold light: `#F1D27A`
- Gold dark: `#B8860B`
- Cream: `#F5EFE0`
- Night: `#2B0D12`

### Semantic themes

- Light background: `#FAF7F0`; light card: `#FFFCF5`; light text: burgundy.
- Dark background: `#4C091B`; dark card: `#42121F`; dark text: cream; accent: gold.
- Spacing: 4, 8, 12, 16, 20, 24.
- Radius: 16px inputs, 20–22px cards, fully rounded controls.
- Minimum touch target: 44px.
- Arabic RTL throughout, with LTR only for technical/external values.

### Typography and icons

- Interface: IBM Plex Sans Arabic, weights 400/500/600/700.
- Quran: Amiri/Amiri Quran as required by the QCF renderer.
- Icon language: named outline icons, 20–24px, 1.8px stroke; no emoji substitutes.
- Header: blurred/gradient surface, menu, title, theme toggle, notifications, auth action.
- Student navigation: compact glass bottom bar with gold active marker.

## Asset inventory

- `artifacts/tabyan/public/mushaf/pages`: 604 page JSON files.
- `artifacts/tabyan/public/mushaf/fonts`: 604 page-specific QCF2 WOFF2 fonts.
- Logos: `logo.png`, `logo-light.png`, `logo-dark.png`, `logo-transparent.png`, `logo-splash.png`.
- Mushaf uses vector/QCF data, not screenshots.
- Mushaf paper remains cream in dark mode; recitation highlighting changes opacity/layout state, not DOM presence.

## Known current-Web limitations to preserve truthfully

- Web routing does not have a universal ProtectedRoute; Native must add role-safe route gating rather than reproduce that gap.
- WebAuthn server contracts exist but Native support requires a compatible native implementation; do not fake biometric success.
- Recitation Phase 1A persists lifecycle/timing and matching contracts, but does not claim AI accuracy when the server feature flags are unavailable.
- Native Push must not be presented as delivered unless a real provider/token contract exists.
