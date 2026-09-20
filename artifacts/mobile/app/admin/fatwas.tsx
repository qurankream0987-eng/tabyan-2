import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, AdminSelect, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { confirmAr } from "../../lib/confirm";

const tabs = [
  ["pending", "بلا إسناد"], ["assigned", "مُسند"], ["answered", "بانتظار النشر"],
  ["published", "منشور"], ["rejected", "مرفوض"],
] as const;
const categories = [
  ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["muamalat", "معاملات"], ["family", "أسرة"],
  ["tajweed", "تجويد"], ["salah", "صلاة"], ["zakah", "زكاة"], ["siyam", "صيام"],
  ["hajj", "حج"], ["taharah", "طهارة"], ["qiraat", "قراءات"], ["other", "أخرى"],
] as const;

export default function Fatwas() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("pending");
  const [selected, setSelected] = useState<any>(null);
  const [assignmentMode, setAssignmentMode] = useState<"assign" | "reassign">("assign");
  const [filterPriority, setFilterPriority] = useState<"" | "urgent" | "normal">("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMufti, setFilterMufti] = useState("");
  const [search, setSearch] = useState("");
  const [mufti, setMufti] = useState("");
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<"success" | "error">("success");

  const q = trpc.admin.fatwaInbox.useQuery({
    tab,
    priority: filterPriority || undefined,
    category: filterCategory ? filterCategory as (typeof categories)[number][0] : undefined,
    muftiId: filterMufti || undefined,
    query: search.trim() || undefined,
  });
  const people = trpc.admin.muftisList.useQuery();
  const refresh = () => {
    void q.refetch();
    void utils.admin.fatwaInbox.invalidate();
    void utils.admin.kpis.invalidate();
  };
  const showFeedback = (message: string, kind: "success" | "error") => {
    setFeedback(message);
    setFeedbackKind(kind);
  };
  const assign = trpc.admin.fatwaAssign.useMutation({
    onSuccess: () => {
      showFeedback(assignmentMode === "reassign" ? "تمت إعادة إسناد الفتوى بنجاح" : "تم إرسال الفتوى إلى المفتي بنجاح", "success");
      setSelected(null);
      refresh();
    },
    onError: (e) => showFeedback(safeError(e, "تعذر إرسال الفتوى إلى المفتي، حاول مرة أخرى"), "error"),
  });
  const changeCategory = trpc.admin.fatwaUpdateCategory.useMutation({
    onSuccess: () => { showFeedback("تم تحديث تصنيف الفتوى", "success"); refresh(); },
    onError: (e) => showFeedback(safeError(e, "تعذر تحديث تصنيف الفتوى، حاول مرة أخرى"), "error"),
  });
  const review = trpc.admin.fatwaReviewAnswer.useMutation({
    onSuccess: (_data, variables) => {
      const message = variables.action === "reject"
        ? "تم رفض الإجابة"
        : variables.action === "publish_public"
          ? "تم نشر الفتوى بنجاح"
          : "تم نشر الفتوى بشكل خاص";
      showFeedback(message, "success");
      setSelected(null);
      refresh();
    },
    onError: (e) => showFeedback(safeError(e, "تعذر تنفيذ مراجعة الفتوى، حاول مرة أخرى"), "error"),
  });
  const reject = trpc.admin.fatwaRejectQuestion.useMutation({
    onSuccess: () => { showFeedback("تم رفض السؤال", "success"); setSelected(null); setNote(""); refresh(); },
    onError: (e) => showFeedback(safeError(e, "تعذر رفض السؤال، حاول مرة أخرى"), "error"),
  });
  const actionPending = assign.isPending || changeCategory.isPending || review.isPending || reject.isPending;

  if (q.isLoading || people.isLoading) return <AdminFrame title="الفتاوى"><LoadingState /></AdminFrame>;
  if (q.error || people.error) {
    return <AdminFrame title="الفتاوى"><ErrorState onRetry={() => { void q.refetch(); void people.refetch(); }} /></AdminFrame>;
  }
  const rows: any[] = q.data ?? [];
  const confirmRejectAnswer = () => {
    if (!selected?.answer || review.isPending) return;
    void confirmAr("تأكيد رفض الإجابة", "هل تريد رفض إجابة المفتي؟").then((ok) => {
      if (ok && !review.isPending) {
        review.mutate({ answerId: selected.answer.id, action: "reject", notes: note.trim() || undefined });
      }
    });
  };
  const confirmRejectQuestion = () => {
    if (!selected || reject.isPending || note.trim().length < 5) return;
    void confirmAr("تأكيد رفض السؤال", "هل تريد رفض هذا السؤال؟").then((ok) => {
      if (ok && !reject.isPending) reject.mutate({ questionId: selected.id, reason: note.trim() });
    });
  };

  return <AdminFrame title="الفتاوى">
    {feedback ? <Text style={[styles.feedback, { color: feedbackKind === "error" ? colors.danger : colors.primary }]}>{feedback}</Text> : null}
    <View style={styles.tabs}>
      {tabs.map(([key, label]) => (
        <Pressable key={key} disabled={actionPending} onPress={() => setTab(key)} style={[styles.tab, { backgroundColor: tab === key ? colors.primary : colors.input, opacity: actionPending ? 0.55 : 1 }]}>
          <Text style={{ color: tab === key ? colors.primaryText : colors.text }}>{label}</Text>
        </Pressable>
      ))}
    </View>
    <View style={styles.filters}>
      <AdminInput value={search} onChangeText={setSearch} placeholder="بحث عربي في نص السؤال…" />
      <AdminSelect
        label="الأولوية"
        value={filterPriority}
        options={[{ value: "", label: "كل الأولويات" }, { value: "urgent", label: "عاجل" }, { value: "normal", label: "عادي" }]}
        onChange={(value) => setFilterPriority(value as "" | "urgent" | "normal")}
        disabled={actionPending}
      />
      <AdminSelect
        label="التصنيف"
        value={filterCategory}
        options={[{ value: "", label: "كل التصنيفات" }, ...categories.map(([value, label]) => ({ value, label }))]}
        onChange={setFilterCategory}
        disabled={actionPending}
      />
      <AdminSelect
        label="المفتي المسند إليه"
        value={filterMufti}
        options={[{ value: "", label: "كل المفتين" }, ...(people.data ?? []).map((m: any) => ({ value: String(m.teacherId), label: m.fullName }))]}
        onChange={setFilterMufti}
        searchable
        disabled={actionPending}
      />
    </View>

    {!rows.length ? <EmptyState title="لا عناصر في هذا التبويب" /> : rows.map((r) => (
      <Card key={r.id}>
        <Text style={[styles.title, { color: colors.text }]}>{r.questionText}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          {r.studentName} · {r.categoryLabel} {r.muftiName ? `· ${r.muftiName}` : ""} {r.priority === "urgent" ? "· عاجل" : ""}
        </Text>
        {r.hoursAgo != null ? (
          <Text style={[styles.muted, { color: r.hoursAgo >= 48 && tab === "assigned" ? colors.danger : colors.muted }]}>
            منذ {r.hoursAgo} ساعة{r.hoursAgo >= 48 && tab === "assigned" ? " · متجاوزة مهلة الإسناد" : ""}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {(tab === "pending" || tab === "assigned") ? (
            <Button
              label={tab === "pending" ? "إسناد لمفتٍ" : "إعادة إسناد"}
              disabled={actionPending}
              onPress={() => {
                setSelected(r);
                setAssignmentMode(r.muftiId ? "reassign" : "assign");
                setMufti(r.muftiId ?? "");
                setNote("");
                setUrgent(r.priority === "urgent");
              }}
            />
          ) : null}
          {tab === "pending" ? (
            <Button
              label="رفض السؤال"
              variant="danger"
              disabled={actionPending}
              onPress={() => { setSelected(r); setNote(""); }}
            />
          ) : null}
          {tab === "answered" && r.answer ? (
            <Button
              label="مراجعة الإجابة"
              disabled={actionPending}
              onPress={() => { setSelected(r); setAnswer(r.answer.answerText); setNote(""); }}
            />
          ) : null}
          <AdminSelect
            label="التصنيف"
            value={r.category ?? ""}
            options={categories.map(([value, label]) => ({ value, label }))}
            disabled={actionPending}
            onChange={(value) => changeCategory.mutate({ questionId: r.id, category: value as (typeof categories)[number][0] })}
            placeholder="اختر التصنيف"
          />
        </View>
      </Card>
    ))}

    {selected ? (
      <Card accent>
        <Text style={[styles.title, { color: colors.text }]}>إجراء على الفتوى</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>{selected.questionText}</Text>
        {(tab === "pending" || tab === "assigned") ? (
          <>
            <AdminSelect
              label="المفتي"
              value={mufti}
              options={(people.data ?? []).map((m: any) => ({ value: String(m.teacherId), label: `${m.fullName} · معلق ${m.pending}/${m.maxPending}` }))}
              onChange={setMufti}
              placeholder="اختر المفتي"
              searchable
              disabled={actionPending}
            />
            <Button label={urgent ? "إلغاء وسم عاجل" : "وسم كعاجل"} variant={urgent ? "primary" : "secondary"} disabled={actionPending} onPress={() => setUrgent(!urgent)} />
            <AdminInput value={note} onChangeText={setNote} placeholder="ملاحظة للمفتي (اختياري)" />
            <Button
              label={assignmentMode === "reassign" ? "تأكيد إعادة الإسناد" : "تأكيد الإسناد"}
              disabled={!mufti || actionPending}
              loading={assign.isPending}
              onPress={() => assign.mutate({ questionId: selected.id, muftiId: mufti, urgent, note: note.trim() || undefined })}
            />
          </>
        ) : null}
        {tab === "answered" && selected.answer ? (
          <>
            <AdminInput value={answer} onChangeText={setAnswer} multiline placeholder="نص الإجابة (50 حرفاً على الأقل)" />
            <AdminInput value={note} onChangeText={setNote} placeholder="ملاحظات داخلية" />
            <Button
              label="نشر عام"
              disabled={answer.trim().length < 50 || actionPending}
              loading={review.isPending}
              onPress={() => review.mutate({ answerId: selected.answer.id, action: "publish_public", editedText: answer !== selected.answer.answerText ? answer.trim() : undefined, notes: note.trim() || undefined })}
            />
            <Button
              label="نشر خاص"
              variant="secondary"
              disabled={actionPending}
              loading={review.isPending}
              onPress={() => review.mutate({ answerId: selected.answer.id, action: "publish_private", editedText: answer !== selected.answer.answerText ? answer.trim() : undefined, notes: note.trim() || undefined })}
            />
            <Button label="رفض الإجابة" variant="danger" disabled={actionPending} loading={review.isPending} onPress={confirmRejectAnswer} />
          </>
        ) : null}
        {tab === "pending" ? (
          <>
            <AdminInput value={note} onChangeText={setNote} placeholder="سبب الرفض (5 أحرف على الأقل)" />
            <Button label="تأكيد رفض السؤال" variant="danger" disabled={note.trim().length < 5 || actionPending} loading={reject.isPending} onPress={confirmRejectQuestion} />
          </>
        ) : null}
        <Button label="إغلاق" variant="secondary" disabled={actionPending} onPress={() => setSelected(null)} />
      </Card>
    ) : null}
    <Button label="تحديث البيانات" variant="secondary" icon="refresh-outline" disabled={actionPending} onPress={refresh} />
  </AdminFrame>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  filters: { gap: 4, marginBottom: 8 },
  tab: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14 },
  title: { textAlign: "right", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15 },
  muted: { textAlign: "right", fontSize: 12, marginTop: 5, fontFamily: "IBMPlexSansArabic_400Regular" },
  actions: { gap: 7, marginTop: 10 },
  feedback: { textAlign: "right", marginBottom: 8, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
});