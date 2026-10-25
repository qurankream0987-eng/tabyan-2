import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminButton, AdminDrawer, AdminErrorState, ConfirmDialog } from "@/components/admin/AdminUi";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { authStore } from "@/lib/auth";
import PrivateMediaPlayer from "@/components/app/PrivateMediaPlayer";
import { DEMO_PROMOTIONS } from "@/lib/demo/admin-core";

export default function AdminPromotions() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const { data, isLoading, isError, refetch } = trpc.admin.promotionsList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{ id: string; studentName: string; videoUrl: string; fromName: string; toName: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const review = trpc.admin.promotionReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة — أُشعر الطالب", "success"); setSel(null); setNotes(""); utils.admin.promotionsList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ مراجعة الترقية، حاول مرة أخرى."), "error"),
  });

  const rows: { id: string; studentName: string; fromName: string; toName: string; videoUrl: string; status: string; hoursAgo: number }[] =
    DEMO ? DEMO_PROMOTIONS : (data ?? []);
  const loading = !DEMO && isLoading;
  const pending = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  const decide = (approve: boolean) => {
    if (!sel || review.isPending) return;
    if (DEMO) {
      toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
      setSel(null); setNotes("");
      return;
    }
    review.mutate({ requestId: sel.id, approve, notes: notes || undefined });
  };

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="trending-up" size={24} />طلبات الترقية</h1>
        <p className="font-readex text-xs text-muted-foreground">شاهد فيديو التلاوة (60 ثانية) وقرر — التوصيات من المعلمين استرشادية فقط</p>
      </div>

      <section>
        <h2 className="font-amiri text-lg text-burgundy mb-2">بانتظار المراجعة ({pending.length})</h2>
        {!DEMO && isError ? <AdminErrorState onRetry={() => void refetch()} /> : loading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
         !pending.length ? <EmptyState title="لا طلبات معلقة" /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((r) => (
              <GlassCard key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-readex font-bold">{r.studentName}</div>
                    <div className="text-xs text-muted-foreground font-readex mt-1">{r.fromName} ← <b className="text-gold-dark dark:text-gold">{r.toName}</b></div>
                    <div className="text-[11px] text-muted-foreground font-readex">منذ {r.hoursAgo} ساعة</div>
                  </div>
                  <AdminButton icon="video" onClick={() => { setSel({ id: r.id, studentName: r.studentName, videoUrl: r.videoUrl, fromName: r.fromName, toName: r.toName }); setNotes(""); }}>مراجعة</AdminButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="font-amiri text-lg text-burgundy mb-2">سجل المراجعات</h2>
          <div className="space-y-2">
            {reviewed.map((r) => (
              <GlassCard key={r.id} className="p-3 flex items-center gap-3 opacity-80">
                <div className="flex-1">
                  <span className="font-readex text-sm font-bold">{r.studentName}</span>
                  <span className="font-readex text-xs text-muted-foreground"> — {r.fromName} ← {r.toName}</span>
                </div>
                <StatusBadge status={r.status} />
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      <AdminDrawer open={!!sel} onClose={() => setSel(null)} size="lg" busy={review.isPending} title="مراجعة طلب ترقية"
        subtitle={sel ? `${sel.studentName} — ${sel.fromName} ← ${sel.toName}` : undefined}
        footer={<>
          <AdminButton variant="danger" loading={review.isPending && review.variables?.approve === false} onClick={() => setConfirming("reject")}>رفض</AdminButton>
          <AdminButton icon="check" loading={review.isPending && review.variables?.approve === true} onClick={() => setConfirming("approve")}>ترقية</AdminButton>
        </>}>
        {sel && (
          <div className="space-y-3">
            {sel.videoUrl.startsWith("teacher_request_") ? (
              <p className="rounded-xl bg-muted/40 border border-border px-4 py-3 font-readex text-xs text-center text-muted-foreground">طلب ترقية مرفوع من المعلم — لا يوجد فيديو مرفق.</p>
            ) : (
              <PrivateMediaPlayer source={sel.videoUrl} className="w-full rounded-xl bg-night max-h-72" />
            )}
            <label className="block font-readex text-xs font-bold">ملاحظات المراجعة
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            </label>
            <p className="text-[11px] text-muted-foreground font-readex">عند القبول: يُنقل الطالب فوراً ويصله إشعار «مبروك!»</p>
          </div>
        )}
      </AdminDrawer>
      <ConfirmDialog open={confirming === "approve"} tone="primary" title="اعتماد الترقية؟" itemName={sel?.studentName} impact={sel ? `يُنقل الطالب فوراً من ${sel.fromName} إلى ${sel.toName} ويصله إشعار «مبروك!».` : undefined}
        confirmLabel="ترقية" loading={review.isPending} onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); decide(true); }} />
      <ConfirmDialog open={confirming === "reject"} title="رفض طلب الترقية؟" itemName={sel?.studentName} impact="سيبقى الطالب في مستواه الحالي ويُبلَّغ بالملاحظات المكتوبة."
        confirmLabel="رفض" loading={review.isPending} onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); decide(false); }} />
    </div>
  );
}
