---
name: Tabyan backend state & build gotchas
description: How Tabyan's api-server/storage/DB are wired, the trpc build gotcha, and what was seeded — read before touching backend, storage, or DB.
---

# Tabyan backend state (as of 2026-08-03)

## tRPC project-references build gotcha
After editing anything in `lib/tabyan-trpc/src/` (routers, schema types), you MUST run `pnpm exec tsc --build` inside `lib/tabyan-trpc/` — otherwise `artifacts/tabyan` typecheck fails with stale-type errors (e.g. "property does not exist" on newly added procedures).
**Why:** the frontend resolves `AppRouter` types from built declaration files (tsc --build project references), not raw source.
**How to apply:** any session that edits `lib/tabyan-trpc` or `lib/db` should rebuild both (`lib/db` first, then `lib/tabyan-trpc`) before typechecking the frontend. ملاحظة (2026-08-13): شوهد `npx tsc --build` يخرج بنجاح دون تحديث dist رغم تعديل المصدر — استخدم دائماً `npx tsc --build --force`، فالنجاح الظاهري لا يكفي دليلاً.

## Provenance of “endpoint disabled” errors
The exact English phrase `The endpoint has been disabled. Enable it using the API and retry.` can come from the managed database connection during a Drizzle query, not from the browser geocoder; identify its origin from the stack and query before changing location code.
**Why:** a phone/location investigation found BigDataCloud returning 200 while the same phrase appeared in `sessionReminderJob` database failures and coincided with `auth.completeProfile` 500s.
**How to apply:** keep provider errors out of the UI, but do not claim the geocoder is disabled unless the captured geocoder response itself has that status/body.

## Vitest Drizzle table mocks
When a Vitest `@workspace/db` table mock uses a Proxy, symbol properties must delegate to the target instead of being converted to strings; otherwise matchers can throw `b[IteratorSymbol] is not a function`.
**Why:** Vitest deep matchers probe symbol protocols while comparing mocked table objects.
**How to apply:** return `Reflect.get(target, property)` for symbol keys and use stringified property names only for Drizzle column lookups.

## Database was empty; seeded manually
The dev DB had zero rows (no levels, users, teachers, or admin master password). Seeded via `lib/db/seed-tabyan.mjs` (run from `lib/db/` with `MASTER_HASH` env; hash generated with bcryptjs from `lib/tabyan-trpc`). 14 levels (5 quran incl. الغرس/السنبلة, تصحيح التلاوة, إجازة حفص, 4 tajweed, 3 sharia), one admin user, one approved teacher, and `admin_master_password_hash` in system_settings.
**Why:** without seed data the real (non-demo) flow cannot work at all; the master password hash must never be stored in memory/docs.
**How to apply:** if the dev DB is ever reset, re-run the seed script; admin credentials live only with the user.

## Object storage wired into api-server
`artifacts/api-server/src/routes/storage.ts` implements upload presign (`POST /api/storage/uploads/request-url`), ACL finalize (`POST /api/storage/uploads/finalize`), private serving (`GET /api/storage/objects/*`, admin bypass + owner ACL), and public serving. Auth is the app's custom bearer token (Authorization header or `?token=` for media tags) — NOT Replit Auth; `demo-`/`dev-` tokens are rejected. Frontend upload flow: `artifacts/tabyan/src/lib/upload.ts` (presign → PUT to GCS → finalize; without finalize the object stays unreadable — fail-closed).
**Why:** the template assumed Replit Auth (`req.isAuthenticated()`); this app uses its own authTokens table, and media tags can't send headers so `?token=` is required.
**How to apply:** any new file-upload feature must reuse `uploadFile()` (it includes finalize); new serve paths must keep the admin-bypass + owner-ACL check.

## Private placement playback evidence
Production placement objects are private and unauthenticated GET/HEAD/Range requests return `401` JSON before storage metadata is observable; this is authorization evidence, not proof of missing media or broken Range playback.
**Why:** a forensic playback claim requires an authenticated request with the real owner/admin token and must record the final status, content headers, redirect auth behavior, and Range response.
**How to apply:** never classify placement video playback as PASS from an unauthenticated probe; keep placement review fail-closed when the student's path or selected level is missing/mismatched.

## Admin-login IP truncation
`x-forwarded-for` can carry a comma-separated chain that overflows `admin_login_attempts.ip_address` (varchar 45) — auth.ts takes the first IP and truncates.
**Why:** login started failing with a DB error once multiple proxies appeared in the chain.
**How to apply:** any new table logging raw IPs should truncate the same way.

## Seed rerun-safety rule (2026-08-03)
Every Tabyan seed section must be rerun-safe end-to-end: `ON CONFLICT DO NOTHING` is a silent no-op without a matching unique constraint (it once duplicated all levels on each run), lookups must reuse existing row ids instead of fresh UUIDs, and env-dependent updates must be skipped when the env var is unset rather than writing NULL.
**Why:** rerunning the seed silently corrupted dev data before these guards existed.
**How to apply:** before adding a seed insert, check the table's real unique constraints; prefer upserts against them, otherwise guard with NOT EXISTS; verify by running the seed twice.

## فئة قراءات للفتاوى والأقسام الجديدة (2026-08-03)
- تصنيفات الفتاوى ثابتة مشتركة: categoryEnum في routers/fatwa.ts (تستورده admin.ts — استيراد أحادي بلا دورة) + CATEGORY_LABELS في fatwa.ts وadmin.ts + FATWA_CATEGORIES في src/lib/format.ts. أي تصنيف جديد يُضاف للأربعة معاً (طول عمود category varchar(20)).
- شريط التنقل السفلي للطالب أصبح 9 تبويبات قابلة للتمرير أفقياً (overflow-x-auto + min-w) — لا flex-1 بعد الآن.
- صفحات جديدة تستدعي APIs خارجية مجانية بلا مفاتيح مباشرة من الواجهة: alquran.cloud (مصحف الملك فهد — صفحات 604 بترقيم المدينة)، aladhan.com (المواقيت)، bigdatacloud.net (اسم المدينة). المصحف يخزن العلامات وآخر صفحة في localStorage (tabyan.mushaf.*).
- Qibla.tsx: يجب حماية DeviceOrientationEvent بـ typeof قبل أي مرجع — مرجع مباشر يُسقط الصفحة ReferenceError على المتصفحات غير الداعمة (اكتشفته مراجعة الكود).

## بنية التنقل — مركز إسلامي واحد (2026-08-03)
- شريط التنقل السفلي يحوي تبويب مصحف واحداً فقط (المصحف)؛ المواقيت والقبلة ليستا تبويبين بل بطاقتَي مزايا داخل صفحة MushafFahd (شبكة 3 بطاقات أعلى الصفحة: القرآن/المواقيت/القبلة → روابط لمساريهما).
- حالة التبويب النشط مجمّعة: مسارا /student/prayer-times و /student/qibla يُضيئان تبويب المصحف (منطق startsWith ممدود في StudentBottomNav).
- **Why:** المستخدم رفض صراحةً تعدد تبويبات الشريط لهذه المزايا — هي تابعة لقسم القرآن وتُفتح من داخله.
- **How to apply:** أي ميزة إسلامية جديدة (أذكار، تسبيح...) تُضاف كبطاقة في مركز المصحف لا كتبويب سفلي.

## نظام الهوية البصرية الموحّد + استعادة الدروس الشرعية (2026-08-03)
- قاعدة الأيقونات: CSS غير مُدرج في index.css — `svg{color:#800020}` نهاراً / `.dark svg{color:#D4AF37}` ليلاً مع استثناءات inherit للأسطح الملوّنة [class*=bg-*]. أيقونات SectionIcon الفنية متدرجة التعبئة فلا تتأثر؛ ليلاً تُصبغ ذهبياً بفلتر `.dark svg.section-icon:not([data-plant])` والنباتات (seed/wheat/tree/fruit) معفاة بـ data-plant وتبقى خضراء.
- لا نجوم إطلاقاً في الهوية: مفتاح "star" في Icon.tsx يرسم جوهرة (الاسم باقٍ لـ21 استخداماً)، وأي نجمة SVG تُستبدل بمعيّن (lozenge). شريط علوي موحّد لكل البطاقات: `.card-bubble::before` + `.shadow-card:not(.no-card-accent)::before` خمري نهاراً/ذهبي ليلاً؛ Toast وقرص التنقل يحملان no-card-accent.
- الدروس الشرعية: البنية القانونية 3 مواد (name_en: aqeedah/fiqh/seerah) × 4 مستويات (البذرة/النور/الهدى/اليقين) — المادة تُستنتج من levels.name_en (لا جدول مواد). البذور تهجر الصفوف القديمة بتحديث محدود (LIMIT 1 + NOT EXISTS) وتحذف اليتيمة بلا مراجع؛ المحتوى 3 دروس نصية/مستوى (36) عبر WHERE NOT EXISTS.
- **Why:** المستخدم طلب صراحةً صفر نجوم، ذهبي شامل ليلاً باستثناء النباتات، واستعادة التدفق التعليمي الأصلي لا بناء جديد.
- **How to apply:** أي أيقونة جديدة: خطّية currentColor (تتبع القاعدة تلقائياً) أو فنية في SectionIcon مع data-plant إن كانت نباتاً؛ أي صفحة شرعية جديدة تستهلك sharia.subjects/levelContent/content لا تجمّد البيانات.

## عقد الحجز والخلفية النظيفة (2026-08-04)
- صفحة الحجز تحترم `?path=` (quran/qiraat/tajweed/tajweed_correction/sharia → أنواع جلسات محددة) و`?levelId` (يستثني الجداول المرتبطة بمستوى مختلف، ويبقي العامة levelId=null). أي رابط حجز جديد يجب أن يمرّر path الصحيح وإلا ظهرت كل الأنواع.
- مسار تصحيح التلاوة بلا اختبار قبول نهائياً: Tilawah.tsx → `/student/booking?path=tajweed_correction` مباشرة؛ فرع isTilawah في Placement.tsx أصبح ميتاً ولا يُربط به.
- الخلفية: تدرجات ووهج فقط — ممنوع الجسيمات/الزخارف/الأنماط (pattern-islamic.svg وbg-islamic.png حُذفا، وAnimatedBg/VelvetBg أُزيلتا). شريط البطاقات العلوي = وهج ناعم 12% inset بحواف متلاشية، ليس خطاً صلباً.
- **Why:** المستخدم طلب صراحةً خلفية نظيفة فاخرة بلا رموز زخرفية إسلامية ولا نجوم، وخطاً علوياً ناعماً كالظل.
- **How to apply:** لا تُضف أي زخرفة/نمط/جسيمات للخلفية؛ أي بطاقة جديدة تحصل على اللمسة تلقائياً إلا إذا حملت no-card-accent.

## معرّفات جدول levels غير متسلسلة عبر المسارات (2026-08-06)
- `levels.id` متسلسل بالصدفة فقط ضمن مساري quran وtajweed؛ مسار sharia (عقيدة إلزامية aqeedah_quran ×5 + اختيارية aqeedah ×4 + فقه/سيرة ×1) له معرّفات غير متتابعة إطلاقاً (مثلاً عدة مستويات بنفس order_index بمعرفات متباعدة). أي كود يحسب "المستوى التالي" بـ `id + 1` سيُرسل معرّفاً خاطئاً لطلاب الشريعة فيرفضه الخادم بصمت أو برسالة مضللة رغم صحة أهلية الترقية.
- **Why:** اكتُشف أثناء تدقيق زر "طلب ترقية" في صفحة الملف الشخصي للطالب — الحساب الحسابي عمل مصادفة لمسارين وفشل تماماً للثالث.
- **How to apply:** أي منطق "المستوى التالي ضمن مسار" يجب أن يجلب كتالوج مستويات نفس `path` عبر استعلام حقيقي (مثل `student.levels`) ويطابق بـ `orderIndex` النسبي، لا بحساب على `id`.

## بوابة اعتماد المعلم + الحجز المرتبط بجدول + هواتف E.164 (2026-08-06)
- `approvedTeacherProcedure` في middleware.ts يصدّ كل نقاط المعلم التشغيلية حتى kycStatus=approved؛ نقاط الانضمام (kycStatus/submitKyc/settings/updateSettings/updateProfile) تبقى على teacherProcedure، وTeacherShell يعيد توجيه غير المُجاز لـ /teacher/onboarding.
- الحجز يلزم scheduleId صريحاً (student.bookSession): قفل FOR UPDATE على الجدول نفسه، سعة الحلقة الجماعية تُحسب لكل موعد (scheduleId+scheduledAt+حالات نشطة)، والجلسة تُخزّن sessions.scheduleId. عدّاد المقاعد المعروض (enrolledCount = طلاب مميزون لهم حجوزات قادمة) معلوماتي فقط ولا يمنع الحجز من الواجهة — القرار النهائي للخادم.
- بثّ المعلم (teacher_broadcasts): المستلمون يُستخرجون من sessions في الخادم حصراً (لا قوائم من العميل) مع تحقق ملكية scheduleId، وللمُجازين فقط.
- الهواتف تُخزّن E.164 (+9665...)؛ 05... القديمة تُطبَّع عند الإدخال وتبقى مقروءة عبر normalizePhone/phoneVariants() في auth.ts. نافذة الأدمن تُركت سعودية عمداً.
**Why:** مراجعة الكود أثبتت أن الحجز بلا scheduleId يجعل عدّادات الحلقات والبثّ الموجه بلا أساس (لا جلسات مرتبطة بجدول)، وأن عدّاداً على مستوى الجدول يحجب مواعيد متاحة لو استُخدم مانعاً واجهةً.
**How to apply:** أي عميل حجز جديد يمرر scheduleId؛ أي سعة جماعية تُحسب لكل occurrence؛ أي ميزة هواتف تستخدم normalizePhone/phoneVariants لا regex سعودي محلي؛ لا تُعِد منع الحجز واجهةً بناءً على enrolledCount.

## حسابات الإشراف: قيود الاختبار وإبطال الجلسات (2026-08-14)
- انتهاك القيد الفريد في drizzle/pg يصل برمز 23505 داخل `e.cause.code` لا `e.code` — افحص المستويين معاً (isUniqueViolation في admin.ts).
- رموز dev-* لا تصلح لاختبار إجراءات تكتب audit_logs: admin_id له FK على users و"dev-user" غير موجود، ومع التدقيق داخل معاملة الإنشاء يسقط الإنشاء كله. الاختبار الصحيح: أدرج صفاً حقيقياً في auth_tokens + admin_sessions لمشرف موجود عبر psql واستخدمه Bearer.
- إبطال جلسة المشرف حقيقي الآن: context.ts يرفض أي رمز دوره admin بلا صف adminSessions نشط مطابق للرمز — أي مسار جديد يُصدر رمز admin يجب أن يدرج adminSessions وإلا رُفضت كل طلباته.
- **Why:** audit انتقل داخل معاملة الإنشاء (لا حساب بلا تدقيق)، ورموز dev كانت تجعل اختبار الإنشاء يبدو فاشلاً زيفاً؛ وإبطال الجلسة كان شكلياً قبل فحص السياق.
- **How to apply:** اختبر API الإشراف بجلسة حقيقية مزروعة بـ psql؛ أي إصدار رمز admin جديد سجّل adminSessions؛ لا تفترض أن 23505 على سطح الخطأ.

## ToastHost العام كان غير مُركَّب إطلاقاً (2026-08-06)
- يوجد نظاما توست منفصلان في الواجهة: `@/components/ui/toaster` (shadcn، غير مستخدم فعلياً من الصفحات) و`@/hooks/useToast` (مخزن zustand مخصص + مكوّن `@/components/app/Toast` = `ToastHost`، وهو ما تستدعيه فعلياً 34 ملفاً عبر `toast(...)`). كان `ToastHost` غير مُدرَج في شجرة `App.tsx` إطلاقاً، فكانت كل رسائل التوست في التطبيق بأكمله (نجاح/خطأ/تنبيهات وضع العرض التجريبي) تُكتب في المخزن لكن لا تُعرض أبداً في الواجهة — عطل صامت شامل غير مرتبط بصفحة واحدة.
- **Why:** اكتُشف أثناء تدقيق صفحة الملف الشخصي حين لم يظهر توست "وضع العرض التجريبي" بعد إرسال طلب الترقية؛ التشخيص أظهر أن `ToastHost` غير مُستورد/مُركَّب في أي مكان بالمشروع.
- **How to apply:** أي عطل "لا تظهر رسالة تأكيد/خطأ بعد إجراء ما" في تبيان — تحقق أولاً من أن `<ToastHost />` (وليس `<Toaster />` shadcn) مُركَّب فعلياً في `App.tsx` قبل تتبّع منطق الميوتيشن نفسه.

## بناء الويب من الطرفية
`pnpm --filter @workspace/tabyan run build` يفشل من الطرفية برسالة "PORT/BASE_PATH environment variable is required" لأن vite.config يفرضهما. الصيغة العاملة: `PORT=3000 BASE_PATH=/tabyan/ pnpm --filter @workspace/tabyan run build`.

- Completion review rejects "single notification" dedup claims that rely on read-then-write inside a plain transaction; lock the row with `SELECT … FOR UPDATE` (drizzle `.for("update")`) and cover it with a double-approve test.
- Notification `primaryActionUrl` must use full role-prefixed routes (`/student/session/:id`, not `/session/:id`); NotificationDetails normalizes legacy links via resolveInternalUrl.

## كتب PDF المرفوعة
الكتب المرفوعة الخاصة لا تُعرض للطالب عبر مسار التخزين العام؛ القراءة والتنزيل يمران بمسار كتب مصرح به يتحقق من النشر وأهلية المنهج قبل بث الملف.
**Why:** سياسة ACL تحفظ ملكية الرفع للإدارة، بينما يحتاج الطالب وصولاً مؤقتاً مقيداً بالكتاب والمستوى دون كشف مسار الكائن مباشرة.
**How to apply:** أي قارئ/تنزيل جديد للكتب يستخدم مسار الوصول المصرح، مع إبقاء الروابط الخارجية منفصلة وعدم تسجيل التنزيل قبل بدء البث.

## مزامنة مخطط الإنتاج عبر Publish
تغييرات مخطط قاعدة الإنتاج في Replit تُطبّق عبر Publish/Republish فقط؛ بعد نجاحه يجب مقارنة جداول وأعمدة development وproduction قراءةً فقط قبل اختبار API.
**Why:** المسار المدعوم يمنع DDL مخصصاً أو `db push` الأعمى من إدخال تغييرات غير مرتبطة أو حذف بيانات؛ نجحت مزامنة جدول حماية دخول الطلاب بهذه الطريقة.
**How to apply:** افحص فرق المخطط، ثم اختبر الدخول بحساب اختبار موجود، وأنشئ أي حساب مراجعة عبر API الرسمي فقط بعد نجاح schema/login، واستخدم حساباً منفصلاً لاختبار الحذف.
