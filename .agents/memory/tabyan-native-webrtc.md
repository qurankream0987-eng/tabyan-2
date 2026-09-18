---
name: Tabyan Native WebRTC compatibility
description: توافق WebRTC الأصلي مع Expo SDK 54 وحدود التحقق من Expo Go.
---

يجب استخدام `react-native-webrtc` مع `@config-plugins/react-native-webrtc` المتوافق مع إصدار Expo الحالي؛ بالنسبة إلى Expo SDK 54، الإصدار المتوافق من config plugin هو 13.x، بينما الإصدارات الأحدث قد تتطلب Expo 55/56. الحزمة native لا تعمل داخل Expo Go، ولذلك يكون اختبار receive-only الحقيقي على Development Build أو جهاز مبني من المشروع.

**Why:** الحزمة تحتاج ربط native وconfig plugin، بينما Expo Web وExpo Go يستطيعان فقط التحقق من TypeScript/bundling وواجهة الحالة، لا من WebRTC media path الفعلي.

**How to apply:** ثبّت dependency داخل workspace Mobile فقط، أضف plugin إلى `app.json`، نفّذ prebuild على نسخة مؤقتة لا على artifact، واعتبر اختبار جهاز حقيقي بوابة مستقلة قبل الاعتماد على الاتصال الفعلي.

تسجيل فيديو WebRTC في Native ليس مكافئًا تلقائيًا لتسجيل Web عبر `MediaRecorder`؛ لا تعرض زر تسجيل أو نجاح حفظ دون مسار أصلي يلتقط الوسائط ويرفعها عبر عقد التسجيل الموجود.

**Why:** Native الحالي يملك نقل الوسائط الحي فقط، بينما تسجيل Web يجمع المشاركين ويستدعي finalize منفصلًا؛ اختراع fallback سيحوّل فجوة منصة إلى نجاح وهمي.

**How to apply:** عند تفعيل تسجيل الحصة، صمّم الالتقاط والرفع كمرحلة مستقلة واختبرها على Development Build وجهاز حقيقي قبل مطابقة Web.