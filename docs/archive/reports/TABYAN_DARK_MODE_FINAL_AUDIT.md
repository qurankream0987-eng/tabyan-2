# TABYAN DARK MODE — FINAL AUDIT
**التاريخ:** 2026-08-16 · **النطاق:** تطبيق تبيان كاملاً (172 ملف tsx) · **مستثنى:** Mushaf Renderer + ألوان PrayerTimes/واجهة المصحف (مهمة منفصلة #55)

---

## 1. السبب الجذري (أهم اكتشاف)

ألوان العلامة (`burgundy`, `gold`, `night`, `maroon`, `cream`…) **لم تكن مسجّلة في `@theme`** — كانت فئات يدوية في `@layer utilities` فقط. لذلك كانت كل الفئات المركّبة **ميتة لا تُولَّد إطلاقاً**:
- كل variants: `dark:bg-gold`، `dark:text-gold`، `dark:text-night`، `dark:bg-night-surface`…
- كل الشفافيات: `bg-burgundy/10`، `bg-gold/20`، `border-gold/25`، `text-gold/70`…
- كل التدرجات: `from-burgundy`، `to-gold`…

تم التحقق تجريبياً من CSS المبني: 0 occurrences لهذه الفئات قبل الإصلاح، والآن تُولَّد جميعها (+29KB CSS حي).

**أمثلة على الكسر الذي سبّبه ذلك:**
- `bg-burgundy text-white dark:bg-gold dark:text-night` (التبويبات المحددة) ليلاً → خمري داكن + أبيض بدل الذهبي المقصود.
- `dark:bg-night-surface` ميتة → حقول OTP وAdminGateModal **بيضاء فاقعة في الوضع الليلي**.
- `from-burgundy to-burgundy-light` ميتة → الأفاتار الدائري `CircularUserCard` بلا خلفية إطلاقاً (نص أبيض على بطاقة فاتحة نهاراً).
- كل `bg-burgundy/10` للشرائح → بلا خلفية في الوضعين.

## 2. الإصلاح من المصدر — `src/index.css`

1. **تسجيل ألوان العلامة في `@theme inline`**: burgundy, burgundy-light, maroon, maroon-deep, gold, gold-light, gold-dark, gold-soft, cream, night, night-surface, success, success-foreground — كلها `var()` تشير لمتغيرات طبقة العلامة (مصدر حقيقة واحد، بلا ألوان جديدة).
2. **متغيرات قلب ليلي جديدة**: `--burgundy-bg` (#800020→#47101F)، `--burgundy-text` (#800020→#D4AF37)، `--burgundy-border` (#800020→rgba(212,175,55,0.26))، `--gold-dark-text` (#B8962A→#E8C85A)، `--night-surface` (#FFFFFF→#3A1017).
3. **تحويل الفئات اليدوية إلى var-driven** وحذف overrides القديمة (`.dark .bg-burgundy` كانت unlayered وتسحق `dark:bg-gold` المولّدة — كانت ستمنع إصلاح التبويبات حتى بعد التسجيل).

النتيجة: مئات الفئات الميتة عادت للحياة بمعناها المقصود، والـLight Mode محفوظ بنفس القيم حرفياً.

## 3. المكوّنات المشتركة المُصلحة

| المكوّن | المشكلة | الإصلاح |
|---|---|---|
| `SessionRoomLayout` | بلا خلفية — نص أبيض #FAF9F6 على خلفية كريمية نهاراً | `bg-night` دائماً (غرفة داكنة بالتصميم) |
| `StudentSessionRoom` | حالتا التحميل/الخطأ `bg-background` + نص أبيض | `bg-night` |
| `StudentBottomNav` | style مضمّن يسحق `dark:bg-gold`؛ أيقونة/نص ذهبي على حبيبة ذهبية = غير مرئي | حبيبة `bg-burgundy/10 dark:bg-gold` + محتوى `dark:text-night`؛ النقطة `dark:bg-night` |
| `AppHeader` | قائمة الدخول `dark:bg-[#3A1017]/97` hex جامد | `dark:bg-night-surface/97` (token) |
| `StatusBadge` | شارة «مكتملة» `dark:text-burgundy-light` (#A02040) تباين شبه معدوم ليلاً | `dark:bg-gold/15 dark:text-gold` |

## 4. إصلاحات الصفحات

- **18 عنواناً متدرجاً مضمّناً** (`style={{ background: "linear-gradient…", WebkitBackgroundClip: "text" }}` — الخمري معدوم الرؤية ليلاً) → class `.hero-greeting` الموجود: AdminHome, AdminUsers, Notifications, not-found, FatwaAsk, StudentProgress, StudentSchedule, StudentRecordings (×2), StudentIjazat, Library, Booking, StudentAccount, StudentHome, MyStudents, TeacherBroadcast, PendingEvaluations, TeacherSchedule, TeacherHome.
- **شرائح خضراء بلا dark:** AdminUsers, AdminAssessments (×3), StudentAccount, TeacherRecordings → `dark:bg-green-900/40 dark:text-green-300`.
- **أيقونات خضراء عارية:** ShariaExam, StudentProfile, TeacherOnboarding → `dark:text-green-400`.
- **نصوص خطأ حمراء:** StudentAuthModal, TeacherRegisterFlow, StudentRegisterFlow, AdminGateModal → `text-destructive` (يتقلب تلقائياً)؛ AdminAccounts → `dark:text-red-400`.
- **hex جامدة:** AdminUsers `dark:bg-[#2C1020]` ×2 → `dark:bg-card`؛ GuestHome `dark:bg-[#230D16]` ×4 → `dark:bg-popover`؛ `dark:text-[#2B0D12]` ×9 (StudentIjazat, ShariaLevel, Levels) → `dark:text-night`.

## 5. التحقق

- ✅ `tsc --noEmit` بلا أخطاء · ✅ `vite build` ناجح
- ✅ لقطات فاتح/داكن (mobile 390px + desktop 1440px): GuestHome، StudentHome، TeacherHome، AdminHome، AdminUsers، StudentSchedule، Library — كلها مقروءة، بلا بطاقات بيضاء أو نص غير مرئي، والوضع الفاتح محفوظ
- ✅ Console نظيف (خطأ 401 واحد في جدول الطالب سببه أن توكن demo لا تمرّ على API الحقيقي — سلوك سابق للإصلاح)
- ℹ️ كان هناك استخدام ميت لـ `text-success`/`bg-success/10` (ScoreSlider, MyStudents) — أُصلح تلقائياً بتسجيل `--color-success` الذي يتقلب ليلاً (#38A169→#68D391)

## 6. متروك عن قصد (خارج النطاق)

- صفحات `MushafFahd`/`PrayerTimes`/`Qibla` وكل classes `mushaf-*` — مهمة #55.
- `bg-white` المتبقية كلها مقصودة: iframe الـPDF في ShariaViewer (ورق)، أيقونات/حدود على كاميرا VideoRecorder الداكنة دائماً، نقطة داخل RecordingBanner الأحمر.
- تدرجات hero الخمرية (StudentHome/ShariaViewer/ShariaSubjects) — أسطح داكنة بنص أبيض، تعمل في الوضعين كما صُممت.

## 7. قاعدة مستدامة للمستقبل

أي لون علامة جديد يجب تسجيله في `@theme inline` (وليس كفئة يدوية فقط) وإلا كانت كل variants/شفافياته ميتة بصمت. الفئات اليدوية المتبقية (`.btn-primary-bubble`، `.glass`…) مركّبة ومقصودة.
