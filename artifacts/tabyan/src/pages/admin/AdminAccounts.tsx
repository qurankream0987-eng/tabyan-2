import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";
import { isValidPersonName, isValidUsername, normalizePersonName, normalizeUsername } from "@workspace/tabyan-trpc/input-normalization";

const PATH_LABELS: Record<string, string> = {
  quran: "حفظ ومراجعة القرآن",
  tajweed_correction: "تصحيح التلاوة",
  qiraat: "القراءات",
  tajweed: "التجويد",
  sharia: "الدروس الشرعية",
};

// ترتيب المسارات المعتمد للطلاب — يظهر بنفس الترتيب في نموذج إنشاء حساب المعلم
const PATH_ORDER = ["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"] as const;

// مواد الدروس الشرعية الاختيارية — تُصنَّف مستويات sharia عبر levels.name_en
const SHARIA_SUBJECTS: { key: string; label: string }[] = [
  { key: "aqeedah", label: "العقيدة" },
  { key: "fiqh", label: "الفقه" },
  { key: "seerah", label: "السيرة النبوية" },
];

const ORDINAL_LEVELS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];

const inputCls =
  "w-full rounded-xl border-2 border-input bg-background px-3 py-1.5 font-readex text-sm leading-5 outline-none focus:border-burgundy dark:focus:border-gold transition";

type CreateErrors = Partial<Record<"fullName" | "username" | "password" | "confirm" | "subject" | "level" | "submit", string>>;

// عرض تجريبي ثابت — لا اتصال بالخادم في وضع العرض
const DEMO_ACCOUNTS = [
  { id: "demo-t", username: "teacher.demo", fullName: "معلم تجريبي", role: "teacher" as const, isActive: true, accountOrigin: "supervisor_created" as const, createdAt: new Date(), kycStatus: "approved" as const, assignedPath: "quran" as const, levelName: "الغرس" },
  { id: "demo-s", username: "supervisor.demo", fullName: "مشرف تجريبي", role: "admin" as const, isActive: true, accountOrigin: "supervisor_created" as const, createdAt: new Date(), kycStatus: null, assignedPath: null, levelName: null },
];

export default function AdminAccounts() {
  const DEMO = authStore.isDemo;
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"teacher" | "supervisor">("teacher");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [path, setPath] = useState<string>("quran");
  const [shariaSubject, setShariaSubject] = useState<string>("aqeedah");
  const [levelId, setLevelId] = useState<number | "">("");
  const [createErrors, setCreateErrors] = useState<CreateErrors>({});
  // إعادة تعيين كلمة السر — نافذة مستقلة لكل حساب
  const [resetTarget, setResetTarget] = useState<{ id: string; username: string | null } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");

  const accounts = trpc.admin.accountsList.useQuery(undefined, { enabled: !DEMO });
  // مستويات المسارات — تُجلب عند فتح نموذج إنشاء معلم فقط
  const levelsQ = trpc.admin.levelsList.useQuery(undefined, { enabled: !DEMO && open && kind === "teacher" });
  const activeLevels = useMemo(() => (levelsQ.data ?? []).filter((l) => l.isActive), [levelsQ.data]);
  // المسارات بترتيبها المعتمد للطلاب — وليس بترتيب وصولها من الخادم
  const availablePaths = useMemo(() => {
    const present = new Set(activeLevels.map((l) => l.path));
    const ordered = PATH_ORDER.filter((p) => present.has(p)) as string[];
    for (const p of present) if (!ordered.includes(p)) ordered.push(p);
    return ordered;
  }, [activeLevels]);
  // مستويات المسار مرتبة حسب order_index — وللدروس الشرعية تُرشَّح حسب المادة (name_en)
  const pathLevels = useMemo(() => {
    let list = activeLevels.filter((l) => l.path === path);
    if (path === "sharia") list = list.filter((l) => l.nameEn === shariaSubject);
    return [...list].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  }, [activeLevels, path, shariaSubject]);
  const levelLabel = (level: (typeof pathLevels)[number], index: number) =>
    path === "tajweed" && ORDINAL_LEVELS[index]
      ? `المستوى ${ORDINAL_LEVELS[index]}`
      : level.name;

  // مصالحة الحالة مع المسارات المتاحة: إن لم يعد المسار المختار موجوداً (مستويات معطلة مثلاً)
  // ننتقل لأول مسار متاح ونمسح اختيار المستوى حتى لا تعرض القائمة قيمة غير مطابقة للحالة
  useEffect(() => {
    if (!open || kind !== "teacher" || levelsQ.isLoading) return;
    if (!availablePaths.length) { setLevelId(""); return; }
    if (!availablePaths.includes(path)) {
      setPath(availablePaths[0]);
      setLevelId("");
      setShariaSubject("aqeedah");
    }
  }, [open, kind, levelsQ.isLoading, availablePaths, path]);

  const invalidate = () => utils.admin.accountsList.invalidate();
  const onErr = (e: { message: string }) => toast(e.message, "error");
  const createSupervisor = trpc.admin.createSupervisor.useMutation({
    onSuccess: (r) => { toast(`أُنشئ حساب المشرف «${r.username}»`, "success"); closeModal(); invalidate(); },
    onError: (e) => setCreateErrors({ submit: e.message }),
  });
  const createTeacher = trpc.admin.createTeacher.useMutation({
    onSuccess: (r) => { toast(`أُنشئ حساب المعلم «${r.username}» واعتمد مباشرة`, "success"); closeModal(); invalidate(); },
    onError: (e) => setCreateErrors({ submit: e.message }),
  });
  const busy = createSupervisor.isPending || createTeacher.isPending;

  const setActive = trpc.admin.accountSetActive.useMutation({
    onSuccess: (_r, v) => { toast(v.isActive ? "نُشِّط الحساب" : "أُوقف الحساب وأُنهيت جلساته", "success"); invalidate(); },
    onError: onErr,
  });
  const resetPassword = trpc.admin.accountResetPassword.useMutation({
    onSuccess: () => { toast("أُعيد تعيين كلمة السر وأُنهيت الجلسات القائمة", "success"); closeReset(); },
    onError: onErr,
  });
  const terminateSessions = trpc.admin.accountTerminateSessions.useMutation({
    onSuccess: () => toast("أُنهيت كل جلسات الحساب", "success"),
    onError: onErr,
  });
  const rowBusy = setActive.isPending || terminateSessions.isPending;

  const closeReset = () => { setResetTarget(null); setNewPassword(""); setNewConfirm(""); };

  const submitReset = () => {
    if (DEMO || !resetTarget) { toast("غير متاح في وضع العرض التجريبي", "info"); return; }
    if (!isNonWhitespacePassword(newPassword)) {
      toast("أدخل كلمة المرور", "error"); return;
    }
    if (newPassword !== newConfirm) { toast("تأكيد كلمة السر غير مطابق", "error"); return; }
    resetPassword.mutate({ userId: resetTarget.id, password: newPassword });
  };

  const onToggleActive = (a: { id: string; isActive: boolean; username: string | null }) => {
    if (DEMO) { toast("غير متاح في وضع العرض التجريبي", "info"); return; }
    if (a.isActive && !window.confirm(`إيقاف حساب «${a.username}»؟ ستُنهى كل جلساته فوراً ولن يستطيع الدخول.`)) return;
    setActive.mutate({ userId: a.id, isActive: !a.isActive });
  };

  const onTerminate = (a: { id: string; username: string | null }) => {
    if (DEMO) { toast("غير متاح في وضع العرض التجريبي", "info"); return; }
    if (!window.confirm(`إنهاء كل جلسات «${a.username}»؟ سيحتاج للدخول من جديد.`)) return;
    terminateSessions.mutate({ userId: a.id });
  };

  const closeModal = () => {
    setOpen(false);
    setFullName(""); setUsername(""); setPassword(""); setConfirm(""); setPath("quran"); setShariaSubject("aqeedah"); setLevelId("");
    setCreateErrors({});
  };

  const submit = () => {
    if (DEMO) { toast("الإنشاء غير متاح في وضع العرض التجريبي", "info"); return; }
    const u = normalizeUsername(username);
    const name = normalizePersonName(fullName);
    const errors: CreateErrors = {};
    if (!isValidPersonName(name)) errors.fullName = "أدخل الاسم الكامل بالعربية أو الإنجليزية (3-50 حرفاً)";
    if (!isValidUsername(u)) errors.username = "اسم المستخدم: يمكن استخدام الحروف العربية أو الإنجليزية والأرقام و _ و - و . (3-30 خانة)";
    if (!isNonWhitespacePassword(password)) {
      errors.password = "أدخل كلمة المرور";
    }
    if (password !== confirm) errors.confirm = "تأكيد كلمة السر غير مطابق";
    if (kind === "teacher" && path === "sharia" && !shariaSubject) errors.subject = "اختر المادة";
    if (kind === "teacher" && levelId === "") errors.level = "اختر المستوى";
    if (Object.keys(errors).length) { setCreateErrors(errors); return; }
    setCreateErrors({});
    if (kind === "supervisor") { createSupervisor.mutate({ username: u, password, fullName: name }); return; }
    if (levelId === "") return;
    createTeacher.mutate({ username: u, password, fullName: name, path: path as "quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia", levelId });
  };

  const rows = DEMO ? DEMO_ACCOUNTS : (accounts.data ?? []);

  return (
    <div className="space-y-5 page-enter">
      {/* رأس الصفحة */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="hero-greeting font-amiri text-2xl font-bold flex items-center gap-2">
            <Icon name="shield" size={22} className="shrink-0" />
            إدارة الحسابات
          </h1>
          <p className="font-readex text-xs text-muted-foreground mt-1">إنشاء حسابات المشرفين والمعلمين المعتمدة مباشرة</p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)} className="px-5 py-2.5 text-sm shrink-0">
          إضافة حساب جديد
        </PrimaryButton>
      </div>

      {/* حالة الخطأ */}
      {!DEMO && accounts.isError && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-5 py-4 font-readex text-sm text-destructive">
          <Icon name="alert-triangle" size={18} className="shrink-0" />
          <span>تعذّر تحميل الحسابات. تحقق من الاتصال وأعد المحاولة.</span>
        </div>
      )}

      {/* حالة التحميل */}
      {!DEMO && accounts.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton rounded-2xl h-28" />
          ))}
        </div>
      ) : !rows.length ? (
        <GlassCard hover={false} className="py-12 text-center">
          <Icon name="shield" size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-readex text-sm text-muted-foreground">لا توجد حسابات منشأة بعد — ابدأ بإضافة حساب جديد</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {rows.map((a) => (
            <GlassCard key={a.id} hover={false} className="p-4">
              {/* معلومات الحساب */}
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-burgundy/8 dark:bg-gold/10 text-burgundy dark:text-gold grid place-items-center shrink-0">
                  <Icon name={a.role === "admin" ? "shield" : "user"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                   <p className="font-readex font-bold text-foreground truncate">{a.fullName ?? a.username}</p>
                   {a.username && <p className="font-readex text-[11px] text-muted-foreground truncate" dir="ltr">@{a.username}</p>}
                  <p className="font-readex text-[11px] text-muted-foreground">
                    {a.role === "admin" ? "مشرف" : "معلم"}
                    {a.role === "teacher" && a.assignedPath && ` · ${PATH_LABELS[a.assignedPath] ?? a.assignedPath}`}
                    {a.role === "teacher" && a.levelName && ` — ${a.levelName}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`font-readex text-[11px] font-bold rounded-full px-2.5 py-0.5 ${a.isActive ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                    {a.isActive ? "نشط" : "موقوف"}
                  </span>
                  <span className="font-readex text-[10px] text-muted-foreground">{fmtDate(a.createdAt)}</span>
                </div>
              </div>

              {/* إجراءات الحساب */}
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onToggleActive(a)}
                  className={`font-readex text-[11px] font-bold rounded-full px-3 py-1.5 border-2 transition btn-press disabled:opacity-50 ${
                    a.isActive
                      ? "border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      : "border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {a.isActive ? "إيقاف الحساب" : "تنشيط الحساب"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (DEMO) { toast("غير متاح في وضع العرض التجريبي", "info"); return; }
                    setResetTarget({ id: a.id, username: a.username });
                  }}
                  className="font-readex text-[11px] font-bold rounded-full px-3 py-1.5 border-2 border-burgundy/30 text-burgundy dark:border-gold/30 dark:text-gold hover:bg-burgundy/8 dark:hover:bg-gold/10 transition btn-press"
                >
                  إعادة تعيين كلمة السر
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onTerminate(a)}
                  className="font-readex text-[11px] font-bold rounded-full px-3 py-1.5 border-2 border-border text-muted-foreground hover:border-burgundy/40 dark:hover:border-gold/40 transition btn-press disabled:opacity-50"
                >
                  إنهاء الجلسات
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={!!resetTarget} onClose={closeReset}>
        <h2 className="font-amiri text-xl text-burgundy font-bold text-center mb-1">إعادة تعيين كلمة السر</h2>
        <p className="font-readex text-xs text-muted-foreground text-center mb-4" dir="ltr">{resetTarget?.username}</p>
        <div className="space-y-3">
          <div>
              <label className="font-readex text-xs font-bold text-muted-foreground block mb-1">كلمة المرور الجديدة</label>
            <input dir="ltr" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="أدخل كلمة المرور الجديدة" autoComplete="new-password" className={inputCls} />
          </div>
          <div>
            <label className="font-readex text-xs font-bold text-muted-foreground block mb-1">تأكيد كلمة السر</label>
            <input dir="ltr" type="password" value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)}
              placeholder="تأكيد كلمة السر الجديدة" autoComplete="new-password" className={inputCls} />
          </div>
          <p className="font-readex text-[11px] text-muted-foreground">ستُنهى الجلسات القائمة لهذا الحساب — سيدخل بكلمة السر الجديدة فقط.</p>
        </div>
        <PrimaryButton onClick={submitReset} disabled={resetPassword.isPending} className="w-full mt-5">
          {resetPassword.isPending ? "جارٍ الحفظ…" : "حفظ كلمة السر الجديدة"}
        </PrimaryButton>
      </Modal>

      <Modal open={open} onClose={closeModal} className="!max-h-[calc(100dvh-2rem)] !translate-y-0 !overflow-hidden !p-4">
        <div className="border-b border-input/60 pb-2 pl-8">
          <h2 className="font-amiri text-lg text-burgundy font-bold text-center">إضافة حساب جديد</h2>
        </div>

        <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain pe-1 pt-3 scrollbar-thin">
          {/* نوع الحساب */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { value: "teacher" as const, title: "معلم", sub: "معتمد مباشرة بلا اختبار قبول" },
              { value: "supervisor" as const, title: "مشرف", sub: "وصول كامل للوحة الإشراف" },
            ]).map((opt) => (
              <button key={opt.value} type="button" onClick={() => { setKind(opt.value); setCreateErrors({}); }}
                className={`rounded-2xl border-2 px-3 py-2 text-center transition-all btn-press ${
                  kind === opt.value
                    ? "border-burgundy bg-burgundy/8 dark:border-gold dark:bg-gold/10"
                    : "border-input bg-white dark:bg-card hover:border-burgundy/40 dark:hover:border-gold/40"
                }`}>
                <p className="font-readex font-bold text-[13px] text-foreground">{opt.title}</p>
                <p className="font-readex text-[10px] leading-4 text-muted-foreground mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">الاسم الكامل</label>
              <input dir="auto" value={fullName} onChange={(e) => { setFullName(e.target.value); setCreateErrors((prev) => ({ ...prev, fullName: undefined, submit: undefined })); }}
                placeholder="محمد أحمد العجمي" autoComplete="name" aria-invalid={Boolean(createErrors.fullName)}
                className={`${inputCls} ${createErrors.fullName ? "border-destructive focus:border-destructive" : ""}`} />
              {createErrors.fullName && <p role="alert" className="font-readex text-[11px] text-destructive mt-1 break-words leading-4">{createErrors.fullName}</p>}
            </div>
            <div>
              <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">اسم المستخدم (فريد — عربي أو إنجليزي)</label>
              <input dir="auto" value={username} onChange={(e) => { setUsername(e.target.value); setCreateErrors((prev) => ({ ...prev, username: undefined, submit: undefined })); }}
                placeholder="محمد_العجمي" autoComplete="off" aria-invalid={Boolean(createErrors.username)}
                className={`${inputCls} ${createErrors.username ? "border-destructive focus:border-destructive" : ""}`} />
              {createErrors.username && <p role="alert" className="font-readex text-[11px] text-destructive mt-1 break-words leading-4">{createErrors.username}</p>}
              {createErrors.submit && <p role="alert" className="font-readex text-[11px] text-destructive mt-1 break-words leading-4">{createErrors.submit}</p>}
            </div>
            <div>
              <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">كلمة المرور</label>
              <input dir="ltr" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setCreateErrors((prev) => ({ ...prev, password: undefined, confirm: undefined, submit: undefined })); }}
                placeholder="أدخل كلمة المرور" autoComplete="new-password" aria-invalid={Boolean(createErrors.password)}
                className={`${inputCls} ${createErrors.password ? "border-destructive focus:border-destructive" : ""}`} />
              {createErrors.password && <p role="alert" className="font-readex text-[11px] text-destructive mt-1 break-words leading-4">{createErrors.password}</p>}
            </div>
            <div>
              <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">تأكيد كلمة السر</label>
              <input dir="ltr" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setCreateErrors((prev) => ({ ...prev, confirm: undefined, submit: undefined })); }}
                placeholder="تأكيد كلمة السر" autoComplete="new-password" aria-invalid={Boolean(createErrors.confirm)}
                className={`${inputCls} ${createErrors.confirm ? "border-destructive focus:border-destructive" : ""}`} />
              {createErrors.confirm && <p role="alert" className="font-readex text-xs text-destructive mt-1 break-words leading-5">{createErrors.confirm}</p>}
            </div>

            {kind === "teacher" && (
              <>
                <div>
                  <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">المسار</label>
                  <select value={path} onChange={(e) => { setPath(e.target.value); setLevelId(""); setShariaSubject("aqeedah"); setCreateErrors((prev) => ({ ...prev, subject: undefined, level: undefined, submit: undefined })); }} className={inputCls}>
                    {availablePaths.map((p) => <option key={p} value={p}>{PATH_LABELS[p] ?? p}</option>)}
                  </select>
                </div>
                {path === "sharia" && (
                  <div>
                    <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">المادة الشرعية</label>
                    <select value={shariaSubject} onChange={(e) => { setShariaSubject(e.target.value); setLevelId(""); setCreateErrors((prev) => ({ ...prev, subject: undefined, level: undefined, submit: undefined })); }}
                      aria-invalid={Boolean(createErrors.subject)} className={`${inputCls} ${createErrors.subject ? "border-destructive focus:border-destructive" : ""}`}>
                      {SHARIA_SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    {createErrors.subject && <p role="alert" className="font-readex text-xs text-destructive mt-1 break-words leading-5">{createErrors.subject}</p>}
                  </div>
                )}
                <div>
                  <label className="font-readex text-[11px] leading-4 font-bold text-muted-foreground block mb-0.5">{path === "sharia" ? "المستوى (تابع للمادة)" : "المستوى (تابع للمسار)"}</label>
                  <select value={levelId} onChange={(e) => { setLevelId(e.target.value ? Number(e.target.value) : ""); setCreateErrors((prev) => ({ ...prev, level: undefined, submit: undefined })); }}
                    aria-invalid={Boolean(createErrors.level)} className={`${inputCls} ${createErrors.level ? "border-destructive focus:border-destructive" : ""}`}>
                    <option value="">— اختر المستوى —</option>
                    {pathLevels.map((l, i) => <option key={l.id} value={l.id}>{levelLabel(l, i)}</option>)}
                  </select>
                  {createErrors.level && <p role="alert" className="font-readex text-xs text-destructive mt-1 break-words leading-5">{createErrors.level}</p>}
                  {!availablePaths.length && !levelsQ.isLoading && (
                    <p className="font-readex text-[11px] text-destructive mt-1 break-words leading-5">لا توجد مستويات نشطة — أنشئها من صفحة «المواد والمستويات» أولاً</p>
                  )}
                </div>
              </>
            )}
          </div>

          <PrimaryButton onClick={submit} disabled={busy} className="w-full mt-3">
            {busy ? "جارٍ الإنشاء…" : kind === "teacher" ? "إنشاء حساب المعلم" : "إنشاء حساب المشرف"}
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
