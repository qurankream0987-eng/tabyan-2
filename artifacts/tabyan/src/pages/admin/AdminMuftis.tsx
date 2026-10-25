import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminErrorState } from "@/components/admin/AdminUi";
import { AdminButton, AdminEmpty, AdminModal, ChipGroup, ConfirmDialog, FormActions, ListSkeleton, useDirtyState } from "@/components/admin/AdminUi";
import { InitialsAvatar } from "@/components/CircularUserCard";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { FATWA_CATEGORIES } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_MUFTIS, DEMO_MUFTI_STATS, DEMO_TEACHERS } from "@/lib/demo/admin-ops";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const CAT_KEYS = Object.keys(FATWA_CATEGORIES);

export default function AdminMuftis() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const muftis = trpc.admin.muftisList.useQuery(undefined, { enabled: !DEMO });
  const stats = trpc.admin.muftisStats.useQuery(undefined, { enabled: !DEMO });
  const teachers = trpc.admin.teachersList.useQuery(undefined, { enabled: !DEMO });
  const muftisData = DEMO ? DEMO_MUFTIS : (muftis.data ?? []);
  const muftisLoading = !DEMO && muftis.isLoading;
  const statsData = DEMO ? DEMO_MUFTI_STATS : stats.data;
  const teachersData = DEMO ? DEMO_TEACHERS : (teachers.data ?? []);
  const [assignOpen, setAssignOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [maxPending, setMaxPending] = useState("20");
  const [unassignTarget, setUnassignTarget] = useState<{ teacherId: string; fullName: string } | null>(null);
  const dirty = useDirtyState(assignOpen ? { teacherId, cats, maxPending } : null);

  const invalidate = () => { utils.admin.muftisList.invalidate(); utils.admin.muftisStats.invalidate(); };
  const assign = trpc.admin.muftiAssign.useMutation({
    onSuccess: () => { toast("تم تعيين المفتي بنجاح", "success"); setAssignOpen(false); setCats([]); setTeacherId(""); setMaxPending("20"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تعيين المفتي، حاول مرة أخرى"), "error"),
  });
  const unassign = trpc.admin.muftiUnassign.useMutation({
    onSuccess: () => { toast("تم إلغاء تعيين المفتي", "success"); setUnassignTarget(null); invalidate(); },
    onError: (e) => { setUnassignTarget(null); toast(userFacingErrorMessage(e, "تعذر إلغاء تعيين المفتي، حاول مرة أخرى"), "error"); },
  });

  const nonMuftiTeachers = teachersData.filter((t) => !t.isMufti && t.kycStatus === "approved");
  const normalizedMaxPending = normalizeDigits(maxPending).replace(/\D/g, "");
  const maxPendingNumber = Number(normalizedMaxPending);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="mosque" size={24} />المفتون</h1>
        <AdminButton icon="plus" onClick={() => setAssignOpen(true)}>تعيين مفتٍ</AdminButton>
      </div>

      {statsData && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            { v: statsData.totalMuftis, l: "مفتٍ معتمد" },
            { v: statsData.unassigned, l: "بلا إسناد" },
            { v: statsData.pending, l: "قيد الإجابة" },
            { v: statsData.avgStars, l: "متوسط التقييم" },
            { v: `${statsData.avgAnswerHours}س`, l: "متوسط زمن الإجابة" },
          ].map((s) => (
            <GlassCard key={s.l} className="p-3 text-center">
              <div className="font-amiri text-2xl text-burgundy">{s.v}</div>
              <div className="font-readex text-[11px] text-muted-foreground">{s.l}</div>
            </GlassCard>
          ))}
        </div>
      )}

      {!DEMO && (muftis.isError || stats.isError || teachers.isError) ? <AdminErrorState onRetry={() => { void muftis.refetch(); void stats.refetch(); void teachers.refetch(); }} /> : muftisLoading ? <ListSkeleton rows={4} /> :
       !muftisData.length ? <AdminEmpty icon="mosque" title="لا مفتين بعد" description="عيّن أول مفتٍ من معلميك الموثّقين." action={<AdminButton icon="plus" onClick={() => setAssignOpen(true)}>تعيين مفتٍ</AdminButton>} /> : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {muftisData.map((m) => (
            <GlassCard key={m.teacherId} className="p-4">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={m.fullName} />
                <div className="flex-1">
                  <div className="font-readex font-bold">{m.fullName}</div>
                  <div className="text-[11px] text-muted-foreground font-readex flex items-center gap-1">
                    معلق: {m.pending}/{m.maxPending} · أجاب: {m.answered} · <Icon name="star" size={11} className="text-gold-dark dark:text-gold" /> {m.avgStars}
                  </div>
                </div>
                 <AdminButton variant="ghost" className="shrink-0 text-destructive hover:bg-destructive/10 dark:text-destructive"
                   loading={unassign.isPending && unassignTarget?.teacherId === m.teacherId}
                   onClick={() => (DEMO ? blocked() : setUnassignTarget({ teacherId: m.teacherId, fullName: m.fullName }))}>
                   إلغاء التعيين
                 </AdminButton>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.categories.map((c) => (
                  <span key={c.id} className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{c.categoryLabel}</span>
                ))}
              </div>
              {m.pending >= m.maxPending && (
                <div className="mt-2 text-[11px] font-readex text-destructive flex items-center gap-1.5"><Icon name="alert-triangle" size={13} className="shrink-0" />وصل الحد الأقصى — لا يمكن إسناد المزيد</div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <AdminModal open={assignOpen} onClose={() => setAssignOpen(false)} dirty={dirty} busy={assign.isPending} title="تعيين مفتٍ جديد" subtitle="من المعلمين الموثّقين غير المعيّنين"
        footer={(requestClose) => <FormActions onCancel={requestClose} primaryLabel="تعيين" loading={assign.isPending}
          disabled={!teacherId || !cats.length || !Number.isInteger(maxPendingNumber) || maxPendingNumber < 1 || maxPendingNumber > 50}
          onPrimary={() => (DEMO ? blocked() : assign.mutate({ teacherId, categories: cats as never, maxPending: maxPendingNumber }))} />}>
        <div className="space-y-4">
          <label className="block font-readex text-xs font-bold">المعلم <span className="text-destructive">*</span>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} data-autofocus
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold">
              <option value="">اختر معلماً…</option>
              {nonMuftiTeachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}</option>)}
            </select>
          </label>
          <ChipGroup label="التصنيفات *" multiple options={CAT_KEYS.map((k) => ({ value: k, label: FATWA_CATEGORIES[k] }))} value={cats} onChange={(value) => setCats(value as string[])}
            helper="لا تُسند إليه إلا أسئلة هذه التصنيفات" />
          <label className="block font-readex text-xs font-bold">الحد الأقصى للأسئلة المعلقة
            <input type="text" inputMode="numeric" minLength={1} maxLength={3} value={maxPending}
              onChange={(e) => setMaxPending(normalizeDigits(e.target.value).replace(/\D/g, ""))} dir="ltr"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">بين 1 و50</span>
          </label>
        </div>
      </AdminModal>
      <ConfirmDialog open={!!unassignTarget} title="إلغاء تعيين هذا المفتي؟" itemName={unassignTarget?.fullName} confirmLabel="إلغاء التعيين" loading={unassign.isPending}
        impact="سيُلغى تعيينه من كل التصنيفات، ولن تُسند إليه فتاوى جديدة. الفتاوى المسندة حالياً تبقى كما هي."
        onCancel={() => setUnassignTarget(null)} onConfirm={() => unassignTarget && unassign.mutate({ teacherId: unassignTarget.teacherId })} />
    </div>
  );
}
