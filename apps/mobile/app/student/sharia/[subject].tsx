import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Card, EmptyState, ErrorState, LoadingState, StudentScreen } from "../_screen";
import SectionIcon, { type SectionIconName } from "../../../components/section-icon";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme, palette } from "../../../lib/theme";

const SUBJECT_ICONS: Record<string, SectionIconName> = {
  aqeedah: "shield",
  fiqh: "scale",
  seerah: "moon",
};

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  aqeedah: "توحيد الله وأركان الإيمان — مسار اختياري بخمسة مستويات: ثلاثة الأصول، القواعد الأربع، العقيدة الواسطية، كتاب التوحيد، كشف الشبهات",
  fiqh: "أحكام العبادات والمعاملات على قول جمهور أهل العلم — الكتاب المعتمد: الوجيز في الفقه",
  seerah: "السيرة النبوية المطهرة من المولد إلى الوفاة — كتابها المعتمد: الرحيق المختوم",
};

type Level = {
  id: string | number;
  name: string;
  status?: string;
  progressPercentage?: number;
  contentCount?: number;
};

type Subject = {
  key?: string;
  name?: string;
  description?: string | null;
  levels?: Level[];
};

function statusMeta(status: string | undefined) {
  if (status === "completed") return { label: "مكتمل", tone: "success" as const };
  if (status === "in_progress") return { label: "جارٍ", tone: "gold" as const };
  return { label: "متاح", tone: "gold" as const };
}

export default function Subject() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const subjects = trpc.sharia.subjects.useQuery(undefined, { enabled: !!token });
  const rows = (Array.isArray(subjects.data) ? subjects.data : []) as Subject[];
  const data = rows.find((row) => row.key === subject);

  if (subjects.isLoading) {
    return <StudentScreen title="الدروس الشرعية"><LoadingState /></StudentScreen>;
  }
  if (subjects.error) {
    return <StudentScreen title="الدروس الشرعية"><ErrorState onRetry={() => void subjects.refetch()} /></StudentScreen>;
  }
  if (!data) {
    return <StudentScreen title="الدروس الشرعية"><EmptyState title="المادة غير موجودة" description="تحقق من الرابط أو عد إلى صفحة الدروس." /></StudentScreen>;
  }

  const key = String(data.key ?? subject ?? "aqeedah");
  const levels = Array.isArray(data.levels) ? data.levels : [];
  const description = data.description ?? SUBJECT_DESCRIPTIONS[key] ?? "";
  const icon = SUBJECT_ICONS[key] ?? "shield";
  const progress = levels.length
    ? Math.round(levels.reduce((total, level) => total + Number(level.progressPercentage ?? 0), 0) / levels.length)
    : 0;

  return (
    <StudentScreen title={data.name ?? "المادة الشرعية"}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${palette.gold}1f` }]}>
          <SectionIcon name={icon} size={42} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>{data.name ?? "المادة الشرعية"}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
        <Text style={[styles.count, { color: colors.muted }]}>
          {levels.length} {levels.length === 1 ? "مستوى" : "مستويات"}
          {progress > 0 ? ` · ${progress}% مكتمل` : ""}
        </Text>
      </View>

      {!levels.length ? (
        <EmptyState title="لا مستويات بعد" description="ستضاف مستويات هذه المادة قريباً بإذن الله" />
      ) : (
        <View style={styles.levelList}>
          {levels.map((level) => (
            <LevelCard
              key={String(level.id)}
              level={level}
              icon={icon}
              onOpen={() => router.push(`/student/sharia/${key}/${level.id}` as never)}
            />
          ))}
        </View>
      )}
    </StudentScreen>
  );
}

function LevelCard({ level, icon, onOpen }: { level: Level; icon: SectionIconName; onOpen: () => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const status = statusMeta(level.status);

  return (
    <Card style={[styles.levelCard, open ? styles.levelCardOpen : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={level.name}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View style={styles.levelHeader}>
          <View style={[styles.levelIcon, { backgroundColor: `${palette.gold}1f` }]}>
            <SectionIcon name={icon} size={30} />
          </View>
          <View style={styles.levelCopy}>
            <View style={styles.levelTitleRow}>
              <Text style={[styles.levelName, { color: colors.text }]}>{level.name}</Text>
              <Badge label={status.label} tone={status.tone} />
            </View>
          </View>
          <Text style={[styles.levelArrow, { color: colors.primary }]}>{open ? "⌃" : "‹"}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={[styles.levelDetails, { borderTopColor: `${colors.primary}1a` }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onOpen}
            style={({ pressed }) => [styles.entryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
          >
            <Text style={[styles.entryText, { color: colors.primaryText }]}>فتح المستوى</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 4, paddingBottom: 18 },
  heroIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 24, textAlign: "center" },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "center", marginTop: 5 },
  count: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, marginTop: 8 },
  levelList: { gap: 12 },
  levelCard: { padding: 14 },
  levelCardOpen: { paddingBottom: 18 },
  levelHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  levelCopy: { flex: 1, minWidth: 0 },
  levelTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7, flexWrap: "wrap" },
  levelName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", flexShrink: 1 },
  levelArrow: { fontSize: 22, width: 28, textAlign: "center" },
  levelDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  entryButton: { borderRadius: 999, minHeight: 46, alignItems: "center", justifyContent: "center" },
  entryText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
});