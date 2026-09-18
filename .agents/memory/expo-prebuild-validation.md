---
name: Expo native prebuild validation
description: التحقق من config plugins لتطبيق Tabyan Expo دون تلويث artifact بمجلدات ios/android مولّدة.
---

# تحقق Expo Native قبل البناء

للتحقق من config plugins في artifact مُدار، يُنفّذ `expo prebuild --no-install` على نسخة مؤقتة مع ربط dependencies الموجودة، لا على مجلد المشروع مباشرة.

**Why:** prebuild يكتب مجلدات ios/android ويعدّل package metadata؛ كما أن النسخة المؤقتة بلا node_modules لا تستطيع تحديد إصدار Expo.

**How to apply:** استخدم نسخة مؤقتة، وفّر `node_modules` المحلي لها، ثم اعتبر نجاح prebuild تحقق config فقط؛ يبقى compile الفعلي واختبار الجهاز بوابة مستقلة. في هذه البيئة لا تعتمد على `rsync`؛ استخدم `cp -a` لنسخ artifact إلى المجلد المؤقت.