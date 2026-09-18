import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, EmptyState, Icon } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "./_components";
import { useTheme } from "../../lib/theme";

export default function Students() {
  const { colors } = useTheme();
  const q = trpc.teacher.myStudents.useQuery();
  const router = useRouter();
  const rows = (q.data ?? []) as any[];
  return (
    <TeacherScreen title="طلابي" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {!q.isLoading && <Text style={[styles.count, { color: colors.muted }]}>تتابع مسيرة {rows.length} طالب(ة)</Text>}
      {rows.length ? rows.map((s) => {
        const scoreTone = s.lastScore != null && s.lastScore < 60 ? "danger" : s.lastScore != null && s.lastScore >= 90 ? "success" : "muted";
        return (
          <Pressable key={s.studentId} onPress={() => router.push(`/teacher/students/${s.studentId}`)} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}26` }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{s.name.charAt(0)}</Text>
                </View>
                {s.lastScore != null ? <Badge label={`${s.lastScore}/100`} tone={scoreTone} /> : null}
              </View>
              <Text style={[styles.name, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.level, { color: colors.muted }]}>المستوى: {s.levelName || "—"}</Text>
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text style={[styles.footerText, { color: colors.muted }]}><Icon name="books-outline" size={12} color={colors.muted} /> {s.totalJuz ?? 0} أجزاء</Text>
                <Text style={[styles.footerText, { color: s.nextSessionAt ? colors.primary : colors.muted }]}><Icon name="time-outline" size={12} color={s.nextSessionAt ? colors.primary : colors.muted} /> {s.nextSessionAt ? "موعد قادم" : "لا يوجد"}</Text>
              </View>
            </Card>
          </Pressable>
        );
      }) : <EmptyState title="لا طلاب بعد" description="سيظهر طلابك هنا بعد أول حصة" />}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 12 },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Amiri_700Bold", fontSize: 21 },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right", marginTop: 12 },
  level: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 3 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 10 },
  footerText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
});