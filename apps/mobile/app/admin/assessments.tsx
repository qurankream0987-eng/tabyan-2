import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminSelect, safeError } from "../../components/admin/admin-common";
import { Badge, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import {
  AdminRow, AdminSheet, ChoiceChips, FormError, FormInput, HeaderAction, IconAction, ListSkeleton, MobileActionSheet, SheetFooter,
  useAdminFeedback, useDirtyState, useSheetChain,
} from "../../components/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";

type QuestionType = "mcq" | "true_false" | "fill_blank" | "recitation";
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "اختيارات" }, { value: "true_false", label: "صح/خطأ" }, { value: "fill_blank", label: "فراغ" }, { value: "recitation", label: "تلاوة" },
];
const typeLabel = (type: unknown) => QUESTION_TYPES.find((item) => item.value === type)?.label ?? String(type ?? "");
type AssessmentDraft = { name: string; levelId: string; pass: string; maxAttempts: string; duration: string };
type QuestionDraft = { assessmentId?: string; target: string; question: string; questionType: QuestionType; options: string; answer: string; topic: string };

export default function Assessments() {
  const { colors } = useTheme();
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const q = trpc.admin.assessmentsList.useQuery();
  const bank = trpc.admin.questionsBankList.useQuery();
  const levels = trpc.admin.levelThresholds.useQuery();
  const [tab, setTab] = useState<"assessments" | "bank">("assessments");
  const [assessment, setAssessment] = useState<AssessmentDraft | null>(null);
  const [question, setQuestion] = useState<QuestionDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [menuFor, setMenuFor] = useState<any>(null);
  const [bankItem, setBankItem] = useState<any>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const assessmentDirty = useDirtyState(assessment);
  const questionDirty = useDirtyState(question);
  const { chain, onDismissed } = useSheetChain();
  const attempts = trpc.admin.attemptsList.useQuery({ assessmentId: results?.id ?? "" }, { enabled: !!results });

  const invalidate = () => { void utils.admin.assessmentsList.invalidate(); void utils.admin.questionsBankList.invalidate(); };
  const create = trpc.admin.assessmentCreate.useMutation({
    onSuccess: () => { setAssessment(null); setFormError(null); notify("أُنشئ الاختبار"); invalidate(); },
    onError: (e: unknown) => setFormError(safeError(e, "تعذر إنشاء الاختبار.")),
  });
  const toggle = trpc.admin.assessmentUpdate.useMutation({
    onMutate: (vars: any) => setPendingId(String(vars.id)),
    onSuccess: () => { notify("حُدّث الاختبار"); invalidate(); },
    onError: (e: unknown) => notify(safeError(e, "تعذر تحديث الاختبار."), "error"),
    onSettled: () => setPendingId(null),
  });
  const add = trpc.admin.questionAdd.useMutation({
    onSuccess: () => { setQuestion(null); setFormError(null); notify("أُضيف السؤال"); invalidate(); },
    onError: (e: unknown) => setFormError(safeError(e, "تعذر إضافة السؤال.")),
  });
  const copyFromBank = trpc.admin.questionAdd.useMutation({
    onSuccess: () => { notify("أُضيف السؤال إلى الاختبار"); invalidate(); },
    onError: (e: unknown) => notify(safeError(e, "تعذر إضافة السؤال."), "error"),
  });

  const parsedOptions = (draft: QuestionDraft) => draft.options.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const validateAssessment = (draft: AssessmentDraft) => {
    const passValue = Number(draft.pass); const attemptsValue = Number(draft.maxAttempts); const durationValue = Number(draft.duration);
    if (draft.name.trim().length < 3) return "اسم الاختبار يجب أن يكون 3 أحرف على الأقل.";
    if (!Number.isInteger(passValue) || passValue < 1 || passValue > 100) return "نسبة النجاح يجب أن تكون بين 1 و100.";
    if (!Number.isInteger(attemptsValue) || attemptsValue < 1) return "عدد المحاولات يجب أن يكون واحداً على الأقل.";
    if (!Number.isInteger(durationValue) || durationValue < 5 || durationValue > 180) return "مدة الاختبار يجب أن تكون بين 5 و180 دقيقة.";
    return "";
  };
  const validateQuestion = (draft: QuestionDraft) => {
    if (draft.question.trim().length < 3) return "نص السؤال يجب أن يكون 3 أحرف على الأقل.";
    if (draft.questionType === "mcq" && parsedOptions(draft).length < 2) return "أدخل خيارين على الأقل، مفصولين بفاصلة.";
    if (!draft.answer.trim()) return "الإجابة الصحيحة مطلوبة.";
    if (draft.questionType === "mcq" && !parsedOptions(draft).some((option) => option === draft.answer.trim())) return "الإجابة الصحيحة يجب أن تطابق أحد الخيارات.";
    return "";
  };
  const submitAssessment = () => {
    if (!assessment) return;
    const error = validateAssessment(assessment);
    if (error) { setFormError(error); return; }
    create.mutate({ name: assessment.name.trim(), levelId: assessment.levelId ? Number(assessment.levelId) : undefined, passPercentage: Number(assessment.pass), maxAttempts: Number(assessment.maxAttempts), durationMinutes: Number(assessment.duration) } as any);
  };
  const submitQuestion = () => {
    if (!question) return;
    const error = validateQuestion(question);
    if (error) { setFormError(error); return; }
    add.mutate({ assessmentId: question.assessmentId, questionText: question.question.trim(), type: question.questionType, options: question.questionType === "mcq" ? parsedOptions(question) : undefined, correctAnswer: question.answer.trim(), topic: question.topic.trim() || undefined, isBankQuestion: !question.assessmentId } as any);
  };
  const newAssessment = () => { setFormError(null); setAssessment({ name: "", levelId: "", pass: "70", maxAttempts: "3", duration: "15" }); };
  const newQuestion = (target?: any) => { setFormError(null); setQuestion({ assessmentId: target?.id, target: target?.name ?? "بنك الأسئلة العام", question: "", questionType: "mcq", options: "", answer: "", topic: "" }); };
  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  const bankRows: any[] = Array.isArray(bank.data) ? bank.data : [];
  const numeric = (value: string) => value.replace(/[^0-9٠-٩]/g, "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

  return (
    <AdminFrame title="التقييمات" right={<HeaderAction label="إضافة" accessibilityLabel={tab === "bank" ? "إضافة سؤال إلى البنك" : "إنشاء اختبار"} onPress={() => (tab === "bank" ? newQuestion() : newAssessment())} />}>
      <ChoiceChips label="القسم" options={[{ value: "assessments", label: `الاختبارات (${rows.length})` }, { value: "bank", label: `بنك الأسئلة (${bankRows.length})` }]} value={tab} onChange={(value) => setTab(value as typeof tab)} />
      {q.isLoading || bank.isLoading || levels.isLoading ? <ListSkeleton /> : q.error || bank.error || levels.error ? <ErrorState onRetry={() => { void q.refetch(); void bank.refetch(); void levels.refetch(); }} /> : tab === "bank" ? (
        !bankRows.length ? <EmptyState title="بنك الأسئلة فارغ" description="أضف أسئلة عامة يمكن نسخها إلى أي اختبار." action="إضافة سؤال" onAction={() => newQuestion()} /> : bankRows.map((item) => (
          <AdminRow key={item.id} title={item.questionText} subtitle={[item.topic, typeLabel(item.type)].filter(Boolean).join(" · ")}
            actions={<IconAction icon="add-circle-outline" label={`إضافة «${item.questionText}» إلى اختبار`} disabled={!rows.length} loading={pendingId === `bank-${item.id}`} onPress={() => setBankItem(item)} />} />
        ))
      ) : !rows.length ? <EmptyState title="لا توجد اختبارات" description="أنشئ أول اختبار للطلاب." action="إنشاء اختبار" onAction={newAssessment} /> : rows.map((a) => (
        <AdminRow key={a.id} title={a.name} muted={a.isActive === false}
          subtitle={`${a.levelName ? `المستوى: ${a.levelName} · ` : ""}نجاح ${a.passPercentage}% · ${a.maxAttempts} محاولات · ${a.questionCount ?? 0} سؤال`}
          badges={<><Badge label={a.isActive === false ? "موقوف" : "مفعّل"} tone={a.isActive === false ? "muted" : "success"} /><Badge label={`${a.attemptCount ?? 0} محاولة`} /></>}
          actions={<>
            <IconAction icon="bar-chart-outline" label={`نتائج ${a.name}`} onPress={() => setResults(a)} />
            <IconAction icon="ellipsis-horizontal" label={`خيارات ${a.name}`} loading={pendingId === String(a.id)} onPress={() => setMenuFor(a)} />
          </>} />
      ))}

      <MobileActionSheet visible={!!menuFor} title={menuFor?.name ?? ""} onClose={() => setMenuFor(null)} actions={menuFor ? [
        { key: "question", label: "إضافة سؤال", icon: "add-circle-outline", onPress: () => newQuestion(menuFor) },
        { key: "results", label: `النتائج (${menuFor.attemptCount ?? 0})`, icon: "bar-chart-outline", onPress: () => setResults(menuFor) },
        { key: "toggle", label: menuFor.isActive === false ? "تفعيل الاختبار" : "إيقاف الاختبار", icon: menuFor.isActive === false ? "play-circle-outline" : "pause-circle-outline", onPress: () => toggle.mutate({ id: menuFor.id, isActive: menuFor.isActive === false } as any) },
      ] : []} />

      <MobileActionSheet visible={!!bankItem} title="إضافة السؤال إلى اختبار" subtitle={bankItem?.questionText} onClose={() => setBankItem(null)}
        actions={rows.map((a) => ({ key: String(a.id), label: a.name, icon: "clipboard-outline", onPress: () => { if (!bankItem) return; setPendingId(`bank-${bankItem.id}`); copyFromBank.mutate({ assessmentId: a.id, questionText: bankItem.questionText, type: bankItem.type, options: bankItem.options ?? undefined, correctAnswer: bankItem.correctAnswer ?? undefined, topic: bankItem.topic ?? undefined } as any, { onSettled: () => setPendingId(null) }); } }))} />

      <AdminSheet visible={!!assessment} title="إنشاء اختبار" onClose={() => { setAssessment(null); setFormError(null); }} dirty={assessmentDirty} busy={create.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={submitAssessment} loading={create.isPending} primaryLabel="إنشاء الاختبار" />}>
        {assessment ? <>
          <FormError message={formError} />
          <FormInput label="اسم الاختبار" required helper="3 أحرف على الأقل" value={assessment.name} onChangeText={(name) => { setAssessment({ ...assessment, name }); setFormError(null); }} />
          <AdminSelect label="المستوى (اختياري)" value={assessment.levelId} options={(levels.data ?? []).map((l: any) => ({ value: String(l.id), label: String(l.name) }))} onChange={(levelId) => setAssessment({ ...assessment, levelId })} placeholder="بدون مستوى محدد" />
          <View style={styles.grid}>
            <View style={styles.cell}><FormInput label="نسبة النجاح %" keyboardType="number-pad" value={assessment.pass} onChangeText={(value) => setAssessment({ ...assessment, pass: numeric(value) })} /></View>
            <View style={styles.cell}><FormInput label="المحاولات" keyboardType="number-pad" value={assessment.maxAttempts} onChangeText={(value) => setAssessment({ ...assessment, maxAttempts: numeric(value) })} /></View>
            <View style={styles.cell}><FormInput label="المدة (دقيقة)" keyboardType="number-pad" value={assessment.duration} onChangeText={(value) => setAssessment({ ...assessment, duration: numeric(value) })} /></View>
          </View>
        </> : null}
      </AdminSheet>

      <AdminSheet visible={!!question} title="إضافة سؤال" subtitle={question ? `إلى: ${question.target}` : undefined} onClose={() => { setQuestion(null); setFormError(null); }} dirty={questionDirty} busy={add.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={submitQuestion} loading={add.isPending} primaryLabel="إضافة السؤال" />}>
        {question ? <>
          <FormError message={formError} />
          <FormInput label="نص السؤال" required multiline value={question.question} onChangeText={(value) => { setQuestion({ ...question, question: value }); setFormError(null); }} />
          <ChoiceChips label="نوع السؤال" options={QUESTION_TYPES} value={question.questionType} onChange={(value) => setQuestion({ ...question, questionType: value as QuestionType })} />
          {question.questionType === "mcq" ? <FormInput label="الخيارات" required helper="افصل بين الخيارات بفاصلة" value={question.options} onChangeText={(options) => { setQuestion({ ...question, options }); setFormError(null); }} /> : null}
          <FormInput label="الإجابة الصحيحة" required helper={question.questionType === "mcq" ? "يجب أن تطابق أحد الخيارات" : undefined} value={question.answer} onChangeText={(answer) => { setQuestion({ ...question, answer }); setFormError(null); }} />
          <FormInput label="الموضوع" helper="اختياري" value={question.topic} onChangeText={(topic) => setQuestion({ ...question, topic })} />
        </> : null}
      </AdminSheet>

      <AdminSheet visible={!!results} title={results ? `نتائج: ${results.name}` : ""} subtitle={results ? `${results.attemptCount ?? 0} محاولة · نجاح ${results.passPercentage}%` : undefined} onClose={() => setResults(null)} onDismissed={onDismissed}
        footer={results ? <SheetFooter secondaryLabel="إغلاق" onSecondary={() => setResults(null)} primaryLabel="إضافة سؤال" onPrimary={() => { const target = results; chain(() => setResults(null), () => newQuestion(target)); }} /> : null}>
        {attempts.isLoading ? <LoadingState /> : attempts.error ? <ErrorState onRetry={() => void attempts.refetch()} /> : !attempts.data?.length ? <EmptyState title="لا توجد محاولات" /> : attempts.data.map((item: any) => (
          <View key={item.id} style={[styles.attempt, { borderBottomColor: colors.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: colors.text }]}>{item.studentName ?? "طالب"}</Text>
              <Text style={[styles.muted, { color: colors.muted }]}>{item.createdAt ? new Date(String(item.createdAt)).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : ""}</Text>
            </View>
            <Badge label={`${item.score ?? 0}% · ${item.passed ? "ناجح" : "راسب"}`} tone={item.passed ? "success" : "danger"} />
          </View>
        ))}
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 2 },
  grid: { flexDirection: "row-reverse", gap: 8 },
  cell: { flex: 1 },
  attempt: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
});
