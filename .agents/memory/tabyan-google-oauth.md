---
name: Tabyan Google OAuth architecture
description: student-only Google sign-in/linking — server-verified ID tokens + HMAC single-use tickets, no silent login, atomic consume-in-transaction pattern
---

# Google OAuth في تبيان (2026-08-13)

القواعد الدائمة لهذه الميزة:

- **طلاب فقط**: googleLogin/completeProfile يرفضان أي حساب role≠student؛ المعلم/الأدمن لا يمرّان عبر Google إطلاقاً.
- **لا دخول صامت ولا إنشاء صامت**: `googleLogin` يصنّف فقط (existing/new) ويعيد تذكرة HMAC-SHA256 (SESSION_SECRET، 15 دقيقة، تحمل jti عشوائياً). الدخول الفعلي عبر `googleLoginConfirm` بعد ضغط المستخدم «تسجيل الدخول»، والإنشاء عبر `completeProfile` مع `googleTicket`.
- **التذاكر أحادية الاستعمال**: `consumeGoogleTicket(tx, jti)` تعمل **داخل معاملة المستدعي** مع advisory_xact_lock — وكل كتابات التسجيل (استهلاك jti + استهلاك إثبات البريد + users/students + auth_tokens) في معاملة واحدة حتى يلغي rollback الاستهلاك عند أي فشل عابر (فشل بريد/إدراج لا يحرق التذكرة).
- **الربط**: بـgoogle_id أولاً، ثم بالبريد الموثّق فقط (email_verified=true في توكن Google وحسابنا) عبر UPDATE مشروط `googleId IS NULL` ضد السباق؛ سباق الإدراج يُعيَّن من 23505/users_google_id_unique إلى CONFLICT + حدث google_account_conflict.
- **لا ثقة بالعميل**: التحقق من ID Token خادمي كامل عبر google-auth-library (توقيع/aud/exp/iss). GOOGLE_CLIENT_ID (خادم) يجب أن يطابق VITE_GOOGLE_CLIENT_ID (واجهة). العمود users.google_id varchar(255) unique nullable — الترحيل المتتبع في lib/db/migrations/0001_users_google_id.sql (idempotent).

**Why:** مراجعة معمارية ثلاثية الجولات رفضت replay للتذاكر والاستهلاك غير الذرّي مع الإنشاء؛ النمط النهائي (consume-in-transaction) هو الشرط الذي نال الموافقة.

**How to apply:** أي تعديل على تدفقات Google يجب أن يحافظ على: التحقق الخادمي الكامل، أحادية استعمال jti، الذرّية الكاملة للمعاملة، وعدم المساس بمسارات المعلم/الأدمن/البصمة/OTP.
