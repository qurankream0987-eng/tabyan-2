import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StudentScreen, Card, EmptyState, LoadingState, ErrorState, Badge } from "../_screen";
import { Button, Icon } from "../../../components/ui";
import SectionIcon, { type SectionIconName } from "../../../components/section-icon";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme, palette, type LearningCategory } from "../../../lib/theme";

type PathKey = "quran" | "tajweed_correction" | "qiraat" | "tajweed" | "sharia";
const VALID_PATHS: PathKey[] = ["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"];
// هوية المسار البصرية — تصحيح التلاوة يتبع لون التجويد لقربه منه
const PATH_CATEGORY: Record<PathKey, LearningCategory> = {
  quran: "quran", tajweed: "tajweed", tajweed_correction: "tajweed", qiraat: "qiraat", sharia: "sharia",
};

const PATH_META: Record<PathKey, { name: string; desc: string; icon: string }> = {
  quran: { name: "القرآن الكريم", desc: "حفظ ومراجعة وتلاوة", icon: "book-outline" },
  tajweed: { name: "مسار التجويد", desc: "أحكام التجويد النظرية والتطبيقية عبر 3 مستويات", icon: "musical-notes-outline" },
  tajweed_correction: { name: "تصحيح التلاوة", desc: "تحسين التلاوة بدون حفظ", icon: "mic-outline" },
  qiraat: { name: "القراءات", desc: "مسار الإجازات", icon: "ribbon-outline" },
  sharia: { name: "الدروس الشرعية", desc: "عقيدة وفقه وسيرة نبوية", icon: "scale-outline" },
};

// خريطة الأيقونات مطابقة حرفيًا للموقع (Levels.tsx): أيقونات SVG مخصصة
const LEVEL_ICON: Record<string, SectionIconName> = {
  "الغرس": "seed",
  "السنبلة": "wheat",
  "النماء": "tree",
  "الثمرة": "fruit",
  "الوارثون": "crown",
  "التجويد الأساسي": "wave1",
  "التجويد المتوسط": "wave2",
  "التجويد المتقدم": "wave3",
};

const PATH_FALLBACK_ICON: Record<PathKey, SectionIconName> = {
  quran: "hifz",
  tajweed: "tajweed",
  tajweed_correction: "tilawah",
  qiraat: "qiraat",
  sharia: "sharia",
};

// ── محتوى شروط ومتطلبات مستويات القرآن — مطابق للموقع ─────────────────────────
const QURAN_DETAILS: Record<string, { cond: string; reqs: string[] }> = {
  "الغرس": {
    cond: "حفظ 5 أجزاء فما فوق",
    reqs: ["الحفظ الجديد: وجه واحد في كل حلقة", "المراجعة: تبدأ من سورة الناس"],
  },
  "السنبلة": {
    cond: "حفظ 10 أجزاء فما فوق",
    reqs: ["الحفظ الجديد: وجهان في كل حلقة", "المراجعة: تبدأ من سورة الناس"],
  },
  "النماء": {
    cond: "حفظ 15 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ربع حزب في كل حلقة", "المراجعة: ربع حزب في كل حلقة"],
  },
  "الثمرة": {
    cond: "حفظ 20 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ربع حزب في كل حلقة", "المراجعة: ربع حزب في كل حلقة"],
  },
  "الوارثون": {
    cond: "حفظ 25 جزءاً فما فوق",
    reqs: ["الحفظ الجديد: ثلاثة أوجه في كل حلقة", "المراجعة: حزب كامل في كل حلقة"],
  },
};

const AQEEDAH_CLARIFICATIONS: Record<string, string> = {
  "الثمرة": "الأبيات من 1 إلى 137",
  "الوارثون": "الأبيات من 137 إلى 290",
};

const TAJWEED_LESSONS: Record<string, string[]> = {
  "التجويد الأساسي": ["أحكام النون الساكنة والتنوين", "أحكام الميم الساكنة", "النون والميم المشددتين", "القلقلة"],
  "التجويد المتوسط": ["مخارج الحروف", "صفات الحروف", "المدود وأقسامها"],
  "التجويد المتقدم": ["الوقف والابتداء", "الحذف والإثبات"],
};

const TAJWEED_DISPLAY_NAMES: Record<string, string> = {
  "التجويد الأساسي": "المستوى الأول",
  "التجويد المتوسط": "المستوى الثاني",
  "التجويد المتقدم": "المستوى الثالث",
};

const SHARIA_SUBJECTS: { key: string; name: string; icon: SectionIconName }[] = [
  { key: "aqeedah", name: "العقيدة", icon: "shield" },
  { key: "fiqh", name: "الفقه", icon: "scale" },
  { key: "seerah", name: "السيرة النبوية", icon: "moon" },
];
const SHARIA_LEVEL_DESC: Record<string, string> = {
  "البذرة": "الأساسيات", "النور": "التوسع", "الهدى": "التطبيق", "اليقين": "الاحتكام",
};

type LevelRow = {
  id: number; name: string; nameEn: string | null; sessionsCount: number;
  requiredJuz: number; requiredSessions: number; minGrade: string | null;
  requiresIjazah: boolean; isCurrent: boolean; progressStatus: string;
  aqeedahRequirement?: string | null; aqeedahStatus?: string | null; aqeedahLevelId?: number | null;
};

export default function Levels() {
  const { pathId = "quran" } = useLocalSearchParams<{ pathId?: string }>();
  const path = (VALID_PATHS.includes(pathId as PathKey) ? pathId : "quran") as PathKey;
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const meta = PATH_META[path];
  const q = trpc.student.levels.useQuery({ path }, { enabled: !!token });

  if (q.isLoading) return <StudentScreen title={meta.name} subtitle={meta.desc}><LoadingState /></StudentScreen>;
  if (q.error && !q.data) return <StudentScreen title={meta.name} subtitle={meta.desc}><ErrorState onRetry={() => void q.refetch()} /></StudentScreen>;

  const levels = (q.data ?? []) as LevelRow[];
  const displayedLevels = path === "tajweed"
    ? levels.filter((level) => level.name !== "إتقان التجويد")
    : levels;

  return (
    <StudentScreen title={meta.name} subtitle={meta.desc}>
      {!displayedLevels.length ? (
        <EmptyState title="لا مستويات متاحة بعد" />
      ) : path === "sharia" ? (
        <ShariaView levels={displayedLevels} onBook={(l) => router.push(`/student/booking?levelId=${l.id}&path=sharia` as never)} />
      ) : (
        <View style={styles.list}>
          {displayedLevels.map((l) => (
            <LevelCard key={l.id} level={l} path={path} onBook={(suffix) => router.push(suffix as never)} />
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/student/booking?path=${path}` as never)}
        style={({ pressed }) => [styles.pickCta, { backgroundColor: `${colors.primary}0f`, opacity: pressed ? 0.85 : 1 }]}
      >
        <Icon name="calendar-outline" size={18} color={colors.muted} />
        <Text style={[styles.pickCtaText, { color: colors.muted }]}>اختر حلقة في هذا المسار</Text>
        <Icon name="chevron-back" size={14} color={colors.muted} />
      </Pressable>
    </StudentScreen>
  );
}

function Bullet() {
  return <View style={styles.bullet} />;
}

function LevelCard({ level: l, path, onBook }: { level: LevelRow; path: PathKey; onBook: (href: string) => void }) {
  const { colors, categories } = useTheme();
  const accent = categories[PATH_CATEGORY[path]];
  const [open, setOpen] = useState(false);
  const quran = QURAN_DETAILS[l.name];
  const tajweed = TAJWEED_LESSONS[l.name];
  const hasDetails = !!quran || !!tajweed;
  const aqeedahRequirement = l.aqeedahRequirement;
  const aqeedahRange = AQEEDAH_CLARIFICATIONS[l.name];
  const displayName = path === "tajweed" ? (TAJWEED_DISPLAY_NAMES[l.name] ?? l.name) : `مستوى ${l.name}`;
  const levelIcon: SectionIconName = LEVEL_ICON[l.name] ?? PATH_FALLBACK_ICON[path];

  const header = (
    <View style={styles.cardHeader}>
      <View style={[styles.levelIconBubble, { backgroundColor: `${palette.gold}1f` }]}>
        <SectionIcon name={levelIcon} size={28} />
      </View>
      <Text style={[styles.levelName, { color: colors.text }]}>{displayName}</Text>
      {l.isCurrent && !hasDetails ? <Badge label="مستواك" /> : null}
      <View style={[styles.arrowBubble, { backgroundColor: `${palette.gold}1f`, transform: hasDetails && open ? [{ rotate: "-90deg" }] : undefined }]}>
        <Icon name="chevron-back" size={15} color={colors.primary} />
      </View>
    </View>
  );

  if (!hasDetails) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onBook(`/student/booking?levelId=${l.id}&path=${path}`)}
        style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
      >
        <Card style={[styles.levelCard, { borderStartWidth: 3, borderStartColor: accent }]}>{header}</Card>
      </Pressable>
    );
  }

  return (
    <Card style={[styles.levelCard, { borderStartWidth: 3, borderStartColor: accent }]}>
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
        {header}
      </Pressable>
      {open && quran ? (
        <View style={[styles.details, { borderTopColor: `${colors.primary}1a` }]}>
          <Text style={[styles.detailTitle, { color: colors.primary }]}>شروط الالتحاق</Text>
          <View style={styles.detailRow}><Bullet /><Text style={[styles.detailText, { color: colors.text }]}>{quran.cond}</Text></View>
          <Text style={[styles.detailTitle, { color: colors.primary }]}>متطلبات الحلقة</Text>
          {quran.reqs.map((r) => (
            <View key={r} style={styles.detailRow}><Bullet /><Text style={[styles.detailText, { color: colors.text }]}>{r}</Text></View>
          ))}
          {aqeedahRequirement ? (
            <>
              <Text style={[styles.detailTitle, { color: colors.primary }]}>متطلب العقيدة الإلزامي</Text>
              <View style={styles.detailRow}>
                <Bullet />
                {l.aqeedahLevelId ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => onBook(`/student/sharia/aqeedah/${l.aqeedahLevelId}`)}
                    style={styles.aqeedahLink}
                  >
                    <Text style={[styles.detailText, styles.underlined, { color: colors.primary }]}>
                      {aqeedahRequirement}{aqeedahRange ? ` — ${aqeedahRange}` : ""}
                      {l.aqeedahStatus === "completed"
                        ? " — مكتمل ✓"
                        : " — لا يُكتمل هذا المستوى قبل إتمامه"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {aqeedahRequirement}{aqeedahRange ? ` — ${aqeedahRange}` : ""}
                    {l.aqeedahStatus === "completed"
                      ? " — مكتمل ✓"
                      : " — لا يُكتمل هذا المستوى قبل إتمامه"}
                  </Text>
                )}
              </View>
            </>
          ) : null}
          <Button
            label="دخول اختبار القبول"
            icon="videocam-outline"
            onPress={() => onBook(`/student/placement?levelId=${l.id}&path=${path}`)}
            style={styles.cta}
          />
        </View>
      ) : null}
      {open && tajweed ? (
        <View style={[styles.details, { borderTopColor: `${colors.primary}1a` }]}>
          <Text style={[styles.detailTitle, { color: colors.primary }]}>الدروس</Text>
          {tajweed.map((r) => (
            <View key={r} style={styles.detailRow}><Bullet /><Text style={[styles.detailText, { color: colors.text }]}>{r}</Text></View>
          ))}
          <Button
            label="اختر مقعداً — جدول الشيوخ"
            icon="calendar-outline"
            onPress={() => onBook(`/student/booking?levelId=${l.id}&path=${path}`)}
            style={styles.cta}
          />
        </View>
      ) : null}
    </Card>
  );
}

function ShariaView({ levels, onBook }: { levels: LevelRow[]; onBook: (l: LevelRow) => void }) {
  const { colors, categories } = useTheme();
  return (
    <View style={styles.list}>
      {SHARIA_SUBJECTS.map((subj) => {
        const subjLevels = levels.filter((l) => l.nameEn === subj.key);
        if (!subjLevels.length) return null;
        return (
          <Card key={subj.key} style={{ borderStartWidth: 3, borderStartColor: categories.sharia }}>
            <View style={styles.shariaHead}>
              <View style={[styles.levelIconBubble, { backgroundColor: `${palette.gold}1f` }]}>
                <SectionIcon name={subj.icon} size={28} />
              </View>
              <Text style={[styles.shariaTitle, { color: colors.primary }]}>{subj.name}</Text>
            </View>
            <View style={styles.shariaGrid}>
              {subjLevels.map((l, i) => (
                <Pressable
                  key={l.id}
                  accessibilityRole="button"
                  onPress={() => onBook(l)}
                  style={({ pressed }) => [styles.shariaLevel, { backgroundColor: `${colors.primary}0d`, borderColor: `${colors.primary}1f`, opacity: pressed ? 0.88 : 1 }]}
                >
                  <Text style={[styles.shariaLevelLabel, { color: l.isCurrent ? palette.goldDark : colors.muted }]}>
                    {l.isCurrent ? "مستواك الحالي" : `المستوى ${i + 1}`}
                  </Text>
                  <Text style={[styles.shariaLevelName, { color: colors.primary }]}>{l.name}</Text>
                  <Text style={[styles.shariaLevelDesc, { color: colors.muted }]}>{SHARIA_LEVEL_DESC[l.name] ?? ""}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.shariaFoot, { color: colors.muted }]}>الكتب والمتون يضعها المشرف لكل مستوى</Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  levelCard: { marginBottom: 0 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelIconBubble: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  levelName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", flex: 1 },
  arrowBubble: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  details: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 8 },
  detailTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right", marginTop: 6 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 22, textAlign: "right", flex: 1 },
  aqeedahLink: { flex: 1 },
  underlined: { textDecorationLine: "underline", textDecorationColor: palette.gold },
  bullet: { width: 8, height: 8, marginTop: 7, borderRadius: 2, backgroundColor: palette.gold, transform: [{ rotate: "45deg" }] },
  cta: { marginTop: 10 },
  pickCta: { marginTop: 8, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  pickCtaText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  shariaHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  shariaTitle: { fontFamily: "Amiri_700Bold", fontSize: 21 },
  shariaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  shariaLevel: { flexBasis: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 10, alignItems: "center" },
  shariaLevelLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10 },
  shariaLevelName: { fontFamily: "Amiri_700Bold", fontSize: 20, marginTop: 2 },
  shariaLevelDesc: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, marginTop: 2 },
  shariaFoot: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "center", marginTop: 12 },
});
