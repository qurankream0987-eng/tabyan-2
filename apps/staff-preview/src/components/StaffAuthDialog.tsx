import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ShieldCheck, UserRound, X } from "lucide-react";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";
import {
  checkTeacherPhone,
  loginSupervisor,
  loginTeacher,
  registerTeacher,
  staffAuthError,
  validateTeacherPhone,
} from "@/lib/staff-auth";
import "./StaffAuthDialog.css";

export type StaffAuthMode = "closed" | "choice" | "teacher-register" | "teacher-login" | "supervisor-login";

export default function StaffAuthDialog({
  mode,
  onModeChange,
  onClose,
}: {
  mode: StaffAuthMode;
  onModeChange: (mode: StaffAuthMode) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mode === "closed") return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("button, input")?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [mode, onClose]);

  if (mode === "closed") return null;

  const title = mode === "choice" ? "تسجيل الدخول"
    : mode === "teacher-register" ? "التسجيل كمعلم"
    : mode === "teacher-login" ? "دخول المعلم" : "بوابة الإشراف";

  return (
    <div
      className="staff-auth-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      data-testid="dialog-backdrop"
    >
      <section
        ref={panelRef}
        className="staff-auth-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-auth-title"
        dir="rtl"
      >
        <button type="button" className="staff-auth-close" onClick={onClose} aria-label="إغلاق" data-testid="button-close-auth">
          <X size={18} />
        </button>
        <div className="staff-auth-brand">
          <img src={`${import.meta.env.BASE_URL}brand/logo-light.svg`} alt="تبيان" className="staff-auth-logo-light" />
          <img src={`${import.meta.env.BASE_URL}brand/logo-dark.svg`} alt="" className="staff-auth-logo-dark" />
          <h2 id="staff-auth-title">{title}</h2>
        </div>

        {mode === "choice" && <RoleChoice onModeChange={onModeChange} />}
        {mode === "teacher-register" && <TeacherRegister onModeChange={onModeChange} />}
        {mode === "teacher-login" && <TeacherLogin onModeChange={onModeChange} />}
        {mode === "supervisor-login" && <SupervisorLogin />}

        <button type="button" className="staff-auth-return" onClick={onClose} data-testid="button-return-welcome">
          العودة إلى الشاشة الترحيبية
        </button>
      </section>
    </div>
  );
}

function RoleChoice({ onModeChange }: { onModeChange: (mode: StaffAuthMode) => void }) {
  return (
    <div className="staff-auth-flow">
      <p className="staff-auth-description">اختر بوابة الدخول المناسبة لحسابك.</p>
      <button type="button" className="staff-auth-choice" onClick={() => onModeChange("teacher-login")} data-testid="button-teacher-login-choice">
        <span className="staff-auth-choice-icon"><UserRound size={20} /></span>
        <span><strong>دخول المعلم</strong><small>الهاتف أو البريد أو اسم المستخدم وكلمة السر</small></span>
        <ArrowRight size={17} />
      </button>
      <button type="button" className="staff-auth-choice" onClick={() => onModeChange("supervisor-login")} data-testid="button-supervisor-login-choice">
        <span className="staff-auth-choice-icon"><ShieldCheck size={20} /></span>
        <span><strong>دخول المشرف</strong><small>اسم المستخدم وكلمة السر</small></span>
        <ArrowRight size={17} />
      </button>
      <p className="staff-auth-note">حسابات المشرفين ينشئها مشرف قائم؛ لا يوجد تسجيل ذاتي للإشراف.</p>
    </div>
  );
}

function TeacherRegister({ onModeChange }: { onModeChange: (mode: StaffAuthMode) => void }) {
  const [step, setStep] = useState<"name" | "phone" | "password">("name");
  const [fullName, setFullName] = useState("");
  const [dial, setDial] = useState("965");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const run = async (operation: () => Promise<void>, fallback = "تعذّر إكمال التسجيل — حاول مرة أخرى") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (cause) {
      setError(staffAuthError(cause, fallback));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const nextFromName = () => {
    if (fullName.trim().length < 3) {
      setError("الاسم يجب أن يكون 3 أحرف على الأقل");
      return;
    }
    setError("");
    setStep("phone");
  };

  const checkPhone = () => void run(async () => {
    const parsed = validateTeacherPhone(dial, phone);
    if (parsed.error || !parsed.value) {
      setError(parsed.error ?? "رقم الهاتف غير صحيح.");
      return;
    }
    const result = await checkTeacherPhone(parsed.value);
    if (result.registered) {
      setError("هذا الرقم مسجّل مسبقاً — استخدم تسجيل الدخول بكلمة السر");
      return;
    }
    setStep("password");
  }, "تعذّر التحقق من الرقم — حاول مرة أخرى");

  const submit = () => void run(async () => {
    if (!isNonWhitespacePassword(password)) {
      setError("أدخل كلمة المرور");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا السر غير متطابقتين");
      return;
    }
    const parsed = validateTeacherPhone(dial, phone);
    if (parsed.error || !parsed.value) {
      setError(parsed.error ?? "رقم الهاتف غير صحيح.");
      setStep("phone");
      return;
    }
    const destination = await registerTeacher({ fullName, phone: parsed.value, password });
    window.location.assign(destination);
  });

  return (
    <div className="staff-auth-flow">
      <ProgressBar step={step} />
      {step === "name" && (
        <form className="staff-auth-form" onSubmit={(event: FormEvent) => { event.preventDefault(); nextFromName(); }}>
          <p className="staff-auth-description">التسجيل كمعلم في منصة تبيان.</p>
          <Field label="الاسم الكامل">
            <input autoFocus value={fullName} onChange={(event) => { setFullName(event.target.value); setError(""); }} placeholder="مثال: أحمد محمد" autoComplete="name" data-testid="input-teacher-name" />
          </Field>
          <ErrorMessage message={error} />
          <button type="submit" className="staff-auth-submit" data-testid="button-register-next">التالي</button>
          <button type="button" className="staff-auth-text-button" onClick={() => onModeChange("teacher-login")} data-testid="button-switch-teacher-login">
            لديك حساب من لوحة الإشراف؟ دخول باسم المستخدم
          </button>
        </form>
      )}
      {step === "phone" && (
        <div className="staff-auth-form">
          <p className="staff-auth-description">سيُستخدم الرقم مع كلمة المرور للدخول — لا يوجد رمز تحقق.</p>
          <div className="staff-auth-phone-row">
            <Field label="رمز الدولة">
              <input dir="ltr" inputMode="numeric" autoComplete="tel-country-code" value={dial} onChange={(event) => { setDial(event.target.value.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "").slice(0, 4)); setError(""); }} placeholder="965" data-testid="input-country-code" />
            </Field>
            <Field label="رقم الهاتف">
              <input dir="ltr" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => { setPhone(event.target.value); setError(""); }} placeholder="5XXXXXXXX" data-testid="input-teacher-phone" />
            </Field>
          </div>
          <ErrorMessage message={error} />
          <div className="staff-auth-button-row">
            <button type="button" className="staff-auth-secondary" onClick={() => { setError(""); setStep("name"); }} data-testid="button-register-back">السابق</button>
            <button type="button" className="staff-auth-submit" disabled={busy} onClick={checkPhone} data-testid="button-check-phone">{busy ? "جارٍ التحقق…" : "التالي"}</button>
          </div>
        </div>
      )}
      {step === "password" && (
        <form className="staff-auth-form" onSubmit={(event: FormEvent) => { event.preventDefault(); submit(); }}>
          <p className="staff-auth-description">اختر كلمة مرور لحساب المعلم.</p>
          <Field label="كلمة المرور">
            <input dir="ltr" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} data-testid="input-teacher-password" />
          </Field>
          <Field label="تأكيد كلمة المرور">
            <input dir="ltr" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} data-testid="input-teacher-password-confirm" />
          </Field>
          <ErrorMessage message={error} />
          <div className="staff-auth-button-row">
            <button type="button" className="staff-auth-secondary" onClick={() => { setError(""); setStep("phone"); }} data-testid="button-password-back">السابق</button>
            <button type="submit" className="staff-auth-submit" disabled={busy} data-testid="button-create-teacher-account">{busy ? "جارٍ التسجيل…" : "إنشاء الحساب"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function TeacherLogin({ onModeChange }: { onModeChange: (mode: StaffAuthMode) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (identifier.trim().length < 3) return setError("أدخل اسم المستخدم أو الهاتف أو البريد");
    if (!password) return setError("أدخل كلمة السر");
    busyRef.current = true;
    setBusy(true);
    setError("");
    void loginTeacher(identifier, password)
      .then((destination) => window.location.assign(destination))
      .catch((cause) => setError(staffAuthError(cause, "تعذّر تسجيل الدخول — حاول مرة أخرى")))
      .finally(() => { busyRef.current = false; setBusy(false); });
  };

  return (
    <form className="staff-auth-flow staff-auth-form" onSubmit={submit}>
      <p className="staff-auth-description">للحسابات المسجّلة للمعلمين — أدخل بيانات الدخول.</p>
      <Field label="اسم المستخدم أو الهاتف أو البريد">
        <input autoFocus dir="auto" autoComplete="username" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(""); }} data-testid="input-teacher-identifier" />
      </Field>
      <Field label="كلمة السر">
        <input dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} data-testid="input-teacher-login-password" />
      </Field>
      <ErrorMessage message={error} />
      <button type="submit" className="staff-auth-submit" disabled={busy} data-testid="button-login-teacher">{busy ? "جارٍ الدخول…" : "دخول"}</button>
      <button type="button" className="staff-auth-text-button" onClick={() => onModeChange("teacher-register")} data-testid="button-switch-teacher-register">ليس لديك حساب؟ سجّل كمعلم جديد</button>
    </form>
  );
}

function SupervisorLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (!username.trim()) return setError("أدخل اسم المستخدم");
    if (!password) return setError("أدخل كلمة السر");
    busyRef.current = true;
    setBusy(true);
    setError("");
    void loginSupervisor(username, password)
      .then((destination) => window.location.assign(destination))
      .catch((cause) => setError(staffAuthError(cause, "تعذّر تسجيل الدخول — حاول مرة أخرى")))
      .finally(() => { busyRef.current = false; setBusy(false); });
  };

  return (
    <form className="staff-auth-flow staff-auth-form" onSubmit={submit}>
      <p className="staff-auth-description">أدخل اسم المستخدم وكلمة السر للوصول إلى لوحة الإشراف.</p>
      <Field label="اسم المستخدم">
        <input autoFocus dir="auto" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} data-testid="input-supervisor-username" />
      </Field>
      <Field label="كلمة السر">
        <input dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} data-testid="input-supervisor-password" />
      </Field>
      <ErrorMessage message={error} />
      <button type="submit" className="staff-auth-submit" disabled={busy} data-testid="button-login-supervisor">{busy ? "جارٍ التحقق…" : "دخول"}</button>
      <p className="staff-auth-note">لا يوجد تسجيل ذاتي للمشرفين؛ ينشئ الحساب مشرف قائم.</p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="staff-auth-field"><span>{label}</span>{children}</label>;
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="staff-auth-error" role="alert" aria-live="polite" data-testid="status-auth-error">{message}</p> : null;
}

function ProgressBar({ step }: { step: "name" | "phone" | "password" }) {
  const active = step === "name" ? 0 : step === "phone" ? 1 : 2;
  return <div className="staff-auth-progress" aria-label={`خطوة ${active + 1} من 3`}>
    {[0, 1, 2].map((index) => <span className={index <= active ? "is-active" : ""} key={index} />)}
  </div>;
}
