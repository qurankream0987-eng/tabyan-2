import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_LEVELS } from "@/lib/demo/admin-ops";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const PATHS = [["quran", "القرآن"], ["tajweed", "التجويد"], ["qiraat", "القراءات"], ["sharia", "الدروس الشرعية"]] as const;
const SHARIA_SUBJECTS = [["aqeedah", "العقيدة"], ["fiqh", "الفقه"], ["seerah", "السيرة النبوية"]] as const;
const INPUT = "w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm";

type Level = {
  id: number; name: string; nameEn: string | null; path: string; orderIndex: number;
  sessionsCount: number; requiredJuz: number; requiredSessions: number; requiresIjazah: boolean;
  isActive: boolean; isHidden: boolean; aqeedahLevelId: number | null;
};

/** إدارة المستويات — إضافة/تسمية/ترتيب/تفعيل/إخفاء/حذف + ربط متطلب العقيدة بالمستويات القرآنية */
export default function AdminLevels() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [path, setPath] = useState<string>("quran");
  const q = trpc.admin.levelsList.useQuery(undefined, { enabled: !DEMO });
  const all: Level[] = DEMO ? (DEMO_LEVELS as unknown as Level[]) : ((q.data as Level[] | undefined) ?? []);
  const isLoading = !DEMO && q.isLoading;

  const TAJWEED_HIDDEN = ["إتقان التجويد", "تصحيح التلاوة"];
  const TAJWEED_DISPLAY_NAMES: Record<string, string> = {
    "التجويد الأساسي": "المستوى الأول",
    "التجويد المتوسط": "المستوى الثاني",
    "التجويد المتقدم": "المستوى الثالث",
  };
  const levels = all
    .filter((l) => l.path === path)
    .filter((l) => !(l.path === "tajweed" && TAJWEED_HIDDEN.includes(l.name)))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  // متطلب العقيدة الإلزامي للمستويات القرآنية يُربط بالفرع الإلزامي فقط (aqeedah_quran) — لا بالمسار الاختياري
  const aqeedahOptions = all.filter((l) => l.path === "sharia" && l.nameEn === "aqeedah_quran").sort((a, b) => a.orderIndex - b.orderIndex);
  // مواد الدروس الشرعية تُدار من لوحة الإدارة — تُجلب ديناميكياً مع احتياطي ثابت للوضع التجريبي
  const subjectsQ = trpc.sharia.adminListSubjects.useQuery(undefined, { enabled: !DEMO });
  const shariaSubjects: ReadonlyArray<readonly [string, string]> =
    !DEMO && subjectsQ.data?.length
      ? subjectsQ.data.map((s) => [s.key, s.name] as const)
      : SHARIA_SUBJECTS;

  const [edit, setEdit] = useState<Partial<Level> | null>(null);
  const [del, setDel] = useState<Level | null>(null);
  const [confirm, setConfirm] = useState("");

  const invalidate = () => { utils.admin.levelsList.invalidate(); utils.admin.levelThresholds.invalidate(); };
  const create = trpc.admin.levelCreate.useMutation({
    onSuccess: () => { toast("أُضيف المستوى", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const update = trpc.admin.levelUpdate.useMutation({
    onSuccess: () => { toast("حُدّث المستوى", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.admin.levelDelete.useMutation({
    onSuccess: () => { toast("حُذف المستوى", "success"); setDel(null); setConfirm(""); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const swap = trpc.admin.levelSwap.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast(e.message, "error"),
  });

  const quickUpdate = (id: number, patch: Record<string, unknown>) => {
    if (DEMO) return blocked();
    update.mutate({ id, ...patch } as never);
  };

  const move = (l: Level, dir: -1 | 1) => {
    if (DEMO) return blocked();
    if (swap.isPending) return; // منع السباق: تبديل واحد في كل مرة
    const idx = levels.findIndex((x) => x.id === l.id);
    const other = levels[idx + dir];
    if (!other) return;
    swap.mutate({ idA: l.id, idB: other.id });
  };

  const save = () => {
    if (DEMO) return blocked();
    if (!edit?.name?.trim()) return toast("الاسم مطلوب", "error");
    if (edit.id) {
      update.mutate({
        id: edit.id, name: edit.name,
        nameEn: path === "sharia" ? (edit.nameEn ?? undefined) : undefined,
        orderIndex: edit.orderIndex, sessionsCount: edit.sessionsCount,
        requiredJuz: edit.requiredJuz, requiredSessions: edit.requiredSessions,
        requiresIjazah: edit.requiresIjazah,
        aqeedahLevelId: path === "quran" ? (edit.aqeedahLevelId ?? null) : undefined,
      });
    } else {
      create.mutate({
        name: edit.name, path: path as never,
        nameEn: path === "sharia" ? (edit.nameEn ?? undefined) : undefined,
        orderIndex: edit.orderIndex ?? levels.length + 1,
        sessionsCount: edit.sessionsCount ?? 5,
        requiredJuz: edit.requiredJuz ?? 0,
        requiredSessions: edit.requiredSessions ?? 0,
        requiresIjazah: edit.requiresIjazah ?? false,
        aqeedahLevelId: path === "quran" ? (edit.aqeedahLevelId ?? undefined) : undefined,
      });
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="graduation" size={24} />إدارة المستويات</h1>
        <PrimaryButton onClick={() => setEdit({ orderIndex: levels.length + 1, sessionsCount: 5, requiredJuz: 0, requiredSessions: 0, requiresIjazah: false, isActive: true, isHidden: false })}>+ إضافة مستوى</PrimaryButton>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PATHS.map(([k, l]) => (
          <button key={k} onClick={() => setPath(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-readex font-bold transition ${path === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !levels.length ? <EmptyState title="لا مستويات في هذا المسار" /> : (
        <div className="grid gap-2">
          {levels.map((l, i) => (
            <GlassCard key={l.id} className={`p-3 flex items-center gap-3 ${l.isHidden || !l.isActive ? "opacity-60" : ""}`}>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(l, -1)} disabled={i === 0 || swap.isPending} title="تقديم"
                  className="w-7 h-6 rounded-md bg-burgundy/10 disabled:opacity-30 flex items-center justify-center text-burgundy">
                  <span className="inline-block -rotate-90"><Icon name="arrow-left" size={12} /></span>
                </button>
                <button onClick={() => move(l, 1)} disabled={i === levels.length - 1 || swap.isPending} title="تأخير"
                  className="w-7 h-6 rounded-md bg-burgundy/10 disabled:opacity-30 flex items-center justify-center text-burgundy">
                  <span className="inline-block rotate-90"><Icon name="arrow-left" size={12} /></span>
                </button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0 text-burgundy font-readex text-xs font-extrabold">{l.orderIndex}</div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate">
                  {path === "tajweed" ? (TAJWEED_DISPLAY_NAMES[l.name] ?? l.name) : l.name}
                  {l.nameEn && <span className="text-[10px] text-muted-foreground font-normal"> · {shariaSubjects.find((s) => s[0] === l.nameEn)?.[1] ?? l.nameEn}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground font-readex flex flex-wrap gap-x-2">
                  <span>{l.sessionsCount ?? "—"} جلسات</span>
                  {(l.requiredJuz ?? 0) > 0 && <span>· {l.requiredJuz} أجزاء</span>}
                  {l.requiresIjazah && <span>· إجازة</span>}
                  {path === "quran" && <span>· عقيدة: {aqeedahOptions.find((a) => a.id === l.aqeedahLevelId)?.name ?? "—"}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                <button onClick={() => quickUpdate(l.id, { isActive: !l.isActive })} title={l.isActive ? "تعطيل" : "تفعيل"}
                  className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold ${l.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                  {l.isActive ? "مفعّل" : "معطّل"}
                </button>
                <button onClick={() => quickUpdate(l.id, { isHidden: !l.isHidden })} title={l.isHidden ? "إظهار" : "إخفاء"}
                  className={`px-2.5 h-8 rounded-lg text-[11px] font-readex font-bold ${l.isHidden ? "bg-muted text-muted-foreground" : "bg-burgundy/10 text-burgundy"}`}>
                  {l.isHidden ? "مخفي" : "ظاهر"}
                </button>
                <button onClick={() => setEdit(l)} className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center text-burgundy"><Icon name="edit" size={15} /></button>
                <button onClick={() => { setDel(l); setConfirm(""); }} className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"><Icon name="trash" size={15} /></button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* إضافة/تعديل مستوى */}
      <Modal open={!!edit} onClose={() => setEdit(null)} className="max-w-xl">
        {edit && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">{edit.id ? "تعديل مستوى" : "إضافة مستوى"}</h3>
            <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="اسم المستوى *" className={INPUT} />
            {path === "sharia" && (
              <select value={edit.nameEn ?? ""} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value || null })} className={INPUT}>
                <option value="">المادة…</option>
                {shariaSubjects.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="font-readex text-xs text-muted-foreground">الترتيب
                <input type="text" inputMode="numeric" minLength={1} value={edit.orderIndex ?? 1} onChange={(e) => setEdit({ ...edit, orderIndex: Number(normalizeDigits(e.target.value).replace(/\D/g, "")) })} className={`mt-1 ${INPUT}`} />
              </label>
              <label className="font-readex text-xs text-muted-foreground">عدد الجلسات
                <input type="text" inputMode="numeric" minLength={1} value={edit.sessionsCount ?? 5} onChange={(e) => setEdit({ ...edit, sessionsCount: Number(normalizeDigits(e.target.value).replace(/\D/g, "")) })} className={`mt-1 ${INPUT}`} />
              </label>
              <label className="font-readex text-xs text-muted-foreground">الأجزاء المطلوبة
                <input type="text" inputMode="numeric" minLength={1} value={edit.requiredJuz ?? 0} onChange={(e) => setEdit({ ...edit, requiredJuz: Number(normalizeDigits(e.target.value).replace(/\D/g, "")) })} className={`mt-1 ${INPUT}`} />
              </label>
              <label className="font-readex text-xs text-muted-foreground">الجلسات المطلوبة
                <input type="text" inputMode="numeric" minLength={1} value={edit.requiredSessions ?? 0} onChange={(e) => setEdit({ ...edit, requiredSessions: Number(normalizeDigits(e.target.value).replace(/\D/g, "")) })} className={`mt-1 ${INPUT}`} />
              </label>
            </div>
            {path === "quran" && (
              <div>
                <label className="font-readex text-xs font-bold block mb-1">متطلب العقيدة الإلزامي (لا يُكتمل المستوى القرآني قبله)</label>
                <select value={edit.aqeedahLevelId ?? ""} onChange={(e) => setEdit({ ...edit, aqeedahLevelId: e.target.value ? Number(e.target.value) : null })} className={INPUT}>
                  <option value="">بلا متطلب</option>
                  {aqeedahOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 font-readex text-sm">
              <input type="checkbox" checked={edit.requiresIjazah ?? false} onChange={(e) => setEdit({ ...edit, requiresIjazah: e.target.checked })} />
              يتطلب إجازة
            </label>
            <PrimaryButton className="w-full" onClick={save} disabled={create.isPending || update.isPending}>حفظ</PrimaryButton>
          </div>
        )}
      </Modal>

      {/* تأكيد الحذف */}
      <Modal open={!!del} onClose={() => setDel(null)}>
        {del && (
          <div className="space-y-3 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><Icon name="alert-triangle" size={28} /></div>
            <p className="font-readex font-bold">حذف مستوى «{del.name}» نهائياً؟</p>
            <p className="font-readex text-xs text-muted-foreground">إن وُجدت بيانات مرتبطة بالمستوى (تقدم طلاب/جلسات/محتوى/تقييمات) فسيُرفض الحذف — أخفِه أو عطّله بدلاً من ذلك. اكتب «حذف»:</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-destructive/40 bg-background px-4 py-2.5 font-readex text-sm" />
            <PrimaryButton className="w-full bg-destructive" disabled={confirm !== "حذف"} onClick={() => DEMO ? blocked() : remove.mutate({ id: del.id })}>حذف نهائي</PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
