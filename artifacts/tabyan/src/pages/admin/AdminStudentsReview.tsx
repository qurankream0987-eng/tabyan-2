import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/format";
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
  const placementPath = sel?.pathType ?? "quran";
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
    onError: (e) => toast(e.message, "error"),
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

      {/* مودال المراجعة */}
      <Modal open={!!sel} onClose={() => { setSel(null); setNotes(""); setResultLevelId(undefined); }} className="max-w-2xl">
        {sel && (
          <div className="space-y-4">
            <h2 className="font-amiri text-xl font-bold">{sel.name}</h2>
            {/* الفيديو — يصنَّف تلقائياً: تخزين محمي / YouTube / غير صالح */}
            {sel.videoUrl ? (
              <ReviewVideoPlayer
                videoUrl={sel.videoUrl}
                title={`فيديو اختبار ${sel.name}`}
                onError={() => toast("هذا الفيديو غير قابل للتشغيل — الملف غير مكتمل. اطلب من الطالب إعادة التسجيل.", "error")}
              />
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl bg-muted/40 border border-border">
                <p className="font-readex text-sm text-muted-foreground">لا فيديو مرفق</p>
              </div>
            )}

            {/* اختيار المستوى */}
            <div>
              <label className="font-readex text-xs font-bold block mb-1.5">المستوى المُحدد (عند القبول) *</label>
              <select
                value={resultLevelId ?? ""}
                onChange={(e) => setResultLevelId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">اختر المستوى…</option>
                {levelRows.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* ملاحظات القبول — تظهر للطالب في الإشعار */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="ملاحظات تظهر للطالب عند القبول (اختياري)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            />

            {/* أزرار القرار */}
            <div className="flex gap-2">
              <PrimaryButton
                className="flex-1"
                disabled={!resultLevelId || placementReview.isPending}
                onClick={() => reviewPlacement(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="check" size={15} />قبول
                </span>
              </PrimaryButton>
              <button
                disabled={placementReview.isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive/15 text-destructive font-readex font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-destructive/25 transition"
                onClick={() => reviewPlacement(false)}
              >
                <Icon name="x" size={15} />رفض
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
