---
name: Expo web session persistence — FIXED
description: expo-secure-store web is an empty stub; mobile web session persists via lib/token-storage.ts (AsyncStorage on web, SecureStore native) — fixed 2026-08-17
---

نسخة الويب من expo-secure-store (`ExpoSecureStore.web.js`) هي stub فارغ (`export default {}`) — بلا تخزين دائم، فكانت الجلسة تضيع مع أي تحميل كامل في معاينة الويب.

**الحل (مُنفَّذ وموافَق عليه — TASK #68.1):** `artifacts/mobile/lib/token-storage.ts` طبقة معزولة: `Platform.OS === 'web'` → AsyncStorage (localStorage)، وإلا → SecureStore. `lib/auth.tsx` يستدعيها حصراً ولا يلمس expo-secure-store مباشرة. دلالات Auth (استعادة/401/403/فشل شبكة/logout) لم تتغير — e2e كامل (refresh ×3، deep link، توكن تالف→دخول، فشل شبكة→بقاء الجلسة، logout→لا استعادة) نجح.

**Why:** أي تعديل مستقبلي على تخزين الجلسة يجب أن يمر عبر token-storage فقط؛ لا تستدعِ SecureStore أو AsyncStorage مباشرة من auth.tsx.

**How to apply:** في e2e على Expo web أصبح التنقل العميق بـ page.goto بعد تسجيل الدخول آمناً (الجلسة تنجو)، والتوكن موجود في localStorage تحت مفتاح `tabyan_token`. التحويل للدخول بعد reload لم يعد متوقعاً — إن حدث فهو انكسار حقيقي يستحق التحقيق.
