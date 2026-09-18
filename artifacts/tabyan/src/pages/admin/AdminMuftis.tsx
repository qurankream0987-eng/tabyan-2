import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
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

  const invalidate = () => { utils.admin.muftisList.invalidate(); utils.admin.muftisStats.invalidate(); };
  const assign = trpc.admin.muftiAssign.useMutation({
    onSuccess: () => { toast("تم تعيين المفتي بنجاح", "success"); setAssignOpen(false); setCats([]); setTeacherId(""); setMaxPending("20"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تعيين المفتي، حاول مرة أخرى"), "error"),
  });
  const unassign = trpc.admin.muftiUnassign.useMutation({
    onSuccess: () => { toast("تم إلغاء تعيين المفتي", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر إلغاء تعيين المفتي، حاول مرة أخرى"), "error"),
  });

  const nonMuftiTeachers = teachersData.filter((t) => !t.isMufti && t.kycStatus === "approved");
  const normalizedMaxPending = normalizeDigits(maxPending).replace(/\D/g, "");
  const maxPendingNumber = Number(normalizedMaxPending);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="mosque" size={24} />المفتون</h1>
        <PrimaryButton onClick={() => setAssignOpen(true)}>+ تعيين مفتٍ</PrimaryButton>
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

      {muftisLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !muftisData.length ? <EmptyState title="لا مفتين بعد" hint="عيّن أول مفتٍ من معلميك الموثّقين" /> : (
        <div className="grid gap-3 lg:grid-cols-2">
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
                 <button disabled={unassign.isPending} onClick={() => DEMO ? blocked() : unassign.mutate({ teacherId: m.teacherId })}
                   className="text-xs font-readex text-destructive hover:underline shrink-0 disabled:opacity-50">
                   {unassign.isPending ? "جارٍ الإلغاء…" : "إلغاء التعيين"}
                 </button>
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

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)}>
        <div className="space-y-3">
          <h3 className="font-amiri text-xl text-burgundy text-center">تعيين مفتٍ جديد</h3>
          <label className="font-readex text-xs font-bold block">المعلم (موثّق وغير معيّن)</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
            <option value="">اختر معلماً…</option>
            {nonMuftiTeachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}</option>)}
          </select>
          <label className="font-readex text-xs font-bold block">التصنيفات *</label>
          <div className="flex flex-wrap gap-1.5">
            {CAT_KEYS.map((k) => (
              <button key={k} onClick={() => setCats(cats.includes(k) ? cats.filter((c) => c !== k) : [...cats, k])}
                className={`px-3 py-1.5 rounded-full text-xs font-readex transition ${cats.includes(k) ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
                {FATWA_CATEGORIES[k]}
              </button>
            ))}
          </div>
          <div>
            <label className="font-readex text-xs font-bold block mb-1">الحد الأقصى للأسئلة المعلقة</label>
            <input type="text" inputMode="numeric" minLength={1} maxLength={3} value={maxPending}
              onChange={(e) => setMaxPending(normalizeDigits(e.target.value).replace(/\D/g, ""))} dir="ltr"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
          </div>
          <PrimaryButton className="w-full" disabled={!teacherId || !cats.length || !Number.isInteger(maxPendingNumber) || maxPendingNumber < 1 || maxPendingNumber > 50 || assign.isPending} loading={assign.isPending}
            onClick={() => DEMO ? blocked() : assign.mutate({ teacherId, categories: cats as never, maxPending: maxPendingNumber })}>
            {assign.isPending ? "جارٍ تعيين المفتي…" : "تعيين"}
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
