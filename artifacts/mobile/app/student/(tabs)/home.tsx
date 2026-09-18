import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, ErrorState, LoadingState, ProgressBar, Screen } from "../../../components/ui";
import SectionIcon, { type SectionIconName } from "../../../components/section-icon";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme, palette } from "../../../lib/theme";

// ── بنية الرئيسية مطابقة للموقع (StudentHome.tsx):
//    1) تحية  2) آية اليوم  3) بطاقة الواجب لكل مسار مسجّل  4) بطاقات المسارات غير المسجّلة  5) تذكير اختبار القبول
const PATH_ORDER = ["quran", "tajweed", "sharia"] as const;
type LearningPathKey = (typeof PATH_ORDER)[number];

type PathCard = { path: LearningPathKey; to: string; icon: SectionIconName; title: string };
const LEARNING_PATHS: PathCard[] = [
  { path: "quran", to: "/student/quran", icon: "quran", title: "القرآن الكريم" },
  { path: "tajweed", to: "/student/levels/tajweed", icon: "tajweed", title: "دروس التجويد" },
  { path: "sharia", to: "/student/sharia", icon: "sharia", title: "الدروس الشرعية" },
];

const PATH_LABEL: Record<string, string> = { quran: "القرآن الكريم", tajweed: "دروس التجويد", sharia: "الدروس الشرعية" };
// مطابق لـ productRegistry.sessionTypeToLearningFeature (lib/tabyan-domain/product-registry.json)
const SESSION_TYPE_TO_PATH: Record<string, LearningPathKey> = {
  quran_hifz: "quran", quran_review: "quran", qiraat: "quran",
  tajweed_correction: "tajweed", tajweed_level: "tajweed",
  sharia_fiqh: "sharia", sharia_aqeedah: "sharia", sharia_seerah: "sharia",
};

export default function StudentHome() {
  const { token, name } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const dashboard = trpc.student.dashboard.useQuery(undefined, { enabled: !!token, retry: 1, retryDelay: 800 });
  const verse = trpc.dailyVerse.today.useQuery(undefined, { staleTime: 30 * 60_000, retry: 1 });

  if (dashboard.isLoading) return <Screen><LoadingState /></Screen>;
  if (dashboard.error && !dashboard.data) return <Screen><ErrorState onRetry={() => void dashboard.refetch()} /></Screen>;

  const d = (dashboard.data ?? {}) as Record<string, any>;
  const progress = Number(d.completionPercentage ?? d.progressPercentage ?? 0);
  const levelName = typeof d.levelName === "string" && d.levelName && d.levelName !== "—" ? d.levelName : null;
  const enrolledPaths = PATH_ORDER.filter((p) => Array.isArray(d.enrolledPaths) && d.enrolledPaths.includes(p));
  const upcoming = Array.isArray(d.upcoming) ? d.upcoming : [];
  const placementStatus = d.student?.placementTestStatus;

  const upcomingByPath: Record<LearningPathKey, any[]> = { quran: [], tajweed: [], sharia: [] };
  for (const s of upcoming) {
    const p = SESSION_TYPE_TO_PATH[String(s?.sessionType ?? "")];
    if (p) upcomingByPath[p].push(s);
  }

  return (
    <Screen>
      {/* 1. التحية */}
      <View style={styles.greeting}>
        <Text style={[styles.greetTitle, { color: colors.text }]}>أهلاً، {name ? name.split(" ")[0] : "طالبنا"}</Text>
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

      {/* 2. آية اليوم — تُعرض فقط ببيانات حقيقية مكتملة من الخادم، بلا بدائل ثابتة */}
      {(() => {
        const v = (verse.data as any)?.verse ?? verse.data;
        if (!v?.text || !v?.surahName || v?.ayahNumber == null) return null;
        return (
          <Card style={[styles.verseCard, { backgroundColor: palette.burgundy, borderColor: palette.burgundy }]}>
            <Text style={styles.verseChip}>آية اليوم</Text>
            <Text style={styles.verseText}>﴿ {String(v.text)} ﴾</Text>
            <Text style={styles.verseSource}>سورة {String(v.surahName)}، آية {String(v.ayahNumber)}</Text>
          </Card>
        );
      })()}

      {/* 3. الواجب — بطاقة مستقلة لكل مسار مسجّل له موعد قادم */}
      {enrolledPaths.map((p) => {
        const next = upcomingByPath[p][0];
        if (!next) return null;
        return (
          <Card key={p} style={[styles.dutyCard, { backgroundColor: palette.burgundy, borderColor: palette.burgundy }]}>
            <Text style={styles.dutyTitle}>الواجب</Text>
            <Text style={styles.dutyMeta}>
              {next.levelName ? `${next.levelName} — ` : ""}{String(next.teacherName ?? "معلمك")} — {String(next.scheduledAt ?? next.date ?? "موعد قادم")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/student/session/${next.id}` as never)}
              style={({ pressed }) => [styles.dutyBtn, { backgroundColor: palette.gold, opacity: pressed ? 0.88 : 1 }]}
            >
              <Text style={[styles.dutyBtnText, { color: palette.burgundy }]}>{next.status === "in_progress" ? "دخول الحلقة" : "عرض تفاصيل الحلقة"}</Text>
            </Pressable>
          </Card>
        );
      })}

      {/* 4. بطاقات المسارات غير المسجّلة */}
      {LEARNING_PATHS.filter((p) => !enrolledPaths.includes(p.path)).map((p) => (
        <Pressable key={p.to} accessibilityRole="button" accessibilityLabel={p.title} onPress={() => router.push(p.to as never)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
          <Card style={styles.pathCard}>
            <View style={[styles.pathIcon, { backgroundColor: `${colors.primary}14` }]}>
              <SectionIcon name={p.icon} size={38} />
            </View>
            <Text style={[styles.pathTitle, { color: palette.goldDark }]}>{p.title}</Text>
            <View style={[styles.pathArrow, { backgroundColor: `${colors.primary}14` }]}>
              <Text style={[styles.pathArrowText, { color: colors.primary }]}>‹</Text>
            </View>
          </Card>
        </Pressable>
      ))}

      {/* 5. تذكير اختبار تحديد المستوى */}
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
  greetTitle: { fontFamily: "Amiri_700Bold", fontSize: 27, textAlign: "right" },
  greetSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginTop: 3, textAlign: "right" },
  progressBlock: { alignSelf: "stretch", marginTop: 12 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12 },
  progressValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  verseCard: { alignItems: "center", paddingVertical: 18 },
  verseChip: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, color: palette.gold, marginBottom: 8 },
  verseText: { fontFamily: "Amiri_400Regular", fontSize: 19, lineHeight: 34, color: palette.gold, textAlign: "center" },
  verseSource: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, color: palette.gold, marginTop: 6 },
  dutyCard: { gap: 8 },
  dutyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 20, color: palette.gold, textAlign: "right" },
  dutyMeta: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12.5, color: palette.gold, textAlign: "right" },
  dutyBtn: { borderRadius: 999, paddingVertical: 11, alignItems: "center", marginTop: 4 },
  dutyBtnText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5 },
  pathCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24 },
  pathIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pathTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15.5, flex: 1, textAlign: "right" },
  pathArrow: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pathArrowText: { fontSize: 17, marginTop: -2 },
  placementCard: { flexDirection: "row", alignItems: "center", gap: 12, borderStartWidth: 4, borderStartColor: palette.gold },
  placementBody: { flex: 1, minWidth: 0 },
  placementTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, textAlign: "right" },
  placementSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11.5, marginTop: 2, textAlign: "right" },
  placementBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  placementBtnText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
});
