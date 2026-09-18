import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "./_screen";
import { Badge, ProgressBar } from "../../components/ui";
import { useTheme } from "../../lib/theme";

type ProgressRow = {
  levelId: number;
  name: string;
  status: string;
  completedSessions: number;
  completedJuz: number;
  averageScore: number | string | null;
};

const STATUS_META: Record<string, { label: string; tone: "success" | "gold" | "muted" }> = {
  completed: { label: "مكتمل", tone: "success" },
  in_progress: { label: "جارٍ", tone: "gold" },
  locked: { label: "مقفل", tone: "muted" },
};

function safeScore(value: ProgressRow["averageScore"]): number {
  const score = Number(value ?? 0);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
}

export default function Progress() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const query = trpc.student.progress.useQuery(undefined, { enabled: !!token });

  if (query.isLoading) {
    return <StudentScreen title="تقدمي" subtitle="متابعة مستوياتك وإنجازك"><LoadingState /></StudentScreen>;
  }
  if (query.error) {
    return <StudentScreen title="تقدمي" subtitle="متابعة مستوياتك وإنجازك"><ErrorState onRetry={() => void query.refetch()} /></StudentScreen>;
  }

  const rows = Array.isArray(query.data) ? query.data as ProgressRow[] : [];
  return (
    <StudentScreen title="تقدمي" subtitle="متابعة مستوياتك وإنجازك في كل مسار">
      {!rows.length ? (
        <EmptyState title="لا تقدم بعد" description="ابدأ أول حلقة ليظهر تقدمك هنا" />
      ) : (
        <View>
          {rows.map((row) => {
            const score = safeScore(row.averageScore);
            const status = STATUS_META[row.status] ?? STATUS_META.locked;
            return (
              <Card key={row.levelId} style={styles.card}>
                <View style={styles.header}>
                  <View style={styles.titleBlock}>
                    <Text style={[styles.levelName, { color: colors.primary }]}>{row.name}</Text>
                    <Text style={[styles.meta, { color: colors.muted }]}>
                      {row.completedSessions ?? 0} حلقة · {row.completedJuz ?? 0} أجزاء
                    </Text>
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                <ProgressBar value={score} label="متوسط التقييم" />
              </Card>
            );
          })}
        </View>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  titleBlock: { flex: 1, alignItems: "flex-end" },
  levelName: { fontFamily: "Amiri_700Bold", fontSize: 20, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 3 },
});