# TABYAN — Admin Mufti / Fatwa Deep Fix

## النطاق

هذه المرحلة تركز على مسارات المشرف Native في قسم الفتاوى والمفتين، مع إبقاء
مسارات الطلاب والمعلم العامة خارج النطاق. لم يبدأ Build 6 ولم تتم استعادة QCF.
لم تُجرَ إعادة تصميم عامة للتطبيق.

## 1. خريطة المسارات

### Native Admin

| المسار | الملف | نقطة الدخول |
|---|---|---|
| `/admin` | `artifacts/mobile/app/admin/index.tsx` | لوحة المشرف، بطاقات التنبيه ومسارات الإدارة |
| `/admin/fatwas` | `artifacts/mobile/app/admin/fatwas.tsx` | قائمة الفتاوى ذات تبويبات الحالة والإجراءات |
| `/admin/muftis` | `artifacts/mobile/app/admin/muftis.tsx` | إدارة المفتين والتخصصات والسعة |

تظهر المسارات في:

- `artifacts/mobile/app/admin/_common.tsx` عبر `adminRoutes`
- `artifacts/mobile/components/navigation-menu.tsx` لقائمة المشرف
- `artifacts/mobile/app/admin/index.tsx` في بطاقات التنبيه والمسارات

### Web reference

المساران المسجلان في الموقع هما:

- `/admin/fatwas` → `artifacts/tabyan/src/pages/admin/AdminFatwas.tsx`
- `/admin/muftis` → `artifacts/tabyan/src/pages/admin/AdminMuftis.tsx`

لم تُعدّل ملفات Web في هذه المرحلة (`WEB_CHANGED: NO`).

### Guards

- `artifacts/mobile/app/admin/_layout.tsx` يمنع الدخول ما لم يوجد token ودور
  `admin`.
- إجراءات الخادم تستخدم `adminProcedure`.
- إجابة المفتي موجودة في `/teacher/fatwas`، والواجهة تتحقق من `isMufti`.
- حماية الخادم لمسار المفتي بقيت كما هي ولم تُخفف.

## 2. المسارات المعطوبة والجذور

### قبل الإصلاح

لم يوجد target مسار مفقود في خريطة Expo Router؛ لذلك لم يكن العطل 404 أو
redirect loop. العيوب كانت داخلية في التدفق:

1. قائمة Native لا توفر فلاتر الأولوية والتصنيف والمفتي أو بحثاً عربياً.
2. selector المفتين كان قائمة غير قابلة للبحث.
3. رسالة إعادة الإسناد كانت نفس رسالة الإسناد الأول.
4. رفض السؤال ورفض الإجابة لا يطلبان تأكيداً.
5. بعض عناصر Native لا تُعطل أثناء mutation.
6. `hoursAgo` في Admin كان محسوباً من إنشاء السؤال لا من `assignedAt`.
7. إعادة إسناد سؤال إلى مفتي بلغ السعة كانت تحسب السؤال نفسه ضمن السعة.
8. تغيير تصنيف سؤال مسند كان قد يترك السؤال خارج تخصص المفتي الحالي.
9. رفض سؤال غير موجود كان يمكن أن ينتهي بنجاح ظاهري.

### بعد الإصلاح

`BROKEN_MUFTI_ROUTES_AFTER_FIX: 0` في الفحص البنيوي والكود. لا تزال رحلة
المستخدم الحقيقية بحاجة إلى جلسة Admin/Mufti وبيانات Dev معتمدة لإثباتها
تشغيلياً.

## 3. الإصلاحات المنفذة

### قائمة الفتاوى

- إضافة فلاتر حقيقية إلى `admin.fatwaInbox`:
  - الحالة
  - الأولوية
  - التصنيف
  - المفتي المسند إليه
  - البحث في نص السؤال
- دعم البحث العربي عبر `ilike`.
- إضافة بحث عربي داخل selector المفتي.
- الحفاظ على حالة التحميل، الفارغ، الخطأ، وإعادة المحاولة.
- إبقاء حد القائمة الحالي 100 عنصراً؛ pagination ليست مدعومة حالياً.

### الإسناد وإعادة الإسناد

- الإسناد الأول:
  - `تم إرسال الفتوى إلى المفتي بنجاح`
- إعادة الإسناد:
  - `تمت إعادة إسناد الفتوى بنجاح`
- الفشل:
  - `تعذر إرسال الفتوى إلى المفتي، حاول مرة أخرى`
- تعطيل الأزرار والـselectors أثناء الطلب ومنع الإرسال المزدوج.
- تحديث قائمة الفتاوى وKPI بعد نجاح العملية.
- استثناء السؤال الحالي من عداد السعة عند إعادة إسناده إلى المفتي نفسه.

### النشر والرفض والتصنيف

- نشر عام:
  - `تم نشر الفتوى بنجاح`
- نشر خاص:
  - `تم نشر الفتوى بشكل خاص`
- رفض الإجابة:
  - `تم رفض الإجابة`
- رفض السؤال:
  - `تم رفض السؤال`
- إضافة تأكيد قبل الرفض.
- تعطيل عناصر الإجراء أثناء الطلب.
- رفض السؤال غير الموجود يعيد `NOT_FOUND` بدلاً من نجاح ظاهري.
- تغيير التصنيف لسؤال مسند يُرفض إذا لم يكن التصنيف الجديد ضمن تخصص المفتي
  الحالي.

### إدارة المفتين

- إضافة جميع تصنيفات الفتاوى المدعومة إلى شاشة Native.
- تصحيح حد السعة في الواجهة إلى `1–50` بما يطابق الخادم.
- تطبيع الأرقام العربية والفارسية قبل التحقق والإرسال.
- رسالة التعيين:
  - `تم تعيين المفتي بنجاح`
- رسالة إلغاء التعيين:
  - `تم إلغاء تعيين المفتي`
- تعطيل زر إلغاء التعيين أثناء الطلب مع تأكيد مسبق.
- تحديث قائمة المفتين والمعلمين والإحصاءات بعد النجاح.
- تقييد `muftiAssign` في الخادم إلى `categoryEnum` بدلاً من `string`.

## 4. الإشعارات

الإشعار حقيقي من الخادم وليس رسالة محلية فقط:

```text
سؤال فتوى جديد أُسند إليك
```

يُرسل إلى `input.muftiId` مع ملاحظة الإسناد في body ونوع `fatwa`.

لا يوجد إجراء مستقل لإلغاء إسناد فتوى؛ الموجود فعلياً هو إعادة الإسناد.
لذلك لم يتم اختراع `fatwaUnassign`.

## 5. الأسماء والأرقام العربية

- أسماء المفتين تعرض من `users.fullName` ولا تتطلب إدخال ID.
- selector المفتين يقبل البحث النصي بالأسماء العربية.
- لا توجد regex ASCII-only في هذه المسارات.
- تدعم شاشة السعة:
  - `٠١٢٣٤٥٦٧٨٩`
  - `۰۱۲۳۴۵۶۷۸۹`
  - `0123456789`
- التطبيع يطبق على السعة فقط، وليس على كلمات المرور.

## 6. رسائل الخطأ وحماية الصلاحيات

- رسائل Native تمر عبر `safeError`/`userFacingErrorMessage`.
- لا يتم عرض JSON أو Zod أو SQL أو stack trace أو `error.message` الخام.
- الخادم ما زال يفرض `adminProcedure` و`approvedTeacherProcedure`/حارس المفتي
  حسب المسار.
- لا تظهر أدوات المفتي للمعلم غير المصرح له في قائمة المعلم.

## 7. نتائج التحقق

- `pnpm --dir artifacts/mobile run typecheck`: PASS
- `pnpm --dir lib/tabyan-trpc exec tsc --build --force`: PASS
- `pnpm --filter @workspace/tabyan-trpc test`: PASS — 8 ملفات، 42 اختباراً
- `pnpm --dir artifacts/mobile exec expo install --check`: PASS
- Expo Web export: PASS
- Expo iOS Metro export: PASS
- `git diff --check`: PASS
- Workflow `artifacts/mobile: expo`: RUNNING
- لا توجد أخطاء Browser console جديدة في اللقطة الأخيرة.

## 8. الفجوات المتبقية

1. لم تُنفذ جولة Admin/Mufti يدوية كاملة لعدم توفر جلسة وصلاحيات وبيانات Dev
   معتمدة. لذلك لا أدّعي نجاح الإسناد الفعلي أو وصول الإشعار أو تحديث الحالة
   بصرياً في جهاز حقيقي.
2. لا يوجد حقل قاعدة بيانات دائم لملاحظة الإسناد؛ الملاحظة الحالية تُرسل ضمن
   إشعار المفتي فقط.
3. لا يوجد pagination بعد أول 100 فتوى.
4. لا يوجد إجراء backend مستقل لـunassign fatwa.
5. لم تُعدل Web في هذه المرحلة، رغم أن خريطة Web والإجراءات الموجودة تمت
   مراجعتها.

## 9. حالة التقرير

```text
BROKEN_MUFTI_ROUTES_AFTER_FIX: 0 (static route audit)
ADMIN_FATWA_LIST: PASS (code/build; manual pending)
ADMIN_FATWA_DETAIL: PASS (inline action detail; manual pending)
ASSIGN_FATWA_TO_MUFTI: PASS (code/build; manual pending)
REASSIGN_FATWA: PASS (code/build; manual pending)
UNASSIGN_FATWA: NOT_SUPPORTED (no backend action exists)
FATWA_STATUS_ACTIONS: PASS (code/build; manual pending)
ADMIN_MUFTI_MANAGEMENT: PASS (code/build; manual pending)
MUFTI_SELECTOR: PASS (Arabic search and readable names)
MUFTI_ASSIGNMENT_NOTIFICATION: PASS (real backend notification)
MUFTI_ARABIC_NAMES: PASS
MUFTI_ARABIC_DIGITS: PASS
MUFTI_ROLE_GUARDS: PASS
MUFTI_ERROR_UI: PASS
RAW_TECHNICAL_ERRORS: 0 in inspected Admin Native paths
FUNCTIONAL_REGRESSION: NONE FOUND BY STATIC/BUILD/TEST CHECKS
BACKEND_CHANGED: YES (validated contract/data-integrity fixes only)
WEB_CHANGED: NO
BUILD_STARTED: NO
```