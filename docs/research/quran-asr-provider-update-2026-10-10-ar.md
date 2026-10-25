# مزوّد تسميع قرآني لتبيان: تقييم Nabr وخيارات المقارنة

**تاريخ البحث:** 10 أكتوبر 2026  
**العمق:** بحث سريع  
**المصادر المستشارة:** 11  
**النطاق:** بحث عن مزوّد ASR قرآني قابل للدمج؛ لم يحدث أي تكامل أو تغيير في مزوّد تبيان أو بيانات الطلاب.

## الخلاصة التنفيذية

أقوى مرشح وجدته لبدء التحقق التجاري هو **Nabr**. تعرض صفحته واجهة للمطورين لتقييم التلاوة، وتربط بوثائق QRC التي تصف اتصال WebSocket وإرسال الصوت على دفعات واستقبال مواضع الكلمات والكلمات المتروكة وأخطاء التجويد والنطق [[1]](https://nabrquran.ai/en/api) [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). هذا أقرب إلى وظيفة ترتيل من واجهة تفريغ عربية عامة؛ لكنه يثبت وجود واجهة موثقة، لا دقتها المستقلة أو جاهزيتها لعقد الإنتاج.

الوصول التجاري ليس واضحًا من سعر منشور: صفحة Nabr تطلب التواصل لتحديد الاستخدام والحدود والنشر والشروط التجارية، والوثائق تقول إن مفتاح QRC يحتاج اشتراكًا [[1]](https://nabrquran.ai/en/api) [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). شروط Nabr وسياسة الخصوصية، وكلاهما محدّث في 5 مايو 2026، يتركان السعر وSLA والدعم والاحتفاظ وتفاصيل النشر لاتفاق منفصل؛ كما لا تحدد السياسة منطقة المعالجة أو الجهات الفرعية [[3]](https://nabrquran.ai/en/terms) [[4]](https://nabrquran.ai/en/privacy).

**التوصية:** راسلوا Nabr لطلب عرض تجريبي وعقد معالجة بيانات، لكن لا ترسلوا صوت الطلاب ولا تغيّروا مسار الإنتاج قبل حسم هذه الشروط واختبار دقته على تلاوات مصرح بها. البريد المنشور للتواصل هو `hello@misraj.ai` [[6]](https://nabrquran.ai/en). احتفظوا بمسار OpenAI الحالي كخط أساس حتى يجتاز المرشح بوابات الجودة والخصوصية.

## الخلفية

المطلوب هنا ليس مجرد تحويل العربية المنطوقة إلى نص، بل خدمة تتبع التلاوة القرآنية وتعيد موضع الآية والكلمة وملاحظات الحفظ أو النطق أو التجويد. لذلك فرّقت بين API قرآني لتحليل الصوت، وتطبيق تلاوة للمستخدم النهائي، وواجهات تزوّد التطبيق بنص القرآن أو تسجيلاته فقط.

## النتائج الرئيسية

### 1. Nabr هو أقرب API موثق لوظيفة ترتيل

تصف صفحة Nabr مسارًا لتقييم التلاوة بالبث، وتربط بوثائق QRC المستضافة على Qurani.ai؛ والوثائق تصف WebSocket برسائل MessagePack ومفتاح اشتراك، مع جلسة تلاوة ورسائل صوتية دورية ونتائج تتضمن موضع القراءة والكلمات الصحيحة والمتروكة وأخطاء التجويد والحروف [[1]](https://nabrquran.ai/en/api) [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). الصفحتان تبدوان مسار التكامل نفسه، لكن ينبغي تأكيد الطرف القانوني الذي سيبرم العقد ويصدر بيانات الوصول عند طلب العرض.

| المحور | ما توضحه المواد المنشورة | ما يلزم التحقق منه |
|---|---|---|
| البث والنتائج | QRC يصف إرسال دفعات صوت واستقبال نتائج منظمة مع مواضع الكلمات وأخطاء القراءة [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). | هل النتائج تدريجية بما يكفي لتجربة الطالب؟ وما صيغ الصوت والمدد والقراءات المدعومة؟ |
| الكمون والدقة | صفحة Nabr تعرض متوسطًا 909 مللي ثانية، ووسيطًا 385 مللي ثانية، وP95 قدره 4.23 ثانية؛ وصفحة الأبحاث تعرض CER وWER من تشغيل داخلي [[1]](https://nabrquran.ai/en/api) [[5]](https://nabrquran.ai/en/research). | هذه أرقام يذكرها المزوّد؛ لم أجد تحققًا مستقلًا أو مقارنة مباشرة على تسجيلات تبيان. |
| الوصول التجاري | الوثائق تشترط اشتراكًا ومفتاح API، والصفحة تطلب التواصل لتحديد السعر والحدود ونمط النشر [[1]](https://nabrquran.ai/en/api) [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). | لا توجد أسعار أو حصص استخدام أو SLA عامة في المواد التي راجعتها. |
| الخصوصية | السياسة تقول إن تحسين النماذج مشروط باتفاق العميل أو الموافقة أو ترتيب بحثي، وإن الاحتفاظ يضبط وفق احتياج العميل [[4]](https://nabrquran.ai/en/privacy). | لا تحدد السياسة منطقة المعالجة أو الجهات الفرعية، وتطلب من العملاء مناقشة الحذف وضوابط النشر مباشرة. |

يظهر في مثال QRC أن مفتاح الوصول يمر ضمن عنوان WebSocket كمعامل استعلام [[2]](https://qurani.ai/en/docs/2-advanced-tools/qrc). لذلك لا تضعوه في تطبيق Web أو Native؛ اجعلوا الاتصال بالمزوّد من خادم تبيان بحيث يبقى المفتاح سرًا خادميًا.

### 2. الشروط الحالية لا تكفي لاعتماد إنتاجي

تصف شروط Nabr الاستخدامات التعليمية المقصودة، لكنها تقول إن الشروط التجارية وحدود الخدمة والدعم والاحتفاظ والنشر المحلي تُحدد باتفاق منفصل [[3]](https://nabrquran.ai/en/terms). كما تمنع إعادة البيع أو الترخيص الفرعي أو نشر مقارنة معيارية أو تدريب نظام منافس على المخرجات ما لم يسمح الاتفاق بذلك؛ احصلوا على إذن مكتوب قبل نشر أي نتيجة اختبار [[3]](https://nabrquran.ai/en/terms). وتصف صفحة الخصوصية نفسها بأنها سياسة عمل مبدئية؛ وهي تترك مدد الاحتفاظ لإعداد العميل ولا تسرد الجهات الفرعية أو منطقة معالجة الصوت [[4]](https://nabrquran.ai/en/privacy). كما أن المواد المنشورة تطلب من المدارس والمنتجات مسؤولية إبلاغ المتعلمين وأوليائهم بكيفية جمع بيانات التلاوة واستخدامها [[4]](https://nabrquran.ai/en/privacy).

تذكر صفحة أبحاث Nabr بيانات ومقاييس داخلية، لكنها تبقى ادعاءات المزوّد وليست نتيجة مستقلة تثبت أداءه على طلاب تبيان [[5]](https://nabrquran.ai/en/research). ويعرض مقال Misraj AI الصادر في 10 سبتمبر 2026 Nabr بوصفه طبقة تصحيح التلاوة في منظومتها، وهو تأكيد من الشركة نفسها لا تقييم طرف ثالث [[7]](https://misraj.ai/en/blogs/eqrra-qur-an-an-intelligent-learning-experience-and-a-unified-development-architecture).

### 3. ترتيل نفسه لا يقدّم مسارًا عامًا موثقًا في المصادر التي راجعتها

أحدث إجابة عامة وجدتها من مركز مساعدة Tarteel، بتاريخ 27 سبتمبر 2025، تقول إنه لا يقدّم API عامة للمطورين أو التطبيقات الخارجية؛ وقد تكون هناك شراكة خاصة أو خدمة أحدث لم تظهر في الوثائق العامة [[8]](https://support.tarteel.ai/en/articles/12414464-do-you-have-an-api-i-can-use). توثيق MCP المنفصل يخص أدوات ومحتوى القرآن ولا يصف إرسال صوت أو نتائج ASR [[9]](https://mcp.tarteel.ai/docs). كما يشرح تقرير شريك البنية التحتية في سبتمبر 2026 تشغيل نماذج Tarteel الخاصة، لا عقد API للمطورين [[10]](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet).

أما صفحة Recite على quran.ai فلم تعرض في المحتوى الذي راجعته توثيق API للمطورين، ولذلك لا أعدّها حاليًا خيار دمج موثقًا [[11]](https://recite.quran.ai/).

## التوصية والخطوات التالية

ابدؤوا بـ **Nabr** كمرشح لتواصل تجاري وعرض تقني، لا كقرار اعتماد. تواصلوا مع `hello@misraj.ai` واطلبوا إجابات مكتوبة عن سعر الاستخدام والحصص والحدود ومدة التجربة والـSLA، والجهة القانونية المتعاقدة، وموقع معالجة الصوت والجهات الفرعية، ومدد الاحتفاظ والحذف، واستخدام التسجيلات لتدريب النماذج، وخيارات النشر المحلي [[1]](https://nabrquran.ai/en/api) [[3]](https://nabrquran.ai/en/terms) [[4]](https://nabrquran.ai/en/privacy) [[6]](https://nabrquran.ai/en).

بعد الاتفاق على الأذونات وشروط البيانات، اختبروه في بيئة منفصلة على تسجيلات مصرح بها من ثلاثة قرّاء على الأقل، وقارنوا تغطية الكلمات ومواضعها وأخطاء التجويد والكمون P50/P95 مع خط تبيان الحالي. لا تستخدموا تسجيلات الطلاب في التجربة قبل عقد معالجة واضح وموافقة مناسبة. وإذا اجتاز Nabr الاختبار، أبقوا مفتاحه على الخادم ومرروا النتائج عبر واجهة مزوّد تبيان الحالية بدل تضمين بيانات الوصول في التطبيقات.

## الحدود

لم أجد اختبارًا مستقلًا لـNabr، أو سعرًا منشورًا، أو عقد معالجة بيانات جاهزًا، أو تحديدًا علنيًا لموقع معالجة التسجيلات والجهات الفرعية. كما أن إجابة Tarteel المتاحة عن API تعود إلى 2025؛ لذلك لا تنفي وجود اتفاق خاص أو إطلاق أحدث غير موثق علنًا. هذه توصية ببدء التواصل والتقييم، وليست موافقة على إرسال صوت الطلاب أو تشغيل الخدمة في الإنتاج.

## المصادر

1. [Quran Recitation API for Developers — Nabr](https://nabrquran.ai/en/api) — تاريخ النشر غير ظاهر؛ اطلع عليه 10 أكتوبر 2026، Tier 3. الدليل: `research/sources/nabrquran-api-page.md`
2. [Nabr — Real-Time Recitation Correction API — Qurani.ai Docs](https://qurani.ai/en/docs/2-advanced-tools/qrc) — تاريخ النشر غير ظاهر؛ اطلع عليه 10 أكتوبر 2026، Tier 3. الدليل: `research/sources/qurani-ai-qrc-technical-docs.md`
3. [Terms and Acceptable Use for Nabr](https://nabrquran.ai/en/terms) — آخر تحديث 5 مايو 2026؛ Tier 3. الدليل: `research/sources/nabrquran-terms.md`
4. [Privacy Policy for Nabr](https://nabrquran.ai/en/privacy) — آخر تحديث 5 مايو 2026؛ Tier 3. الدليل: `research/sources/nabrquran-privacy.md`
5. [Quran ASR Research and Evaluation — Nabr](https://nabrquran.ai/en/research) — تاريخ النشر غير ظاهر؛ Tier 3، أبحاث وقياسات يعلنها المزوّد. الدليل: `research/sources/nabrquran-research.md`
6. [Nabr Quranic Voice Intelligence](https://nabrquran.ai/en) — تاريخ النشر غير ظاهر؛ Tier 3. الدليل: `research/sources/nabrquran-home.md`
7. [Eqrra Qur'an: An Intelligent Learning Experience and a Unified Development Architecture — Misraj AI](https://misraj.ai/en/blogs/eqrra-qur-an-an-intelligent-learning-experience-and-a-unified-development-architecture) — 10 سبتمبر 2026؛ Tier 3، مصدر الشركة. الدليل: `research/sources/misraj-nabr-product-article.md`
8. [Do you have an API I can use? — Tarteel Help Center](https://support.tarteel.ai/en/articles/12414464-do-you-have-an-api-i-can-use) — 27 سبتمبر 2025؛ Tier 3، إجابة رسمية قديمة نسبيًا. الدليل: `research/sources/tarteel-api-help-center.md`
9. [Tarteel MCP Server Docs](https://mcp.tarteel.ai/docs) — تاريخ النشر غير ظاهر؛ اطلع عليه 10 أكتوبر 2026، Tier 3. الدليل: `research/sources/tarteel-mcp-docs.md`
10. [Tarteel Migrates to CoreWeave with Support from Zeet](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet) — 8 سبتمبر 2026؛ Tier 3، تقرير شريك. الدليل: `research/sources/tarteel-coreweave-sept-2026.md`
11. [Recite — Quran.ai](https://recite.quran.ai/) — تاريخ النشر غير ظاهر؛ اطلع عليه 10 أكتوبر 2026، Tier 3. الدليل: `research/sources/quran-ai-recitation-beta.md`
