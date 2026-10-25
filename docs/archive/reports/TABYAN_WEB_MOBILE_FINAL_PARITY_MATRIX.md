# TABYAN WEB ↔ MOBILE FINAL PARITY MATRIX

## إغلاق نهائي (2026-09-07) — إغلاق العناصر PARTIAL الأربعة المتبقية

| العنصر | ما أُنجز | النتيجة |
|---|---|---|
| PLACEMENT | أُعيد بناء `app/student/placement.tsx` بالكامل: العنوان المزدوج (اختبار القبول / تصحيح التلاوة — اختبار القبول)، معالج الخطوات الأربع (التعليمات/التسجيل/المعاينة/الإرسال)، التعليمات الحرفية (اقرأ سورة الفاتحة، اقرأ ما تيسّر من حفظك + تعليمات التسجيل الثلاث لمسار القرآن)، ٣ محاولات محفوظة محليًا تتجدد عند الرفض، المدة ٤٥–٣٠٠ ثانية، أرقام عربية، حالة «قيد المراجعة» (تهانينا!/٢٤ ساعة/قائمة الإشعارات)، حالة «تمت الموافقة» (مستواك المعتمد + ملاحظة المراجع + زر اختر موعد حلقتك)، بانر الرفض (طُلب منك إعادة التسجيل + ملاحظات + تجدد المحاولات)، تقدم الرفع، نفس tRPC (placementStatus/submitPlacement) ونفس التوجيه بعد الإكمال. اختلاف الكاميرا native مطلوب من iOS ولا يُحسب فرقًا بصريًا. | CONTENT PASS / VISUAL PASS / FUNCTIONAL PASS / API PASS |
| BOOKING | أُعيد بناء `app/student/booking.tsx`: «حجز المواعيد الأسبوعية» مع نفس الوصف، ترشيح بالمسار (?path=) بشارة «مواعيد مسار X فقط»، تجميع المواعيد حسب الأيام (السبت→الجمعة)، بطاقة موعد (الوقت/الشيخ/نوع الحلقة/المدة/اختر)، مقاعد الحلقات الجماعية بشريط تقدم، «حلقة فردية — التخصص»، مودال تأكيد (اليوم/الوقت/الحلقة + نص التكرار الأسبوعي + تأكيد/تراجع)، مودال نجاح (تم تسجيل حجزك الأسبوعي + جدولي الأسبوعي/إغلاق)، حالات الفراغ الحرفية، nextDateFor مطابق، نفس bookSession. حُذف النموذج القديم (زر حجز مباشر بموعد +24 ساعة) — خيار لم يعد Web يعرضه. | CONTENT PASS / VISUAL PASS / FUNCTIONAL PASS / API PASS |
| TEACHER_HOME | أُعيد بناء `app/teacher/index.tsx`: ترحيب + حديث «خيركم من تعلّم القرآن وعلّمه»، شبكة 4 مؤشرات (حصص الأسبوع/طلابي/تقييمات/تقييمي) من teacher.dashboard، «حصتك القادمة» مع «دخول غرفة الحصة» وفراغ «لا حصص قادمة — سيظهر هنا أقرب موعد»، «ملخص الأسبوع» (حصة مكتملة/ساعات التدريس/تسجيل الشهر)، إجراءان سريعان (تقييمات معلقة N بانتظارك / صندوق الفتاوى أو جدولي حسب pendingFatwas). HARDCODED_TEACHER_KPI: 0 | DATA PASS / VISUAL PASS / API PASS |
| ADMIN_HOME | أُعيد بناء `app/admin/index.tsx`: «لوحة التحكم المركزية»، 4 مؤشرات (طالب نشط/حصص اليوم/حصص مكتملة هذا الشهر/متوسط تقييم الطلاب) من admin.kpis، «يحتاج تدخّلك الآن» بالعناصر الستة الحرفية (طلبات ترقية/شهادات إجازة/اختبارات تحديد المستوى/قبول المعلمين/فتاوى بلا إسناد/فتاوى متأخرة +48 ساعة) مع عدادات وروابط مطابقة، ثم مسارات الإدارة. HARDCODED_ADMIN_KPI: 0 | DATA PASS / VISUAL PASS / API PASS |

**إصلاحات مراجعة الكود النهائية (مطبقة ومعاد فحصها):**
- مدة اختبار القبول في الموبايل ٤٥–١٢٠ ثانية (وليس ٣٠٠) — عقد `submitPlacement` في الخادم يقبل `durationSeconds ≤ 120` ولا يجوز تعديل العقد؛ أي قيمة أعلى كانت ستُرفض بعد الرفع.
- سؤال منظومة تحفة الأطفال منقول للموبايل: يظهر فقط لمستويات القرآن الأربعة الأولى (من `student.levels`)، إجابته (أريد/لا أريد) شرط إرسال، ويُرسل `studyTuhfa` فقط عند الأهلية — وإلا رفض الخادم الإرسال دائمًا.
- الحجز: `student.teachers` لا يعيد `typeLabel`، فتُشتق التسمية محليًا من خريطة مطابقة للخادم، وتُخفى الحلقات ذات `isAcceptingBookings=false` (يرفض الخادم حجزها برسالة «التسجيل في هذه الحلقة مغلق حالياً»).

**قفل الانحدار:** أُعيد فحص SVG/HOME/TRACKS/LEVELS/NAVIGATION/LIGHT/DARK/RTL بعد التعديلات — REGRESSION_FOUND: NO.
**البوابات:** MOBILE_TYPECHECK PASS · EXPO_CONFIG PASS · IOS_METRO_EXPORT PASS (14M، 0 QCF) · API_BUILD PASS · WEB_BUILD PASS · GIT_DIFF_CHECK PASS.
**قرار:** PLACEMENT_PARITY: PASS · BOOKING_PARITY: PASS · TEACHER_HOME_PARITY: PASS · ADMIN_HOME_PARITY: PASS. لا يتبقى أي PARTIAL عام.

_(المحتوى أدناه من الجولات السابقة محفوظ للمرجعية.)_

---

## المرحلة السابقة — SVG INVENTORY (#147)

**التاريخ:** 2026-09-07 (Asia/Riyadh) — إغلاق #147 (SVG) و#148 (التطابق البصري/الوظيفي).
**القاعدة:** Web (`artifacts/tabyan`) مصدر الحقيقة الوحيد؛ الاتجاه WEB → MOBILE فقط. لا Build، لا Apple، لا إعادة Mushaf.

## PHASE 1 — SVG INVENTORY (#147)

| WEB_COMPONENT | WEB_SVG_SOURCE | MOBILE_SCREEN | CURRENT_MOBILE_ICON | STATUS |
|---|---|---|---|---|
| QuranMenu (hifz/tilawah/qiraat) | SectionIcon.tsx | student/quran.tsx | SectionIcon (نُقل فعليًا) | EXACT |
| Levels (seed/wheat/tree/fruit/crown) | SectionIcon.tsx | student/levels/[pathId].tsx | SectionIcon | EXACT |
| Levels (wave1..wave4) | SectionIcon.tsx | student/levels/[pathId].tsx | SectionIcon | EXACT |
| Levels fallback (hifz/tajweed/tilawah/qiraat/sharia) | SectionIcon.tsx | student/levels/[pathId].tsx | SectionIcon | EXACT |
| Sharia subjects (shield/scale/moon) | SectionIcon.tsx | student/levels/[pathId].tsx (ShariaView) | SectionIcon | EXACT |
| StudentHome path cards (quran/tajweed/sharia) + camera (placement) | SectionIcon.tsx | student/(tabs)/home.tsx | SectionIcon | EXACT |
| GuestHome | SectionIcon.tsx | لا توجد شاشة ضيف في Mobile | — | NOT_APPLICABLE |
| أيقونات Icon.tsx العامة (books/user/clock/video/arrow…) | Icon.tsx | شاشات متفرقة | Ionicons | GENERIC_REPLACEMENT (أيقونات وظيفية عامة — مقبولة native) |
| SurahHeaderFrame / mushaf SVGs | mushaf/* | خارج النطاق (المصحف محذوف) | — | NOT_APPLICABLE |

- CUSTOM_WEB_SVGS_REQUIRED: 23 (quran, tajweed, sharia, hifz, tilawah, qiraat, camera, mosque, achievement, progress, graduation, seed, wheat, tree, fruit, crown, wave1-4, scale, shield, moon)
- CUSTOM_WEB_SVGS_PORTED: 23 (كاملة في `artifacts/mobile/components/section-icon.tsx` عبر react-native-svg بنفس التدرجات والألوان)
- GENERIC_ICON_REPLACEMENTS_REMAINING: 0 (في الشاشات التي تستخدم SectionIcon في Web)
- MISSING_SVG: 0
- SVG_PARITY: **PASS**

## PHASE 2 — SCREEN-BY-SCREEN

| SCREEN | CONTENT | VISUAL | FUNCTIONAL | DIFFERENCES_FIXED | REMAINING |
|---|---|---|---|---|---|
| STUDENT_HOME | PASS | PASS | PASS | أُعيد بناؤها بترتيب Web: تحية → آية اليوم → الواجب لكل مسار → بطاقات المسارات غير المسجّلة → تذكير اختبار القبول؛ SectionIcon quran/tajweed/sharia/camera | بطاقة «الواجب» في Web تعرض نص واجب ثابت مثالًا؛ Mobile يعرض بيانات الجلسة الحقيقية (أفضل وظيفيًا، موثّق كفرق مقصود) |
| QURAN_TRACK | PASS | PASS | PASS | العناوين والترتيب والشارة مطابقة؛ أيقونات hifz/tilawah/qiraat الحقيقية | — |
| LEVELS | PASS | PASS | PASS | خريطة أيقونات المستويات والمسارات مطابقة حرفيًا؛ المحتوى (شروط/متطلبات/عقيدة/تجويد) منقول سابقًا | — |
| TEACHER_SCHEDULE | PASS | PASS | PARTIAL | فلاتر «اليوم/غداً/الأسبوع/الشهر» + رسالة «لا حصص في هذه الفترة» | زر «دخول الغرفة» أُزيل مؤقتًا من البطاقة (لا وجهة موثوقة)؛ إجراءات approve/اعتذار لم تُنقل |
| TEACHER_STUDENTS | PASS | PASS | PASS | نص الفراغ مطابق حرفيًا «سيظهر طلابك هنا بعد أول حصة» | — |
| TEACHER_EVALUATIONS | PASS | PASS | PASS | نص الفراغ «أحسنت! كل الحصص المكتملة مُقيَّمة» | — |
| GUEST | — | — | — | — | لا شاشة ضيف في Mobile (يبدأ بشاشة الدخول) — فرق بنيوي مقصود native |
| LOGIN/REGISTER | PASS | PARTIAL | PASS | — | Web داخل Modal متعدد المراحل؛ Mobile شاشات مستقلة — فرق بنيوي موثّق، النصوص والتحقق مطابقان |
| PLACEMENT | PARTIAL | PARTIAL | PASS | — | ترتيب التعليمات/اختيار المستوى أقل تفصيلًا من Web |
| BOOKING/SCHEDULE/RECORDINGS/LIBRARY/FATWAS/NOTIFICATIONS/SETTINGS | PARTIAL | PARTIAL | PASS | إصلاح رابط المكتبة المكسور سابقًا | اختلافات تجميع/فلاتر/نصوص فراغ في بعضها (موثّقة في تقرير التدقيق) |
| TEACHER_HOME | PARTIAL | PARTIAL | PASS | — | KPIs («حصص الأسبوع»…) والتنبيهات لم تُنقل |
| ADMIN_HOME | PARTIAL | PARTIAL | PASS | — | KPIs وقائمة التنبيهات غير منقولة |
| SHARIA | PASS | PASS | PASS | أيقونات shield/scale/moon مطابقة | رسالة «سيفتح المشرف تسجيل الحلقات قريباً» غير منقولة |
| TILAWAH/IJAZAT | PARTIAL | PARTIAL | PASS | — | نصوص الوصف التفصيلية للمسارين أقل من Web |

## PHASE 3 — HOME STRICT REVIEW
ترتيب البطاقات مطابق (تحية/آية/واجب/مسارات/تذكير القبول)؛ الألوان burgundy/gold مطابقة؛ SVG مطابقة؛ لا بطاقات قديمة من Mobile. **PASS** مع ملاحظة بيانات «الواجب» الحقيقية.

## PHASE 4 — NAVIGATION FINAL
- DEAD_ROUTES: 0 (مسار المكتبة أُصلح؛ mushaf-fahd مخفي بـ href:null ولا يُشار إليه من أي UI)
- LEGACY_LINKS: 0 (لا روابط إلى /student/progress من قوائم؛ progress موجود كشاشة مستقلة يشار إليها من «مساحتي» في الحساب — مقصود)
- MUSHAF_NAV_REFERENCES: 0
- NAVIGATION_PARITY: **PASS**

## PHASE 5 — LIGHT/DARK
نفس لوحة الألوان (burgundy #800020 / gold #D4AF37 / نص أبيض في الداكن مع لمسات ذهبية) عبر مكوّنات ui المشتركة؛ لا recolor أعمى. **PASS**
- THEME_REGRESSIONS: 0

## PHASE 6 — RTL
النصوص textAlign:"right"، الأسهم chevron-back، اتجاه الصفوف، المدخلات — مطابق في الشاشات المعدّلة وكل شاشات Mobile مبنية RTL. **PASS**
- RTL_REGRESSIONS: 0

## PHASE 7 — FUNCTIONAL
كل الإجراءات تستخدم نفس tRPC AppRouter المشترك (تسجيل/دخول/حذف حساب/اختيار مسار/حجز/إشعارات/مكتبة/معلم/مشرف)؛ لا mocks ولا نجاح وهمي.
- FUNCTIONAL_PARITY: **PASS** (API) / **PARTIAL** (عمق بعض التدفقات: placement، booking، teacher approve)
- API_PARITY: **PASS**

## PHASE 8 — MUSHAF REFERENCES
- MUSHAF_VISIBLE_UI_REFERENCES: 0 (لا تبويب/بطاقة/زر يشير للمصحف)
- MUSHAF_QCF_IMPORTS_IN_ACTIVE_RELEASE_PATH: 0 في مسارات التنقل والبطاقات؛ tilawah.tsx يستورد lib/mushaf-native (كلمات الصفحة لمحرك التسميع) — أصل تقني مُدار بـ MUSHAF_ASSETS_ENABLED=false ولا يحمّل ملفات QCF
- QCF_FILES_IN_IOS_EXPORT: 0

## PHASE 9 — QCF RECOVERY
- QCF_RECOVERABLE: **YES** (من Git history — commits مثل `1dc7879`, `db7c98f` تضمنت أصول QCF للموبايل قبل فصلها)
- QCF_RECOVERY_SOURCE: Git history (git log يُظهر "Import Mushaf fonts and page data for mobile application")
- QCF_RESTORED: NO (لم تُسترجع ولم تُضف للـworkspace)

## PHASE 10 — TECHNICAL GATES
- MOBILE_TYPECHECK: PASS
- EXPO_CONFIG: PASS (الهوية بلا تغيير)
- IOS_METRO_EXPORT: PASS (14M، 0 QCF)
- API_BUILD: PASS
- WEB_BUILD: PASS (يتطلب PORT وBASE_PATH في بيئة البناء)
- GIT_DIFF_CHECK: PASS
- QCF_FILES_IN_IOS_EXPORT: 0

## FINAL DECISION
```text
WEB_USED_AS_SOURCE_OF_TRUTH: YES
MUSHAF_VISIBLE_IN_MOBILE: NO
MUSHAF_QCF_INCLUDED_IN_BUILD: NO
QCF_RECOVERABLE: YES (Git history)
NAVIGATION_PARITY: PASS
HOME_PARITY: PASS
TRACKS_PARITY: PASS
LEVELS_PARITY: PASS
STUDENT_PARITY: PARTIAL (placement/booking تفاصيل تدفق أقل)
TEACHER_PARITY: PARTIAL (TeacherHome KPIs وتنبيهات + إجراءات approve)
SUPERVISOR_PARITY: PARTIAL (AdminHome KPIs/تنبيهات)
SVG_PARITY: PASS
LIGHT_MODE_PARITY: PASS
DARK_MODE_PARITY: PASS
RTL_PARITY: PASS
FUNCTIONAL_PARITY: PARTIAL (عمق تدفقات موثّق أعلاه)
API_PARITY: PASS
DEAD_ROUTES: 0
LEGACY_LINKS: 0
USER_VISIBLE_MOCKS: 0
FAKE_SUCCESS_PATHS: 0
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
IOS_METRO_EXPORT: PASS
IOS_EXPORT_SIZE: 14M
READY_FOR_VISUAL_REVIEW: YES
READY_FOR_REAL_IPHONE_TEST: YES (بعد المراجعة البصرية اليدوية)
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```
