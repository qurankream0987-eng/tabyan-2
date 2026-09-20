import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, FeatureTile, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";

export default function Schedule() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const query = trpc.student.mySessions.useQuery(undefined, { enabled: !!token });
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  const rows = Array.isArray(query.data) ? query.data : [];
  return (
    <Screen>
      <SectionTitle title="جدولي وحلقاتي" />
      <FeatureTile title="احجز حلقة جديدة" description="اختر المسار والمعلم والموعد المتاح" icon="add-circle-outline" accent onPress={() => router.push("/student/booking")} />
      {rows.length === 0 ? <EmptyState title="لا توجد حلقات بعد" description="عند حجز حلقة ستظهر هنا مع تفاصيل الموعد وغرفة الجلسة." action="تصفح المعلمين" onAction={() => router.push("/student/booking")} icon="calendar-outline" /> : rows.map((row: any, index) => <Card key={String(row.id ?? index)}><View style={styles.row}><View style={styles.rowBody}><Text style={[styles.title, { color: colors.text }]}>{String(row.title ?? row.sessionType ?? "حلقة تعليمية")}</Text><Text style={[styles.meta, { color: colors.muted }]}>{String(row.scheduledAt ?? row.startTime ?? row.date ?? "موعد غير محدد")}</Text>{row.teacherName ? <Text style={[styles.meta, { color: colors.muted }]}>المعلم: {String(row.teacherName)}</Text> : null}</View><Badge label={statusLabel(row.status)} tone={row.status === "completed" ? "success" : row.status === "cancelled" ? "danger" : "gold"} /></View><Button label={row.status === "in_progress" ? "دخول الحلقة" : "عرض تفاصيل الحلقة"} variant="secondary" icon={row.status === "in_progress" ? "videocam-outline" : "arrow-back-outline"} onPress={() => row.id && router.push(`/student/session/${row.id}`)} /></Card>)}
    </Screen>
  );
}

function statusLabel(status: unknown) {
  if (status === "completed") return "مكتملة";
  if (status === "cancelled") return "ملغاة";
  if (status === "active") return "جارية";
  return "قادمة";
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  rowBody: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
});
