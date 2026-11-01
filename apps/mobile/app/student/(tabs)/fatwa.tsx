import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHero, Screen, SoftPressable } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { fatwaStatusLabel, fatwaStatusTone, formatDate } from "../../../lib/format";
import { palette, useTheme } from "../../../lib/theme";
import { toast } from "../../../lib/toast";
import { trpc } from "../../../lib/trpc";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

// مطابق لـ FatwaAsk.tsx على الموقع: تبويبان (اسأل / فتاواي)، نموذج السؤال بعدّاد الأحرف، وقائمة أسئلتي.
const CATEGORIES = [
  ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["muamalat", "معاملات"], ["family", "أسرة"],
  ["tajweed", "تجويد"], ["salah", "صلاة"], ["zakah", "زكاة"], ["siyam", "صيام"],
  ["hajj", "حج"], ["taharah", "طهارة"], ["qiraat", "قراءات"], ["other", "أخرى"],
] as const;
const MAX = 500;
const hoursSince = (value: unknown) => Math.max(0, Math.floor((Date.now() - new Date(String(value)).getTime()) / 3_600_000));

type Row = { id: string; questionText: string; status: string; createdAt: string | Date; categoryLabel: string };

export default function Fatwa() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<"ask" | "mine">("ask");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][0]>("fiqh");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const list = trpc.fatwa.myFatwas.useQuery(undefined, { enabled: !!token });
  const ask = trpc.fatwa.ask.useMutation({
    onSuccess: () => { toast("أُرسل سؤالك — سيجيبك المفتي بإذن الله", "success"); setText(""); setImageUrl(""); setAudioUrl(""); setTab("mine"); void list.refetch(); },
    onError: (error) => toast(userFacingErrorMessage(error, "تعذر إرسال السؤال. حاول مرة أخرى."), "error"),
  });
  if (list.isLoading) return <Screen><LoadingState /></Screen>;
  if (list.error) return <Screen><ErrorState onRetry={() => void list.refetch()} /></Screen>;
  const rows = (Array.isArray(list.data) ? list.data : []) as unknown as Row[];
  const tint = isDark ? `${palette.gold}14` : `${palette.burgundy}14`;
  const valid = text.trim().length >= 10;
  return (
    <Screen>
      <PageHero icon="scale-outline" title="مفتون معتمدون" subtitle="بإشراف المسؤول — تصلك الإجابة بعد اعتمادها" />
      <View style={styles.tabs}>
        {([["ask", "اسأل"], ["mine", `فتاواي${rows.length ? ` (${rows.length})` : ""}`]] as const).map(([key, label]) => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={[styles.tab, { backgroundColor: tab === key ? colors.primary : tint }]}>
            <Text style={[styles.tabText, { color: tab === key ? colors.primaryText : colors.primary }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "ask" ? (
        <Card>
          <Text style={[styles.label, { color: colors.text }]}>التصنيف</Text>
          <View style={styles.categories}>
            {CATEGORIES.map(([value, label]) => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={[styles.category, { backgroundColor: category === value ? colors.primary : tint }]}>
                <Text style={[styles.categoryText, { color: category === value ? colors.primaryText : colors.primary }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.text }]}>سؤالك <Text style={[styles.labelHint, { color: colors.muted }]}>(10–{MAX} حرف)</Text></Text>
          <TextInput value={text} onChangeText={setText} placeholder="اكتب سؤالك بوضوح…" placeholderTextColor={colors.muted} multiline maxLength={MAX} style={[styles.textarea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="right" />
          <Text style={[styles.counter, { color: valid || !text ? colors.muted : colors.danger }]}>{text.length}/{MAX}</Text>
          <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="رابط صورة (اختياري — حتى 5MB)" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[styles.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="left" />
          <TextInput value={audioUrl} onChangeText={setAudioUrl} placeholder="رابط تسجيل صوتي للسؤال (اختياري)" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[styles.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} textAlign="left" />
          <Button label="إرسال السؤال" icon="arrow-back" loading={ask.isPending} disabled={!valid || ask.isPending} onPress={() => ask.mutate({ questionText: text.trim(), category: category as never, imageUrl: imageUrl.trim() || undefined, audioUrl: audioUrl.trim() || undefined })} />
        </Card>
      ) : rows.length === 0 ? <EmptyState title="لا أسئلة بعد" description="أرسل أول سؤال من تبويب «اسأل»" action="اسأل الآن" onAction={() => setTab("ask")} /> : rows.map((row) => (
        <SoftPressable key={row.id} accessibilityRole="button" onPress={() => router.push(`/student/fatwa/${row.id}?source=mine` as never)}>
          <Card>
            <View style={styles.rowHead}>
              <Badge label={fatwaStatusLabel(row.status)} tone={fatwaStatusTone(row.status)} />
              <View style={[styles.categoryChip, { backgroundColor: `${palette.gold}26` }]}><Text style={[styles.categoryChipText, { color: isDark ? palette.gold : palette.goldDark }]}>{row.categoryLabel}</Text></View>
            </View>
            <Text numberOfLines={2} style={[styles.question, { color: colors.text }]}>{row.questionText}</Text>
            <Text style={[styles.date, { color: colors.muted }]}>{formatDate(row.createdAt)} · منذ {hoursSince(row.createdAt)} ساعة</Text>
          </Card>
        </SoftPressable>
      ))}

      <Button label="الفتاوى العامة" variant="quiet" icon="library-outline" style={styles.publicLink} onPress={() => router.push("/student/fatwas")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", gap: 8, marginBottom: 14 },
  tab: { flex: 1, minHeight: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tabText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 20, textAlign: "right", marginBottom: 8 },
  labelHint: { fontFamily: "IBMPlexSansArabic_400Regular" },
  categories: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  category: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  categoryText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11 },
  textarea: { minHeight: 112, borderRadius: 16, borderWidth: 1, padding: 13, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 21, textAlignVertical: "top" },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "left", marginTop: 4, marginBottom: 8, writingDirection: "ltr" },
  urlInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginBottom: 8 },
  rowHead: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 6 },
  categoryChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  categoryChipText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 10, lineHeight: 15 },
  question: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 22, textAlign: "right" },
  date: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 4 },
  publicLink: { marginTop: 8 },
});
