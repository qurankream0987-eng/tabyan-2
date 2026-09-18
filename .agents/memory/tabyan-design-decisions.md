---
name: Tabyan design decisions
description: Binding UI conventions for the Tabyan app — single Arabic UI font, attempts system, age-free paths. Read before changing styles or placement/path pages.
---

# Tabyan design decisions (as of 2026-08-03)

## Single UI font: IBM Plex Sans Arabic
The user mandated ONE modern Arabic font across the entire app (no exceptions for pages, cards, buttons, modals). All CSS font tokens/classes in `artifacts/tabyan/src/index.css` (font-sans, font-arabic, font-tajawal, font-ruqaa, font-display, font-amiri, font-scheherazade, font-cairo + base html/body/headings/buttons) map to `'IBM Plex Sans Arabic'`. The ONLY exception is `.font-quran` = 'Amiri Quran', reserved for real Quran verse text.
**Why:** explicit user spec (2026-08-03 batch) — "لا تستخدم خطوط مختلفة داخل التطبيق".
**How to apply:** never introduce a new font family or revert a helper class to a legacy face (Cairo/Readex/Amiri/Aref Ruqaa/Scheherazade); Google Fonts import is trimmed to IBM Plex Sans Arabic + Amiri Quran only.

## Placement attempts = 3, shown only when needed
Placement test allows 3 attempts (MAX_ATTEMPTS in Placement.tsx); the attempts pill appears only after the first attempt is consumed; rejection refreshes attempts; error toast is fixed copy "خطأ في إرسال الفيديو، يرجى المحاولة مرة أخرى."
**Why:** user spec — clear attempt system, no confusing messages like "لم تحتسب محاولة".

## تصحيح التلاوة & التجويد paths are age-free
All age-40 gating was removed by user request (backend `recitationEligibility` always eligible, `paths.tajweedCorrection.visible` always true, `reportIneligibleRecitationAttempt` endpoint deleted). Do not reintroduce age checks or 40+ copy anywhere.
**Why:** explicit user spec — "تصحيح التلاوة متاح لجميع الأعمار".

## تحفة الأطفال is optional everywhere
Wherever Tuhfat al-Atfal appears as a level requirement it is marked "(اختياري)"; students complete registration without it.

## نظام الخلفية وألوان النص (2026-08-03)
- خلفية فاتحة: تدرج ناعم (#FBF8F2→#F7F3EB→#F3EDE2 + توهج ذهبي خافت) فقط — حُذفت شبكة المعيّن لاحقاً بطلب المستخدم؛ بلا أنماط/زخارف/جسيمات إطلاقاً (تدرجات ووهج فقط).
- خلفية داكنة: وهج شعاعي (4 طبقات radial) فوق خمري غني، مع تهدئة الأحمر الخمري في الوهج إلى rgba(90,16,30,0.45) وأسطح bg-burgundy الداكنة إلى #47101F (المستخدم اشتكى من "الخمري الأحمر" الفاقع في الداكن).
- **نص الفاتح خمري بالكامل** (#800020، خافت #8F4A5B) — المستخدم عكس قرار "النص الذهبي نهاراً" بطلب لاحق "كل النصوص خمرية بلا استثناء في اللايت مود".
- **نص الداكن أبيض** (2026-08-05، يلغي قرار "النص الداكن ذهبي"): مهمة المستخدم أمرت صراحة — خلفية خمري غني متعدد الدرجات (#2E0D15 خلفية / #42121F بطاقات / #4A1626 ثانوي)، نص أساسي أبيض (#FAF6EF)، ذهبي للمسات فقط (العناوين text-burgundy→gold، الأزرار الأولية، الأيقونات)، تباين عالٍ. muted-foreground الداكن = #CDB49E.
- الاستثناءات الباقية (قواعد غير مُدرجة في الطبقات بنهاية index.css): النص على الأسطح الخمرية يبقى #F2DC92 (خمري على خمري مستحيل)، أزرار الحالة الملوّنة تبقى بيضاء، والنص على الأزرار الذهبية ليلاً يبقى #2B0D12.
- عنوان الترحيب "حياكم الله": خمري متدرج نهاراً، ذهبي متدرج ليلاً (class .hero-greeting).
- **Why:** التباين أولاً — كل استثناء فرضته مراجعة كود بعد فشل مقروئية؛ والقرار الأخير للمستخدم يعلو أي قرار سابق.
- **How to apply:** نص جديد على خلفية فاتحة → خمري؛ على خلفية داكنة → أبيض (#FAF6EF) والذهبي للمسات/العناوين فقط؛ على سطح خمري → #F2DC92. لا تُعد النجوم للخلفية ولا الذهبي لنص الفاتح.

## أسماء مستويات القرآن — قاعدة البيانات هي المرجع (2026-08-03)
- الأسماء القانونية الخمسة من البذور: الغرس، السنبلة، الزرع، الثمرة، الوارثون. كل خريطة واجهة مفهرسة باسم المستوى (QURAN_DETAILS في Levels.tsx، بيانات demo في student-core.ts) يجب أن تطابق اسم DB حرفياً.
- **Why:** عدم تطابق الاسم (النماء/الوارثين قديماً) أسقط البطاقة silently إلى مسار "حجز مباشر" بلا شروط أو زر اختبار — لا خطأ ظاهر، فقط وظيفة مفقودة.
- **How to apply:** عند إعادة تسمية مستوى في البذور، طابق فوراً كل المفاتيح النصية في الواجهة وبيانات demo ونصوص العرض (GuestHome/StudentHome/PathSelection/format.ts/StudentIjazat).

## وحدة الدروس الشرعية (2026-08-04)
- دلالة الإكمال موحّدة عبر الوحدة: اجتياز اختبار مستوى يجعل كل دروسه «مكتملة» في الملخص والواجهة (اتحاد مع صفوف تقدم المحتوى)، لا تقدّم كل درس منفرداً.
- **Why:** الاختبار هو آلية إتمام المستوى المعتمدة؛ لو اعتمد الملخص تقدم الدروس فقط لظهر للطالب 0% رغم اجتيازه الاختبار.
- **How to apply:** أي عدّاد/نسبة/شارة اكتمال في وحدة sharia يجمع المصدرين (shariaExamAttempts.passed + shariaContentProgress).
- أي mutation يستقبل contentId من العميل (تقدم/إشارة مرجعية) يتحقق أولاً أن المحتوى منشور وضمن مسار وحدته (نمط assertPublishedShariaContent: innerJoin levels.path + status=published) قبل أي كتابة.
- **Why:** بلا الحارس تُزرع صفوف تقدم لمحتوى عشوائي/غير منشور فتتلوث الإحصاءات وتتجاوز حدود الوحدة — اكتشفته مراجعة الكود.

## ممنوع تأثيرات الضغط الدائرية (2026-08-05)
- المستخدم أمر بإزالة كل Ripple/موجات الضغط من التطبيق كاملاً وبلا بديل. حُذفت useGoldenRipple من IslamicBg.tsx وأنماط .islamic-press-ripple و.btn-bubble::after. المسموح: hover، scale، انتقالات ناعمة، focus/active/disabled.
- **Why:** مواصفة صريحة — "التطبيق يجب أن يبدو نظيفاً وفاخراً بلا موجات".
- **How to apply:** لا تُضف أي click/tap animation دائرية أو ink/touch ripple لاحقاً؛ عند إضافة مكوّن تفاعلي جديد، اقتصر على hover/scale/focus.

## بطاقات التطبيق وكتاب الفقه المعتمد (2026-08-05)
- كل البطاقات تستخدم حدّاً خمرياً رقيقاً في الوضع الفاتح وذهبياً رقيقاً في الداكن، بلا شريط زخرفي علوي أو pseudo accent. الخطوط الداخلية الوظيفية مثل التقدم وخطوات الاختبار مسموحة.
- كتاب الفقه المعتمد هو «منظومة القواعد الفقهية» للشيخ عبد الرحمن بن ناصر السعدي، ويجب أن يظهر بهذا الاسم والمؤلف في البذور وبيانات العرض التجريبي.
- **Why:** مواصفة المستخدم الصريحة في مهمة 15 وتصحيح مباشر للمنهج.
- **How to apply:** لا تُعد أشرطة accent للبطاقات؛ عند تحديث مكتبة الفقه حافظ على الكتاب المعتمد نفسه.

## ربط القرآن بالعقيدة + قواعد الترقية (2026-08-05)
- كل مستوى قرآني مربوط بمتطلب عقيدة إلزامي (levels.aqeedah_level_id): الغرس←تلقين العقيدة، السنبلة←منظومة البيضاء، الزرع←الأصول الثلاثة، الثمرة←سلم الوصول ج1، الوارثون←سلم الوصول ج2. المستوى القرآني لا يُكتمل قبل اكتمال متطلبه (تقدم مكتمل أو اختبار مجتاز)، ونسبة الإتمام الكلية لا تبلغ 100% حتى يكتمل قرآن+عقيدة+تقييمات.
- الترقية للمستوى التالي مباشرة فقط وضمن المسار نفسه (submitPromotion يفرض orderIndex+1 ويشتق المصدر من الخادم) — مراجعة الكود أغلقت قناة قفز المستويات.
- بنية الدروس الشرعية (محدّثة 2026-08-06): فرعان للعقيدة — إلزامي مرتبط بالقرآن `name_en=aqeedah_quran` (5 مستويات: منظومة تلقين العقيدة/البيضاء/الأصول الثلاثة/سلم الوصول ج1/ج2؛ بوابته levels.aqeedah_level_id بلا تغيير) واختياري مستقل `name_en=aqeedah` (4: ثلاثة الأصول/القواعد الأربع/الواسطية/كتاب التوحيد، بلا اختبارات قبول) + فقه 1 (منظومة القواعد الفقهية) + سيرة 1 (الرحيق المختوم). المواد جدول DB (sharia_subjects) وتُدار من /admin/sharia؛ بطاقات الطالب مبسطة (أيقونة+عنوان) ومصدرها الخادم مع احتياط shariaMeta؛ إدارة المستويات من /admin/levels وإعادة ترتيبها من /admin/sharia.
- **Why:** مواصفة المستخدم الصريحة؛ القرار الأحدث يعلو.
- **How to apply:** أي تغيير يمس اكتمال المستويات أو نسب التقدم يجب أن يحافظ على البوابة؛ بذور sharia تُعاد بـ seed-tabyan.mjs ثم يُعاد توليد demo بـ lib/db/gen-sharia-demo.mjs.

## إخفاء إداري بلا حذف بيانات (2026-08-11)
«إجازة حفص» و«إتقان التجويد» و«تصحيح التلاوة» تبقى في قاعدة البيانات ومنطق الطالب، لكنها تُفلتر من واجهات الإدارة فقط (AdminLevels/AdminSchedules)؛ مستويات التجويد تُعرض إدارياً وطلابياً بأسماء «المستوى الأول/الثاني/الثالث» عبر خرائط عرض، والأسماء الأصلية محفوظة في DB.
**Why:** طلب صريح — إزالة من شاشات الإدارة فقط دون المساس بسجلات الطلاب أو الـ schema.
**How to apply:** أي إخفاء مستقبلي لمستوى/خيار يتم بفلترة عرض في الواجهة، لا بحذف صفوف أو تعديل seed.

## مصدر «جل جلاله» و«ﷺ» في السبلاش (2026-08-12)
العبارتان لم تكونا نصاً في JSX إطلاقاً؛ كانتا حرفَي ليغاتشر يونيكود U+FDFB (جل جلاله) وU+FDFA (ﷺ) محقونين عبر CSS pseudo-elements `::before`/`::after` بخاصية `content` على `.splash-verse-text` في SplashScreen.css. البحث النصي في ملفات TSX لا يجدهما.
**Why:** استغرق اكتشافهما ثلاث رسائل من المستخدم لأن grep على النص العربي المكتوب لا يطابق الليغاتشر المفرد.
**How to apply:** عند البحث عن نص ظاهر «غير موجود» في المصدر، افحص CSS `content` والليغاتشرات اليونيكودية (FDFA-FDFB وأمثالها) قبل افتراض أنه من صورة أو بناء قديم.

## عارض المصحف: صور KSU الحقيقية عبر وكيل الخادم (2026-08-12)
العارض يعرض صور صفحات مصحف الملك فهد الممسوحة من KSU (png_big، 622×917، النسبة 622/917) بدل إعادة بناء النص. لا فلاتر/قلب ألوان في الوضع الداكن؛ السحب يمين→يسار=التالية.
**Why:** مصدر KSU (quran.ksu.edu.sa) لا يرسل ترويسة CORS، فيتعذّر على المتصفح جلب الصور كـ blob للتخزين دون اتصال — رغم أن `curl` ينجح لأنه يتجاهل CORS. `<img src>` المباشر يعرض فقط دون تخزين.
**How to apply:** الصور تُبثّ عبر وكيل في api-server على `/api/mushaf/page/{n}.png` (جلب خادم→خادم بلا CORS) فيصبح نفس الأصل، فيعمل العرض + Cache API للقراءة دون اتصال معًا. الواجهة تستعمل `${BASE_URL}api/mushaf/page/...`. أي مصدر صور خارجي بلا CORS يحتاج وكيلاً مماثلاً.

## سياسة ملاءمة المصحف للشاشة (قرار معتمد رسميًا 2026-08-22)
- MOBILE PORTRAIT (<768px) = MOBILE FILL MODE: العرض يملأ الشاشة (هامش 10px) والارتفاع يملأ مساحة القراءة بين الشريطين؛ الـ15 سطرًا تتوزع عموديًا (rowH يتنفس) وحجم الخط مشتق من العرض فقط — ممنوع فرض نسبة 622/917 على الهاتف العمودي. المكتبي/الأفقي (≥768px): النسبة المطبوعة محفوظة مع سقف 560px.
- **Why:** المستخدم أصدر مهمة P0 تشخيصية (STOP IMPLEMENTATION) ثم اعتمد القرار A صراحةً بعد أن أثبت التقرير أن المعمارية سليمة؛ مراجع إغلاق آلي كان قد أجبر العودة لـ622/917 وألغى المستخدم ذلك الاعتراض رسميًا.
- **How to apply:** القرار موثق داخل تعليق `computeMushafPageFit` في `pages.ts` وداخل `pages.test.ts` — أي تعديل يعيد فرض النسبة على الهاتف يخالف قرارًا معتمدًا. حجم الخط يُقاس على أعرض سطر (canvas) ويبقى ثابتًا مهما تنفّس rowH.

## Mushaf reader chrome behavior (final)
- Reader bars (top/bottom) are toggled DETERMINISTICALLY by a tap/click on the page area — no auto-fade timers. **Why:** timer-based fade caused pointer-event interception (bars faded to pointer-events:none mid-click) and flaky UX; several timer variants failed e2e before the timerless design passed.
- **How to apply:** tap toggling uses the native `click` event on `.mushaf-page-area` plus a `suppressClickRef` flag set after any real drag/pinch, so gestures never toggle bars. Don't reintroduce fade timers.
- Testing note: fade/visibility must be measured on the parent `.mushaf-bar-*` container (class `mushaf-bar--visible` / computed opacity), not on children — children always compute opacity 1.

## قواعد المصحف وبطاقة الواجب (2026-08-12)
- المصحف مستقل عن الثيم: خلفية ورقية ثابتة في الوضعين، نص الآيات أسود دائماً (صورة بلا أي filter)، وممنوع أي إطار/ظل/زوايا حول الصفحة. **Why:** طلب المستخدم إحساس «تطبيق مصحف حقيقي» لا بطاقة داخل تطبيق.
- نصوص واجهة المصحف ذهبية في الوضعين (ذهبي معمّق نهاراً للقراءة فوق الورق، ساطع ليلاً). **Why:** هوية ثابتة لا يبدّلها الثيم.
- زر «ادخل إلى الحلقة» خمري ثابت في الوضعين — لا تستخدم له فئة bg-burgundy لأن قاعدة dark تقلبها ذهبية. **Why:** المستخدم طلب ثبات لون الزر صراحة.
- ألوان العلامة (burgundy/gold/night/maroon/cream/success…) مسجّلة في `@theme inline` في index.css (2026-08-16) — كل variants والشفافيات (dark:bg-gold، bg-burgundy/10، from-burgundy…) تعمل. **أي لون علامة جديد يجب تسجيله في @theme وإلا كانت فئاته المركّبة ميتة بصمت.** القلب الليلي للفئات اليدوية يتم عبر متغيرات --burgundy-bg/--burgundy-text/--night-surface في .dark (لا overrides بنوع .dark .bg-burgundy — كانت unlayered فتسحق dark:bg-gold المولّدة). **Why:** قبل التسجيل كانت مئات الفئات ميتة فكسر الداكن والتدرجات والأفاتار. ووضع bg-gold/x مع text-gold على العنصر نفسه يفرض عليه الخمري نهاراً. **Why:** قاعدة CSS عامة للوضع النهاري تستهدف [class*="bg-gold/"].
