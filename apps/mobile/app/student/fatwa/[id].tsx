import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { StudentScreen, LoadingState, ErrorState, EmptyState, Card } from "../../../components/student/student-screen";
import { Button } from "../../../components/ui";
import { LibraryMediaPlayer } from "../../../components/library/library-media-player";
import { useTheme } from "../../../lib/theme";

export default function FatwaDetail() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: "mine" | "public" }>();
  const { token } = useAuth();
  const { colors } = useTheme();
  const isPublic = source === "public";
  const own = trpc.fatwa.detail.useQuery({ questionId: String(id) }, { enabled: !!token && !!id && !isPublic });
  const publicQuery = trpc.fatwa.publicDetail.useQuery({ answerId: String(id) }, { enabled: !!token && !!id && isPublic });
  const rate = trpc.fatwa.rate.useMutation();
  const [rating, setRating] = useState(0);
  const q = isPublic ? publicQuery : own;

  if (q.isLoading) return <StudentScreen title="تفاصيل الفتوى"><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title="تفاصيل الفتوى"><ErrorState message="تعذر تحميل الفتوى. حاول مرة أخرى." onRetry={() => void q.refetch()} /></StudentScreen>;
  if (!q.data) return <StudentScreen title="تفاصيل الفتوى"><EmptyState title="الفتوى غير متاحة" /></StudentScreen>;

  if (isPublic) {
    const d = publicQuery.data as any;
    return <StudentScreen title="تفاصيل الفتوى"><Card><Text style={{ color: colors.muted, textAlign: "right" }}>{String(d.categoryLabel ?? "")}</Text><Text style={{ color: colors.text, textAlign: "right", marginTop: 10 }}>{String(d.questionText ?? "السؤال")}</Text><Text style={{ color: colors.text, textAlign: "right", marginTop: 14 }}>{String(d.answerText ?? "")}</Text>{d.referenceText ? <Text style={{ color: colors.muted, textAlign: "right", marginTop: 14 }}>{String(d.referenceText)}</Text> : null}</Card>{d.audioUrl ? <LibraryMediaPlayer source={String(d.audioUrl)} contentType="audio" /> : null}</StudentScreen>;
  }

  const d = own.data as any;
  const answer = d.answer;
  return <StudentScreen title="تفاصيل فتواي"><Card><Text style={{ color: colors.muted, textAlign: "right" }}>{String(d.question.categoryLabel ?? "")}</Text><Text style={{ color: colors.text, textAlign: "right", marginTop: 10 }}>{String(d.question.questionText ?? "السؤال")}</Text>{answer ? <><Text style={{ color: colors.primary, textAlign: "right", marginTop: 14, fontFamily: "IBMPlexSansArabic_700Bold" }}>إجابة المفتي</Text><Text style={{ color: colors.text, textAlign: "right", marginTop: 6, lineHeight: 24 }}>{String(answer.answerText ?? "")}</Text>{answer.referenceText ? <Text style={{ color: colors.muted, textAlign: "right", marginTop: 14 }}>{String(answer.referenceText)}</Text> : null}{answer.audioUrl ? <LibraryMediaPlayer source={String(answer.audioUrl)} contentType="audio" /> : null}<Text style={{ color: colors.text, textAlign: "right", marginTop: 16 }}>قيّم الإجابة</Text><View style={{ flexDirection: "row-reverse", justifyContent: "flex-start", gap: 5, marginTop: 8 }}>{[1, 2, 3, 4, 5].map((star) => <Button key={star} label={star <= (d.myRating?.starRating ?? rating) ? "★" : "☆"} variant="secondary" disabled={rate.isPending} onPress={() => { setRating(star); rate.mutate({ answerId: answer.id, starRating: star }); }} />)}</View></> : <Text style={{ color: colors.muted, textAlign: "right", marginTop: 18 }}>لم تصدر الإجابة بعد — سيصلك إشعار فور الإجابة.</Text>}</Card></StudentScreen>;
}