import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminErrorState } from "@/components/admin/AdminUi";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_ASSESSMENTS, DEMO_ATTEMPTS, DEMO_LEVELS, DEMO_QUESTIONS_BANK } from "@/lib/demo/admin-ops";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";
import {
  ActionMenu, AdminButton, AdminDrawer, AdminEmpty, AdminModal, ChipGroup, FormActions, FormErrorBanner, IconAction, ListSkeleton,
  SelectField, TextAreaField, TextField, useDirtyState,
} from "@/components/admin/AdminUi";

type QuestionType = "mcq" | "true_false" | "fill_blank" | "recitation";
const QUESTION_TYPES: readonly { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "اختيارات" }, { value: "true_false", label: "صح/خطأ" }, { value: "fill_blank", label: "فراغ" }, { value: "recitation", label: "تلاوة" },
];
const typeLabel = (type: string) => QUESTION_TYPES.find((item) => item.value === type)?.label ?? type;
const digits = (value: string) => normalizeDigits(value).replace(/\D/g, "");

type AssessmentDraft = { name: string; levelId: string; pass: string; maxAttempts: string; duration: string };
type QuestionDraft = { assessmentId: string; type: QuestionType; text: string; options: string; answer: string; topic: string };
const parseOptions = (value: string) => value.split(/[،,]/).map((option) => option.trim()).filter(Boolean);

/** Same rules as the Native supervision screen (apps/mobile/app/admin/assessments.tsx). */
function validateAssessment(draft: AssessmentDraft) {
  const pass = Number(draft.pass); const attempts = Number(draft.maxAttempts); const duration = Number(draft.duration);
  if (draft.name.trim().length < 3) return "اسم الاختبار يجب أن يكون 3 أحرف على الأقل.";
  if (!Number.isInteger(pass) || pass < 1 || pass > 100) return "نسبة النجاح يجب أن تكون بين 1 و100.";
  if (!Number.isInteger(attempts) || attempts < 1) return "عدد المحاولات يجب أن يكون واحداً على الأقل.";
  if (!Number.isInteger(duration) || duration < 5 || duration > 180) return "مدة الاختبار يجب أن تكون بين 5 و180 دقيقة.";
  return "";
}
function validateQuestion(draft: QuestionDraft) {
  if (draft.text.trim().length < 3) return "نص السؤال يجب أن يكون 3 أحرف على الأقل.";
  if (draft.type === "mcq" && parseOptions(draft.options).length < 2) return "أدخل خيارين على الأقل، مفصولين بفاصلة.";
  if (!draft.answer.trim()) return "الإجابة الصحيحة مطلوبة.";
  if (draft.type === "mcq" && !parseOptions(draft.options).includes(draft.answer.trim())) return "الإجابة الصحيحة يجب أن تطابق أحد الخيارات.";
  return "";
}

export default function AdminAssessments() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<"assessments" | "bank">("assessments");
  const assessments = trpc.admin.assessmentsList.useQuery(undefined, { enabled: !DEMO });
  const bank = trpc.admin.questionsBankList.useQuery(undefined, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const assessmentsData = DEMO ? DEMO_ASSESSMENTS : (assessments.data ?? []);
  const assessmentsLoading = !DEMO && assessments.isLoading;
  const bankData = DEMO ? DEMO_QUESTIONS_BANK : (bank.data ?? []);
  const bankLoading = !DEMO && bank.isLoading;
  const levelsData = DEMO ? DEMO_LEVELS : (levels.data ?? []);

  const [assessment, setAssessment] = useState<AssessmentDraft | null>(null);
  const [question, setQuestion] = useState<QuestionDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [attemptsFor, setAttemptsFor] = useState<{ id: string; name: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const assessmentDirty = useDirtyState(assessment);
  const questionDirty = useDirtyState(question);
  const attempts = trpc.admin.attemptsList.useQuery({ assessmentId: attemptsFor?.id ?? "" }, { enabled: !!attemptsFor && !DEMO });
  const attemptsData = DEMO ? (DEMO_ATTEMPTS[attemptsFor?.id ?? ""] ?? []) : (attempts.data ?? []);
  const attemptsLoading = !DEMO && attempts.isLoading;

  const invalidate = () => { utils.admin.assessmentsList.invalidate(); utils.admin.questionsBankList.invalidate(); };
  const create = trpc.admin.assessmentCreate.useMutation({
    onSuccess: () => { toast("أُنشئ الاختبار", "success"); setAssessment(null); setFormError(null); invalidate(); },
    onError: (e) => setFormError(userFacingErrorMessage(e, "تعذر إنشاء الاختبار، حاول مرة أخرى.")),
  });
  const toggle = trpc.admin.assessmentUpdate.useMutation({
    onMutate: (v) => setPendingId(String(v.id)),
    onSuccess: () => { toast("حُدّث الاختبار", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر تحديث الاختبار، حاول مرة أخرى."), "error"),
    onSettled: () => setPendingId(null),
  });
  const addQ = trpc.admin.questionAdd.useMutation({
    onSuccess: () => { toast("أُضيف السؤال", "success"); setQuestion(null); setFormError(null); invalidate(); },
    onError: (e) => setFormError(userFacingErrorMessage(e, "تعذر إضافة السؤال، حاول مرة أخرى.")),
  });
  const copyQ = trpc.admin.questionAdd.useMutation({
    onSuccess: () => { toast("أُضيف السؤال إلى الاختبار", "success"); invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر إضافة السؤال، حاول مرة أخرى."), "error"),
    onSettled: () => setPendingId(null),
  });

  const newAssessment = () => { setFormError(null); setAssessment({ name: "", levelId: "", pass: "70", maxAttempts: "3", duration: "15" }); };
  const newQuestion = (assessmentId = "") => { setFormError(null); setQuestion({ assessmentId, type: "mcq", text: "", options: "", answer: "", topic: "" }); };
  const submitAssessment = () => {
    if (!assessment) return;
    if (DEMO) return blocked();
    const error = validateAssessment(assessment);
    if (error) { setFormError(error); return; }
    create.mutate({ name: assessment.name.trim(), levelId: assessment.levelId ? Number(assessment.levelId) : undefined, passPercentage: Number(assessment.pass), maxAttempts: Number(assessment.maxAttempts), durationMinutes: Number(assessment.duration) });
  };
  const submitQuestion = () => {
    if (!question) return;
    if (DEMO) return blocked();
    const error = validateQuestion(question);
    if (error) { setFormError(error); return; }
    addQ.mutate({
      assessmentId: question.assessmentId || undefined, type: question.type, questionText: question.text.trim(),
      options: question.type === "mcq" ? parseOptions(question.options) : undefined,
      correctAnswer: question.answer.trim(), topic: question.topic.trim() || undefined, isBankQuestion: !question.assessmentId,
    });
  };
  const patchAssessment = (next: Partial<AssessmentDraft>) => { setAssessment((current) => (current ? { ...current, ...next } : current)); setFormError(null); };
  const patchQuestion = (next: Partial<QuestionDraft>) => { setQuestion((current) => (current ? { ...current, ...next } : current)); setFormError(null); };

  if (!DEMO && (assessments.isError || bank.isError || levels.isError)) return <AdminErrorState onRetry={() => { void assessments.refetch(); void bank.refetch(); void levels.refetch(); }} />;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="file-text" size={24} />الاختبارات وبنك الأسئلة</h1>
        <div className="flex gap-2">
          <AdminButton icon="plus" onClick={newAssessment}>اختبار</AdminButton>
          <AdminButton variant="secondary" icon="plus" onClick={() => newQuestion()}>سؤال</AdminButton>
        </div>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="القسم">
        {([["assessments", `الاختبارات (${assessmentsData.length})`], ["bank", `بنك الأسئلة (${bankData.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 min-h-[44px] rounded-xl font-readex text-sm transition ${tab === k ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/10 text-burgundy dark:text-gold"}`}>{l}</button>
        ))}
      </div>

      {tab === "assessments" ? (
        assessmentsLoading ? <ListSkeleton /> :
        !assessmentsData.length ? <AdminEmpty icon="file-text" title="لا اختبارات بعد" description="أنشئ أول اختبار للطلاب." action={<AdminButton icon="plus" onClick={newAssessment}>إنشاء اختبار</AdminButton>} /> : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {assessmentsData.map((a) => (
              <GlassCard key={a.id} className={`p-4${a.isActive ? "" : " opacity-70"}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-readex font-bold">{a.name}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-readex text-[11px] font-bold ${a.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>{a.isActive ? "مفعّل" : "موقوف"}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-readex mt-1">
                      {a.levelName ? `المستوى: ${a.levelName} · ` : ""}نجاح من {a.passPercentage}٪ · {a.maxAttempts} محاولات
                      {a.durationMinutes ? ` · ${a.durationMinutes} دقيقة` : ""}
                    </div>
                    <div className="text-[11px] font-readex mt-1">{a.questionCount} سؤال · {a.attemptCount} محاولة إجابة</div>
                  </div>
                  <IconAction icon="chart" label={`نتائج ${a.name}`} onClick={() => setAttemptsFor({ id: a.id, name: a.name })} />
                  <ActionMenu label={`خيارات ${a.name}`} loading={pendingId === String(a.id)} actions={[
                    { key: "question", label: "إضافة سؤال لهذا الاختبار", icon: "plus", onSelect: () => newQuestion(a.id) },
                    { key: "results", label: `النتائج (${a.attemptCount})`, icon: "chart", onSelect: () => setAttemptsFor({ id: a.id, name: a.name }) },
                    { key: "toggle", label: a.isActive ? "إيقاف الاختبار" : "تفعيل الاختبار", icon: a.isActive ? "pause" : "play", onSelect: () => (DEMO ? blocked() : toggle.mutate({ id: a.id, isActive: !a.isActive })) },
                  ]} />
                </div>
              </GlassCard>
            ))}
          </div>
        )
      ) : (
        bankLoading ? <ListSkeleton className="lg:grid-cols-1" /> :
        !bankData.length ? <AdminEmpty icon="file-text" title="بنك الأسئلة فارغ" description="أضف أسئلة عامة يمكن نسخها إلى أي اختبار." action={<AdminButton icon="plus" onClick={() => newQuestion()}>إضافة سؤال</AdminButton>} /> : (
          <div className="space-y-2">
            {bankData.map((q) => (
              <GlassCard key={q.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-readex bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">{typeLabel(q.type)}</span>
                    {q.topic && <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{q.topic}</span>}
                  </div>
                  <p className="font-readex text-sm">{q.questionText}</p>
                  {q.correctAnswer && <p className="font-readex text-[11px] text-green-700 dark:text-green-400 mt-1 flex items-center gap-1"><Icon name="check" size={12} />{q.correctAnswer}</p>}
                </div>
                {assessmentsData.length ? (
                  <ActionMenu label="إضافة السؤال إلى اختبار" loading={pendingId === `bank-${q.id}`} actions={assessmentsData.map((a) => ({
                    key: String(a.id), label: `إضافة إلى «${a.name}»`, icon: "plus" as const,
                    onSelect: () => {
                      if (DEMO) return blocked();
                      setPendingId(`bank-${q.id}`);
                      copyQ.mutate({ assessmentId: a.id, questionText: q.questionText, type: q.type as QuestionType, options: Array.isArray(q.options) ? (q.options as string[]) : undefined, correctAnswer: q.correctAnswer ?? undefined, topic: q.topic ?? undefined });
                    },
                  }))} />
                ) : null}
              </GlassCard>
            ))}
          </div>
        )
      )}

      <AdminModal open={!!assessment} onClose={() => setAssessment(null)} dirty={assessmentDirty} busy={create.isPending} title="إنشاء اختبار"
        footer={(requestClose) => <FormActions onCancel={requestClose} onPrimary={submitAssessment} loading={create.isPending} primaryLabel="إنشاء الاختبار" />}>
        {assessment ? (
          <div className="space-y-3">
            <FormErrorBanner message={formError} />
            <TextField label="اسم الاختبار" required helper="3 أحرف على الأقل" value={assessment.name} onChange={(e) => patchAssessment({ name: e.target.value })} data-autofocus />
            <SelectField label="المستوى" helper="اختياري" value={assessment.levelId} options={[["", "بدون مستوى محدد"], ...levelsData.map((l) => [String(l.id), l.name] as const)]} onChange={(e) => patchAssessment({ levelId: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <TextField label="النجاح من ٪" inputMode="numeric" ltr value={assessment.pass} onChange={(e) => patchAssessment({ pass: digits(e.target.value) })} />
              <TextField label="المحاولات" inputMode="numeric" ltr value={assessment.maxAttempts} onChange={(e) => patchAssessment({ maxAttempts: digits(e.target.value) })} />
              <TextField label="الدقائق" inputMode="numeric" ltr value={assessment.duration} onChange={(e) => patchAssessment({ duration: digits(e.target.value) })} />
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={!!question} onClose={() => setQuestion(null)} dirty={questionDirty} busy={addQ.isPending} title="إضافة سؤال"
        subtitle={question ? `إلى: ${assessmentsData.find((a) => a.id === question.assessmentId)?.name ?? "بنك الأسئلة العام"}` : undefined}
        footer={(requestClose) => <FormActions onCancel={requestClose} onPrimary={submitQuestion} loading={addQ.isPending} primaryLabel="إضافة السؤال" />}>
        {question ? (
          <div className="space-y-3">
            <FormErrorBanner message={formError} />
            <SelectField label="الوجهة" value={question.assessmentId} options={[["", "بنك الأسئلة العام (غير مرتبط باختبار)"], ...assessmentsData.map((a) => [a.id, a.name] as const)]} onChange={(e) => patchQuestion({ assessmentId: e.target.value })} />
            <ChipGroup label="نوع السؤال" options={QUESTION_TYPES} value={question.type} onChange={(type) => patchQuestion({ type: type as QuestionType })} />
            <TextAreaField label="نص السؤال" required rows={3} value={question.text} onChange={(e) => patchQuestion({ text: e.target.value })} data-autofocus />
            {question.type === "mcq" ? <TextField label="الخيارات" required helper="افصل بين الخيارات بفاصلة: أ، ب، ج، د" value={question.options} onChange={(e) => patchQuestion({ options: e.target.value })} /> : null}
            <TextField label="الإجابة الصحيحة" required helper={question.type === "mcq" ? "يجب أن تطابق أحد الخيارات" : undefined} value={question.answer} onChange={(e) => patchQuestion({ answer: e.target.value })} />
            <TextField label="الموضوع" helper="اختياري — مثال: النون الساكنة" value={question.topic} onChange={(e) => patchQuestion({ topic: e.target.value })} />
          </div>
        ) : null}
      </AdminModal>

      <AdminDrawer open={!!attemptsFor} onClose={() => setAttemptsFor(null)} title={attemptsFor ? `نتائج: ${attemptsFor.name}` : ""}
        footer={attemptsFor ? <>
          <AdminButton variant="secondary" onClick={() => setAttemptsFor(null)}>إغلاق</AdminButton>
          <AdminButton icon="plus" onClick={() => { const id = attemptsFor.id; setAttemptsFor(null); newQuestion(id); }}>إضافة سؤال</AdminButton>
        </> : null}>
        {!DEMO && attempts.isError ? <AdminErrorState onRetry={() => void attempts.refetch()} /> : attemptsLoading ? <ListSkeleton rows={4} className="lg:grid-cols-1" /> :
         !attemptsData.length ? <AdminEmpty icon="chart" title="لا محاولات بعد" /> : (
          <div className="space-y-2">
            {attemptsData.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-burgundy/5 dark:bg-white/5 p-3">
                <div className="flex-1">
                  <div className="font-readex text-sm font-bold">{a.studentName}</div>
                  <div className="text-[11px] text-muted-foreground font-readex">{fmtDateTime(a.createdAt)}</div>
                </div>
                <span className="font-amiri text-lg text-burgundy">{a.score}٪</span>
                <span className={`text-[11px] font-readex px-2 py-1 rounded-full ${a.passed ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-destructive/15 text-destructive"}`}>
                  {a.passed ? "ناجح" : "راسب"}
                </span>
              </div>
            ))}
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
