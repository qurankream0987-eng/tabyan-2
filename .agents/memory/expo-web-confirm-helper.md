---
name: Alert.alert broken on Expo web
description: Multi-button Alert.alert is a silent no-op on Expo web — use lib/confirm.ts confirmAr for destructive confirmations
---

On Expo web (react-native-web), `Alert.alert` with multiple buttons never renders — presses on buttons that rely on it (e.g. logout confirm) silently do nothing. Caught by e2e: the account-page logout button was dead on web.

**Why:** react-native-web does not implement Alert; only single-button alerts degrade to `window.alert`.

**How to apply:** For any confirm/cancel dialog in `artifacts/mobile`, use `confirmAr(title, message, onConfirm, confirmText?)` from `artifacts/mobile/lib/confirm.ts` — it uses `window.confirm` on web and `Alert.alert` on native. Single-button error/info `Alert.alert` calls are still fine to leave as-is (no-op on web, works on native); only action-blocking confirmations need the helper.
