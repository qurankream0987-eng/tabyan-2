---
name: Tabyan worldwide phone validation
description: Phone validation is global E.164 with per-country rules only for known dials; client max length must be computed from dial length to stay within 15 total digits.
---

# التحقق العالمي من أرقام الهاتف (2026-08-14)

- التطبيق متاح لكل دول العالم: الخادم (`lib/tabyan-trpc/src/routers/auth.ts`) يقبل أي E.164 `^\+[1-9]\d{6,14}$`؛ قواعد الأطوال الدقيقة (COUNTRY_PHONE_RULES) تُفرض فقط على ~20 دولة معروفة، وغيرها يمر بالصيغة العامة. توافق `05…` السعودي القديم محفوظ.
- الواجهة (`artifacts/tabyan/src/lib/countries.ts`) فيها ~180 دولة؛ الكويت افتراضية (COUNTRIES[0]).
- **قاعدة حرجة:** الحد الأقصى للرقم الوطني في الواجهة = `min(14, 15 - dial.length)` وليس ثابتاً — وإلا ولّدت الواجهة أرقاماً تتجاوز 15 رقماً (E.164) فيرفضها الخادم ويتعطل التسجيل.
- **Why:** ضبطه المراجع المعماري بعد أن سمح حد ثابت (14) برقم بريطاني من 16 رقماً إجمالاً.
- **How to apply:** أي تغيير في حدود الهاتف يجب أن يحافظ على تطابق عميل/خادم؛ `splitE164` يفحص أطوال [4,3,2,1] لدعم بادئات NANP الرباعية (مثل 1809) قبل «1».
