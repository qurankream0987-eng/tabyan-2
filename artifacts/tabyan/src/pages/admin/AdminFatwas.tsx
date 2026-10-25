import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminErrorState } from "@/components/admin/AdminUi";
import AudioPlayerBar from "@/components/app/AudioPlayerBar";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { FATWA_CATEGORIES } from "@/lib/format";
import { DEMO_FATWA_INBOX, DEMO_MUFTIS } from "@/lib/demo/admin-ops";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import {
  AdminButton, AdminDrawer, AdminEmpty, AdminFilterBar, AdminModal, ConfirmDialog, FormActions, FormErrorBanner, ListSkeleton,
  SelectField, SwitchField, TextAreaField, TextField, useDirtyState,
} from "@/components/admin/AdminUi";

type Q = {
  id: string; questionText: string; category: string; categoryLabel: string; status: string; priority: string;
  studentName: string; muftiName: string | null; hoursAgo: number; muftiId: string | null;
  answer: { id: string; answerText: string; audioUrl: string; status: string; audioDurationSeconds: number | null } | null;
};
const TABS = [["pending", "بلا إسناد"], ["assigned", "مُسند"], ["answered", "بانتظار نشر"], ["published", "منشور"], ["rejected", "مرفوض"]] as const;
const REJECT_REASON_MIN = 5; // admin.fatwaRejectQuestion: reason.min(5)
const PUBLIC_ANSWER_MIN = 50;
type Filters = { priority: string; category: string; mufti: string };
const EMPTY_FILTERS: Filters = { priority: "", category: "", mufti: "" };

export default function AdminFatwas() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("pending");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const q = trpc.admin.fatwaInbox.useQuery({
    tab,
    priority: (filters.priority || undefined) as "urgent" | "normal" | undefined,
    category: (filters.category || undefined) as never,
    muftiId: filters.mufti || undefined,
    query: search.trim() || undefined,
  }, { enabled: !DEMO });
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
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"reject-question" | "reject-answer" | null>(null);
  const [categoryPendingId, setCategoryPendingId] = useState<string | null>(null);
  const assignDirty = useDirtyState(assignTo ? { muftiId, urgent, note } : null);
  const reviewDirty = useDirtyState(review ? { editedText, notes } : null);
  const rejectDirty = useDirtyState(rejectQ ? notes : null);

  const invalidate = () => { utils.admin.fatwaInbox.invalidate(); utils.admin.kpis.invalidate(); };
  const closeAll = () => { setAssignTo(null); setReview(null); setRejectQ(null); setConfirming(null); setFormError(null); };
  const assign = trpc.admin.fatwaAssign.useMutation({
    onSuccess: () => { toast(assignTo?.muftiId ? "تمت إعادة إسناد الفتوى بنجاح" : "تم إرسال الفتوى إلى المفتي بنجاح", "success"); closeAll(); invalidate(); },
    onError: (e) => setFormError(userFacingErrorMessage(e, "تعذر إرسال الفتوى إلى المفتي، حاول مرة أخرى")),
  });
  const reviewAnswer = trpc.admin.fatwaReviewAnswer.useMutation({
    onSuccess: (_data, variables) => {
      toast(variables.action === "reject" ? "تم رفض الإجابة" : variables.action === "publish_public" ? "تم نشر الفتوى بنجاح" : "تم نشر الفتوى بشكل خاص", "success");
      closeAll(); invalidate();
    },
    onError: (e) => { setConfirming(null); setFormError(userFacingErrorMessage(e, "تعذر تنفيذ مراجعة الفتوى، حاول مرة أخرى")); },
  });
  const rejectQuestion = trpc.admin.fatwaRejectQuestion.useMutation({
    onSuccess: () => { toast("تم رفض السؤال", "success"); closeAll(); invalidate(); },
    onError: (e) => { setConfirming(null); setFormError(userFacingErrorMessage(e, "تعذر رفض السؤال، حاول مرة أخرى")); },
  });
  const updateCategory = trpc.admin.fatwaUpdateCategory.useMutation({
    onMutate: (v) => setCategoryPendingId(v.questionId),
    onSuccess: () => { toast("تم تحديث تصنيف الفتوى", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تحديث تصنيف الفتوى، حاول مرة أخرى"), "error"),
    onSettled: () => setCategoryPendingId(null),
  });
  const reviewPayload = () => review?.answer ? { answerId: review.answer.id, editedText: editedText !== review.answer.answerText ? editedText : undefined, notes: notes || undefined } : null;

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="scale" size={22} />إدارة الفتاوى</h1>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="حالة الفتاوى">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[44px] px-4 rounded-xl font-readex text-sm whitespace-nowrap transition ${tab === k ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/10 text-burgundy dark:text-gold"}`}>{l}</button>
        ))}
      </div>
      <AdminFilterBar query={search} onQuery={setSearch} placeholder="بحث في نص السؤال…" values={filters} onChange={(values) => setFilters(values as Filters)}
        resultSummary={isLoading ? null : `${data?.length ?? 0} سؤالاً`}
        filters={[
          { key: "priority", label: "الأولوية", options: [["urgent", "عاجل"], ["normal", "عادي"]] },
          { key: "category", label: "التصنيف", options: Object.entries(FATWA_CATEGORIES) },
          { key: "mufti", label: "المفتي", options: muftisData.map((m) => [String(m.teacherId), m.fullName] as const) },
        ]} />

      {!DEMO && (q.isError || muftis.isError) ? <AdminErrorState onRetry={() => { void q.refetch(); void muftis.refetch(); }} /> : isLoading ? <ListSkeleton className="lg:grid-cols-1" /> :
       !data?.length ? <AdminEmpty icon="scale" title="لا عناصر في هذا التبويب" description={search || Object.values(filters).some(Boolean) ? "غيّر البحث أو امسح الفلاتر." : undefined} /> : (
        <div className="space-y-2">
          {data.map((q) => (
            <GlassCard key={q.id} className="p-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <select value={q.category} aria-label="تصنيف السؤال" disabled={categoryPendingId === q.id} aria-busy={categoryPendingId === q.id || undefined}
                  onChange={(e) => {
                    const category = e.target.value;
                    if (category === q.category) return;
                    if (DEMO) { blocked(); e.target.value = q.category; return; }
                    updateCategory.mutate({ questionId: q.id, category: category as never });
                  }}
                  className="min-h-[36px] cursor-pointer rounded-full border-0 bg-gold/15 px-3 font-readex text-xs text-gold-dark focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60 dark:text-gold">
                  {Object.entries(FATWA_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {q.priority === "urgent" && <span className="text-[11px] font-readex bg-destructive/15 text-destructive px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Icon name="flame" size={11} />عاجل</span>}
                {q.hoursAgo >= 48 && tab === "assigned" && <span className="text-[11px] font-readex bg-destructive/15 text-destructive px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Icon name="timer" size={11} />تجاوز 48س — أعد الإسناد</span>}
                <span className="text-[11px] text-muted-foreground font-readex ms-auto">منذ {q.hoursAgo} س</span>
              </div>
              <p className="font-readex text-sm font-bold line-clamp-2">{q.questionText}</p>
              <div className="text-[11px] text-muted-foreground font-readex mt-1">السائل: {q.studentName}{q.muftiName ? ` · المفتي: ${q.muftiName}` : ""}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {(tab === "pending" || tab === "assigned") && (
                  <AdminButton icon="send" onClick={() => { setFormError(null); setAssignTo(q); setMuftiId(q.muftiId ?? ""); setUrgent(q.priority === "urgent"); setNote(""); }}>
                    {tab === "pending" ? "إسناد لمفتٍ" : "إعادة إسناد"}
                  </AdminButton>
                )}
                {tab === "answered" && q.answer && (
                  <AdminButton icon="edit" onClick={() => { setFormError(null); setReview(q); setEditedText(q.answer!.answerText); setNotes(""); }}>مراجعة الإجابة</AdminButton>
                )}
                {tab === "pending" && <AdminButton variant="secondary" className="text-destructive dark:text-destructive" onClick={() => { setFormError(null); setRejectQ(q); setNotes(""); }}>رفض السؤال</AdminButton>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <AdminModal open={!!assignTo} onClose={() => setAssignTo(null)} dirty={assignDirty} busy={assign.isPending}
        title={assignTo?.muftiId ? "إعادة إسناد الفتوى" : "إسناد إلى مفتٍ"} subtitle={assignTo?.categoryLabel}
        footer={(requestClose) => <FormActions onCancel={requestClose} primaryLabel={assignTo?.muftiId ? "تأكيد إعادة الإسناد" : "إسناد"} disabled={!muftiId} loading={assign.isPending}
          onPrimary={() => assignTo && (DEMO ? blocked() : assign.mutate({ questionId: assignTo.id, muftiId, note: note || undefined, urgent }))} />}>
        {assignTo && (
          <div className="space-y-3">
            <FormErrorBanner message={formError} />
            <p className="rounded-xl bg-burgundy/5 p-3 font-readex text-sm dark:bg-white/5">{assignTo.questionText}</p>
            <SelectField label="المفتي" required helper="الإسناد يتطلب مفتياً معيّناً لتصنيف السؤال" value={muftiId} onChange={(e) => { setMuftiId(e.target.value); setFormError(null); }}
              options={[["", "اختر مفتياً…"], ...muftisData.map((m) => [String(m.teacherId), `${m.fullName} — معلق: ${m.pending}/${m.maxPending} · تقييم ${m.avgStars}`] as const)]} />
            <TextField label="ملاحظة للمفتي" helper="اختياري" value={note} onChange={(e) => setNote(e.target.value)} />
            <SwitchField label="وسم كعاجل" helper="يظهر أولاً لدى المفتي" checked={urgent} onChange={setUrgent} />
          </div>
        )}
      </AdminModal>

      <AdminDrawer open={!!review} onClose={() => setReview(null)} size="lg" dirty={reviewDirty} busy={reviewAnswer.isPending}
        title="مراجعة إجابة المفتي" subtitle={review ? `${review.studentName}${review.muftiName ? ` · ${review.muftiName}` : ""}` : undefined}
        footer={<>
          <AdminButton variant="danger" icon="x" loading={reviewAnswer.isPending && reviewAnswer.variables?.action === "reject"} onClick={() => (DEMO ? blocked() : setConfirming("reject-answer"))}>رفض</AdminButton>
          <AdminButton variant="secondary" icon="lock" loading={reviewAnswer.isPending && reviewAnswer.variables?.action === "publish_private"}
            onClick={() => { const payload = reviewPayload(); if (DEMO) blocked(); else if (payload) reviewAnswer.mutate({ ...payload, action: "publish_private" }); }}>نشر خاص</AdminButton>
          <AdminButton icon="globe" disabled={editedText.trim().length < PUBLIC_ANSWER_MIN} loading={reviewAnswer.isPending && reviewAnswer.variables?.action === "publish_public"}
            onClick={() => { const payload = reviewPayload(); if (DEMO) blocked(); else if (payload) reviewAnswer.mutate({ ...payload, action: "publish_public" }); }}>نشر عام</AdminButton>
        </>}>
        {review?.answer && (
          <div className="space-y-3">
            <FormErrorBanner message={formError} />
            <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
              <div className="font-readex text-xs text-muted-foreground">السؤال — {review.studentName}</div>
              <p className="font-readex text-sm mt-1">{review.questionText}</p>
            </div>
            <TextAreaField label="الإجابة" helper={`يمكنك تحريرها قبل النشر — ${editedText.trim().length} حرفاً (${PUBLIC_ANSWER_MIN} على الأقل للنشر العام)`} rows={8} maxLength={2000}
              value={editedText} onChange={(e) => setEditedText(e.target.value)} />
            <AudioPlayerBar src={review.answer.audioUrl} duration={review.answer.audioDurationSeconds ?? undefined} />
            <TextField label="ملاحظات داخلية" helper="اختياري — لا تظهر للطالب" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
      </AdminDrawer>

      <AdminModal open={!!rejectQ} onClose={() => setRejectQ(null)} dirty={rejectDirty} busy={rejectQuestion.isPending} title="رفض السؤال" subtitle={rejectQ?.studentName}
        footer={(requestClose) => <FormActions onCancel={requestClose} danger primaryLabel="رفض السؤال" disabled={notes.trim().length < REJECT_REASON_MIN} loading={rejectQuestion.isPending}
          onPrimary={() => (DEMO ? blocked() : setConfirming("reject-question"))} />}>
        {rejectQ && (
          <div className="space-y-3">
            <FormErrorBanner message={formError} />
            <p className="rounded-xl bg-burgundy/5 p-3 font-readex text-sm dark:bg-white/5">{rejectQ.questionText}</p>
            <TextAreaField label="سبب الرفض" required helper={`يظهر للطالب — ${REJECT_REASON_MIN} أحرف على الأقل`} rows={3} maxLength={500} value={notes}
              onChange={(e) => { setNotes(e.target.value); setFormError(null); }} data-autofocus />
          </div>
        )}
      </AdminModal>

      <ConfirmDialog open={confirming === "reject-question"} title="رفض هذا السؤال؟" itemName={rejectQ?.questionText} confirmLabel="رفض السؤال" loading={rejectQuestion.isPending}
        impact="سيُغلق السؤال ويُبلَّغ الطالب بسبب الرفض. لا يمكن التراجع عن هذا الإجراء."
        onCancel={() => setConfirming(null)} onConfirm={() => rejectQ && rejectQuestion.mutate({ questionId: rejectQ.id, reason: notes.trim() })} />
      <ConfirmDialog open={confirming === "reject-answer"} title="رفض إجابة المفتي؟" itemName={review?.muftiName ?? undefined} confirmLabel="رفض الإجابة" loading={reviewAnswer.isPending}
        impact="ستُعاد الإجابة دون نشر، ولن تصل إلى الطالب."
        onCancel={() => setConfirming(null)} onConfirm={() => { const payload = reviewPayload(); if (payload) reviewAnswer.mutate({ answerId: payload.answerId, action: "reject", notes: payload.notes }); }} />
    </div>
  );
}
