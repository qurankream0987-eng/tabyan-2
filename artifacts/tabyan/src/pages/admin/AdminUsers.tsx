import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import { InitialsAvatar } from "@/components/CircularUserCard";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_USERS, DEMO_STUDENT_FILE } from "@/lib/demo/admin-core";
import { fmtDate, fmtDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import ReviewVideoPlayer from "@/components/admin/ReviewVideoPlayer";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

type UserRow = {
  id: string; fullName: string; phone: string | null; role: string; isActive: boolean;
  bannedUntil: string | Date | null; banReason: string | null; createdAt: string | Date | null;
  totalJuz?: number; levelName?: string; avgRating?: string; isMufti?: boolean; kycStatus?: string;
};

type StudentFile = {
  user: { id: string; fullName: string; phone: string | null; createdAt: string | Date | null; isActive: boolean };
  student: {
    totalJuz: number; placementTestStatus: string; placementTestVideoUrl: string | null;
    placementPathType?: string | null; schoolStage?: string | null; schoolGrade?: string | null;
    birthDate?: string | null; parentPhone?: string | null; createdAt: string | Date | null;
  };
  currentLevelName: string | null; currentLevelPath: string | null;
  progress: { id: string; status: string; startedAt: string | Date | null; completedAt: string | Date | null; completedJuz: number; completedSessions: number; levelName: string; levelPath: string }[];
  sessions: { id: string; scheduledAt: string | Date; status: string; sessionType: string; durationMinutes: number; teacherName: string; typeLabel: string }[];
};

const PROGRAM_OF_PATH: Record<string, string> = {
  quran: "القرآن الكريم", qiraat: "القرآن الكريم",
  tajweed: "دروس التجويد", tajweed_correction: "دروس التجويد",
  sharia: "الدروس الشرعية",
};
const STAGE_AR: Record<string, string> = { primary: "ابتدائي", middle: "متوسط", high: "ثانوي" };
const PROGRESS_AR: Record<string, string> = { in_progress: "جارٍ", completed: "مكتمل", locked: "مقفل" };

/** بادج حالة المستخدم (نشط / محظور / موقوف) */
function UserStatusBadge({ u }: { u: UserRow }) {
  if (!u.isActive)
    return <span className="inline-flex items-center text-[11px] font-readex font-bold bg-destructive/15 text-destructive px-2.5 py-1 rounded-full whitespace-nowrap">موقوف</span>;
  if (u.bannedUntil && new Date(u.bannedUntil) > new Date())
    return <span className="inline-flex items-center text-[11px] font-readex font-bold bg-destructive/15 text-destructive px-2.5 py-1 rounded-full whitespace-nowrap">محظور</span>;
  return <span className="inline-flex items-center text-[11px] font-readex font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-1 rounded-full whitespace-nowrap">نشط</span>;
}

/** بادج الدور */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    student: { label: "طالب",  cls: "bg-burgundy/10 text-burgundy dark:text-gold" },
    teacher: { label: "معلم",  cls: "bg-gold/20 text-gold-dark dark:text-gold" },
    admin:   { label: "مشرف", cls: "bg-muted text-muted-foreground" },
  };
  const { label, cls } = map[role] ?? { label: role, cls: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex items-center text-[11px] font-readex font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
}

/** صف skeleton لحالة التحميل */
function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="p-4">
          <div className={`skeleton rounded-lg h-4 ${i === 1 ? "w-32" : i === 5 ? "w-20" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const [role, setRole] = useState<"" | "student" | "teacher">("");
  const [query, setQuery] = useState("");
  const { data, isLoading, isError } = trpc.admin.usersList.useQuery(
    { role: role || undefined, query: query || undefined },
    { enabled: !DEMO },
  );
  const [action, setAction] = useState<{ type: "message" | "warn" | "ban" | "delete" | "softDelete"; user: UserRow } | null>(null);
  const [text, setText] = useState("");
  const [hours, setHours] = useState(24);
  const [confirm, setConfirm] = useState("");
  const [fileFor, setFileFor] = useState<UserRow | null>(null);
  const fileQuery = trpc.admin.studentFile.useQuery(
    { studentId: fileFor?.id ?? "" },
    { enabled: !DEMO && !!fileFor && fileFor.role === "student" },
  );
  const file: StudentFile | null = fileFor
    ? (DEMO ? (DEMO_STUDENT_FILE as unknown as StudentFile) : ((fileQuery.data as StudentFile | undefined) ?? null))
    : null;

  const base = (DEMO ? DEMO_USERS : (data ?? [])) as UserRow[];
  const rows = DEMO
    ? base.filter((u) =>
        (!role || u.role === role) &&
        (!query.trim() || u.fullName.includes(query.trim()) || (u.phone ?? "").includes(query.trim())))
    : base;
  const loading = !DEMO && isLoading;
  const hasError = !DEMO && isError;

  /** تصدير النتائج المعروضة حالياً كملف CSV (يفتح في Excel بترميز عربي صحيح) */
  const exportCsv = () => {
    if (!rows.length) { toast("لا توجد نتائج للتصدير", "info"); return; }
    const esc = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s; // تحييد بادئات صيغ Excel (CSV injection)
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ["الاسم", "الهاتف", "الدور", "الحالة", "تاريخ التسجيل"];
    const ROLE_AR: Record<string, string> = { student: "طالب", teacher: "معلم", admin: "مشرف" };
    const lines = rows.map((u) => [
      u.fullName, u.phone ?? "", ROLE_AR[u.role] ?? u.role,
      u.isActive ? "نشط" : "موقوف", u.createdAt ? fmtDate(u.createdAt) : "",
    ].map(esc).join(","));
    // BOM (\uFEFF) لضمان قراءة Excel للعربية بترميز UTF-8
    const blob = new Blob(["\uFEFF" + [header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabyan-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`تم تصدير ${rows.length} سجلاً`, "success");
  };

  const invalidate = () => utils.admin.usersList.invalidate();
  const opts = {
    onSuccess: () => { toast("تم بنجاح", "success"); setAction(null); setText(""); setConfirm(""); invalidate(); },
    onError: (e: { message: string }) => toast(e.message, "error"),
  };
  const userMessage = trpc.admin.userMessage.useMutation(opts);
  const userWarn    = trpc.admin.userWarn.useMutation(opts);
  const userBan     = trpc.admin.userBan.useMutation(opts);
  const userDelete  = trpc.admin.userDelete.useMutation(opts);
  const softDelete  = trpc.admin.teacherSoftDelete.useMutation(opts);

  const run = () => {
    if (!action) return;
    if (DEMO) {
      toast("أنت في وضع العرض التجريبي؛ سجّل دخول مشرف حقيقي لتنفيذ الإجراء على الخادم.", "info");
      return;
    }
    const { type, user } = action;
    if (type === "message")    userMessage.mutate({ userId: user.id, text });
    else if (type === "warn")  userWarn.mutate({ userId: user.id, text });
    else if (type === "ban")   userBan.mutate({ userId: user.id, durationHours: hours, reason: text });
    else if (type === "delete") userDelete.mutate({ userId: user.id, confirm: "حذف" });
    else softDelete.mutate({ userId: user.id });
  };

  const TITLES: Record<string, string> = {
    message: "إرسال رسالة", warn: "تحذير رسمي",
    ban: "حظر مؤقت", delete: "حذف نهائي", softDelete: "إيقاف معلم (حذف ناعم)",
  };

  return (
    <div className="space-y-5 page-enter">
      {/* العنوان */}
      <h1 className="hero-greeting font-amiri text-2xl font-bold">إدارة المستخدمين</h1>

      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-burgundy/5 dark:bg-gold/5 p-4 rounded-2xl border border-burgundy/10 dark:border-gold/10">
        {/* البحث + فلاتر الدور */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          <div className="relative w-full sm:max-w-xs">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف…"
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 pr-10 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold transition"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Icon name="search" size={16} />
            </div>
          </div>
          <div className="flex gap-2">
            {([["", "الكل"], ["student", "طلاب"], ["teacher", "معلمون"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setRole(k)}
                className={`px-4 py-2 rounded-xl font-readex text-sm font-bold transition btn-press ${
                  role === k
                    ? "bg-burgundy text-white dark:bg-gold dark:text-night"
                    : "bg-white dark:bg-card text-foreground border border-border hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* تصدير */}
        <button
          onClick={exportCsv}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-readex text-sm font-bold bg-white dark:bg-card border border-border text-foreground hover:bg-muted transition btn-press shrink-0"
        >
          <Icon name="download" size={16} />
          تصدير CSV
        </button>
      </div>

      {/* حالة الخطأ */}
      {hasError && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-5 py-4 font-readex text-sm text-destructive">
          <Icon name="alert-triangle" size={18} className="shrink-0" />
          <span>تعذّر تحميل المستخدمين. تحقق من الاتصال وأعد المحاولة.</span>
        </div>
      )}

      {/* الجدول */}
      {!hasError && (
        loading ? (
          <GlassCard className="overflow-x-auto p-0">
            <table className="w-full text-sm font-readex">
              <thead>
                <tr className="bg-burgundy/5 dark:bg-white/5 text-burgundy border-b border-border">
                  <th className="p-4 text-right">المستخدم</th>
                  <th className="p-4 text-right">الدور</th>
                  <th className="p-4 text-right hidden sm:table-cell">التفاصيل</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </GlassCard>
        ) : !rows.length ? (
          <EmptyState title="لا نتائج" />
        ) : (
          <GlassCard className="overflow-x-auto p-0">
            <table className="w-full text-sm font-readex">
              <thead>
                <tr className="bg-burgundy/5 dark:bg-white/5 text-burgundy border-b border-border">
                  <th className="p-4 text-right min-w-[160px]">المستخدم</th>
                  <th className="p-4 text-right">الدور</th>
                  <th className="p-4 text-right hidden sm:table-cell">التفاصيل</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right min-w-[120px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition">
                    {/* المستخدم */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={u.fullName} size={36} />
                        <div className="min-w-0">
                          <div className="font-bold truncate">{u.fullName}</div>
                          <div className="text-[11px] text-muted-foreground" dir="ltr">{u.phone ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    {/* الدور */}
                    <td className="p-3">
                      <RoleBadge role={u.role} />
                    </td>
                    {/* التفاصيل — تختفي على الشاشات الصغيرة */}
                    <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[180px]">
                      <span className="line-clamp-2">
                        {u.role === "student"
                          ? `${u.levelName ?? "—"} · ${u.totalJuz ?? 0} جزء`
                          : u.role === "teacher"
                          ? `تقييم ${u.avgRating ?? "—"}${u.isMufti ? " · مفتٍ" : ""} · ${u.kycStatus === "approved" ? "موثّق" : (u.kycStatus ?? "—")}`
                          : "—"}
                      </span>
                    </td>
                    {/* الحالة */}
                    <td className="p-3">
                      <UserStatusBadge u={u} />
                    </td>
                    {/* الإجراءات */}
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.role === "student" && (
                          <button
                            title="ملف الطالب"
                            onClick={() => setFileFor(u)}
                            className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 text-burgundy flex items-center justify-center transition"
                          >
                            <Icon name="id-card" size={15} />
                          </button>
                        )}
                        <button
                          title="رسالة"
                          onClick={() => setAction({ type: "message", user: u })}
                          className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 text-burgundy flex items-center justify-center transition"
                        >
                          <Icon name="mail" size={15} />
                        </button>
                        <button
                          title="تحذير"
                          onClick={() => setAction({ type: "warn", user: u })}
                          className="w-8 h-8 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold-dark dark:text-gold flex items-center justify-center transition"
                        >
                          <Icon name="alert-triangle" size={15} />
                        </button>
                        <button
                          title="حظر"
                          onClick={() => setAction({ type: "ban", user: u })}
                          className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition"
                        >
                          <Icon name="ban" size={15} />
                        </button>
                        {u.role === "teacher" ? (
                          <button
                            title="إيقاف ناعم"
                            onClick={() => setAction({ type: "softDelete", user: u })}
                            className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition"
                          >
                            <Icon name="pause" size={15} />
                          </button>
                        ) : (
                          <button
                            title="حذف"
                            onClick={() => setAction({ type: "delete", user: u })}
                            className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )
      )}

      {/* Modal الإجراءات */}
      <Modal open={!!action} onClose={() => { setAction(null); setText(""); setConfirm(""); }}>
        {action && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-amiri text-xl text-burgundy">{TITLES[action.type]}</h3>
              <p className="font-readex text-sm text-muted-foreground mt-1">
                {action.user.fullName}
                {action.user.phone && <> — <span dir="ltr">{action.user.phone}</span></>}
              </p>
            </div>

            {["message", "warn", "ban"].includes(action.type) && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={
                  action.type === "message" ? "نص الرسالة…"
                  : action.type === "warn"    ? "نص التحذير (يظهر للمستخدم)…"
                  :                            "سبب الحظر…"
                }
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              />
            )}

            {action.type === "ban" && (
              <div>
                <label className="font-readex text-xs font-bold block mb-1.5">مدة الحظر (بالساعات)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  min={1}
                  value={hours}
                  onChange={(e) => setHours(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))}
                  dir="ltr"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            )}

            {action.type === "delete" && (
              <div className="space-y-2">
                <p className="font-readex text-sm text-destructive flex items-start gap-2">
                  <Icon name="alert-triangle" size={15} className="shrink-0 mt-0.5" />
                  حذف نهائي لا يمكن التراجع عنه. اكتب «حذف» للتأكيد:
                </p>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-destructive/40 bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
                />
              </div>
            )}

            {action.type === "softDelete" && (
              <p className="font-readex text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
                سيتم إيقاف حساب المعلم مع الاحتفاظ ببياناته وتسجيلاته.
              </p>
            )}

            <PrimaryButton
              className="w-full"
              disabled={
                (action.type === "delete" && confirm !== "حذف") ||
                (["message", "warn", "ban"].includes(action.type) && text.trim().length < 3)
              }
              onClick={run}
            >
              تأكيد
            </PrimaryButton>
          </div>
        )}
      </Modal>

      {/* Modal ملف الطالب الكامل */}
      <Modal open={!!fileFor} onClose={() => setFileFor(null)} className="max-w-2xl">
        {fileFor && (
          <div className="space-y-4">
            {/* رأس الـModal */}
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <InitialsAvatar name={fileFor.fullName} size={44} />
              <div className="min-w-0">
                <h3 className="font-amiri text-lg text-burgundy font-bold truncate">{fileFor.fullName}</h3>
                <p className="font-readex text-xs text-muted-foreground" dir="ltr">{fileFor.phone ?? "—"}</p>
              </div>
            </div>

            {!file ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton rounded-2xl h-24" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pl-1">
                {/* بيانات الطالب */}
                <section className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-4 space-y-2">
                  <h4 className="font-readex font-bold text-sm text-burgundy">بيانات الطالب</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-readex text-foreground/80">
                    <div>الهاتف: <span dir="ltr" className="text-muted-foreground">{file.user.phone ?? "—"}</span></div>
                    <div>تاريخ الميلاد: <span className="text-muted-foreground">{file.student.birthDate ?? "—"}</span></div>
                    <div>المرحلة: <span className="text-muted-foreground">{file.student.schoolStage ? (STAGE_AR[file.student.schoolStage] ?? file.student.schoolStage) : "—"}</span></div>
                    <div>الصف: <span className="text-muted-foreground">{file.student.schoolGrade ?? "—"}</span></div>
                    <div>هاتف ولي الأمر: <span dir="ltr" className="text-muted-foreground">{file.student.parentPhone ?? "—"}</span></div>
                    <div>تاريخ التسجيل: <span className="text-muted-foreground">{fmtDate(file.user.createdAt)}</span></div>
                  </div>
                </section>

                {/* المستوى والبرنامج */}
                <section className="rounded-2xl bg-gold/10 dark:bg-gold/5 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-readex font-bold text-sm text-burgundy">المستوى والبرنامج</h4>
                    <p className="text-xs font-readex text-foreground/80 mt-1">
                      {file.currentLevelName ? `المستوى: ${file.currentLevelName}` : "لم يُحدد مستوى بعد"}
                      {file.currentLevelPath ? ` — ${PROGRAM_OF_PATH[file.currentLevelPath] ?? file.currentLevelPath}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-readex font-bold px-2.5 py-1 rounded-full bg-burgundy/10 text-burgundy shrink-0 whitespace-nowrap">
                    {file.student.placementTestStatus === "approved" ? "مقبول"
                      : file.student.placementTestStatus === "rejected" ? "مرفوض"
                      : "قيد المراجعة"}
                  </span>
                </section>

                {/* تقدم الطالب */}
                <section className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-4">
                  <h4 className="font-readex font-bold text-sm text-burgundy mb-2.5">تقدم الطالب</h4>
                  {!file.progress.length ? (
                    <p className="text-xs font-readex text-muted-foreground">لا تقدم مسجل بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {file.progress.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs font-readex rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2.5">
                          <span className="font-bold truncate">{p.levelName}</span>
                          <span className="text-muted-foreground shrink-0">{PROGRESS_AR[p.status] ?? p.status} · {p.completedJuz} جزء · {p.completedSessions} حصة</span>
                          <span className="text-muted-foreground shrink-0">{fmtDate(p.startedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* الجدول المرتبط */}
                <section className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-4">
                  <h4 className="font-readex font-bold text-sm text-burgundy mb-2.5">الجدول المرتبط</h4>
                  {!file.sessions.length ? (
                    <p className="text-xs font-readex text-muted-foreground">لا حصص مسجلة بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {file.sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 text-xs font-readex rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2.5">
                          <span className="font-bold shrink-0">{s.typeLabel}</span>
                          <span className="text-muted-foreground truncate">{s.teacherName} · {fmtDateTime(s.scheduledAt)}</span>
                          <StatusBadge status={s.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* الملفات */}
                <section className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-4">
                  <h4 className="font-readex font-bold text-sm text-burgundy mb-2.5">ملفات الطالب</h4>
                  {file.student.placementTestVideoUrl ? (
                    <div>
                      <p className="text-[11px] font-readex text-muted-foreground mb-2">
                        فيديو اختبار التلاوة
                        {file.student.placementPathType
                          ? ` — ${file.student.placementPathType === "tajweed_correction" ? "تصحيح التلاوة" : "القرآن الكريم"}`
                          : ""}
                      </p>
                      <ReviewVideoPlayer
                        videoUrl={file.student.placementTestVideoUrl}
                        title={`فيديو اختبار ${file.user.fullName}`}
                        className="w-full rounded-xl bg-night max-h-56"
                        onError={() => toast("تعذّر تشغيل فيديو الاختبار — تحقق من الملف أو اطلب من الطالب إعادة التسجيل.", "error")}
                      />
                    </div>
                  ) : (
                    <p className="text-xs font-readex text-muted-foreground">لا ملفات مرفوعة</p>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
