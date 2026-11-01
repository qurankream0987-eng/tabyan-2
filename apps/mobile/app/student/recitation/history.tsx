import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "../../../components/student/student-screen";
import { Button, Icon, SvgIcon } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { formatDate, formatDuration, sessionStatusLabel, sessionStatusTone } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";
import { useTheme, palette } from "../../../lib/theme";

const HIDE_MODE_LABELS: Record<string, string> = {
  full_hide: "إخفاء كامل",
  first_word: "الكلمة الأولى فقط",
  progressive_reveal: "كشف تدريجي",
  visible_review: "مراجعة بالنص",
};

function ayahRange(start: number | null, end: number | null) {
  if (!start || !end) return null;
  return start === end ? `آية ${start}` : `الآيات ${start}–${end}`;
}

export default function RecitationHistory() {
  const { token } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const history = trpc.recitation.myHistory.useQuery({ limit: 50 }, { enabled: !!token });
  const title = "سجل التسميع";
  const subtitle = "تاريخ جلساتك";

  if (history.isLoading) return <StudentScreen title={title} subtitle={subtitle}><LoadingState /></StudentScreen>;
  if (history.error) return <StudentScreen title={title} subtitle={subtitle}><ErrorState onRetry={() => void history.refetch()} /></StudentScreen>;

  const rows = history.data ?? [];
  const completed = rows.filter((row) => row.status === "completed");
  const totalSeconds = completed.reduce((sum, row) => sum + (row.durationSeconds ?? 0), 0);
  const goldText = isDark ? palette.gold : palette.goldDark;

  return (
    <StudentScreen title={title} subtitle={subtitle}>
      {!rows.length ? (
        <EmptyState title="لا جلسات بعد" description="ابدأ تسميعك الأول من صفحة التسميع الحي" action="بدء جلسة تسميع" onAction={() => router.push("/student/recitation" as never)} />
      ) : (
        <>
          {completed.length ? (
            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: isDark ? `${palette.gold}1a` : `${palette.burgundy}1a` }]}><SvgIcon name="mic" size={20} color={colors.primary} /></View>
                <Text style={[styles.statValue, { color: colors.primary }]}>{completed.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>جلسة مكتملة</Text>
              </Card>
              <Card style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${palette.gold}26` }]}><SvgIcon name="timer" size={20} color={goldText} /></View>
                <Text style={[styles.statValue, { color: colors.primary }]}>{formatDuration(totalSeconds)}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>إجمالي وقت التسميع</Text>
              </Card>
            </View>
          ) : null}
          {rows.map((row) => {
            const done = row.status === "completed";
            const range = ayahRange(row.startAyah, row.endAyah);
            return (
              <Card key={row.id} style={styles.sessionCard}>
                <View style={[styles.sessionIcon, { backgroundColor: done ? (isDark ? "rgba(74,222,128,0.18)" : "#DCFCE7") : (isDark ? `${palette.gold}1a` : `${palette.burgundy}1a`) }]}>
                  <SvgIcon name={done ? "check-circle" : "mic"} size={20} color={done ? colors.success : colors.primary} />
                </View>
                <View style={styles.sessionBody}>
                  <View style={styles.sessionHead}>
                    <Text numberOfLines={1} style={[styles.sessionTitle, { color: colors.primary }]}>{row.surahName ?? (row.surahId ? `سورة رقم ${row.surahId}` : "جلسة تسميع")}</Text>
                    <Badge label={sessionStatusLabel(row.status)} tone={sessionStatusTone(row.status)} />
                  </View>
                  <View style={styles.metaLine}>
                    {range ? <Text style={[styles.metaText, { color: colors.muted }]}>{range}</Text> : null}
                    {row.hideMode ? <Text style={[styles.metaText, { color: colors.muted }]}>{HIDE_MODE_LABELS[row.hideMode] ?? ""}</Text> : null}
                    {row.mode === "educational" ? <Badge label="تعليمي" tone="gold" /> : null}
                  </View>
                  <View style={styles.metaLine}>
                    {row.durationSeconds != null ? (
                      <View style={styles.durationChip}>
                        <Icon name="time-outline" size={12} color={colors.muted} />
                        <Text style={[styles.durationText, { color: colors.text }]}>{formatDuration(row.durationSeconds)}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.metaText, { color: colors.muted }]}>{formatDate(row.createdAt)}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
          <Button label="بدء جلسة تسميع جديدة" variant="quiet" icon="mic-outline" onPress={() => router.push("/student/recitation" as never)} />
        </>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row-reverse", gap: 12 },
  statCard: { flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 14, paddingHorizontal: 10 },
  statIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 34, textAlign: "center" },
  statLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "center" },
  sessionCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, padding: 14 },
  sessionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sessionBody: { flex: 1, minWidth: 0, gap: 6 },
  sessionHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sessionTitle: { flex: 1, minWidth: 0, fontFamily: "Amiri_700Bold", fontSize: 18, lineHeight: 27, textAlign: "right" },
  metaLine: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 10 },
  metaText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right" },
  durationChip: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  durationText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18 },
});
