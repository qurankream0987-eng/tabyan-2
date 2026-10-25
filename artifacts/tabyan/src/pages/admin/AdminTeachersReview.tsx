import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminButton, AdminDrawer, ConfirmDialog } from "@/components/admin/AdminUi";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { objectUrl } from "@/lib/upload";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { authStore } from "@/lib/auth";
import ReviewVideoPlayer from "@/components/admin/ReviewVideoPlayer";
import { DEMO_KYC } from "@/lib/demo/admin-core";

type Certificate = { id: string; teacherId: string; filePath: string; title: string | null; createdAt: string | Date | null };

export default function AdminTeachersReview() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const kycList = trpc.admin.kycList.useQuery(undefined, { enabled: !DEMO });
  const [sel, setSel] = useState<{
    id: string;
    name: string;
    videoUrl: string | null;
    bio?: string | null;
    specialization?: string | null;
    experienceYears?: number | null;
    certificates: Certificate[];
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);

  const kycRows: {
    teacherId: string;
    name: string;
    videoUrl: string | null;
    hoursAgo: number;
    answers: unknown;
    bio?: string | null;
    specialization?: string | null;
    experienceYears?: number | null;
    certificates?: Certificate[];
  }[] = DEMO ? DEMO_KYC : (kycList.data ?? []);
  const loading = !DEMO && kycList.isLoading;
  const hasError = !DEMO && kycList.isError;

  const reviewKyc = (decision: "approve" | "reject" | "request_info") => {
    if (!sel) return;
    if (decision === "request_info" && !notes.trim()) {
      toast("اكتب الملاحظات التي توضّح المطلوب من المعلم", "error");
      return;
    }
    if (DEMO) {
      toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
      setSel(null); setNotes("");
      return;
    }
    kycReview.mutate({ teacherId: sel.id, decision, notes: notes.trim() || undefined });
  };

  const kycReview = trpc.admin.kycReview.useMutation({
    onSuccess: () => { toast("تمت المراجعة", "success"); setSel(null); setNotes(""); utils.admin.kycList.invalidate(); utils.admin.kpis.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ المراجعة، حاول مرة أخرى."), "error"),
  });

  const items = kycRows.map((r) => ({
    id: r.teacherId,
    name: r.name,
    videoUrl: r.videoUrl,
    hoursAgo: r.hoursAgo,
    answers: r.answers as { q: string; a: string }[] | null,
    bio: r.bio ?? null,
    specialization: r.specialization ?? null,
    experienceYears: r.experienceYears ?? null,
    certificates: (r.certificates ?? []) as Certificate[],
  }));

  return (
    <div className="space-y-5 page-enter">
      {/* العنوان */}
      <h1 className="hero-greeting font-amiri text-2xl font-bold flex items-center gap-2">
        <Icon name="id-card" size={22} className="shrink-0" />
        مراجعة المعلمين
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
        ) : !items.length ? (
          <EmptyState title="لا طلبات معلقة" hint="كل طلبات القبول مُراجعة" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((it) => (
              <GlassCard key={it.id} className="p-4 space-y-3">
                {/* معلومات الطلب */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-readex font-bold text-foreground">{it.name}</p>
                    <div className={`text-[11px] font-readex inline-flex items-center gap-1 ${it.hoursAgo >= 20 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      <Icon name="timer" size={12} />
                      منذ {it.hoursAgo} ساعة
                      {it.hoursAgo >= 20 && <span className="font-bold"> — اقتربت مهلة 24س!</span>}
                    </div>
                  </div>
                  <PrimaryButton
                    className="text-xs px-3 py-2 shrink-0 inline-flex items-center gap-1.5"
                    onClick={() => {
                      setSel({ id: it.id, name: it.name, videoUrl: it.videoUrl, bio: it.bio, specialization: it.specialization, experienceYears: it.experienceYears, certificates: it.certificates });
                      setNotes("");
                    }}
                  >
                    <Icon name="video" size={13} />
                    تشغيل ومراجعة
                  </PrimaryButton>
                </div>

                {/* إجابات الأسئلة */}
                {it.answers && (
                  <details className="border-t border-border/50 pt-2">
                    <summary className="text-xs font-readex text-burgundy dark:text-gold cursor-pointer select-none hover:opacity-80 transition">
                      عرض إجابات الأسئلة العشرة
                    </summary>
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                      {it.answers.map((qa, i) => (
                        <div key={i} className="rounded-lg bg-burgundy/5 dark:bg-white/5 p-2">
                          <p className="text-[10px] font-readex font-bold">{i + 1}. {qa.q}</p>
                          <p className="text-[11px] font-readex text-muted-foreground">{qa.a}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </GlassCard>
            ))}
          </div>
        )
      )}

      {/* نافذة المراجعة */}
      <AdminDrawer open={!!sel} onClose={() => { setSel(null); setNotes(""); }} size="lg" busy={kycReview.isPending} title={sel?.name ?? ""} subtitle="مراجعة طلب انضمام معلم"
        footer={<>
          <AdminButton variant="secondary" icon="info" disabled={!notes.trim()} loading={kycReview.isPending && kycReview.variables?.decision === "request_info"} onClick={() => reviewKyc("request_info")}>طلب معلومات</AdminButton>
          <AdminButton variant="danger" icon="x" loading={kycReview.isPending && kycReview.variables?.decision === "reject"} onClick={() => setConfirming("reject")}>رفض</AdminButton>
          <AdminButton icon="check" loading={kycReview.isPending && kycReview.variables?.decision === "approve"} onClick={() => setConfirming("approve")}>اعتماد</AdminButton>
        </>}>
        {sel && (
          <div className="space-y-4">
            {/* معلومات المعلم */}
            {(sel.bio || sel.specialization || sel.experienceYears != null) && (
              <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
                {sel.specialization && (
                  <p className="font-readex text-xs text-burgundy dark:text-gold font-bold">التخصص: {sel.specialization}</p>
                )}
                {sel.experienceYears != null && (
                  <p className="font-readex text-xs text-muted-foreground">سنوات الخبرة: {sel.experienceYears}</p>
                )}
                {sel.bio && (
                  <p className="font-readex text-xs text-muted-foreground whitespace-pre-wrap">{sel.bio}</p>
                )}
              </div>
            )}

            {/* الفيديو — يصنَّف تلقائياً: YouTube → iframe آمن · تخزين محمي → مشغّل · غير صالح → رسالة */}
            {sel.videoUrl ? (
              <ReviewVideoPlayer
                videoUrl={sel.videoUrl}
                title={`فيديو المعلم ${sel.name}`}
                onError={() => toast("تعذر تشغيل الفيديو. قد يكون الملف غير مكتمل أو بصيغة غير مدعومة.", "error")}
              />
            ) : (
              <div className="flex items-center justify-center h-24 rounded-xl bg-muted/40 border border-border">
                <p className="font-readex text-sm text-muted-foreground">لا فيديو مرفق</p>
              </div>
            )}

            {/* شهادات KYC */}
            <div>
              <p className="font-readex text-xs font-bold mb-2 flex items-center gap-1.5">
                <Icon name="certificate" size={14} />
                الشهادات والمؤهلات
              </p>
              {sel.certificates.length ? (
                <div className="flex flex-wrap gap-2">
                  {sel.certificates.map((c) => (
                    <a
                      key={c.id}
                      href={objectUrl(c.filePath)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/5 dark:bg-white/5 border border-input px-3 py-1.5 hover:bg-burgundy/10 transition"
                    >
                      <Icon name="file-text" size={13} />
                      <span className="font-readex text-xs max-w-[10rem] truncate">{c.title || "شهادة بدون عنوان"}</span>
                      <span className="text-[11px] font-readex text-burgundy dark:text-gold inline-flex items-center gap-0.5">
                        <Icon name="link" size={12} />عرض
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="font-readex text-xs text-muted-foreground">لا شهادات مرفوعة</p>
              )}
            </div>

            <label className="block font-readex text-xs font-bold">ملاحظات المراجعة
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm font-normal focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">تظهر للمعلم — مطلوبة عند طلب معلومات إضافية</span>
            </label>
          </div>
        )}
      </AdminDrawer>
      <ConfirmDialog open={confirming === "approve"} tone="primary" title="اعتماد هذا المعلم؟" itemName={sel?.name} confirmLabel="اعتماد" loading={kycReview.isPending}
        impact="سيُعتمد حساب المعلم ويمكنه استقبال الحلقات فوراً." onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); reviewKyc("approve"); }} />
      <ConfirmDialog open={confirming === "reject"} title="رفض طلب المعلم؟" itemName={sel?.name} confirmLabel="رفض الطلب" loading={kycReview.isPending}
        impact="سيُبلَّغ المعلم برفض طلبه مع الملاحظات المكتوبة." onCancel={() => setConfirming(null)} onConfirm={() => { setConfirming(null); reviewKyc("reject"); }} />
    </div>
  );
}
