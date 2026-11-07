import { useRouter } from "expo-router";
import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { Badge, Card, ErrorState, LoadingState, StudentScreen } from "../../components/student/student-screen";
import { Button, Icon, SvgIcon, type SvgIconName } from "../../components/ui";
import SectionIcon, { type SectionIconName } from "../../components/ui/section-icon";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type QiraatPath = { certified?: boolean; certificateStatus?: string | null } | undefined;

function qiraatState(qiraat: QiraatPath): { label: string; tone: "success" | "gold" | "muted"; hint: string; action: string; href: string } {
  if (qiraat?.certified) {
    return { label: "إجازتك معتمدة", tone: "success", hint: "تم اعتمادك في برنامج القراءات؛ يمكنك الدخول إلى مستوياته مباشرة.", action: "الدخول إلى برنامج القراءات", href: "/student/levels/qiraat" };
  }
  if (qiraat?.certificateStatus === "pending") {
    return { label: "قيد المراجعة", tone: "gold", hint: "سيتم مراجعة إجازتك، وسيتم الرد خلال أقرب وقت ممكن.", action: "متابعة حالة الطلب", href: "/student/ijazat" };
  }
  return { label: "يتطلب إجازة", tone: "muted", hint: "افتح صفحة القراءات للإجابة عن سؤال الإجازة ورفع الوثيقة عبر المسار المعتمد.", action: "فتح صفحة القراءات", href: "/student/ijazat" };
}

/** Web PathSelection header card: big icon bubble, Amiri title, description, round chevron. */
function PathHeader({ icon, title, description, open, onPress, colors, isDark }: {
  icon: SectionIconName; title: string; description: string; open?: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={open === undefined ? undefined : { expanded: open }} onPress={onPress} style={({ pressed }) => [styles.header, { opacity: pressed ? 0.88 : 1 }]}>
      <View style={[styles.headerIcon, { backgroundColor: isDark ? `${palette.gold}1a` : `${palette.burgundy}14` }]}>
        <SectionIcon name={icon} size={38} />
      </View>
      <View style={styles.headerBody}>
        <Text style={[styles.headerTitle, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
        <Text style={[styles.headerDescription, { color: colors.muted }]}>{description}</Text>
      </View>
      <View style={[styles.headerChevron, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : `${palette.burgundy}0d` }]}>
        <Icon name={open ? "chevron-down" : "arrow-left"} size={18} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function PathRow({ icon, title, description, badge, trailing, gold = false, onPress, colors, isDark }: {
  icon: SvgIconName; title: string; description: string; badge?: string; trailing?: React.ReactNode; gold?: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean;
}) {
  const accent = gold ? (isDark ? palette.gold : palette.goldDark) : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.row, { borderTopColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: gold ? `${palette.gold}26` : (isDark ? `${palette.gold}1a` : `${palette.burgundy}1a`) }]}>
        <SvgIcon name={icon} size={22} color={accent} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
          {badge ? <Badge label={badge} tone="gold" /> : null}
        </View>
        <Text style={[styles.rowDescription, { color: colors.muted }]}>{description}</Text>
      </View>
      {trailing ?? <Icon name="arrow-left" size={16} color={colors.muted} />}
    </Pressable>
  );
}

export default function PathSelection() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const paths = trpc.student.paths.useQuery(undefined, { enabled: !!token });
  const placement = trpc.student.placementStatus.useQuery(undefined, { enabled: !!token });
  const [quranOpen, setQuranOpen] = useState(false);
  const [qiraatOpen, setQiraatOpen] = useState(false);

  const title = "المسارات التعليمية";
  const subtitle = "اختر مسارك وابدأ رحلة الإتقان";
  if (paths.isLoading) return <StudentScreen title={title} subtitle={subtitle}><LoadingState /></StudentScreen>;
  if (paths.error) return <StudentScreen title={title} subtitle={subtitle}><ErrorState onRetry={() => void paths.refetch()} /></StudentScreen>;

  const qiraat = qiraatState(paths.data?.qiraat as QiraatPath);
  const placementRequired = placement.data?.status !== "approved";
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const go = (href: string) => router.push(href as never);

  return (
    <StudentScreen title={title} subtitle={subtitle}>
      <Card style={[styles.card, quranOpen ? { borderColor: isDark ? `${palette.gold}4d` : `${palette.burgundy}33` } : null]}>
        <PathHeader
          icon="quran"
          title="القرآن الكريم"
          description={quranOpen ? "اختر أحد المسارات" : "اضغط لعرض المسارات"}
          open={quranOpen}
          onPress={() => { animate(); setQuranOpen((value) => !value); if (!quranOpen) setQiraatOpen(false); }}
          colors={colors}
          isDark={isDark}
        />
        {quranOpen ? (
          <View style={[styles.rows, { backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(128,0,32,0.025)" }]}>
            <PathRow icon="quran" title="حفظ ومراجعة القرآن" description="٥ مستويات من الغرس إلى الوارثون" onPress={() => go("/student/levels/quran")} colors={colors} isDark={isDark} />
            <PathRow icon="video" title="اختبار القبول" description="سجّل فيديو قصيراً لتحديد مستواك" badge={placementRequired ? "مطلوب" : undefined} onPress={() => go("/student/placement")} colors={colors} isDark={isDark} />
            <PathRow icon="mic" title="تصحيح التلاوة" description="تحسين التلاوة لجميع الأعمار — بدون حفظ" onPress={() => go("/student/tilawah")} colors={colors} isDark={isDark} />
            <PathRow
              icon="certificate"
              gold
              title="القراءات"
              description="القراءات العشر — يتطلب إجازة الشاطبية"
              trailing={<SvgIcon name={qiraatOpen ? "x" : "shield"} size={18} color={isDark ? palette.gold : palette.goldDark} />}
              onPress={() => { animate(); setQiraatOpen((value) => !value); }}
              colors={colors}
              isDark={isDark}
            />
            {qiraatOpen ? (
              <View style={[styles.qiraatInline, { backgroundColor: `${palette.gold}0d`, borderTopColor: `${palette.gold}33` }]}>
                <Badge label={qiraat.label} tone={qiraat.tone} style={styles.qiraatBadge} />
                <Text style={[styles.qiraatHint, { color: colors.muted }]}>{qiraat.hint}</Text>
                <Button label={qiraat.action} icon={paths.data?.qiraat?.certified ? "arrow-left" : "file-text"} onPress={() => go(qiraat.href)} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <PathHeader icon="tajweed" title="مسار التجويد" description="أحكام التجويد النظرية والتطبيقية عبر 3 مستويات" onPress={() => go("/student/levels/tajweed")} colors={colors} isDark={isDark} />
      </Card>
      <Card style={styles.card}>
        <PathHeader icon="sharia" title="الدروس الشرعية" description="العقيدة — الفقه — السيرة النبوية" onPress={() => go("/student/sharia")} colors={colors} isDark={isDark} />
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: "hidden", borderRadius: 24, marginBottom: 14 },
  header: { flexDirection: "row-reverse", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 18 },
  headerIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerBody: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 34, textAlign: "right" },
  headerDescription: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  headerChevron: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  rows: {},
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 23, textAlign: "right" },
  rowDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  qiraatInline: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10, alignItems: "stretch", borderTopWidth: StyleSheet.hairlineWidth },
  qiraatBadge: { alignSelf: "center" },
  qiraatHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "center" },
});
