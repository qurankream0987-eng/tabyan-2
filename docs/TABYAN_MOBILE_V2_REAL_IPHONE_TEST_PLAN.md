# خطة اختبار iPhone حقيقي — Tabyan Mobile V2

## قواعد الاختبار

- استخدم Build 6 الحالي فقط: `app.replit.tbyan`, version `1.0.0`.
- استخدم حسابات Development/Test فقط؛ لا تستخدم حسابات إنتاج أو بيانات مستخدمين حقيقيين.
- سجّل لكل بند: PASS أو FAIL أو BLOCKED، إصدار الجهاز وiOS، وقت الاختبار، ولقطة/سجل الخطأ عند الفشل.
- لا تعتبر المعاينة Web أو Expo export دليلًا على نجاح camera، microphone، location، SecureStore، QCF fonts أو Realtime.
- قبل كل إعادة محاولة ابدأ من حالة واضحة: fresh install أو cold launch أو logout حسب البند.

## مصفوفة الجهاز

- الجهاز: ____________________
- iOS: ____________________
- Build: `1.0.0 (6)`
- شبكة الاختبار: Wi-Fi / Cellular / Offline
- حساب الطالب: ____________________
- حساب المعلم: ____________________
- حساب المشرف: ____________________
- تاريخ الاختبار: ____________________

## A — التثبيت والإقلاع

- [ ] Fresh install من IPA/TestFlight، دون crash أو شاشة بيضاء.
- [ ] Cold launch بعد إغلاق التطبيق بالكامل.
- [ ] Splash يظهر ثم يختفي بعد تحميل الخطوط.
- [ ] لا يوجد crash عند رفض أو تأخير استعادة الجلسة.
- [ ] العودة من background لا تعيد ضبط المسار أو الجلسة.
- [ ] portrait هو الاتجاه المتوقع؛ اختبار landscape لا يكسر المحتوى.

## B — الهوية والحساب

- [ ] Login بالهاتف أو البريد وكلمة المرور.
- [ ] رسالة خطأ واضحة عند بيانات خاطئة.
- [ ] Logout يرجع إلى Login ويمسح session token.
- [ ] إغلاق وفتح التطبيق يعيد الجلسة عند تفعيل تذكر الجهاز.
- [ ] انتهاء/إلغاء الجلسة يرجع إلى Login بدل loading لا نهائي.
- [ ] Dark/Light يطبّق على Login والجذر وكل الشاشات.

## C — Safe Area وKeyboard وSystem UI

- [ ] لا يتداخل Header مع notch أو Dynamic Island.
- [ ] لا يتداخل StatusBar مع العنوان أو زر الرجوع.
- [ ] bottom tabs لا تتداخل مع Home Indicator.
- [ ] التمرير يصل إلى آخر عنصر فوق Home Indicator.
- [ ] فتح لوحة المفاتيح في Login لا يغطي الحقل أو زر الدخول.
- [ ] إغلاق لوحة المفاتيح يعيد التخطيط دون قفز أو قص.
- [ ] الأزرار والـCards والمحتوى في modal/Stack لا تخرج من safe area.
- [ ] النص العربي والخطوط لا يتغيران بعد cold launch.

## D — مسارات الطالب الأساسية

- [ ] Home يعرض الإحصاءات والجلسات والحالة الصحيحة.
- [ ] Tracks وLevels تعرض ما يسمح به الحساب فقط.
- [ ] Schedule وBooking يعرضان حالات التحميل والخطأ الحقيقية.
- [ ] Recordings وLibrary وFatwa وNotifications تعمل أو تعرض Empty/Error صريحًا.
- [ ] Account وSettings وطلب حذف الحساب لا يسببان crash.
- [ ] Help يفتح المحتوى والأسئلة الشائعة.

## E — الكاميرا وPlacement

- [ ] أول فتح يطلب Camera وMicrophone برسالة تبيان.
- [ ] السماح يعرض المعاينة الأمامية.
- [ ] الرفض يعرض حالة denied وتعليمات إعدادات الجهاز.
- [ ] بدء التسجيل ثم إيقافه يدويًا.
- [ ] التسجيل حتى الحد الأقصى 120 ثانية يتوقف دون crash.
- [ ] المعاينة تعمل مع native controls.
- [ ] إعادة التسجيل تحذف الحالة المحلية من الواجهة.
- [ ] الرفع يعرض التقدم والحجم/المدة ولا يعلن نجاحًا قبل الخادم.
- [ ] فشل الشبكة أثناء PUT يعرض Retry دون fake success.
- [ ] finalize ينجح فقط بعد التحقق من بنية الفيديو.
- [ ] `student.submitPlacement` يحفظ `/objects/<key>` فقط.
- [ ] بعد الإرسال يظهر pending/review state ولا يسمح بإرسال مزدوج.

## F — المصحف وQCF2

اختبر الصفحات: 1، 2، 27، 187، 300، 604.

- [ ] كل صفحة تحمل البيانات الصحيحة ولا تعرض صفحة فارغة كنجاح.
- [ ] السور والعناوين والبسملة وعلامات الآيات صحيحة.
- [ ] التنقل السابق/التالي يحترم 1 و604.
- [ ] RTL swipe يتجه بالمعنى المتوقع.
- [ ] pinch zoom وpan لا يكسران الصفحة.
- [ ] bookmark يثبت بعد إغلاق المصحف.
- [ ] last page يعود بعد cold launch.
- [ ] QCF2 per-page font يطابق المرجع البصري على الجهاز.
- [ ] لا يحدث clipping أو اختلاف baseline بين الصفحات الذهبية.

## G — التلاوة وRealtime

- [ ] طلب Microphone مستقل/صحيح حسب تدفق التلاوة.
- [ ] بدء/إيقاف microphone lifecycle دون تسريب أو تسجيل بعد مغادرة الشاشة.
- [ ] PCM sample rate/format مطابق لعقد الخادم.
- [ ] WebSocket auth يرفض token غير صالح.
- [ ] reconnect بعد انقطاع الشبكة.
- [ ] partial transcript يظهر دون قفزات غير صحيحة.
- [ ] final transcript يثبت النتيجة.
- [ ] Quran matcher يطابق الكلمات canonical.
- [ ] reveal لا يعرض كلمة قبل الدليل المطلوب.
- [ ] GENERAL وEDUCATIONAL يطبّقان عقدهما المختلف.

## H — الموقع والقبلة والتنبيهات

- [ ] طلب Location يظهر برسالة الاستخدام الصحيحة.
- [ ] الرفض يعرض حالة واضحة ولا يظل في loading.
- [ ] Prayer times تعمل عند السماح.
- [ ] Qibla تعرض النتيجة/الحدود المتوقعة.
- [ ] لا توجد permission حساسة غير مستخدمة.
- [ ] Notifications: إن لم تكن مفعلة بمزود/توكن حقيقي، سجّل BLOCKED ولا تحاكي وصول Push.

## I — أدوار الحساب

### Student

- [ ] Login، session restore، home، role routing، core actions، logout.
- [ ] 401، 403، expired session، offline، API 500.
- [ ] لا يظهر أي رابط أو إجراء خاص بالمعلم/المشرف.

### Teacher

- [ ] Login، session restore، onboarding/KYC، home، schedule، session، evaluation، logout.
- [ ] 401، 403، expired session، offline، API 500.
- [ ] لا يستطيع الوصول إلى مسارات المشرف.

### Supervisor/Admin

- [ ] Login، session restore، admin home، users، reviews، schedules، audit log، logout.
- [ ] 401، 403، expired session، offline، API 500.
- [ ] لا يتسرب إجراء إداري إلى الطالب أو المعلم.

## J — فشل الشبكة والتخزين

- [ ] no internet قبل الطلب.
- [ ] timeout أثناء query/mutation.
- [ ] API 500.
- [ ] HTTP 401.
- [ ] HTTP 403.
- [ ] WebSocket unavailable.
- [ ] storage upload failure.
- [ ] كل حالة تعرض رسالة truthful وزر Retry عند الإمكان.
- [ ] لا يوجد نجاح وهمي أو infinite loading أو crash.

## دليل الإغلاق

لا ينتقل التطبيق إلى EAS/TestFlight قبل إرفاق نتائج البنود E وF وG على جهاز iPhone فعلي، وإغلاق أي FAIL في مصفوفة الأدوار وفشل الشبكة. البنود غير القابلة للاختبار دون backend/provider حقيقي تسجل BLOCKED بدل PASS.