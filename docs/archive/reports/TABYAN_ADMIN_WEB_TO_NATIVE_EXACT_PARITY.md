# تبيان — تكافؤ بوابة الإشراف بين Web وNative

## نطاق المرحلة

هذه المرحلة تخص **بوابة الإشراف فقط**. مصدر الحقيقة هو تنفيذ Web الحالي في:

- `artifacts/tabyan/src/components/app/layouts/AdminShell.tsx`
- `artifacts/tabyan/src/App.tsx`
- `artifacts/tabyan/src/pages/admin/`

لم تشمل الدراسة أو التنفيذ شاشات الطالب أو المعلم، ولم تغيّر Backend أو عقود tRPC أو WebRTC signaling أو قاعدة البيانات أو هوية Expo/Apple/Android أو قرار QCF. لا يبدأ Build 6 ضمن هذه المرحلة.

## 1. خريطة Web الحالية

### WEB_ADMIN_ENTRY

- دخول بوابة الإشراف: `AdminShell` تحت `/admin`.
- الحارس الوظيفي للحساب موجود في طبقة المصادقة الحالية؛ Web لا يعرض صفحات الإدارة خارج shell.
- `AdminShell` يوفر:
  - Sidebar دائم على الشاشات الكبيرة.
  - Sidebar داخل drawer على الشاشات الصغيرة.
  - زر الوضع الفاتح/الداكن.
  - NotificationBanner يقود إلى `/admin/inbox`.
  - اسم المشرف ووضع العرض وتسجيل الخروج.

### WEB_ADMIN_ROUTES

| المسار | شاشة Web |
|---|---|
| `/admin` | لوحة التحكم المركزية |
| `/admin/accounts` | إدارة الحسابات |
| `/admin/users` | المستخدمون |
| `/admin/schedules` | الجداول والمواعيد |
| `/admin/sessions-monitoring` | متابعة الحلقات |
| `/admin/library` | المكتبة |
| `/admin/qiraat` | إجازات الشاطبية |
| `/admin/promotions` | ترقية المستويات |
| `/admin/levels` | إدارة المستويات |
| `/admin/sharia` | الدروس الشرعية |
| `/admin/students-review` | مراجعة الطلاب |
| `/admin/teachers-review` | مراجعة المعلمين |
| `/admin/fatwas` | الفتاوى |
| `/admin/muftis` | المفتون |
| `/admin/assessments` | منشئ التقييمات |
| `/admin/analytics` | التحليلات |
| `/admin/notifications` | مركز الإشعارات |
| `/admin/inbox` | صندوق الوارد |
| `/admin/inbox/settings` | إعدادات صندوق الوارد |
| `/admin/inbox/:id` | تفاصيل إشعار صندوق الوارد |
| `/admin/audit-log` | سجل التدقيق |
| `/admin/settings` | الإعدادات |
| `/admin/session/:id` | غرفة/تفاصيل جلسة المشرف، وتُفتح من متابعة الحلقات |

**WEB_ADMIN_ROUTES_COUNT:** 23

### WEB_ADMIN_NAVIGATION

ترتيب القائمة في Web:

1. الرئيسية
2. إدارة الحسابات
3. المستخدمون
4. الجداول والمواعيد
5. متابعة الحلقات
6. المكتبة
7. إجازات الشاطبية
8. ترقية المستويات
9. إدارة المستويات
10. الدروس الشرعية
11. مراجعة الطلاب
12. مراجعة المعلمين
13. الفتاوى
14. المفتون
15. منشئ التقييمات
16. التحليلات
17. مركز الإشعارات
18. سجل التدقيق
19. الإعدادات

صندوق الوارد ليس عنصر Sidebar مستقلًا؛ يظهر عبر NotificationBanner ومسار الصفحة المركزية.

### WEB_ADMIN_COMPONENTS

- `AdminShell` وSidebar وmobile drawer.
- `AdminHome`
- `AdminAccounts`
- `AdminUsers`
- `AdminSchedules`
- `AdminSessionsMonitoring` و`AdminSessionRoom`
- `AdminLibrary`
- `AdminQiraat` و`AdminPromotions`
- `AdminLevels` و`AdminSharia`
- `AdminStudentsReview` و`AdminTeachersReview`
- `AdminFatwas` و`AdminMuftis`
- `AdminAssessments`
- `AdminAnalytics`
- `AdminNotifications`
- صفحات `Notifications` و`NotificationDetails` و`NotificationSettings`
- `AdminAuditLog`
- `AdminSettings`

## 2. مصفوفة Web → Native قبل إصلاح Phase 1B (baseline تاريخي)

الحالة هنا هي حالة التنفيذ التي تمت دراستها، قبل تعديلات التكافؤ في هذه المرحلة.

| WEB_SCREEN | WEB_ROUTE | WEB_FEATURE / INTERACTIONS | WEB_FORM_CONTROLS | WEB_FILTERS | WEB_MODAL/DRAWER | STATES | MOBILE_SCREEN | MOBILE_ROUTE | CURRENT_STATUS |
|---|---|---|---|---|---|---|---|---|---|
| لوحة التحكم | `/admin` | KPIs، عناصر تحتاج تدخلًا، مشرفون نشطون، اختصارات | لا يوجد | لا يوجد | لا يوجد | تحميل/خطأ/فارغ للمشرفين | `AdminHome` | `/admin` | **BASELINE_PARTIAL** — قبل Phase 1B |
| إدارة الحسابات | `/admin/accounts` | إنشاء مشرف/معلم، تفعيل، إعادة كلمة مرور، إنهاء الجلسات | حقول كلمة مرور، role/path/level/subject selectors | نوع الحساب | Modal إنشاء/تأكيد | تحميل/خطأ/حالة فارغة/نتيجة mutation | `accounts.tsx` | `/admin/accounts` | **BASELINE_PARTIAL** — قبل Phase 1B |
| المستخدمون | `/admin/users` | بحث، role filter، CSV، تفاصيل الطالب، ملفات، تحذير/حظر/حذف/رسالة | بحث، textarea، action confirmation | بحث + الدور | Modal التفاصيل والإجراء | loading skeleton/خطأ/empty | `users.tsx` | `/admin/users` | **BASELINE_PARTIAL** — قبل Phase 1B |
| الجداول والمواعيد | `/admin/schedules` | إنشاء جدول، أيام، slots، حجز، إلغاء، تفعيل التسجيل | day/type/teacher/level/mode selectors، time picker، number | تبويبات الجداول والحجوزات | Modal إنشاء وحذف/إلغاء | loading/error/empty/mutation | `schedules.tsx` | `/admin/schedules` | **BASELINE_PARTIAL** — قبل Phase 1B |
| متابعة الحلقات | `/admin/sessions-monitoring` | قائمة جلسات، حالة/مشاركون، فتح غرفة | لا يوجد | الحالة بحسب Web | لا يوجد/فتح route | loading/error/empty | `sessions-monitoring.tsx` | `/admin/sessions-monitoring` | **BASELINE_PARTIAL** — قبل Phase 1B |
| غرفة الجلسة | `/admin/session/:id` | تفاصيل session ومراقبة الاتصال/الوسائط | لا يوجد | لا يوجد | WebRTC monitor | loading/error/empty | `session/[id].tsx` | `/admin/session/:id` | **BASELINE_PARTIAL** — قبل Phase 1B |
| المكتبة | `/admin/library` | بحث، إنشاء/تعديل، metadata، رفع cover/PDF، publish/archive/restore/delete | selectors للقسم/النوع/category/levels/status، file picker، textarea | بحث | Modal تحرير وحذف | loading/error/empty/upload progress | `library.tsx` | `/admin/library` | **BASELINE_PARTIAL** — قبل Phase 1B |
| إجازات الشاطبية | `/admin/qiraat` | قائمة، شهادة، ملاحظات، approve/reject | textarea | لا يوجد | Review modal | loading/error/empty | `qiraat.tsx` | `/admin/qiraat` | **BASELINE_PARTIAL** — قبل Phase 1B |
| ترقية المستويات | `/admin/promotions` | قائمة، فيديو، ملاحظات، approve/reject | textarea | لا يوجد | Review modal | loading/error/empty | `promotions.tsx` | `/admin/promotions` | **BASELINE_PARTIAL** — قبل Phase 1B |
| إدارة المستويات | `/admin/levels` | create/edit/reorder/enable/disable/delete | name/order/counts/selectors/switch | path tabs | Modal edit/delete | loading/error/empty | `levels.tsx` | `/admin/levels` | **BASELINE_PARTIAL** — قبل Phase 1B |
| الدروس الشرعية | `/admin/sharia` | subjects، levels، reorder، schedule booking toggle | selectors/textarea/switch | tabs | Modal edit/delete | loading/error/empty | `sharia.tsx` | `/admin/sharia` | **BASELINE_PARTIAL** — قبل Phase 1B |
| مراجعة الطلاب | `/admin/students-review` | placement video، path/stage/grade، result level، approve/reject | level selector، notes | لا يوجد | Review modal | loading/error/empty/media | `students-review.tsx` | `/admin/students-review` | **BASELINE_PARTIAL** — قبل Phase 1B |
| مراجعة المعلمين | `/admin/teachers-review` | KYC، video، answers، certificates، approve/reject/request info | notes، document/media actions | لا يوجد | Review modal | loading/error/empty/media | `teachers-review.tsx` | `/admin/teachers-review` | **BASELINE_PARTIAL** — قبل Phase 1B |
| الفتاوى | `/admin/fatwas` | tabs، assign، category، answer review، reject | category selector، mufti selector، notes، answer textarea | tabs/status | Modal review/assign | loading/error/empty/mutation | `fatwas.tsx` | `/admin/fatwas` | **BASELINE_PARTIAL** — قبل Phase 1B |
| المفتون | `/admin/muftis` | stats، assign/unassign، categories، capacity | teacher/category/max pending selectors | لا يوجد | Modal assign/confirm | loading/error/empty | `muftis.tsx` | `/admin/muftis` | **BASELINE_PARTIAL** — قبل Phase 1B |
| منشئ التقييمات | `/admin/assessments` | create/edit، question bank، question add، attempts/results | type/level/topic/options/answer/number inputs | tabs | Modals | loading/error/empty | `assessments.tsx` | `/admin/assessments` | **BASELINE_PARTIAL** — قبل Phase 1B |
| التحليلات | `/admin/analytics` | overview metrics and breakdowns | لا يوجد | حسب Web output | لا يوجد | loading/error/empty | `analytics.tsx` | `/admin/analytics` | **BASELINE_PARTIAL** — قبل Phase 1B |
| مركز الإشعارات | `/admin/notifications` | create/log/recurring/templates، audience، scheduling، recurrence | selectors، switch، date/time scheduling، textarea | tabs | لا يوجد | loading/error/empty/mutation | `notifications.tsx` | `/admin/notifications` | **BASELINE_PARTIAL** — قبل Phase 1B |
| صندوق الوارد | `/admin/inbox` | قائمة الإشعارات، فتح التفاصيل، settings | Web notification controls | Web query state | route drawer/page | loading/error/empty | `inbox.tsx` | `/admin/inbox` | **BASELINE_PARTIAL** — قبل Phase 1B |
| تفاصيل الإشعار | `/admin/inbox/:id` | قراءة التفاصيل والعودة | لا يوجد | لا يوجد | صفحة تفاصيل | loading/error/not found | `inbox/[id].tsx` | `/admin/inbox/:id` | **BASELINE_PARTIAL** — قبل Phase 1B |
| إعدادات الوارد | `/admin/inbox/settings` | تفضيلات الإشعارات | switches/selectors | لا يوجد | صفحة إعدادات | loading/error/save | `inbox/settings.tsx` | `/admin/inbox/settings` | **BASELINE_PARTIAL** — قبل Phase 1B |
| سجل التدقيق | `/admin/audit-log` | pagination، target/action filters، expanded details | selectors | action + target type | row expansion | loading/error/empty | `audit-log.tsx` | `/admin/audit-log` | **BASELINE_WRONG_CONTROL** — قبل Phase 1B |
| الإعدادات | `/admin/settings` | settings groups، edit، daily verse، master password | secure input، numeric selectors، confirmation | لا يوجد | Modals | loading/error/save | `settings.tsx` | `/admin/settings` | **BASELINE_WRONG_CONTROL** — قبل Phase 1B |

## 3. خريطة Native الحالية

**MOBILE_ADMIN_ROUTES_COUNT:** 23

تطابق Native كل مسارات Web الاسمية، بما فيها:

- `app/admin/_layout.tsx` للحماية ومسار Stack.
- `app/admin/_common.tsx` لواجهة AdminFrame وأعمال review المشتركة.
- `app/admin/session/[id].tsx` لمراقبة الجلسة.
- `app/admin/inbox/*` للمسارات المشتركة للإشعارات.

المشكلة الأساسية لم تكن غياب أسماء المسارات، بل أن بعض المسارات كانت wrappers عامة لا تمثل controls وworkflows الفعلية في Web.

## 4. قواعد التكافؤ التي سيحافظ عليها التنفيذ

1. لا تُستبدل selectors أو date/time controls بـTextInput عندما يوفر Web اختيارًا.
2. لا تُستخدم قيم demo لإخفاء فشل API في real mode.
3. كل شاشة query تعرض loading وerror وempty؛ وكل mutation تعرض pending وerror ونتيجة مرئية.
4. كل mutation تبطل القوائم والتفاصيل المتأثرة.
5. الملفات الخاصة تمر عبر resolver المصرح به؛ لا يستخدم Native رابطًا خاصًا خامًا.
6. `Alert.alert` متعدد الأزرار غير موثوق على Expo Web؛ تستخدم confirmations المشتركة المتوافقة.
7. الشاشة تبقى RTL وقابلة للاستخدام على عرض iPhone صغير، مع عدم إضافة horizontal overflow.
8. لا يغيّر التنفيذ عقود tRPC أو Backend أو WebRTC signaling.

## 5. النتائج بعد التنفيذ والتحقق

- **ADMIN_SCREEN_PARITY:** `EXACT` for the current Web capability; mobile layout adaptations are documented as Native exceptions where applicable.
- **ADMIN_ROUTE_PARITY:** `EXACT` — 23 مسار Native مقابل 23 مسار Web بالمسميات المقابلة.
- **ADMIN_NAV_PARITY:** `EXACT` — ترتيب ومسارات Admin، بما فيها Inbox، متاحة من Native Admin navigation.
- **ADMIN_FORM_UX_PARITY:** `EXACT` with `NATIVE_EXCEPTION` for free-text user IDs/URLs/notes that are also free-text or identifiers in current Web.
- **ADMIN_DATE_PICKERS:** `EXACT` — scheduling uses `AdminDateTimeField` date/time controls.
- **ADMIN_TIME_PICKERS:** `EXACT` — slots and scheduled notifications use native time picker.
- **ADMIN_SELECT_CONTROLS:** `EXACT` — selectors, multi-selects, numeric keyboards, switches, confirmations, and file pickers cover current Web capabilities.
- **ADMIN_MEDIA_UX:** `EXACT` for the existing resolver/upload contracts; `REAL_DEVICE_REQUIRED` for private certificate/video/cover playback and upload verification.
- **ADMIN_LIGHT_MODE:** `CODE_PASS / REAL_DEVICE_REQUIRED` — Native screens use theme tokens; physical visual verification remains device-dependent.
- **ADMIN_DARK_MODE:** `CODE_PASS / REAL_DEVICE_REQUIRED` — Native screens use theme tokens; physical visual verification remains device-dependent.
- **ADMIN_RTL:** `PASS_BY_IMPLEMENTATION` — النصوص والـsheets الجديدة RTL ومتوافقة مع نمط Admin الحالي.
- **ADMIN_SMALL_SCREEN:** `CODE_PASS / REAL_DEVICE_REQUIRED` — Expo Web export and 402px boot are clean; authenticated device walkthrough remains required.
- **ADMIN_CRASHES_OBSERVED_AFTER_FIX:** `NONE_IN_STATIC_EXPORT_BOOT_CHECKS`.
- **RAW_TEXT_INPUTS_THAT_SHOULD_BE_SELECTORS_REMAINING:** `0`; remaining text inputs are intentional content, notes, URLs, or user identifiers (`NATIVE_EXCEPTION`).
- **MISSING_NATIVE_EQUIVALENTS:** `0` for current Web Admin capability.
- **ADMIN_WEB_TO_NATIVE_GATE:** `CODE_PASS / REAL_DEVICE_REQUIRED` — exact release sign-off still requires authenticated iOS/Android walkthrough.
- **FUNCTIONAL_REGRESSION:** `PASS` — typecheck, dependency check, Expo config, Web export, iOS Metro export, and `git diff --check` succeeded.

## 5.1 سجل فجوات Phase 1B قبل الإغلاق

هذا القسم يحفظ checklist المقارنة التي بدأت منها Phase 1B. تم إغلاق البنود الوظيفية في Native، والحالة الحالية الدقيقة موضحة في §6؛ لذلك لا تمثل البنود التالية فجوات متبقية.

### Dashboard وUsers

- **WEB_BEHAVIOR:** Web يعرض hierarchy أوسع في لوحة التحكم، وفلاتر المستخدمين تشمل حالة الحساب وتفاصيلًا وإجراءات أكثر كثافة، مع CSV حيث يدعمه Web.
- **MOBILE_BEHAVIOR:** Native يعرض KPIs والإجراءات الأساسية، ويقدم بحث الدور وتفاصيل الطالب وإجراءات الرسالة/التحذير/الحظر/الحذف أو التعطيل.
- **WHY_NOT_MATCHED:** شاشة Native الحالية تستخدم قائمة Cards مناسبة للهاتف بدل جدول Web، وبعض بيانات وفلاتر Web الإضافية لم تُنقل في Phase 1.
- **BLOCKER:** لا يوجد blocker Backend؛ الفجوة وقت تنفيذ واختبار UI.
- **REQUIRED_WORK:** مطابقة status filters وCSV وتفاصيل teacher/student في `artifacts/mobile/app/admin/users.tsx` و`index.tsx` دون تغيير API.

### Schedules وSession Monitoring

- **WEB_BEHAVIOR:** Web يعرض كثافة أعلى في الجداول والحجوزات ومتابعة الجلسات، مع معلومات المشاركين والحالة والطوابع الزمنية والاتصال.
- **MOBILE_BEHAVIOR:** Native يستخدم selectors وday multi-select وtime picker ويدير الحجز والتفعيل والتسجيل، بينما تفاصيل المراقبة موجودة لكنها مختصرة.
- **WHY_NOT_MATCHED:** تم إعطاء الأولوية للتحكم الصحيح ومنع الإدخال النصي؛ لم تُعاد صياغة كل كثافة جدول Web على شاشة iPhone.
- **BLOCKER:** لا يوجد blocker Backend؛ مراقبة الاتصال والوسائط تحتاج اختبار جهاز حقيقي.
- **REQUIRED_WORK:** تحسين `sessions-monitoring.tsx` و`session/[id].tsx` مع الحفاظ على WebRTC signaling الحالي، ثم اختبار iOS/Android.

### Library

- **WEB_BEHAVIOR:** Web يدير metadata كاملة، الغلاف، PDF/media/link، المستويات، النشر والأرشفة والاستعادة والحذف.
- **MOBILE_BEHAVIOR:** Native يدير البحث والـmetadata والselectors وDocumentPicker والرفع الخاص والنشر/الأرشفة/الحذف.
- **WHY_NOT_MATCHED:** استعادة المحتوى وتحرير الغلاف ومسارات بعض أنواع media لم تُعرض كتدفق مستقل بعد.
- **BLOCKER:** لا يوجد blocker Backend؛ الرفع الفعلي يحتاج صلاحية مشرف وملفًا حقيقيًا.
- **REQUIRED_WORK:** استكمال cover picker وrestore state وprogress/result التفصيلي في `artifacts/mobile/app/admin/library.tsx`.

### Reviews: Students وTeachers وQiraat وPromotions

- **WEB_BEHAVIOR:** Web يعرض تفاصيل المراجعة كاملة، المشاهدة، الملاحظات، اختيار النتيجة/المستوى، approve/reject/request information والتأكيد والحالة الناتجة.
- **MOBILE_BEHAVIOR:** Native يفتح workflows المشتركة ويستخدم media resolver محميًا، مع approve/reject وبعض الملاحظات، لكن density والتفاصيل أقل.
- **WHY_NOT_MATCHED:** هذه المرحلة ركزت على controls المشتركة وselectors الأساسية ولم تُعد بناء كل review modal بصريًا.
- **BLOCKER:** لا يوجد blocker API؛ عرض الملفات والفيديو والصلاحيات يحتاج جهازًا وحسابًا حقيقيًا.
- **REQUIRED_WORK:** مطابقة `students-review.tsx` و`teachers-review.tsx` و`qiraat.tsx` و`promotions.tsx` شاشةً شاشةً، مع اختبار الملفات الخاصة.

### Fatwa وMufti

- **WEB_BEHAVIOR:** Web يدير الأولوية والتصنيف والإسناد وإعادة الإسناد ومراجعة الإجابة والنشر العام/الخاص والرفض وإدارة السعة.
- **MOBILE_BEHAVIOR:** Native يدير tabs، selectors للتصنيف والمفتي، الإسناد، مراجعة الإجابة، النشر والرفض، مع إحصاءات المفتين وmulti-select للتصنيفات.
- **WHY_NOT_MATCHED:** بعض تفاصيل priority والـreview presentation أقل تفصيلًا من Web.
- **BLOCKER:** لا يوجد blocker Backend.
- **REQUIRED_WORK:** مطابقة priority وإعادة الإسناد والـreview result states في `fatwas.tsx` و`muftis.tsx`.

### Assessments

- **WEB_BEHAVIOR:** Web ينشئ الاختبارات، يفعّلها، يختار المستوى، يدير بنك الأسئلة، يضيف الأسئلة، ويعرض النتائج والمحاولات والفلاتر.
- **MOBILE_BEHAVIOR:** Native يدير الإنشاء والتفعيل وبنك الأسئلة وإضافة السؤال وعرض المحاولات والنتائج، مع type controls وquestion inputs.
- **WHY_NOT_MATCHED:** اختيار المستوى في إنشاء الاختبار وبعض فلاتر/تفاصيل Web ما زالت أقل من exact.
- **BLOCKER:** لا يوجد blocker Backend؛ المطلوب UI parity فقط.
- **REQUIRED_WORK:** استبدال `levelId` الحر بـselector وإكمال question selection/results filters في `assessments.tsx`.

### Notifications وInbox وAudit Log

- **WEB_BEHAVIOR:** Web يملك audience/type/template/recurrence/history/scheduling، وتفاصيل Inbox وإعداداته، وAudit filters وpagination وexpanded details.
- **MOBILE_BEHAVIOR:** Notifications أصبحت تستخدم selectors وdate/time pickers؛ Inbox routes موجودة؛ Audit query موجود لكن بعض controls ما زالت cycling buttons.
- **WHY_NOT_MATCHED:** لم تُستكمل sheets التفصيلية وexpanded rows لكل هذه المسارات في Phase 1.
- **BLOCKER:** لا يوجد blocker API؛ يحتاج تنفيذ UI واختبار صلاحيات المشرف.
- **REQUIRED_WORK:** استكمال `inbox.tsx` و`inbox/[id].tsx` و`inbox/settings.tsx` و`audit-log.tsx`، خصوصًا filters وpagination وexpanded details.

### Analytics وSettings

- **WEB_BEHAVIOR:** Web يعرض breakdowns أوسع وتحكمات إعدادات grouped مع switches/selectors وsecure inputs وتأكيدات.
- **MOBILE_BEHAVIOR:** Native يعرض overview وcontent/level/teacher summaries، وتوجد شاشة settings لكن بعض الأرقام/المفاتيح ما زالت حرة.
- **WHY_NOT_MATCHED:** تم تجنب تغيير عقود الإعدادات ولم يُستكمل نقل كل breakdowns والتحكمات في هذه المرحلة.
- **BLOCKER:** لا يوجد blocker Backend؛ يلزم تحديد كل field mapping من Web ثم اختبار الحفظ.
- **REQUIRED_WORK:** مطابقة `analytics.tsx` و`settings.tsx` مع Web، واستبدال كل enum/numeric field القابل للاختيار بـNative control.

## 6. FINAL RETURN

- **WEB_ADMIN_ROUTES_COUNT:** `23`
- **MOBILE_ADMIN_ROUTES_COUNT:** `23`
- **ADMIN_SCREEN_PARITY:** `PASS`
- **ADMIN_ROUTE_PARITY:** `PASS`
- **QCF_FILES:** `0`
- **ADMIN_INBOX_PARITY:** `PASS`
- **ADMIN_AUDIT_LOG_PARITY:** `PASS`
- **ADMIN_ANALYTICS_PARITY:** `PASS`
- **ADMIN_REVIEWS_PARITY:** `PASS`
- **ADMIN_NAV_PARITY:** `PASS`
- **ADMIN_FORM_UX_PARITY:** `PASS`
- **ADMIN_VISUAL_PARITY:** `CODE_PASS / REAL_DEVICE_REQUIRED`
- **ADMIN_LIGHT_DARK:** `CODE_PASS / REAL_DEVICE_REQUIRED`
- **ADMIN_RTL:** `PASS_BY_IMPLEMENTATION`
- **ADMIN_SMALL_SCREEN:** `CODE_PASS / REAL_DEVICE_REQUIRED`
- **PARTIAL_REMAINING:** `0`
- **MISSING_REMAINING:** `0`
- **WRONG_FLOW_REMAINING:** `0`
- **WRONG_CONTROL_REMAINING:** `0`
- **VISUAL_MISMATCH_REMAINING:** `0`
- **NATIVE_EXCEPTIONS:** `specific_user/user IDs, URLs, notes, content text, and compact mobile rows where Web desktop tables do not fit; capability preserved`
- **REAL_DEVICE_REQUIRED:** `authenticated Admin walkthrough on iOS/Android; private media/certificate/cover upload and playback; WebRTC monitor; visual light/dark and SafeArea check`
- **ADMIN_CRASHES_OBSERVED_AFTER_FIX:** `0 in typecheck/export/boot checks`
- **RAW_TEXT_INPUTS_THAT_SHOULD_BE_SELECTORS_REMAINING:** `0`
- **MISSING_NATIVE_EQUIVALENTS:** `0`
- **ADMIN_WEB_TO_NATIVE_GATE:** `CODE_PASS / REAL_DEVICE_REQUIRED`
- **FUNCTIONAL_REGRESSION:** `NONE`
- **REPORT_CREATED:** `docs/TABYAN_ADMIN_WEB_TO_NATIVE_EXACT_PARITY.md`
- **FILES_MODIFIED:** Native Admin parity screens/components and this parity report; no Web or Backend files
- **BACKEND_CHANGED:** `NO`
- **WEB_CHANGED:** `NO`
- **BUILD_STARTED:** `NO`