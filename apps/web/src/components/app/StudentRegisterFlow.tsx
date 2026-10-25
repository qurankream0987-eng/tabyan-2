import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import Icon from "./Icon";
import PhoneField from "./PhoneField";
import { authStore } from "@/lib/auth";
import { loginWebSession } from "@/lib/web-login";
import { loginIdentifierTarget } from "@/lib/login-identifier";
import { isWebLoginPending } from "@/lib/web-auth-runtime";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { COUNTRIES, toE164, validatePhoneNumber } from "@/lib/countries";
import { biometricLogin, enableBiometric, hasBiometricSession, isBiometricAvailable } from "@/lib/webauthn";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";
import {
  getStudentRegistrationAge,
  getStudentRegistrationStepDecision,
  normalizedStudentRegistrationName,
  registrationStepForField,
  validateStudentRegistration,
  validateStudentRegistrationStep,
  type StudentRegistrationStep,
  type StudentRegistrationValues,
} from "@workspace/tabyan-trpc/registration-validation";

// choice: دخول الحساب الحالي أو التسجيل اليدوي — login: دخول المستخدم المسجّل
// biometric: خطوة إعداد البصمة بعد إنشاء الحساب مباشرة (خارج baseFlow لأنها تتطلب جلسة)
type Step = "choice" | "name" | "birthdate" | "phone" | "login" | "school" | "level" | "grade" | "password" | "email" | "biometric";
type StartMode = "register" | "login" | "choice";
type SchoolStage = "primary" | "middle" | "high";

function initialStepFor(startMode: StartMode): Step {
  if (startMode === "login") return "login";
  if (startMode === "choice") return "choice";
  return "name";
}

const GRADES: Record<SchoolStage, string[]> = {
  primary: ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس"],
  middle: ["الصف السادس", "الصف السابع", "الصف الثامن", "الصف التاسع"],
  high: ["الصف العاشر", "الصف الحادي عشر", "الصف الثاني عشر"],
};
const STAGE_LABEL: Record<SchoolStage, string> = { primary: "الابتدائية", middle: "المتوسطة", high: "الثانوية" };
const MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const daysInCalendarMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function baseFlow(inSchool: boolean | null): Step[] {
  // لا تحقق هاتف أو بريد في التسجيل — البريد الاختياري هو الخطوة الأخيرة دائماً
  const base: Step[] = ["name", "birthdate", "phone", "school"];
  return inSchool ? [...base, "level", "grade", "password", "email"] : [...base, "password", "email"];
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

function OptionCard({ selected, onClick, title, sub, field }: { selected: boolean; onClick: () => void; title: string; sub?: string; field?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-registration-field={field}
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

function GradePill({ label, selected, onClick, field }: { label: string; selected: boolean; onClick: () => void; field?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-registration-field={field}
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
  startMode?: StartMode;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(() => initialStepFor(startMode));
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
  // خطوة البصمة بعد إنشاء الحساب — تحتاج الاسم لاستخدامه في الترحيب بعد التفعيل أو التخطي
  const [bioBusy, setBioBusy] = useState(false);

  const completeProfile = trpc.auth.completeProfile.useMutation();
  const checkPhone = trpc.auth.checkPhone.useMutation();
  const studentPasswordLogin = trpc.auth.studentPasswordLogin.useMutation();
  const passwordLogin = trpc.auth.passwordLogin.useMutation();

  const busy = studentPasswordLogin.isPending || passwordLogin.isPending || completeProfile.isPending
    || checkPhone.isPending || isWebLoginPending();
  const birthDate = dobY && dobM && dobD ? `${dobY}-${dobM.padStart(2, "0")}-${dobD.padStart(2, "0")}` : "";
  const e164Phone = toE164(dial, phone);
  const phoneValidationError = phoneHasInvalidCharacters
    ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة."
    : validatePhoneNumber(dial, phone);
  const registrationValues: StudentRegistrationValues = {
    fullName,
    birthDate,
    phoneError: phoneValidationError,
    inSchool,
    schoolStage: stage,
    schoolGrade: grade,
    password,
    confirmPassword: password2,
    email,
  };

  const focusRegistrationField = (field: string) => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-registration-field="${field}"]`)?.focus();
    });
  };
  const clearErrorWhenStepIsValid = (
    validationStep: StudentRegistrationStep,
    changes: Partial<StudentRegistrationValues>,
  ) => {
    if (err && !validateStudentRegistrationStep(validationStep, { ...registrationValues, ...changes })) {
      setErr("");
    }
  };

  useEffect(() => {
    if (!open) {
      // إعادة الضبط الكاملة عند إغلاق النافذة كي تبدأ محاولة تالية من جديد
      setStep(initialStepFor(startMode)); setFullName(""); setDobY(""); setDobM(""); setDobD("");
      setDial("965"); setPhone(""); setPhoneHasInvalidCharacters(false); setGps(null);
       setInSchool(null); setStage(null); setGrade(""); setErr("");
       setLoginIdentifier(""); setLoginPassword("");
       setEmail("");
      setPassword(""); setPassword2(""); setShowPw(false); setShowPw2(false); setRememberMe(true);
      setBioBusy(false);
      // زر الدخول بالبصمة يظهر فقط إن كانت مفعّلة على هذا الجهاز والنظام يدعمها
      void isBiometricAvailable().then((ok) => setBioReady(ok && hasBiometricSession()));
     } else {
        setStep(initialStepFor(startMode));
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
      const s = await loginWebSession(biometricLogin);
      if (!s) return;
      authStore.set(s.token, s.role, s.name);
      toast(`أهلاً ${s.name} 🎉`, "success");
      onClose();
      navigate(s.role === "teacher" ? "/teacher" : s.role === "admin" ? "/admin" : "/student/home");
    } catch (e) {
      setErr(userFacingErrorMessage(e, "تعذّر الدخول بالبصمة — استخدم كلمة السر"));
    }
  };

  const submitCompleteProfile = async (finalStage: SchoolStage | null, finalGrade: string) => {
    setErr("");
    const validationError = validateStudentRegistration(registrationValues);
    if (validationError) {
      setStep(registrationStepForField(validationError.field));
      setErr(validationError.message);
      focusRegistrationField(validationError.field);
      return;
    }
    try {
      const res = await completeProfile.mutateAsync({
        phone: e164Phone, fullName: normalizedStudentRegistrationName(fullName), birthDate,
        inSchool: inSchool ?? undefined,
        schoolStage: finalStage ?? undefined,
        schoolGrade: finalStage ? finalGrade : undefined,
        gpsLat: gps?.lat, gpsLng: gps?.lng,
        role: "student",
        password, confirmPassword: password2, rememberMe,
        email: email.trim() ? email.trim().toLowerCase() : undefined,
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
      const message = userFacingErrorMessage(e, "تعذّر إكمال التسجيل — حاول مرة أخرى");
      if (message.includes("الرقم مسجل مسبقاً")) setStep("phone");
      setErr(message);
      if (message.includes("الرقم مسجل مسبقاً")) focusRegistrationField("phone");
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
    if (step === "choice" || step === "login" || step === "biometric") return;
    const decision = getStudentRegistrationStepDecision(step, registrationValues);
    if (decision.error) {
      setErr(decision.error.message);
      focusRegistrationField(decision.error.field);
      return;
    }

    if (step === "name") {
      const normalizedName = normalizedStudentRegistrationName(fullName);
      setFullName(normalizedName);
      return setStep(decision.nextStep!);
    }

    if (step === "birthdate") {
      return setStep(decision.nextStep!);
    }

    if (step === "phone") {
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
      return setStep(decision.nextStep!);
    }

    if (step === "level") {
      return setStep(decision.nextStep!);
    }

    if (step === "grade") {
      return setStep(decision.nextStep!);
    }

    if (step === "password") {
      return setStep(decision.nextStep!); // البريد الاختياري هو الخطوة الأخيرة
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
    if (isWebLoginPending()) return;
    setErr("");
    const identifier = loginIdentifier.trim();
    if (!identifier || !loginPassword) return setErr("أدخل رقم الهاتف أو البريد وكلمة السر");
    try {
      const target = loginIdentifierTarget(identifier);
      const res = await loginWebSession(() => target.kind === "identifier"
        ? studentPasswordLogin.mutateAsync({ identifier: target.value, password: loginPassword, rememberMe })
        : passwordLogin.mutateAsync({ username: target.value, password: loginPassword, rememberMe }));
      if (res) finishLogin(res.token, res.role, res.name);
    } catch (e) {
      setErr(userFacingErrorMessage(e, "تعذّر تسجيل الدخول — تحقق من بياناتك"));
    }
  };

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
        <img src="/logo-light.png" alt="تبيان" className="h-12 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo-dark.png" alt="تبيان" className="h-12 mx-auto mb-3 hidden dark:block logo-dark" />
      </div>

      {/* خطوة البصمة خارج مسار التسجيل (حساب منشأ أصلاً) — لا يظهر لها شريط تقدم بقيمة صفرية */}
      {step !== "choice" && step !== "biometric" && step !== "login" && <ProgressBar index={Math.max(stepIdx, 0)} total={flow.length} />}

      {step === "choice" && (
        <div>
          <StepHeader title="ابدأ رحلتك مجاناً" sub="سجّل الدخول إلى حسابك أو أنشئ حساب طالب جديداً" />
          <button
            type="button"
            onClick={() => { setErr(""); setStep("login"); }}
            className="w-full rounded-xl border-2 border-burgundy bg-burgundy py-3 font-readex font-bold text-sm text-white hover:bg-burgundy/90 transition btn-press dark:border-gold dark:bg-gold dark:text-night"
          >
            لدي حساب بالفعل — تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setErr(""); setStep("name"); }}
            className="w-full rounded-xl border-2 border-input bg-white dark:bg-card py-3 font-readex font-bold text-sm text-foreground hover:bg-muted transition btn-press"
          >
            التسجيل كطالب جديد
          </button>
          <ErrorText msg={err} />
        </div>
      )}

      {step === "name" && (
        <div>
          <StepHeader title="ما اسمك الكامل؟" sub="سيظهر اسمك لمعلمك وزملائك في الحلقة — اكتب ثلاثة أسماء، وكل اسم من حرفين فأكثر" />
          <input
            autoFocus dir="rtl" value={fullName}
            onChange={(e) => {
              const value = e.target.value;
              setFullName(value);
              clearErrorWhenStepIsValid("name", { fullName: value });
            }}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
            placeholder="مثال: محمد أحمد علي"
            data-registration-field="fullName"
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
            const now = new Date();
            const thisYear = now.getUTCFullYear();
            const thisMonth = now.getUTCMonth() + 1;
            const daysInSelectedMonth = dobY && dobM ? daysInCalendarMonth(Number(dobY), Number(dobM)) : 31;
            const isCurrentMonth = Number(dobY) === thisYear && Number(dobM) === thisMonth;
            const daysInMonth = isCurrentMonth ? Math.min(daysInSelectedMonth, now.getUTCDate()) : daysInSelectedMonth;
            const clampDay = (y: string, m: string, d: string) => {
              if (y && m && d && Number(d) > daysInCalendarMonth(Number(y), Number(m))) setDobD("");
            };
            return (
              <div className="grid grid-cols-3 gap-2">
                <select value={dobD} onChange={(e) => {
                  const value = e.target.value;
                  setDobD(value);
                  const nextDate = dobY && dobM && value ? `${dobY}-${dobM.padStart(2, "0")}-${value.padStart(2, "0")}` : "";
                  clearErrorWhenStepIsValid("birthdate", { birthDate: nextDate });
                }} className={selectCls} aria-label="اليوم" data-registration-field="birthDate">
                  <option value="">اليوم</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={dobM}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDobM(value);
                    clampDay(dobY, value, dobD);
                    const nextDate = dobY && value && dobD ? `${dobY}-${value.padStart(2, "0")}-${dobD.padStart(2, "0")}` : "";
                    clearErrorWhenStepIsValid("birthdate", { birthDate: nextDate });
                  }}
                  className={selectCls} aria-label="الشهر" data-registration-field="birthDate"
                >
                  <option value="">الشهر</option>
                  {MONTH_NAMES.map((n, i) => i + 1 <= (Number(dobY) === thisYear ? thisMonth : 12) ? <option key={n} value={i + 1}>{n}</option> : null)}
                </select>
                <select
                  value={dobY}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDobY(value);
                    clampDay(value, dobM, dobD);
                    const nextDate = value && dobM && dobD ? `${value}-${dobM.padStart(2, "0")}-${dobD.padStart(2, "0")}` : "";
                    clearErrorWhenStepIsValid("birthdate", { birthDate: nextDate });
                  }}
                  className={selectCls} aria-label="السنة" data-registration-field="birthDate"
                >
                  <option value="">السنة</option>
                  {Array.from({ length: 97 }, (_, i) => thisYear - 4 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            );
          })()}
          {(() => {
            const age = getStudentRegistrationAge(birthDate);
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
          <PhoneField
            dial={dial}
            phone={phone}
            onDialChange={(value) => {
              setDial(value);
              clearErrorWhenStepIsValid("phone", {
                phoneError: phoneHasInvalidCharacters
                  ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة."
                  : validatePhoneNumber(value, phone),
              });
            }}
            onPhoneChange={(value, invalidCharacters = false) => {
              setPhone(value);
              setPhoneHasInvalidCharacters(invalidCharacters);
              const updatedPhoneError = invalidCharacters
                ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة."
                : validatePhoneNumber(dial, value);
              clearErrorWhenStepIsValid("phone", { phoneError: updatedPhoneError });
            }}
            onInvalidCharactersChange={(invalid) => {
              setPhoneHasInvalidCharacters(invalid);
              const updatedPhoneError = invalid
                ? "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة."
                : validatePhoneNumber(dial, phone);
              clearErrorWhenStepIsValid("phone", { phoneError: updatedPhoneError });
            }}
            onEnter={goNext}
            registrationField="phone"
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
            data-testid="input-login-identifier"
            className={inputCls}
            autoComplete="username"
          />
          <input
            type="password" dir="ltr" value={loginPassword}
            onChange={(e) => { setLoginPassword(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && void submitLogin()}
            placeholder="كلمة السر"
            data-testid="input-login-password"
            className={`${inputCls} mt-3`}
            autoComplete="current-password"
          />
          <label className="mt-3 flex items-center justify-center gap-2 font-readex text-sm font-bold text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 accent-burgundy dark:accent-gold" />
            تذكرني على هذا الجهاز
          </label>
          <ErrorText msg={err} />
          <PrimaryButton
            data-testid="button-login"
            onClick={() => void submitLogin()}
            disabled={busy}
            className="w-full mt-5 py-3 text-base"
          >
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
            <OptionCard field="inSchool" selected={inSchool === true} onClick={() => {
              setInSchool(true);
              clearErrorWhenStepIsValid("school", { inSchool: true });
            }} title="نعم" sub="أنا مقيّد في مدرسة" />
            <OptionCard field="inSchool" selected={inSchool === false} onClick={() => {
              setInSchool(false);
              clearErrorWhenStepIsValid("school", { inSchool: false });
            }} title="لا" sub="خريج أو خارج المدرسة" />
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
              <OptionCard key={s} field="schoolStage" selected={stage === s} onClick={() => {
                setStage(s);
                clearErrorWhenStepIsValid("level", { schoolStage: s });
              }} title={STAGE_LABEL[s]} />
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
                <GradePill field="schoolGrade" label={g} selected={grade === g} onClick={() => {
                  setGrade(g);
                  clearErrorWhenStepIsValid("grade", { schoolGrade: g });
                }} />
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
              data-registration-field="password"
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                clearErrorWhenStepIsValid("password", { password: value });
              }}
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
              data-registration-field="confirmPassword"
              onChange={(e) => {
                const value = e.target.value;
                setPassword2(value);
                clearErrorWhenStepIsValid("password", { confirmPassword: value });
              }}
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
          <StepHeader title="البريد الإلكتروني (اختياري)" sub="للتواصل واستلام التنبيهات — يمكنك الإكمال بدونه" />
          <input
            dir="ltr" type="email" value={email} autoComplete="email"
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
              clearErrorWhenStepIsValid("email", { email: value });
            }}
            onKeyDown={(e) => e.key === "Enter" && void submitCompleteProfile(stage, grade)}
            placeholder="name@example.com"
            data-registration-field="email"
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
