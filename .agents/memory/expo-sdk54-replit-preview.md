---
name: Expo SDK 54 preview on Replit
description: Replit-specific Metro and web-preview constraints for the Tabyan Expo app.
---

Use Expo SDK 54's default Metro config in this pnpm monorepo; do not set `disableHierarchicalLookup`.

**Why:** Manual node-module paths hid pnpm transitive dependencies and produced a long chain of false “module not found” failures.

**How to apply:** Keep `getDefaultConfig(__dirname)` unless a verified SDK-specific reason requires an override.

Use a production-mode Expo workflow for stable Replit web preview under Node 24.

**Why:** Development HMR parses Replit's root URL as an empty JSC path and can terminate Metro; production bundling avoids that HMR path.

**How to apply:** Device work can still use Expo Go, but browser preview should avoid relying on HMR until the upstream URL parser issue is resolved.

Avoid `Link asChild` wrapping a Pressable whose style is an array on React Native Web.

**Why:** Expo Router's slot cloning can pass the array to a raw anchor, causing `CSSStyleDeclaration` indexed-property errors and a blank app.

**How to apply:** Use `router.push` from the Pressable or ensure the web anchor receives a flattened style object.

For Expo SDK 54, pin native modules to the Expo-expected versions when adding a native picker or similar package; `expo start` warns and may be unreliable with newer majors.

**Why:** The workspace initially resolved `@react-native-community/datetimepicker` to 9.x while SDK 54 expected 8.4.4; the compatible pin was required for a clean Metro workflow.

**How to apply:** Prefer `expo install`/the SDK-compatible version in the mobile package rather than accepting the newest package release.