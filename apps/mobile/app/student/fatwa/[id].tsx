import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LibraryMediaPlayer } from "../../../components/library/library-media-player";
import { Badge, Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "../../../components/student/student-screen";
import { Icon } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { fatwaStatusLabel, fatwaStatusTone, formatDate } from "../../../lib/format";
import { palette, useTheme } from "../../../lib/theme";
import { toast } from "../../../lib/toast";
import { trpc } from "../../../lib/trpc";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

// مطابق لتفاصيل الفتوى في FatwaAsk.tsx على الموقع: الحالة والتصنيف، صندوق السؤال، صندوق الإجابة الذهبي، ثم تقييم بخمس نجوم.
export default function FatwaDetail() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: "mine" | "public" }>();
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const utils = trpc.useUtils();
  const isPublic = source === "public";
  const own = trpc.fatwa.detail.useQuery({ questionId: String(id) }, { enabled: !!token && !!id && !isPublic });
  const publicQuery = trpc.fatwa.publicDetail.useQuery({ answerId: String(id) }, { enabled: !!token && !!id && isPublic });
  const [rating, setRating] = useState(0);
  const rate = trpc.fatwa.rate.useMutation({
    onSuccess: () => { toast("شكراً لتقييمك", "success"); void utils.fatwa.detail.invalidate(); },
    onError: (error) => { setRating(0); toast(userFacingErrorMessage(error, "تعذر حفظ التقييم."), "error"); },
  });
  const q = isPublic ? publicQuery : own;
  const title = isPublic ? "تفاصيل الفتوى" : "تفاصيل فتواي";
  if (q.isLoading) return <StudentScreen title={title}><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title={title}><ErrorState message="تعذر تحميل الفتوى. حاول مرة أخرى." onRetry={() => void q.refetch()} /></StudentScreen>;
  if (!q.data) return <StudentScreen title={title}><EmptyState title="الفتوى غير متاحة" /></StudentScreen>;

  const questionBg = isDark ? "rgba(255,255,255,0.05)" : `${palette.burgundy}0D`;
  const answerBg = `${palette.gold}1A`;
  const goldText = isDark ? palette.gold : palette.goldDark;
  const answerBlock = (answer: { answerText?: string | null; referenceText?: string | null; audioUrl?: string | null }) => (
    <>
      <View style={[styles.box, { backgroundColor: answerBg }]}>
        <View style={styles.boxHead}><Text style={[styles.boxLabel, { color: goldText }]}>إجابة المفتي</Text><Icon name="checkmark" size={13} color={goldText} /></View>
        <Text style={[styles.body, { color: colors.text }]}>{String(answer.answerText ?? "")}</Text>
        {answer.referenceText ? <View style={styles.refRow}><Icon name="book-outline" size={12} color={colors.muted} /><Text style={[styles.ref, { color: colors.muted }]}>المرجع: {String(answer.referenceText)}</Text></View> : null}
      </View>
      {answer.audioUrl ? <LibraryMediaPlayer source={String(answer.audioUrl)} contentType="audio" /> : null}
    </>
  );

  if (isPublic) {
    const d = publicQuery.data as any;
    return (
      <StudentScreen title={title}>
        <Card>
          <View style={styles.head}>
            <Badge label="منشورة" tone="gold" />
            <Text style={[styles.category, { color: colors.muted }]}>{String(d.categoryLabel ?? "")}</Text>
          </View>
          <View style={[styles.box, { backgroundColor: questionBg }]}>
            <Text style={[styles.boxLabel, { color: colors.muted }]}>السؤال:</Text>
            <Text style={[styles.body, { color: colors.text }]}>{String(d.questionText ?? "")}</Text>
          </View>
          {answerBlock(d)}
        </Card>
      </StudentScreen>
    );
  }

  const d = own.data as any;
  const answer = d.answer;
  const myStars = Number(d.myRating?.starRating ?? 0) || rating;
  return (
    <StudentScreen title={title}>
      <Card>
        <View style={styles.head}>
          <Badge label={fatwaStatusLabel(d.question.status)} tone={fatwaStatusTone(d.question.status)} />
          <Text style={[styles.category, { color: colors.muted }]}>{String(d.question.categoryLabel ?? "")}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{formatDate(d.question.createdAt)}</Text>
        </View>
        <View style={[styles.box, { backgroundColor: questionBg }]}>
          <Text style={[styles.boxLabel, { color: colors.muted }]}>سؤالك:</Text>
          <Text style={[styles.body, { color: colors.text }]}>{String(d.question.questionText ?? "")}</Text>
        </View>
        {answer ? (
          <>
            {answerBlock(answer)}
            <View style={[styles.rating, { borderTopColor: colors.border }]}>
              <Text style={[styles.ratingTitle, { color: colors.text }]}>قيّم الإجابة:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} من 5`} accessibilityState={{ selected: myStars >= star, disabled: rate.isPending }} disabled={rate.isPending} hitSlop={4} onPress={() => { setRating(star); rate.mutate({ answerId: String(answer.id), starRating: star }); }}>
                    <Icon name={myStars >= star ? "star" : "star-outline"} size={30} color={myStars >= star ? palette.gold : `${colors.muted}66`} />
                  </Pressable>
                ))}
              </View>
              {d.myRating ? <Text style={[styles.ratingNote, { color: colors.muted }]}>تقييمك محفوظ — التقييمات تظهر للإدارة فقط</Text> : null}
            </View>
          </>
        ) : (
          <View style={styles.pending}><Icon name="time-outline" size={15} color={colors.muted} /><Text style={[styles.pendingText, { color: colors.muted }]}>لم تُنشر الإجابة بعد — سيصلك إشعار فور الإجابة</Text></View>
        )}
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  category: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17 },
  date: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "left" },
  box: { borderRadius: 14, padding: 14, marginBottom: 12 },
  boxHead: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 4 },
  boxLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18, textAlign: "right", marginBottom: 4 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, lineHeight: 25, textAlign: "right" },
  refRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 8 },
  ref: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right" },
  rating: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  ratingTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right", marginBottom: 8 },
  stars: { flexDirection: "row-reverse", justifyContent: "center", gap: 6 },
  ratingNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 6 },
  pending: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16 },
  pendingText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 20, textAlign: "center" },
});
