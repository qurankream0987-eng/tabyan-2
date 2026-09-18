---
name: Deployment build parity traps
description: The durable rules for matching local and deployment builds.
---

# فخاخ تطابق بناء النشر مع البناء المحلي

- **تعامل مع الـlockfile كبنية النشر الحقيقية.** **Why:** الاعتماديات المحلية أو الكاش قد تخفي تعارضاً لن يظهر إلا في تثبيت نظيف. **How to apply:** تحقق من بناء نظيف قبل النشر، ولا تعتمد على نجاح خادم التطوير وحده.
- **تجنب overrides الشاملة لحزم أدوات البناء.** **Why:** override يتجاوز نطاق التوافق المعلن وقد يعطل أداة مجمّعة في بيئة نظيفة. **How to apply:** لا تضف override عالمياً دون اختبار بناء بارد للأجزاء المتأثرة.
- **لا تفرض brace-expansion حديثة على minimatch القديم.** **Why:** React Native codegen يستخدم minimatch 3 الذي يحتاج واجهة expand القديمة، وإجباره على الإصدار 5 يفشل CocoaPods بـ`expand is not a function`. **How to apply:** اترك الاعتماديات العابرة تختار نسخها المتوافقة، واختبر generate-codegen-artifacts قبل Expo Launch.
- **الأصول والثنائيات ليست مضمونة في الحزم الناتجة.** **Why:** أدوات bundling تدمج JavaScript عادةً لا الملفات التي تقرأ وقت التشغيل. **How to apply:** عند استخدام حزمة تعتمد على ملف خارجي، تحقق صراحةً من وجوده وتشغيله من مجلد الإنتاج.
- **لا تعتبر الكلمات العامة مثل localhost دليلاً على اتصال تطوير داخل bundle.** **Why:** Expo يضمّن fallback داخلياً وsource map URL حتى في bundle غير التطويري. **How to apply:** افحص عناوين الاتصال الكاملة وعناوين API/WS الفعلية، لا التطابق النصي العام وحده.
