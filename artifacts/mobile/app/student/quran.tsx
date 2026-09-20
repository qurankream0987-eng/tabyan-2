import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, ErrorState, LoadingState } from "./_screen";
import { Icon } from "../../components/ui";
import SectionIcon, { type SectionIconName } from "../../components/section-icon";
import { StudentScreen } from "./_screen";
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
  const { colors, isDark, categories } = useTheme();
  const router = useRouter();
  const paths = trpc.student.paths.useQuery(undefined, { enabled: !!token });

  if (paths.isLoading) return <StudentScreen title="القرآن الكريم" subtitle="اختر مسارك القرآني"><LoadingState /></StudentScreen>;
  if (paths.error) return <StudentScreen title="القرآن الكريم" subtitle="اختر مسارك القرآني"><ErrorState onRetry={() => void paths.refetch()} /></StudentScreen>;

  const qiraat = paths.data?.qiraat as QiraatPath;
  const qiraatBadge = menuBadge(qiraat);

  // أيقونات SVG الحقيقية المطابقة للموقع (QuranMenu): hifz / tilawah / qiraat
  const sections: Array<{ href: string; icon: SectionIconName; title: string; badge?: { label: string; locked: boolean } }> = [
    { href: "/student/levels/quran", icon: "hifz", title: "حفظ ومراجعة القرآن" },
    { href: "/student/tilawah", icon: "tilawah", title: "تصحيح التلاوة" },
    { href: "/student/ijazat", icon: "qiraat", title: "القراءات", badge: qiraatBadge },
  ];

  return (
    <StudentScreen title="القرآن الكريم" subtitle="اختر مسارك القرآني">
      {sections.map((s) => (
        <Pressable
          key={s.title}
          accessibilityRole="button"
          accessibilityLabel={s.title}
          onPress={() => router.push(s.href as never)}
          style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Card style={[
            styles.card,
            s.icon === "qiraat" ? styles.qiraatCard : undefined,
            { borderStartWidth: 3, borderStartColor: s.icon === "qiraat" ? categories.qiraat : categories.quran },
          ]}>
            <View style={[
              styles.iconBubble,
              s.icon === "qiraat" ? styles.qiraatIconBubble : undefined,
              { backgroundColor: s.icon === "qiraat" ? (isDark ? `${palette.gold}1a` : `${palette.burgundy}14`) : `${palette.gold}1f` },
            ]}>
              <SectionIcon name={s.icon} size={38} />
            </View>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={[styles.title, { color: colors.text }]}>{s.title}</Text>
                <View style={[
                  styles.arrowBubble,
                  s.icon === "qiraat" ? styles.qiraatArrowBubble : undefined,
                  { backgroundColor: s.icon === "qiraat" ? (isDark ? `${palette.gold}1a` : `${palette.burgundy}14`) : `${palette.gold}1f` },
                ]}>
                  <Icon name="chevron-back" size={16} color={colors.primary} />
                </View>
              </View>
              {s.badge ? (
                s.icon === "qiraat" ? (
                  <View style={styles.qiraatBadgeRow}>
                    <View style={[
                      styles.qiraatBadge,
                      { backgroundColor: s.badge.locked ? (isDark ? `${colors.text}1a` : `${palette.burgundy}1a`) : `${palette.gold}33` },
                    ]}>
                      <Text style={[styles.qiraatBadgeText, { color: s.badge.locked ? colors.primary : (isDark ? palette.gold : palette.goldDark) }]}>
                        {s.badge.label}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.badgeRow}>
                    <Badge label={s.badge.label} tone={s.badge.locked ? "muted" : "gold"} />
                  </View>
                )
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
  card: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  qiraatCard: { padding: 12, marginBottom: 14 },
  iconBubble: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  qiraatIconBubble: { width: 44, height: 44, borderRadius: 16 },
  body: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", flexShrink: 1 },
  arrowBubble: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  qiraatArrowBubble: { width: 32, height: 32, borderRadius: 16 },
  badgeRow: { marginTop: 8, alignItems: "flex-start" },
  qiraatBadgeRow: { marginTop: 4, alignItems: "flex-start" },
  qiraatBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  qiraatBadgeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11 },
});
