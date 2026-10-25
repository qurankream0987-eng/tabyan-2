import { useState } from "react";
import { useRouter } from "expo-router";
 import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

export default function Fatwa() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("fiqh");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const list = trpc.fatwa.myFatwas.useQuery(undefined, { enabled: !!token });
  const ask = trpc.fatwa.ask.useMutation({ onSuccess: () => { setQuestion(""); setCategory("fiqh"); setImageUrl(""); setAudioUrl(""); void list.refetch(); } });
  const categories = [
    ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["muamalat", "معاملات"], ["family", "أسرة"],
    ["tajweed", "تجويد"], ["salah", "صلاة"], ["zakah", "زكاة"], ["siyam", "صيام"],
    ["hajj", "حج"], ["taharah", "طهارة"], ["qiraat", "قراءات"], ["other", "أخرى"],
  ] as const;
  if (list.isLoading) return <Screen><LoadingState /></Screen>;
  if (list.error) return <Screen><ErrorState onRetry={() => void list.refetch()} /></Screen>;
  const rows = Array.isArray(list.data) ? list.data : [];
  return <Screen><SectionTitle title="الفتاوى" /><Card><Text style={[styles.cardTitle, { color: colors.text }]}>اسأل أهل العلم</Text><Text style={[styles.note, { color: colors.muted }]}>اكتب سؤالك بوضوح، وستصلك الإجابة عند اعتمادها.</Text><Text style={[styles.label, { color: colors.text }]}>التصنيف</Text><View style={styles.categories}>{categories.map(([value, label]) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.category, { backgroundColor: category === value ? colors.primary : colors.input, borderColor: category === value ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === value ? colors.primaryText : colors.text }]}>{label}</Text></Pressable>)}</View><TextInput value={question} onChangeText={setQuestion} placeholder="اكتب سؤالك هنا…" placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.textarea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="right" /><TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="رابط صورة اختياري" placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="left" /><TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="رابط تسجيل صوتي اختياري" placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="left" />{ask.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(ask.error, "تعذر إرسال السؤال. حاول مرة أخرى.")}</Text> : null}<Button label="إرسال السؤال" icon="send-outline" loading={ask.isPending} disabled={question.trim().length < 10} onPress={() => ask.mutate({ questionText: question.trim(), category: category as never, imageUrl: imageUrl.trim() || undefined, audioUrl: audioUrl.trim() || undefined })} /></Card><SectionTitle title="أسئلتي السابقة" action="الفتاوى العامة" onAction={() => router.push("/student/fatwas")} />{rows.length === 0 ? <EmptyState title="لا توجد أسئلة سابقة" description="يمكنك إرسال أول سؤال من النموذج أعلاه." icon="chatbox-ellipses-outline" /> : rows.map((row: any, index) => <Card key={String(row.id ?? index)}><Text style={[styles.question, { color: colors.text }]}>{String(row.questionText ?? "سؤال")}</Text><Text style={[styles.status, { color: colors.muted }]}>{String(row.categoryLabel ?? row.status ?? "قيد المراجعة")}</Text>{row.id ? <Text onPress={() => router.push(`/student/fatwa/${row.id}?source=mine` as never)} style={[styles.open, { color: colors.primary }]}>التفاصيل ←</Text> : null}</Card>)}</Screen>;
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 4, marginBottom: 12 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 7 },
  categories: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  category: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  categoryText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  textarea: { minHeight: 120, borderRadius: 16, borderWidth: 1, padding: 13, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlignVertical: "top", marginBottom: 10 },
  urlInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginBottom: 8 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 8 },
  question: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, lineHeight: 23, textAlign: "right" },
  status: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 5 },
  open: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 10 },
});
