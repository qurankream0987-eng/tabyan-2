---
name: tabyan student registration flow
description: Student sign-up wizard — phone OTP removed from registration (2026-08-13); checkPhone routes login vs register; optional verified email last step; biometric opt-in only.
---

- تدفق تسجيل الطالب: اسم ثلاثي → ميلاد → هاتف → مدرسة → (مرحلة → صف) → كلمة سر → بريد اختياري. لا توجد خطوة رمز هاتف أو بريد؛ `completeProfile` يتطلب كلمة المرور ويحفظ البريد الاختياري مباشرة.
- تدفق تسجيل المعلم: اسم → هاتف → كلمة مرور وتأكيدها → `completeProfile`. التسجيل والدخول لا يعتمدان على SMS أو Email OTP.
- جداول `otp_codes` و`email_otp_codes` بقيت legacy في المخطط فقط؛ لا توجد إجراءات أو كتابة تشغيلية لها. إسقاطها يحتاج migration منفصلة وموافقة صريحة.
- البصمة (WebAuthn) أصبحت **خطوة داخل تسجيل الطالب** (step="biometric" خارج baseFlow): بعد نجاح completeProfile يُخزَّن authStore أولاً (تسجيل Passkey mutation محمي يحتاج جلسة)، ثم تظهر الخطوة فقط إن isBiometricAvailable — وجه أو إصبع حسب مصادق الجهاز، مع زر «لاحقاً». إغلاق النافذة في هذه الخطوة = تخطٍّ وانتقال للوحة (الحساب منشأ أصلاً). الخادم يخزن public key/counter فقط — لا بيانات بيومترية خام. التفعيل اليدوي من صفحة الحساب ما زال متاحاً.
- سؤال تحفة الأطفال في اختبار القبول يظهر فقط عند الدخول من بطاقة مستوى محدد (?levelId= من Levels.tsx) ضمن أول 4 مستويات؛ الدخول العام بلا levelId يرسل الاختبار عادياً بلا سؤال ولا تعطيل (حُذف منتقي المستوى من Placement.tsx بطلب المستخدم).
- شعار بوابة المشرف (AdminGateModal) يتبع الثيم بنمط الصورتين logo-light dark:hidden / hidden dark:block logo-dark على /logo.png — مثل AdminShell.
- شاشة الترحيب (Splash) صارت حساب-الحالة: `authStore.set()` عند أي دخول/تسجيل حقيقي (غير demo) يثبّت `tabyan.knownAccount` + `tabyan.splashSeen` وهما **لا يُمسحان في clear()** — بعد Logout لا ترحيب بل توجيه إلى `/?auth=login` الذي يفتح نافذة الدخول (StudentRegisterFlow عبر checkPhone) مباشرة في GuestHome. السبلاش يظهر فقط للزائر الجديد كلياً (لا token ولا knownAccount ولا splashSeen).
- الطلاب والمعلمون يملكون passwordHash إلزامياً عند التسجيل، والدخول بكلمة المرور متاح للطالب عبر الهاتف/البريد وللمعلم عبر اسم المستخدم أو الهاتف/البريد؛ المشرف عبر اسم المستخدم.
  - **Why:** قرار المنتج النهائي هو إزالة Phone OTP وEmail OTP من كل التدفقات التشغيلية، مع إبقاء Passkey/Biometric خياراً إضافياً فقط.
  - **How to apply:** حافظ على bcrypt، قواعد كلمة المرور، رسائل الفشل العامة، وحدود المحاولات؛ الحسابات القديمة بلا `passwordHash` تُحجب حتى تعيين يدوي آمن، ولا تُعاد أي مسارات رموز تحقق.
