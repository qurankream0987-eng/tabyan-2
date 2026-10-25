# QURAN.COM ECOSYSTEM REUSE AUDIT — TABYAN

**تاريخ المراجعة:** 2026-10-11 إلى 2026-10-12 — Asia/Riyadh.  
**النطاق:** تدقيق مرجعي انتقائي للمستودعات التسعة، وملفات مصدر محددة، والتراخيص، وعقد Content API. ليس مراجعة لكل سطر أو تدقيقًا قانونيًا شاملًا.  
**الطريقة:** قراءة GitHub العامة وملفات منفردة؛ فحص ثابت لملفي خط صغيرين باستخدام FontTools المتاح محليًا. لا تشغيل للمشاريع الخارجية أو اتصالات بـContent API، ولا تثبيت حزم أو GPU أو قواعد بيانات أو نشر.

> بوابة القرار: ملف عام ≠ أصل مرخّص لإعادة الاستخدام. ترخيص مكتبة العميل لا يمنح حقوق بيانات القرآن أو التفسير أو التسجيلات أو الخطوط. `VERIFIED` يعني أن الدليل المحدد تمت مراجعته، وليس أن جميع محتويات المستودع مرخّصة بالترخيص نفسه.

## 1. Executive Summary

- **خط أسماء السور موجود، لكن إعادة استخدامه غير معتمدة.** مستودع الخطوط لا يعلن ترخيصًا عامًا أو خاصًا بمجلد أسماء السور، ولا تحتوي سجلات أسماء الملفين المفحوصين على ترخيص. النتيجة: **FONT LICENSE: UNVERIFIED / REUSE: BLOCKED**.
- يوجد **أصلان مختلفان بترميزين غير متوافقين**: `surah_names.ttf` في مستودع الخطوط، و`sura_names.ttf` في الواجهة الحديثة. الأول أيقونات PUA؛ الثاني يحتوي ligatures للأرقام الثلاثية. ليست عملية استبدال ملف خط فقط.
- `quran/api-js` يملك ترخيص MIT مثبتًا، و`quran-ios` يملك Apache-2.0 مثبتًا. يمكن الاستفادة من المكتبة أو الأفكار ضمن شروطها؛ لا حاجة إلى تثبيت أي منهما في هذه المرحلة.
- لدى تبيان بالفعل **مصحف ونسخة كلمات محلية مشتقة من QDC**، بينما مسارا التسميع الخلفي وآية اليوم يستخدمان `alquran.cloud`. لا يصح وصف كل مصادر القرآن الحالية بأنها تكامل QDC مباشر واحد.
- مصدر الصوت الحالي في Web هو **EveryAyah MP3**. أفضل فرصة قريبة: تحسين إدارة الفشل والتخزين والتشغيل، دون تغيير المزوّد أو اشتقاق روابط Opus غير مثبتة.
- يوجد Tajweed في عقد Content API الإنتاجي، لكن التدقيق لم يثبت مراجعة علمية أو حقوق البيانات. **TAJWEED: PARTIAL**؛ المستودع التجريبي **RESEARCH ONLY**؛ التقييم الآلي لتجويد الطلاب **DO NOT USE**.
- لا نسخ GPL، ولا تغيير للنص أو QCF أو المزوّد أو المصادقة أو هوية تبيان. التعديل السابق لترويسة Amiri المحلي منفصل عن هذا التدقيق، ولم تُستأنف اختبارات قبوله هنا.

## 2. Repository Inventory

القيمة `size` من GitHub تقريب لحجم المستودع وتاريخه، وليست حجم تنزيل مطلوبًا. استُخدمت فقط لتجنب النسخ الكبير.

| المستودع / الفرع المفحوص | حجم GitHub التقريبي | ما روجع فعليًا | النتيجة |
|---|---:|---|---|
| `quran.com-frontend-next` / `production` | 5,611,713 KB | README، package.json، قوائم مكونات DLS/القارئ/الصوت، ChapterTitle، ChapterIconContainer، ChapterIcon، ReaderTopActions، والخط الحالي | مرجع بنيوي وتفاعلي؛ ليس منتجًا للنسخ |
| `quran.com-fonts` / `master` | 97,306 KB | README، package.json، شجرة الملفات، مجلد أسماء السور، TTF | الأصل موجود؛ الحقوق غير مثبتة |
| `api-js` / `main` | 2,923 KB | README وLICENSE؛ ملفات client/verses/create-public-client | MIT مثبت للكود؛ لا اعتماد جديد |
| `qf-api-docs` / `main` | 24,796 KB | README، دليل auth matrix/public quickstart، عقد `openAPI/content/v4.json` | مرجع للعقد والحقول فقط |
| `audio.quran.com` / `main` | 119,434 KB | README، AudioPlayer.svelte، audio-url.js، stores/audio.js، قائمة مسارات التنزيل/القرّاء | مرجع للتنسيق البديل والطابور |
| `tajweed` / `master` | 589 KB | README، قائمة قواعد Java والـexporters | تجريبي وغير مكتمل حسب مؤلفيه |
| `ayah-detection` / `master` | 98 KB | README وقائمة أدوات الآيات والأسطر وفحص الأخطاء | مرجع اختبارات؛ ليس سلطة إنتاجية |
| `quran-ios` / `main` | 676,061 KB | README وLICENSE، طبقات Features/Domain، AyahMenuViewModel، QuranInteractor، QuranAudioDownloader، AudioInterruptionMonitor | أنماط معمارية مناسبة للتحويل إلى Expo |
| `quran_android` / `main` | 22,015 KB | README، LICENSE، التنبيه التجاري وحقوق البيانات | مرجع سلوكي فقط؛ نسخ الكود محظور في هذا التدقيق |

كل المستودعات التسعة كانت غير مؤرشفة عند قراءة بيانات GitHub. لم يُنسخ أي مستودع أو يُشغّل.

## 3. License Matrix

`N/A` يعني أن الأصل المحدد ليس من ذلك النوع؛ **لا يعني وجود ترخيص لبيانات أخرى داخل المستودع**. بيانات وخطوط كل مزوّد تحتاج إثباتًا مستقلًا. عند `UNVERIFIED` لا يجوز الافتراض أن الاستخدام التجاري أو التعديل أو إعادة التوزيع مسموح.

| REPOSITORY / FILE-ASSET | CODE LICENSE | DATA LICENSE | FONT LICENSE | COMMERCIAL USE | ATTRIBUTION REQUIREMENT | DERIVATIVE REQUIREMENT | STATUS / القرار |
|---|---|---|---|---|---|---|---|
| frontend: مكونات القارئ وDLS | MIT معلن في package.json، لكن لا LICENSE جذرية في القائمة المفحوصة، وREADME يرفض نسخ المشروع/الكود | UNVERIFIED | UNVERIFIED للأصول | غير معتمد للنسخ في هذا التدقيق؛ يلزم توضيح التعارض والنطاق | شروط MIT المعتادة إذا ثبت انطباقه؛ نطاق حقوق الأصول غير مثبت | لا استنتاج من الشارة؛ لا نقل مباشر | UNVERIFIED لبوابة النسخ؛ REFERENCE ONLY |
| fonts: `public/fonts/surah_names/*` | لا ترخيص معلن للملفات التي روجعت | N/A | UNVERIFIED؛ لا sidecar خاص بهذا المجلد | UNVERIFIED | UNVERIFIED | UNVERIFIED؛ لا تحويل/تجزئة/إعادة توزيع قبل الإثبات | BLOCKED |
| frontend: `public/fonts/quran/surah-names/v1/*` | إعلان MIT للكود لا يثبت حق الخط | N/A | UNVERIFIED؛ لا سجل ترخيص داخل TTF المفحوص | UNVERIFIED | UNVERIFIED | UNVERIFIED | BLOCKED |
| api-js: ملفات SDK المفحوصة وLICENSE | **MIT — VERIFIED** | حقوق الاستجابات ليست مشمولة بترخيص SDK | N/A | الكود: مسموح وفق MIT؛ بيانات وخدمة API: تحقق مستقل | إبقاء إشعار copyright ونص MIT مع النسخ الجوهرية | لا copyleft؛ المحافظة على الإشعارات | REUSE NOW قانونيًا للكود فقط؛ اعتماد فعلي مؤجل |
| qf-api-docs: دليل SDK وعقد v4 | لا LICENSE جذرية في القائمة المفحوصة؛ UNVERIFIED لنسخ الوثائق/العقد كاملًا | UNVERIFIED لكل translation/tafsir/reciter/resource | N/A | لا إثبات شامل؛ صلاحية الوصول لا تساوي حق إعادة التوزيع | تحقق خاص بالمصدر/المورد | تحقق خاص؛ العقد مرجع لا نسخة مستوردة | REFERENCE ONLY؛ البيانات BLOCKED قبل مراجعة الحقوق |
| audio: ملفات المشغّل وURL والطابور | لا LICENSE جذرية في القائمة المفحوصة؛ UNVERIFIED | تسجيلات القرّاء وحقوق الاستضافة UNVERIFIED | N/A | UNVERIFIED | تحقق بحق كل قارئ/تسجيل | UNVERIFIED للكود والتسجيلات | REFERENCE ONLY؛ الروابط/المحتوى BLOCKED |
| tajweed: README ومجموعة القواعد/المخرجات | لا ترخيص عام مثبت في الجذر؛ لم تُراجع كل رؤوس ملفات Java | بيانات التجويد الناتجة UNVERIFIED | N/A | UNVERIFIED | UNVERIFIED | UNVERIFIED | RESEARCH ONLY؛ نسخ الخوارزمية أو البيانات BLOCKED |
| ayah-detection: أدوات الكشف المشار إليها في README | لا ترخيص عام مثبت في الجذر؛ UNVERIFIED | الصور والقوالب ومواضع الآيات UNVERIFIED | N/A | UNVERIFIED | UNVERIFIED | UNVERIFIED | REFERENCE ONLY؛ لا استيراد للأدوات/المخرجات |
| iOS: ملفات الطبقات المفحوصة وLICENSE | **Apache-2.0 — VERIFIED** | بيانات القرآن والصور والصوت ليست مثبتة بهذا التدقيق | N/A | الكود: مسموح وفق Apache؛ البيانات تحتاج تحققًا | LICENSE، الإشعارات القائمة، وNOTICE إذا وجد وكان منطبقًا | توضيح التعديلات والمحافظة على الإشعارات؛ لا copyleft عام، ولا حق بالعلامة التجارية | ADAPT أفكارًا مستقلة؛ لا Swift منسوخ |
| Android: الكود وREADME وLICENSE | **GPL-3.0 — VERIFIED** | README يذكر تراخيص متعددة، غالبًا CC BY-NC-ND، وليست موحدة | UNVERIFIED للأصول | GPL نفسه يسمح بالاستخدام التجاري؛ README يطلب عدم الربح، والبيانات قد تمنعه. مراجعة قانونية لازمة | إشعارات GPL ومؤلفي البيانات حسب المورد | توزيع الأعمال المشمولة/المشتقة يستلزم التزامات GPL وCorresponding Source؛ لا تعميم على التعديلات الخاصة غير الموزّعة | BLOCKED للنسخ إلى تبيان؛ REFERENCE ONLY للسلوك |

**تنبيه مهم:** وجود OFL خاص بـMontserrat أو ترخيص Symbolset داخل مستودع الخطوط لا يرخّص خط أسماء السور. كذلك لا تنطبق MIT الخاصة بالـSDK على نص تفسير أو تسجيل قارئ أو خط.

## 4. Surah Font Analysis

### 4.1 الأصل المطلوب في مستودع الخطوط

المسار المثبت: `quran/quran.com-fonts/public/fonts/surah_names/`.

| الملف | الصيغة | الحجم في قائمة GitHub |
|---|---|---:|
| `surah_names.ttf` | TrueType | 149,148 bytes |
| `surah_names.woff` | WOFF | 149,224 bytes |
| `surah_names.eot` | Embedded OpenType قديم | 149,312 bytes |
| `surah_names.svg` | SVG font قديم | 406,583 bytes |

- فُحص TTF وحده؛ لم تُنزّل حزمة الخطوط أو ملف SVG.
- اسم العائلة الداخلي: `icomoon`.
- يحتوي cmap على **118 إدخالًا**: 115 رمز PUA متصلًا من `U+E900` إلى `U+E972`، بالإضافة إلى NUL وU+0001 والمسافة.
- ليس خطًا لكتابة أسماء السور كنص عربي عام؛ لا GSUB في هذا الملف.
- العدد يتوافق بنيويًا مع 114 اسمًا ورمز إضافي، **لكن الهوية العربية وترتيب كل رمز في هذا الأصل القديم لم يُثبتا بصريًا أو بجدول مصدر دلالي**. لا نعتمد تلقائيًا معادلة `E900 + رقم السورة` للإنتاج.
- لا سجلات ترخيص أو copyright أو license URL في سجلات `name` المفحوصة. غيابها لا يثبت انعدام الملكية؛ يعني عدم وجود تصريح كافٍ للاستخدام.
- اسم IcoMoon لا يثبت هوية صاحب رسوم الخط أو حق إعادة توزيعها؛ المصدر الأصلي للرسوم يحتاج توثيقًا.
- SHA-256: `b44bca9a268fd4c4fce216028111da2568d3c58d56e211238f8cef420da72337`.

### 4.2 الأصل المستخدم في واجهة Quran.com الحديثة

المسار: `quran/quran.com-frontend-next/public/fonts/quran/surah-names/v1/`.
الملفات الموجودة: `sura_names.ttf`، `.woff`، `.woff2`، `.eot`.

- TTF المفحوص: **154,900 bytes**، اسم داخلي `sura_names`.
- ليس الملف القديم: تختلف البصمة وcmap وجدول `glyf`.
- توجد خاصية OpenType **`liga`**. أثبت الفحص الثابت وجود **114/114** ligatures للأرقام ASCII الثلاثية: `001` حتى `114`، دون فقدان أي رقم.
- أمثلة مثبتة: `001 → uniE001`، `010 → uniE010`، `018 → uniE018`، `100 → uniE100`، `114 → uniE114`، و`surah → uniE000`.
- `ChapterIcon/index.tsx` يطبع `id.padStart(3, '0')`؛ و`ChapterIconContainer` يطبق عائلة `surahnames` ويضيف رمز `surah` اختياريًا. الترويسة الحالية تستخدم `hasSurahPrefix={false}`.
- **لا تستخدم زيادة حسابية بسيطة على U+E001:** اسم glyph يعكس الرقم العشري الثلاثي؛ مثلًا `010` لا يساوي `E001 + 9`. يفضَّل token المثبت أو جدول صريح مستخرج ومراجع من GSUB.
- التغطية التقنية ومطابقة آلية الاستدعاء في المصدر **VERIFIED**؛ مراجعة الهوية البصرية العربية لكل اسم واختبار العرض ليستا منفذتين هنا.
- الترخيص الخاص بالخط **UNVERIFIED** أيضًا؛ إعلان MIT في package.json لا يكفي لإثبات حقوق الأصل الخطّي.
- SHA-256: `6caa808e10abc7e5d93ef45815e50ecf53287ceb010d3216266e49e44871e673`.

### 4.3 مقارنة تبيان والتوافق

| النقطة | تبيان المحلي | خط Quran.com المتخصص |
|---|---|---|
| العنوان | نص عربي حي كامل، `سُورَةُ` + الاسم | أسماء مرسومة مسبقًا، عبر رموز/ligatures |
| الخط الحالي قيد التعديل السابق | Amiri Regular محلي، OFL-1.1، محصور بالترويسة | الحقوق غير مثبتة؛ الدمج BLOCKED |
| الإتاحة والنسخ | نص عربي مفهوم وقابل للنسخ | يلزم اسم عربي مستقل للقارئ الآلي والنسخ؛ لا تعريض `001` للمستخدم |
| مرونة الأسماء/اللغات | خط نصي عام | قائمة glyphs محددة؛ لا يعمل كخط عربي عام |
| قربه البصري من المرجع | Naskh تقليدي عام؛ قبول بصري سابق لم يُثبت بعد | مرشح متخصص؛ لا ادعاء بتطابق بصري دون عرض ومراجعة |
| Web | يعمل بـTTF محلي وقياس ink | TTF/WOFF متوافقان عمومًا؛ frontend يوفّر WOFF2 أيضًا؛ يلزم إثبات ligature/bidi/تحميل الخط |
| Native | لا قارئ QCF Native قائم مطلوب استبداله | TTF قابل للتسجيل نظريًا عبر Expo؛ تشغيل ligatures والإتاحة يحتاج اختبار iOS/Android. WOFF/EOT/SVG ليست بدائل Native مباشرة |

**مقترح دمج مشروط، وليس إذن تنفيذ:** بعد إثبات حقوق الملف المحدد، تسجيل عائلة محلية مستقلة لـSurah header فقط، وضبط token الثلاثي و`liga`/bidi، مع اسم عربي canonical للإتاحة والنسخ. انتظار تحميل الخط قبل قياس ink، ثم التحقق من 114 اسمًا والعروض المطلوبة والترويسة/البسملة، دون تغيير QCF. Native ليس مطلوبًا الآن ولا يُعاد فتح قارئه لهذا السبب.

للمتصفحات الحديثة، TTF/WOFF هما الخياران المتاحان في المستودع القديم؛ WOFF2 موجود في أصل الواجهة الحديثة فقط ضمن القوائم المفحوصة. EOT خاص بالمتصفحات القديمة، وSVG font ليس اختيارًا حديثًا موثوقًا. هذه قابلية تنسيق عامة وليست نتيجة اختبار الملف على كل متصفح أو جهاز.

## 5. Quran Reader UX Patterns

مقارنة ثابتة للمصدر؛ ليست نتيجة اختبار استخدام أو قياس مرئي على الأجهزة.

| QURAN.COM PATTERN / دليل | TABYAN CURRENT / دليل محلي | GAP | SAFE ADAPTATION |
|---|---|---|---|
| إجراءات أعلى القراءة حسب وضع العرض؛ ReaderTopActions/ChapterTitle | MushafReader ينسق أدوات القراءة والجلسة | كثرة حالة الأدوات داخل orchestrator كبير | فصل حالة chrome عن حالة جلسة التسميع تدريجيًا؛ لا تغيير ترتيب أسطر الصفحة |
| SidebarNavigation وقراء حسب Chapter/Page/Juz/Hizb/Rub | MushafIndexSheet ومعلومات السور/الأجزاء وصفحات المصحف | تغطية تنقل Hizb/Rub وأوضاعه تحتاج مقارنة متطلبات، لا افتراض فقد كل التنقل | إضافة خيارات مثبتة بالبيانات فقط؛ الحفاظ على الصفحة canonical |
| ContextMenu وVerseActionModalContainer | AyahActionSheet: الاستماع، علامة صفحة، التسميع، الاختبار، الأخطاء، مشاركة الموضع | العلامة هنا صفحة وليست آية؛ التفسير غير موجود صراحة | الإبقاء على المعنى الحالي؛ تصميم علامة آية/تفسير كميزة منفصلة بعد اعتماد المصدر |
| AudioPlayer/RepeatAudioModal/AudioRepeatManager | useAudioPlayer وMushafAudioBar يدعمان التكرار واختيار القارئ والتقدم | فصل أوضح للطابور/النطاق/الفشل؛ لا إعادة بناء ما يعمل | استخراج عقود queue/repeat/error واختبارات محدودة قبل أي إضافة |
| TafsirView وTranslationView وإعداد مواردها | لا بيانات تفسير في AyahActionSheet؛ لا زر تفسير وهمي | مصدر المحتوى والحقوق وUI غير مكتملة | sheet جانبي فقط بعد مراجعة المورد؛ لا إعادة رسم QCF أو placeholders |
| SettingsDrawer بأقسام القارئ/الخط/القارئ الصوتي/الكلمة | ReaderToolsSheet وRecitationSessionSettingsSheet وأوضاع الحفظ | احتمال خلط تفضيلات القراءة بإعداد الجلسة | فصل إعدادات القراءة عن ضوابط التسميع؛ عدم تغيير عقد GENERAL/EDUCATIONAL |
| مكونات Search وCollection/MyQuran | MushafSearchSheet مع فهرس قرآن محلي وbookmarks مرتبطة بالحساب | لا مقارنة runtime للميزات أو المزامنة | إعادة استخدام البحث المحلي الموجود؛ لا خدمة بحث مكررة ولا OAuth جديد |
| استجابة عنوان السورة عبر useIsMobile، ومكونات DLS مشتركة | title fitting وsheets قائمة بالفعل | تغطية الحالات والتوثيق أهم من نسخ شكل الموقع | fixtures محلية محدودة لمقاسات وحالات RTL، بألوان تبيان |

### درس DLS وخريطة المكونات

README يقر بأن اعتبار كل مكوّن فريدًا أضر بقابلية التوسع، ويطلب وضع القطع العامة في DLS مع stories. تبيان لديه مكونات منفصلة بالفعل؛ لا داعي لإعادة تسمية جماعية أو نسخ التصميم.

| الواجهة المقترحة | نقطة البداية في تبيان | حدّ المسؤولية |
|---|---|---|
| QuranToolbar | أدوات MushafReader وReaderToolsSheet | العرض والأحداث فقط؛ لا تغيير matcher أو المصادقة |
| SurahHeader | SurahHeaderFrame | الاسم والإطار والقياس فقط، خارج خط جسم القرآن |
| AyahActions | AyahActionSheet | إجراءات فعلية بمفاتيح canonical |
| QuranNavigator | MushafIndexSheet | سورة/جزء/صفحة ومطابقة الصفحة الموثقة |
| AudioControls | MushafAudioBar + useAudioPlayer | حالة تشغيل/تكرار/قارئ وفشل صريحة |
| ReaderSettingsSheet | إعدادات القراءة الحالية | تفضيلات قراءة مستقلة عن واجبات الطالب |

هذه حدود وظيفية مقترحة، لا ضرورة لفرض هذه الأسماء أو تغيير هيكل المنتج في هذا التدقيق.

## 6. Quran API Opportunities

### الوضع الحالي المثبت

- `public/mushaf/quran-words/manifest.json`: مصدر **Quran Foundation QDC**، endpoint `api.qurancdn.com/api/qdc/verses/by_page/{page}`؛ query يتضمن `text_uthmani,code_v2,line_v2`.
- `download-mushaf.mjs`: نقل glyphs الرسمية دون تعديل. `canonicalWords.ts` يحمل ملفات صفحات محلية ذات إصدار محفوظ، ويفهرس النص للتسميع/البحث.
- `SURAHS` المحلي يوفّر metadata الأساسية؛ فهرس البحث محلي. لا ضرورة لطلبات API لتكرار هذين المصدرين.
- `lib/tabyan-trpc/src/routers/recitation.ts` و`daily-verse.ts`: يستخدمان `https://api.alquran.cloud/v1`. لا يُستبدلان في هذا التدقيق.

| القدرة | عقد Content v4 المفحوص | الوضع/الفرصة في تبيان |
|---|---|---|
| metadata السور | `/chapters`، `/chapters/{id}`، `/chapters/{id}/info` | الأساسي محلي بالفعل؛ المعلومات الموسعة فقط مرشح جديد |
| حدود الصفحة | `/pages`، `/pages/lookup`، `/pages/{page_number}`، `/verses/by_page/{page_number}` | مرجع تحقق ثانوي؛ ليست سلطة لاستبدال مصحف تبيان |
| Juz/Hizb/Rub | `/juzs`، `/hizbs`، `/rub_el_hizbs` ومسارات `/verses/by_*` | توسيع تنقل مشروط؛ لا تجلب ما توفره النسخة المحلية |
| كلمات الآية | `words=true` و`word_fields` و`fields` في `/verses/by_*` | مقارنة عقدية/اختبارات فقط؛ snapshot الكلمات موجود |
| الترجمة | `/resources/translations`، `/translations/{resource_id}/by_ayah/{ayah_key}` | ميزة إضافية بعد تدقيق المورد والترخيص والإتاحة |
| التفسير | `/resources/tafsirs`، `/tafsirs/{resource_id}/by_ayah/{ayah_key}` | مرشح جديد؛ لا زر بلا محتوى ولا نسخ غير مرخّص |
| قرّاء الآيات | `/resources/recitations` و`/recitations/{recitation_id}/by_*` | لا تبديل EveryAyah؛ IDs ليست IDs قارئ السورة |
| قرّاء السور/توقيتها | `/resources/chapter_reciters` و`/chapter_recitations/{reciter_id}/{chapter_number}?segments=true` | مرشح مزامنة صوت قارئ مع الكلمات بعد مراجعة الحقوق والتوقيت |

**ليست drop-in migration:** QDC القديم يستخدم حقولًا مثل `line_v2`؛ العقد الجديد يصف `line_number` ويتيح `mushaf`. `page_number` قد يتبع مصحفًا آخر ويتجاوز 604؛ لا تربطه تلقائيًا بخط QCF v2. ثبّت رواية حفص/layout الموافق و`v2_page` قبل مقارنة، ولا تعيد ترقيم أو تنظيف quirks المصدر.

SDK مرشح منخفض المخاطر قانونيًا للكود، لكنه ليس ضرورة تقنية حالية. دليل auth يقرر أن Content/Search يحتاجان backend/server integration، وأن أسرار confidential client لا تدخل Web/Native. Public PKCE في الدليل يتعلق بعائلات أخرى ولا يعني إمكان جلب Content بلا backend. يلزم فحص الصلاحيات والحدود والتكلفة قبل أي إعداد حقيقي. **لا حساب Quran Foundation بديلًا لتسجيل الدخول في تبيان**.

### Word-level candidate fields فقط

| الحقل | ما قد يفيده | بوابة الأمان |
|---|---|---|
| `verse_key`, `position`, `location` | تحديد الآية/الكلمة وإجراءاتها واختبارات الربط | تحقق من ترتيب/قاعدة index والهوية؛ لا تغيير matcher |
| `text_uthmani`, `text_imlaei` | مقارنة corpus والفهرسة | لا تستبدل displayText/normalization الحالية أو تمزج رسمين |
| `char_type_name` | فصل الكلمة عن علامة نهاية الآية | احفظ quirks النسخة الحالية؛ لا إصلاح تلقائي |
| `code_v2`, `v2_page`, `line_number`, `page_number` | اختبار سلامة glyph/font/السطر | مطابقة مصحف وخط وإصدار؛ لا تحديث QCF |
| `audio_url` للكلمة | مثال نطق أو مزامنة قارئ | حقوق صوت وتحميل مستقل؛ ليس دليل تسميع الطالب |
| `timestamps[].segments` | karaoke للقارئ، `[word_index,start_ms,end_ms]` | العقد يذكر milliseconds؛ تحقق من المؤشرات والحدود. `duration` قد يكون سالبًا في بيانات قديمة |
| `translation`, `transliteration` | شرح كلمة اختياري | مورد مرخّص، وإتاحة مستقلة عن جسم المصحف |

صوت القارئ وتوقيت تشغيله **لا يثبتان أن الطالب نطق الكلمة**؛ لا يُستخدمان لتجاوز ASR أو رفع مؤشر نجاح التسميع.

## 7. Audio Opportunities

| موضوع | الدليل الخارجي | تبيان الحالي | التوصية |
|---|---|---|---|
| Opus/MP3 | audio-url.js يستخدم `canPlayType('audio/ogg; codecs=\"opus\"')`؛ AudioPlayer يعطّل Opus للجلسة ويرجع إلى MP3 عند الخطأ | EveryAyah MP3؛ لا دليل على أصل Opus مطابق | ADAPT لمبدأ capability/fallback فقط، إذا وُجد مصدر بديل مثبت |
| روابط الصوت | `toOpusUrl` يعيد بناء مسار مزوّده | EveryAyah أسماء ملفات سورة/آية خاصة بالمزوّد | **لا تنسخ التحويل أو روابط الاستضافة**؛ لا تفترض `/opus/` عند EveryAyah |
| بدء التشغيل | عنصر audio واحد، `preload=\"auto\"`، وحالة store وطابور | عنصر audio وpreload وتكرار وإعادة تحميل عند retry | تحسين preload محدود للآية التالية فقط بعد قياس؛ لا تنزيل سورة تلقائي |
| نطاق/تكرار | queue/repeat منفصلان عن UI؛ iOS يميز بداية/نهاية/تكرار | تكرار آية موجود بالفعل | اختبارات انتقال النهاية/تغيير القارئ/الإلغاء؛ لا تكرار ميزة قائمة |
| التنزيل | مسارات download في الموقع؛ iOS DownloadManager مع batch/cancel وحالة محلية | لم يُثبت مدير تنزيل قرآن دائم في الملفات المفحوصة | مرشح مستقبلي بحصة تخزين، تقدم وإلغاء وحقوق توزيع؛ لا تنفيذ الآن |
| cache | `cachedOpusSupport` يخزن **نتيجة codec**، وليس ملفات الصوت؛ stores/audio.js طابور وحالة تشغيل | metadata وتفضيلات/آخر استماع، وcache المتصفح بحسب المصدر | لا تدّعي وجود offline cache بسبب preload؛ أي تخزين دائم يحتاج سياسة واضحة |
| انقطاع الشبكة | fallback خاص بصيغة Opus؛ ليست ضمانًا لفشل MP3 أو كل شبكة | onError وretryNeedsReload وإعادة تحميل صريحة | إدارة أخطاء محدودة، عدم تخطي آية بصمت، حفظ موضع retry، إيقاف واضح |

لم تُختبر live URLs أو Range responses أو Safari/Native؛ لا ندعي إثبات أداء أو صحة استضافة. تراخيص الاستضافة والتسجيلات مستقلة عن الكود.

## 8. Tajweed Opportunities

- `quran/tajweed` يصف نفسه بـ**work in progress**، غير مكتمل ولا يطابق المصحف تمامًا. HtmlExporter له أيضًا قيد Firefox في README.
- توجد نقطة عقد إنتاجية: `/quran/verses/uthmani_tajweed` والحقل `text_uthmani_tajweed`. هذه **أقوى من الاستنتاج من المستودع التجريبي وحده**، لكنها تثبت توافر تمثيل API، لا صحة كل حكم أو حقوق كل بياناته.
- لا توجد في الأدلة المفحوصة شهادة تحقق علمية شاملة، مجموعة قبول كاملة، أو ترخيص مورد صالح لإعادة التوزيع في تبيان.
- **TAJWEED DATA: PARTIAL.** مصدر API مرشح دراسة؛ قواعد المستودع **RESEARCH ONLY**. لا ألوان مرجعية ملزمة، ولا درجات طلاب.
- أي preprocessing مستقبلي يكون على نسخة مقارنة معزولة لا corpus الإنتاج، وبعد حقوق المصدر ومراجعة مختصين واختبارات مواضع. لا نقل Java غير مرخّص، ولا إدخال markup داخل نص QCF أو matcher.

## 9. Ayah/Page Integrity Tooling

README يصف `ayat.py` للكشف بالقالب، و`lines.py` للكشف بمسافات الصورة، مع إقرار بأن كشف الأسطر الأقل دقة ويتطلب تعديل thresholds والتحقق اليدوي. تغيير العتبة قد يصنع false positives؛ المدخلات صور بيضاء/قوالب خاصة، وليست دليلًا على صلاحية QCF في تبيان.

**REFERENCE ONLY:** تعلم فكرة فحص عدد الأسطر/العلامات والتحقق اللاحق، وإعادة كتابة اختبارات أصلية بمدخلات تبيان. لا اعتماد OCR/template detection سلطة دينية أو production authority.

تبيان لديه `verify-mushaf.mjs` وبيانات line/word/version؛ المحافظة عليها أولى من جلب أدوات OpenCV/Matplotlib. الصفحتان الافتتاحيتان تختلفان طبيعيًا؛ لا تفرض 15 سطرًا ظاهرًا على كل صفحة. اختبارات عنوان السورة مستقلة عن glyphs ونص البسملة وأسطر الجسم.

## 10. iOS Architecture Lessons

README يثبت الطبقات الست: **Core → Model → Data → Domain → Features**، مع UI يعتمد على Core/Model ولا يعتمد على Domain/Data. NoorUI SwiftUI، والتنقل UIKit؛ ليس تطبيقًا SwiftUI خالصًا.

| QuranEngine Pattern | Expo/React Native equivalent in Tabyan | الحدود |
|---|---|---|
| Core/Model خفيفان | أنواع/helpers وعقود مشتركة | لا ربطهم بشاشة أو شبكة أو حساب مستخدم قديم |
| Data يعزل SQLite/network/download | adapters خلف hooks/services الحالية | لا تغيير DB أو ترحيل persistence في التدقيق |
| Domain يعزل QueuePlayer/Timing/Reading | خدمة حالة صوت/قراءة بمفاتيح واضحة | لا ربط توقيت قارئ بصحة تسميع الطالب |
| Features تستقبل dependencies | شاشة Expo تستعمل hooks وخدمات محددة | لا إعادة كتابة التطبيق أو import Swift |
| AyahMenu مع listener وتبعية النص والإشارات | sheet يقدم أحداثًا للمنسق وعقودًا واضحة | استنباط النمط؛ وظائف Native التي لا توجد لا تُوصف مكتملة |
| Batch downloads + cancel + downloaded status | abstraction مستقبلية فوق إمكانات Expo المتاحة | حقوق وتخزين وشبكة واختبار جهاز قبل وعد offline |
| AudioInterruptionMonitor يميز shouldResume | سياسة توقف/استئناف للأحداث المدعومة على Expo | لا استئناف تلقائي عامًا بعد مكالمة/خلفية؛ اختبار جهاز |
| Settings/Annotations/Reading منعزلة | إعداد قراءة وعلامات وحالة جلسة منفصلة | المحافظة على العزل حسب حساب تبيان ومسح النسخ المحلية عند الخروج |

المصحف QCF يظل **Web-only** وفق نطاق تبيان الحالي. هذه دروس واجهات وخدمات وليست موافقة على إعادة قارئ Native أو تحويل Expo إلى Swift.

## 11. Android Reference Constraints

LICENSE يثبت GPL-3.0. README يطلب nonprofit ويذكر أن البيانات لها حقوق مؤلفيها، غالبًا CC BY-NC-ND ولكن تختلف بحسب المصدر. **GPL وحده لا يحظر الربح**؛ لذلك لا ندمج طلب README وقيود البيانات في وصف قانوني خاطئ لترخيص الكود.

قرار تبيان هنا: **لا نسخ Android code أو بياناته أو صور صفحاته**. يمكن وصف تجربة التنقل/التشغيل سلوكيًا وإعادة تصميمها بكود تبيان، لكن لم تُشغّل نسخة Android أو تُقارن شاشاتها على جهاز. لا استيراد GPL إلا بموافقة قانونية صريحة في مهمة مستقلة.

## 12. Safe Reuse Candidates

| المرشح | التصنيف | القرار المحدد |
|---|---|---|
| SDK `api-js` / MIT | **REUSE NOW** | ترخيص الكود يسمح؛ **ليس أمر تثبيت أو دمج الآن**، وتبقى البيانات والمصادقة والحدود بوابات مستقلة |
| حدود مكونات DLS/Quran-specific | **ADAPT** | تطبيق مستقل بألوان burgundy/gold ومكونات تبيان الحالية |
| الفصل بين state القراءة والصوت والجلسة | **ADAPT** | استخراج محدود بعد الموافقة، مع اختبارات عقود؛ لا استبدال architecture |
| سياسة format fallback بعد إثبات الأصل | **ADAPT** | تنفيذ أصلي واختبارات فشل؛ لا نقل audio-url.js أو URLs |
| أنماط iOS dependency/view model/download cancellation | **ADAPT** | أفكار في Expo؛ لا ملفات Swift منسوخة |
| Content API endpoints/schema facts | **REFERENCE ONLY** | خريطة وتحقق offline؛ لا استيراد OpenAPI كاملًا بلا تحقق الترخيص |
| كشف صفحة/علامة من الصور | **REFERENCE ONLY** | مصدر فكرة لا مرجع صحة أو بيانات إنتاج |

## 13. Unsafe/Blocked Candidates

| المرشح | التصنيف | سبب البوابة |
|---|---|---|
| كلا خطّي أسماء السور | **BLOCKED** | حقوق الأصلين غير مثبتة؛ الترميز مختلف؛ الأصل القديم يفتقر إلى إثبات دلالي كامل |
| مكونات frontend/CSS أو نسخة المنتج | **BLOCKED** للنسخ؛ **REFERENCE ONLY** للأفكار | تعارض دليل الترخيص/طلب README، وهوية مستقلة لتبيان |
| مصادر التفسير/الترجمة/التسجيلات وإعادة توزيعها | **BLOCKED** | مراجعة كل resource/author وشروط الخدمة غير مكتملة |
| نسخ كود audio/tajweed/ayah-detection | **BLOCKED** | لا رخصة انطباق مثبتة للأجزاء المعنية |
| Android GPL في منتج تبيان | **BLOCKED** | يحتاج موافقة قانونية؛ بيانات متعددة الحقوق |
| استبدال QCF أو corpus/line mapping أو matcher | **DO NOT USE** في هذا التدقيق | يحتاج مراجعة سلامة مستقلة واعتمادًا صريحًا |
| Tajweed grading للطلاب من هذه القواعد أو ألوان تشغيل القارئ | **DO NOT USE** | لا إثبات صوت الطالب أو دقة علمية شاملة |
| روابط Opus مشتقة بالتخمين / hotlink audio لمزوّد آخر | **DO NOT USE** | لا إثبات أصل، صلاحية، Range، حقوق أو تكلفة استضافة |
| whole-project clone/rebrand أو إعادة كتابة Swift | **DO NOT USE** | خارج الهدف والنطاق |

## 14. Recommended Tabyan Changes

**لا تغييرات تطبيق في هذه المهمة.** التوصيات للموافقة اللاحقة:

1. إبقاء Amiri المحلي المرخّص للترويسة، واستكمال تحقق المهمة السابقة منفصلًا. لا استبدال بخط Quran.com الآن.
2. طلب دليل حقوق **للملف المحدد** من صاحب الخط، مع حق تجاري/توزيع/تحويل/attribution. لا يكفي MIT الشامل أو كون الموقع مجانيًا.
3. مقارنة عقد QF الحديث مع snapshot QDC الحالي offline، وخصوصًا `line_v2` مقابل `line_number`، `v2_page`، page layout، marker types، وفهرسة segments؛ لا تحديث بيانات تلقائي.
4. عند الحاجة إلى API إضافي مثبت، تفضيل adapter صغير خارج QCF وmatcher، وتقييم SDK MIT مقابل fetch الحالي، بدل إنشاء تكامل مكرر.
5. تحسين حالات الصوت/الإلغاء/الفشل بمزوّد EveryAyah الحالي قبل بحث مزوّد جديد؛ لا Opus بلا metadata وأصل مثبتين.
6. تقسيم reader chrome تدريجيًا فقط إذا استفادت ميزة معتمدة من ذلك؛ لا refactor واسع أو إعادة تسمية شكلية.
7. تأجيل التفسير/الترجمة/Tajweed/downloads حتى حقوق المحتوى، صحة البيانات، UI الحقيقي، وموافقة التكلفة.

## 15. Implementation Order

| الترتيب | العمل | بوابة التنفيذ |
|---|---|---|
| 0 | إتمام قبول الترويسة المحلية السابقة | المهمة السابقة فقط؛ الاختبارات والعروض لم تُنفذ في التدقيق |
| 1 | حسم ترخيص خط أسماء السور | دليل مكتوب للأصل الدقيق؛ لا دمج قبل VERIFIED |
| 2 | فحص عقد QDC ↔ QF offline | موافقة مهمة منفصلة؛ بيانات الإنتاج لا تتغير |
| 3 | اختبارات state الصوت والنطاق/الفشل | أدوات محلية محدودة، لا خدمات مدفوعة |
| 4 | استخراج reader chrome عند حاجة واضحة | محافظة على QCF/البسملة/المسارات التعليمية وعزل الحساب |
| 5 | integration proposal للخط إن اجتاز الحقوق | Web header فقط؛ 114 اسمًا وإتاحة و10 عروض وقبول بصري |
| 6 | محتوى/توقيت/تنزيلات جديدة | حقوق الموارد، حدود التكلفة، سلامة الربط، موافقة صريحة |
| 7 | Tajweed إن نضج الدليل | مراجعة مختصين ومجموعة قبول؛ لا درجات من التجربة الحالية |

### Source references / الأدلة

روابط المصدر الرسمية؛ الفروع قابلة للتغير. أحجام الملفات والبصمتان في القسم 4 تحددان أصلَي الخط اللذين فُحصا.

- [Frontend README: copy warning + DLS](https://github.com/quran/quran.com-frontend-next/blob/production/README.md) · [package MIT declaration](https://github.com/quran/quran.com-frontend-next/blob/production/package.json)
- [ChapterTitle](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterHeader/components/ChapterTitle.tsx) · [ChapterIcon token](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterIcon/index.tsx) · [ChapterIconContainer](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterIcon/ChapterIconContainer.tsx) · [font family](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterIcon/ChapterIconContainer.module.scss)
- [ReaderTopActions](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReaderTopActions/index.tsx) · [Reader modules](https://github.com/quran/quran.com-frontend-next/tree/production/src/components/QuranReader) · [DLS modules](https://github.com/quran/quran.com-frontend-next/tree/production/src/components/dls) · [Audio modules](https://github.com/quran/quran.com-frontend-next/tree/production/src/components/AudioPlayer)
- [Font repository README](https://github.com/quran/quran.com-fonts/blob/master/README.md) · [Surah font inventory](https://github.com/quran/quran.com-fonts/tree/master/public/fonts/surah_names) · [current frontend font inventory](https://github.com/quran/quran.com-frontend-next/tree/production/public/fonts/quran/surah-names/v1)
- [SDK README](https://github.com/quran/api-js/blob/main/README.md) · [MIT LICENSE](https://github.com/quran/api-js/blob/main/LICENSE) · [client](https://github.com/quran/api-js/blob/main/packages/api/src/sdk/client.ts) · [verses](https://github.com/quran/api-js/blob/main/packages/api/src/sdk/verses.ts)
- [Content v4 OpenAPI](https://github.com/quran/qf-api-docs/blob/main/openAPI/content/v4.json) · [SDK auth matrix](https://github.com/quran/qf-api-docs/blob/main/docs/sdk/javascript/auth-matrix.mdx) · [public quickstart](https://github.com/quran/qf-api-docs/blob/main/docs/sdk/javascript/public-quickstart.mdx)
- [Audio README](https://github.com/quran/audio.quran.com/blob/main/README.md) · [codec/URL detection](https://github.com/quran/audio.quran.com/blob/main/src/lib/audio-url.js) · [AudioPlayer fallback](https://github.com/quran/audio.quran.com/blob/main/src/lib/AudioPlayer.svelte) · [queue store](https://github.com/quran/audio.quran.com/blob/main/src/stores/audio.js)
- [Tajweed limitations](https://github.com/quran/tajweed/blob/master/README.md) · [Ayah detection limitations](https://github.com/quran/ayah-detection/blob/master/README.md)
- [iOS architecture](https://github.com/quran/quran-ios/blob/main/README.md) · [Apache LICENSE](https://github.com/quran/quran-ios/blob/main/LICENSE) · [Ayah menu](https://github.com/quran/quran-ios/blob/main/Features/AyahMenuFeature/Sources/AyahMenuViewModel.swift) · [download service](https://github.com/quran/quran-ios/blob/main/Domain/QuranAudioKit/Sources/Downloads/QuranAudioDownloader.swift) · [interruptions](https://github.com/quran/quran-ios/blob/main/Domain/QueuePlayer/Sources/AudioInterruptionMonitor.swift)
- [Android code/data warning](https://github.com/quran/quran_android/blob/main/README.md) · [GPL LICENSE](https://github.com/quran/quran_android/blob/main/LICENSE)

### Audit closure

- Surah font asset discovery: **YES**.
- Font rights: **UNVERIFIED**; safe external font reuse now: **NO**.
- Font inspection only: two small TTFs (149,148 + 154,900 bytes); no application font added by this audit.
- Temporary downloaded source/font inspection cache removed after analysis; no external font binaries distributed with this report.
- Code/API/provider/database/authentication/QCF/Quran corpus changes by this audit: **NONE**.
- GPL code imported: **NO**. Full repository cloned: **NO**.
- Paid API/GPU/external builds/browser testers/deployment: **NO**.
- Agent/account billing was not measured; “no intentionally invoked paid services” is not a guarantee that the Agent conversation consumes zero Replit credits.
- **NEXT RECOMMENDED ACTION:** استكمال قبول الترويسة المحلية السابقة، مع إبقاء خط Quran.com خلف بوابة الترخيص؛ أي تكامل خارجي يبدأ بموافقة منفصلة.

**STOP.**

### Follow-up selection — 2026-10-12

بناءً على طلب المستخدم إعادة النظر في المصاحف والمزوّد واختيار الأفضل، روجعت قائمة منظمة Quran العامة، ومستودع الصور، ودليل الخطوط، ودليل الموارد والمزامنة، وشروط المطوّرين الرسمية.

**الاختيار الأنسب لتبيان:**

1. **المصحف:** إبقاء QCF V2 الحالي لمصحف المدينة/حفص والتفاعل بالكلمات. دليل Quran Foundation نفسه يوصي بـQCF V2 للتخطيط المطابق للمصحف؛ QPC Hafs Unicode للعرض النصي الأبسط، وQCF V4 خيار ألوان تجويد وليس استبدالًا تلقائيًا أفضل.
2. **مزوّد البيانات الإضافية:** Quran Foundation Content API مع SDK الرسمي MIT، عبر backend، عند الحاجة إلى موارد أو معلومات غير موجودة محليًا. لا نقل corpus أو matcher أو مزوّد الصوت الحالي لمجرد تغيير مكتبة العميل.
3. **واجهة القارئ:** استنباط أنماط Quran.com واستعمالها بكود وألوان تبيان؛ لا نسخ مشروعه.
4. **الصوت:** استمرار EveryAyah حاليًا؛ chapter audio/timestamps من QF مرشح منفصل لمزامنة قارئ، وليس إثبات تسميع الطالب.

**نتيجة إضافية مهمة:** README مستودع `quran.com-images` يعلن أن كود توليد الصور GPL، ويقول إن الخطوط والصفحات ملك مجمع الملك فهد. لم يُحدد إصدار GPL في النص المفحوص. ليس أصلًا آمنًا لنسخ الكود أو تحويل المصحف الحالي إلى صور؛ الفصل بين حقوق المولّد وحقوق أصوله لازم.

**تحديث أدلة الحقوق:** شروط QF، الموسومة Last updated: 2026-10-11، تتضمن تصريحًا مشروطًا بتخزين/تضمين الخطوط وصور المصحف **المأخوذة عبر QF APIs أو روابط CDN موثقة**، مع حساب Developer Console فعال وإسناد Quran Foundation، داخل التطبيق فقط وليس كحزمة أصول أو تنزيل مستقل. هذا دليل أوسع من غياب LICENSE في GitHub؛ لكنه **لا يثبت تلقائيًا أن كل ملف خط في GitHub، وخاصة أصلَي أسماء السور المفحوصين، مشمول بالتصريح**. الدليل المفحوص لا يحدد خط أسماء السور بعينه، ولا حالة حساب تبيان؛ بوابة هذا الأصل تبقى مفتوحة للتحقق لا معتمدة للدمج.

**بوابة المزوّد والتخزين:** الشروط تقيد تخزين بيانات API المعتادة لأكثر من أسبوع، وتفرض Content Sync للنسخ offline من الموارد التي يدعمها، مع next sync كل سبعة أيام عندما تسمح الاتصال. استثناء الخطوط/الصور ليس تصريحًا عامًا لتوزيع قاعدة بيانات أو corpus مجمّد داخل build. لا نستنتج أثرًا رجعيًا على snapshot تبيان القديم دون مراجعة مصدره وشروطه؛ لا حذف ولا تعديل له. قبل أي اعتماد جديد يجب التحقق من الصلاحيات والتكلفة وشروط الموارد.

مصادر الإضافة:

- [Quran Image Generator — code GPL and separate asset ownership](https://github.com/quran/quran.com-images/blob/master/README.md)
- [Official font rendering decision guide](https://github.com/quran/qf-api-docs/blob/main/docs/tutorials/fonts/font-rendering.md)
- [Resources API / Content Sync and timing](https://github.com/quran/qf-api-docs/blob/main/docs/sdk/javascript/resources.mdx)
- [Server SDK setup and production permissions](https://github.com/quran/qf-api-docs/blob/main/docs/sdk/javascript/server-quickstart.mdx)
- [Developer Terms — application use, offline sync, font/image bundling](https://github.com/quran/qf-api-docs/blob/main/src/pages/legal/developer-terms.mdx)

**التنفيذ في هذه الإضافة:** توثيق الاختيار فقط؛ لا تثبيت SDK أو تحميل أصول أو اتصال Content API أو تغيير التطبيق/البيانات أو نشر.
