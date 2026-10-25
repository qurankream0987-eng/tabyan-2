# تبيان — التدقيق النهائي لتعديلات iOS

تاريخ الفحص: 10 أكتوبر 2026.

## نطاق الفحص ونتيجته

فُحص المصدر الأصلي مباشرة، وليس اعتمادًا على تقارير سابقة. وفي متابعة 10 أكتوبر 2026 أُزيلت مصادقة Google من Native iOS وAndroid فقط؛ لم يُعدّل المصحف أو بيانات القرآن أو Web أو مسارات الخادم أو بيانات الإنتاج، ولم يُنفّذ Deploy أو Publish أو بناء EAS.

**REAL IPHONE OVERALL: UNVERIFIED.** لا يوجد اختبار على iPhone فعلي في هذا التدقيق. نجاح TypeScript أو تصدير Hermes أو الاختبارات المحلية لا يثبت نجاح الكاميرا أو الصوت أو المظهر على جهاز حقيقي.

النتيجة الأساسية:

- إزالة الظلال، منطق تسجيل اختبار القبول، عدادات الخادم، المحاولة الخامسة، وحظر السادسة: منفّذة في المصدر.
- مسار التسميع Native موصول فعليًا، لكن تشغيل OpenAI الحالي لم يبلغ جاهزية الجلسة.
- أُضيف تحديث حالة أذونات الكاميرا والميكروفون عند الرجوع من Settings، مع fallback عند استعادة تركيز Placement. لا يبدأ التسجيل تلقائيًا.
- أُزيلت مصادقة Google كليًا من Native على iOS وAndroid؛ تسجيل الطالب بكلمة مرور عبر الهاتف/البريد، والمعلم/المشرف عبر اسم المستخدم. لا يوجد Clerk في مسار Native.
- المقاسات الستة فُحصت حسابيًا من قواعد التخطيط، لا من صور أو تشغيل على أجهزة.

## المصفوفة النهائية

كل PASS أو YES متعلق بالمظهر أو أجهزة الالتقاط أدناه يعني **SOURCE-ONLY VERIFIED / REAL-DEVICE UNVERIFIED**، ما لم تُذكر نتيجة اختبار محلي صراحة.

| البند | الحالة | الدليل أو حد التحقق |
|---|---|---|
| Header Shadow | IMPLEMENTED | `ui.tsx`، `Header` و`headerNativeFlat`: جميع قيم الظل معطّلة، وفاصل أسفل الترويسة صفر |
| Bottom Tab Shadow | IMPLEMENTED | `(tabs)/_layout.tsx`: ظل وارتفاع صفر، `boxShadow: "none"`، وفاصل علوي صفر على Native |
| Placement Record Button | IMPLEMENTED | سلسلة الضغط والبدء والإيقاف والمعاينة والإرسال موصولة؛ الأداء الفعلي للجهاز غير مثبت |
| Camera Ready Gate | YES | فحص `cameraReadyRef` ومرجع الكاميرا قبل `recordAsync` |
| Camera Permission | YES | طلب الإذن وفحص النتيجة قبل السماح بالالتقاط |
| Microphone Permission | YES | طلب إذن مستقل بعد الكاميرا؛ يلزم نجاح الاثنين |
| Settings Recovery | YES في المصدر والاختبارات | AppState عند عودة foreground بعد فتح Settings، مع fallback للتركيز وإعادة القراءة دون طلب إذن |
| Duplicate Start Protection | YES | قفل متزامن بـ`recordingInFlightRef` قبل أي انتظار |
| Duplicate Stop Protection | YES | حالة RECORDING مع `stopRequestedRef` قبل `stopRecording` |
| Duplicate Submit Protection | YES | قفل لجيل الحساب وحالة UPLOADING وحالة mutation |
| Recording State | YES | STARTING / RECORDING / STOPPING وحالة «التسجيل جارٍ» |
| Timer | YES | تحديث كل ثانية وإظهار `formatElapsedTime` أثناء التسجيل |
| Stop | YES في المصدر | استدعاء `camera.stopRecording()` ثم انتظار ملف `recordAsync`؛ الجهاز غير مختبر |
| Preview | YES في المصدر | URI محلي داخل `LocalVideoPreview` و`nativeControls` |
| Audio Preview | IMPLEMENTED في المصدر؛ UNVERIFIED فعليًا | تسجيل صوت مع إذن الميكروفون، ولا يوجد كتم صريح في المشغل المحلي |
| Submit After Server Confirmation | YES | لا ينتقل إلى SUBMITTED إلا بعد نجاح `submitPlacement.mutateAsync`؛ الحالة المسترجعة أيضًا من الخادم |
| Record Button Position | PARTIAL كإثبات بصري | داخل محتوى قابل للتمرير، وليس تحت تبويبات Placement؛ المقاسات محسوبة فقط |
| Account Isolation | PASS — SOURCE + UNIT | تنظيف الحالة والكاش والملفات وإبطال العمليات عند تبديل الهوية؛ A→B على iPhone غير مختبر |
| Server Attempts | PASS — SOURCE + UNIT | خمسة لكل حساب/مسار، transaction وتحديث شرطي على صف الحساب |
| Fifth Attempt | PASS — SOURCE | المعاينة تبقى، وزر الإرسال لا يُحظر لمجرد وصول العداد إلى خمسة |
| Sixth Attempt Blocked | PASS — SOURCE + UNIT | واجهة التسجيل تمنعه والخادم يرفض تجاوز خمسة، حتى في اختبار طلبات متزامنة محاكى |
| Recitation Entry | WIRED | الرئيسية → القرآن → `/student/recitation` → `beginSession` → controller |
| Live AI Runtime | BLOCKED | فحص OpenAI الحالي بلا صوت لم يبلغ `onReady`؛ النص الحقيقي UNVERIFIED |
| Splash Smoothness Source | PASS | الخلفية والانتظار والتراكب وتوقيت الإخفاء متسقة؛ السلاسة الفعلية غير مثبتة |
| Welcome Text | PASS | النص النشط حرفيًا: «حياك الله في تبيان» |
| Logo Quality | PASS — SOURCE | Splash: 1196×639؛ شعارات فاتح/داكن: 720×720؛ استخدام `contain` |
| Google Auth Active | ABSENT من Native iOS وAndroid | شاشات الدخول/التسجيل، المساعد، AuthSession، اعتماد الحزمة، وتكوين callback الخاص بـAndroid أزيلت |
| Clerk Active | NO في Native | لا تطابق نشط في app/lib/components/package.json/app.json |
| Native TypeScript | PASS | فُحص بعد إزالة تدفق Google |
| iOS Export | PASS | Hermes `.hbc` بحجم 6.26 MB؛ ليس اختبار iPhone أو IPA |
| Android Export | PASS | Hermes `.hbc` بحجم 6.27 MB؛ ليس تثبيتًا أو اختبار Android فعليًا |
| Focused Tests | PASS | 11 اختبار Native مركّز ناجح، بالإضافة إلى 20 اختبار خادم Google دون تعديل الخادم |
| git diff --check | PASS | اجتاز الفحص بعد التعديلات |
| REAL IPHONE OVERALL | UNVERIFIED | لا دليل جهاز فعلي |
| Mushaf Changed | NO | لم يُعدّل المصحف أو QCF أو بيانات القرآن |
| Production Changed | NO | لا تعديل إنتاج أو بيانات |
| Deployment | NO | لم يُنفّذ |
| Publish | NO | لم يُنفّذ |

## 1. الترويسة والتبويبات

### الترويسة

الملف: `artifacts/mobile/components/ui.tsx`.

- `Header` يختار `headerNativeFlat` على iOS وAndroid، ويترك عمق Web في فرعه المنفصل.
- `headerNativeFlat`، قرب السطر 194: `borderBottomWidth: 0`، `shadowColor: "transparent"`، `shadowOpacity: 0`، `shadowRadius: 0`، offset صفري، `elevation: 0`، `boxShadow: "none"`.
- لون الفاصل Native شفاف. لا يوجد `headerShadowVisible: true` في المسار الذي فُحص.
- Stack الطالب والـStack الجذري يستخدمان `headerShown: false`؛ الترويسة الفعلية مشتركة ومخصصة.

**تمييز مهم:** حقول الظل ليست محذوفة من الكائن؛ موجودة بقيم معطّلة صراحة. النتيجة المقصودة «لا ظل مرئي» منفّذة في المصدر، وليست ادعاء غياب أسماء الخصائص حرفيًا. ظلال البطاقات ليست ظلال الترويسة ولم تُغيّر.

### التبويبات

الملف: `artifacts/mobile/app/student/(tabs)/_layout.tsx`، الأسطر 26–52.

- Native: شفافية الظل ونصف قطره وارتفاعه صفر، `boxShadow: "none"`، `borderTopWidth: 0`، لون الفاصل شفاف.
- الألوان والأيقونات ومسارات التبويبات موجودة كما هي.
- ارتفاع الشريط `72 + insets.bottom` مع تباعد سفلي يستوعب safe area.
- قيم ظل Web ما زالت موجودة في فرع Web فقط.

## 2. تتبع زر التسجيل كاملًا

الملف الرئيسي: `artifacts/mobile/app/student/placement.tsx`.

1. الزر المرسوم قرب الأسطر 694–736 يمرر `onPress` إلى `Button`. المكوّن في `components/ui.tsx` يمرره إلى `SoftPressable`، والذي يمرر الخصائص إلى `AnimatedPressable` في `components/soft-pressable.tsx:13`. لا يستبدل الحركةُ معالجَ الضغط.
2. الحد الأدنى لارتفاع `Button` هو 48 نقطة، أعلى من شرط 44 نقطة. النص قابل للانكماش والالتفاف.
3. عند غياب الأذونات يظهر زر طلب الكاميرا والميكروفون، أو زر Settings عند الرفض الدائم.
4. طلب الكاميرا ثم الميكروفون تسلسليًا في `requestRecordingPermissions`، قرب الأسطر 268–306؛ يُفحص نجاح كل إذن. الرسائل العربية موجودة كذلك في إعدادات iOS.
5. `onCameraReady` يضبط مرجع الجاهزية. `record` لا يستدعي الالتقاط قبل وجود الأذونات والمرجع الجاهز والكاميرا.
6. `recordingInFlightRef` يُقفل قبل عمليات الانتظار؛ يمنع بدء تسجيل ثانٍ.
7. `recordAsync` يبدأ بحد أقصى 300 ثانية وبـH.264 `avc1` على iOS. لا يضع التطبيق `mute` على الكاميرا.
8. حالة RECORDING تُظهر مؤشر التسجيل والوقت. الإيقاف يحوّل الحالة إلى STOPPING ويستدعي `stopRecording` مرة واحدة.
9. إكمال Promise التسجيل هو مصدر URI. أقل من 45 ثانية يُرفض محليًا ويُحذف الملف؛ ليس ملفًا جاهزًا للإرسال.
10. الملف المقبول يُربط بجيل الحساب ويُعرض محليًا. تُنشأ هوية محاولة واحدة ثم يُطلب تثبيتها على الخادم.
11. الإرسال يحتاج محاولة مثبتة، ويرفع الملف ويمرره للتحقق، ثم يرسل `videoProof` والمسار وهوية المحاولة إلى الخادم.
12. لا تظهر SUBMITTED قبل اكتمال mutation بنجاح. عند الفشل تبقى المعاينة والخطأ؛ عند استرجاع status يؤكد الخادم وجود الفيديو قيد المراجعة.

لا توجد طبقة absolute في شاشة Placement تغطي زر التسجيل في المصدر الذي فُحص. الكاميرا والمشغل ثم الزر عناصر متتابعة، وليست طبقات فوق الزر. تراكب Splash موجود أثناء بدء التطبيق فقط ويزال بعد توقيته.

### تحديث الأذونات بعد العودة من Settings

الآن تستخدم شاشة Placement getters الثالثة من `useCameraPermissions` و`useMicrophonePermissions`، وهي قراءات لا تطلب الأذونات. عند فتح Settings تُعلّم الشاشة بأنها تنتظر العودة، ثم يعيد AppState الفحص عند الانتقال من inactive/background إلى active. إذا استعيد تركيز الشاشة مع بقاء التطبيق active، يعمل فحص التركيز كمسار احتياطي.

- عند السماح بالإذنين تُمسح رسالة الخطأ القديمة وتعود الواجهة لمسار جاهزية الكاميرا.
- إذا بقي أي إذن مرفوضًا، تبقى بوابة الإذن والإرشادات العربية. وتُصفّر جاهزية الكاميرا عند الرفض حتى لا يظهر زر بدء قابلًا للضغط بمؤشر جاهزية قديم.
- لا يستدعي تحديث العودة دوال request، ولا يبدأ `recordAsync` أو microphone capture، ولا يحجز attempt.
- يُزال AppState subscription عند إلغاء تركيب الشاشة. عند تبديل الحساب يُلغى انتظار العودة؛ أي فحص متأخر لا يحدّث حالة حساب جديد.
- اختبارات الوحدة تغطي منح الكاميرا وحدها، منح الميكروفون، منح الاثنين، استمرار الرفض، العودة العادية دون فتح Settings، fallback التركيز، تبديل الحساب، والتنظيف.

هذه أدلة مصدر واختبارات محلية؛ لا تثبت بعد السلوك الفعلي عند تبديل الإذن داخل Settings على iPhone أو Android حقيقي.

## 3. موضع الزر والمقاسات الستة

`StudentScreen` يضع Header ثم `Screen` قابلًا للتمرير. Placement مسار تحت Stack الطالب خارج مجموعة `(tabs)`؛ لا يُرسم شريط تبويبات فوقه.

قواعد العرض: `Screen.content` عرضه 100% وبـ18 نقطة padding على كل جانب؛ البطاقة لها 16 نقطة padding وحد بعرض نقطة على كل جانب. لذا عرض المحتوى الداخلي النظري:

| عرض الشاشة بالنقاط | عرض محتوى Screen | داخل بطاقة التسجيل |
|---:|---:|---:|
| 320 | 284 | 250 |
| 375 | 339 | 305 |
| 390 | 354 | 320 |
| 393 | 357 | 323 |
| 414 | 378 | 344 |
| 430 | 394 | 360 |

- الكاميرا والمعاينة بعرض 100%؛ لا يوجد عرض ثابت أكبر من مساحة البطاقة.
- الزر بارتفاع أدنى 48، وليس موضعًا absolute أسفل الشاشة.
- التمرير يحتوي padding سفليًا `max(40, insets.bottom + 24)` خارج تبويبات الطالب.
- نسبة الكاميرا والمعاينة 3:4؛ المشغل يستخدم `contain`.
- الزر قد يحتاج تمريرًا، خصوصًا على هاتف صغير؛ ليس مضمون الظهور في أول viewport.

هذه **حسابات مصدر وليست اختبارات rendering**. عدم القص، سهولة الوصول لزر الإيقاف أثناء التسجيل، التفاف العربية، safe area الفعلي، وصوت المعاينة على المقاسات الستة: **REAL-DEVICE UNVERIFIED**.

## 4. عزل الحساب والمحاولات الخامسة والسادسة

### عزل الحساب

- `lib/auth.tsx:67–95`: الدخول بهوية مختلفة والخروج يستدعيان `beginAccountTransition` ثم يمسحان كاش المستخدم ويُبطلان الجلسة السابقة قبل تسجيل التالية.
- يُنظف كاش الوسائط والتحميلات والملفات المؤقتة والتسجيلات المحلية.
- `lib/trpc.tsx:53–58` يلغي ويحذف queries الخاصة بالمستخدم ويمسح mutations؛ fetch مربوط بجيل الحساب وتطابق bearer الحالي.
- `placement.tsx:151–173` يصفر المسودة وURI وهوية المحاولة والوقت والعداد والاختيارات، ويوقف التسجيل.
- العمليات المتأخرة لا تُطبّق نتائجها بعد تغيير الحساب؛ ملفات التسجيل المتأخرة تُزال.

لا تُقرأ حصة Placement من AsyncStorage أو SecureStore أو deviceId أو installationId. وجود تخزين للرمز أو فهرس الملفات المؤقتة لا يجعله مصدر الحصة.

اختبارات تبديل الهوية وإلغاء رفع قديم والملفات المؤقتة ناجحة. تجربة A logout → B login على هاتف فعلي لم تُنفّذ.

### عقد الخادم

الملف: `lib/tabyan-trpc/src/routers/student.ts:158–219` و`placementStatus` قرب السطر 330.

- `quran` و`tajweed_correction` عدادان منفصلان لكل مستخدم authenticated.
- transaction تنشئ المحاولة أولًا مع مفتاح idempotency، ثم تحديث شرطي يزيد عداد الحساب عندما يكون أقل من خمسة.
- تعارض هوية محاولة من حساب أو مسار مختلف يُرفض؛ تكرار الهوية الصحيحة لا يستهلك محاولة إضافية.
- تغيير الجهاز لا يغير `ctx.user.id` أو عداد قاعدة البيانات.
- `submitPlacement` يطالب بمحاولة للحساب والمسار نفسهما داخل transaction؛ الإرسال لا يزيد العداد ثانية.
- video proof مرتبط بالمستخدم والدور والغرض والمسار وبمدة ملف تم التحقق منها، وليس مدة يقررها الهاتف وحده.

اختبارات الخادم محاكية لقاعدة البيانات؛ تثبت assertions ومسارات المنطق، وليست اختبار تنافس معاملات PostgreSQL فعلية أو تعديلًا لبيانات الإنتاج.

### الخامسة والسادسة

- عند المحاولة الخامسة يبقى `videoUri` والمشغل.
- زر إعادة التسجيل يُحظر، لكن زر إرسال الاختبار لا يحتوي شرط `attemptsUsed >= 5`.
- النص: «احتفظ بهذا التسجيل وأرسله للمراجعة. للحصول على محاولة إضافية، تواصل مع الإدارة.»
- عند نفاد المحاولات بلا مسودة يظهر «انتهت المحاولات» ونص التواصل مع الإدارة.
- `record` و`resetRecording` يمنعان إنشاء السادسة؛ الخادم يفرض الحد مستقلًا عن الواجهة.
- اختبار ثمانية طلبات محاكية متزامنة قبل خمسة فقط ورفض ثلاثة.

## 5. المعاينة

`components/library-media-player.tsx:194–197`: `LocalVideoPreview` يشغل URI محليًا مع `nativeControls` و`contentFit="contain"` و`loop=false`.

تشغيل/إيقاف مؤقت/تحريك موضع وإعادة التشغيل يعتمد على أدوات المشغل الأصلي؛ لم يضف التدقيق زرًا أو مشغلًا بعد الإرسال. حالة النجاح تعرض حالة المراجعة فقط.

لا يوجد كتم صريح أو ضبط volume إلى صفر، لكن وصول الصوت الفعلي، وضع الهاتف الصامت، ومخارج الصوت لم تُختبر. `app.json` يقيد التطبيق بالاتجاه العمودي؛ لم يُثبت دوران الهاتف أو fullscreen فعليًا. نسبة الحاوية لا تعني أن كل ملف مصوّر له النسبة نفسها؛ `contain` يحافظ على نسبة الملف دون تمديده.

## 6. مسار التسميع وOpenAI

السلسلة الحالية:

`student/(tabs)/home.tsx`
→ بطاقة القرآن `/student/quran`
→ زر «فتح التسميع الحي» في `student/quran.tsx:98–103`
→ `/student/recitation`
→ زر البدء في `student/recitation.tsx`
→ `beginSession` قرب السطر 151
→ `startMutation` لجلسة GENERAL
→ `new NativeRecitationController(...)`
→ `controller.start(token, sessionId)`.

`lib/native-recitation.ts` يطلب إذن الميكروفون، وينشئ WebSocket إلى `/api/ws/recitation` وAudioRecorder. ليست بطاقة غير موصولة. البدء يُحجب عند غياب الطالب/النطاق/التغطية/تفعيل live tracking، وعلى Expo Web.

**ربط الشاشة ليس نجاح تشغيل حي.**

### الفحص الحالي للمزوّد

- اختيار المزوّد في الفحص المحلي الحالي: `openai`.
- استُخدم adapter المصدر الحالي، وليس التقرير السابق، دون إنشاء جلسة طالب أو إرسال تسجيل خاص.
- أُجري فحص جاهزية بلا صوت ثم فحص تشخيصي بلا صوت لتفريق خطأ عام عن خطأ رصيد. إجمالي bytes الصوت المرسلة: **0**.
- لم تصل الجلسة إلى `onReady`.
- التصنيف الأول: `provider_error`.
- التصنيف التشخيصي الثاني: `BLOCKED BY PROVIDER CONFIGURATION` بناءً على بصمة رسالة model/parameter/session-type/unknown/invalid. هذا ليس تحديدًا مؤكدًا لحقل واحد معطّل، ولا برهانًا على حالة الرصيد.
- الرصيد الحالي: **UNVERIFIED**. لا يصح تكرار تشخيص «لا رصيد» من تقرير سابق بعد هذه النتيجة المختلفة.
- transcript حقيقي: **UNVERIFIED**؛ لم يُرسل صوت، ولم تُدّع صحة نص أو استماع مباشر على iPhone.
- النتيجة: **Live AI Runtime: BLOCKED**، وليست WORKING. لم يغيّر التدقيق الموديل أو إعدادات المزود ولم يكرر اختبارات صوتية مدفوعة.

فُحصت اختبارات matcher/controller المحلية بمقابس وتسجيلات محاكية؛ لا تُعد دليلًا على OpenAI حي أو ميكروفون iPhone.

## 7. Splash والترحيب والشعار

- إعداد `expo-splash-screen` في `app.json`: الخلفية `#4C091B` و`logo-splash.png` و`contain` بعرض 260.
- `constants/splash.ts` يستخدم الخلفية نفسها.
- `_layout.tsx:23,46–57,60–71,91` يمنع الإخفاء التلقائي، ويبقي الخلفية نفسها أثناء تحميل الخطوط، وينتظر auth/theme/layout قبل إخفاء Native Splash.
- تراكب `TabyanSplash` يغطي Stack حتى نهاية الحركة؛ fading يبدأ عند 2250 ms ومدته 550 ms؛ النهاية 2800 ms بعد بدء التسلسل.
- لا يوجد مسار أبيض صريح في انتقال البداية الذي فُحص. لم يُفحص launch screen داخل binary مثبت، ولا البدايات الباردة/الدافئة على iPhone.
- `guest.tsx:206` يستخدم `TABYAN_WELCOME_GREETING`؛ تعريف `lib/tabyan-domain/src/welcome-copy.ts:1` حرفيًا «حياك الله في تبيان». عبارات ترحيب صفحات الطالب والمعلم ليست النص القديم لشاشة الترحيب.
- Splash: PNG بحجم 1196×639، يُعرض بعرض Native لا يتجاوز 260 مع نسبة أصلية و`contain`، وليس bitmap صغيرًا مكبرًا.
- شعارات الفاتح والداكن: 720×720؛ تطابق ملفات Web الحالية byte-for-byte بفحص SHA-256.
- شعار Splash Native ملف مختلف الأبعاد عن Splash Web؛ لم يُفترض تطابقهما ثنائيًا. نسبة Native في الثوابت تطابق ملفه الفعلي.
- شعار guest يستخدم `contain` داخل إطار 176×94؛ لا يُمدّد الصورة لتغيير نسبتها.

النتيجة المصدرية PASS؛ غياب الوميض والسلاسة والجودة البصرية الفعلية **REAL-DEVICE UNVERIFIED**.

## 8. تدقيق Google وClerk الحالي في Native

النتيجة الحالية بعد متابعة الإزالة في 10 أكتوبر 2026؛ لا تُستخدم نتائج هذا القسم كدليل على تغييرات Web أو الخادم.

- **Active Native Google auth matches: 0.** لا يوجد Google/OAuth/AuthSession/Clerk في شاشتي الدخول والتسجيل؛ أزيلت وحدة Google Native وتبعيتها `expo-auth-session`.
- **Native password auth preserved:** الطالب يسجّل برقم الهاتف أو البريد الإلكتروني وكلمة السر؛ المعلم/المشرف باسم المستخدم وكلمة السر.
- أزيل Android OAuth callback override، وبقي `tabyan` scheme العام للتنقل.
- مصادقة Web، ومسارات الخادم وعقود Google الموجودة، وبيانات الإنتاج لم تتغير. اجتازت اختبارات auth.google الموجودة دون تعديل الخادم.
- بقية مراجع Google في Native غير متعلقة بالدخول: `@expo-google-fonts` للخطوط؛ `stun.l.google.com` لخوادم STUN في اتصالات الجلسات؛ رابط Google Play في صفحة التوزيع؛ وتعليق `lib/trpc.tsx` يؤكد أن تسجيل الخروج من تبيان لا يسجّل الخروج من حساب Google على الجهاز.
- بقي `expo-web-browser` لأن قارئ مكتبة Native يستخدمه؛ إزالة `expo-auth-session` لا تعني إزالة متصفح القارئ.
- **Clerk Active (Native): NO.**

## 9. نتائج الأوامر المحلية

| الفحص | النتيجة |
|---|---|
| `pnpm --filter @workspace/mobile typecheck` | PASS |
| `CI=1 pnpm exec expo export --platform ios --output-dir /tmp/tabyan-ios-final-audit-export --max-workers 2` داخل mobile | PASS؛ تصدير واحد |
| `pnpm --filter @workspace/tabyan-trpc exec vitest run --root ../../artifacts/mobile tests/permission-settings-return.test.ts tests/account-transition.test.ts tests/mobile-upload-account-transition.test.ts tests/private-temporary-files.test.ts` | 12 / 12 PASS |
| `pnpm --filter @workspace/tabyan-trpc exec vitest run src/routers/student-placement-attempts.test.ts` | 4 / 4 PASS |
| `pnpm --filter @workspace/api-server exec node --import tsx --test ../mobile/tests/native-recitation.test.ts` | 10 / 10 PASS |
| `git diff --check` | PASS |

مخرجات التصدير خارج Git في `/tmp`. اكتمل تصدير iOS بصيغة Hermes (`.hbc`، نحو 6.35 MB)، وكذلك Android (`.hbc`، نحو 6.37 MB). هذا لا يتضمن إثبات توقيع iOS أو Android، أو التثبيت، أو تشغيل hardware، ولا يُعد App Store build أو Play Store build.

أول محاولة تشغيل اختبارات اصطدمت بغياب tsx في جذر workspace، والمحاولة التي خلطت Node tests مع Vitest اصطدمت بغياب Vitest عند التشغيل خارج harness الخاص به. صُححت طريقة التشغيل باستخدام الأدوات المثبتة أصلًا، دون تثبيت تبعيات. الاختبارات المركّزة النهائية وعددها 26 ناجحة؛ أخطاء تهيئة أدوات الفحص ليست أخطاء assertions في المنتج.

## 10. متابعة إزالة Google من Native — 10 أكتوبر 2026

| الفحص بعد التغيير | النتيجة |
|---|---|
| `pnpm --filter @workspace/mobile typecheck` | PASS |
| `pnpm --filter @workspace/tabyan-trpc exec vitest run --root ../../artifacts/mobile tests/native-login-method.test.ts tests/native-auth-removal.test.ts tests/account-transition.test.ts` | 11 / 11 PASS |
| `pnpm --filter @workspace/tabyan-trpc exec vitest run src/routers/auth.google.test.ts` | 20 / 20 PASS؛ عقد الخادم لم يتغير |
| `CI=1 pnpm exec expo export --platform ios --output-dir /tmp/tabyan-native-google-auth-ios --max-workers 2` من `artifacts/mobile` | PASS؛ Hermes 6.26 MB |
| `CI=1 pnpm exec expo export --platform android --output-dir /tmp/tabyan-native-google-auth-android --max-workers 2` من `artifacts/mobile` | PASS؛ Hermes 6.27 MB |
| `git diff --check` | PASS |

أُعيد تشغيل سير عمل Expo، ونجح تجميع iOS وWeb في سجلاته. لقطة المعاينة التُقطت أثناء شاشة بدء التشغيل، لذا لم تُستخدم كدليل بصري على ظهور نموذج الدخول بعد اكتمال الإقلاع. لا يعني التصدير اختبارًا على جهاز فعلي أو نشرًا؛ لم يُنفّذ Publish أو Deploy.

## حد القبول

يمكن اعتماد البنود المثبتة **في المصدر والاختبارات المحلية فقط**. لا توجد شهادة نجاح نهائية على iPhone أو Android؛ تبقى تجربة الأذونات بعد Settings، الالتقاط والإيقاف والصوت، المقاسات الستة وsafe area، عزل الحساب على الجهاز، والسلاسة البصرية غير مثبتة فعليًا. تشغيل AI الحي متعطل قبل readiness في الفحص الحالي.

**Mushaf Changed: NO — Production Changed: NO — Deployment: NO — Publish: NO.**
