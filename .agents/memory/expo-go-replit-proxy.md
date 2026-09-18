---
name: Expo Go Replit proxy
description: ربط Expo Go الفعلي بخادم Metro داخل Replit عبر نطاق preview العام.
---

# Expo Go عبر Replit

عند تشغيل Metro على `--localhost` داخل Replit، يجب تمرير `EXPO_PACKAGER_PROXY_URL=https://${REPLIT_EXPO_DEV_DOMAIN}` حتى يعلن QR عنوان preview العام القابل للوصول من الهاتف.

**Why:** بدون proxy URL يعلن Expo `127.0.0.1` أو عنوانًا داخليًا؛ قد تفتح المعاينة الويب بينما يفشل Expo Go برسالة عدم الاتصال بخادم التطوير.

**How to apply:** أبقِ ربط Metro المحلي والمنفذ القادم من `PORT`، وحقن proxy URL في workflow؛ بعد التغيير أعد تشغيل workflow وأعد مسح QR الجديد.

إذا ظهر في iOS Simulator خطأ `hostname could not be found` لنطاق `expo.pike.replit.dev` بينما Metro يعمل، فإعادة تشغيل Workflow وحدها قد لا تكفي؛ أعد تشغيل بيئة Replit (Restart compute) ثم امسح QR الجديد. النفق هو البديل عند استمرار فشل DNS.

**Why:** قد يُحل النطاق داخل بيئة Replit إلى عنوان خاص مثل `172.24.x.x` ويستجيب من داخل المشروع، بينما لا يستطيع المحاكي حلّه خارجها.

**How to apply:** ابدأ بـ Restart compute من Command Palette، ثم استخدم أحدث QR. لا تغيّر كود التطبيق أو المصادقة لعلاج هذا الخطأ؛ انتقل إلى tunnel فقط إذا بقي فشل DNS.

في Expo 54 داخل artifact mobile، المسار الافتراضي للـ workflow هو `--localhost` مع `EXPO_PACKAGER_PROXY_URL=https://${REPLIT_EXPO_DEV_DOMAIN}`. لا تستخدم tunnel كخيار افتراضي؛ قد يفشل ngrok برسالة `remote gone away` رغم أن Metro سليم.

**Why:** Workflow المُدار ينتظر منفذ Mobile المحدد، وReplit يوفر نطاق Expo عامًا يربط Metro المحلي دون الاعتماد على خدمة ngrok خارجية.

**How to apply:** استخدم `expo start --no-dev --minify --localhost --port $PORT` مع proxy URL المحقون، ثم أعد مسح QR بعد إعادة تشغيل workflow. استخدم tunnel فقط كحل أخير عند فشل DNS للنطاق العام.