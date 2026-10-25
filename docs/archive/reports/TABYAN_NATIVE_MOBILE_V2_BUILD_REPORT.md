# تقرير إكمال Tabyan Mobile V2 — Device & Release Completion

التاريخ: 2 سبتمبر 2026

## الحالة النهائية

MOBILE_V2: PASS
SAFE_AREA: PASS (code-level؛ اختبار iPhone مطلوب)
IOS_PERMISSIONS: PASS (Camera/Microphone/Location configured with usage descriptions and denied states)
QCF_CODE: PASS (code-level)
QCF_DEVICE: NOT_TESTED
PLACEMENT_RECORDING: PASS (code-level)
PLACEMENT_UPLOAD: PASS (real presigned PUT, not local-only)
ATTACHMENT_UPLOADS: PARTIAL
RECITATION_CODE: PASS (code-level؛ native build/device runtime مطلوب)
RECITATION_DEVICE: NOT_TESTED
STUDENT_ROLE: NEEDS_DATA
TEACHER_ROLE: NEEDS_DATA
SUPERVISOR_ROLE: NEEDS_DATA
OFFLINE: PARTIAL
401: PARTIAL
403: PARTIAL
REAL_IPHONE_TEST_PLAN: CREATED
CODE_READY: YES
CODE_GATE: PASS
DEVICE_GATE: NOT_TESTED
NATIVE_BUILD_GATE: NOT_STARTED
TESTFLIGHT_GATE: NOT_STARTED
APP_STORE_REVIEW_GATE: NOT_READY
REAL_DEVICE_READY: NO
BUILD_6_READY: NO
IOS_PUBLISH_CAPABILITY: DETECTED
SAFE_TO_OPEN_EXPO_LAUNCH: YES
SAFE_TO_START_BUILD_6: NO
SAFE_TO_UPLOAD_TESTFLIGHT: NO
SAFE_TO_SUBMIT_APP_REVIEW: NO
APP_IDENTITY_CHANGED: NO  
APPLE_CREDENTIALS_CHANGED: NO  
EAS_PROJECT_CREATED: NO  

## الهوية والقيود المحفوظة

- iOS Bundle ID: `app.replit.tbyan`
- Android package: `com.tabyan.app`
- Version: `1.0.0`
- iOS build number: `6`
- لم يتم إنشاء EAS Project جديد.
- لم يتم تغيير Apple credentials.
- لم يبدأ EAS Build أو TestFlight أو Expo Launch أو App Store Publish.
- Web/API/Production/database لم تُستبدل ولم تُنقل.

## نتائج Phase 1 — iPhone readiness

- **Safe Area: PASS code-level**: أضيف `SafeAreaProvider`، وSafeAreaView للجذر/النوتش، وReact Navigation Tabs موجودة لتدبير bottom safe area.
- **Keyboard handling: PASS code-level**: Login يستخدم `KeyboardAvoidingView` مع سلوك iOS padding.
- **Status bar: PASS code-level**: `expo-status-bar` يتبع الثيم الفاتح/الداكن.
- **Font loading: PASS code-level**: الخطوط تُحمّل قبل native render، مع fail-open واضح عند خطأ التحميل.
- **Splash transition: PASS code-level**: Splash لا يُستخدم كحاجز Web، ويُخفى بعد جاهزية Native.
- **IOS_LAYOUT_RISK**: اختبار Dynamic Island/Home Indicator/keyboard على iPhone ما زال مطلوبًا.

## نتائج Phase 2 — iOS permissions

| Permission | Configured | Usage description | Feature | Denied state |
|---|---|---|---|---|
| Camera | PASS | عربي في `app.json` وplugin | Placement video | PASS: رسالة وإرشاد إعدادات |
| Microphone | PASS | عربي في `app.json` وplugin | Placement/recitation intent | PASS للـPlacement؛ تدفق التلاوة Native غير مكتمل |
| Location | PASS | عربي في `app.json` وplugin | Prayer times/Qibla | PASS: ErrorState عند الرفض |

**UNUSED_SENSITIVE_PERMISSIONS:** لا توجد permission حساسة إضافية مثبتة في `app.json`. لا توجد Push permission مفعلة دون مزود.

## نتائج Phase 3 — QCF2 device gate

- **QCF_DATA: PASS code-level**: `TOTAL_PAGES = 604`، page JSON وcanonical words محليان، مع cache للصفحات وحفظ الصفحة الأخيرة.
- **QCF_FONTS: PASS code-level**: 604 خط QCF2 منفصل بصيغة TTF محوّلة lossless من WOFF2، وMetro يضمّنها عبر `require.context`.
- **QCF_RENDERER: PASS code-level**: Native renderer يستخدم glyphs QCF2، `line_v2`، 15 سطرًا ثابتًا، headers/basmala/markers، وopacity للإخفاء دون `display:none` أو fallback للنص القرآني.
- **GOLDEN_PAGES_CODE: PASS**: فحص آلي للصفحات 1، 2، 27، 187، 300، 604، إضافة إلى verifier المصدر Web.
- **QCF_REAL_DEVICE:** NEEDS_DEVICE_TEST.

لم يُغيّر نص القرآن؛ مصدر Native هو أصول QCF2 المحلية المتحققة.

## نتائج Phase 4 — Placement video real upload

تم إكمال التدفق الحقيقي في Native باستخدام عقد Web/API الحالي:

1. التحقق من URI ووجود الملف والحجم الأقصى 500 MB.
2. `POST /api/storage/uploads/request-url` مع Bearer auth وmetadata.
3. رفع مباشر `PUT` إلى presigned URL عبر `File` الحديثة في Expo SDK 54.
4. `POST /api/storage/uploads/finalize`.
5. الخادم يفحص بنية الفيديو ويثبت private ACL.
6. `student.submitPlacement` يحفظ object path canonical فقط.

- **PLACEMENT_RECORDING: PASS code-level**: camera record/stop، مدة قصوى 120 ثانية، وحالة retry.
- **PLACEMENT_UPLOAD: PASS code-level**: ليس fake upload ولا local-only success.
- **OBJECT_KEY_FORMAT: PASS**: يتحقق العميل والخادم من `/objects/<key>`.
- **FINALIZE: PASS code-level**: يستخدم endpoint الموجود ويفشل عند فيديو غير صالح.
- **DB_REFERENCE: PASS code-level**: mutation لا تقبل إلا object path canonical.
- **FAILURE_HANDLING: PASS code-level**: رسائل للـ401/فشل PUT/fشل finalize، progress، منع الإرسال المزدوج، وإعادة التسجيل.
- **REAL_DEVICE:** يحتاج اختبار camera، file URI، PUT، ffprobe/finalize على جهاز وحساب حقيقي.

## نتائج Phase 5 — attachment uploads

**MOBILE_UPLOAD_FLOWS:** Placement video  

**WORKING:**

- Placement video بعد التعديل: request URL → direct PUT → finalize → submitPlacement.

**BROKEN:**

- لا يوجد broken flow مثبت بعد code-level verification.

**NOT_IMPLEMENTED:**

- Teacher KYC image/video upload في Native.
- Fatwa attachment في Native.
- Certificates/ijazat attachment في Native.
- Student/teacher recording upload غير Placement.
- Audio attachment upload.

لم يُنشأ نظام تخزين جديد؛ التدفقات المستقبلية يجب أن تعيد استخدام نفس private object-storage contract.

## نتائج Phase 6 — Recitation realtime

- **MIC_CODE: PASS code-level**: شاشة التلاوة تبدأ session server أولاً، تطلب microphone permission، وتلغي الجلسة عند الفشل.
- **PCM: PASS code-level**: `react-native-audio-api` يلتقط PCM، يحوّل إلى mono/24 kHz وPCM16LE Base64.
- **WS: PASS code-level**: Native WebSocket إلى `/api/ws/recitation` مع auth/session وready وpartial/final/close.
- **AUTH: PASS code-level**: session ID الصادر من `recitation.start` يمر إلى WS، وفشل الاتصال/الميكروفون يفشل مغلقًا مع cancel.
- **MATCHER: PASS code-level**: canonical matcher موصول بنتائج partial/final ويستخدم `verseKey` و`wordPosition`، مع words للصفحة التالية.
- **WORD_REVEAL: PASS code-level**: current-word وrevealed words يمران إلى QCF renderer مع opacity ثابتة هندسيًا.
- **RECITATION_REAL_DEVICE:** NEEDS_DEVICE_TEST.

لا يُعلن live/device PASS قبل native compile واختبار microphone/WebSocket حقيقي.

## نتائج Phase 7 — account role matrix

**STUDENT: NEEDS_DATA**  
المسارات وحراس الدور وعمليات login/session/logout موجودة code-level، لكن اختبار 401/403/expired session والعمليات الأساسية يحتاج حساب Test حقيقي وبيانات Development.

**TEACHER: NEEDS_DATA**  
حارس الدور وKYC/onboarding والمسارات موجودة، لكن لا يوجد حساب Test معتمد لإثبات المسار الكامل.

**SUPERVISOR: NEEDS_DATA**  
مسارات الإدارة موجودة، لكن لا يوجد اختبار تشغيل على session seeded صالح.

**ROLE_LEAKS: لا يوجد تسرب مثبت في code review؛ يلزم إثبات matrix على بيانات فعلية.**

## نتائج Phase 8 — offline/network failure

- **OFFLINE: PARTIAL**: Query retry محدود وواجهات ErrorState موجودة؛ يلزم اختبار قطع الاتصال أثناء كل عملية.
- **TIMEOUT: PARTIAL**: لا يوجد fake success؛ يلزم اختبار timeout فعلي.
- **HTTP_401: PARTIAL**: retry يمنع إعادة المحاولة التلقائية لـ401/403، لكن matrix فعلي مطلوب.
- **HTTP_403: PARTIAL**: نفس الحماية؛ يلزم إثبات مسارات الأدوار.
- **API_500: PARTIAL**: حالات الخطأ وإعادة المحاولة موجودة في الشاشات الأساسية؛ يلزم اختبار شامل.
- **WS_FAILURE: PASS code-level**: WebSocket errors/close تتحول إلى error state، وتُلغى الجلسة server-side عند فشل البدء.
- **UPLOAD_FAILURE: PASS code-level**: PUT/finalize errors تُعرض ولا تتحول إلى نجاح.

## Source code changes

- إضافة safe-area provider/root handling.
- إصلاح Web `Link asChild` الذي كان يسبب blank screen بسبب CSS style array.
- منع React Compiler التجريبي في Expo config.
- جعل Web لا ينتظر Native font/splash gate.
- إضافة شاشة Student Help.
- إضافة Native private object-storage upload helper.
- إكمال Placement record/preview/retry/upload/finalize/submit UI.
- إصلاح typed route references.
- إنشاء خطة اختبار iPhone حقيقي.

## قرار الإصدار

**CODE_READY: YES** للمعاينة والبناء البرمجي. QCF وRecitation وAuth أصبحت PASS على مستوى الكود بعد التحقق الآلي.
**CODE_GATE: PASS**. عوائق الكود الرئيسية مغلقة.
**DEVICE_GATE: NOT_TESTED** حتى تُنفذ خطة iPhone وتُثبت الكاميرا/الموقع/QCF2/التسميع وrole/account matrix.
**NATIVE_BUILD_GATE: NOT_STARTED**. لا يوجد signed iOS build بعد.
**TESTFLIGHT_GATE: NOT_STARTED**. لا يبدأ قبل إغلاق DEVICE_GATE وتجهيز signing.
**APP_STORE_REVIEW_GATE: NOT_READY** حتى ينجح TestFlight.
**SAFE_TO_OPEN_EXPO_LAUNCH: YES**. فتح Launch لا يساوي بدء Build أو Upload.
**SAFE_TO_START_BUILD_6: NO** حتى تصبح DEVICE_GATE: PASS وIOS_SIGNING: READY وEXPO_LAUNCH: READY.
**SAFE_TO_UPLOAD_TESTFLIGHT: NO**.
**SAFE_TO_SUBMIT_APP_REVIEW: NO**.

لا يبدأ EAS أو TestFlight أو App Store Publish قبل تحويل نتائج الجهاز إلى PASS وإغلاق أي code-level FAIL.