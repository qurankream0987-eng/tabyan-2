# Tabyan brand and auth presentation audit

## Inventory before changes

| Platform / implementation | Light appearance | Dark appearance | Theme aware |
| --- | --- | --- | --- |
| Native `app/guest.tsx` | Burgundy tint | Gold raster | Yes |
| Native `app/(auth)/login.tsx` (all roles) | Gold raster | Same gold raster | No |
| Native `app/(auth)/register.tsx` | Gold raster | Same gold raster | No |
| Native `app/(auth)/teacher-register.tsx` | Gold raster | Same gold raster | No |
| Native `components/ui.tsx` Header (student/teacher/admin/auth) | Burgundy raster | Gold dark raster | Yes |
| Native `components/branded-splash.tsx` | Gold splash raster | Same gold splash raster | No |
| Web `pages/GuestHome.tsx` | Approximate burgundy CSS filter | Gold brightness/shadow filter | Yes |
| Web `pages/teacher/TeacherHome.tsx` (two placements) | Same light filter | Same dark filter | Yes |
| Web `components/app/RoleSidebar.tsx` (role headers) | Same light filter | Same dark filter | Yes |
| Web `components/app/StudentRegisterFlow.tsx` | Same light filter | Same dark filter | Yes |
| Web `components/app/TeacherRegisterFlow.tsx` | Same light filter | Same dark filter | Yes |
| Web `components/app/StudentAuthModal.tsx` | Same light filter | Same dark filter | Yes |
| Web `components/app/AdminGateModal.tsx` | Same light filter | Same dark filter | Yes |
| Web `components/app/layouts/AdminShell.tsx` | Same light filter | Same dark filter | Yes |
| Web `components/app/SplashScreen.tsx` | Gold splash raster | Same gold splash raster | No |

All runtime logos are transparent PNGs, verified from their alpha channels. No inline SVG brand mark was found. Category icons and Quran content are separate from these assets.

Static exceptions: native OS launch/app/favicon `assets/images/icon.png` is configured in the already-dirty, protected `app.json`; web social/structured metadata references `logo-light.png`. These are not runtime theme-aware surfaces. Unused raster variants remain untouched, as do all original dark assets.

Canonical color: `lib/design-tokens/tokens.json` → `brand.burgundy` (`#800020`); native adapter `constants/colors.ts` reads the synchronized `constants/tokens.json`; web adapter exposes `--tby-brand-burgundy`.

## Auth findings before changes

- Native student and teacher phone steps both repeat the selected country code alongside the national-number field. Web shared `PhoneField` has the same duplication.
- Native auth uses one `Screen` scroll view inside `KeyboardAvoidingView`, with handled keyboard taps and bottom safe-area padding. The iOS avoidance offset omits the root top safe area. Android uses the existing OS resize behavior.
- Student inputs use `flex: 1` even when vertically stacked, risking compression in a bounded keyboard layout; reserve flex sizing for date/phone rows.
- Web phone selector has a fixed 152px width alongside a shrinking phone input, which needs a stacked layout at narrow widths.
- Web auth modals already have bounded `100dvh` scrolling. Login, registration validation, normalization, API calls, session handling, role resolution and redirects require no changes.

## Implemented

- Native logo tint is conditional on light mode, including the shared header and runtime splash. `palette.burgundy` now references the existing token. All dark source assets and styles remain unchanged.
- Web uses an explicitly scoped SVG alpha filter with the canonical CSS token and sRGB interpolation, keeping the original transparent PNG silhouette and dimensions. The existing dark filter and splash keyframes are unchanged.
- Light runtime splash logos have a cream backing for contrast against the existing maroon splash; surrounding accents and Quran text are untouched.
- Country selector is the only dialing-code presentation on student/teacher registration on both platforms. National-number input retains existing normalization and validation. Web uses a stacked layout below 400px and a chevron instead of a duplicate flag.
- Native auth avoidance accounts for the root top safe area. Country selection dismisses the keyboard and respects the bottom safe area. Existing single-scroll-view handling and Android OS resizing are preserved. Stacked student inputs no longer flex vertically; phone/date rows retain horizontal flex sizing. Phone text and dialing codes explicitly use LTR writing direction.

## Verification

- Mobile TypeScript: PASS.
- Web TypeScript: PASS.
- Web tests: PASS, 13 files / 114 tests.
- Web production build: PASS. Existing sourcemap and mixed static/dynamic import warnings remain nonfatal.
- Metro production exports: PASS for iOS and Android, output under `/tmp/tabyan-auth-metro-final` (local only).
- `git diff --check`: PASS.
- Chromium: login and student/teacher phone steps in both themes at widths 320, 375, 390, 430, 768, 1024, 1280 and 1440; additional 350px-height checks at 320, 390 and 430 verify scroll-reachable CTAs. Validation errors were triggered with empty phone input without sending registration requests. Screenshots reviewed for narrow phone layouts in both themes.
- Web logo filter resolves to `rgb(128, 0, 32)`. Teacher sidebar/home and admin shell checked in existing local demo mode; student home/drawer contain no brand image. Student auth/welcome logos use the checked shared light filter. Light and dark runtime splash checked separately. Dark splash retains `blur(0px) drop-shadow(rgba(212, 175, 55, 0.35) 0px 6px 24px)`.
- Browser evidence: `/tmp/tabyan-responsive-results.json`, `/tmp/tabyan-*.png`; build logs: `/tmp/tabyan-web-build.log`, `/tmp/tabyan-metro-final.log`.

## Acceptance limitation

No iOS simulator, Android device/ADB, or attached native device is available. Metro compilation is not on-device verification. Small/standard/large native viewport behavior with a real keyboard, focus/cursor, validation visibility and CTA taps still needs device acceptance. Overall status is PARTIAL for this verification gap; no claim of completed native keyboard acceptance is made.

No auth architecture/business logic/API, database, original image assets, video, Quran rendering, publishing/deployment configuration or unrelated dirty files were changed. No push, deployment or publication was performed.

## Scoped files

- `artifacts/mobile/app/(auth)/login.tsx`
- `artifacts/mobile/app/(auth)/register.tsx`
- `artifacts/mobile/app/(auth)/teacher-register.tsx`
- `artifacts/mobile/components/branded-splash.tsx`
- `artifacts/mobile/components/ui.tsx`
- `artifacts/mobile/lib/theme.tsx`
- `artifacts/tabyan/src/App.tsx`
- `artifacts/tabyan/src/components/app/PhoneField.tsx`
- `artifacts/tabyan/src/components/app/SplashScreen.css`
- `artifacts/tabyan/src/index.css`
- `verification/tabyan-brand-auth-audit.md`
