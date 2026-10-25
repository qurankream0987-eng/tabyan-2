import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";

export default function Recordings() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const query = trpc.student.myRecordings.useQuery(undefined, { enabled: !!token });
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  const rows = Array.isArray(query.data) ? query.data : [];
   return <Screen><SectionTitle title="تسجيلات الحلقات" /><Text style={[styles.intro, { color: colors.muted }]}>تظهر هنا التسجيلات الجاهزة فقط. لا يتم تشغيل ملف قيد الرفع أو ملف محذوف.</Text>{rows.length === 0 ? <EmptyState title="لا توجد تسجيلات جاهزة" description="ستظهر تسجيلات حلقاتك هنا بعد تجهيزها من الخادم." icon="play-circle-outline" /> : rows.map((row: any, index) => { const sessionId = row.sessionId ?? row.id; const content = <Card><View style={styles.row}><View style={styles.body}><Text style={[styles.title, { color: colors.text }]}>{String(row.title ?? row.topic ?? row.sessionType ?? "تسجيل الحلقة")}</Text><Text style={[styles.meta, { color: colors.muted }]}>{String(row.createdAt ?? row.date ?? "")}</Text></View><Badge label={row.status === "ready" || row.videoUrl ? "جاهز" : "غير جاهز"} tone={row.status === "ready" || row.videoUrl ? "success" : "muted"} /></View>{row.status === "ready" || row.videoUrl ? <Text style={[styles.ready, { color: colors.success }]}>اضغط لفتح تفاصيل الحلقة وتشغيل التسجيل بأمان</Text> : null}</Card>; return sessionId ? <Pressable key={String(row.id ?? index)} onPress={() => router.push(`/student/session/${sessionId}` as never)}>{content}</Pressable> : <View key={String(row.id ?? index)}>{content}</View>; })}</Screen>;
}

const styles = StyleSheet.create({
  intro: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  body: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 4 },
  ready: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right", marginTop: 10 },
});
