import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, ErrorState, LoadingState } from "../../components/student/student-screen";
import { Icon } from "../../components/ui";
import SectionIcon, { type SectionIconName } from "../../components/ui/section-icon";
import { StudentScreen } from "../../components/student/student-screen";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";

type QiraatPath = { certified?: boolean; certificateStatus?: string } | undefined;

function menuBadge(qiraat: QiraatPath): { label: string; locked: boolean } {
  if (qiraat?.certified) return { label: "إجازتك معتمدة", locked: false };
  if (qiraat?.certificateStatus === "pending") return { label: "قيد المراجعة", locked: true };
  return { label: "يتطلب إجازة", locked: true };
}

export default function Quran() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const paths = trpc.student.paths.useQuery(undefined, { enabled: !!token });
  // عدّاد الواجبات المعلّقة كما على الموقع (QuranMenu): «N بانتظار تسميعك».
  const assignments = trpc.recitationAssignments.mine.useQuery(undefined, { enabled: !!token });
  const pendingAssignments = (assignments.data ?? []).filter((row) => row.assignment.status === "assigned").length;

  const title = "القرآن الكريم";
  const subtitle = "اختر مسارك القرآني";
  if (paths.isLoading) return <StudentScreen title={title} subtitle={subtitle}><LoadingState /></StudentScreen>;
  if (paths.error) return <StudentScreen title={title} subtitle={subtitle}><ErrorState onRetry={() => void paths.refetch()} /></StudentScreen>;

  const qiraat = paths.data?.qiraat as QiraatPath;
  const qiraatBadge = menuBadge(qiraat);
  // Web: bg-burgundy/8 by day, bg-gold/10 by night.
  const bubble = isDark ? `${palette.gold}1a` : `${palette.burgundy}14`;

  // نفس أقسام الموقع وترتيبها (QuranMenu): حفظ ومراجعة، تصحيح التلاوة، واجبات التسميع، القراءات.
  const sections: Array<{ href: string; icon: SectionIconName; title: string; badge?: { label: string; locked: boolean } }> = [
    { href: "/student/levels/quran", icon: "hifz", title: "حفظ ومراجعة القرآن" },
    { href: "/student/tilawah", icon: "tilawah", title: "تصحيح التلاوة" },
    { href: "/student/recitation", icon: "graduation", title: "واجبات التسميع", badge: pendingAssignments ? { label: `${pendingAssignments} بانتظار تسميعك`, locked: false } : undefined },
    { href: "/student/ijazat", icon: "qiraat", title: "القراءات", badge: qiraatBadge },
  ];

  return (
    <StudentScreen title={title} subtitle={subtitle}>
      {sections.map((s) => (
        <Pressable
          key={s.title}
          accessibilityRole="button"
          accessibilityLabel={s.title}
          onPress={() => router.push(s.href as never)}
          style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Card style={styles.card}>
            <View style={[styles.iconBubble, { backgroundColor: bubble }]}>
              <SectionIcon name={s.icon} size={38} />
            </View>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
                <View style={[styles.arrowBubble, { backgroundColor: bubble }]}>
                  <Icon name="arrow-left" size={16} color={colors.primary} />
                </View>
              </View>
              {s.badge ? (
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: s.badge.locked ? (isDark ? "rgba(255,255,255,0.1)" : `${palette.burgundy}1a`) : `${palette.gold}33` }]}>
                    <Text numberOfLines={1} style={[styles.badgeText, { color: s.badge.locked ? colors.primary : (isDark ? palette.gold : palette.goldDark) }]}>
                      {s.badge.label}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 2 },
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 12, borderRadius: 28 },
  iconBubble: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  arrowBubble: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badgeRow: { marginTop: 4, alignItems: "flex-end" },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-end" },
  badgeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11 },
});
