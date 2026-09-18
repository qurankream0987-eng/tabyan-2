import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import AudioPlayerBar from "@/components/app/AudioPlayerBar";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { FATWA_CATEGORIES } from "@/lib/format";
import { DEMO_FATWA_INBOX, DEMO_MUFTIS } from "@/lib/demo/admin-ops";
import { userFacingErrorMessage } from "@/lib/user-facing-error";

type Q = {
  id: string; questionText: string; category: string; categoryLabel: string; status: string; priority: string;
  studentName: string; muftiName: string | null; hoursAgo: number; muftiId: string | null;
  answer: { id: string; answerText: string; audioUrl: string; status: string; audioDurationSeconds: number | null } | null;
};
const TABS = [["pending", "بلا إسناد"], ["assigned", "مُسند"], ["answered", "بانتظار نشر"], ["published", "منشور"], ["rejected", "مرفوض"]] as const;

export default function AdminFatwas() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("pending");
  const q = trpc.admin.fatwaInbox.useQuery({ tab }, { enabled: !DEMO });
  const muftis = trpc.admin.muftisList.useQuery(undefined, { enabled: !DEMO });
  const data: Q[] | undefined = DEMO ? (DEMO_FATWA_INBOX[tab] as Q[]) : (q.data as Q[] | undefined);
  const isLoading = !DEMO && q.isLoading;
  const muftisData = DEMO ? DEMO_MUFTIS : (muftis.data ?? []);
  const [assignTo, setAssignTo] = useState<Q | null>(null);
  const [muftiId, setMuftiId] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [note, setNote] = useState("");
  const [review, setReview] = useState<Q | null>(null);
  const [editedText, setEditedText] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectQ, setRejectQ] = useState<Q | null>(null);

  const invalidate = () => { utils.admin.fatwaInbox.invalidate(); utils.admin.kpis.invalidate(); };
  const assign = trpc.admin.fatwaAssign.useMutation({
    onSuccess: () => { toast("تم إرسال الفتوى إلى المفتي بنجاح", "success"); setAssignTo(null); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر إرسال الفتوى إلى المفتي، حاول مرة أخرى"), "error"),
  });
  const reviewAnswer = trpc.admin.fatwaReviewAnswer.useMutation({
    onSuccess: (_data, variables) => {
      const message = variables.action === "reject"
        ? "تم رفض الإجابة"
        : variables.action === "publish_public"
          ? "تم نشر الفتوى بنجاح"
          : "تم نشر الفتوى بشكل خاص";
      toast(message, "success"); setReview(null); invalidate();
    },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تنفيذ مراجعة الفتوى، حاول مرة أخرى"), "error"),
  });
  const rejectQuestion = trpc.admin.fatwaRejectQuestion.useMutation({
    onSuccess: () => { toast("تم رفض السؤال", "success"); setRejectQ(null); setNotes(""); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر رفض السؤال، حاول مرة أخرى"), "error"),
  });
  const updateCategory = trpc.admin.fatwaUpdateCategory.useMutation({
    onSuccess: () => { toast("تم تحديث تصنيف الفتوى", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تحديث تصنيف الفتوى، حاول مرة أخرى"), "error"),
  });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2">
        <Icon name="scale" size={22} />
        إدارة الفتاوى
      </h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl font-readex text-sm whitespace-nowrap transition ${tab === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
        ))}
      </div>

      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !data?.length ? <EmptyState title="لا عناصر في هذا التبويب" /> : (
        <div className="space-y-2">
          {(data as Q[]).map((q) => (
            <GlassCard key={q.id} className="p-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <select
                  value={q.category}
                  title="تصنيف السؤال"
                  onChange={(e) => {
                    const category = e.target.value;
                    if (category === q.category) return;
                    if (DEMO) { blocked(); e.target.value = q.category; return; }
                    updateCategory.mutate({ questionId: q.id, category: category as never });
                  }}
                  disabled={updateCategory.isPending}
                  className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  {Object.entries(FATWA_CATEGORIES).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
                {q.priority === "urgent" && (
                  <span className="text-[10px] font-readex bg-destructive/15 text-destructive px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Icon name="flame" size={11} />
                    عاجل
                  </span>
                )}
                {q.hoursAgo >= 48 && tab === "assigned" && (
                  <span className="text-[10px] font-readex bg-destructive/15 text-destructive px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Icon name="timer" size={11} />
                    تجاوز 48س — أعد الإسناد
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground font-readex mr-auto">منذ {q.hoursAgo} س</span>
              </div>
              <p className="font-readex text-sm font-bold line-clamp-2">{q.questionText}</p>
              <div className="text-[11px] text-muted-foreground font-readex mt-1">
                السائل: {q.studentName}{q.muftiName ? ` · المفتي: ${q.muftiName}` : ""}
              </div>
              <div className="flex gap-2 mt-3">
                {(tab === "pending" || tab === "assigned") && (
                  <PrimaryButton className="text-xs px-4 py-2" disabled={assign.isPending} onClick={() => { setAssignTo(q); setMuftiId(q.muftiId ?? ""); setUrgent(q.priority === "urgent"); setNote(""); }}>
                    {tab === "pending" ? "إسناد لمفتٍ" : "إعادة إسناد"}
                  </PrimaryButton>
                )}
                {tab === "answered" && q.answer && (
                  <PrimaryButton className="text-xs px-4 py-2 inline-flex items-center gap-1.5" onClick={() => { setReview(q); setEditedText(q.answer!.answerText); setNotes(""); }}>
                    <Icon name="edit" size={13} />
                    مراجعة الإجابة
                  </PrimaryButton>
                )}
                {tab === "pending" && (
                  <button onClick={() => { setRejectQ(q); setNotes(""); }} className="text-xs px-4 py-2 rounded-xl bg-destructive/15 text-destructive font-readex font-bold">رفض السؤال</button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Assign modal */}
      <Modal open={!!assignTo} onClose={() => setAssignTo(null)}>
        {assignTo && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">إسناد إلى مفتٍ</h3>
            <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
              <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{assignTo.categoryLabel}</span>
              <p className="font-readex text-sm mt-1 line-clamp-3">{assignTo.questionText}</p>
            </div>
            <label className="font-readex text-xs font-bold block">المفتي (مصنّف حسب التخصص وعدد المعلق)</label>
            <select value={muftiId} onChange={(e) => setMuftiId(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
              <option value="">اختر مفتياً…</option>
              {muftisData.map((m) => (
                <option key={m.teacherId} value={m.teacherId}>
                  {m.fullName} — معلق: {m.pending}/{m.maxPending} · تقييم {m.avgStars}
                </option>
              ))}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة للمفتي (اختياري)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            <label className="flex items-center gap-2 font-readex text-sm">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="w-4 h-4 accent-burgundy" />
              <Icon name="flame" size={15} className="text-destructive" />
              وسم كعاجل
            </label>
             <PrimaryButton className="w-full" disabled={!muftiId || assign.isPending} loading={assign.isPending}
              onClick={() => DEMO ? blocked() : assign.mutate({ questionId: assignTo.id, muftiId, note: note || undefined, urgent })}>
               {assign.isPending ? "جارٍ إرسال الفتوى…" : <span className="inline-flex items-center gap-2"><Icon name="send" size={15} />إسناد</span>}
            </PrimaryButton>
          </div>
        )}
      </Modal>

      {/* Review answer modal */}
      <Modal open={!!review} onClose={() => setReview(null)} className="max-w-2xl">
        {review?.answer && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">مراجعة إجابة المفتي</h3>
            <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="font-readex text-xs text-muted-foreground">السؤال — {review.studentName}</div>
              <p className="font-readex text-sm mt-1">{review.questionText}</p>
            </div>
            <div>
              <label className="font-readex text-xs font-bold block mb-1">الإجابة (يمكنك تحريرها قبل النشر)</label>
              <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={6} maxLength={2000}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
            </div>
            <AudioPlayerBar src={review.answer.audioUrl} duration={review.answer.audioDurationSeconds ?? undefined} />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات داخلية (اختياري)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <PrimaryButton className="text-xs"
                 disabled={editedText.trim().length < 50 || reviewAnswer.isPending} loading={reviewAnswer.isPending}
                onClick={() => DEMO ? blocked() : reviewAnswer.mutate({ answerId: review.answer!.id, action: "publish_public", editedText: editedText !== review.answer!.answerText ? editedText : undefined, notes: notes || undefined })}>
                <span className="inline-flex items-center gap-1.5"><Icon name="globe" size={13} />نشر عام</span>
              </PrimaryButton>
               <button disabled={reviewAnswer.isPending} className="py-2 rounded-xl bg-gold/20 text-gold-dark dark:text-gold font-readex font-bold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                onClick={() => DEMO ? blocked() : reviewAnswer.mutate({ answerId: review.answer!.id, action: "publish_private", editedText: editedText !== review.answer!.answerText ? editedText : undefined, notes: notes || undefined })}>
                <Icon name="lock" size={13} />
                 {reviewAnswer.isPending ? "جارٍ التنفيذ…" : "نشر خاص"}
              </button>
               <button disabled={reviewAnswer.isPending} className="py-2 rounded-xl bg-destructive/15 text-destructive font-readex font-bold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                onClick={() => DEMO ? blocked() : reviewAnswer.mutate({ answerId: review.answer!.id, action: "reject", notes: notes || undefined })}>
                <Icon name="x" size={13} />
                 {reviewAnswer.isPending ? "جارٍ التنفيذ…" : "رفض"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject question modal */}
      <Modal open={!!rejectQ} onClose={() => setRejectQ(null)}>
        {rejectQ && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">رفض السؤال</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
              placeholder="سبب الرفض (يظهر للطالب)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm resize-none" />
             <PrimaryButton className="w-full bg-destructive" disabled={notes.trim().length < 3 || rejectQuestion.isPending} loading={rejectQuestion.isPending}
              onClick={() => DEMO ? blocked() : rejectQuestion.mutate({ questionId: rejectQ.id, reason: notes.trim() })}>
               {rejectQuestion.isPending ? "جارٍ رفض السؤال…" : "تأكيد الرفض"}
            </PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
