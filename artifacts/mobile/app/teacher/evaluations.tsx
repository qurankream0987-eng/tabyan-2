import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "./_components";
import { useTheme } from "../../lib/theme";

export default function Evaluations() {
  const { colors } = useTheme();
  const q = trpc.teacher.pendingEvaluations.useQuery();
  const router = useRouter();
  const rows = (q.data ?? []) as any[];
  return (
    <TeacherScreen title="التقييمات المعلقة" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      <Text style={[styles.subtitle, { color: colors.muted }]}>حصص مكتملة بانتظار تقييمك</Text>
      {rows.length ? rows.map((s) => (
        <Card key={s.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: `${colors.primary}14` }]}>
              <Icon name="create-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.text }]}>{s.typeLabel ?? s.sessionType}{s.topic ? ` — ${s.topic}` : ""}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{s.studentName} · {formatDateTime(s.scheduledAt)}</Text>
            </View>
          </View>
          <Button label="قيّم الآن" onPress={() => router.push(`/teacher/evaluate/${s.id}`)} />
        </Card>
      )) : <EmptyState title="لا تقييمات معلقة" description="أحسنت! كل الحصص المكتملة مُقيَّمة" />}
    </TeacherScreen>
  );
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return `${date.toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "long" })} — ${date.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}`;
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "center", marginBottom: 12 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
});