# TABYAN — STEP 1: PRECISE WEBSITE ↔ MOBILE VISUAL COMPARISON

**Date:** 2026-09-08 (Asia/Riyadh)  
**Scope:** comparison only; no application files changed, no Build 6 started.  
**Website evidence:** current rendered `https://tibyanquran.com` screenshot.  
**Mobile evidence:** current rendered Expo Mobile screenshot at 402×874.  
**Important limitation:** the captured states are not equivalent: Web is on the splash/opening state, while Mobile is on the student login state. Differences that depend on matching the same route/state are therefore marked as partial rather than treated as confirmed defects.

## Step 2 — Matching-state comparison status

```text
MATCHED_STATE_COMPARISON_DONE: PARTIAL

MATCHED_SPLASH_COMPARE: PARTIAL
MATCHED_LOGIN_COMPARE: PARTIAL
MATCHED_REGISTER_COMPARE: PARTIAL
MATCHED_HOME_COMPARE: PARTIAL

CONFIRMED_VISUAL_GAPS: NONE
P0_COUNT: 0
P1_COUNT: 0
P2_COUNT: 0
NATIVE_DIFFERENCES_COUNT: 0

READY_FOR_TARGETED_FIXES: NO
CODE_CHANGED: NO
BUILD_STARTED: NO
```

### Matching-state evidence

#### STATE: Web Splash ↔ Mobile Splash

```text
WEB_CAPTURED: YES
MOBILE_CAPTURED: NO
LOGO_PARITY: PARTIAL
LAYOUT_PARITY: PARTIAL
COLOR_PARITY: PARTIAL
TYPOGRAPHY_PARITY: PARTIAL
SPACING_PARITY: PARTIAL
```

**EXACT_DIFFERENCES:** No confirmed visual difference. Web direct-route captures showed the Splash state; Mobile transitioned to Login before capture, so Mobile Splash evidence is missing.

#### STATE: Web Login ↔ Mobile Login

```text
WEB_CAPTURED: NO
MOBILE_CAPTURED: YES
LOGO_PARITY: PARTIAL
LAYOUT_PARITY: PARTIAL
COLOR_PARITY: PARTIAL
TYPOGRAPHY_PARITY: PARTIAL
SPACING_PARITY: PARTIAL
```

**EXACT_DIFFERENCES:** No confirmed visual difference. The Web `/login` capture remained on Splash; Mobile `/login` showed the Login screen.

#### STATE: Web Register ↔ Mobile Register

```text
WEB_CAPTURED: NO
MOBILE_CAPTURED: YES
LOGO_PARITY: PARTIAL
LAYOUT_PARITY: PARTIAL
COLOR_PARITY: PARTIAL
TYPOGRAPHY_PARITY: PARTIAL
SPACING_PARITY: PARTIAL
```

**EXACT_DIFFERENCES:** No confirmed visual difference. The Web `/register` capture remained on Splash; Mobile `/register` showed the first registration step.

#### STATE: Web Student Home ↔ Mobile Student Home

```text
WEB_CAPTURED: NO
MOBILE_CAPTURED: YES
LOGO_PARITY: PARTIAL
LAYOUT_PARITY: PARTIAL
COLOR_PARITY: PARTIAL
TYPOGRAPHY_PARITY: PARTIAL
SPACING_PARITY: PARTIAL
```

**EXACT_DIFFERENCES:** No confirmed visual difference. The Web `/student` capture remained on Splash; the Web root capture showed Guest Home rather than Student Home; Mobile `/student` showed Student Home.

**State rule:** A Splash-versus-Login, Splash-versus-Register, or Splash-versus-Student-Home capture is not counted as a visual difference.

## Deep Web → Mobile source-of-truth audit

This section is the latest source-based audit. Web remains the source of truth. Visual parity is not marked `PASS` where exact rendered equivalence cannot be proven from current source and evidence. Mushaf/QCF is intentionally excluded.

```text
WEB_SOURCE_FULLY_INSPECTED: YES
MOBILE_SOURCE_FULLY_INSPECTED: YES
SCREEN_MAPPING_COMPLETE: YES (22/22 relationships accounted for)

SAME_WEB_LOGO_USED_IN_MOBILE: NO
GLOBAL_DESIGN_PARITY: PARTIAL
CONTENT_PARITY: PARTIAL
STRUCTURE_PARITY: PARTIAL
VISUAL_PARITY: PARTIAL
LIGHT_MODE_PARITY: PARTIAL
DARK_MODE_PARITY: PARTIAL
RTL_PARITY: PASS

MOBILE_ONLY_UI_COUNT: 5 categories
WEB_ELEMENTS_MISSING_IN_MOBILE_COUNT: 5 confirmed groups

P0_COUNT: 3
P1_COUNT: 4
P2_COUNT: 3
NATIVE_COUNT: 5

READY_FOR_IMPLEMENTATION: NO
CODE_CHANGED: NO
BUILD_STARTED: NO
```

### Mapping closure — final 3 relationships

```text
MAPPED_COUNT: 22/22
UNMAPPED_SCREENS: NONE
MISSING_IN_MOBILE: Guest Home; Branded Splash; Notification Detail
```

#### SCREEN_NAME: Guest Home

```text
WEB_FILE: artifacts/tabyan/src/pages/GuestHome.tsx
WEB_COMPONENT: GuestHome
MOBILE_FILE: artifacts/mobile/app/index.tsx
MOBILE_COMPONENT: Index / Redirect
MAPPING_STATUS: MISSING_IN_MOBILE
```

The Mobile entry file redirects unauthenticated users to `/login`; it is not a Guest Home equivalent.

#### SCREEN_NAME: Branded Splash

```text
WEB_FILE: artifacts/tabyan/src/components/app/SplashScreen.tsx
WEB_COMPONENT: SplashScreen
MOBILE_FILE: artifacts/mobile/app/_layout.tsx
MOBILE_COMPONENT: RootLayout / Expo SplashScreen lifecycle
MAPPING_STATUS: MISSING_IN_MOBILE
```

The Mobile file provides the platform splash lifecycle only; it does not provide the Web branded SplashScreen component.

#### SCREEN_NAME: Notification Detail

```text
WEB_FILE: artifacts/tabyan/src/pages/shared/NotificationDetails.tsx
WEB_COMPONENT: NotificationDetails
MOBILE_FILE: NO MATCHING MOBILE FILE OR ROUTE
MOBILE_COMPONENT: NONE
MAPPING_STATUS: MISSING_IN_MOBILE
```

The Web detail route exists for student, teacher, and admin; no Mobile notification detail route is mapped.

### Screen source mapping

| Screen | Web source of truth | Mobile source | Main Web components | Main Mobile components | Mapping status |
|---|---|---|---|---|
| Guest | `artifacts/tabyan/src/pages/GuestHome.tsx` | No equivalent; `artifacts/mobile/app/index.tsx:5-11` redirects to Login | `AppHeader`, `GlassCard`, `StudentRegisterFlow`, `TeacherRegisterFlow`, `Modal` | None | MISSING_IN_MOBILE |
| Splash | `artifacts/tabyan/src/components/app/SplashScreen.tsx`, `SplashScreen.css`; mounted by `artifacts/tabyan/src/App.tsx:89-116` | Native lifecycle in `artifacts/mobile/app/_layout.tsx:8,15,40-46`; no branded component | `SplashScreen` with `/logo-splash.png`, animated text/dots/loader | Expo `SplashScreen`, `StatusBar`, `SafeAreaProvider` | MISSING_IN_MOBILE |
| Login | `artifacts/tabyan/src/components/app/StudentRegisterFlow.tsx:129,159-176,532-546` | `artifacts/mobile/app/(auth)/login.tsx:1-8,55-122` | `Modal`, `PrimaryButton`, `Icon`, `PhoneField` | `Screen`, `Card`, `Button`, `Icon` |
| Register | `StudentRegisterFlow.tsx` and `TeacherRegisterFlow.tsx`; opened by `GuestHome.tsx:389-394` | `artifacts/mobile/app/(auth)/register.tsx:39-97,142-438` | modal multi-step flow, `PhoneField`, `OtpInput`, buttons | `StepHeader`, `ChoiceCard`, `CountryPicker`, `Card`, `Button` |
| Student Home | `artifacts/tabyan/src/pages/student/StudentHome.tsx` | `artifacts/mobile/app/student/(tabs)/home.tsx` | `StudentShell`, `AppHeader`, `StudentBottomNav`, `GlassCard`, `SectionIcon` | `Screen`, `Card`, `ProgressBar`, `SectionIcon`, state components |
| Quran Tracks | `artifacts/tabyan/src/pages/student/PathSelection.tsx`, `QuranMenu.tsx` | `artifacts/mobile/app/student/quran.tsx`; levels at `student/levels/[pathId].tsx` | path cards and `SectionIcon` | `Screen`, `Card`, `SectionIcon`, `FeatureTile` |
| Quran Levels | `artifacts/tabyan/src/pages/student/Levels.tsx` | `artifacts/mobile/app/student/levels/[pathId].tsx` | `StudentShell`, `GlassCard`, `SectionIcon` | `Screen`, `Card`, `SectionIcon`, `Button` |
| Tajweed | `artifacts/tabyan/src/pages/student/Tilawah.tsx` | `artifacts/mobile/app/student/tilawah.tsx` | student shell, cards, booking CTA | native screen, cards, buttons, recitation controls |
| Sharia | `ShariaSubjects.tsx`, `ShariaLevel.tsx`, `ShariaExam.tsx`, `ShariaViewer.tsx` | `artifacts/mobile/app/student/sharia.tsx`, `sharia/[subject].tsx`, `sharia/[subject]/[level].tsx`, `content.tsx`, `exam.tsx` | student shell, cards, subject/level content | native screens, cards, buttons, lists |
| Placement | `artifacts/tabyan/src/pages/student/Placement.tsx` | `artifacts/mobile/app/student/placement.tsx` | placement cards, recorder, progress and result states | `Screen`, `Card`, `Button`, camera/recording states |
| Booking | `artifacts/tabyan/src/pages/student/Booking.tsx` | `artifacts/mobile/app/student/booking.tsx` | booking cards, modal confirmation/success | `Screen`, `Card`, `Button`, native confirmation |
| Student Schedule | `artifacts/tabyan/src/pages/student/StudentSchedule.tsx` | `artifacts/mobile/app/student/(tabs)/schedule.tsx` | `GlassCard`, `StatusBadge`, empty state | `Screen`, `Card`, `Badge`, `Button`, empty state |
| Notifications | `artifacts/tabyan/src/pages/shared/Notifications.tsx`; routes `App.tsx:146,174,206` | `student/notifications.tsx`, `teacher/notifications.tsx`, `admin/notifications.tsx` | `AppHeader`, `GlassCard`, `StatusBadge`, `Icon` | `Screen`, `Header`, `Card`, `Badge`, `Icon`, loading/error |
| Notification Detail | `artifacts/tabyan/src/pages/shared/NotificationDetails.tsx`; routes `App.tsx:148,176,208` | No matching Mobile `[id]` route/file | `AppHeader`, `GlassCard`, `StatusBadge`, `InfoRow` | None | MISSING_IN_MOBILE |
| Library | `artifacts/tabyan/src/pages/student/Library.tsx`, `BookDetails.tsx`; routes `App.tsx:140-142` | `student/(tabs)/library.tsx`, `student/library.tsx`, `student/library/[id].tsx`, `student/library/[id]/read.tsx` | `GlassCard`, `AudioPlayerBar`, `Icon` | `Screen`, `Card`, `FeatureTile`, `Header`, `Icon` |
| Account | `artifacts/tabyan/src/pages/student/StudentAccount.tsx`; route `App.tsx:149` | `artifacts/mobile/app/student/(tabs)/account.tsx` | `AppHeader`, `GlassCard`, `Modal`, `PrimaryButton` | `Screen`, `Card`, `Button`, `Header` |
| Teacher Home | `artifacts/tabyan/src/pages/teacher/TeacherHome.tsx`; routes `App.tsx:165-167` | `artifacts/mobile/app/teacher/index.tsx` | `GlassCard`, `CountdownChip`, `StatusBadge`, `Icon` | `TeacherScreen`, `Card`, `Icon`, `Pressable` |
| Teacher Students | `MyStudents.tsx`, `StudentProfile.tsx`; routes `App.tsx:170-171` | `teacher/students.tsx`, `teacher/students/[id].tsx` | `GlassCard`, `EmptyState`, `StatusBadge`, `Icon` | `TeacherScreen`, `Card`, `Badge`, `Button`, `EmptyState` |
| Teacher Schedule | `artifacts/tabyan/src/pages/teacher/TeacherSchedule.tsx`; route `App.tsx:167` | `artifacts/mobile/app/teacher/schedule.tsx` | `GlassCard`, `StatusBadge`, `EmptyState`, `Icon` | `TeacherScreen`, `Card`, `Badge`, `Button`, `EmptyState` |
| Teacher Evaluations | `PendingEvaluations.tsx`, `Evaluate.tsx`; routes `App.tsx:168-169` | `teacher/evaluations.tsx`, `teacher/evaluate/[sessionId].tsx` | `GlassCard`, `EmptyState`, `Icon`, `Link` | `TeacherScreen`, `Card`, `Button`, `Icon` |
| Admin Home | `artifacts/tabyan/src/pages/admin/AdminHome.tsx`; routes `App.tsx:188-190` | `artifacts/mobile/app/admin/index.tsx` | `GlassCard`, `Link` | `AdminFrame`, `FeatureTile`, `Card`, `Icon`, loading/error |
| Admin Accounts | `artifacts/tabyan/src/pages/admin/AdminAccounts.tsx`; route `App.tsx:190` | `artifacts/mobile/app/admin/accounts.tsx` | `GlassCard`, `Modal`, `PrimaryButton`, `Icon` | `AdminFrame`, `Card`, `Button`, `Badge`, loading/error/empty |

### Logo audit

```text
IS_SAME_LOGO_ASSET: NO
IS_SAME_WORDMARK: NO
IS_SAME_PROPORTIONS: NO
IS_SAME_COLORS: NO
IS_SAME_PLACEMENT: NO
```

- Web Splash uses `/logo-splash.png` in `SplashScreen.tsx:45-47`, width `360px` with `max-width: 84vw`, on a `#4C091B` background; the splash includes gold halo, shine, text, dots and loader (`SplashScreen.css:5-24,49-78,181-235`).
- Mobile Login uses a generic `book-outline` Ionicon in a `76×76` rounded mark with separate `تبيان` text (`artifacts/mobile/app/(auth)/login.tsx:56-60,127-132`).
- Mobile has no branded in-app SplashScreen component; `_layout.tsx` only controls the platform splash lifecycle and font loading.
- The reusable Mobile Header fallback uses `logo-ionic`, not the Web Tabyan wordmark (`artifacts/mobile/components/ui.tsx:19-40`).

### Global design tokens

| Token | Web source | Mobile source | Verdict |
|---|---|---|---|
| Burgundy | `#800020`; light variant `#A02040` | `palette.burgundy`, `palette.burgundyLight` | EXACT_MATCH |
| Maroon | `#4C091B`; deep `#360512` | Same palette values | EXACT_MATCH |
| Gold | `#D4AF37`; light `#F1D27A`; dark `#B8860B` | Same palette values | EXACT_MATCH |
| Light background/card | `#FAF7F0` / `#FFFCF5` | `theme.tsx:32-40` | EXACT_MATCH |
| Dark background/card | `#4C091B` / `#42121F` | `theme.tsx:46-57` | EXACT_MATCH |
| Card border/shadow | Web glass borders, blur and premium shadows in `index.css:131-135,209-223` | Native border in `ui.tsx:44-47`; no equivalent Web glass/shadow presentation | DIFFERENT |
| Card radius | Web base `1.25rem` | Native card `22` | CLOSE |
| Controls/buttons | Web pill-oriented design tokens | Native min-height `46`, radius `999` in `ui.tsx:124-126` | CLOSE |
| Inputs | Web field styling is component/CSS based | Native height `52`, radius `16` in `login.tsx:139` | PARTIAL |
| Spacing | Shared scale `4/8/12/16/20/24` | Global content padding `16`, shared scale usage | CLOSE |
| Typography | IBM Plex Sans Arabic interface; Amiri Quran | IBM Plex Sans Arabic 400/500/600/700; Amiri 400/700 | EXACT_MATCH |
| Primary text | Web burgundy/light text by theme | Light `#800020`, dark `#FAF6EF` | CLOSE |
| Semantic states | Web status styles | Mobile light success `#267A54`, danger `#C83C3C`; dark success `#68D391`, danger `#FC8181` | DIFFERENT |
| Bottom navigation | Web `StudentBottomNav`/shell presentation | Native 72px Expo tabs with six labels | DIFFERENT |

### Screen-by-screen verdict

`Visual parity` is `PARTIAL` for screens without matching rendered proof; it is not inferred from functional parity.

| Screen | Functional | Structure | Visual | Content | Exact confirmed difference |
|---|---|---|---|---|---|
| Guest | FAIL | FAIL | FAIL | FAIL | Web public landing/CTAs have no Mobile equivalent; Mobile redirects to Login. |
| Splash | PASS | PARTIAL | PARTIAL | PARTIAL | Web has branded animated SplashScreen; Mobile has platform splash lifecycle only. |
| Login | PASS | PARTIAL | PARTIAL | PASS | Web modal flow versus Mobile standalone screen. |
| Register | PASS | PARTIAL | PARTIAL | PASS | Web modal multi-step flow versus Mobile standalone six-step screen. |
| Student Home | PASS | PASS | PARTIAL | PASS | Exact rendered equivalence not proven; source order/content is aligned. |
| Quran Tracks | PASS | PASS | PARTIAL | PASS | Web landing and Mobile pushed native route use different shell presentation. |
| Quran Levels | PASS | PASS | PARTIAL | PASS | Native route/card presentation differs from Web shell. |
| Tajweed | PASS | PASS | PARTIAL | PASS | Native route presentation differs; no confirmed content gap. |
| Sharia | PASS | PASS | PARTIAL | PASS | Native drill-down route presentation differs; no confirmed content gap. |
| Placement | PASS | PASS | PARTIAL | PASS | Native camera/recording surface is a native exception; exact visual proof is incomplete. |
| Booking | PASS | PASS | PARTIAL | PASS | Native confirmation surface differs from Web modal presentation. |
| Student Schedule | PASS | PASS | PARTIAL | PASS | Native tab/screen shell differs from Web shell. |
| Notifications | PASS | PARTIAL | PARTIAL | PARTIAL | List exists, but Mobile lacks Web notification detail/settings routes. |
| Notification Detail | FAIL | FAIL | FAIL | FAIL | Web detail route exists; no Mobile counterpart. |
| Library | PASS | PARTIAL | PARTIAL | PASS | Web page + BookDetails versus Mobile tab/standalone/detail/read route split. |
| Account | PASS | PASS | PARTIAL | PASS | Native header/card shell differs from Web shell. |
| Teacher Home | PASS | PASS | PARTIAL | PASS | Native shell presentation differs; source content is aligned. |
| Teacher Students | PASS | PASS | PARTIAL | PASS | Native list/detail presentation differs; source content is aligned. |
| Teacher Schedule | PASS | PASS | PARTIAL | PASS | Native list/filter presentation differs; source content is aligned. |
| Teacher Evaluations | PASS | PASS | PARTIAL | PASS | Native list/action presentation differs; source content is aligned. |
| Admin Home | PASS | PASS | PARTIAL | PASS | Native AdminFrame/FeatureTile shell differs from Web GlassCard/sidebar shell. |
| Admin Accounts | PASS | PASS | PARTIAL | PASS | Native forms/cards differ from Web modal/GlassCard presentation. |

### Mobile-only UI

```text
MOBILE_ONLY_UI_COUNT: 5 categories
```

1. SafeArea, StatusBar, font loading and platform splash lifecycle (`artifacts/mobile/app/_layout.tsx:5-23,29-46`).
2. 72px Expo bottom tab bar and native tab labels/icons (`artifacts/mobile/app/student/(tabs)/_layout.tsx:16-27`).
3. Native Header with theme toggle/back affordance (`artifacts/mobile/components/ui.tsx:19-40`).
4. Native Card/Button/Badge/FeatureTile/Loading/Error/Empty primitives (`artifacts/mobile/components/ui.tsx:44-112,115-146`).
5. Native role guards, including teacher KYC and admin access (`artifacts/mobile/app/teacher/_layout.tsx:7-16`, `admin/_layout.tsx:4-8`).

### Web elements missing in Mobile

```text
WEB_ELEMENTS_MISSING_IN_MOBILE_COUNT: 5 confirmed groups
```

1. Public `GuestHome` marketing landing, section cards and public CTAs.
2. Branded Web `SplashScreen`.
3. `NotificationDetails` route for student, teacher and admin.
4. Web notification settings routes for student, teacher and admin.
5. Web desktop shell/sidebar/glass presentation as a direct Mobile equivalent.

### Confirmed priority list

#### P0 — 3

1. Public Guest landing is missing in Mobile; Web `GuestHome.tsx` is replaced by an unauthenticated redirect to Login in `app/index.tsx`.
2. Branded Web SplashScreen is missing in Mobile; Mobile only uses OS splash lifecycle.
3. Notification Detail is missing in Mobile while Web exposes the route for all roles.

#### P1 — 4

1. Web role shells and routes differ from Mobile hidden-header Expo stacks and fade transitions.
2. Native student tab order is Home, Schedule, Recordings, Library, Fatwa, Account; Web uses its own StudentBottomNav/shell structure and pushes Quran/Tajweed/Sharia/Placement/Booking differently.
3. Web authentication is a modal flow; Mobile uses separate `/login` and `/register` screens.
4. Web Library is page + BookDetails; Mobile splits tab, standalone, detail and read routes.

#### P2 — 3

1. Web notification settings routes have no Mobile equivalent.
2. Teacher shell exposes Broadcast, Fatwas, Recordings, Settings, Onboarding and session routes with a different presentation/navigation model on Mobile.
3. Web uses a Suspense spinner while Mobile uses reusable Loading/Error/Empty primitives.

#### NATIVE — 5 categories

1. SafeArea, StatusBar, font loading and platform splash lifecycle.
2. Native 72px bottom tab bar.
3. Native Header theme toggle/back affordance.
4. Native Card/Button/Badge/FeatureTile and loading/error/empty primitives.
5. Native teacher KYC and admin role guards.

### Top 10 confirmed differences

1. Guest landing missing in Mobile — P0.
2. Branded SplashScreen missing in Mobile — P0.
3. Notification Detail missing in Mobile — P0.
4. Web shell versus Mobile stack/navigation model — P1.
5. Student navigation/tab order differs — P1.
6. Web modal auth versus Mobile separate auth screens — P1.
7. Web Library page/detail versus Mobile route split — P1.
8. Notification settings missing in Mobile — P2.
9. Teacher shell presentation/navigation differs — P2.
10. Web Suspense spinner versus Mobile state primitives — P2.

## Step 1 baseline (historical, superseded by Step 2)

```text
WEBSITE_RENDER_INSPECTED: YES
MOBILE_INSPECTED: YES

LOGO_PARITY: PARTIAL
GLOBAL_DESIGN_PARITY: PARTIAL
STRUCTURE_PARITY: PARTIAL
NAVIGATION_PARITY: PASS
SVG_PARITY: PASS
LIGHT_MODE_PARITY: PARTIAL
DARK_MODE_PARITY: PASS
RTL_PARITY: PASS

MUSHAF_VISIBLE_IN_MOBILE: NO
QCF_FILES_IN_MOBILE_EXPORT: 0

P0_DIFFERENCES: NONE_CONFIRMED
P1_DIFFERENCES: 2 (historical, unconfirmed because states differed)
P2_DIFFERENCES: 1 (historical preview observation)

CODE_CHANGED: NO
BUILD_STARTED: NO
READY_FOR_PARITY_FIX_PHASE: NO
```

## Logo / branding

```text
WEB_LOGO: ornate gold Arabic Tabyan wordmark centered on the burgundy splash
MOBILE_LOGO: simple burgundy rounded-square book icon above the Arabic Tabyan name on Login
```

**Exact observed difference (P1):**

- The Web splash uses the ornate gold wordmark with decorative framing.
- The Mobile Login uses a simple open-book mark and separate Arabic text.
- Because the captures are different states, it is not yet confirmed whether Mobile has a matching ornate splash logo before Login. Do not replace either asset based on this comparison alone.

## Global design system

**Shared observed direction:**

- Arabic RTL presentation.
- Burgundy as the primary brand color.
- Gold accenting on the Web splash.
- Rounded surfaces and soft, low-contrast controls on Mobile.

**Exact observed difference (P1):**

- Web is a full-bleed burgundy splash with centered branding and a gold progress indicator.
- Mobile is a light cream Login screen with a bordered card, role tabs, pink-tinted inputs, and a burgundy Login action.
- This is primarily a state/surface comparison, not proof of a global theme mismatch.

**P2 observation:**

- The Web screenshot contains a visible “Share your feedback” overlay in the lower-right corner. This appears to be an external preview overlay, not Tabyan product UI, and is excluded from parity scoring.

## Screen structure comparison

| Screen | Web evidence | Mobile evidence | Structure parity | Exact differences |
|---|---|---|---|---|
| Guest / first entry | Splash visible | Login visible | PARTIAL | Captures are different entry states; same-state sequence not established. |
| Login | Not visible in captured Web state | Login form visible | PARTIAL | Web login cannot be compared from the splash capture. |
| Register | Not visible | Not visible | PARTIAL | No same-state rendered evidence in this capture. |
| Student Home | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Tracks | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Levels | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Tajweed | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Sharia | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Placement | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Booking | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Schedule | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Notifications | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Library | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Account | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Teacher Home | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Teacher Students | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Teacher Schedule | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Teacher Evaluations | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Admin Home | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |
| Admin Accounts | Existing parity reports | Existing parity reports | PASS | No new visual discrepancy established in this step. |

## Navigation, icons, themes, and RTL

- **Navigation:** existing parity reports remain `PASS`; no new navigation evidence was captured in the two static root screenshots.
- **SVG:** existing section-icon parity remains `PASS`; the observed logo treatment difference is recorded under branding, not section SVG inventory.
- **Light mode:** `PARTIAL` for this visual step because Mobile is shown in a light Login surface while Web is shown in a dark splash state; matching route/theme captures are needed for exact scoring.
- **Dark mode:** existing parity reports remain `PASS`.
- **RTL:** `PASS`; Arabic alignment and right-to-left Login structure are visible in the Mobile capture, and the Web splash is centered Arabic branding.

## Mushaf exception

```text
MUSHAF_VISIBLE_IN_MOBILE: NO
QCF_FILES_IN_MOBILE_EXPORT: 0
```

The intentional Mushaf/QCF exclusion is not counted as a parity failure.

## Final difference list

### P0 — obvious brand/layout mismatch

```text
NONE_CONFIRMED
```

### P1 — important visual/content mismatch (historical, not confirmed)

1. Web splash ornate wordmark versus Mobile Login simple book-icon branding; same-state splash verification is still required.
2. Full-bleed Web splash surface versus Mobile Login card/form surface; the captured states are different, so this is not yet an actionable global-theme defect.

### P2 — minor spacing/font/detail mismatch (historical, not a product gap)

1. Web preview contains an external feedback overlay; excluded from product parity.

```text
CODE_CHANGED: NO
BUILD_STARTED: NO
READY_FOR_PARITY_FIX_PHASE: NO
```