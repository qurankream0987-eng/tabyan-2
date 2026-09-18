import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AdminFrame } from "./_common";
import { Badge, Card, EmptyState, ErrorState, Icon, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";

export default function SessionsMonitoring() {
  const q = trpc.admin.sessionsMonitoring.useQuery(undefined, { retry: 1, refetchInterval: 15000 });
  const { colors } = useTheme();
  const router = useRouter();
  if (q.isLoading) return <AdminFrame title="مراقبة الجلسات"><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title="مراقبة الجلسات"><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const rows = (q.data ?? []) as Array<Record<string, unknown>>;
  const live = rows.filter((s) => s.status === "in_progress");
  const upcoming = rows.filter((s) => s.status !== "in_progress").sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  const render = (s: Record<string, unknown>, isLive: boolean) => (
    <Card key={String(s.id)} style={styles.card}>
      <View style={styles.row}><View style={styles.main}>
        <Text style={[styles.title, { color: colors.text }]}>{String(s.typeLabel ?? "حلقة")}{s.topic ? ` — ${String(s.topic)}` : ""}</Text>
        <View style={styles.meta}><Badge label={isLive ? "جارية الآن" : "قادمة"} tone={isLive ? "success" : "gold"} /><Text style={[styles.small, { color: colors.muted }]}>{s.type === "group" ? "جماعية" : "فردية"}</Text></View>
        <Text style={[styles.small, { color: colors.muted }]}>الطالب: {String(s.studentName ?? "غير محدد")} · المعلم: {String(s.teacherName ?? "غير محدد")}</Text>
        <Text style={[styles.small, { color: colors.muted }]}>{s.levelName ? `المستوى: ${String(s.levelName)} · ` : ""}{String(s.scheduledAt ?? "موعد غير محدد")} · {String(s.durationMinutes ?? "—")} دقيقة</Text>
      </View>{isLive ? <Pressable accessibilityLabel="دخول الحلقة" onPress={() => router.push(`/admin/session/${String(s.id)}` as never)} style={[styles.join, { backgroundColor: colors.primary }]}><Icon name="videocam-outline" size={18} color="#fff" /></Pressable> : null}</View>
    </Card>
  );
  return <AdminFrame title="مراقبة الجلسات"><Card accent><Text style={[styles.heading, { color: colors.text }]}>متابعة الحلقات</Text><Text style={[styles.small, { color: colors.muted }]}>الحلقات الجارية والقادمة من الخادم.</Text></Card>
    <Text style={[styles.section, { color: colors.text }]}>جارية الآن ({live.length})</Text>{live.length ? live.map((s) => render(s, true)) : <EmptyState title="لا توجد حلقات جارية" icon="videocam-outline" />}
    <Text style={[styles.section, { color: colors.text }]}>قادمة ({upcoming.length})</Text>{upcoming.length ? upcoming.map((s) => render(s, false)) : <EmptyState title="لا توجد حلقات قادمة" icon="calendar-outline" />}
  </AdminFrame>;
}
const styles = StyleSheet.create({ card: { padding: 14 }, row: { flexDirection: "row-reverse", gap: 10, alignItems: "center" }, main: { flex: 1, gap: 5 }, heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, textAlign: "right" }, title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" }, small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 20 }, meta: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, join: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, section: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 17, textAlign: "right", marginTop: 12, marginBottom: 8 } });