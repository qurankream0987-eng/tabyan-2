import { useRouter } from "expo-router";
import { useId, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "../../components/student/student-screen";
import { Icon, SvgIcon } from "../../components/ui";
import SectionIcon, { type SectionIconName } from "../../components/ui/section-icon";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";

/** Web SHARIA_SUBJECT_META fallbacks: icon + accent per subject key. */
const SUBJECT_META: Record<string, { icon: SectionIconName; color: string }> = {
  aqeedah: { icon: "shield", color: "#800020" },
  fiqh: { icon: "scale", color: "#B8860B" },
  seerah: { icon: "moon", color: "#2F5D49" },
};

type Subject = { key?: string; id?: string | number; name?: string; title?: string; color?: string | null };

/** Web summary card: burgundy diagonal gradient with a gold glow at the top. */
function SummaryBackground({ width, height }: { width: number; height: number }) {
  const id = useId();
  if (!width || !height) return null;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <LinearGradient id={`sh-${id}`} x1="0" y1="0" x2={width} y2={height} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#800020" />
          <Stop offset="0.6" stopColor="#A02040" />
          <Stop offset="1" stopColor="#5F1530" />
        </LinearGradient>
        <RadialGradient id={`gl-${id}`} cx={width / 2} cy={0} rx={width * 0.8} ry={height * 0.6} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={palette.gold} stopOpacity={0.55} />
          <Stop offset="0.7" stopColor={palette.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#sh-${id})`} />
      <Rect x={0} y={0} width={width} height={height} fill={`url(#gl-${id})`} opacity={0.2} />
    </Svg>
  );
}

export default function Sharia() {
  const { token } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const subjects = trpc.sharia.subjects.useQuery(undefined, { enabled: !!token });
  const summary = trpc.sharia.summary.useQuery(undefined, { enabled: !!token });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rows = (Array.isArray(subjects.data) ? subjects.data : []) as Subject[];
  const names = rows.map((row) => row.name ?? row.title ?? "مادة شرعية").join("، ");

  if (subjects.isLoading) {
    return <StudentScreen title="الدروس الشرعية" subtitle="العلم الشرعي نورٌ يُقود إلى العمل"><LoadingState /></StudentScreen>;
  }
  if (subjects.error) {
    return <StudentScreen title="الدروس الشرعية"><ErrorState onRetry={() => void subjects.refetch()} /></StudentScreen>;
  }

  const data = summary.data;
  const last = data?.lastStudied ?? null;
  const stats = data ? [
    { value: String(data.completed), label: "درساً مكتملاً" },
    { value: String(data.remaining), label: "درساً متبقياً" },
    { value: last?.levelName ?? "—", label: "مستواك الحالي" },
  ] : [];

  return (
    <StudentScreen
      title="الدروس الشرعية"
      subtitle={`العلم الشرعي نورٌ يُقود إلى العمل — مواد اختيارية${names ? `: ${names}` : ""}`}
    >
      {!rows.length ? (
        <EmptyState title="لا مواد متاحة حالياً" description="ستُضاف مواد الدروس الشرعية قريباً بإذن الله" />
      ) : (
        <>
          {data ? (
            <View
              style={styles.summaryCard}
              onLayout={(event) => { const { width, height } = event.nativeEvent.layout; setSize((current) => (current.width === width && current.height === height ? current : { width, height })); }}
            >
              <SummaryBackground width={size.width} height={size.height} />
              <View style={styles.summaryHead}>
                <View style={styles.summaryTitles}>
                  <Text style={styles.summaryKicker}>مسيرتك في العلم الشرعي</Text>
                  <Text style={styles.summaryPercent}>
                    {data.percentage}<Text style={styles.summaryPercentSign}>%</Text>
                  </Text>
                </View>
                <View style={styles.summaryIcon}><SvgIcon name="graduation" size={26} color={palette.gold} /></View>
              </View>
              <View style={styles.statGrid}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statCell}>
                    <Text numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
                    <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {last ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`متابعة آخر درس: ${last.title}`}
              onPress={() => router.push(`/student/sharia/${last.subjectKey}/content?contentId=${encodeURIComponent(last.contentId)}` as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
            >
              <Card style={styles.subjectCard} accent>
                <View style={[styles.iconBubble, { backgroundColor: `${palette.gold}1f` }]}>
                  <Icon name="play" size={20} color={isDark ? palette.gold : palette.goldDark} />
                </View>
                <View style={styles.subjectBody}>
                  <Text style={[styles.resumeKicker, { color: colors.muted }]}>متابعة آخر درس · {last.subjectName}</Text>
                  <Text numberOfLines={1} style={[styles.resumeTitle, { color: colors.text }]}>{last.title}</Text>
                </View>
                <View style={[styles.arrowBubble, { backgroundColor: isDark ? `${palette.gold}1a` : `${palette.burgundy}14` }]}>
                  <Icon name="chevron-back" size={16} color={colors.primary} />
                </View>
              </Card>
            </Pressable>
          ) : null}
          <View style={styles.list}>
            {rows.map((row, index) => {
              const key = String(row.key ?? row.id ?? `subject-${index}`);
              const name = row.name ?? row.title ?? "مادة شرعية";
              const meta = SUBJECT_META[key] ?? SUBJECT_META.aqeedah;
              const color = row.color ?? meta.color;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => router.push(`/student/sharia/${key}` as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <Card style={styles.subjectCard}>
                    <View style={[styles.iconBubble, { backgroundColor: `${color}1f` }]}>
                      <SectionIcon name={meta.icon} size={28} />
                    </View>
                    <Text style={[styles.subjectName, { color: colors.text }]}>{name}</Text>
                    <View style={[styles.arrowBubble, { backgroundColor: isDark ? `${palette.gold}1a` : `${palette.burgundy}14` }]}>
                      <Icon name="chevron-back" size={16} color={colors.primary} />
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
  list: { gap: 2, paddingTop: 4 },
  summaryCard: { borderRadius: 24, overflow: "hidden", paddingHorizontal: 20, paddingVertical: 20, marginBottom: 12, backgroundColor: palette.burgundy },
  summaryHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  summaryTitles: { flex: 1, minWidth: 0 },
  summaryKicker: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18, color: palette.gold, textAlign: "right", marginBottom: 4 },
  summaryPercent: { fontFamily: "Amiri_700Bold", fontSize: 34, lineHeight: 44, color: palette.gold, textAlign: "right" },
  summaryPercentSign: { fontSize: 18 },
  summaryIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: `${palette.gold}66`, backgroundColor: `${palette.gold}26`, alignItems: "center", justifyContent: "center" },
  statGrid: { flexDirection: "row-reverse", gap: 8 },
  statCell: { flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.10)", paddingHorizontal: 6, paddingVertical: 10, alignItems: "center" },
  statValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 22, color: palette.gold, textAlign: "center" },
  statLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 15, color: palette.gold, textAlign: "center", marginTop: 2 },
  subjectCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 24 },
  iconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subjectBody: { flex: 1, minWidth: 0 },
  subjectName: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  resumeTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  resumeKicker: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 17, textAlign: "right" },
  arrowBubble: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
