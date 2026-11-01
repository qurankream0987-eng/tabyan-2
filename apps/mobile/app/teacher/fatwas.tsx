import { useState } from "react";
import { fatwaStatusLabel, fatwaStatusTone } from "../../lib/format";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, EmptyState, Icon, PageHero, SectionTitle } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "../../components/teacher/teacher-screen";
import { useTheme } from "../../lib/theme";
import { toast } from "../../lib/toast";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

type FatwaItem = {
  id: string; questionText: string; category: string; status: string; priority: string;
  studentName?: string; answerStatus?: string | null; hoursAgo?: number;
};

const categoryLabels: Record<string, string> = {
  aqeedah: "عقيدة",
  fiqh: "فقه",
  muamalat: "معاملات",
  family: "أسرة",
  tajweed: "تجويد",
  salah: "صلاة",
  zakah: "زكاة",
  siyam: "صيام",
  hajj: "حج",
  taharah: "طهارة",
  qiraat: "قراءات",
  other: "أخرى",
};

/** Web: the question is reassigned at 48 hours; the warning shows from 36. */
const WARN_HOURS = 36;

export default function Fatwas() {
  const { colors } = useTheme();
  const query = trpc.teacher.fatwaInbox.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<FatwaItem | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const answer = trpc.teacher.answerFatwa.useMutation({
    onSuccess: () => {
      toast("تم إرسال الإجابة للمراجعة", "success");
      setSelected(null); setAnswerText(""); setReferenceText(""); setAudioUrl("");
      void utils.teacher.fatwaInbox.invalidate();
    },
    onError: (cause) => toast(userFacingErrorMessage(cause, "تعذر حفظ الإجابة، حاول مرة أخرى"), "error"),
  });
  const data = query.data as { isMufti?: boolean; items?: FatwaItem[] } | undefined;
  const items = data?.items ?? [];
  const pending = items.filter((item) => item.status === "assigned");
  const answered = items.filter((item) => item.status !== "assigned");

  if (!query.isLoading && data && !data.isMufti) return <TeacherScreen title="الفتاوى"><EmptyState title="ليست لديك صلاحية الإفتاء" description="يُعيّن المفتين من معلمي المنصة" /></TeacherScreen>;
  return (
    <TeacherScreen title="صندوق الفتاوى" loading={query.isLoading} error={!!query.error} retry={() => void query.refetch()}>
      <PageHero icon="mosque" title="صندوق الفتاوى" subtitle={`${pending.length} سؤالاً بانتظار إجابتك — الحد الأقصى 20`} />
      <SectionTitle title="بانتظار الإجابة" />
      {pending.length ? pending.map((fatwa) => {
        const hours = fatwa.hoursAgo ?? 0;
        const late = hours >= WARN_HOURS;
        return (
          <Pressable key={fatwa.id} accessibilityRole="button" onPress={() => setSelected(fatwa)}>
            <Card>
              <View style={styles.metaRow}>
                <Badge label={categoryLabels[fatwa.category] ?? fatwa.category} tone="gold" />
                {fatwa.priority === "urgent" ? <Badge label="عاجل" tone="danger" /> : null}
                <Text style={[styles.age, late ? styles.ageLate : null, { color: late ? colors.danger : colors.muted }]}>
                  <Icon name="timer" size={12} color={late ? colors.danger : colors.muted} /> منذ {hours} ساعة{late ? " — يُعاد إسناده عند 48" : ""}
                </Text>
              </View>
              <Text style={[styles.question, { color: colors.text }]} numberOfLines={2}>{fatwa.questionText}</Text>
              <Text style={[styles.detail, { color: colors.muted }]}>السائل: {fatwa.studentName ?? "—"}</Text>
            </Card>
          </Pressable>
        );
      }) : <EmptyState title="لا أسئلة معلقة" />}
      {answered.length ? <SectionTitle title="أجبت عنها" /> : null}
      {answered.map((fatwa) => (
        <Card key={fatwa.id} style={styles.answered}>
          <View style={styles.metaRow}>
            <Badge label={fatwaStatusLabel(fatwa.answerStatus ?? fatwa.status)} tone={fatwaStatusTone(fatwa.answerStatus ?? fatwa.status)} />
            <Badge label={categoryLabels[fatwa.category] ?? fatwa.category} tone="gold" />
          </View>
          <Text style={[styles.question, { color: colors.text }]} numberOfLines={1}>{fatwa.questionText}</Text>
        </Card>
      ))}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <View style={[styles.questionBox, { backgroundColor: colors.input }]}><Text style={[styles.detail, { color: colors.muted }]}>سؤال {selected?.studentName ?? "السائل"} — {categoryLabels[selected?.category ?? ""] ?? selected?.category}</Text><Text style={[styles.question, { color: colors.text }]}>{selected?.questionText}</Text></View>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>الإجابة <Text style={[styles.sectionLabelHint, { color: colors.muted }]}>(50–2000 حرف)</Text></Text>
              <TextInput value={answerText} onChangeText={setAnswerText} maxLength={2000} multiline placeholder="الحمد لله… (ابدأ بالحمدلة واختم بـ«والله أعلم»)" placeholderTextColor={colors.muted} style={[styles.answerInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
              <Text style={[styles.counter, { color: colors.muted }]}>{answerText.length}/2000</Text>
              <TextInput value={referenceText} onChangeText={setReferenceText} maxLength={500} placeholder="المرجع (اختياري): الآية/الحديث/الفتاوى…" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
              <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: colors.text }]}>التسجيل الصوتي <Text style={[styles.sectionLabelHint, { color: colors.muted }]}>(اختياري — حتى 10 دقائق)</Text></Text>
              <TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="https://… رابط الصوت (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, styles.inputTight, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="left" autoCapitalize="none" />
              <Button label={answer.isPending ? "جارٍ الإرسال…" : "إرسال الإجابة للمراجعة"} icon="send" loading={answer.isPending} disabled={answerText.trim().length < 50 || answerText.trim().length > 2000 || answer.isPending || !selected} onPress={() => selected && answer.mutate({ questionId: selected.id, answerText: answerText.trim(), referenceText: referenceText.trim() || undefined, audioUrl: audioUrl.trim() || undefined })} />
              <Text style={[styles.reviewNote, { color: colors.muted }]}>تراجع الإدارة إجابتك قبل نشرها للطالب</Text>
              <Button label="إلغاء" variant="secondary" onPress={() => setSelected(null)} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 6 },
  age: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 16, marginRight: "auto" },
  ageLate: { fontFamily: "IBMPlexSansArabic_700Bold" },
  question: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, lineHeight: 24, textAlign: "right", marginTop: 7 },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 6 },
  answered: { opacity: 0.8 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modal: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18 },
  modalContent: { gap: 10, paddingBottom: 24 },
  questionBox: { borderRadius: 16, padding: 13, marginBottom: 4 },
  sectionLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  sectionLabelSpaced: { marginTop: 4 },
  sectionLabelHint: { fontFamily: "IBMPlexSansArabic_400Regular" },
  answerInput: { minHeight: 160, borderWidth: 1, borderRadius: 14, padding: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlignVertical: "top" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  inputTight: { fontSize: 12 },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "left", marginTop: -6 },
  reviewNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "center" },
});
