import { useRouter } from "expo-router";
import { formatDateTime } from "../../../lib/format";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { Button, Card, ErrorState, Icon, LoadingState, ProgressBar, Screen, SoftPressable } from "../../../components/ui";
import SectionIcon, { type SectionIconName } from "../../../components/ui/section-icon";
import { assignmentRange } from "../../../components/teacher/recitation-assignments";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme, palette } from "../../../lib/theme";

// ── بنية الرئيسية مطابقة للموقع (StudentHome.tsx):
//    1) تحية  2) آية اليوم  3) الإحصائيات  4) واجبات التسميع المعلقة
//    6) بطاقة الحلقة القادمة لكل مسار مسجّل  7) بطاقات المسارات غير المسجّلة  8) تذكير اختبار القبول
const PATH_ORDER = ["quran", "tajweed", "sharia"] as const;
type LearningPathKey = (typeof PATH_ORDER)[number];

type PathCard = { path: LearningPathKey; to: string; icon: SectionIconName; title: string };
const LEARNING_PATHS: PathCard[] = [
  { path: "quran", to: "/student/quran", icon: "quran", title: "القرآن الكريم" },
  { path: "tajweed", to: "/student/levels/tajweed", icon: "tajweed", title: "دروس التجويد" },
  { path: "sharia", to: "/student/sharia", icon: "sharia", title: "الدروس الشرعية" },
];

// مطابق لـ productRegistry.sessionTypeToLearningFeature (packages/domain/product-registry.json)
const SESSION_TYPE_TO_PATH: Record<string, LearningPathKey> = {
  quran_hifz: "quran", quran_review: "quran", qiraat: "quran",
  tajweed_correction: "tajweed", tajweed_level: "tajweed",
  sharia_fiqh: "sharia", sharia_aqeedah: "sharia", sharia_seerah: "sharia",
};

// آية احتياطية تظهر فقط إذا تعذر الوصول للخادم (كما في الموقع)
const FALLBACK_VERSE = { text: "إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوا وَّالَّذِينَ هُم مُّحْسِنُونَ", surahName: "النحل", ayahNumber: 128 };

export default function StudentHome() {
  const { token, name } = useAuth();
  const { colors, categories, isDark } = useTheme();
  const router = useRouter();
  const dashboard = trpc.student.dashboard.useQuery(undefined, { enabled: !!token, retry: 1, retryDelay: 800 });
  const settings = trpc.student.settings.useQuery(undefined, { enabled: !!token, staleTime: 60_000 });
  const verse = trpc.dailyVerse.today.useQuery(undefined, { staleTime: 30 * 60_000, retry: 1 });
  const assignments = trpc.recitationAssignments.mine.useQuery(undefined, { enabled: !!token });

  if (dashboard.isLoading) return <Screen><LoadingState /></Screen>;
  if (dashboard.error && !dashboard.data) return <Screen><ErrorState onRetry={() => void dashboard.refetch()} /></Screen>;

  const d = (dashboard.data ?? {}) as Record<string, any>;
  const progress = Number(d.completionPercentage ?? d.progressPercentage ?? 0);
  const levelName = typeof d.levelName === "string" && d.levelName && d.levelName !== "—" ? d.levelName : null;
  const enrolledPaths = PATH_ORDER.filter((p) => Array.isArray(d.enrolledPaths) && d.enrolledPaths.includes(p));
  const upcoming = Array.isArray(d.upcoming) ? d.upcoming : [];
  const stats = { totalJuz: Number(d.stats?.totalJuz ?? 0), sessionsCount: Number(d.stats?.sessionsCount ?? 0), avgScore: Number(d.stats?.avgScore ?? 0) };
  const placementStatus = d.student?.placementTestStatus;
  const showVerse = (settings.data as any)?.ayahNotification !== false;
  const pendingAssignments = (assignments.data ?? []).filter((row: any) => row.assignment?.status === "assigned");

  const upcomingByPath: Record<LearningPathKey, any[]> = { quran: [], tajweed: [], sharia: [] };
  for (const s of upcoming) {
    const p = SESSION_TYPE_TO_PATH[String(s?.sessionType ?? "")];
    if (p) upcomingByPath[p].push(s);
  }
  const v = (verse.data as any)?.verse ?? verse.data;
  const shownVerse = v?.text && v?.surahName && v?.ayahNumber != null ? v : FALLBACK_VERSE;
  // Web --home-feature-surface: solid burgundy by day, deep wine by night.
  const featureSurface = isDark ? "#42121F" : palette.burgundy;

  return (
    <Screen>
      {/* 1. التحية */}
      <View style={styles.greeting}>
        <Text style={[styles.greetTitle, { color: isDark ? palette.gold : palette.burgundy }]}>أهلاً، {name ? name.split(" ")[0] : "طالبنا"}</Text>
        <Text style={[styles.greetSub, { color: colors.muted }]}>
          {levelName ? `مستواك الحالي: ${levelName}` : "أكمل إعداد حسابك لتبدأ رحلتك القرآنية"}
        </Text>
        {levelName ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressHead}>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>مستوى الإنجاز</Text>
              <Text style={[styles.progressValue, { color: colors.primary }]}>{Math.round(progress)}٪</Text>
            </View>
            <ProgressBar value={progress} />
          </View>
        ) : null}
      </View>

      {/* 2. آية اليوم — تُعرض فقط عند تفعيلها من الحساب، مع توهج ذهبي من الأعلى كما في الموقع */}
      {showVerse ? (
        <Card style={[styles.verseCard, { backgroundColor: featureSurface, borderColor: featureSurface }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id="verseGlow" cx="50%" cy="0%" r="70%">
                  <Stop offset="0" stopColor={palette.gold} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={palette.gold} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx="50%" cy="0%" rx="80%" ry="90%" fill="url(#verseGlow)" />
            </Svg>
          </View>
          <View style={styles.verseChip}><Text style={styles.verseChipText}>آية اليوم</Text></View>
          <Text style={styles.verseText}>﴿ {String(shownVerse.text)} ﴾</Text>
          <Text style={styles.verseSource}>سورة {String(shownVerse.surahName)}، آية {String(shownVerse.ayahNumber)}</Text>
        </Card>
      ) : null}

      {/* 3. الإحصائيات */}
      <View style={styles.statsRow}>
        {[
          ["الأجزاء المحفوظة", stats.totalJuz],
          ["الجلسات المكتملة", stats.sessionsCount],
          ["متوسط التقييم", stats.avgScore],
        ].map(([label, value]) => (
          <Card key={String(label)} style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
          </Card>
        ))}
      </View>

      {/* 4. واجبات التسميع التي لم تُسلَّم بعد */}
      {pendingAssignments.length ? (
        <SoftPressable accessibilityRole="button" accessibilityLabel="واجبات التسميع" onPress={() => router.push("/student/recitation" as never)}>
          <Card style={[styles.assignmentCard, { borderRightColor: palette.gold }]}>
            <View style={[styles.pathIcon, { backgroundColor: `${palette.gold}26` }]}><Icon name="mic" size={22} color={isDark ? palette.gold : palette.goldDark} /></View>
            <View style={styles.assignmentBody}>
              <Text style={[styles.assignmentTitle, { color: colors.text }]}>واجبات التسميع{pendingAssignments.length > 1 ? ` (${pendingAssignments.length})` : ""}</Text>
              <Text numberOfLines={1} style={[styles.assignmentSub, { color: colors.muted }]}>{assignmentRange(pendingAssignments[0].assignment)}</Text>
            </View>
            <Icon name="arrow-left" size={17} color={colors.muted} />
          </Card>
        </SoftPressable>
      ) : null}

      {/* 6. الحلقة القادمة — بطاقة مستقلة لكل مسار مسجّل له موعد قادم */}
      {enrolledPaths.map((p) => {
        const next = upcomingByPath[p][0];
        if (!next) return null;
        return (
          <Card key={p} style={[styles.dutyCard, { backgroundColor: featureSurface, borderColor: featureSurface }]}>
            <Text style={styles.dutyTitle}>الواجب</Text>
            {next.surahName || next.topic ? (
              <View style={styles.dutyChip}><Icon name="books" size={14} color={palette.gold} /><Text style={styles.dutyChipText}>{String(next.topic ?? next.surahName)}</Text></View>
            ) : null}
            <View style={styles.dutyMetaRow}>
              {next.levelName ? <View style={styles.dutyMetaItem}><Icon name="books" size={13} color={palette.gold} /><Text style={styles.dutyMeta}>{String(next.levelName)}</Text></View> : null}
              <View style={styles.dutyMetaItem}><Icon name="user" size={13} color={palette.gold} /><Text style={styles.dutyMeta}>{String(next.teacherName ?? "معلمك")}</Text></View>
              <View style={styles.dutyMetaItem}><Icon name="clock" size={13} color={palette.gold} /><Text style={styles.dutyMeta}>{formatDateTime(next.scheduledAt ?? next.date) || "موعد قادم"}</Text></View>
            </View>
            <Button label="ادخل إلى الحلقة" icon="video" onPress={() => router.push(`/student/session/${next.id}` as never)} style={styles.dutyBtn} />
          </Card>
        );
      })}

      {/* 7. بطاقات المسارات غير المسجّلة — حد جانبي بلون هوية المسار */}
      {LEARNING_PATHS.filter((p) => !enrolledPaths.includes(p.path)).map((p) => {
        const tint = categories[p.path];
        return (
          <Pressable key={p.to} accessibilityRole="button" accessibilityLabel={p.title} onPress={() => router.push(p.to as never)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
            <Card style={[styles.pathCard, { borderRightWidth: 3, borderRightColor: tint }]}>
              <View style={[styles.pathIcon, { backgroundColor: `${tint}17` }]}>
                <SectionIcon name={p.icon} size={38} />
              </View>
              <Text style={[styles.pathTitle, { color: palette.goldDark }]}>{p.title}</Text>
              <View style={[styles.pathArrow, { backgroundColor: `${colors.primary}14` }]}>
                <Icon name="arrow-left" size={17} color={colors.primary} />
              </View>
            </Card>
          </Pressable>
        );
      })}

      {/* 8. تذكير اختبار تحديد المستوى */}
      {placementStatus && placementStatus !== "approved" ? (
        <Card style={styles.placementCard}>
          <View style={[styles.pathIcon, { backgroundColor: `${palette.gold}1f` }]}>
            <SectionIcon name="camera" size={36} />
          </View>
          <View style={styles.placementBody}>
            <Text style={[styles.placementTitle, { color: colors.text }]}>اختبار تحديد المستوى</Text>
            <Text style={[styles.placementSub, { color: colors.muted }]}>أكمل الاختبار ليتم اعتماد مستواك وبدء رحلتك</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/student/placement" as never)}
            style={({ pressed }) => [styles.placementBtn, { backgroundColor: `${palette.gold}1f`, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.placementBtnText, { color: palette.goldDark }]}>فتح</Text>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { paddingTop: 10, paddingBottom: 6, alignItems: "flex-end" },
  greetTitle: { fontFamily: "Amiri_700Bold", fontSize: 30, lineHeight: 44, textAlign: "right" },
  greetSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginTop: 3, textAlign: "right" },
  progressBlock: { alignSelf: "stretch", marginTop: 12 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  progressValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  verseCard: { alignItems: "center", paddingVertical: 20, overflow: "hidden" },
  verseChip: { backgroundColor: `${palette.gold}26`, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3, marginBottom: 10 },
  verseChipText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 24, color: palette.gold },
  verseText: { fontFamily: "Amiri_400Regular", fontSize: 20, lineHeight: 38, color: palette.gold, textAlign: "center", paddingHorizontal: 8 },
  verseSource: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, color: palette.gold, marginTop: 6 },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 6 },
  statLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "center" },
  statValue: { fontFamily: "Amiri_700Bold", fontSize: 26, lineHeight: 36, marginTop: 4 },
  assignmentCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRightWidth: 4 },
  assignmentBody: { flex: 1, minWidth: 0 },
  assignmentTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  assignmentSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginTop: 2, textAlign: "right" },
  dutyCard: { gap: 10 },
  dutyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 22, lineHeight: 34, color: palette.gold, textAlign: "right" },
  dutyChip: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  dutyChipText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, color: palette.gold },
  dutyMetaRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12, alignItems: "center" },
  dutyMetaItem: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  dutyMeta: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12.5, color: palette.gold },
  dutyBtn: { marginTop: 4 },
  pathCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  pathIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pathTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15.5, flex: 1, textAlign: "right" },
  pathArrow: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  placementCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRightWidth: 4, borderRightColor: palette.gold },
  placementBody: { flex: 1, minWidth: 0 },
  placementTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, textAlign: "right" },
  placementSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11.5, marginTop: 2, textAlign: "right" },
  placementBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  placementBtnText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
});
