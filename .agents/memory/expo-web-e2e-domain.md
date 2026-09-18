---
name: Expo web e2e via direct domain
description: Testing/screenshotting the Expo mobile app on web must use the direct Expo dev domain, never the /mobile/ proxy path
---

When running e2e tests or screenshots against the Expo mobile artifact on web, use the direct Expo dev domain (`https://$REPLIT_EXPO_DEV_DOMAIN/`), NOT the shared proxy path `/mobile/`.

**Why:** Expo's generated HTML references the JS bundle with a root-absolute URL (`/node_modules/...entry.bundle`). Through the shared proxy, that URL escapes the `/mobile/` prefix and hits a different artifact (the tabyan Vite app returned HTML with 200, breaking the script) — the page stays a blank white screen with no pageerror. Three consecutive testing-subagent runs failed this way before the cause was found; the same app rendered fine via the direct domain.

**How to apply:** In testing-subagent task prompts for the mobile app, always include the full `$REPLIT_EXPO_DEV_DOMAIN` URL and explicitly forbid the `/mobile/` proxy path. First load after a Metro restart can take up to ~60s (lazy bundling) — tell the tester to wait/reload once before judging failure.

Native-only Expo modules must be lazy-loaded behind a `Platform.OS !== "web"` guard; importing a module that calls `requireNativeModule` at top level crashes Expo Web before the router renders.

**Why:** The Native Speechmatics audio package was safe in iOS/Android bundles but made the shared Expo Web preview blank when imported eagerly.

**How to apply:** Keep native audio imports type-only at module scope and resolve the runtime module only from user-triggered Native microphone paths.

Protected Expo routes may remain on the splash screen when screenshotting the direct dev domain without an authenticated session, even after the bundle has loaded.

**Why:** Student routes require restored auth before the router can render their screen; an unauthenticated visual capture cannot prove the protected screen's layout.

**How to apply:** Use a real/restored student session for protected-route screenshots, or report the visual gate as pending rather than treating the splash screen as a route-rendering failure.
