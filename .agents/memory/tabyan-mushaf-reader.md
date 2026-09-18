---
name: قارئ مصحف تبيان (QCF v2)
description: بنية قارئ المصحف الجديد — خطوط متجهة لكل صفحة بدل الصور؛ قواعد يجب عدم كسرها عند أي تعديل
---

# قارئ المصحف — القواعد الدائمة

- المصحف يُعرض بخطوط **QCF v2 متجهة** (woff2 لكل صفحة + بيانات كلمات/أسطر JSON) — **ممنوع** العودة لعرض صور أو `transform: scale` على صورة منخفضة الدقة.
- **Why:** مواصفة المستخدم الصريحة (الدفعة الثالثة): تكبير بلا بكسلة إطلاقاً، ودقة النص القرآني مطلقة (لا توليد/تعديل أي glyph — كلها من `code_v2` الرسمي).
- **How to apply:** الأصول تُولَّد بـ `node scripts/download-mushaf.mjs` (لا يكتب فوق الموجود إلا بـ--force) وتُتحقق بـ `node scripts/verify-mushaf.mjs` (اكتمال + توقيعات + مخطط + صفحات ذهبية 1/2/187/604 + quirk 2:181). **السكربتان أُعيدت كتابتهما 2026-08-17 ويعملان.** تحويل الخطوط للموبايل: `python3 scripts/convert-mushaf-fonts.py` — woff2→TTF lossless مثبت آلياً (outline+cmap+hmtx) إلى `public/mushaf/fonts-ttf/`.
- مخطط spike الموبايل (M1–M10) في `artifacts/mobile/MUSHAF_SPIKE_REPORT.md`. **M1–M2 منجزان (2026-08-17، نتائجهما في MUSHAF_M1_M2_RESULTS.md): RN Text/View بخط TTF طابق الويب glyph-بـglyph على Expo Web — لا حاجة لخطة Skia.** الـspike معزول في `artifacts/mobile/mushaf-spike/` ولا يُربط بالتنقل؛ الإثبات على جهاز native حقيقي يبقى M10. بديل canvas.measureText على RN: تمريرة قياس خفية onLayout عند 100px.

- ترتيب الأسطر يأتي حصراً من `line_v2` (يشمل أسطر رؤوس السور والبسملة المحجوزة) — لا تُعيد تخطيط الأسطر بالـ HTML reflow.
- حالات خاصة مثبتة بصرياً: الفاتحة (بسملتها آية مرقّمة)، التوبة ص187 (بلا بسملة)، و2:181 خاتمتها موسومة `word` بدل `end` في بيانات QDC نفسها (الرمز يُرسم سليماً — لا "تصلحها").
- مفاتيح localStorage `tabyan.mushaf.lastPage` و`tabyan.mushaf.bookmarks` مستخدمة منذ النظام القديم — **لا تُغيَّر**.
- اتجاه التقليب RTL ثابت: سحب يمين→يسار = الصفحة التالية؛ سهم لوحة مفاتيح يسار = التالي.
- الخطوط لها دورة حياة: تُحفظ الصفحة الحالية ±3 فقط في document.fonts (`retainPageFonts`) — لا تسجّل خطوطاً بلا حذف أو تنفد الذاكرة في جلسات القراءة الطويلة.
- آلة إيماءات `useZoomPan` ترتكب حالتها عبر rAF + مؤقت احتياطي 100ms، و`ref` هو مصدر الحقيقة (لا نسخ عكسي من state أثناء التصيير)، ومعرّفات المؤقتات تُلغى **وتُصفَّر** في كل مسار إلغاء.
  - **Why:** تنظيف StrictMode المزدوج في dev كان يلغي المؤقتات دون تصفير معرّفاتها، فيعلق حارس `commit` إلى الأبد ويموت التكبير كليًا حتى unmount (اكتُشف باختبار QA حي — التكبير كان مكسورًا في dev منذ البداية). والاعتماد على rAF وحده يقتل التكبير عند تثبيط الإطارات.
  - **How to apply:** أي تعديل على commit/الجدولة في useZoomPan يجب أن يحافظ على: (1) تصفير المعرّف عند كل إلغاء، (2) مسار ارتكاب لا يعتمد على rAF وحده، (3) عدم مزامنة state→ref أثناء التصيير. واختبر الإيماءات حيًّا في dev (StrictMode) لا في build فقط.
- QCF `code_v2` يستخدم Arabic Presentation Forms-A (`U+FCxx`) وليس PUA؛ ومسافات `U+0020` داخل بعض JSON strings تخطيطية وليست glyphs.
  - **Why:** تشخيص CMAP أثبت أن WOFF2→TTF حافظ على الـcmap وglyph IDs؛ فشل التغطية كان من اختبار عامل المسافة كـglyph، لا من الخط.
  - **How to apply:** مرّر string كما هو إلى Text بلا normalization/reshaping؛ اختبارات cmap تتجاوز المسافات، ولا تعيد كتابة الخط أو JSON.
- طبقة Native تستخدم `require.context` من Metro لربط 604 JSON/TTF، ويجب دمج `config.watchFolders` الافتراضية لا استبدالها.
  - **Why:** Expo Doctor يعتبر إسقاط watch folders الافتراضية خطراً، بينما require context يحتاج `unstable_allowRequireContext`.
  - **How to apply:** عند تعديل Metro احتفظ بكل المسارات التي يرجعها `getDefaultConfig`، وأضف workspace root فقط؛ قياس الأسطر على Native يتم عبر `Text.onTextLayout` المخفي عند 100px مع مسافة U+0020 صريحة.
