import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { objectUrl } from "@/lib/upload";
import { DEMO_PROMOTIONS } from "@/lib/demo/admin-core";

export default function AdminPromotions() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.admin.promotionsList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{ id: string; studentName: string; videoUrl: string; fromName: string; toName: string } | null>(null);
  const [notes, setNotes] = useState("");
  const review = trpc.admin.promotionReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة — أُشعر الطالب", "success"); setSel(null); setNotes(""); utils.admin.promotionsList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const rows: { id: string; studentName: string; fromName: string; toName: string; videoUrl: string; status: string; hoursAgo: number }[] =
    DEMO ? DEMO_PROMOTIONS : (data ?? []);
  const loading = !DEMO && isLoading;
  const pending = rows.filter((r) => r.status === "pending");
  const reviewed = rows.filter((r) => r.status !== "pending");

  const decide = (approve: boolean) => {
    if (!sel) return;
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
        {loading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
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
                  <PrimaryButton className="text-xs px-4 py-2"
                    onClick={() => { setSel({ id: r.id, studentName: r.studentName, videoUrl: r.videoUrl, fromName: r.fromName, toName: r.toName }); setNotes(""); }}>
                    <span className="inline-flex items-center gap-1.5"><Icon name="video" size={14} />مراجعة</span>
                  </PrimaryButton>
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

      <Modal open={!!sel} onClose={() => setSel(null)} className="max-w-2xl">
        {sel && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">مراجعة طلب ترقية</h3>
            <p className="font-readex text-sm text-center text-muted-foreground">{sel.studentName} — {sel.fromName} ← <b>{sel.toName}</b></p>
            <video src={objectUrl(sel.videoUrl)} controls preload="metadata" className="w-full rounded-xl bg-night max-h-72" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500}
              placeholder="ملاحظات المراجعة…"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            <div className="flex gap-2">
              <PrimaryButton className="flex-1" onClick={() => decide(true)}>ترقية</PrimaryButton>
              <button className="flex-1 py-2 rounded-xl bg-destructive/15 text-destructive font-readex font-bold text-sm"
                onClick={() => decide(false)}>رفض</button>
            </div>
            <p className="text-[10px] text-muted-foreground font-readex text-center">عند القبول: يُنقل الطالب فوراً ويصله إشعار «مبروك!»</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
