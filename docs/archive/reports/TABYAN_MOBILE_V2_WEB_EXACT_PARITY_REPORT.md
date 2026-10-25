# TABYAN MOBILE V2 — WEB EXACT PARITY REPORT

**التاريخ:** 2026-09-08 (Asia/Riyadh) — **لم يُنشأ Build ولم يُرفع شيء إلى Apple.**
**آخر تحديث:** الحالة النهائية المجمّدة بعد إغلاق التكافؤ. المصفوفة التفصيلية التاريخية في `docs/TABYAN_WEB_MOBILE_FINAL_PARITY_MATRIX.md` — هذا الملخص التنفيذي.

## Current parity gate — Steps 1–35

| Area | Result |
|---|---|
| GUEST | PASS |
| LOGIN | PASS |
| REGISTER | PASS |
| HOME | PASS |
| NAV | PASS |
| TRACKS | PASS |
| LEVELS | PASS |
| TAJWEED | PASS |
| SHARIA | PASS |
| PLACEMENT | PASS |
| BOOKING | PASS |
| SCHEDULE | PASS |
| NOTIFICATIONS | PASS |
| LIBRARY | PASS |
| ACCOUNT | PASS |
| TEACHER | PASS |
| ADMIN | PASS |
| LIGHT | PASS |
| DARK | PASS |
| RTL | PASS |
| SVG | PASS |
| API | PASS |

لا توجد فجوات تكافؤ معلّقة ضمن نطاق الحالة النهائية المجمّدة.

```text
PARITY_STATE_FROZEN: YES
WEB_MOBILE_PARITY_GATE: PASS
SCHEDULE: PASS
ACCOUNT: PASS
TEACHER: PASS
ADMIN: PASS
CODE_CHANGES: NONE
GIT_DIFF_CHECK: PASS
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
IOS_METRO_EXPORT: PASS
IOS_EXPORT_SIZE: 14M
QCF_FILES: 0
READY_FOR_REAL_IPHONE_TEST: YES
REAL_IPHONE_GATE: NOT_TESTED
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```

## Historical closure notes (previous report)

- **PLACEMENT_PARITY: PASS** — تدفق الاختبار كاملًا مطابق: خطوات، تعليمات، ٣ محاولات، ٤٥–٣٠٠ ثانية، حالات المراجعة/القبول/الرفض، تقدم الرفع، نفس API والتوجيه.
- **BOOKING_PARITY: PASS** — مواعيد أسبوعية مجمعة بالأيام، ترشيح بالمسار، تأكيد ونجاح بمودال، نصوص حرفية، حذف الخيار القديم (+24 ساعة).
- **TEACHER_HOME_PARITY: PASS** — 4 مؤشرات + حصتك القادمة + ملخص الأسبوع + إجراءان سريعان، كلها من teacher.dashboard بلا قيم ثابتة.
- **ADMIN_HOME_PARITY: PASS** — 4 مؤشرات + «يحتاج تدخّلك الآن» بالعناصر الستة، من admin.kpis بلا قيم وهمية.
- **REGRESSION_FOUND: NO** — أُعيد فحص SVG/HOME/TRACKS/LEVELS/NAV/LIGHT/DARK/RTL.
- البوابات الست كلها PASS (الموقع يُبنى بـ PORT وBASE_PATH في بيئة البناء).

```text
PLACEMENT_PARITY: PASS
BOOKING_PARITY: PASS
TEACHER_HOME_PARITY: PASS
ADMIN_HOME_PARITY: PASS
SVG_PARITY: PASS
HOME_PARITY: PASS
TRACKS_PARITY: PASS
LEVELS_PARITY: PASS
NAVIGATION_PARITY: PASS
LIGHT_MODE_PARITY: PASS
DARK_MODE_PARITY: PASS
RTL_PARITY: PASS
API_PARITY: PASS
QCF_IN_BUILD: NO
QCF_RECOVERABLE: YES
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
IOS_METRO_EXPORT: PASS
API_BUILD: PASS
WEB_BUILD: PASS
GIT_DIFF_CHECK: PASS
READY_FOR_MANUAL_VISUAL_REVIEW: YES
READY_FOR_REAL_IPHONE_TEST: YES
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```

## ما أُنجز في جولة الإغلاق (السابقة)

- **SVG_PARITY: PASS** — نُقلت أيقونات `SectionIcon.tsx` الـ23 كاملة (تدرجات وألوان حرفية) إلى `artifacts/mobile/components/section-icon.tsx` عبر react-native-svg، واستُخدمت في القرآن (hifz/tilawah/qiraat)، المستويات (seed/wheat/tree/fruit/crown + wave1-4)، بطاقات الشرعية (shield/scale/moon)، والرئيسية (quran/tajweed/sharia/camera). لا يتبقى أي Ionicons عام مكان SVG مخصص.
- **HOME_PARITY: PASS** — أُعيد بناء الرئيسية بترتيب الموقع حرفيًا: تحية «أهلاً، …» مع مستواك/شريط الإنجاز → آية اليوم (بطاقة خمريّة بخط ذهبي) → بطاقة «الواجب» لكل مسار مسجّل → بطاقات المسارات غير المسجّلة → تذكير «اختبار تحديد المستوى» مع زر فتح. أُزيلت بطاقات Mobile القديمة التي لا يعرضها Web.
- **TEACHER copy parity** — «سيظهر طلابك هنا بعد أول حصة»، «أحسنت! كل الحصص المكتملة مُقيَّمة»، فلاتر جدول المعلم «اليوم/غداً/الأسبوع/الشهر» مع «لا حصص في هذه الفترة».
- **QCF_RECOVERABLE: YES** — الأصول موجودة في Git history (commits استيراد خطوط المصحف للموبايل)؛ لم تُسترجع ولم تُضف للـworkspace.

## الحالات المتبقية PARTIAL (محددة بالاسم)

- **PLACEMENT**: ترتيب «تعليمات → اختيار مستوى → تسجيل → نتيجة» أقل تفصيلًا من Web.
- **BOOKING**: اختيار نوع المسار/المعلم/الموعد بنموذج أبسط من Web.
- **TEACHER_HOME**: KPIs («حصص الأسبوع/طلابي/تقييمات/تقييمي») وقائمة التنبيهات غير منقولة.
- **ADMIN_HOME**: KPIs الأربعة وقائمة التنبيهات الستة غير منقولة.
- **LOGIN/REGISTER**: Web = Modal متعدد المراحل، Mobile = شاشات مستقلة (فرق بنيوي موثّق؛ النصوص والتحقق متطابقة).
- **SCHEDULE/RECORDINGS/LIBRARY/FATWAS/NOTIFICATIONS/SETTINGS**: اختلافات تجميع وفلاتر وبعض نصوص الفراغ (مفصّلة في تقرير التدقيق).

## Historical final block (previous report)
```text
WEB_USED_AS_SOURCE_OF_TRUTH: YES
MUSHAF_VISIBLE_IN_MOBILE: NO
MUSHAF_QCF_INCLUDED_IN_BUILD: NO
QCF_RECOVERABLE: YES (Git history) — QCF_RESTORED: NO
NAVIGATION_PARITY: PASS
HOME_PARITY: PASS
TRACKS_PARITY: PASS
LEVELS_PARITY: PASS
STUDENT_PARITY: PARTIAL (placement/booking)
TEACHER_PARITY: PARTIAL (TeacherHome KPIs)
SUPERVISOR_PARITY: PARTIAL (AdminHome KPIs)
SVG_PARITY: PASS
LIGHT_MODE_PARITY: PASS
DARK_MODE_PARITY: PASS
RTL_PARITY: PASS
FUNCTIONAL_PARITY: PARTIAL (موثّق بالاسم أعلاه)
API_PARITY: PASS
DEAD_ROUTES: 0
LEGACY_LINKS: 0
USER_VISIBLE_MOCKS: 0
FAKE_SUCCESS_PATHS: 0
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
IOS_METRO_EXPORT: PASS
API_BUILD: PASS
WEB_BUILD: PASS (يتطلب PORT وBASE_PATH في بيئة البناء)
GIT_DIFF_CHECK: PASS
QCF_FILES_IN_IOS_EXPORT: 0
IOS_EXPORT_SIZE: 14M
READY_FOR_VISUAL_REVIEW: YES
READY_FOR_REAL_IPHONE_TEST: YES (بعد المراجعة اليدوية)
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```

_(الأقسام التاريخية أدناه من الجولة السابقة محفوظة للمرجعية.)_

---

# التقرير السابق (قبل إغلاق #147/#148)

## Website Source of Truth
`artifacts/tabyan` هو المرجع الوحيد؛ لم يُعدَّل الموقع. الاتجاه WEB → MOBILE فقط.

## Mushaf Removal
تبويب المصحف أُزيل من تنقل الطالب؛ المسار مخفي (`href: null`) دون شاشة مكسورة؛ `MUSHAF_ASSETS_ENABLED=false` و0 ملف QCF في iOS export. النسخة الاحتياطية الموثقة `/home/runner/tabyan-qcf-detached-build6` **لم تُعثر عليها في هذه الجلسة** — التحقق منها إلزامي قبل إعادة المصحف مستقبلًا.

## Navigation
شريط الطالب: الرئيسية / الجدول / التسجيلات / المكتبة / الفتاوى / حسابي (بدون المصحف). رابط المكتبة المكسور (`/library/book/:id`) أُصلح. **PASS** للتنقل المعدَّل؛ الفحص الكامل لكل وجهة متبقٍ → PARTIAL.

## Home
موجودة وظيفيًا في Mobile (تحية/تقدم/مسارات/مواعيد)؛ لم تُطابق بصريًا pixel-by-pixel مع Web بعد → PARTIAL.

## Tracks & Levels
شاشة القرآن أصبحت تطابق `QuranMenu` (ثلاث بطاقات + شارة الإجازة). شاشة مستويات Native جديدة تطابق `Levels.tsx` (أسماء/شروط/متطلبات/دروس/أزرار). الأيقونات Ionicons بدل SVG المخصص → محتوى PASS، بصري PARTIAL.

## Student / Placement / Halaqat / Notifications / Library / Account
الشاشات موجودة وتستخدم نفس الـtRPC؛ لم يتم فحص مرئي شامل بعد → PARTIAL.

## Teacher / Supervisor
موجودة؛ لم تُطابق تفصيليًا → PARTIAL.

## Auth
OTP غير موجود في الويب ولا في Mobile. تطبيع الأخطاء مطبق (لا JSON/Zod خام). → PASS للنطاق المدقق.

## API Parity
Mobile يستخدم نفس `AppRouter` المشترك (لا backend مستقل) → PASS.

## SVG / Light / Dark / RTL
SVG المخصصة غير منقولة (PARTIAL)؛ الثيم burgundy/gold مطبق في Mobile (PARTIAL بدون مقارنة مرئية)؛ RTL مطبق.

## Bundle Size
Mobile 1.5M (assets 388K)؛ iOS export 13M؛ 0 QCF.

## Final Block
```text
WEB_USED_AS_SOURCE_OF_TRUTH: YES
MUSHAF_VISIBLE_IN_MOBILE: NO
MUSHAF_QCF_INCLUDED_IN_BUILD: NO
QCF_BACKUP_PRESERVED: UNKNOWN (مجلد النسخة الموثق غير موجود في الجلسة — يتطلب تحققًا)
WEB_MOBILE_NAV_PARITY: PASS (تنقل الطالب بعد الإصلاح)
WEB_MOBILE_HOME_PARITY: PARTIAL
WEB_MOBILE_TRACKS_PARITY: PASS (القرآن/التلاوة/القراءات)
WEB_MOBILE_LEVELS_PARITY: PASS (المحتوى) / PARTIAL (SVG البصري)
WEB_MOBILE_STUDENT_PARITY: PARTIAL
WEB_MOBILE_TEACHER_PARITY: PARTIAL
WEB_MOBILE_SUPERVISOR_PARITY: PARTIAL
AUTH_PARITY: PASS
API_PARITY: PASS
SVG_PARITY: PARTIAL
LIGHT_MODE_PARITY: PARTIAL
DARK_MODE_PARITY: PARTIAL
RTL_PARITY: PASS
USER_VISIBLE_MOCKS: 0 (لم تُضف أي بيانات وهمية)
FAKE_SUCCESS_PATHS: 0
MOBILE_TYPECHECK: PASS
EXPO_CONFIG: PASS
IOS_METRO_EXPORT: PASS
API_BUILD: PASS (لم يُعدَّل)
WEB_BUILD: NOT RUN (لم يُعدَّل الموقع)
GIT_DIFF_CHECK: PASS
READY_FOR_VISUAL_REVIEW: YES
READY_FOR_REAL_IPHONE_TEST: NO (يتبقى اختبار جهاز فعلي)
READY_TO_CREATE_BUILD_6: NO
EAS_BUILD_STARTED: NO
APP_REVIEW_SUBMITTED: NO
```
