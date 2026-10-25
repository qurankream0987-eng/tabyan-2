# TABYAN — Welcome logo quality rebuild

## Current stage: implementation complete; device acceptance unverified

The owner supplied a new sharp burgundy-on-ivory reference and said
"نفس هذه الجوده". That reference supersedes the earlier provisional trace.
Web/Native runtime assets are now derived from the restored master.
No database/auth/QCF/recitation/placement/production/config identity changes.
No paid generation, external design services, application builds, iOS exports or
publishing. Local image exports only.

## Asset trace before changes

All dimensions are the file canvas, not the visible ink bounds.

| Original path | Type | Dimensions | Bytes | Transparency | Used by |
|---|---|---|---:|---|---|
| artifacts/tabyan/public/logo-light.png | PNG | 720 × 720 | 21,679 | Yes | GuestHome Welcome; login/register; teacher/admin UI |
| artifacts/tabyan/public/logo-dark.png | PNG | 720 × 720 | 21,679 | Yes | Same Web UI in dark mode |
| artifacts/tabyan/public/logo-splash.png | PNG | 720 × 720 | 21,679 | Yes | Web SplashScreen |
| artifacts/tabyan/public/logo.png | PNG | 720 × 720 | 21,679 | Yes | Support sharing and prayer notification branding |
| artifacts/tabyan/public/logo-official.png | PNG | 720 × 720 | 21,679 | Yes | Public retained brand asset |
| artifacts/tabyan/public/logo-transparent.png | PNG | 720 × 720 | 21,679 | Yes | Public retained brand asset |
| artifacts/tabyan/public/logo-light.jpg | JPEG | 1024 × 1024 | 212,073 | No | Historical decorative, different emblem: unsuitable |
| artifacts/tabyan/public/logo.svg | SVG | 260 × 72 | 680 | Yes | Legal/support; book-and-text design, NOT current calligraphic mark |
| artifacts/mobile/assets/images/logo-light.png | PNG | 720 × 720 | 21,679 | Yes | Guest (non-iOS), shared header, login/register/teacher registration |
| artifacts/mobile/assets/images/logo-dark.png | PNG | 720 × 720 | 21,679 | Yes | Dark counterparts |
| artifacts/mobile/assets/images/logo-gold.png | PNG | 720 × 720 | 21,679 | Yes | Retained gold variant |
| artifacts/mobile/assets/images/logo-splash.png | PNG | 1196 × 639 | 23,467 | Yes | IOSWelcomeHero, IOSSplash, TabyanSplash, expo-splash-screen |
| artifacts/mobile/assets/images/icon.png | PNG | 1024 × 1024 | 441,998 | No | App icon/favicon; audit only, unchanged |
| attached_assets/tabyan-google-oauth-logo-120.png | PNG | 120 × 120 | 13,943 | No | Historical provider asset; not a master |

Web/mobile square light copies are byte-identical, as are the gold square copies.
Visible ink is only about 589 × 586 inside the 720 canvas. Native's wide Splash
asset contains approximately the same-size ink inside its wider transparent canvas.
Its iOS Welcome currently uses that gold Splash asset.

Repository and uploaded-image inspection found no true vector master of the
approved calligraphic mark. The larger RGB app icon has textured/color-edge noise
and was rejected as the tracing source. The JPEG and existing SVG use different
emblems and cannot be substituted without redesign.

## Adopted source and canonical master

- Owner reference: attached_assets/image_1791728659430.png, PNG, 1254 × 1254,
  1,437,134 bytes, RGB with ivory background. Visually cleaner than legacy copies.
- Frozen extracted silhouette: assets/branding/reference/tabyan-logo-silhouette.png.
- The older tabyan-logo-approved.png is retained solely as a before-change
  comparison reference, not used to regenerate the new master or any runtime logo.
- Canonical master: assets/branding/tabyan-logo.svg.
- Local restoration: assets/branding/restore-tabyan-logo.py.
- Local derivative exporter: assets/branding/export-tabyan-logo.py.
- Focused validation: assets/branding/check-tabyan-logo.py.
- Master: 720 × 720 logical viewBox, explicit preserveAspectRatio, transparent
  background, existing brand burgundy #800020, 67,965 bytes.
- Genuine cubic path geometry: no embedded raster, fonts, generated letters,
  paid service or enlargement of blurred pixels.
- Closed outlines: 17; foreground components in the source: 16. Lettering, dots,
  diacritics and emblem were compared visually against the owner's new reference.
  The owner has not separately signed off on the final exported tracing.
- Native wide frame remains 1196 × 639; the reference's proportions are preserved,
  not stretched to the older letter shapes. Ink stays inside the frame.

## Runtime derivatives

| Path | Dimensions | Bytes | Purpose |
|---|---|---:|---|
| artifacts/tabyan/public/logo-light.svg | 720 logical | 67,965 | Web Welcome, burgundy |
| artifacts/tabyan/public/logo-dark.svg | 720 logical | 67,965 | Dark Welcome and Web Splash, gold |
| artifacts/mobile/assets/images/logo-light.png | 1024 × 1024 | 132,641 | Shared light header/auth/non-iOS welcome |
| artifacts/mobile/assets/images/logo-dark.png | 1024 × 1024 | 146,771 | Shared dark counterpart |
| artifacts/mobile/assets/images/logo-gold.png | 1024 × 1024 | 146,771 | Gold alias retained |
| artifacts/mobile/assets/images/logo-welcome-light.png | 1196 × 639 | 85,244 | iOS Light Welcome, burgundy |
| artifacts/mobile/assets/images/logo-splash.png | 1196 × 639 | 91,829 | Native Splash/dark iOS Welcome, gold |

All existing Web light/gold PNG URLs were refreshed from the same master at
1024 × 1024 rather than deleted, preserving login/register/header/sharing users
of those paths. Native PNGs use lossless RGBA8 compression. Vector geometry is
supersampled directly, never first rasterized at a tiny size.

At the maximum Native canvas width of 360pt, @3x requires 1080px; the 1196px wide
asset exceeds that. iOS Welcome is capped at 200pt and therefore needs 600px @3x.

App icon remains the original 1024 × 1024 RGB gold-on-burgundy artwork. It is a
textured, older raster treatment, not the new master; no icon suitability claim
or replacement is made. Icon, Expo IDs/config, layout helpers and Splash timing
are byte-unchanged.

## Verification and limits

- Web TypeScript: PASS.
- Native TypeScript: PASS.
- Focused SVG/PNG/reference/default-theme/layout contracts: PASS.
- git diff --check: PASS.
- Web Welcome screenshots: 390, 430 and 1440px, real running GuestHome.
- A capture-only, ignored HTML entry set the visitor's existing splashSeen flag
  before redirecting to the real home page. It did not bypass authentication or
  modify application behavior.
- SVG and Native PNG asset rendering inspected at 100%, 150%, 200%, on ivory and
  burgundy. Native sizing covers 375, 390, 393 and 430 widths (all hit the 200pt
  cap). This is asset/layout proof, NOT a real iPhone screen or launch test.
- iOS upper-positioned flex region and light-default function are unchanged.
- Browser logs for the real Web Welcome captures have no errors. The isolated
  asset gallery requested a missing default favicon; every logo image loaded.
- No unnecessary Web build, EAS build, iOS export or browser-testing agent.
- Real iPhone Welcome/compiled Splash handoff and final owner acceptance remain
  unverified. Do not equate these local checks with device acceptance.

Screenshots: generated-artifacts/logo-web-{390,430,1440}.jpg and
generated-artifacts/logo-scales-and-backgrounds.jpg. These and capture fixtures
are ignored by Git/deployment. The earlier logo-review.png depicts the rejected
provisional source, NOT the final master.

## TABYAN — WELCOME LOGO QUALITY REBUILD: final report

| Required field | Result |
|---|---|
| Original Web Logo | public/logo-light.png and logo-dark.png |
| Original Native Logo | logo-splash.png for iOS; square light/dark for other paths |
| Original Resolution | Web 720²; Native iOS canvas 1196×639, ink approximately 589×586 |
| Canonical Master Found | NO pre-existing correct vector; clean owner-supplied raster adopted |
| Canonical Master | assets/branding/tabyan-logo.svg |
| Vector Available | YES — reconstructed genuine path geometry |
| Logo Rebuilt | YES — careful local tracing of the supplied mark, no redesign |
| Arabic Calligraphy Preserved | PASS in local visual comparison; final owner sign-off unconfirmed |
| Transparent Background | PASS |
| Web Uses High-Quality Master | PASS — SVG directly |
| Native Uses Retina-Quality Asset | PASS — density checks and asset preview |
| Splash Uses Same Master | YES |
| Pixelation | NONE observed at inspected application/asset scales; hardware unverified |
| Blur | NONE observed on logo outlines; existing UI glow retained |
| Stretching | NONE |
| Light Welcome | PASS on Web; Native source/asset PASS, physical-device screen unverified |
| Native Logo Position Regressed | NO source/layout regression; no actual-device claim |
| Duplicate Bad Assets Removed | 0 — refreshed referenced PNG aliases; retained historical different emblems |
| Web TypeScript | PASS |
| Native TypeScript | PASS |
| Build/Export | Application build/iOS export NOT REQUIRED; local vector-to-PNG exports done |
| Paid Image API | NO |
| Deployment | NO |
| FINAL VERDICT | PARTIAL — implementation and local checks finished; device/owner acceptance pending |
