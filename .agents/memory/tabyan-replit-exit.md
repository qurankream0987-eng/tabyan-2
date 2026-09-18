---
name: Tabyan Replit exit constraints
description: Durable constraints for moving Tabyan Web/API/Mobile away from Replit while preserving production identity and data.
---

# قيود الخروج من Replit

لا يُعد نقل Tabyan إلى Railway أو EAS جاهزًا لمجرد نجاح build المحلي: الـAPI يعتمد على Replit Object Storage Sidecar، وDirect EAS يحتاج تحديد مشروع EAS القائم الصحيح وApple team/signing قبل أي build خارجي.

**Why:** طبقة التخزين الحالية تستخدم Sidecar محليًا لتوقيع الروابط، والمشروع التاريخي الذي فُحص لم يثبت أنه مشروع Build 5؛ إنشاء بدائل قد يفقد الملفات أو يفصل Build 6 عن تطبيق Apple الموجود.

**How to apply:** حافظ على Replit Production كـfallback، واستبدل storage adapter وتحقق من EAS identity في staging/clone نظيف قبل أي DB/storage/DNS cutover أو إنشاء credentials جديدة.