import { useCallback, useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminButton, AdminDrawer, ConfirmDialog } from "@/components/admin/AdminUi";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/format";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { authStore } from "@/lib/auth";
import ReviewVideoPlayer from "@/components/admin/ReviewVideoPlayer";
import { DEMO_LEVELS, DEMO_PLACEMENT } from "@/lib/demo/admin-core";

export default function AdminStudentsReview() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const placementList = trpc.admin.placementList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{ id: string; name: string; videoUrl: string | null; pathType: "quran" | "tajweed_correction" } | null>(null);
  const [notes, setNotes] = useState("");
  const [resultLevelId, setResultLevelId] = useState<number | undefined>();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const placementPath = sel?.pathType ?? "quran";
  const handleVideoError = useCallback(() => {
    toast("هذا الفيديو غير قابل للتشغيل — الملف غير مكتمل. اطلب من الطالب إعادة التسجيل.", "error");
  }, [toast]);
  const levels = trpc.admin.placementLevelThresholds.useQuery(
    { path: placementPath },
    { enabled: !DEMO && !!sel },
  );

  const placementRows: { userId: string; name: string; videoUrl: string | null; hoursAgo: number; pathType?: string | null; schoolStage?: string | null; schoolGrade?: string | null; createdAt?: string | Date | null }[] =
    DEMO ? DEMO_PLACEMENT : (placementList.data ?? []);
  const levelRows: { id: number; name: string }[] = DEMO
    ? DEMO_LEVELS.filter((level) => level.path === placementPath)
    : (levels.data ?? []);
  const loading = !DEMO && placementList.isLoading;
  const hasError = !DEMO && placementList.isError;

  const reviewPlacement = (approve: boolean) => {
    if (!sel) return;
    if (DEMO) {
      toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
      setSel(null); setNotes(""); setResultLevelId(undefined);
      return;
    }
    placementReview.mutate({ studentId: sel.id, approve, resultLevelId, notes: approve ? notes || undefined : undefined });
  };

  const placementReview = trpc.admin.placementReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة", "success"); setSel(null); setNotes(""); setResultLevelId(undefined); utils.admin.placementList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ المراجعة، حاول مرة أخرى."), "error"),
  });

  return (
    <div className="space-y-5 page-enter">
      {/* العنوان */}
      <h1 className="hero-greeting font-amiri text-2xl font-bold flex items-center gap-2">
        <Icon name="video" size={22} className="shrink-0" />
        مراجعة الطلاب
      </h1>

      {/* حالة الخطأ */}
      {hasError && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-5 py-4 font-readex text-sm text-destructive">
          <Icon name="alert-triangle" size={18} className="shrink-0" />
          <span>تعذّر تحميل البيانات. تحقق من الاتصال وأعد المحاولة.</span>
        </div>
      )}

      {/* المحتوى */}
      {!hasError && (
        loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton rounded-2xl h-28" />
            ))}
          </div>
        ) : !placementRows.length ? (
          <EmptyState title="لا طلبات معلقة" hint="كل اختبارات التلاوة مُراجعة" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {placementRows.map((it) => (
              <GlassCard key={it.userId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-readex font-bold text-foreground">{it.name}</p>
                    <p className="text-[11px] font-readex text-burgundy dark:text-gold font-bold">
                      {it.pathType === "tajweed_correction" ? "تصحيح التلاوة" : "القرآن الكريم"}
                      {it.schoolStage ? ` · ${it.schoolStage}` : ""}
                      {it.schoolGrade ? ` — ${it.schoolGrade}` : ""}
                    </p>
                    <div className={`text-[11px] font-readex inline-flex items-center gap-1 ${it.hoursAgo >= 20 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      <Icon name="timer" size={12} />
                      منذ {it.hoursAgo} ساعة
                      {it.hoursAgo >= 20 && <span className="font-bold"> — اقتربت مهلة 24س!</span>}
                    </div>
                    {it.createdAt && (
                      <p className="text-[11px] font-readex text-muted-foreground">تاريخ التسجيل: {fmtDate(it.createdAt)}</p>
                    )}
                  </div>
                  <PrimaryButton
                    className="text-xs px-3 py-2 shrink-0 inline-flex items-center gap-1.5"
                    onClick={() => {
                      setSel({
                        id: it.userId,
                        name: it.name,
                        videoUrl: it.videoUrl,
                        pathType: it.pathType === "tajweed_correction" ? "tajweed_correction" : "quran",
                      });
                      setNotes("");
                      setResultLevelId(undefined);
                    }}
                  >
                    <Icon name="video" size={13} />
                    تشغيل ومراجعة
                  </PrimaryButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      )}

      {/* نافذة المراجعة */}
      <AdminDrawer open={!!sel} onClose={() => { setSel(null); setNotes(""); setResultLevelId(undefined); }} size="lg" busy={placementReview.isPending}
        title={sel?.name ?? ""} subtitle="مراجعة اختبار تحديد المستوى"
        footer={<>
          <AdminButton variant="danger" icon="x" loading={placementReview.isPending && placementReview.variables?.approve === false} onClick={() => setConfirming("reject")}>رفض</AdminButton>
          <AdminButton icon="check" disabled={!resultLevelId} loading={placementReview.isPending && placementReview.variables?.approve === true} onClick={() => setConfirming("approve")}>قبول</AdminButton>
        </>}>
        {sel && (
          <div className="space-y-4">
            {sel.videoUrl ? (
              <ReviewVideoPlayer videoUrl={sel.videoUrl} title={`فيديو اختبار ${sel.name}`} playbackMode="placement" onError={handleVideoError} />
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl bg-muted/40 border border-border">
                <p className="font-readex text-sm text-muted-foreground">لا فيديو مرفق</p>
              </div>
            )}
            <label className="block font-readex text-xs font-bold">المستوى المُحدد (عند القبول) <span className="text-destructive">*</span>
              <select value={resultLevelId ?? ""} onChange={(e) => setResultLevelId(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold">
                <option value="">اختر المستوى…</option>
                {levelRows.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label className="block font-readex text-xs font-bold">ملاحظات للطالب
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm font-normal focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">اختيارية — تظهر للطالب في إشعار النتيجة</span>
            </label>
          </div>
        )}
      </AdminDrawer>
      <ConfirmDialog open={confirming === "approve"} tone="primary" title="قبول الطالب؟" itemName={sel?.name} confirmLabel="قبول" loading={placementReview.isPending}
        impact={`سيُعتمد الطالب في مستوى «${levelRows.find((l) => l.id === resultLevelId)?.name ?? "—"}» ويصله إشعار بالنتيجة.`}
        onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); reviewPlacement(true); }} />
      <ConfirmDialog open={confirming === "reject"} title="رفض اختبار الطالب؟" itemName={sel?.name} confirmLabel="رفض" loading={placementReview.isPending}
        impact="سيُبلَّغ الطالب برفض الاختبار ويمكنه إعادة المحاولة وفق إعدادات المنصة."
        onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); reviewPlacement(false); }} />
    </div>
  );
}
