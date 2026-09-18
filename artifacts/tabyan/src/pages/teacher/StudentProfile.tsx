import { useRef, useState } from "react";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import { InitialsAvatar } from "@/components/CircularUserCard";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { demoStudentDetail } from "@/lib/demo/teacher";
import Icon from "@/components/Icon";
import { uploadFile } from "@/lib/upload";
import { HIDE_MODE_LABELS, formatDuration, type HideMode } from "@/lib/recitation-types";

/** قسم جلسات التسميع التعليمي — يظهر في ملف الطالب عند المعلم */
function RecitationSessionsSection({ studentId }: { studentId: string }) {
  const q = trpc.recitation.studentSessions.useQuery({ studentId, limit: 10 });
  const rows = q.data ?? [];

  if (q.isLoading) return <div className="h-20 skeleton rounded-[1.5rem]" />;
  if (q.isError) return null; // المعلم غير مرتبط بالطالب — قد يُخفى بصمت

  return (
    <GlassCard className="p-4">
      <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">
        <Icon name="mic" size={18} />
        جلسات التسميع التعليمية
      </h2>
      {rows.length === 0 ? (
        <p className="font-readex text-xs text-muted-foreground">لا جلسات تسميع تعليمي بعد</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const ayahRange = r.startAyah && r.endAyah
              ? r.startAyah === r.endAyah
                ? `آية ${r.startAyah}`
                : `${r.startAyah}–${r.endAyah}`
              : null;
            return (
              <div key={r.id} className="rounded-lg bg-burgundy/5 dark:bg-white/5 px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="font-amiri text-sm text-burgundy font-bold truncate">
                    {r.surahName ?? `سورة #${r.surahId}`}
                    {ayahRange ? ` — ${ayahRange}` : ""}
                  </span>
                  <span className={`font-readex text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    r.status === "completed"
                      ? "text-green-600 dark:text-green-400 bg-green-500/10"
                      : "text-muted-foreground bg-muted"
                  }`}>
                    {r.status === "completed" ? "مكتملة" : r.status}
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5">
                  {r.durationSeconds != null && (
                    <span className="font-readex text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Icon name="timer" size={11} />
                      {formatDuration(r.durationSeconds)}
                    </span>
                  )}
                  {r.hideMode && (
                    <span className="font-readex text-[11px] text-muted-foreground">
                      {HIDE_MODE_LABELS[r.hideMode as HideMode] ?? r.hideMode}
                    </span>
                  )}
                  {r.createdAt && (
                    <span className="font-readex text-[11px] text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

export default function StudentProfile() {
  const { id = "" } = useParams();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.studentDetail.useQuery({ studentId: id }, { enabled: !DEMO });
  const data = DEMO ? demoStudentDetail(id) : q.data;
  const isLoading = !DEMO && q.isLoading;
  const [msg, setMsg] = useState("");
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast("يُسمح بملفات PDF فقط", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast("حجم الملف يتجاوز 20 ميغابايت", "error");
      return;
    }
    if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
    try {
      setUploadPct(0);
      const objectPath = await uploadFile(file, file.name, setUploadPct);
      setAttachedFile({ name: file.name, url: objectPath });
      toast("تم رفع الملف بنجاح", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الملف", "error");
    } finally {
      setUploadPct(null);
    }
  };

  const send = trpc.teacher.sendMessage.useMutation({
    onSuccess: () => { toast("أُرسلت رسالتك", "success"); setMsg(""); setAttachedFile(null); },
    onError: (e) => toast(e.message, "error"),
  });

  const promote = trpc.teacher.requestPromotion.useMutation({
    onSuccess: (res) => {
      toast(`تم إرسال طلب الانتقال إلى "${res.toLevel}" للمراجعة`, "success");
      setShowPromoteConfirm(false);
      utils.teacher.studentDetail.invalidate({ studentId: id });
    },
    onError: (e) => toast(e.message, "error"),
  });

  if (isLoading) return <div className="h-40 skeleton rounded-[1.5rem]" />;
  if (!data) return <EmptyState title="الطالب غير موجود" />;

  const { info, evaluations, upcoming, recordings, wantsTuhfa } = data;
  const student = info.student;
  const avg = evaluations.length
    ? Math.round(evaluations.reduce((a, e) => a + e.totalScore, 0) / evaluations.length)
    : null;

  return (
    <div className="space-y-4 page-enter">

      {/* Header card */}
      <GlassCard className="p-5 text-center">
        <div className="flex justify-center"><InitialsAvatar name={info.user.fullName} size={72} /></div>
        <h1 className="font-amiri text-xl text-burgundy mt-2">{info.user.fullName}</h1>
        <div className="flex justify-center gap-2 mt-2 font-readex text-xs flex-wrap">
          <span className="bg-burgundy/5 dark:bg-white/5 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
            <Icon name="quran" size={13} />
            {student?.totalJuz ?? 0} جزء
          </span>
          {avg != null && (
            <span className="bg-gold/15 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
              <Icon name="star" size={13} className="text-gold-dark dark:text-gold" />
              متوسط {avg}%
            </span>
          )}
          <span className="bg-burgundy/5 dark:bg-white/5 rounded-full px-3 py-1" dir="ltr">{info.user.phone}</span>
        </div>
      </GlassCard>

      {/* ── طلب الانتقال للمستوى التالي ── */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold shrink-0">
            <Icon name="graduation" size={20} />
          </div>
          <div>
            <h2 className="font-amiri text-lg text-burgundy">انتقال المستوى</h2>
            <p className="font-readex text-xs text-muted-foreground">طلب ترقية الطالب للمستوى التالي — يراجعه </p>
          </div>
        </div>

        {!showPromoteConfirm ? (
          <button
            onClick={() => setShowPromoteConfirm(true)}
            className="w-full py-3 rounded-xl border-2 border-burgundy/30 dark:border-gold/30 text-burgundy font-readex font-bold text-sm hover:bg-burgundy/5 dark:hover:bg-gold/5 btn-press transition flex items-center justify-center gap-2"
          >
            <Icon name="graduation" size={16} />
            طلب الانتقال للمستوى التالي
          </button>
        ) : (
          <div className="rounded-xl bg-gold/10 dark:bg-gold/5 border border-gold/30 p-4 space-y-3">
            <p className="font-readex text-sm text-center text-foreground font-bold">
              هل تؤكد إرسال طلب الانتقال للمستوى التالي؟
            </p>
            <p className="font-readex text-xs text-center text-muted-foreground">
              سيُراجع  الطلب ويُرسل إشعاراً للطالب فور الموافقة
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); setShowPromoteConfirm(false); return; }
                  promote.mutate({ studentId: id });
                }}
                disabled={promote.isPending}
                className="flex-1 py-2.5 rounded-xl bg-burgundy text-white font-readex font-bold text-sm btn-press hover:bg-burgundy/90 transition"
              >
                {promote.isPending ? "جارٍ الإرسال…" : "نعم، أرسل الطلب"}
              </button>
              <button
                onClick={() => setShowPromoteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-burgundy/10 dark:bg-white/10 text-burgundy font-readex font-bold text-sm btn-press transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* منظومة تحفة الأطفال — تظهر فقط إذا كانت للطالب بيانات اختيار (true أو false صريح) */}
      {wantsTuhfa !== undefined && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold shrink-0">
              <Icon name="books" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-amiri text-lg text-burgundy leading-tight">منظومة تحفة الأطفال</h2>
              <p className={`font-readex text-sm font-bold mt-0.5 ${
                wantsTuhfa === true
                  ? "text-green-600 dark:text-green-400"
                  : wantsTuhfa === false
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
              }`}>
                {wantsTuhfa === true
                  ? "يرغب في الحفظ"
                  : wantsTuhfa === false
                    ? "لا يرغب في الحفظ"
                    : "لم يحدد اختياره بعد"}
              </p>
            </div>
            {wantsTuhfa === true && (
              <span className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                <Icon name="check" size={16} />
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* Upcoming sessions */}
      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-2">الحصص القادمة</h2>
        {!upcoming.length ? (
          <p className="font-readex text-xs text-muted-foreground">لا حصص مجدولة</p>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((s) => (
              <div key={s.id} className="flex justify-between items-center rounded-lg bg-burgundy/5 dark:bg-white/5 px-3 py-2">
                <span className="font-readex text-xs font-bold truncate">{s.topic ?? s.sessionType}</span>
                <span className="font-readex text-[11px] text-muted-foreground shrink-0">{fmtDateTime(s.scheduledAt)}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Evaluations history */}
      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-2">سجل التقييمات</h2>
        {!evaluations.length ? (
          <p className="font-readex text-xs text-muted-foreground">لا تقييمات بعد</p>
        ) : (
          <div className="space-y-1.5">
            {evaluations.map((e) => (
              <div key={e.id} className="rounded-lg bg-burgundy/5 dark:bg-white/5 px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="font-amiri text-burgundy">{e.totalScore}/100</span>
                  <span className="font-readex text-[11px] text-muted-foreground">{fmtDateTime(e.createdAt)}</span>
                </div>
                <div className="text-[10px] font-readex text-muted-foreground mt-0.5">
                  الحفظ الجديد {e.hifzScore}/50 · المراجعة {e.revisionScore}/20 · التجويد {e.tajweedScore}/20 · الأداء {e.commitmentScore}/10
                </div>
                {e.notes && (
                  <div className="text-[11px] font-readex mt-1 flex items-start gap-1.5">
                    <Icon name="edit" size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
                    {e.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── جلسات التسميع التعليمي ── */}
      <RecitationSessionsSection studentId={id} />

      {/* Recordings */}
      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">
          <Icon name="video" size={18} />
          تسجيلات مشتركة
        </h2>
        {!recordings.length ? (
          <p className="font-readex text-xs text-muted-foreground">لا تسجيلات</p>
        ) : (
          <div className="space-y-1.5">
            {recordings.map((r) => (
              <a key={r.id} href={r.videoUrl} target="_blank" rel="noreferrer"
                className="flex justify-between items-center rounded-lg bg-burgundy/5 dark:bg-white/5 px-3 py-2 hover:bg-burgundy/10 transition">
                <span className="font-readex text-xs font-bold inline-flex items-center gap-1.5">
                  <Icon name="play" size={13} className="text-burgundy" />
                  تسجيل — {Math.round(r.durationSeconds / 60)} دقيقة
                </span>
                <span className="font-readex text-[11px] text-muted-foreground">{fmtDateTime(r.createdAt)}</span>
              </a>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Message */}
      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">
          <Icon name="mail" size={18} />
          مراسلة الطالب
        </h2>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={1000}
          placeholder="اكتب تشجيعاً أو واجباً منزلياً…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />

        {/* PDF attachment */}
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPickFile} />
        {attachedFile ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-burgundy/5 dark:bg-white/5 px-3 py-2.5">
            <Icon name="file-text" size={16} className="text-burgundy shrink-0" />
            <span className="font-readex text-xs font-bold truncate flex-1">{attachedFile.name}</span>
            <Icon name="check-circle" size={15} className="text-green-600 dark:text-green-400 shrink-0" />
            <button onClick={() => setAttachedFile(null)} aria-label="إزالة المرفق"
              className="p-1 rounded-lg hover:bg-burgundy/10 dark:hover:bg-white/10 transition shrink-0">
              <Icon name="x" size={14} className="text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadPct !== null}
            className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-burgundy/30 dark:border-gold/30 text-burgundy font-readex text-xs font-bold hover:bg-burgundy/5 dark:hover:bg-gold/5 btn-press transition flex items-center justify-center gap-2">
            {uploadPct !== null ? (
              <>جارٍ رفع الملف… {uploadPct}%</>
            ) : (
              <><Icon name="upload" size={14} />إرفاق ملف PDF (اختياري)</>
            )}
          </button>
        )}

        <PrimaryButton className="w-full mt-2" disabled={!msg.trim() || send.isPending || uploadPct !== null}
          onClick={() => {
            if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); setMsg(""); return; }
            send.mutate({ studentId: id, messageText: msg.trim(), ...(attachedFile ? { fileUrl: attachedFile.url } : {}) });
          }}>
          <span className="inline-flex items-center gap-2"><Icon name="send" size={16} />إرسال</span>
        </PrimaryButton>
      </GlassCard>

    </div>
  );
}
