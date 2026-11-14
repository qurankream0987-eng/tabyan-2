import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminButton, AdminDrawer, AdminEmpty, AdminErrorState, ConfirmDialog, ListSkeleton } from "@/components/admin/AdminUi";
import StatusBadge from "@/components/StatusBadge";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_QIRAAT } from "@/lib/demo/admin-core";

export default function AdminQiraat() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const { data, isLoading, isError, refetch } = trpc.admin.qiraatList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{ id: string; studentName: string; certificateUrl: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const review = trpc.admin.qiraatReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة", "success"); setSel(null); setNotes(""); utils.admin.qiraatList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ مراجعة الإجازة، حاول مرة أخرى."), "error"),
  });

  const rows: { id: string; studentName: string; certificateUrl: string; status: string; hoursAgo: number; createdAt: string | Date | null }[] =
    DEMO ? DEMO_QIRAAT : (data ?? []);
  const loading = !DEMO && isLoading;

  const decide = (approve: boolean) => {
    if (!sel) return;
    if (DEMO) {
      toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
      setSel(null); setNotes("");
      return;
    }
    if (!approve && notes.trim().length < 10) {
      toast("اكتب سبب الرفض في خانة الملاحظات (10 أحرف على الأقل)، ثم اضغط رفض.", "error");
      return;
    }
    review.mutate({ certId: sel.id, approve, notes: notes || undefined });
  };

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="mosque" size={24} />شهادات الإجازة</h1>
        <p className="font-readex text-xs text-muted-foreground">بوابة مسار القراءات — لا دخول إلا بإجازة الشاطبية موثّقة</p>
      </div>
      {!DEMO && isError ? <AdminErrorState onRetry={() => void refetch()} /> : loading ? <ListSkeleton rows={4} /> :
       !rows.length ? <AdminEmpty icon="certificate" title="لا شهادات مرفوعة" /> : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((c) => (
            <GlassCard key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-readex font-bold">{c.studentName}</div>
                  <div className="text-[11px] text-muted-foreground font-readex">{fmtDateTime(c.createdAt)} · منذ {c.hoursAgo} س</div>
                  <div className="mt-1"><StatusBadge status={c.status} /></div>
                </div>
                {c.status === "pending" && (
                  <AdminButton icon="certificate" onClick={() => { setSel({ id: c.id, studentName: c.studentName, certificateUrl: c.certificateUrl }); setNotes(""); }}>مراجعة</AdminButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <AdminDrawer open={!!sel} onClose={() => setSel(null)} busy={review.isPending} title="مراجعة شهادة الإجازة" subtitle={sel?.studentName}
        footer={<>
          <AdminButton variant="danger" loading={review.isPending && review.variables?.approve === false}
            onClick={() => (notes.trim().length < 10 ? toast("اكتب سبب الرفض في خانة الملاحظات (10 أحرف على الأقل)، ثم اضغط رفض.", "error") : setConfirming("reject"))}>رفض</AdminButton>
          <AdminButton icon="check" loading={review.isPending && review.variables?.approve === true} onClick={() => setConfirming("approve")}>اعتماد</AdminButton>
        </>}>
        {sel && (
          <div className="space-y-3">
            <a href={sel.certificateUrl} target="_blank" rel="noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-burgundy/10 font-readex text-sm font-bold text-burgundy transition hover:bg-burgundy/20 dark:text-gold">
              <Icon name="certificate" size={16} />فتح الشهادة للمعاينة<Icon name="external-link" size={14} />
            </a>
            <label className="block font-readex text-xs font-bold">ملاحظات المراجعة
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} data-autofocus
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">مطلوبة عند الرفض (10 أحرف على الأقل) — تصل للطالب</span>
            </label>
          </div>
        )}
      </AdminDrawer>
      <ConfirmDialog open={confirming === "approve"} tone="primary" title="اعتماد شهادة الإجازة؟" itemName={sel?.studentName} impact="ستُعتمد الإجازة ويُفتح للطالب مسار القراءات."
        confirmLabel="اعتماد" loading={review.isPending} onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); decide(true); }} />
      <ConfirmDialog open={confirming === "reject"} title="رفض شهادة الإجازة؟" itemName={sel?.studentName} impact="ستُرفض الشهادة ويصل الطالب سبب الرفض المكتوب."
        confirmLabel="رفض" loading={review.isPending} onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); decide(false); }} />
    </div>
  );
}
