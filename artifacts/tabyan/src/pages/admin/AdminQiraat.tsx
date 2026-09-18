import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_QIRAAT } from "@/lib/demo/admin-core";

export default function AdminQiraat() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.admin.qiraatList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{ id: string; studentName: string; certificateUrl: string } | null>(null);
  const [notes, setNotes] = useState("");
  const review = trpc.admin.qiraatReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة", "success"); setSel(null); setNotes(""); utils.admin.qiraatList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(e.message, "error"),
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
    review.mutate({ certId: sel.id, approve, notes: notes || undefined });
  };

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="mosque" size={24} />شهادات الإجازة</h1>
        <p className="font-readex text-xs text-muted-foreground">بوابة مسار القراءات — لا دخول إلا بإجازة الشاطبية موثّقة</p>
      </div>
      {loading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !rows.length ? <EmptyState title="لا شهادات مرفوعة" /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((c) => (
            <GlassCard key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-readex font-bold">{c.studentName}</div>
                  <div className="text-[11px] text-muted-foreground font-readex">{fmtDateTime(c.createdAt)} · منذ {c.hoursAgo} س</div>
                  <div className="mt-1"><StatusBadge status={c.status} /></div>
                </div>
                {c.status === "pending" && (
                  <PrimaryButton className="text-xs px-4 py-2" onClick={() => { setSel({ id: c.id, studentName: c.studentName, certificateUrl: c.certificateUrl }); setNotes(""); }}>
                    <span className="inline-flex items-center gap-1.5"><Icon name="certificate" size={14} />مراجعة</span>
                  </PrimaryButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">مراجعة شهادة الإجازة</h3>
            <p className="font-readex text-sm text-center text-muted-foreground">{sel.studentName}</p>
            <a href={sel.certificateUrl} target="_blank" rel="noreferrer"
              className="block text-center py-3 rounded-xl bg-burgundy/10 text-burgundy font-readex text-sm hover:bg-burgundy/20 transition">
              <span className="inline-flex items-center gap-2"><Icon name="certificate" size={16} />فتح الشهادة للمعاينة</span>
            </a>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500}
              placeholder="ملاحظات (10 أحرف على الأقل عند الرفض)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            <div className="flex gap-2">
              <PrimaryButton className="flex-1" onClick={() => decide(true)}>اعتماد</PrimaryButton>
              <button className="flex-1 py-2 rounded-xl bg-destructive/15 text-destructive font-readex font-bold text-sm"
                onClick={() => decide(false)}>رفض</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
