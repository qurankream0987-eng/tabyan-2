import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import Icon from "./Icon";
import PhoneField from "./PhoneField";
import { authStore } from "@/lib/auth";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { COUNTRIES, toE164, validatePhoneNumber } from "@/lib/countries";
import { biometricLogin, enableBiometric, hasBiometricSession, isBiometricAvailable } from "@/lib/webauthn";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "@/lib/google";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";

// login: دخول للمستخدم المسجّل بكلمة السر — email: خطوة اختيارية أخيرة
// biometric: خطوة إعداد البصمة بعد إنشاء الحساب مباشرة (خارج baseFlow لأنها تتطلب جلسة)
type Step = "name" | "birthdate" | "phone" | "login" | "school" | "level" | "grade" | "password" | "email" | "biometric";
type SchoolStage = "primary" | "middle" | "high";

const GRADES: Record<SchoolStage, string[]> = {
  primary: ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس"],
  middle: ["الصف السادس", "الصف السابع", "الصف الثامن", "الصف التاسع"],
  high: ["الصف العاشر", "الصف الحادي عشر", "الصف الثاني عشر"],
};
const STAGE_LABEL: Record<SchoolStage, string> = { primary: "الابتدائية", middle: "المتوسطة", high: "الثانوية" };
const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function baseFlow(inSchool: boolean | null): Step[] {
  // لا تحقق هاتف أو بريد في التسجيل — البريد الاختياري هو الخطوة الأخيرة دائماً
  const base: Step[] = ["name", "birthdate", "phone", "school"];
  return inSchool ? [...base, "level", "grade", "password", "email"] : [...base, "password", "email"];
}

function calcAge(birthDate: string): number | null {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const inputCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-card px-4 py-3 font-readex text-lg outline-none focus:border-burgundy dark:focus:border-gold transition text-center";
const selectCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-card px-2 py-3 font-readex text-base outline-none focus:border-burgundy dark:focus:border-gold transition text-center";

function StepHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center mb-6">
      <h2 className="font-amiri text-2xl text-burgundy font-bold">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground font-readex mt-1">{sub}</p>}
    </div>
  );
}

function ErrorText({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-destructive text-sm font-readex text-center mt-2">{msg}</p>;
}

function OptionCard({ selected, onClick, title, sub }: { selected: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-right transition-all btn-press ${
        selected
          ? "border-burgundy bg-burgundy/8 dark:border-gold dark:bg-gold/10"
          : "border-input bg-white dark:bg-card hover:border-burgundy/40 dark:hover:border-gold/40"
      }`}
    >
      <div>
        <p className="font-readex font-bold text-sm text-foreground">{title}</p>
        {sub && <p className="font-readex text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected ? "bg-burgundy border-burgundy dark:bg-gold dark:border-gold text-white dark:text-night" : "border-border"
        }`}
      >
        {selected && <Icon name="check" size={13} />}
      </span>
    </button>
  );
}

function GradePill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 px-3 py-3 text-center font-readex font-bold text-sm transition-all btn-press ${
        selected
          ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night"
          : "border-input bg-white dark:bg-card text-foreground hover:border-burgundy/40 dark:hover:border-gold/40"
      } ${label === "الصف الخامس" ? "flex items-center justify-center" : ""}`}
    >
      {label}
    </button>
  );
}

/** Progress bar shared visual language with the placement-test step wizard. */
function ProgressBar({ index, total }: { index: number; total: number }) {
  const pct = Math.round((index / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="font-readex text-xs font-bold text-muted-foreground">
          الخطوة {index + 1} من {total}
        </span>
        <span className="font-readex text-xs font-bold text-gold-dark dark:text-gold" dir="ltr">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-burgundy/10 dark:bg-gold/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-l from-burgundy to-gold transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentRegisterFlow({
  open,
  onClose,
  startMode = "register",
}: {
  open: boolean;
  onClose: () => void;
  startMode?: "register" | "login";
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(startMode === "login" ? "login" : "name");
  const [fullName, setFullName] = useState("");
  const [dobY, setDobY] = useState("");
  const [dobM, setDobM] = useState("");
  const [dobD, setDobD] = useState("");
  const [dial, setDial] = useState("965");
  const [phone, setPhone] = useState(""); // الرقم الوطني بدون رمز الدولة
  const [phoneHasInvalidCharacters, setPhoneHasInvalidCharacters] = useState(false);
  const [gps, setGps] = useState<{ lat: string; lng: string } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [inSchool, setInSchool] = useState<boolean | null>(null);
  const [stage, setStage] = useState<SchoolStage | null>(null);
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [bioReady, setBioReady] = useState(false);
  const [err, setErr] = useState("");
  // البريد الإلكتروني — خطوة اختيارية أخيرة
  const [email, setEmail] = useState("");
  // Google — حالات موقّعة خادمياً فقط (HMAC)؛ لا يُخزَّن أي حقل Google من العميل كدليل
  const [googleTicket, setGoogleTicket] = useState<string | null>(null);        // حالة B: تسجيل جديد
  const [googleLoginTicket, setGoogleLoginTicket] = useState<string | null>(null); // حالة A: حساب موجود — بانتظار تأكيد المستخدم
  const [googleBusy, setGoogleBusy] = useState(false);
  // خطوة البصمة بعد إنشاء الحساب — تحتاج الاسم لاستخدامه في الترحيب بعد التفعيل أو التخطي
  const [bioBusy, setBioBusy] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const completeProfile = trpc.auth.completeProfile.useMutation();
  const checkPhone = trpc.auth.checkPhone.useMutation();
  const studentPasswordLogin = trpc.auth.studentPasswordLogin.useMutation();
  const passwordLogin = trpc.auth.passwordLogin.useMutation();
  const googleLogin = trpc.auth.googleLogin.useMutation();
  const googleCompleteLogin = trpc.auth.googleCompleteLogin.useMutation();

  const busy = studentPasswordLogin.isPending || passwordLogin.isPending || completeProfile.isPending
    || checkPhone.isPending
    || googleLogin.isPending || googleCompleteLogin.isPending;
  const birthDate = dobY && dobM && dobD ? `${dobY}-${dobM.padStart(2, "0")}-${dobD.padStart(2, "0")}` : "";
  const e164Phone = toE164(dial, phone);

  useEffect(() => {
    if (!open) {
      // إعادة الضبط الكاملة عند إغلاق النافذة كي تبدأ محاولة تالية من جديد
      setStep("name"); setFullName(""); setDobY(""); setDobM(""); setDobD("");
      setDial("965"); setPhone(""); setPhoneHasInvalidCharacters(false); setGps(null);
       setInSchool(null); setStage(null); setGrade(""); setErr("");
       setLoginIdentifier(""); setLoginPassword("");
       setEmail("");
      setGoogleTicket(null); setGoogleLoginTicket(null); setGoogleBusy(false);
      setPassword(""); setPassword2(""); setShowPw(false); setShowPw2(false); setRememberMe(true);
      setBioBusy(false);
      // زر الدخول بالبصمة يظهر فقط إن كانت مفعّلة على هذا الجهاز والنظام يدعمها
      void isBiometricAvailable().then((ok) => setBioReady(ok && hasBiometricSession()));
     } else {
       setStep(startMode === "login" ? "login" : "name");
     }
   }, [open, startMode]);

  const flow = baseFlow(inSchool);
  const stepIdx = Math.max(0, flow.indexOf(step)); // login/biometric خارج مسار التسجيل

  const finishLogin = (token: string, role: string, name: string) => {
    authStore.set(token, role, name);
    // ممنوع تشغيل WebAuthn هنا: إنشاء الحساب/الدخول لا يفعّلان البصمة تلقائياً —
    // تفعيلها خطوة اختيارية لاحقة من صفحة الحساب، بعد اكتمال التسجيل وكلمة السر
    toast(`أهلاً ${name} 🎉`, "success");
    onClose();
    navigate(role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student/home");
  };

  /** الدخول بالبصمة — خيار إضافي فقط؛ عند فشلها يبقى الدخول بكلمة السر متاحاً */
  const signInWithBiometric = async () => {
    setErr("");
    try {
      const s = await biometricLogin();
      authStore.set(s.token, s.role, s.name);
      toast(`أهلاً ${s.name} 🎉`, "success");
      onClose();
      navigate(s.role === "teacher" ? "/teacher" : s.role === "admin" ? "/admin" : "/student/home");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الدخول بالبصمة — استخدم كلمة السر");
    }
  };

  const submitCompleteProfile = async (finalStage: SchoolStage | null, finalGrade: string) => {
    setErr("");
    try {
      const res = await completeProfile.mutateAsync({
        phone: e164Phone, fullName: fullName.trim(), birthDate,
        schoolStage: finalStage ?? undefined,
        schoolGrade: finalStage ? finalGrade : undefined,
        gpsLat: gps?.lat, gpsLng: gps?.lng,
        role: "student",
        password, confirmPassword: password2, rememberMe,
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        // حالة Google الموقّعة خادمياً — الخادم يتحقق من ختمها وانتهائها قبل أي استخدام
        googleTicket: googleTicket ?? undefined,
      });
      // الحساب أُنشئ — نخزّن الجلسة أولاً لأن تسجيل Passkey يتطلب جلسة فعالة (mutation محمي)
      authStore.set(res.token, res.role, fullName.trim());
      // الترتيب الإلزامي: كلمة السر ← تأكيدها ← إنشاء الحساب ← إعداد البصمة ← لوحة الطالب.
      // البصمة تُعرض هنا مباشرة (وجه أو إصبع حسب مصادق الجهاز) — لا تُرحَّل إلى صفحة الحساب.
      if (await isBiometricAvailable()) {
        setStep("biometric");
        return;
      }
      // جهاز بلا مصادقة حيوية — إكمال عادي بكلمة السر فقط
      toast(`أهلاً ${fullName.trim()} 🎉`, "success");
      onClose();
      navigate("/student/home");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر إكمال التسجيل — حاول مرة أخرى");
    }
  };

  /** إنهاء التسجيل بعد خطوة البصمة — سواء فعّلها الطالب أو ضغط «لاحقاً» أو أغلق النافذة */
  const finishAfterBiometric = (activated: boolean) => {
    toast(activated ? "تم تفعيل الدخول بالبصمة 🎉" : `أهلاً ${fullName.trim()} 🎉`, "success");
    onClose();
    navigate("/student/home");
  };

  /** تفعيل البصمة (وجه أو إصبع) عبر WebAuthn — اختياري؛ فشله أو إلغاؤه لا يمنع إكمال التسجيل */
  const setupBiometric = async () => {
    setErr("");
    setBioBusy(true);
    const ok = await enableBiometric();
    setBioBusy(false);
    if (ok) return finishAfterBiometric(true);
    setErr("تعذّر تفعيل البصمة — يمكنك المتابعة بكلمة السر وإعدادها لاحقاً من صفحة الحساب");
  };

  const goNext = async () => {
    setErr("");

    if (step === "name") {
      // الاسم ثلاثي على الأقل — يُفرض هنا وفي الخادم معاً
      if (fullName.trim().split(/\s+/).filter(Boolean).length < 3) {
        return setErr("الرجاء إدخال الاسم ثلاثياً على الأقل (مثال: محمد أحمد علي)");
      }
      return setStep("birthdate");
    }

    if (step === "birthdate") {
      const age = calcAge(birthDate);
      if (!birthDate || age === null || age < 4 || age > 100) return setErr("أدخل تاريخ ميلاد صحيحاً");
      return setStep("phone");
    }

    if (step === "phone") {
      const phoneError = phoneHasInvalidCharacters ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة." : validatePhoneNumber(dial, phone);
      if (phoneError) return setErr(phoneError);
      try {
        const chk = await checkPhone.mutateAsync({ phone: e164Phone });
        if (chk.registered) {
          // الرقم مسجل — ننتقل إلى دخول كلمة السر مع تعبئة الرقم.
          setLoginIdentifier(e164Phone);
          setStep("login");
        } else {
          // تسجيل جديد — لا يُرسل SMS ولا يُنتظر OTP.
          setStep("school");
        }
      } catch (e) {
        setErr(userFacingErrorMessage(e, "تعذّر التحقق من الرقم — حاول مرة أخرى"));
      }
      return;
    }

    if (step === "school") {
      if (inSchool === null) return setErr("الرجاء اختيار وضعك المدرسي");
      if (!inSchool) return setStep("password");
      return setStep("level");
    }

    if (step === "level") {
      if (!stage) return setErr("الرجاء اختيار مرحلتك الدراسية");
      return setStep("grade");
    }

    if (step === "grade") {
      if (!grade) return setErr("الرجاء اختيار صفك الدراسي");
      return setStep("password");
    }

    if (step === "password") {
      if (!isNonWhitespacePassword(password)) return setErr("أدخل كلمة المرور");
      if (password !== password2) return setErr("كلمتا السر غير متطابقتين");
      return setStep("email"); // البريد الاختياري هو الخطوة الأخيرة
    }
  };

  const goBack = () => {
    setErr("");
    if (step === "birthdate") return setStep("name");
    if (step === "phone") return setStep("birthdate");
    if (step === "level") return setStep("school");
    if (step === "grade") return setStep("level");
    if (step === "password") return setStep(inSchool ? "grade" : "school");
    if (step === "email") return setStep("password");
  };

  const submitLogin = async () => {
    setErr("");
    const identifier = loginIdentifier.trim();
    if (!identifier || !loginPassword) return setErr("أدخل رقم الهاتف أو البريد وكلمة السر");
    try {
      const isPhone = /^\+|^05/.test(identifier);
      const res = isPhone
        ? await studentPasswordLogin.mutateAsync({ identifier, password: loginPassword, rememberMe })
        : identifier.includes("@")
          ? await studentPasswordLogin.mutateAsync({ identifier, password: loginPassword, rememberMe })
          : await passwordLogin.mutateAsync({ username: identifier, password: loginPassword, rememberMe });
      finishLogin(res.token, res.role, res.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تسجيل الدخول — تحقق من بياناتك");
    }
  };

  /** رد Google بعد اختيار الحساب — التحقق كله خادمي؛ هنا نصنّف الحالة فقط */
  const onGoogleCredential = async (credential: string) => {
    setErr(""); setGoogleBusy(true);
    try {
      const res = await googleLogin.mutateAsync({ idToken: credential });
      if (res.status === "existing") {
        // حالة A: لا دخول صامت — نعرض تأكيداً صريحاً ولا ننشئ طالباً جديداً
        setGoogleLoginTicket(res.loginTicket);
        return;
      }
      // حالة B: Google وسيلة توثيق/ربط لطالب جديد — يكمل المعالج من حيث هو دون فقدان أي بيانات
      setGoogleTicket(res.registrationTicket);
      if (res.name && fullName.trim().split(/\s+/).filter(Boolean).length < 3) setFullName(res.name);
      if (res.email) setEmail(res.email);
      toast("تم التحقق من حساب Google", "success");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الاتصال بـ Google — حاول مرة أخرى");
    } finally {
      setGoogleBusy(false);
    }
  };

  /** تأكيد «تسجيل الدخول» الصريح لحساب موجود — نفس finishLogin ونفس auth_tokens */
  const confirmGoogleLogin = async () => {
    if (!googleLoginTicket) return;
    setErr(""); setGoogleBusy(true);
    try {
      const res = await googleCompleteLogin.mutateAsync({ ticket: googleLoginTicket, rememberMe });
      finishLogin(res.token, res.role, res.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تسجيل الدخول — حاول مرة أخرى");
      setGoogleLoginTicket(null);
    } finally {
      setGoogleBusy(false);
    }
  };

  // تهيئة زر Google الرسمي عند خطوة الهاتف فقط — زر واحد لا يتكرر، والنافذة المنبثقة لا تفقد state المعالج
  useEffect(() => {
    if (!open || step !== "phone" || !GOOGLE_CLIENT_ID || googleLoginTicket) return;
    let cancelled = false;
    void loadGoogleIdentity().then((api) => {
      if (cancelled || !googleBtnRef.current) return;
      api.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => { if (r.credential) void onGoogleCredential(r.credential); } });
      googleBtnRef.current.innerHTML = "";
      api.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 300, text: "continue_with", locale: "ar", shape: "pill" });
    }).catch(() => setErr("تعذّر تحميل خدمة Google — تحقق من اتصالك وحاول لاحقاً"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, googleLoginTicket]);

  /** تحديد الدولة تلقائياً من موقع المتصفح (ترميز جغرافي عكسي مجاني من طرف العميل — بلا مفتاح) */
  const detectLocation = () => {
    if (locBusy) return;
    if (!("geolocation" in navigator)) return toast("المتصفح لا يدعم تحديد الموقع — اختر الدولة يدوياً", "info");
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGps({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=ar`,
          );
          if (!r.ok) throw new Error("location lookup failed");
          const j = (await r.json()) as { countryCode?: unknown };
          const countryCode = typeof j.countryCode === "string" ? j.countryCode : "";
          const c = COUNTRIES.find((x) => x.iso === countryCode.toUpperCase());
          if (c) { setDial(c.dial); toast(`تم تحديد الدولة: ${c.name}`, "success"); }
          else toast("تعذر تحديد الدولة تلقائيًا، اختر الدولة يدويًا.", "info");
        } catch {
          toast("تعذر تحديد الدولة تلقائيًا، اختر الدولة يدويًا.", "info");
        } finally {
          setLocBusy(false);
        }
      },
      () => { setLocBusy(false); toast("تعذر تحديد الدولة تلقائيًا، اختر الدولة يدويًا.", "info"); },
      { timeout: 8000 },
    );
  };

  return (
    // في خطوة البصمة الحساب أُنشئ والجلسة مفعّلة — إغلاق النافذة يعني «لاحقاً» ثم الانتقال للوحة، لا ترك المستخدم عالقاً في صفحة الضيوف
    <Modal open={open} onClose={step === "biometric" ? () => finishAfterBiometric(false) : onClose} className="text-right">
      <div className="mb-2">
        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 hidden dark:block logo-dark" />
      </div>

      {/* خطوة البصمة خارج مسار التسجيل (حساب منشأ أصلاً) — لا يظهر لها شريط تقدم بقيمة صفرية */}
      {step !== "biometric" && step !== "login" && <ProgressBar index={Math.max(stepIdx, 0)} total={flow.length} />}

      {step === "name" && (
        <div>
          <StepHeader title="ما اسمك الكامل؟" sub="سيظهر اسمك لمعلمك وزملائك في الحلقة" />
          <input
            autoFocus dir="rtl" value={fullName}
            onChange={(e) => { setFullName(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
            placeholder="مثال: أحمد محمد"
            className={inputCls}
          />
          <ErrorText msg={err} />
          <PrimaryButton onClick={goNext} className="w-full mt-5 py-3 text-base">التالي</PrimaryButton>
        </div>
      )}

      {step === "birthdate" && (
        <div>
          <StepHeader title="متى وُلدت؟" />
          {(() => {
            const thisYear = new Date().getFullYear();
            const daysInMonth = dobY && dobM ? new Date(Number(dobY), Number(dobM), 0).getDate() : 31;
            const clampDay = (y: string, m: string, d: string) => {
              if (y && m && d && Number(d) > new Date(Number(y), Number(m), 0).getDate()) setDobD("");
            };
            return (
              <div className="grid grid-cols-3 gap-2">
                <select value={dobD} onChange={(e) => { setDobD(e.target.value); setErr(""); }} className={selectCls} aria-label="اليوم">
                  <option value="">اليوم</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={dobM}
                  onChange={(e) => { setDobM(e.target.value); clampDay(dobY, e.target.value, dobD); setErr(""); }}
                  className={selectCls} aria-label="الشهر"
                >
                  <option value="">الشهر</option>
                  {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                </select>
                <select
                  value={dobY}
                  onChange={(e) => { setDobY(e.target.value); clampDay(e.target.value, dobM, dobD); setErr(""); }}
                  className={selectCls} aria-label="السنة"
                >
                  <option value="">السنة</option>
                  {Array.from({ length: 97 }, (_, i) => thisYear - 4 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            );
          })()}
          {(() => {
            const age = calcAge(birthDate);
            if (age === null || age < 4 || age > 100) return null;
            return (
              <p className="text-center font-readex text-xs text-gold-dark dark:text-gold font-bold mt-2">
                العمر: {age} سنة{age >= 40 ? " — مسار تصحيح التلاوة متاح لك 🌟" : ""}
              </p>
            );
          })()}
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} className="flex-1 py-3 text-base">التالي</PrimaryButton>
          </div>
        </div>
      )}

      {step === "phone" && (
        <div>
          <StepHeader title="رقم جوالك" sub="اختر دولتك وسيظهر مفتاحها تلقائياً — سيُستخدم الرقم مع كلمة السر للدخول" />
          {bioReady && (
            <button
              type="button" onClick={signInWithBiometric} disabled={busy}
              className="mb-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gold/40 bg-gold/8 px-4 py-3 font-readex text-sm font-bold text-gold-dark dark:text-gold hover:bg-gold/15 transition btn-press disabled:opacity-50"
            >
              <Icon name="fingerprint" size={18} /> الدخول بالبصمة / Face ID
            </button>
          )}
          {googleLoginTicket ? (
            /* حالة A: الحساب مرتبط بطالب موجود — لا دخول صامت، تأكيد صريح أولاً */
            <div className="mb-4 rounded-xl border-2 border-gold/40 bg-gold/8 p-4 text-center">
              <p className="font-readex text-sm font-bold text-foreground mb-3">هذا الحساب مرتبط بحساب طالب موجود بالفعل.</p>
              <div className="flex gap-2">
                <button
                  type="button" onClick={() => setGoogleLoginTicket(null)}
                  className="flex-1 rounded-xl border-2 border-input py-2.5 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition"
                >
                  رجوع
                </button>
                <PrimaryButton onClick={() => void confirmGoogleLogin()} disabled={googleBusy} className="flex-1 py-2.5 text-sm">
                  {googleBusy ? "جارٍ الدخول…" : "تسجيل الدخول"}
                </PrimaryButton>
              </div>
            </div>
          ) : GOOGLE_CLIENT_ID ? (
            <div className="mb-4">
              <div ref={googleBtnRef} className={`flex justify-center min-h-[44px] ${googleBusy ? "pointer-events-none opacity-60" : ""}`} />
              {googleBusy && <p className="text-center font-readex text-xs text-muted-foreground mt-1.5">جارٍ الاتصال بـ Google...</p>}
              {googleTicket && <p className="text-center font-readex text-xs font-bold text-green-600 dark:text-green-400 mt-1.5">✓ تم التحقق من حساب Google — أكمل بياناتك</p>}
            </div>
          ) : null}
          <PhoneField
            dial={dial}
            phone={phone}
            onDialChange={(value) => { setDial(value); setErr(""); }}
            onPhoneChange={(value) => { setPhone(value); setErr(""); }}
            onInvalidCharactersChange={(invalid) => { setPhoneHasInvalidCharacters(invalid); setErr(""); }}
            onEnter={goNext}
          />
          <button
            type="button" onClick={detectLocation} disabled={locBusy}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 font-readex text-sm font-bold text-burgundy hover:underline disabled:opacity-50 transition"
          >
            <Icon name="map-pin" size={14} /> {locBusy ? "جارٍ تحديد موقعك…" : "استخدم موقعي لتحديد الدولة تلقائياً"}
          </button>
          {/* تذكرني: جلسة آمنة أطول (30 يوماً) برمز عشوائي — لا تُحفظ كلمة السر على الجهاز إطلاقاً */}
          <label className="mt-3 flex items-center justify-center gap-2 font-readex text-sm font-bold text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox" checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-burgundy dark:accent-gold"
            />
            تذكرني على هذا الجهاز
          </label>
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} disabled={busy} className="flex-1 py-3 text-base">
              {checkPhone.isPending ? "جارٍ التحقق…" : "التالي"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === "login" && (
        <div>
          <StepHeader title="تسجيل الدخول" sub="استخدم رقم الهاتف أو البريد أو اسم المستخدم مع كلمة السر" />
          <input
            autoFocus dir="ltr" value={loginIdentifier}
            onChange={(e) => { setLoginIdentifier(e.target.value); setErr(""); }}
            placeholder="الهاتف أو البريد أو اسم المستخدم"
            className={inputCls}
            autoComplete="username"
          />
          <input
            type="password" dir="ltr" value={loginPassword}
            onChange={(e) => { setLoginPassword(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && void submitLogin()}
            placeholder="كلمة السر"
            className={`${inputCls} mt-3`}
            autoComplete="current-password"
          />
          <label className="mt-3 flex items-center justify-center gap-2 font-readex text-sm font-bold text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 accent-burgundy dark:accent-gold" />
            تذكرني على هذا الجهاز
          </label>
          <ErrorText msg={err} />
          <PrimaryButton onClick={() => void submitLogin()} disabled={busy} className="w-full mt-5 py-3 text-base">
            {busy ? "جارٍ الدخول…" : "تسجيل الدخول"}
          </PrimaryButton>
          <button onClick={() => { setLoginIdentifier(""); setLoginPassword(""); setStep("phone"); }} className="w-full mt-3 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
            إنشاء حساب جديد
          </button>
        </div>
      )}

      {step === "school" && (
        <div>
          <StepHeader title="هل أنت طالب في المدرسة؟" sub="اختر ما ينطبق على وضعك الحالي" />
          <div className="space-y-3">
            <OptionCard selected={inSchool === true} onClick={() => setInSchool(true)} title="نعم" sub="أنا مقيّد في مدرسة" />
            <OptionCard selected={inSchool === false} onClick={() => setInSchool(false)} title="لا" sub="خريج أو خارج المدرسة" />
          </div>
          <ErrorText msg={err} />
          <PrimaryButton onClick={goNext} disabled={busy} className="w-full mt-5 py-3 text-base">
            {completeProfile.isPending ? "جارٍ التسجيل…" : "التالي"}
          </PrimaryButton>
        </div>
      )}

      {step === "level" && (
        <div>
          <StepHeader title="ما مرحلتك الدراسية؟" sub="اختر المرحلة التي أنت فيها الآن" />
          <div className="space-y-3">
            {(Object.keys(STAGE_LABEL) as SchoolStage[]).map((s) => (
              <OptionCard key={s} selected={stage === s} onClick={() => setStage(s)} title={STAGE_LABEL[s]} />
            ))}
          </div>
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} className="flex-1 py-3 text-base">التالي</PrimaryButton>
          </div>
        </div>
      )}

      {step === "grade" && stage && (
        <div>
          <StepHeader title="ما صفّك الدراسي؟" sub={`اختر صفك في المرحلة ${STAGE_LABEL[stage]}`} />
          <div className="grid grid-cols-2 gap-2.5">
            {GRADES[stage].map((g) => (
              <div key={g} className={g === "الصف الخامس" ? "col-span-2 flex justify-center" : ""}>
                <GradePill label={g} selected={grade === g} onClick={() => setGrade(g)} />
              </div>
            ))}
          </div>
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} className="flex-1 py-3 text-base">التالي</PrimaryButton>
          </div>
        </div>
      )}

      {step === "password" && (
        <div>
          <StepHeader title="أنشئ كلمة سر" sub="يمكن أن تكون كلمة المرور حرفاً أو رقماً واحداً فأكثر" />
          <div className="relative">
            <input
              autoFocus
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
              placeholder="أدخل كلمة السر"
              className={`${inputCls} pl-11`}
              autoComplete="new-password"
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground hover:text-foreground transition"
            >
              <Icon name={showPw ? "eye-off" : "eye"} size={18} />
            </button>
          </div>
          <div className="relative mt-3">
            <input
              type={showPw2 ? "text" : "password"}
              value={password2}
              onChange={(e) => { setPassword2(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && goNext()}
              placeholder="تأكيد كلمة السر"
              className={`${inputCls} pl-11`}
              autoComplete="new-password"
            />
            <button
              type="button" onClick={() => setShowPw2((v) => !v)}
              aria-label={showPw2 ? "إخفاء تأكيد كلمة السر" : "إظهار تأكيد كلمة السر"}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground hover:text-foreground transition"
            >
              <Icon name={showPw2 ? "eye-off" : "eye"} size={18} />
            </button>
          </div>
          {/* مؤشرات القواعد الفورية */}
          <div className="mt-3 space-y-1 font-readex text-xs font-bold">
            <p className={isNonWhitespacePassword(password) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {isNonWhitespacePassword(password) ? "✓" : "•"} محرف واحد غير مسافة على الأقل
            </p>
            {password2.length > 0 && (
              <p className={password === password2 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                {password === password2 ? "✓ الكلمتان متطابقتان" : "✗ الكلمتان غير متطابقتين"}
              </p>
            )}
          </div>
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} disabled={busy} className="flex-1 py-3 text-base">
              {completeProfile.isPending ? "جارٍ التسجيل…" : "تسجيل"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === "email" && (
        <div>
          <StepHeader title="البريد الإلكتروني (اختياري)" sub="لاستعادة حسابك واستلام التنبيهات — يمكنك الإكمال بدونه" />
          <input
            dir="ltr" type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && void submitCompleteProfile(stage, grade)}
            placeholder="name@example.com"
            className={inputCls}
          />
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton
              onClick={() => void submitCompleteProfile(stage, grade)}
              disabled={busy}
              className="flex-1 py-3 text-base"
            >
              {completeProfile.isPending ? "جارٍ التسجيل…" : "إكمال التسجيل"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* خطوة البصمة — تظهر فقط بعد إنشاء الحساب بنجاح (كلمة السر مؤكدة + حساب منشأ)،
          وفقط على الأجهزة الداعمة. الوجه أو الإصبع حسب مصادق الجهاز — اختيارية دائماً */}
      {step === "biometric" && (
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[rgba(212,175,55,0.15)] flex items-center justify-center text-burgundy mb-4">
            <Icon name="fingerprint" size={40} />
          </div>
          <StepHeader
            title="تم إنشاء حسابك بنجاح"
            sub="هل تريد تفعيل الدخول بالبصمة؟ وجهك أو إصبعك — حسب ما يدعمه جهازك"
          />
          <p className="font-readex text-xs text-muted-foreground -mt-3 mb-5">
            لن تُحفظ بصمتك لدينا أبداً — تبقى مشفّرة داخل جهازك فقط
          </p>
          <ErrorText msg={err} />
          <PrimaryButton onClick={() => void setupBiometric()} disabled={bioBusy} className="w-full py-3.5 text-base">
            {bioBusy ? "جارٍ التفعيل…" : "تفعيل البصمة"}
          </PrimaryButton>
          <button
            onClick={() => finishAfterBiometric(false)}
            disabled={bioBusy}
            className="w-full mt-3 py-3 rounded-xl border-2 border-input font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition disabled:opacity-60"
          >
            لاحقاً
          </button>
        </div>
      )}
    </Modal>
  );
}
