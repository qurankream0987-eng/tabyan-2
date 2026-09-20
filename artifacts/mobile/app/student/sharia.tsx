import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "./_screen";
import SectionIcon, { type SectionIconName } from "../../components/section-icon";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";

const SUBJECT_ICONS: Record<string, SectionIconName> = {
  aqeedah: "shield",
  fiqh: "scale",
  seerah: "moon",
};

type Subject = { key?: string; id?: string | number; name?: string; title?: string; description?: string | null };

export default function Sharia() {
  const { token } = useAuth();
  const router = useRouter();
  const { colors, categories } = useTheme();
  const subjects = trpc.sharia.subjects.useQuery(undefined, { enabled: !!token });
  const summary = trpc.sharia.summary.useQuery(undefined, { enabled: !!token });
  const rows = (Array.isArray(subjects.data) ? subjects.data : []) as Subject[];
  const names = rows.map((row) => row.name ?? row.title ?? "مادة شرعية").join("، ");

  if (subjects.isLoading) {
    return <StudentScreen title="الدروس الشرعية" subtitle="العلم الشرعي نورٌ يُقود إلى العمل"><LoadingState /></StudentScreen>;
  }
  if (subjects.error) {
    return <StudentScreen title="الدروس الشرعية"><ErrorState onRetry={() => void subjects.refetch()} /></StudentScreen>;
  }

  return (
    <StudentScreen
      title="الدروس الشرعية"
      subtitle={`العلم الشرعي نورٌ يُقود إلى العمل — مواد اختيارية${names ? `: ${names}` : ""}`}
    >
      {!rows.length ? (
        <EmptyState title="لا مواد متاحة حالياً" description="ستُضاف مواد الدروس الشرعية قريباً بإذن الله" />
      ) : (
        <>
          {summary.data ? (
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>تقدمك في الدروس الشرعية</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.data.percentage}% مكتمل</Text>
              <Text style={[styles.summaryMeta, { color: colors.muted }]}>
                أتممت {summary.data.completed} من {summary.data.total} درسًا
              </Text>
              {summary.data.lastStudied ? (
                <Pressable
                  onPress={() => router.push(`/student/sharia/${summary.data.lastStudied?.subjectKey}/content?contentId=${encodeURIComponent(summary.data.lastStudied?.contentId ?? "")}` as never)}
                  style={[styles.resume, { backgroundColor: colors.input }]}
                >
                  <Text style={[styles.resumeText, { color: colors.primary }]}>متابعة آخر درس: {summary.data.lastStudied.title}</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}
          <View style={styles.list}>
            {rows.map((row, index) => {
              const key = String(row.key ?? row.id ?? `subject-${index}`);
              const name = row.name ?? row.title ?? "مادة شرعية";
              const icon = SUBJECT_ICONS[key] ?? "shield";
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => router.push(`/student/sharia/${key}` as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <Card style={[styles.subjectCard, { borderStartWidth: 3, borderStartColor: categories.sharia }]}>
                    <View style={[styles.iconBubble, { backgroundColor: `${palette.gold}1f` }]}>
                      <SectionIcon name={icon} size={32} />
                    </View>
                    <Text style={[styles.subjectName, { color: colors.text }]}>{name}</Text>
                    <View style={[styles.arrowBubble, { backgroundColor: `${colors.primary}14` }]}>
                      <Text style={[styles.arrow, { color: colors.primary }]}>‹</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingTop: 4 },
  summaryCard: { marginBottom: 12 },
  summaryTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, textAlign: "right" },
  summaryValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 22, textAlign: "right", marginTop: 7 },
  summaryMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 2 },
  resume: { borderRadius: 12, padding: 10, marginTop: 12 },
  resumeText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right" },
  subjectCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  iconBubble: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  subjectName: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  arrowBubble: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  arrow: { fontSize: 19, marginTop: -2 },
});