# Tabyan — Replit Exit Migration Plan

## نوع الوثيقة

هذه الوثيقة هي **تدقيق وتجهيز PREPARATION/AUDIT فقط** بتاريخ 2026-09-01.

لم يتم في هذه المرحلة:

- نقل المشروع إلى GitHub أو Railway.
- تغيير Production أو DNS.
- تغيير قاعدة البيانات أو نقلها.
- نقل Object Storage.
- بناء iOS أو Android.
- تغيير Bundle ID أو Apple App.
- إنشاء EAS Project جديد.
- إنشاء Apple credentials جديدة.
- تعديل source code أو إعدادات الإنتاج.

الهدف هو إبقاء Replit الحالي يعمل كـ Source of Truth وFallback، مع تحديد ما يلزم قبل أي انتقال آمن.

### قرار نسخة الهاتف

تم إلغاء نسخة الهاتف بالكامل وحذف `artifacts/mobile` وWorkflow الخاص بها من المشروع. أي تفاصيل Mobile/EAS لاحقة في هذا التقرير هي سياق تدقيق تاريخي فقط، وليست ضمن نطاق التشغيل أو النقل الحالي.

---

## 1. Executive summary

المشروع قابل للنقل من حيث البنية العامة، لكنه **ليس Portable بالكامل بعد**.

النتائج الحاسمة:

1. الـ monorepo يحتوي على Web وAPI وShared Libraries وDatabase schema وmigrations وMobile وجميع أصول المصحف المطلوبة.
2. Git الحالي على `main`، وآخر commit هو `42166c6bdff75c0bbbfdf23a5dd5999311248c60`.
3. شجرة المصدر نظيفة؛ الملف الوحيد غير المتعقب هو ملف التعليمات المرفق المستخدم لهذا التدقيق.
4. توجد 604 ملفات `static-build` مولّدة ومتعقبة داخل Git. يجب تنظيفها قبل اعتماد GitHub كمصدر مرآة نظيف.
5. قاعدة التطوير والإنتاج تحتويان على نفس جداول التطبيق العامة. الإنتاج يحتوي إضافةً إلى ذلك جدول migrations الداخلي الخاص بـReplit.
6. الـ API يعتمد حاليًا على Replit Object Storage Sidecar (`127.0.0.1:1106`) لتوقيع روابط GCS؛ لذلك لا يمكن تشغيله على Railway كما هو.
7. Mobile production configuration مهيأة لعناوين الإنتاج، لكن Direct EAS يحتاج ربطًا بمشروع Expo/EAS القائم الصحيح ومعلومات Apple signing. لا يجوز إنشاء مشروع جديد.
8. Web وAPI لديهما أوامر build/start وhealthcheck، لكن API يحتاج طبقة تخزين خارجية، كما أن حالة جلسات WebSocket والتشخيص موجودة في ذاكرة العملية.

**الخلاصة:** يمكن إبقاء Production على Replit أثناء التحضير، لكن النقل الفعلي يحتاج أولاً مسار تخزين portable، ثم تحققًا مستقلاً من EAS/Apple، ثم staging خارج Replit.

---

## 2. Frozen production baseline

| العنصر | القيمة الحالية |
|---|---|
| Git branch | `main` |
| Current commit | `42166c6bdff75c0bbbfdf23a5dd5999311248c60` |
| Production domain | `https://tibyanquran.com` |
| Production API | `https://tibyanquran.com/api/trpc` |
| Production WebSocket | `wss://tibyanquran.com/api/ws/recitation` |
| iOS Bundle ID | `app.replit.tbyan` |
| iOS version | `1.0.0` |
| iOS next build | `6` |
| Android package | `com.tabyan.app` |
| Android version | `1.0.0` |
| Android version code | `1` |
| Current deployment | Replit autoscale |
| Current deployment status | deployed, successful build, public |
| Confirmed production URL | `https://tibyanquran.com` |

تم تأكيد حالة النشر من خدمة النشر نفسها، وليس من متغيرات بيئة محلية.

### Workspace state

- Source tree: نظيفة.
- Untracked: ملف التعليمات المرفق فقط.
- لا يوجد تغيير مصدر يجب دمجه كجزء من خطة النقل.
- يوجد فرع مرآة احتياطي ظاهر باسم `gitsafe-backup/main`.

---

## 3. GitHub as source of truth

### Repository scope

المستودع الحالي يشمل المكونات المطلوبة للنقل الكامل:

- `artifacts/tabyan` — Web.
- `artifacts/mobile` — Expo Mobile.
- `artifacts/api-server` — API وWebSocket.
- `lib/tabyan-trpc` — business/API procedures.
- `lib/db` — Drizzle schema وPostgreSQL access.
- `lib/api-zod` — validation contracts.
- `lib/api-client-react` — client contracts.
- `lib/api-spec` — OpenAPI/codegen support.
- `lib/tabyan-domain` — product registry.
- `scripts` — verification and build utilities.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`, TypeScript configs.
- `lib/db/migrations`.
- Tests and release verification scripts.
- Runtime assets, including Web public assets and Native QCF assets.

### FILES_REQUIRED_FOR_MIGRATION

يجب أن يحتوي GitHub mirror الكامل على:

- كل source files في `artifacts/`, `lib/`, و`scripts/`.
- Root workspace files و`pnpm-lock.yaml`.
- `artifacts/mobile/app.json` و`eas.json` وMetro configuration.
- `artifacts/mobile/mushaf/`:
  - 604 TTF page fonts.
  - 604 page JSON files.
  - manifest and checksum/validation metadata.
- Web public assets في `artifacts/tabyan/public`.
- API build script وruntime assets مثل ffprobe/protobuf handling.
- Database schema وملفات migrations.
- جميع tests وrelease sweeps.
- ملفات `artifact.toml` فقط إذا كان الاحتفاظ بنسخة Replit كـFallback مطلوبًا.

### FILES_REPLIT_SPECIFIC

هذه الملفات أو الأجزاء مرتبطة بتشغيل Replit، لكنها لا تعني أن business logic غير قابل للنقل:

- `.replit` — modules، workflows، ports، Replit deployment، Object Storage declaration.
- `artifacts/*/.replit-artifact/artifact.toml` — artifact routing وReplit workflows/deployment.
- `@replit/vite-plugin-*` — أدوات تطوير فقط في Web/Canvas.
- `artifacts/mobile/package.json` development script — يستخدم `REPLIT_EXPO_DEV_DOMAIN` و`REPLIT_DEV_DOMAIN`.
- fallback variables في `artifacts/mobile/scripts/build.js` — Replit domains و`REPL_ID`.
- `lib/tabyan-trpc/src/routers/auth.ts` — يسمح بنطاقات Replit في development فقط.
- `artifacts/api-server/src/lib/objectStorage.ts` — Replit Sidecar authentication/signing.
- روابط package firewall الموجودة داخل lockfiles للمختبرات المعزولة — metadata لمصدر تثبيت محلي وليست runtime dependency.

### FILES_THAT_MUST_NOT_BE_COMMITTED

- `.env` وأي `.env.*` محلي.
- API keys، session secrets، OAuth credentials، private keys، certificates، provisioning profiles، keystores.
- `node_modules/`.
- `dist/` و`.expo/` و`.cache/` و`tsbuildinfo`.
- `static-build/` الناتج من Expo static build.
- ملفات logs وtemporary files.
- ملفات التدقيق أو المرفقات التي لا يحتاجها runtime، ما لم تكن مطلوبة كسجل مشروع مستقل.

### GITIGNORE_STATUS

**FAIL — جزئيًا.**

قواعد `.gitignore` تمنع معظم local/generated output، ولا توجد ملفات secrets أو certificates متعقبة في الفحص، لكن:

- `artifacts/mobile/static-build/` غير مستثنى حاليًا.
- توجد 604 ملفات static build متعقبة بالفعل.
- توجد lockfiles داخل مختبرات `mushaf-spike` تتضمن عناوين package firewall خاصة ببيئة Replit؛ لا تكشف سرًا، لكنها تجعل المرآة أقل نظافة.
- يوجد عدد كبير من `attached_assets` المتعقب، ومعظمه evidence/exports وليس مطلوبًا لتشغيل المنتج.

يجب تنفيذ تنظيف Git منفصل ومراجعته قبل أول push إلى GitHub. لم يُنفذ هذا التنظيف الآن.

### SECRETS_IN_GIT

**NONE FOUND** في فحص الأنماط عالية الثقة للـkeys/private keys والملفات الحساسة.

لم تتم طباعة أي قيمة سرية. هذا لا يغني عن secret scanning مستقل في CI قبل أول push.

---

## 4. Replit dependency audit

| Dependency | Used by | Current purpose | Portable | Migration required | Target replacement |
|---|---|---|---|---|---|
| Replit workflow/artifact metadata | Build/runtime orchestration | تشغيل الخدمات والـpreview عبر Replit | No | Yes خارج Replit | Railway service definitions وCI |
| `@replit/vite-plugin-*` | Web development | cartographer/dev banner/runtime overlay | Yes كـdev-only أو يمكن إزالته خارج Replit | No business logic | Vite React plugin فقط في بيئة مستقلة |
| `REPLIT_*` development variables | Mobile dev/build fallback وauth dev origins | تشغيل preview داخل Replit | No خارج Replit | Small | Production env names وCI env |
| Replit Object Storage Sidecar | API storage | GCS auth، presigned URLs، object metadata ACL | No | Yes | S3-compatible/R2/GCS service account adapter |
| `DATABASE_URL` | DB/API | اتصال PostgreSQL | Yes | No تغيير business logic | Railway PostgreSQL أو PostgreSQL مُدار |
| Replit PostgreSQL hosting | DB/Production | قاعدة البيانات الحالية | No كمزود | Yes فقط عند cutover | Railway PostgreSQL أو مزود PostgreSQL آخر |
| Replit deployment URL | Mobile dev/build fallback | عنوان مؤقت للـpreview | No | No إذا استُخدمت production env | Stable web/API domain |
| Replit Auth | Application auth | غير مستخدم كـauth الأساسي | N/A | No | App custom bearer auth يبقى كما هو |
| Replit internal proxy | Web/API routing | `/api` وWebSocket routing في preview | No | Yes خارج Replit | Railway routing/reverse proxy |
| Replit package firewall URLs | Spike lockfiles | مصدر تنزيل local package cache | No | No runtime; clean later | Public registry lockfile entries |

لا يوجد في المصدر production mobile runtime يعتمد على `replit.dev`؛ runtime config يرفض development hosts في production. الاعتماد الحرج المتبقي هو storage وطبقة التشغيل، لا عنوان API داخل التطبيق.

---

## 5. Database migration readiness

### DATABASE_PROVIDER

البيئة الحالية تستخدم PostgreSQL المُدار داخل Replit:

- التطوير: Replit development PostgreSQL.
- الإنتاج: Replit production PostgreSQL.
- التطبيق يتصل عبر `DATABASE_URL`.

تم التحقق من الاتصال بنجاح دون تنفيذ أي كتابة.

### DATABASE_SCHEMA

قاعدة التطوير تحتوي على جداول التطبيق العامة المطلوبة، ومنها:

- `users`, `students`, `teachers`, `teacher_certificates`.
- `levels`, `sharia_subjects`, `sharia_content`, `sharia_content_progress`.
- `weekly_schedules`, `sessions`, `session_participants`, `schedule_change_requests`.
- `recordings`, `evaluations`, `student_progress`, `promotion_requests`.
- `books`, `bookmarks`, `downloads`, `book_assignments`.
- `fatwa_questions`, `fatwa_answers`, `fatwa_ratings`, `fatwa_views`.
- `assessments`, `assessment_questions`, `assessment_attempts`.
- `teacher_messages`, `teacher_broadcasts`, `notifications`, `notification_settings`.
- `admin_sessions`, `admin_login_attempts`, `audit_logs`, `security_events`.
- `otp_codes`, `email_otp_codes`, `student_password_login_attempts`.
- `auth_tokens`, `webauthn_credentials`, `webauthn_challenges`.
- `recitation_sessions`, `system_settings`, وsettings الخاصة بالطلاب والمعلمين.

الإنتاج يحتوي على نفس جداول `public` العامة، إضافة إلى:

- `_system.replit_database_migrations_v1` — جدول إدارة migrations الداخلي الخاص بـReplit.

### MIGRATIONS

**PASS بالنسبة لسجل المشروع، مع شرط rehearsal قبل النقل.**

المستودع يحتوي على migrations متتابعة من `0001` إلى `0009`، تشمل Google ID، حسابات المشرفين، assigned levels، تفضيل تحفة الأطفال، قيود اختبار الشريعة، جلسات التسميع، التسجيلات، فصل عقود التسميع، ومحاولات تسجيل الدخول.

لا يجوز اعتبار مجرد وجود ملفات SQL دليلاً على نجاح import خارجي. يجب لاحقًا تنفيذ restore تجريبي على قاعدة staging فارغة، ثم تحقق schema وforeign keys وunique indexes.

### PRODUCTION_DATA_LOCATION

Production records موجودة في Replit Production PostgreSQL المرتبطة بالنشر الحالي.

لم تُقرأ بيانات المستخدمين أو تُصدّر، ولم تُنفذ أي mutation.

### EXTERNAL_ACCESS_AVAILABLE

**UNKNOWN.**

لا يوجد في هذه البيئة تصريح أو قناة تصدير خارجية تم اختبارها إلى Railway PostgreSQL. يجب توفير مسار backup/export مُعتمد قبل cutover، مع عدم استخدام اتصال تطوير غير مطابق لنسخة الإنتاج.

### DATABASE_CAN_MOVE_TO_RAILWAY

**NEEDS_WORK.**

من حيث schema والعلاقات يمكن النقل، لكن يلزم:

1. نسخة backup موثقة من الإنتاج.
2. استعادة rehearsal في staging.
3. مقارنة row counts وconstraints وindexes دون كشف PII.
4. خطة delta أو freeze قصيرة أثناء آخر sync.
5. اختبار كل المستخدمين والطلاب والمعلمين والمشرفين والجلسات والـprogress والسجلات والكتب والفتاوى والإعدادات.
6. التحقق من بقاء IDs وpassword hashes وauth token behavior وobject paths كما هي.

---

## 6. Object Storage audit

### CURRENT_STORAGE_PROVIDER

Replit App/Object Storage، وهو GCS-backed storage مع Replit Sidecar authentication.

### BUCKETS / STORAGE AREAS

الكود يستخدم مسارين منطقيين:

- Public object search paths عبر `PUBLIC_OBJECT_SEARCH_PATHS`.
- Private object directory عبر `PRIVATE_OBJECT_DIR`.

الكود ينشئ مسارات خاصة تحت:

- `uploads/` للرفع العام داخل التطبيق.
- `uploads/live-session-recordings/` لتسجيلات الحصص.
- `uploads/books/` لملفات الكتب PDF.

### CONFIRMED DATABASE REFERENCES

- `students.placementTestVideoUrl` — فيديوهات اختبار تحديد المستوى.
- `teachers.kycVideoUrl` — فيديو KYC للمعلم.
- `recordings.videoUrl` — تسجيلات الحصص.
- `books.fileObjectKey` و`books.fileUrl` — ملفات الكتب.
- `teacher_messages.fileUrl` — الملفات المرفقة برسائل المعلم.
- `qiraat_certificates.certificateUrl` — مراجع شهادات القراءات.
- `sharia_content.fileUrl` — مراجع ملفات المحتوى الشرعي عند استخدامها.

القيم الخاصة بالملفات الخاصة تستخدم غالبًا object paths من نوع `/objects/...`، وليس bytes داخل PostgreSQL.

### PRESIGNED_URL_DEPENDENCIES

الرفع الحالي هو:

1. API يتحقق من bearer token وصلاحية المستخدم.
2. API يطلب presigned PUT URL من Replit Sidecar.
3. العميل يرفع مباشرة إلى GCS.
4. API يقرأ metadata ويطبق ACL custom metadata.
5. يتم حفظ object path في قاعدة البيانات.

الاعتماد غير القابل للنقل حاليًا موجود في:

- `http://127.0.0.1:1106/token`.
- `http://127.0.0.1:1106/credential`.
- `http://127.0.0.1:1106/object-storage/signed-object-url`.

### PORTABLE

**No as implemented.**

نموذج البيانات portable، لكن implementation الحالي ليس كذلك.

### MIGRATION_REQUIRED

**YES إذا كان API سينتقل إلى Railway.**

البديل الأنسب هو adapter يحافظ على نفس contract:

- `request upload URL`.
- `PUT` مباشر إلى storage.
- `finalize`.
- `GET` private/public عبر API.
- metadata ACL أو database ACL.
- Range streaming للفيديو وPDF.

يجب اختيار bucket/storage خارجي يدعم presigned URLs وRange requests، ثم تنفيذ dual-read أو mirror تدريجي قبل تغيير production references. لا يتم نقل bytes الآن.

---

## 7. Web + API → Railway readiness

### Web

| Field | Result |
|---|---|
| WEB_BUILD_COMMAND | `pnpm --filter @workspace/tabyan run build` |
| WEB_SERVE_COMMAND | `pnpm --filter @workspace/tabyan run serve` |
| Required runtime inputs | `PORT`, `BASE_PATH=/` |
| Static output | `artifacts/tabyan/dist/public` |
| SPA fallback | موجود في Replit artifact config؛ يجب إعداد equivalent في Railway |
| PORT_HANDLING | PASS |
| RAILWAY_WEB | NEEDS_WORK — service configuration/staging فقط |

Vite configuration يسمح بـ`0.0.0.0` و`allowedHosts: true`، ويستخدم `BASE_PATH`. أدوات Replit تُحمّل في development عندما يكون `REPL_ID` موجودًا، وليست جزءًا من production business logic.

### API

| Field | Result |
|---|---|
| API_BUILD_COMMAND | `pnpm --filter @workspace/api-server run build` |
| API_START_COMMAND | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Required port | `PORT` |
| Healthcheck | `GET /api/healthz` |
| WebSocket | `/api/ws/recitation` وsession signaling paths |
| PORT_HANDLING | PASS |
| RAILWAY_API | NEEDS_WORK |

سبب `NEEDS_WORK` ليس إعادة كتابة business logic؛ السببان هما:

1. Replit Sidecar storage يجب استبداله أو جعله adapter configurable.
2. signaling rooms وdiagnostic sessions موجودة في memory العملية. لا يجوز تشغيلها خلف horizontal autoscaling دون shared state أو single-instance affinity.

### Required environment variable names

#### Baseline server

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `SESSION_SECRET`
- `LOG_LEVEL` اختياري مع default.

#### Storage

- `PRIVATE_OBJECT_DIR`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- provider credentials/endpoint الجديدة — names تُحدد عند اختيار المزود، ولا تُنسخ Replit Sidecar variables.

#### AI/recitation

- `TABYAN_AI_ENABLED`
- `TABYAN_AI_TRANSCRIPTION_ENABLED`
- `TABYAN_AI_LIVE_TRACKING_ENABLED`
- `TABYAN_AI_ASR_PROVIDER`
- provider key المناسب، مثل OpenAI أو Speechmatics أو NVIDIA، حسب الاختيار.

#### Feature-specific

- `LIVE_SESSION_RECORDING_ENABLED`
- `GOOGLE_CLIENT_ID`

لا توجد قيم أسرار في هذا التقرير.

### HEALTHCHECK

**AVAILABLE:** `/api/healthz`.

يجب استخدامه كـ Railway healthcheck، مع WebSocket smoke test منفصل لأن healthcheck لا يثبت سلامة signaling أو storage أو provider connections.

---

## 8. Mobile → direct Expo EAS readiness (CANCELLED / HISTORICAL)

### Current configuration

تم التحقق من وجود:

- `artifacts/mobile/app.json`.
- `artifacts/mobile/eas.json`.
- Expo SDK 54.
- Expo Router.
- native camera/location/audio/video modules.
- fonts and QCF assets.
- Metro monorepo configuration.
- production `EXPO_PUBLIC_DOMAIN`.
- production `EXPO_PUBLIC_WS_ORIGIN`.

الإعداد الحالي يحافظ على:

```text
IOS BUNDLE ID: app.replit.tbyan
VERSION: 1.0.0
BUILD: 6
ANDROID PACKAGE: com.tabyan.app
```

### DIRECT_EAS_BUILD_READY

**NOT_REQUIRED — تم حذف Artifact الهاتف بالكامل.**

### DIRECT_EAS_BUILD_BLOCKERS

1. لا يوجد حاليًا `owner` أو `projectId` في app config، ولا يُراد إضافتهما.
2. تم إلغاء خطوة `EAS init` و`Use existing` من خطة النسخة الجديدة.
3. المشروع التاريخي المرتبط بحساب `abdalrhmanq8` لن يُستخدم في النسخة الجديدة.
4. كان `expo-router` يحتوي على `origin = https://replit.com/`، وقد أُزيل الآن من `artifacts/mobile/app.json`.
5. أي بناء EAS خارجي سيبقى مؤجلًا حتى يختار المستخدم حسابًا أو مشروع Expo مختلفًا صراحةً.

### EAS_PROJECT_LINK_FOR_NEW_REPL

**NOT_REQUIRED — حسب قرار إلغاء نسخة الهاتف.**

لا يتم تشغيل `EAS init`، ولا اختيار `Use existing`، ولا إضافة `owner` أو `projectId` لحساب `abdalrhmanq8`. مشروع Expo البعيد وApple App لم يُحذفا.

### APPLE_SIGNING_REQUIRED

**YES.**

### EXISTING_APP_CAN_BE_USED

**YES** من حيث Bundle ID وApp Store identity، بشرط توفر نفس Apple team والصلاحيات وsigning assets الصحيحة.

### NEW_APP_REQUIRED

**NO.**

---

## 9. Apple migration safety

يجب أن يبقى التطبيق نفسه في App Store Connect:

```text
Existing App: تبيان القرآني
Bundle ID: app.replit.tbyan
Version: 1.0.0
Next build: 6
```

### APPLE_IDENTITY_REQUIREMENTS

- Apple Developer Team نفسه المرتبط بالتطبيق الموجود.
- App Store Connect app نفسه، لا app جديد.
- Bundle ID identifier نفسه `app.replit.tbyan`.
- نفس signing authority أو credentials صالحة لنفس team.

### SIGNING_REQUIREMENTS

- Distribution certificate أو طريقة signing معتمدة لنفس Apple team.
- App Store Connect API/key access أو EAS account access حسب مسار البناء.
- عدم وضع certificates أو private keys داخل GitHub.
- استخدام secret manager/EAS credentials UI، وليس chat أو ملفات committed.

### PROVISIONING_REQUIREMENTS

- Provisioning profile لنفس Bundle ID وteam.
- entitlements متوافقة مع capabilities الحالية.
- فحص camera/microphone/location/photo-library declarations في archive.

### APP_STORE_CONNECT_REQUIREMENTS

- اختيار التطبيق الموجود في App Store Connect.
- رفع build number 6 كتحديث لنفس التطبيق.
- عدم تغيير Bundle ID أو version semantics.
- مراجعة privacy/support URLs الحالية قبل upload.

### RISKS_IF_NEW_CERTIFICATE_IS_CREATED

إنشاء شهادة جديدة ليس ممنوعًا تقنيًا دائمًا، لكنه غير مطلوب الآن وقد:

- يربط signing بteam أو workflow غير صحيح.
- يخلق تضاربًا مع credentials الموجودة.
- يزيد احتمال اختيار App Store app أو EAS project خاطئ.
- يصعّب إثبات أن Build 6 استمرار للتطبيق الموجود.

لذلك لا تُنشأ شهادة جديدة إلا بعد إثبات فساد/انتهاء القديمة وبقرار منفصل.

---

## 10. Android readiness

### ANDROID_EAS_READY

**NO — configuration جاهزة، لكن EAS identity/signing غير مثبتين خارجيًا.**

### AAB_READY_PATH

لا يوجد AAB جديد في هذه المرحلة؛ لم يبدأ Android build كما طُلب.

المسار المتوقع لاحقًا:

```text
EAS production build
→ Android App Bundle (.aab)
→ Google Play Console
```

### ANDROID_SIGNING_REQUIREMENTS

- Android application ID نفسه: `com.tabyan.app`.
- keystore/credentials مرتبطة بنفس التطبيق.
- version code لا يقل عن آخر code منشور عند بدء الرفع.
- عدم وضع keystore داخل GitHub.

### GOOGLE_PLAY_REQUIREMENTS

- استخدام التطبيق الموجود في Google Play Console، لا تطبيق جديد.
- تطابق package name.
- مراجعة privacy/data safety والpermissions.
- اختبار release AAB على مسار internal testing قبل production.

لم يبدأ Android build أو upload.

---

## 11. Remove platform lock-in

### PORTABILITY_GAPS

#### P0

- Replit Sidecar هو المسار الوحيد الحالي لتوقيع Object Storage URLs؛ يمنع تشغيل API خارج Replit.
- النسخة الجديدة ستبقى دون EAS project identity؛ لا يتم إنشاء مشروع جديد أو ربطها بحساب `abdalrhmanq8`.
- لا يوجد حتى الآن backup/restore rehearsal مثبت لقاعدة production خارج Replit.

#### P1

- `static-build` generated output متعقب في Git.
- Node/Pnpm غير مثبتين في root manifest؛ البيئة الحالية تستخدم Node 24 وpnpm 10.26.1، لكن clone خارجي لا يضمنهما.
- تم حذف `expo-router origin` المرتبط بـReplit من `artifacts/mobile/app.json`؛ يلزم فقط تأكيد عدم إعادة توليده في build خارجي.
- mobile build script ما زال يعتمد على Replit fallback variables إذا غابت production variables.
- API in-memory signaling/diagnostic state غير مناسب للتوسع الأفقي.
- Web/API routing يحتاج إعداد Railway مستقل يحافظ على `/api` وWebSocket upgrade.

#### P2

- إضافة CI مستقل لا يعتمد على Replit workflows.
- إضافة deployment manifests منفصلة لـRailway staging.
- إضافة storage contract tests وDB restore verification.
- توثيق secret names حسب environment دون قيم.

### MINIMUM_REQUIRED_CHANGES

هذه تغييرات لاحقة فقط، وليست منفذة الآن:

1. تنظيف generated output وattachments غير runtime من Git mirror.
2. تثبيت Node 24 ونسخة pnpm متوافقة مع lockfile.
3. جعل storage adapter قابلًا للتبديل مع الحفاظ على object-path contract.
4. توفير staging PostgreSQL وstorage واختبار restore.
5. إزالة اعتماد build الخارجي على Replit fallback، مع إبقائه في dev script الخاص بـReplit.
6. إبقاء النسخة الجديدة دون EAS link؛ اختيار حساب/مشروع مختلف لاحقًا يحتاج موافقة منفصلة.
7. تأكيد resolved Expo config من clone نظيف بعد حذف Replit-specific `expo-router origin`.
8. تشغيل API خارج Replit بإعداد WebSocket single-instance أو shared state.

### OPTIONAL_IMPROVEMENTS

- CI matrix لـWeb/API/Mobile.
- Healthchecks منفصلة لـAPI وstorage وWebSocket.
- metrics وstructured logs خارج Replit.
- object inventory ومقارنة checksums قبل وبعد التخزين.
- قاعدة بيانات staging مُعبأة بعينة غير حساسة.

### DO_NOT_CHANGE

- iOS Bundle ID: `app.replit.tbyan`.
- Android package: `com.tabyan.app`.
- App Store Connect application.
- Google Play package identity.
- version `1.0.0`.
- iOS build 6.
- Production DNS.
- Production database records.
- Production storage objects.
- business logic.
- QCF font/page source assets.

---

## 12. Corrected migration order

التسلسل الآمن المقترح هو:

### PHASE A — Freeze and clean mirror

1. تثبيت commit baseline الحالي.
2. تنظيف Git generated output والملفات غير runtime.
3. تشغيل secret scan مستقل.
4. إنشاء GitHub mirror كامل، دون push قبل موافقة المستخدم.

### PHASE B — Reproducible local/CI build

1. تثبيت Node وpnpm.
2. clone نظيف من GitHub.
3. `pnpm install --frozen-lockfile`.
4. typecheck وmushaf verification والاختبارات.
5. Web build وAPI build.
6. عدم استخدام Replit cache أو package firewall.

### PHASE C — Direct Expo EAS identity validation (deferred)

1. عدم تشغيل `EAS init` في النسخة الجديدة.
2. تشغيل config validation من clone نظيف دون `owner` أو `projectId`.
3. اختيار حساب/مشروع Expo مختلف فقط بعد موافقة صريحة.
4. التحقق من Apple team وBundle ID والـsigning بعد اختيار المسار.
5. تنفيذ build داخلي/preview محدود قبل Build 6.

### PHASE D — TestFlight Build 6

1. بناء iOS production عبر EAS فقط بعد اختيار وربط مشروع Expo مختلف صراحةً.
2. التأكد أن build number هو 6.
3. رفعه إلى TestFlight فقط.
4. اختبار login، المصحف، native QCF، الصوت، الصلاحيات، WebSocket، والتخزين.
5. لا يُرسل App Store submission قبل اجتياز الاختبارات.

### PHASE E — Railway staging backend

1. إعداد Web staging وAPI staging.
2. إعداد PostgreSQL staging.
3. إعداد storage staging.
4. اختبار API وWebSocket وpresigned uploads وRange video.
5. إبقاء Replit Production دون تغيير.

### PHASE F — Database/storage rehearsal

1. backup production معتمد.
2. restore إلى staging.
3. inventory ومقارنة object paths/checksums.
4. اختبار جميع record categories.
5. اختبار rollback قبل أي DNS change.

### PHASE G — Controlled production cutover

1. اختيار نافذة cutover.
2. sync أخير للـDB والـstorage.
3. تحويل Web/API routing فقط بعد green checks.
4. مراقبة auth، sessions، media، WebSocket، وerrors.
5. عدم حذف Replit.

### PHASE H — Retain Replit rollback

1. إبقاء Replit Production قائمًا مؤقتًا.
2. الاحتفاظ بقدرة DNS/routing rollback.
3. إزالة Replit فقط بعد استقرار مثبت وموافقة منفصلة.

هذا الترتيب يضع EAS identity قبل TestFlight، ويضع storage/DB rehearsal قبل أي backend cutover؛ لذلك هو أكثر أمانًا من نقل Web/API قبل إثبات dependencies.

---

## 13. Rollback plan

### ROLLBACK_TRIGGER

يبدأ rollback عند حدوث أي من الآتي:

- فشل login أو session persistence.
- فقدان users أو progress أو sessions.
- فشل قراءة/تشغيل videos أو PDFs.
- فشل WebSocket calls أو recitation.
- اختلاف object paths أو ACL behavior.
- فشل Apple/TestFlight identity أو ظهور التطبيق كتطبيق جديد.
- أخطاء data integrity أو ارتفاع errors بعد cutover.

### ROLLBACK_PROCEDURE

1. إيقاف استقبال traffic الجديد على البيئة البديلة.
2. إعادة routing إلى Replit Production.
3. الاحتفاظ بالـlogs والـrequest timestamps.
4. عدم حذف البيئة البديلة أو بيانات التحقيق.
5. تحديد هل الخطأ في Web/API/storage/DB/mobile قبل إعادة المحاولة.

### DATABASE_ROLLBACK

- لا يتم overwrite لقاعدة Replit production.
- إذا لم تُكتب production records في البديل، يعاد traffic إلى Replit فقط.
- إذا حدثت كتابات في البديل، يلزم reconciliation مدقق قبل أي دمج.
- لا يتم reverse migration عشوائيًا؛ كل تغيير DB يحتاج backup ومراجعة.

### DNS_ROLLBACK

- إعادة DNS أو routing إلى `https://tibyanquran.com` والـReplit production backend الحالي.
- تقليل TTL قبل cutover فقط ضمن خطة منفصلة.
- عدم تغيير domain names داخل mobile release أثناء rollback.

### MOBILE_ROLLBACK

- Build 5 أو الإصدار الحالي في App Store يبقى كما هو.
- Build 6 لا يُرسل للمراجعة حتى ينجح TestFlight.
- إذا فشل Build 6 خارجيًا، لا يتأثر Build 5 أو App Store app.
- لا يتم تغيير Bundle ID لإنقاذ build فاشل.

---

## 14. Final migration report

| Field | Status |
|---|---|
| CURRENT_PROJECT_PORTABILITY | NEEDS_WORK |
| GITHUB_MIGRATION | NEEDS_WORK |
| RAILWAY_WEB | NEEDS_WORK — small staging/config work |
| RAILWAY_API | NEEDS_WORK — storage adapter and state model |
| DATABASE_MIGRATION | NEEDS_WORK — rehearsal/external access not verified |
| STORAGE_MIGRATION | NEEDS_WORK |
| DIRECT_EXPO_EAS | NOT_REQUIRED — تم إلغاء نسخة الهاتف |
| IOS_BUILD_6_OUTSIDE_REPLIT | NOT_REQUIRED — تم إلغاء نسخة الهاتف |
| ANDROID_OUTSIDE_REPLIT | NOT_REQUIRED — تم إلغاء نسخة الهاتف |
| REPLIT_LOCK_IN | HIGH |
| CAN_KEEP_CURRENT_REPLIT_PRODUCTION_RUNNING_DURING_MIGRATION | YES |

### P0_BLOCKERS

1. Replit Sidecar storage يمنع تشغيل API على Railway كما هو.
2. مسار Mobile/EAS خارج النطاق بعد حذف نسخة الهاتف.
3. Apple signing/team access الخارجي غير مثبت.
4. لا يوجد DB/storage restore rehearsal خارجي مثبت.

### P1_REQUIRED_CHANGES

1. تنظيف Git mirror من `static-build` والـgenerated/local artifacts.
2. تثبيت Node وpnpm للـcold build.
3. adapter portable للتخزين.
4. Railway Web/API staging مع WebSocket support.
5. قرار single-instance/shared state للـlive signaling والـdiagnostic sessions.
6. تأكيد resolved Expo config من clone نظيف بعد حذف Replit-specific `expo-router origin`.

### P2_OPTIONAL_CHANGES

1. CI مستقل.
2. storage checksum/inventory tooling.
3. staging seed غير حساس.
4. مراقبة وhealthchecks متخصصة.

### SAFE_MIGRATION_SEQUENCE

1. Freeze baseline and clean Git mirror.
2. Reproduce Web/API/Mobile checks from clean clone.
3. Keep the removed Mobile/EAS path out of the Web/API migration.
4. Do not build or submit Mobile/TestFlight as part of this migration.
5. Build Railway Web/API staging.
6. Replace/test storage adapter in staging.
7. Rehearse DB/storage restore and rollback.
8. Perform controlled cutover.
9. Keep Replit running as rollback.

### FINAL_RECOMMENDATION

لا يوجد سبب تقني لتغيير التطبيق أو Bundle ID أو App Store app. المسار الآمن هو فصل مشكلة Replit Launch عن نقل المنتج:

- اترك Replit Production كما هو.
- جهّز GitHub mirror نظيفًا دون push الآن.
- عالج storage portability قبل نقل API.
- لا تعِد إضافة نسخة الهاتف أو تربطها بحساب Expo ضمن مسار Web/API الحالي.
- استخدم TestFlight للتحقق من Build 6 قبل أي App Store submission.
- لا تنقل DB أو storage أو DNS حتى ينجح staging والـrollback rehearsal.

بهذا يمكن الاحتفاظ بالنسخة الحالية عاملة طوال فترة النقل، دون تعريض المستخدمين أو سجلات الإنتاج أو هوية Apple للخطر.
