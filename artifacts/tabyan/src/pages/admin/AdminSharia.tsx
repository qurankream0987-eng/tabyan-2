import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_SHARIA_LEVELS } from "@/lib/demo/student-core";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const INPUT = "w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm";
const SHARIA_SESSION_TYPES = ["sharia_aqeedah", "sharia_fiqh", "sharia_seerah"] as const;
const FALLBACK_SUBJECTS: ReadonlyArray<readonly [string, string]> = [
  ["aqeedah", "العقيدة"], ["fiqh", "الفقه"], ["seerah", "السيرة النبوية"],
];
const DAY_SHORT: Record<string, string> = {
  sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء",
  thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
};

type Subject = {
  id: string; key: string; name: string; description: string | null;
  icon: string | null; color: string | null; orderIndex: number; isActive: boolean; levelCount: number;
};
type LevelRow = {
  id: number; name: string; nameEn: string | null; path: string;
  orderIndex: number; isActive: boolean; isHidden: boolean;
};
type ScheduleRow = {
  id: string; teacherName: string; levelName: string | null; sessionType: string;
  sessionMode: string; maxStudents: number; availableDays: string[]; availableTimes: string[];
  durationMinutes: number; isActive: boolean; isAcceptingBookings: boolean;
  typeLabel?: string; levelId: number | null;
};

type Tab = "subjects" | "levels" | "circles";

/** إدارة الدروس الشرعية — المواد والمستويات والحلقات (Task §11) */
export default function AdminSharia() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<Tab>("subjects");

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2">
          <Icon name="books" size={24} />إدارة الدروس الشرعية
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([["subjects", "المواد"], ["levels", "المستويات"], ["circles", "الحلقات"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-readex font-bold transition ${tab === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "subjects" && <SubjectsTab DEMO={DEMO} blocked={blocked} toast={toast} utils={utils} />}
      {tab === "levels" && <LevelsTab DEMO={DEMO} blocked={blocked} toast={toast} utils={utils} />}
      {tab === "circles" && <CirclesTab DEMO={DEMO} blocked={blocked} toast={toast} utils={utils} />}
    </div>
  );
}

type TabProps = {
  DEMO: boolean;
  blocked: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  utils: ReturnType<typeof trpc.useUtils>;
};

/* ---------------- Tab 1 — المواد ---------------- */
function SubjectsTab({ DEMO, blocked, toast, utils }: TabProps) {
  const q = trpc.sharia.adminListSubjects.useQuery(undefined, { enabled: !DEMO });
  const subjects: Subject[] = (q.data as Subject[] | undefined) ?? [];
  const isLoading = !DEMO && q.isLoading;

  const [edit, setEdit] = useState<Partial<Subject> | null>(null);
  const [del, setDel] = useState<Subject | null>(null);
  const [confirm, setConfirm] = useState("");

  const invalidate = () => utils.sharia.adminListSubjects.invalidate();
  const upsert = trpc.sharia.adminUpsertSubject.useMutation({
    onSuccess: () => { toast(edit?.id ? "حُدّثت المادة" : "أُضيفت المادة", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.sharia.adminDeleteSubject.useMutation({
    onSuccess: () => { toast("حُذفت المادة", "success"); setDel(null); setConfirm(""); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const save = () => {
    if (DEMO) return blocked();
    if (!edit?.key?.trim()) return toast("المفتاح مطلوب", "error");
    if (!/^[a-z0-9_]+$/.test(edit.key)) return toast("المفتاح بأحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط", "error");
    if (!edit.name?.trim()) return toast("الاسم مطلوب", "error");
    if (edit.color && !/^#[0-9A-Fa-f]{6}$/.test(edit.color)) return toast("اللون بصيغة HEX مثل ‎#800020", "error");
    upsert.mutate({
      id: edit.id,
      key: edit.key,
      name: edit.name,
      description: edit.description ?? null,
      color: edit.color ? edit.color : null,
      orderIndex: edit.orderIndex ?? subjects.length,
      isActive: edit.isActive ?? true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PrimaryButton onClick={() => setEdit({ orderIndex: subjects.length, isActive: true })}>＋ إضافة مادة</PrimaryButton>
      </div>

      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !subjects.length ? <EmptyState title="لا مواد بعد" hint="أضف مادة شرعية للبدء" /> : (
        <div className="grid gap-2">
          {subjects.map((s) => (
            <GlassCard key={s.id} className={`p-3 flex items-center gap-3 ${s.isActive ? "" : "opacity-60"}`}>
              <span className="w-4 h-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: s.color ?? "#800020" }} />
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate flex items-center gap-2 flex-wrap">
                  {s.name}
                  <span className="text-[10px] font-normal rounded-md bg-burgundy/10 text-burgundy px-1.5 py-0.5 font-mono">{s.key}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{s.levelCount} مستويات</span>
                </div>
                {s.description && <div className="text-[11px] text-muted-foreground font-readex truncate">{s.description}</div>}
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                <span className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold flex items-center ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                  {s.isActive ? "مفعّلة" : "معطّلة"}
                </span>
                <button onClick={() => setEdit(s)} className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center text-burgundy"><Icon name="edit" size={15} /></button>
                <button onClick={() => { setDel(s); setConfirm(""); }} className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"><Icon name="trash" size={15} /></button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* إضافة/تعديل مادة */}
      <Modal open={!!edit} onClose={() => setEdit(null)} className="max-w-xl">
        {edit && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">{edit.id ? "تعديل مادة" : "إضافة مادة"}</h3>
            <label className="font-readex text-xs text-muted-foreground block">المفتاح (أحرف إنجليزية صغيرة)
              <input value={edit.key ?? ""} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, key: e.target.value })} placeholder="aqeedah" className={`mt-1 font-mono ${INPUT} disabled:opacity-60`} />
            </label>
            <label className="font-readex text-xs text-muted-foreground block">الاسم
              <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="اسم المادة *" className={`mt-1 ${INPUT}`} />
            </label>
            <label className="font-readex text-xs text-muted-foreground block">الوصف
              <textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value || null })} placeholder="وصف اختياري" className={`mt-1 ${INPUT}`} rows={2} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="font-readex text-xs text-muted-foreground">اللون (HEX)
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-9 h-9 rounded-lg shrink-0 border border-black/10" style={{ backgroundColor: edit.color && /^#[0-9A-Fa-f]{6}$/.test(edit.color) ? edit.color : "#800020" }} />
                  <input value={edit.color ?? ""} onChange={(e) => setEdit({ ...edit, color: e.target.value || null })} placeholder="#800020" className={`font-mono ${INPUT}`} />
                </div>
              </label>
              <label className="font-readex text-xs text-muted-foreground">الترتيب
                 <input type="text" inputMode="numeric" minLength={1} value={edit.orderIndex ?? 0} onChange={(e) => setEdit({ ...edit, orderIndex: Number(normalizeDigits(e.target.value).replace(/\D/g, "")) })} className={`mt-1 ${INPUT}`} />
              </label>
            </div>
            <label className="flex items-center gap-2 font-readex text-sm">
              <input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
              مفعّلة
            </label>
            <PrimaryButton className="w-full" onClick={save} disabled={upsert.isPending}>حفظ</PrimaryButton>
          </div>
        )}
      </Modal>

      {/* تأكيد الحذف */}
      <Modal open={!!del} onClose={() => setDel(null)}>
        {del && (
          <div className="space-y-3 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><Icon name="alert-triangle" size={28} /></div>
            <p className="font-readex font-bold">حذف مادة «{del.name}» نهائياً؟</p>
            <p className="font-readex text-xs text-muted-foreground">لا يمكن حذف مادة تحتوي مستويات — احذف مستوياتها أولاً أو أوقف تفعيلها. اكتب «حذف»:</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-destructive/40 bg-background px-4 py-2.5 font-readex text-sm" />
            <PrimaryButton className="w-full bg-destructive" disabled={confirm !== "حذف" || remove.isPending} onClick={() => DEMO ? blocked() : remove.mutate({ id: del.id })}>حذف نهائي</PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Tab 2 — المستويات ---------------- */
function LevelsTab({ DEMO, blocked, toast, utils }: TabProps) {
  const subjectsQ = trpc.sharia.adminListSubjects.useQuery(undefined, { enabled: !DEMO });
  const subjectPairs: ReadonlyArray<readonly [string, string]> =
    !DEMO && subjectsQ.data?.length
      ? (subjectsQ.data as Subject[]).map((s) => [s.key, s.name] as const)
      : FALLBACK_SUBJECTS;
  const [subjectKey, setSubjectKey] = useState<string>(subjectPairs[0]?.[0] ?? "aqeedah");

  const q = trpc.admin.levelsList.useQuery(undefined, { enabled: !DEMO });
  // وضع العرض: مستويات شرعية من بيانات العرض (لا يوجد لها مصدر في admin-ops)
  const demoLevels: LevelRow[] = DEMO_SHARIA_LEVELS.map((l, i) => ({
    id: Number(l.id), name: l.name, nameEn: l.nameEn ?? null, path: "sharia", orderIndex: i, isActive: true, isHidden: false,
  }));
  const all: LevelRow[] = DEMO ? demoLevels : ((q.data as LevelRow[] | undefined) ?? []);
  const isLoading = !DEMO && q.isLoading;

  const levels = all
    .filter((l) => l.path === "sharia" && l.nameEn === subjectKey)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const reorder = trpc.sharia.adminReorderLevels.useMutation({
    onSuccess: () => utils.admin.levelsList.invalidate(),
    onError: (e) => toast(e.message, "error"),
  });

  const move = (idx: number, dir: -1 | 1) => {
    if (DEMO) return blocked();
    if (reorder.isPending) return;
    const other = idx + dir;
    if (other < 0 || other >= levels.length) return;
    const ids = levels.map((l) => l.id);
    [ids[idx], ids[other]] = [ids[other], ids[idx]];
    reorder.mutate({ subjectKey, levelIds: ids });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {subjectPairs.map(([k, l]) => (
          <button key={k} onClick={() => setSubjectKey(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-readex font-bold transition ${subjectKey === k ? "bg-gold text-night" : "bg-gold/15 text-burgundy"}`}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !levels.length ? <EmptyState title="لا مستويات لهذه المادة" /> : (
        <div className="grid gap-2">
          {levels.map((l, i) => (
            <GlassCard key={l.id} className={`p-3 flex items-center gap-3 ${l.isHidden || !l.isActive ? "opacity-60" : ""}`}>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0 || reorder.isPending} title="تقديم"
                  className="w-7 h-6 rounded-md bg-burgundy/10 disabled:opacity-30 flex items-center justify-center text-burgundy">
                  <span className="inline-block rotate-90"><Icon name="arrow-left" size={12} /></span>
                </button>
                <button onClick={() => move(i, 1)} disabled={i === levels.length - 1 || reorder.isPending} title="تأخير"
                  className="w-7 h-6 rounded-md bg-burgundy/10 disabled:opacity-30 flex items-center justify-center text-burgundy">
                  <span className="inline-block -rotate-90"><Icon name="arrow-left" size={12} /></span>
                </button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0 text-burgundy font-readex text-xs font-extrabold">{l.orderIndex}</div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate">{l.name}</div>
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                <span className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold flex items-center ${l.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                  {l.isActive ? "مفعّل" : "معطّل"}
                </span>
                <span className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold flex items-center ${l.isHidden ? "bg-muted text-muted-foreground" : "bg-burgundy/10 text-burgundy"}`}>
                  {l.isHidden ? "مخفي" : "ظاهر"}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <p className="font-readex text-xs text-muted-foreground">
        لتعديل اسم المستوى أو حذفه أو إضافة مستوى جديد استخدم{" "}
        <Link to="/admin/levels" className="font-bold text-burgundy underline decoration-gold/50 underline-offset-4 hover:decoration-gold">صفحة «إدارة المستويات»</Link>
      </p>
    </div>
  );
}

/* ---------------- Tab 3 — الحلقات ---------------- */
function CirclesTab({ DEMO, blocked, toast, utils }: TabProps) {
  const q = trpc.admin.schedulesList.useQuery(undefined, { enabled: !DEMO });
  const all: ScheduleRow[] = (q.data as ScheduleRow[] | undefined) ?? [];
  const isLoading = !DEMO && q.isLoading;

  const rows = all.filter((s) => (SHARIA_SESSION_TYPES as readonly string[]).includes(s.sessionType));

  const toggle = trpc.admin.scheduleBookingToggle.useMutation({
    onSuccess: () => { toast("حُدّثت حالة التسجيل", "success"); utils.admin.schedulesList.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const doToggle = (s: ScheduleRow) => {
    if (DEMO) return blocked();
    toggle.mutate({ scheduleId: s.id, accepting: !s.isAcceptingBookings });
  };

  return (
    <div className="space-y-4">
      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !rows.length ? <EmptyState title="لا حلقات شرعية بعد" hint="أنشئ جداول للمعلمين من صفحة «الجداول والمواعيد»" /> : (
        <div className="grid gap-2">
          {rows.map((s) => (
            <GlassCard key={s.id} className={`p-3 flex items-center gap-3 ${s.isActive ? "" : "opacity-60"}`}>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate flex items-center gap-2 flex-wrap">
                  {s.teacherName}
                  <span className="text-[10px] font-normal rounded-md bg-gold/15 text-burgundy px-1.5 py-0.5">{s.typeLabel ?? s.sessionType}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{s.levelName ?? "عام"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-readex flex flex-wrap gap-x-2">
                  <span>{s.availableDays.map((d) => DAY_SHORT[d] ?? d).join("، ")}</span>
                  {s.availableTimes.length > 0 && <span>· {s.availableTimes.join("، ")}</span>}
                  <span>· {s.sessionMode === "group" ? "جماعية" : "فردية"}</span>
                  <span>· {s.maxStudents} طالب</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end items-center">
                <span className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold flex items-center ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                  {s.isActive ? "مفعّلة" : "معطّلة"}
                </span>
                <button onClick={() => doToggle(s)} disabled={toggle.isPending}
                  className={`px-3 h-8 rounded-lg text-[11px] font-readex font-bold disabled:opacity-50 ${s.isAcceptingBookings ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-gold text-night hover:bg-gold/90"}`}>
                  {s.isAcceptingBookings ? "إغلاق التسجيل" : "فتح التسجيل"}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
