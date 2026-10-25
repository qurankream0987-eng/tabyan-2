# تقرير تكامل وسلامة تطبيق تبيان Native

**التاريخ:** 13 سبتمبر 2026  
**النطاق:** `artifacts/mobile` فقط. لم يُعدّل تطبيق الويب أو الخادم.  
**الحكم العام:** العطلان اليدويان المبلّغ عنهما تم إصلاحهما والتحقق منهما تفاعليًا على Expo Web. ملحق إصلاح ما قبل Build 6 في نهاية هذا التقرير يعكس معالجة حواجز الوسائط وWebRTC المحددة، مع بقاء اختبارات الأجهزة الحقيقية إلزامية قبل المراجعة. هذا التقرير ليس شهادة اختبار على iPhone أو Android فعليين.

## 1. نطاق التدقيق وطريقة الإثبات

تمت مراجعة جميع شاشات Expo Router ومساراتها الساكنة (76 شاشة): 2 عامة، 3 تسجيل/دخول، 33 للطالب، 15 للمعلم، و23 للمشرف. شمل التدقيق:

- الانتقال والحماية حسب الدور.
- queries وmutations عبر tRPC، وحالات التحميل والخطأ والفراغ.
- الروابط والملفات المرفوعة والـPDF والصوت والفيديو.
- imports الخاصة بـNative، والأذونات، والمؤقتات، والمقابس، والتنظيف عند الخروج.
- عناصر placeholder أو النجاح غير المرتبط بنتيجة عملية فعلية.

مصادر الإثبات:

1. مراجعة مصدر Native ومساراته وواجهات API المرتبطة.
2. اختبار تفاعلي على Expo Web المباشر بحجم 400×720، مع تسجيل طالب جديد من واجهة التطبيق نفسها.
3. فحص TypeScript وLSP وExpo dependency check وiOS JavaScript bundle export.
4. سجلات التطبيق والخادم بعد المسارات المختبرة.

### حدود الإثبات

- Expo Web لا يثبت سلامة وحدات iOS/Android الأصلية، ولا الكاميرا أو الميكروفون أو WebRTC أو خلفية التطبيق أو Bluetooth.
- تصدير iOS يثبت bundling JavaScript، ولا ينشئ أو يثبت تطبيق iOS فعليًا.
- لم يتم بدء Build 6 أو النشر.
- أصول المصحف QCF مستثناة عمدًا من هذه النسخة (`QCF_FILES=0`)؛ لم تُستعد ولم تُعامل كخطأ في البيانات.

## 2. العطلان اليدويان

### 2.1 الطالب ← المكتبة ← تحفة الأطفال ← تفاصيل

| البند | النتيجة |
|---|---|
| الحالة السابقة | **FAIL / crash مؤكد من المصدر** |
| المسار | `/student/library/:id` |
| السبب | كانت شاشة التفاصيل تعيد loading/error/empty قبل تعريف `useState` و`useEffect` الخاصين بالتنزيل المحلي. عند وصول `library.detail` في render لاحق يتغير عدد Hooks، فيظهر React invariant مثل `Rendered more hooks than during the previous render`. |
| ملف السبب | `artifacts/mobile/app/student/library/[id].tsx` |
| الإصلاح | نُقلت Hooks الخاصة بالتنزيل قبل جميع returns المشروطة. طُبّع `id` الذي قد يأتي مصفوفة، وأضيفت حماية للقيم غير النصية في نوع المحتوى ومحلل مصدر الملفات. |
| تحقق بعد الإصلاح | **PASS — تفاعلي** |

نتيجة التحقق بعد الإصلاح:

- فتح الطالب قسم **المكتبة** ثم العنصر **تحفة الأطفال** ثم **تفاصيل**.
- فُتح مسار التفاصيل الحقيقي وأظهر العنوان والمؤلف والقسم وإجراءات القراءة والحفظ.
- لا red screen، ولا شاشة فارغة، ولا exception في console.
- سجل الخادم طلب `library.detail` الناجح بحالة 200 ضمن جلسة التطبيق.

### 2.2 الطالب ← القرآن الكريم ← تصحيح التلاوة

| البند | النتيجة |
|---|---|
| الحالة السابقة | **FAIL / crash محتمل عند فتح المسار على binary لا يحوي وحدة الصوت** |
| المسار | `/student/tilawah` |
| السبب | كانت الشاشة تستورد `react-native-audio-api` بصورة eager عبر `lib/native-recitation.ts` قبل أن تعرض أي UI. في Expo Go أو binary لا يحوي config plugin يمكن أن يفشل import نفسه قبل أي catch. كما أن بدء الجلسة يحاول تحميل صفحات وكلمات QCF رغم أن الأصول مستثناة عمدًا. |
| ملفات السبب | `artifacts/mobile/app/student/tilawah.tsx`، `artifacts/mobile/lib/native-recitation.ts`، `artifacts/mobile/lib/mushaf-native.ts` |
| الإصلاح | أزيلت imports ومسارات بدء التسميع/تحميل QCF من شاشة هذه النسخة. المسار يعرض حالة عربية آمنة وصريحة بأن التصحيح الحي يحتاج أصول المصحف المستثناة، وزر البدء معطل. لا يُطلب الميكروفون ولا تفتح WebSocket ولا ترسل mutation بدء جلسة. كما لم تعد رسالة خطأ controller تمرر تفاصيل تقنية مباشرة للواجهة. |
| تحقق بعد الإصلاح | **PASS — تفاعلي على Expo Web؛ REAL_DEVICE_REQUIRED للـNative binary** |

نتيجة التحقق بعد الإصلاح:

- فُتح `/student/tilawah` من واجهة الطالب.
- ظهرت رسالة عربية توضح أن التصحيح الحي غير متاح في النسخة الحالية لأن أصول المصحف المرافقة للصفحات مستثناة.
- زر **بدء التسميع الحي** ظاهر ومعطل (`aria-disabled=true` في Expo Web).
- لا red screen أو شاشة فارغة أو page error أو console error.
- لم يظهر أي طلب لبدء جلسة تلاوة، ولم يُطلب مورد لوحدة صوت Native.

> **قرار المنتج الحالي:** ميزة التصحيح الحي غير قابلة للتشغيل في هذه النسخة، ولا يجوز تحويل الزر إلى نجاح صوري. إعادة تفعيلها تتطلب إصدارًا مخصصًا يحوي أصول QCF ووحدة الصوت ويمر باختبار جهاز حقيقي.

## 3. نتائج التحقق المنفذة

| الفحص | النتيجة | الدليل |
|---|---|---|
| TypeScript | PASS | `pnpm --dir artifacts/mobile run typecheck` |
| LSP لمجلد mobile | PASS | لا ملفات diagnostic |
| Expo package compatibility | PASS | `CI=1 pnpm exec expo install --check` |
| سلامة diff | PASS | `git diff --check` |
| iOS JavaScript export | PASS | `expo export --platform ios` أنشأ bundle iOS بنجاح |
| الهوية | PASS | iOS `app.replit.tbyan`، Android `com.tabyan.app`، version `1.0.0`، build number `6` |
| QCF مستثنى | PASS / مقصود | `QCF_FILES=0` |
| تفاصيل تحفة الأطفال | PASS | اختبار تفاعلي ناجح دون exception |
| فتح تصحيح التلاوة | PASS | اختبار تفاعلي ناجح بالحالة الآمنة |
| اختبارات iPhone/Android فعلية | REAL_DEVICE_REQUIRED | لم تُجر |

## 4. عناصر FAIL المفتوحة

هذه العناصر ليست سبب العطلين اللذين تم إصلاحهما، لكنها تمنع اعتبار التكامل Native مكتملًا أو Build 6 جاهزًا.

| الشدة | المسار/السطح | الملف والدليل | الأثر على Build 6 | الإصلاح المطلوب |
|---|---|---|---|---|
| **High** | تسجيلات المعلم | `artifacts/mobile/app/teacher/recordings.tsx:19-29,57-60` | قد تظهر قائمة تسجيلات ناجحة لكن ينتهي اللاعب فارغًا أو غير مصرح به بلا تفسير أو retry. URL النسبي يُلصق بمسار التخزين دون عقد صلاحية واضح، ولا توجد حالة player error. | استخدم عقد تخزين مصرحًا به للوسائط الخاصة، تحقق من URL، أضف حالة تحميل/خطأ/retry من حالة `expo-video`. |
| **High** | مراجعة وسائط المشرف | `artifacts/mobile/components/library-media-player.tsx:17-29,64-95`، والاستدعاءات في `artifacts/mobile/app/admin/_common.tsx:72,89-91` | فيديوهات/وسائط قبول أو ترقية مرفوعة خاصًا قد لا تحمل لأن اللاعب يتلقى URL خامًا بلا token/header/endpoint مصرح. spinner يعتمد على `duration` وقد يبقى إلى الأبد. | مرر مصدرًا مصرحًا به عبر resolver موحد، تحقق من المصدر، استبدل spinner المعتمد على duration بحالة player، وأضف retry. |
| **High** | شهادات KYC والقِراءات للمشرف | `artifacts/mobile/app/admin/_common.tsx:89-90` | `Linking.openURL` المباشر لمسار خاص أو غير صالح قد يفشل بدون معالجة، فلا يستطيع المشرف مراجعة شهادة مرفوعة. | حوّل مسارات object الخاصة إلى endpoint تنزيل/عرض مصرح، واستخدم `canOpenURL` وcatch يعرض رسالة عربية قابلة للتصرف. |

## 5. عناصر PARTIAL المفتوحة

| الشدة | المسار/السطح | الملف والدليل | الأثر على Build 6 | الإصلاح المطلوب |
|---|---|---|---|---|
| **High** | إعادة اتصال جلسات البث المباشر | `components/teacher-session-call.native.tsx:251-259`، `components/student-session-call.native.tsx:282-290`، `components/admin-session-monitor.native.tsx:255-263` | أحداث close سريعة قد تجدول أكثر من reconnect وتنتج sockets متداخلة أو إشارات مكررة. | Timer واحد فقط، مسحه قبل الجدولة، generation token لكل اتصال، وإغلاق المقبس السابق قبل إنشاء التالي. |
| **High** | lifecycle لوحدة التلاوة عند إعادة تمكينها | `artifacts/mobile/lib/native-recitation.ts:305-417` | `start()` ليس idempotent، و`stop()` لا يغلق كل حالات socket. عند إعادة توفير QCF قد يؤدي retry أو remount إلى ميكروفون/streams مكررة. | ارفض/أوقف الجلسة النشطة قبل start، واجعل stop/fail idempotent لكل socket state، واربط التنظيف بــeffect في الشاشة المفعّلة مستقبلًا. |
| **Medium** | انتهاء اتصال تلاوة معلّق عند إعادة تمكينها | `artifacts/mobile/lib/native-recitation.ts:315-331,405-416` | WebSocket لا يفتح ولا يفشل قد يبقي الواجهة في connecting إلى ما لا نهاية. | timeout محدد للاتصال يغلق socket ويرجع رسالة عربية مع retry. |
| **Medium** | الموقع ومواقيت الصلاة والقبلة | `app/student/prayer-times.tsx`، `app/student/qibla.tsx` | إكمال permission/GPS/fetch بعد الخروج من الشاشة قد يحدث state update متأخرًا أو عملًا غير لازم. | AbortController للـfetch وflag إلغاء/تركيب قبل كل setState. |
| **Medium** | تشغيل المكتبة ومحتوى الشريعة | `components/library-media-player.tsx:28-52`، `app/student/sharia/[subject]/content.tsx:68-83` | إزالة listener وحدها لا تضمن إيقاف أو تحرير player عند التنقل؛ قد يبقى صوت/فيديو أو موارد native. | pause/release/unload وفق API `expo-video` عند cleanup وتغيير المصدر، مع إعادة ضبط حفظ التقدم. |
| **Medium** | رفع الفيديو/المرفقات عند مغادرة الشاشة | `artifacts/mobile/lib/mobile-upload.ts:118-137` | timeout يلغي الرفع، لكن التنقل قبل timeout لا يلغي المهمة؛ قد يستمر استهلاك البيانات أو إنهاء رفع غير مقصود. | مرر AbortSignal أو cancel handle للشاشات وألغ المهمة في cleanup وتجنب finalize بعد الإلغاء. |
| **Medium** | حالات فشل رفع الوسائط | `artifacts/mobile/lib/mobile-upload.ts:16-26,41-72,104-134` | معالجة HTTP/timeouts جيدة عمومًا، لكن خطأ PUT لا يصنف بشكل موحد ويعتمد على كل caller لعرض retry. | نوع خطأ موحد (network/timeout/http/finalize) وإلزام كل caller بواجهة خطأ وإعادة محاولة. |
| **Medium** | وسائط المكتبة | `artifacts/mobile/app/student/(tabs)/library.tsx:75-109,159+` و`components/library-media-player.tsx` | مصدر فارغ أو player فاشل قد ينتج spinner أو failure لمرة واحدة بلا retry، خصوصًا مع وسائط خاصة. | حالة "المادة غير متاحة"، resolver مصرح لكل مصدر خاص، وretry لإعادة إنشاء player. |
| **Medium** | handlers متأخرة في WebRTC teardown | `components/teacher-session-call.native.tsx:322-338`، `components/student-session-call.native.tsx:354-370`، `components/admin-session-monitor.native.tsx:294-302` | قد تصل callbacks متأخرة بعد الخروج وتحدّث واجهة قديمة. | افصل handlers عن socket وRTCPeerConnection قبل close، مع generation guard. |

## 6. حالات placeholder وحقيقة السلوك

هذه ليست نجاحات وهمية، لكنها حالات منتج غير مكتملة أو مشروطة يجب أن تظل ظاهرة للمستخدم بوضوح:

| المسار | الحالة | التقييم |
|---|---|---|
| `/student/sharia` | مواد ستضاف لاحقًا | PARTIAL منتج، لا نجاح صوري |
| `/student/sharia/:subject` | مستويات ستضاف لاحقًا | PARTIAL منتج، لا نجاح صوري |
| `/student/booking` | لا توجد مواعيد حالية | حالة فارغة صادقة |
| `/student/sharia/:subject/certificate` | الشهادة غير متاحة قبل الامتحان | حالة مشروطة صادقة |
| `/student/tilawah` | QCF مستثنى، ولذلك التصحيح الحي معطل | PASS للسلوك الآمن الحالي؛ feature غير متاحة عمدًا |

لم يُعثر في المسح الساكن على `onPress` فارغ، أو انتقال route واضح إلى هدف غير موجود. كما أن رسائل نجاح placement/onboarding التي تمت مراجعتها مرتبطة بعمليات mutation منتظرة وليست نجاحات فورية مصطنعة.

## 7. اختبارات REAL_DEVICE_REQUIRED

لا يمكن استبدال أي عنصر من القائمة التالية بـExpo Web أو bundling:

| الشدة | السطح | ما يجب اختباره على iPhone وAndroid فعليين |
|---|---|---|
| **Critical** | `teacher-session-call.native.tsx` و`student-session-call.native.tsx` | بداية باردة، رفض الكاميرا/الميكروفون، تفعيل الإذن من Settings، رجوع/تنقل، foreground/background، reconnect، وإيقاف tracks. |
| **Critical** | `lib/native-recitation.ts` عند إصدار QCF/التلاوة | إذن الميكروفون، التسجيل، pause/resume/stop/failure، Bluetooth/audio route، interruption، القفل والخلفية، وعدم تسرب الميكروفون. |
| **High** | `app/teacher/onboarding.tsx` و`app/student/placement.tsx` | رفض وإعادة محاولة الكاميرا/الميكروفون، التصوير والتدوير، تشغيل المعاينة، إلغاء الرفع، والتعامل مع الشبكة الضعيفة. |
| **High** | `admin-session-monitor.native.tsx` وكل WebRTC | TURN/STUN، transceivers، مسار remote track، الصوت/الفيديو على Wi‑Fi والبيانات الخلوية، والتنظيف عند إنهاء المكالمة. |
| **High** | library/recordings/private media | تشغيل PDF والصوت والفيديو الخاص، انتهاء الصلاحية، عدم وجود شبكة، retry، والتنقل أثناء التشغيل. |
| **High** | المصحف عند عودته في إصدار منفصل | صحة رسم QCF، الأداء والذاكرة، اتجاه RTL، والتنقل بين الصفحات على أجهزة فعلية. |
| **Medium** | القبلة ومواقيت الصلاة | إذن الموقع، GPS ضعيف/مرفوض، والعودة من الخلفية. ملاحظة: اتجاه البوصلة غير مدعوم حاليًا برمجيًا، لذا الزاوية ثابتة وليست بوصلة حية. |

## 8. قرار بوابة Build 6

| البوابة | الحالة |
|---|---|
| عطل مكتبة تحفة الأطفال | **CLEARED** |
| فتح تصحيح التلاوة دون QCF | **CLEARED** |
| TypeScript / Expo compatibility / iOS JS bundle | **CLEARED** |
| وصول وسائط وشهادات خاصة للمشرف والمعلم | **BLOCKED — FAIL** |
| اختبار WebRTC/كاميرا/ميكروفون/وسائط على جهاز فعلي | **BLOCKED — REAL_DEVICE_REQUIRED** |
| إعادة تمكين التلاوة الحية | **BLOCKED — يتطلب أصول QCF وbinary مخصصًا واختبار جهاز** |

**النتيجة:** لا يبدأ Build 6 ولا النشر كخطوة تالية لهذا التدقيق. يجب أولًا معالجة عناصر FAIL الخاصة بالوسائط والشهادات، ثم تنفيذ قائمة REAL_DEVICE_REQUIRED وتسجيل نتائجها. لا ينبغي اعتبار Expo Web أو iOS export دليلًا على صلاحية التطبيق Native في المتجر.

---

# ملحق إصلاح حواجز ما قبل Build 6 — 13 سبتمبر 2026

## النطاق المنفذ

تم إصلاح المجموعات الخمس المحددة فقط، بدون تعديل Web أو Backend أو بروتوكول الإشارة، وبدون استعادة QCF أو إعادة تفعيل التلاوة الحية:

1. تشغيل تسجيلات المعلم الخاصة.
2. وسائط مراجعة المشرف الخاصة.
3. فتح شهادات KYC والقِراءات المحمية.
4. سباق إعادة اتصال WebRTC للطالب والمعلم والمشرف.
5. callbacks المتأخرة بعد teardown في مكونات WebRTC الثلاثة.

## نتيجة كل GAP مستهدف

| GAP | الحالة بعد الإصلاح | الدليل |
|---|---|---|
| GAP-01 — تسجيلات المعلم الخاصة | **RESOLVED** | يستخدم `LibraryMediaPlayer` الآن resolver الوسائط المصرح به، ويعرض loading/unavailable/error/retry بدل لاعب فارغ. |
| GAP-02 — وسائط مراجعة المشرف الخاصة | **RESOLVED** | كل مصدر وسائط يمر عبر resolver موحد مع token عند الحاجة؛ لا يمر object key خام إلى `VideoView`، وحالة التحميل تعتمد على `expo-video` status. |
| GAP-03 — شهادات KYC والقِراءات المحمية | **RESOLVED** | فتح الشهادات يميّز الرابط العام من المسار الخاص، ويستخدم resolver المصرح به ثم `canOpenURL` وcatch ورسالة عربية وإعادة محاولة. |
| GAP-04 — سباق WebRTC reconnect | **CODE_RESOLVED_REAL_DEVICE_REQUIRED** | مكونات الطالب والمعلم والمشرف تستخدم الآن generation guard، وtimer واحدًا فقط، وتغلق المقبس السابق قبل البديل. |
| GAP-11 — callbacks بعد WebRTC teardown | **CODE_RESOLVED_REAL_DEVICE_REQUIRED** | teardown يبطل الجيل الحالي، يمسح timers، يفصل handlers، يغلق peer/socket، ويوقف local tracks للطالب والمعلم. |

## بوابات الكود المستهدفة

**TEACHER_PRIVATE_RECORDINGS_CODE_GATE:**
PASS

**ADMIN_PRIVATE_REVIEW_MEDIA_CODE_GATE:**
PASS

**ADMIN_PROTECTED_CERTIFICATES_CODE_GATE:**
PASS

**WEBRTC_RECONNECT_CODE_GATE:**
PASS

**WEBRTC_TEARDOWN_CODE_GATE:**
PASS

## تفاصيل التنفيذ

### الوسائط والملفات الخاصة

- `artifacts/mobile/components/library-media-player.tsx`
  - يحل المصدر النسبي أو مسار object الخاص عبر `resolveLibraryAsset`.
  - يقبل الرابط العام المطلق كما هو.
  - لا ينشئ player عندما لا يوجد مصدر صالح.
  - يعرض حالة عربية لـloading وunavailable وerror، مع retry يعيد إنشاء player.
  - يعتمد loading على `expo-video` status، وليس على `duration`.

- `artifacts/mobile/app/teacher/recordings.tsx`
  - أزيل إنشاء player محلي مختلف لصالح اللاعب المشترك والعقد المصرح به.
  - التسجيل المفقود أو غير الصالح يعرض حالة غير متاح بدل مشغل فارغ.

- `artifacts/mobile/app/admin/_common.tsx`
  - وسائط placement/KYC/promotion تمر إلى اللاعب المشترك مع token الحالي.
  - الشهادات الخاصة تمر إلى resolver المصرح به.
  - `Linking.canOpenURL` وcatch يحولان الفشل إلى رسالة عربية وزر «إعادة فتح الشهادة».

### WebRTC

ينطبق النمط نفسه على:

- `artifacts/mobile/components/student-session-call.native.tsx`
- `artifacts/mobile/components/teacher-session-call.native.tsx`
- `artifacts/mobile/components/admin-session-monitor.native.tsx`

التغييرات:

- جيل اتصال (`generation`) لكل effect؛ كل callback للمقبس وpeer يتحقق أنه الجيل الحالي.
- لا يوجد أكثر من reconnect timer واحد؛ أي timer قائم يمسح قبل جدولة بديل.
- إغلاق وفصل handlers للمقبس السابق قبل إنشاء مقبس بديل.
- إغلاق وفصل handlers للـRTCPeerConnection قبل استبداله أو teardown.
- تحديثات reconnect/state تخص الجيل الحالي فقط.
- teardown يبطل الجيل ويمسح timer وremote state.
- الطالب والمعلم يوقفان local camera/microphone tracks عند leave وunmount؛ المشرف بقي receive-only ولا ينشئ local media.

## التحقق المنفذ بعد الإصلاح

| الفحص | النتيجة |
|---|---|
| `pnpm --dir artifacts/mobile run typecheck` | PASS |
| `CI=1 pnpm exec expo install --check` | PASS |
| Expo config | PASS — version `1.0.0`، iOS `app.replit.tbyan`/build `6`، Android `com.tabyan.app` |
| Expo Web export | PASS |
| Expo iOS Metro export | PASS |
| `git diff --check` | PASS |

لم يتم اعتبار تشغيل فيديو خاص أو شهادة خاصة أو WebRTC أو الكاميرا أو الميكروفون **PASS على جهاز حقيقي**. هذه العناصر لا تزال REAL_DEVICE_REQUIRED.

## القرار المحدث لـBuild 6

تمت إزالة حواجز الكود الخمسة المحددة قبل Build 6. لا تزال بقية GAPs غير المستهدفة في هذا التقرير مصنفة كما كانت، ولم تُعدّل ضمن هذا العمل.

| البند | الحالة |
|---|---|
| P0_REMAINING | 0 |
| PRE_BUILD_WEBRTC_CODE_BLOCKERS_REMAINING | 0 |
| REAL_DEVICE_REQUIRED_AFTER_FIX | YES |
| CURRENT_APP_INTEGRITY_GATE | CODE_PASS_REAL_DEVICE_REQUIRED |
| READY_TO_CREATE_BUILD_6_FOR_TESTFLIGHT_TESTING | YES |
| READY_TO_SUBMIT_APP_REVIEW | NO |
| BUILD_STARTED | NO |

## الملفات المعدلة في ملحق الإصلاح

- `artifacts/mobile/components/library-media-player.tsx`
- `artifacts/mobile/app/teacher/recordings.tsx`
- `artifacts/mobile/app/admin/_common.tsx`
- `artifacts/mobile/components/student-session-call.native.tsx`
- `artifacts/mobile/components/teacher-session-call.native.tsx`
- `artifacts/mobile/components/admin-session-monitor.native.tsx`
- `docs/TABYAN_MOBILE_FULL_INTEGRITY_AND_CRASH_REPORT.md`

**BACKEND_CHANGED:** NO