# Tabyan visual polish audit — 2026-09-24

VISUAL_POLISH_COMPLETED: PARTIAL

The shared visual pass and all requested build/type/test gates are complete. Full visual sign-off remains partial: native screens were inventoried and shared components inspected, but no simulator/device rendering was available; live authenticated, private-media, active-session, and every nested modal/data state were not exercised. No backend or database was started. Browser review used existing demo data and blocked API requests.

MOBILE_SCREENS_REVIEWED: focused source review of shared screens/headers/buttons/cards/navigation, student home, teacher home/fatwa sheet, admin frame/forms/picker; route inventory covers all 85 TSX files below. This is not a claim of individual device review for all 85 files.
WEB_SCREENS_REVIEWED: inventory of all 66 page files; automated Chromium coverage of 71 URLs, including guest/auth, student, teacher, supervisor and representative detail/error states. Representative screenshots were manually inspected.

SMOOTHNESS_IMPROVEMENTS: 120–160 ms UI-thread native press feedback; 160–200 ms web controls/drawers/entrances; reduced bounce and scale; static cards no longer lift; removed repeated card backdrop blur and shadow transitions; native scroll keyboard handling, drawer safe-area padding, scrolling admin picker and teacher sheet keyboard avoidance; web dialog focus management and drawer scroll locking.

Pass statuses below apply to the changed shared UI and inspected states, not exhaustive live-data/device certification.

| Check | Result | Evidence / limit |
|---|---|---|
| MOTION_SYSTEM | PASS | New native motion respects system reduction; Chromium reduced motion gives 0.00001s transitions and auto scroll. |
| DARK_MODE | PASS | Deeper warm burgundy; repaired native gold-on-gold teacher CTA and danger foreground. |
| LIGHT_MODE | PASS | Warm surfaces retained, muted burgundy hierarchy and darker gold text. |
| RTL | PASS | All measured pages use RTL; routes and direction unchanged. |
| RESPONSIVE | PASS | Fixed admin library overflow at 320/375 and settings at 320/375/390; final focused 80 renders have no horizontal page overflow. |
| TYPOGRAPHY | PASS | Requested existing font stacks retained; native button wrapping/line height improved. |
| BUTTONS | PASS | Native busy/disabled semantics, soft press feedback; larger web header/library action targets. |
| CARDS | PASS | Shared 18–20px system retained, 16px native padding, static/interactive distinction. |
| FORMS | PASS | Focus transitions, readable option surfaces, narrow settings fields, native picker scrolling. |
| MODALS | PASS | Browser focus entry/trap/return, typing focus retention, Escape and scroll restoration verified; native changes compile/export only. |
| NAVIGATION | PASS | Teacher/admin drawer open/close/scroll locking checked at 320px; selected link semantics and safe-area padding. |
| ADMIN_UI | PASS | Shared visual coverage, library action wrapping, settings fields, native picker. Mutations untouched. |
| MUSHAF_SURROUNDING_UI | PASS | Menu/controls/shared chrome inspected; Quran page geometry/content/QCF/zoom/source untouched. Full reader data rendering not exercised. |
| UI_PERFORMANCE_AUDIT | PARTIAL | Removed card blur/shadow animation and render-time rAF scheduling. No device FPS/profiling, no architecture refactor. |
| MOBILE_TYPESCRIPT | PASS | pnpm --filter @workspace/mobile typecheck |
| WEB_TYPESCRIPT | PASS | pnpm --filter @workspace/tabyan typecheck |
| WEB_TESTS | PASS | 9 test files, 71 tests; no visual/snapshot suite found. |
| WEB_BUILD | PASS | PORT=4173 BASE_PATH=/ pnpm --filter @workspace/tabyan build |
| METRO_IOS | PASS | CI=1 pnpm exec expo export --platform ios --output-dir /tmp/tabyan-polish-ios |
| METRO_ANDROID | PASS | CI=1 pnpm exec expo export --platform android --output-dir /tmp/tabyan-polish-android |
| GIT_DIFF_CHECK | PASS | git diff --check |

The build retains non-fatal existing Vite sourcemap/mixed import warnings. The initial completed browser sweep produced 1,136 measurements (71 URLs × 2 themes × 8 widths). Some early captures caught loading states. A longer settled-state rerun lost its Chromium connection near Mushaf; a fresh final run verified auth, student home, teacher home, admin library and admin settings with 80 nonempty renders and zero page overflow. No physical-device rendering is claimed.

Browser widths: 320, 375, 390, 430, 768, 1024, 1280, 1440. Evidence is local: `/tmp/tabyan-visual-review/results.json`, `final-results.json`, `interaction-results.json`, and PNG captures. Metro/build logs: `/tmp/tabyan-metro-ios.log`, `/tmp/tabyan-metro-android.log`, `/tmp/tabyan-web-build.log`. These temporary artifacts are not production assets.

BUSINESS_LOGIC_CHANGED: NO
AUTH_CHANGED: NO
DATABASE_CHANGED: NO
API_BEHAVIOR_CHANGED: NO
VIDEO_LOGIC_CHANGED: NO
PUBLISHING_CONFIG_CHANGED: NO
APP_IDENTITY_CHANGED: NO
PRE_EXISTING_USER_CHANGES_PRESERVED: YES

The five pre-existing dirty files are excluded from commits: `.replit`, `artifacts/mobile/app.json`, `artifacts/mobile/app/admin/users.tsx`, `artifacts/mobile/package.json`, `pnpm-lock.yaml`. During local validation the environment removed four `.replit` port blocks; their exact original content was restored, retaining the original one-line packages addition. All five files retain their initial diff line counts.

Protected media/cache/build/server files have no diff. HEAD was a0d884f; no history was reset or rewritten. No business callbacks, mutation arguments, validations, route destinations, role rules, religious copy, Quran content, or identity/build configuration were changed.

FILES_CHANGED / diff classification:

| File | Classification |
|---|---|
| `artifacts/mobile/app/admin/_common.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/mobile/app/student/(tabs)/home.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/mobile/app/teacher/fatwas.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/mobile/app/teacher/index.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/mobile/components/navigation-menu.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/mobile/components/soft-pressable.tsx` | MOTION, ACCESSIBILITY |
| `artifacts/mobile/components/ui.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/mobile/constants/tokens.json` | THEME |
| `artifacts/tabyan/src/components/app/AppHeader.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/tabyan/src/components/app/GlassCard.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/tabyan/src/components/app/Modal.tsx` | MOTION, ACCESSIBILITY, LAYOUT |
| `artifacts/tabyan/src/components/app/RoleSidebar.tsx` | MOTION, LAYOUT, SAFE_UI_PERFORMANCE |
| `artifacts/tabyan/src/components/app/StudentBottomNav.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/tabyan/src/components/app/StudentDrawer.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/tabyan/src/components/app/layouts/AdminShell.tsx` | VISUAL, LAYOUT, ACCESSIBILITY, MOTION |
| `artifacts/tabyan/src/index.css` | VISUAL, MOTION, RESPONSIVE, ACCESSIBILITY, SAFE_UI_PERFORMANCE |
| `artifacts/tabyan/src/pages/admin/AdminLibrary.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/tabyan/src/pages/admin/AdminSettings.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `artifacts/tabyan/src/pages/student/StudentHome.tsx` | VISUAL, LAYOUT, ACCESSIBILITY |
| `lib/design-tokens/tokens.json` | THEME |
| `docs/TABYAN_VISUAL_POLISH_2026-09-24.md` | VISUAL (review evidence) |

Web route inventory (automated browser coverage; a route can show a demo, loading, error, or unavailable-data state):

- guest: `/`
- guest: `/?auth=login` (same pathname, login modal open)
- guest: `/missing-page`
- student: `/student/home`
- student: `/student/placement`
- student: `/student/quran`
- student: `/student/tilawah`
- student: `/student/pending`
- student: `/student/path`
- student: `/student/levels/quran`
- student: `/student/sharia`
- student: `/student/sharia/aqeedah`
- student: `/student/sharia/level/1`
- student: `/student/sharia/exam/1`
- student: `/student/sharia/content/1`
- student: `/student/sharia/certificate/1`
- student: `/student/booking`
- student: `/student/schedule`
- student: `/student/recordings`
- student: `/student/library`
- student: `/student/library/book/1`
- student: `/student/fatwa`
- student: `/student/fatwas`
- student: `/student/notifications`
- student: `/student/notifications/settings`
- student: `/student/notifications/1`
- student: `/student/account`
- student: `/student/progress`
- student: `/student/ijazat`
- student: `/student/help`
- student: `/student/mushaf-fahd`
- student: `/student/recitation/history`
- student: `/student/recitation/connectivity-gate`
- student: `/student/prayer-times`
- student: `/student/qibla`
- teacher: `/teacher`
- teacher: `/teacher/onboarding`
- teacher: `/teacher/schedule`
- teacher: `/teacher/evaluate/1`
- teacher: `/teacher/evaluations`
- teacher: `/teacher/students`
- teacher: `/teacher/students/1`
- teacher: `/teacher/recordings`
- teacher: `/teacher/fatwas`
- teacher: `/teacher/notifications`
- teacher: `/teacher/notifications/settings`
- teacher: `/teacher/notifications/1`
- teacher: `/teacher/broadcast`
- teacher: `/teacher/settings`
- admin: `/admin`
- admin: `/admin/users`
- admin: `/admin/accounts`
- admin: `/admin/schedules`
- admin: `/admin/sessions-monitoring`
- admin: `/admin/library`
- admin: `/admin/qiraat`
- admin: `/admin/promotions`
- admin: `/admin/levels`
- admin: `/admin/sharia`
- admin: `/admin/teachers-review`
- admin: `/admin/students-review`
- admin: `/admin/fatwas`
- admin: `/admin/muftis`
- admin: `/admin/assessments`
- admin: `/admin/analytics`
- admin: `/admin/notifications`
- admin: `/admin/inbox`
- admin: `/admin/inbox/settings`
- admin: `/admin/inbox/1`
- admin: `/admin/audit-log`
- admin: `/admin/settings`

Native file inventory (source scan; focused review coverage stated above):

- `artifacts/mobile/app/(auth)/_layout.tsx`
- `artifacts/mobile/app/(auth)/login.tsx`
- `artifacts/mobile/app/(auth)/register.tsx`
- `artifacts/mobile/app/(auth)/teacher-register.tsx`
- `artifacts/mobile/app/_layout.tsx`
- `artifacts/mobile/app/admin/_common.tsx`
- `artifacts/mobile/app/admin/_layout.tsx`
- `artifacts/mobile/app/admin/accounts.tsx`
- `artifacts/mobile/app/admin/analytics.tsx`
- `artifacts/mobile/app/admin/assessments.tsx`
- `artifacts/mobile/app/admin/audit-log.tsx`
- `artifacts/mobile/app/admin/fatwas.tsx`
- `artifacts/mobile/app/admin/inbox/[id].tsx`
- `artifacts/mobile/app/admin/inbox/settings.tsx`
- `artifacts/mobile/app/admin/inbox.tsx`
- `artifacts/mobile/app/admin/index.tsx`
- `artifacts/mobile/app/admin/levels.tsx`
- `artifacts/mobile/app/admin/library.tsx`
- `artifacts/mobile/app/admin/muftis.tsx`
- `artifacts/mobile/app/admin/notifications.tsx`
- `artifacts/mobile/app/admin/promotions.tsx`
- `artifacts/mobile/app/admin/qiraat.tsx`
- `artifacts/mobile/app/admin/schedules.tsx`
- `artifacts/mobile/app/admin/session/[id].tsx`
- `artifacts/mobile/app/admin/sessions-monitoring.tsx`
- `artifacts/mobile/app/admin/settings.tsx`
- `artifacts/mobile/app/admin/sharia.tsx`
- `artifacts/mobile/app/admin/students-review.tsx`
- `artifacts/mobile/app/admin/teachers-review.tsx`
- `artifacts/mobile/app/admin/users.tsx`
- `artifacts/mobile/app/guest.tsx`
- `artifacts/mobile/app/index.tsx`
- `artifacts/mobile/app/student/(tabs)/_layout.tsx`
- `artifacts/mobile/app/student/(tabs)/account.tsx`
- `artifacts/mobile/app/student/(tabs)/fatwa.tsx`
- `artifacts/mobile/app/student/(tabs)/home.tsx`
- `artifacts/mobile/app/student/(tabs)/library.tsx`
- `artifacts/mobile/app/student/(tabs)/mushaf-fahd.tsx`
- `artifacts/mobile/app/student/(tabs)/recordings.tsx`
- `artifacts/mobile/app/student/(tabs)/schedule.tsx`
- `artifacts/mobile/app/student/_layout.tsx`
- `artifacts/mobile/app/student/_screen.tsx`
- `artifacts/mobile/app/student/booking.tsx`
- `artifacts/mobile/app/student/fatwa/[id].tsx`
- `artifacts/mobile/app/student/fatwas.tsx`
- `artifacts/mobile/app/student/help.tsx`
- `artifacts/mobile/app/student/ijazat.tsx`
- `artifacts/mobile/app/student/index.tsx`
- `artifacts/mobile/app/student/levels/[pathId].tsx`
- `artifacts/mobile/app/student/library/[id]/read.tsx`
- `artifacts/mobile/app/student/library/[id].tsx`
- `artifacts/mobile/app/student/notifications/[id].tsx`
- `artifacts/mobile/app/student/notifications/settings.tsx`
- `artifacts/mobile/app/student/notifications.tsx`
- `artifacts/mobile/app/student/placement.tsx`
- `artifacts/mobile/app/student/prayer-times.tsx`
- `artifacts/mobile/app/student/progress.tsx`
- `artifacts/mobile/app/student/qibla.tsx`
- `artifacts/mobile/app/student/quran.tsx`
- `artifacts/mobile/app/student/session/[id].tsx`
- `artifacts/mobile/app/student/settings.tsx`
- `artifacts/mobile/app/student/sharia/[subject]/[level].tsx`
- `artifacts/mobile/app/student/sharia/[subject]/certificate.tsx`
- `artifacts/mobile/app/student/sharia/[subject]/content.tsx`
- `artifacts/mobile/app/student/sharia/[subject]/exam.tsx`
- `artifacts/mobile/app/student/sharia/[subject].tsx`
- `artifacts/mobile/app/student/sharia.tsx`
- `artifacts/mobile/app/student/tilawah.tsx`
- `artifacts/mobile/app/teacher/_components.tsx`
- `artifacts/mobile/app/teacher/_layout.tsx`
- `artifacts/mobile/app/teacher/broadcast.tsx`
- `artifacts/mobile/app/teacher/evaluate/[sessionId].tsx`
- `artifacts/mobile/app/teacher/evaluations.tsx`
- `artifacts/mobile/app/teacher/fatwas.tsx`
- `artifacts/mobile/app/teacher/index.tsx`
- `artifacts/mobile/app/teacher/notifications/[id].tsx`
- `artifacts/mobile/app/teacher/notifications/settings.tsx`
- `artifacts/mobile/app/teacher/notifications.tsx`
- `artifacts/mobile/app/teacher/onboarding.tsx`
- `artifacts/mobile/app/teacher/recordings.tsx`
- `artifacts/mobile/app/teacher/schedule.tsx`
- `artifacts/mobile/app/teacher/session/[id].tsx`
- `artifacts/mobile/app/teacher/settings.tsx`
- `artifacts/mobile/app/teacher/students/[id].tsx`
- `artifacts/mobile/app/teacher/students.tsx`

COMMITS_CREATED: grouped theme, mobile, web and audit commits; see git log.
PUSH_PERFORMED: NO
DEPLOY_STARTED: NO
PUBLISH_STARTED: NO
FINAL_STATUS: PARTIAL
