import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import Icon from "./Icon";
import PhoneField from "./PhoneField";
import { authStore } from "@/lib/auth";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { toE164, validatePhoneNumber } from "@/lib/countries";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";

type Step = "name" | "phone" | "password";

const inputCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-card px-4 py-3 font-readex text-lg outline-none focus:border-burgundy dark:focus:border-gold transition text-center";
function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center mb-6">
      <h2 className="font-amiri text-2xl text-burgundy font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground font-readex mt-1">{sub}</p>
    </div>
  );
}

function ErrorText({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-destructive text-sm font-readex text-center mt-2">{msg}</p>;
}

const STEPS: Step[] = ["name", "phone", "password"];

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

export default function TeacherRegisterFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("name");
  const [fullName, setFullName] = useState("");
  const [dial, setDial] = useState("965");
  const [phone, setPhone] = useState(""); // الرقم الوطني بدون رمز الدولة
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  // دخول المعلمين أصحاب الحسابات المنشأة من لوحة الإشراف (بلا هاتف) — اسم مستخدم + كلمة سر
  const [mode, setMode] = useState<"register" | "login">("register");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const completeProfile = trpc.auth.completeProfile.useMutation();
  const checkPhone = trpc.auth.checkPhone.useMutation();
  const passwordLogin = trpc.auth.passwordLogin.useMutation();

  const busy = completeProfile.isPending || checkPhone.isPending || passwordLogin.isPending;
  const e164Phone = toE164(dial, phone);

  useEffect(() => {
    if (!open) {
       setStep("name"); setFullName(""); setDial("965"); setPhone("");
       setPassword(""); setPassword2(""); setErr("");
      setMode("register"); setLoginUser(""); setLoginPass("");
    }
  }, [open]);

  const stepIdx = STEPS.indexOf(step);

  const finishLogin = (token: string, name: string) => {
    authStore.set(token, "teacher", name);
    toast(`أهلاً ${name} 🎉`, "success");
    onClose();
    navigate("/teacher");
  };

  /** دخول معلم بحساب أنشأه المشرف — يقبل حسابات المعلمين فقط */
  const submitPasswordLogin = async () => {
    setErr("");
    if (loginUser.trim().length < 3) return setErr("أدخل اسم المستخدم");
    if (!loginPass) return setErr("أدخل كلمة السر");
    try {
      const res = await passwordLogin.mutateAsync({ username: loginUser.trim(), password: loginPass });
      if (res.role !== "teacher") return setErr("هذا الحساب ليس حساب معلم — ادخل من بوابة الإشراف");
      finishLogin(res.token, res.name ?? loginUser.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تسجيل الدخول — حاول مرة أخرى");
    }
  };

  const submitCompleteProfile = async () => {
    setErr("");
    if (!isNonWhitespacePassword(password)) {
      return setErr("أدخل كلمة المرور");
    }
    if (password !== password2) return setErr("كلمتا السر غير متطابقتين");
    try {
      const res = await completeProfile.mutateAsync({
        phone: e164Phone, fullName: fullName.trim(),
        birthDate: "1990-01-01", // placeholder; teachers don't need age gating
        role: "teacher",
        password, confirmPassword: password2, rememberMe: true,
      });
      finishLogin(res.token, fullName.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر إكمال التسجيل — حاول مرة أخرى");
    }
  };

  const goNext = async () => {
    setErr("");

    if (step === "name") {
      if (fullName.trim().length < 3) return setErr("الاسم يجب أن يكون 3 أحرف على الأقل");
      return setStep("phone");
    }

    if (step === "phone") {
      const phoneError = validatePhoneNumber(dial, phone);
      if (phoneError) return setErr(phoneError);
      try {
        const res = await checkPhone.mutateAsync({ phone: e164Phone });
        if (res.registered) return setErr("هذا الرقم مسجّل مسبقاً — استخدم تسجيل الدخول بكلمة السر");
        setStep("password");
      } catch (e) {
        setErr(userFacingErrorMessage(e, "تعذّر التحقق من الرقم — حاول مرة أخرى"));
      }
      return;
    }
  };

  const goBack = () => {
    setErr("");
    if (step === "phone") return setStep("name");
    if (step === "password") return setStep("phone");
  };

  const returnToWelcome = () => {
    onClose();
    navigate("/", { replace: true });
  };

  return (
    <Modal open={open} onClose={onClose} className="text-right">
      <div className="mb-2">
        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-12 mx-auto mb-3 hidden dark:block logo-dark" />
      </div>

      {mode === "register" && <ProgressBar index={Math.max(stepIdx, 0)} total={STEPS.length} />}

      {mode === "login" && (
        <div>
          <StepHeader title="دخول المعلم" sub="للحسابات المنشأة من لوحة الإشراف — اسم المستخدم وكلمة السر" />
          <div className="space-y-3">
            <input dir="ltr" autoFocus value={loginUser} onChange={(e) => { setLoginUser(e.target.value); setErr(""); }}
              placeholder="اسم المستخدم" autoComplete="username" className={inputCls} style={{ textAlign: "left" }} />
            <input dir="ltr" type="password" value={loginPass} onChange={(e) => { setLoginPass(e.target.value); setErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitPasswordLogin()}
              placeholder="كلمة السر" autoComplete="current-password" className={inputCls} style={{ textAlign: "left" }} />
          </div>
          <ErrorText msg={err} />
          <PrimaryButton onClick={submitPasswordLogin} disabled={passwordLogin.isPending} className="w-full mt-5 py-3 text-base">
            {passwordLogin.isPending ? "جارٍ الدخول…" : "دخول"}
          </PrimaryButton>
          <button type="button" onClick={() => { setMode("register"); setErr(""); }}
            className="w-full mt-3 font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition">
            ليس لديك حساب؟ سجّل كمعلم جديد
          </button>
        </div>
      )}

      {mode === "register" && step === "name" && (
        <div>
          <StepHeader title="ما اسمك الكامل؟" sub="التسجيل كمعلم في منصة تبيان" />
          <input
            autoFocus dir="rtl" value={fullName}
            onChange={(e) => { setFullName(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && goNext()}
            placeholder="مثال: أحمد محمد"
            className={inputCls}
          />
          <ErrorText msg={err} />
          <PrimaryButton onClick={goNext} className="w-full mt-5 py-3 text-base">التالي</PrimaryButton>
          <button type="button" onClick={() => { setMode("login"); setErr(""); }}
            className="w-full mt-3 font-readex text-xs font-bold text-muted-foreground hover:text-foreground transition">
            لديك حساب من لوحة الإشراف؟ دخول باسم المستخدم
          </button>
        </div>
      )}

      {mode === "register" && step === "phone" && (
        <div>
          <StepHeader title="رقم جوالك" sub="سيُستخدم الرقم مع كلمة المرور للدخول — لا يوجد رمز تحقق" />
          <PhoneField
            dial={dial}
            phone={phone}
            onDialChange={(value) => { setDial(value); setErr(""); }}
            onPhoneChange={(value) => { setPhone(value); setErr(""); }}
            onEnter={goNext}
          />
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={goNext} disabled={busy} className="flex-1 py-3 text-base">
              {busy ? "جارٍ التحقق…" : "التالي"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "register" && step === "password" && (
        <div>
          <StepHeader title="أنشئ كلمة مرور" sub="يمكن أن تكون كلمة المرور حرفاً أو رقماً واحداً فأكثر" />
          <input dir="ltr" type="password" autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }}
            placeholder="أدخل كلمة المرور" autoComplete="new-password" className={inputCls} />
          <input dir="ltr" type="password" value={password2} onChange={(e) => { setPassword2(e.target.value); setErr(""); }}
            placeholder="تأكيد كلمة المرور" autoComplete="new-password" className={`${inputCls} mt-3`} />
          <ErrorText msg={err} />
          <div className="flex gap-3 mt-5">
            <button onClick={goBack} className="flex-1 rounded-xl border-2 border-input py-3 font-readex font-bold text-sm text-muted-foreground hover:bg-muted transition">
              السابق
            </button>
            <PrimaryButton onClick={() => void submitCompleteProfile()} disabled={busy} className="flex-1 py-3 text-base">
              {completeProfile.isPending ? "جارٍ التسجيل…" : "إنشاء الحساب"}
            </PrimaryButton>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={returnToWelcome}
        className="w-full mt-4 font-readex text-sm font-bold text-burgundy hover:underline transition"
      >
        العودة إلى الشاشة الترحيبية
      </button>
    </Modal>
  );
}
