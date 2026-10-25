import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from "../../../../components/ui";
import { StudentScreen } from "../../_screen";
import { useAuth } from "../../../../lib/auth";
import { trpc } from "../../../../lib/trpc";
import { useTheme } from "../../../../lib/theme";
import { userFacingErrorMessage } from "../../../../lib/user-facing-error";

type Question = { id: string; questionText: string; questionType: string; options: string[]; points: number };
type Result = { score: number; passed: boolean; passingScore: number; attemptsUsed: number; attemptsRemaining: number; results: Array<{ questionId: string; correct: boolean; earned: number; points: number; correctAnswer: string | null; explanation: string | null }> };

export default function Exam() {
  const { subject, levelId } = useLocalSearchParams<{ subject?: string; levelId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const id = Number(levelId);
  const query = trpc.sharia.exam.useQuery({ levelId: id }, { enabled: !!token && Number.isInteger(id) && id > 0, retry: false });
  const submit = trpc.sharia.submitExam.useMutation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const data = query.data as { level: { name: string }; questions: Question[]; passPercentage: number; attemptsUsed: number; attemptsRemaining: number } | null | undefined;
  const questions = data?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((question) => (answers[question.id] ?? "").trim().length > 0);

  const submitExam = () => {
    if (!allAnswered || submit.isPending) return;
    submit.mutate({ levelId: id, answers: questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })) }, {
      onSuccess: (response) => setResult(response as Result),
    });
  };

  if (!Number.isInteger(id) || id <= 0) return <StudentScreen title="اختبار المستوى"><EmptyState title="المستوى غير صالح" /></StudentScreen>;
  if (query.isLoading) return <StudentScreen title="اختبار المستوى"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="اختبار المستوى"><ErrorState message={userFacingErrorMessage(query.error, "تعذر تحميل الاختبار.")} onRetry={() => void query.refetch()} /></StudentScreen>;
  if (!data) return <StudentScreen title="اختبار المستوى"><EmptyState title="المستوى غير موجود" /></StudentScreen>;
  if (!questions.length) return <StudentScreen title={`اختبار ${data.level.name}`}><EmptyState title="لا أسئلة لهذا المستوى بعد" description="تُضاف أسئلة الاختبار من قبل الإدارة." /></StudentScreen>;

  if (result) {
    return (
      <StudentScreen title={`نتيجة اختبار ${data.level.name}`}>
        <Card style={styles.resultCard}>
          <Text style={[styles.resultTitle, { color: result.passed ? colors.success : colors.danger }]}>{result.passed ? "نجحت في الاختبار!" : "لم تجتز الاختبار"}</Text>
          <Text style={[styles.score, { color: colors.text }]}>{result.score}%</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>حد النجاح {result.passingScore}% · المحاولة {result.attemptsUsed} · المتبقي {result.attemptsRemaining}</Text>
        </Card>
        {result.results.map((item, index) => (
          <Card key={item.questionId}>
            <View style={styles.resultRow}><Badge label={item.correct ? "صحيح" : "غير صحيح"} tone={item.correct ? "success" : "danger"} /><Text style={[styles.questionNumber, { color: colors.text }]}>السؤال {index + 1}</Text></View>
            <Text style={[styles.meta, { color: colors.muted }]}>{item.earned}/{item.points} نقطة</Text>
            {item.correctAnswer !== null ? <Text style={[styles.explanation, { color: colors.text }]}>الإجابة الصحيحة: {item.correctAnswer}</Text> : null}
            {item.explanation ? <Text style={[styles.explanation, { color: colors.muted }]}>{item.explanation}</Text> : null}
          </Card>
        ))}
        <View style={styles.actions}>
          {result.passed ? <Button label="عرض الشهادة" icon="ribbon-outline" onPress={() => router.push(`/student/sharia/${subject}/certificate?levelId=${id}` as never)} /> : result.attemptsRemaining > 0 ? <Button label="إعادة الاختبار" icon="refresh-outline" onPress={() => { setResult(null); setAnswers({}); }} /> : null}
          <Button label="العودة للمستوى" variant="secondary" onPress={() => router.replace(`/student/sharia/${subject}/${id}` as never)} />
        </View>
      </StudentScreen>
    );
  }

  return (
    <StudentScreen title={`اختبار ${data.level.name}`}>
      <Card>
        <Text style={[styles.meta, { color: colors.text }]}>الاجتياز من {data.passPercentage}% · المحاولات المتبقية {data.attemptsRemaining}</Text>
      </Card>
      {questions.map((question, index) => (
        <Card key={question.id}>
          <Text style={[styles.question, { color: colors.text }]}>{index + 1}. {question.questionText}</Text>
          {question.questionType === "fill_blank" ? (
            <TextInput value={answers[question.id] ?? ""} onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} placeholder="اكتب إجابتك" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
          ) : (
            <View style={styles.options}>
              {(question.options ?? (question.questionType === "true_false" ? ["صح", "خطأ"] : [])).map((option) => {
                const selected = answers[question.id] === option;
                return <Pressable key={option} onPress={() => setAnswers((current) => ({ ...current, [question.id]: option }))} style={[styles.option, { backgroundColor: selected ? colors.primary : colors.input, borderColor: selected ? colors.primary : colors.border }]}><Text style={{ color: selected ? colors.primaryText : colors.text, textAlign: "right" }}>{option}</Text></Pressable>;
              })}
            </View>
          )}
        </Card>
      ))}
      {submit.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(submit.error, "تعذر إرسال الاختبار.")}</Text> : null}
      <Button label="إرسال الإجابات" icon="send-outline" onPress={submitExam} loading={submit.isPending} disabled={!allAnswered || data.attemptsRemaining <= 0} />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  resultCard: { alignItems: "center" },
  resultTitle: { fontFamily: "Amiri_700Bold", fontSize: 22, textAlign: "center" },
  score: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 38, marginTop: 8 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
  resultRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  questionNumber: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  explanation: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 8 },
  actions: { gap: 8, marginTop: 8 },
  question: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 24, textAlign: "right" },
  options: { gap: 8, marginTop: 12 },
  option: { borderWidth: 1, borderRadius: 13, padding: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginTop: 12, fontFamily: "IBMPlexSansArabic_400Regular" },
  error: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "right", marginVertical: 8 },
});