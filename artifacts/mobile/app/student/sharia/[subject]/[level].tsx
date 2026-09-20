import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar } from "../../../../components/ui";
import { StudentScreen } from "../../_screen";
import SectionIcon from "../../../../components/section-icon";
import { trpc } from "../../../../lib/trpc";
import { useAuth } from "../../../../lib/auth";
import { useTheme, palette } from "../../../../lib/theme";

type ContentRow = {
  id: string;
  title: string;
  contentType: "pdf" | "text" | "audio" | "video" | "link" | string;
  durationMinutes: number | null;
  pageCount?: number | null;
  status: "available" | "in_progress" | "completed" | string;
  progressPercentage: number;
};

const CONTENT_META: Record<string, { label: string; icon: string }> = {
  pdf: { label: "ملف PDF", icon: "document-text-outline" },
  text: { label: "نص مقروء", icon: "book-outline" },
  audio: { label: "صوتيات", icon: "headset-outline" },
  video: { label: "مرئيات", icon: "videocam-outline" },
  link: { label: "رابط خارجي", icon: "link-outline" },
};

function statusMeta(status: string) {
  if (status === "completed") return { label: "مكتمل", tone: "success" as const };
  if (status === "in_progress") return { label: "جارٍ", tone: "gold" as const };
  return { label: "متاح", tone: "gold" as const };
}

export default function Level() {
  const { subject, level } = useLocalSearchParams<{ subject?: string; level?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const levelId = Number(level);
  const query = trpc.sharia.levelContent.useQuery({ levelId }, { enabled: !!token && Number.isInteger(levelId) && levelId > 0 });
  const data = query.data as { level: { id: number; name: string; subject: string; subjectName: string; description?: string | null; order: number }; content: ContentRow[] } | null | undefined;
  const rows = data?.content ?? [];
  const progress = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.progressPercentage ?? 0), 0) / rows.length) : 0;

  if (!Number.isInteger(levelId) || levelId <= 0) return <StudentScreen title="المستوى الشرعي"><EmptyState title="المستوى غير صالح" description="تحقق من الرابط ثم حاول مرة أخرى." /></StudentScreen>;
  if (query.isLoading) return <StudentScreen title="المستوى الشرعي"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="المستوى الشرعي"><ErrorState onRetry={() => void query.refetch()} /></StudentScreen>;
  if (!data) return <StudentScreen title="المستوى الشرعي"><EmptyState title="المستوى غير موجود" description="لم نتمكن من العثور على هذا المستوى." /></StudentScreen>;

  return (
    <StudentScreen title={`${data.level.subjectName} — ${data.level.name}`}>
      <Card style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: `${palette.gold}1f` }]}>
          <SectionIcon name={subject === "fiqh" ? "scale" : subject === "seerah" ? "moon" : "shield"} size={32} />
        </View>
        <Text style={[styles.title, { color: colors.primary }]}>{data.level.name}</Text>
        <Text style={[styles.subject, { color: colors.muted }]}>{data.level.subjectName}</Text>
        <Text style={[styles.progressText, { color: colors.text }]}>{progress}% مكتمل</Text>
        <ProgressBar value={progress} label={`${progress}%`} />
        <View style={styles.actions}>
          <Button label="اختبار المستوى" icon="create-outline" onPress={() => router.push(`/student/sharia/${subject}/exam?levelId=${data.level.id}` as never)} />
          <Button label="الشهادة" icon="ribbon-outline" variant="secondary" onPress={() => router.push(`/student/sharia/${subject}/certificate?levelId=${data.level.id}` as never)} />
        </View>
      </Card>

      {rows.length ? rows.map((item) => {
        const meta = CONTENT_META[item.contentType] ?? { label: item.contentType, icon: "book-outline" };
        const status = statusMeta(item.status);
        return (
          <Pressable key={item.id} onPress={() => router.push(`/student/sharia/${subject}/content?contentId=${encodeURIComponent(item.id)}&levelId=${data.level.id}` as never)}>
            <Card style={styles.contentCard}>
              <View style={[styles.contentIcon, { backgroundColor: colors.input }]}><Text style={{ color: colors.primary }}>•</Text></View>
              <View style={styles.contentBody}>
                <Text style={[styles.contentTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {meta.label}{item.durationMinutes ? ` · ${item.durationMinutes} دقيقة` : ""}
                </Text>
                {item.status === "in_progress" ? <ProgressBar value={item.progressPercentage} /> : null}
              </View>
              <Badge label={status.label} tone={status.tone} />
            </Card>
          </Pressable>
        );
      }) : <EmptyState title="لا توجد دروس منشورة" description="ستظهر دروس هذا المستوى عند نشرها من الإدارة." icon="book-outline" />}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", marginBottom: 12 },
  icon: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Amiri_700Bold", fontSize: 23, textAlign: "center", marginTop: 8 },
  subject: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "center", marginTop: 2 },
  progressText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", alignSelf: "stretch", marginTop: 14 },
  actions: { flexDirection: "row-reverse", gap: 8, width: "100%", marginTop: 14 },
  contentCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 10 },
  contentIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  contentBody: { flex: 1, alignItems: "flex-end" },
  contentTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 3 },
});