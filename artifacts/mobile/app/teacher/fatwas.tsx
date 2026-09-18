import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "./_components";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

type FatwaItem = {
  id: string; questionText: string; category: string; status: string; priority: string;
  studentName?: string; answerStatus?: string | null; hoursAgo?: number;
};

const categoryLabels: Record<string, string> = { aqeedah: "عقيدة", fiqh: "فقه", worship: "عبادات", family: "أسرة", general: "عام" };

export default function Fatwas() {
  const { colors } = useTheme();
  const query = trpc.teacher.fatwaInbox.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<FatwaItem | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const answer = trpc.teacher.answerFatwa.useMutation({
    onSuccess: () => {
      setFeedback("تم إرسال الإجابة للمراجعة");
      setSelected(null); setAnswerText(""); setReferenceText(""); setAudioUrl("");
      void utils.teacher.fatwaInbox.invalidate();
    },
  });
  const data = query.data as { isMufti?: boolean; items?: FatwaItem[] } | undefined;
  const items = data?.items ?? [];
  const pending = items.filter((item) => item.status === "assigned");
  const answered = items.filter((item) => item.status !== "assigned");

  if (!query.isLoading && data && !data.isMufti) return <TeacherScreen title="الفتاوى"><EmptyState title="ليست لديك صلاحية الإفتاء" description="هذه الصفحة مخصصة للمعلمين المفتين." /></TeacherScreen>;
  return (
    <TeacherScreen title="صندوق الفتاوى" loading={query.isLoading} error={!!query.error} retry={() => void query.refetch()}>
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      <Text style={[styles.summary, { color: colors.muted }]}>{pending.length} سؤالًا بانتظار إجابتك</Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>بانتظار الإجابة</Text>
      {pending.length ? pending.map((fatwa) => (
          <Pressable key={fatwa.id} onPress={() => { setFeedback(""); setSelected(fatwa); }}>
          <Card>
            <View style={styles.metaRow}><Text style={[styles.category, { color: colors.primary }]}>{categoryLabels[fatwa.category] ?? fatwa.category}</Text>{fatwa.priority === "urgent" ? <Text style={[styles.urgent, { color: colors.danger }]}><Icon name="flame-outline" size={13} color={colors.danger} /> عاجل</Text> : null}</View>
            <Text style={[styles.question, { color: colors.text }]} numberOfLines={3}>{fatwa.questionText}</Text>
            <Text style={[styles.detail, { color: colors.muted }]}>{fatwa.studentName ?? "السائل"} · منذ {fatwa.hoursAgo ?? 0} ساعة</Text>
          </Card>
        </Pressable>
      )) : <EmptyState title="لا أسئلة معلقة" />}
      {answered.length ? <Text style={[styles.sectionTitle, { color: colors.text }]}>أجبت عنها</Text> : null}
      {answered.map((fatwa) => <Card key={fatwa.id}><Text style={[styles.category, { color: colors.primary }]}>{categoryLabels[fatwa.category] ?? fatwa.category} · {fatwa.answerStatus ?? fatwa.status}</Text><Text style={[styles.question, { color: colors.text }]} numberOfLines={2}>{fatwa.questionText}</Text></Card>)}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.questionBox, { backgroundColor: colors.input }]}><Text style={[styles.detail, { color: colors.muted }]}>{selected?.studentName ?? "السائل"} · {categoryLabels[selected?.category ?? ""] ?? selected?.category}</Text><Text style={[styles.question, { color: colors.text }]}>{selected?.questionText}</Text></View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>الإجابة (50–2000 حرف)</Text>
              <TextInput value={answerText} onChangeText={setAnswerText} maxLength={2000} multiline placeholder="اكتب الإجابة الشرعية التي ستراجعها الإدارة…" placeholderTextColor={colors.muted} style={[styles.answerInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
              <Text style={[styles.counter, { color: colors.muted }]}>{answerText.length}/2000</Text>
              <TextInput value={referenceText} onChangeText={setReferenceText} maxLength={500} placeholder="المرجع (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
              <TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="رابط التسجيل الصوتي (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="left" autoCapitalize="none" />
               {answer.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(answer.error, "تعذر إرسال الإجابة. حاول مرة أخرى.")}</Text> : null}
              <Button label="إرسال الإجابة للمراجعة" icon="send-outline" loading={answer.isPending} disabled={answerText.trim().length < 50 || answerText.trim().length > 2000 || answer.isPending || !selected} onPress={() => selected && answer.mutate({ questionId: selected.id, answerText: answerText.trim(), referenceText: referenceText.trim() || undefined, audioUrl: audioUrl.trim() || undefined })} />
              <Button label="إلغاء" variant="secondary" onPress={() => setSelected(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 10 },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginTop: 9, marginBottom: 7 },
  metaRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  category: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right" },
  urgent: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11 },
  question: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, lineHeight: 24, textAlign: "right", marginTop: 7 },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 6 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modal: { maxHeight: "90%", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 18 },
  questionBox: { borderRadius: 16, padding: 13, marginBottom: 12 },
  sectionLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", marginBottom: 7 },
  answerInput: { minHeight: 160, borderWidth: 1, borderRadius: 14, padding: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginTop: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "left", marginTop: 4 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 8 },
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 8 },
});