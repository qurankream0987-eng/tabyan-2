import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminErrorState } from "@/components/admin/AdminUi";
import { ActionMenu, AdminButton, AdminEmpty, AdminModal, ConfirmDialog, FormActions, IconAction, ListSkeleton, SwitchField, useDirtyState } from "@/components/admin/AdminUi";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { authStore } from "@/lib/auth";
import { DEMO_LEVELS } from "@/lib/demo/admin-ops";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

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
  const [pendingId, setPendingId] = useState<number | null>(null);
  const dirty = useDirtyState(edit);

  const invalidate = () => { utils.admin.levelsList.invalidate(); utils.admin.levelThresholds.invalidate(); };
  const create = trpc.admin.levelCreate.useMutation({
    onSuccess: () => { toast("أُضيف المستوى", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ العملية، حاول مرة أخرى."), "error"),
  });
  const update = trpc.admin.levelUpdate.useMutation({
    onSuccess: () => { toast("حُدّث المستوى", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ العملية، حاول مرة أخرى."), "error"),
  });
  // Row toggles use their own mutation so only the touched row shows loading.
  const toggle = trpc.admin.levelUpdate.useMutation({
    onMutate: (v) => setPendingId(v.id),
    onSuccess: () => { toast("حُدّث المستوى", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تحديث المستوى، حاول مرة أخرى."), "error"),
    onSettled: () => setPendingId(null),
  });
  const remove = trpc.admin.levelDelete.useMutation({
    onSuccess: () => { toast("حُذف المستوى", "success"); setDel(null); invalidate(); },
    onError: (e) => { setDel(null); toast(userFacingErrorMessage(e, "تعذر حذف المستوى، حاول مرة أخرى."), "error"); },
  });
  const swap = trpc.admin.levelSwap.useMutation({
    onMutate: (v) => setPendingId(v.idA),
    onSettled: () => setPendingId(null),
    onSuccess: () => { toast("أُعيد ترتيب المستويات", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ العملية، حاول مرة أخرى."), "error"),
  });

  const quickUpdate = (id: number, patch: Record<string, unknown>) => {
    if (DEMO) return blocked();
    toggle.mutate({ id, ...patch } as never);
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
        <AdminButton icon="plus" onClick={() => setEdit({ orderIndex: levels.length + 1, sessionsCount: 5, requiredJuz: 0, requiredSessions: 0, requiresIjazah: false, isActive: true, isHidden: false })}>إضافة مستوى</AdminButton>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="المسار">
        {PATHS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={path === k} onClick={() => setPath(k)}
            className={`min-h-[40px] px-4 rounded-full text-xs font-readex font-bold transition ${path === k ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/10 text-burgundy dark:text-gold"}`}>
            {l}
          </button>
        ))}
      </div>

      {!DEMO && (q.isError || subjectsQ.isError) ? <AdminErrorState onRetry={() => { void q.refetch(); void subjectsQ.refetch(); }} /> : isLoading ? <ListSkeleton className="lg:grid-cols-1" rows={4} /> :
       !levels.length ? <AdminEmpty icon="graduation" title="لا مستويات في هذا المسار" description="أضف مستوى ليظهر للطلاب في هذا المسار." /> : (
        <div className="grid grid-cols-1 gap-2">
          {levels.map((l, i) => (
            <GlassCard key={l.id} className={`p-3 flex items-center gap-3 ${l.isHidden || !l.isActive ? "opacity-60" : ""}`}>
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
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <span className={`hidden rounded-full px-2.5 py-1 font-readex text-[11px] font-bold sm:inline ${l.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>{l.isActive ? "مفعّل" : "معطّل"}</span>
                {l.isHidden ? <span className="hidden rounded-full bg-muted px-2.5 py-1 font-readex text-[11px] font-bold text-muted-foreground sm:inline">مخفي</span> : null}
                <IconAction icon="edit" label={`تعديل ${l.name}`} onClick={() => setEdit(l)} />
                <ActionMenu label={`خيارات ${l.name}`} loading={pendingId === l.id} actions={[
                  ...(i > 0 ? [{ key: "up", label: "تقديم في الترتيب", icon: "chevron-right" as const, disabled: swap.isPending, onSelect: () => move(l, -1) }] : []),
                  ...(i < levels.length - 1 ? [{ key: "down", label: "تأخير في الترتيب", icon: "chevron-left" as const, disabled: swap.isPending, onSelect: () => move(l, 1) }] : []),
                  { key: "active", label: l.isActive ? "تعطيل المستوى" : "تفعيل المستوى", icon: l.isActive ? "pause" as const : "play" as const, onSelect: () => quickUpdate(l.id, { isActive: !l.isActive }) },
                  { key: "hidden", label: l.isHidden ? "إظهار للطلاب" : "إخفاء عن الطلاب", icon: l.isHidden ? "eye" as const : "eye-off" as const, onSelect: () => quickUpdate(l.id, { isHidden: !l.isHidden }) },
                  { key: "delete", label: "حذف المستوى", icon: "trash" as const, danger: true, onSelect: () => (DEMO ? blocked() : setDel(l)) },
                ]} />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* إضافة/تعديل مستوى */}
      <AdminModal open={!!edit} onClose={() => setEdit(null)} dirty={dirty} busy={create.isPending || update.isPending}
        title={edit?.id ? "تعديل مستوى" : "إضافة مستوى"} subtitle={PATHS.find(([k]) => k === path)?.[1]}
        footer={(requestClose) => <FormActions onCancel={requestClose} onPrimary={save} loading={create.isPending || update.isPending} primaryLabel={edit?.id ? "حفظ التعديلات" : "إضافة المستوى"} />}>
        {edit && (
          <div className="space-y-3">
            <label className="block font-readex text-xs font-bold">اسم المستوى <span className="text-destructive">*</span>
              <input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-autofocus className={`mt-1 ${INPUT}`} />
            </label>
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
            <SwitchField label="يتطلب إجازة" checked={edit.requiresIjazah ?? false} onChange={(requiresIjazah) => setEdit({ ...edit, requiresIjazah })} />
          </div>
        )}
      </AdminModal>

      <ConfirmDialog open={!!del} title="حذف المستوى نهائياً؟" itemName={del?.name} requireText="حذف" confirmLabel="حذف نهائي" loading={remove.isPending}
        impact="إن وُجدت بيانات مرتبطة بالمستوى (تقدم طلاب أو جلسات أو محتوى أو تقييمات) فسيُرفض الحذف — أخفِه أو عطّله بدلاً من ذلك."
        onCancel={() => setDel(null)} onConfirm={() => del && (DEMO ? blocked() : remove.mutate({ id: del.id }))} />
    </div>
  );
}
