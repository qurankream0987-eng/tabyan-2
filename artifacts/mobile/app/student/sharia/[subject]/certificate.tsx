import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, ErrorState, LoadingState, Badge } from "../../../../components/ui";
import { StudentScreen } from "../../_screen";
import { useAuth } from "../../../../lib/auth";
import { trpc } from "../../../../lib/trpc";
import { useTheme, palette } from "../../../../lib/theme";

export default function Certificate() {
  const { levelId } = useLocalSearchParams<{ levelId?: string }>();
  const { token } = useAuth();
  const { colors } = useTheme();
  const id = Number(levelId);
  const query = trpc.sharia.certificate.useQuery({ levelId: id }, { enabled: !!token && Number.isInteger(id) && id > 0, retry: false });
  if (!Number.isInteger(id) || id <= 0) return <StudentScreen title="الشهادة"><EmptyState title="المستوى غير صالح" /></StudentScreen>;
  if (query.isLoading) return <StudentScreen title="الشهادة"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="الشهادة"><ErrorState onRetry={() => void query.refetch()} /></StudentScreen>;
  const data = query.data as { certificate: { grade: string; issuedAt: string | Date; certificateNumber: string }; level: { name: string }; subject: { name: string } } | null | undefined;
  if (!data) return <StudentScreen title="الشهادة"><EmptyState title="الشهادة غير متاحة بعد" description="أكمل الاختبار بنجاح أولاً، ثم ستظهر شهادتك هنا." icon="ribbon-outline" /></StudentScreen>;
  return (
    <StudentScreen title="شهادة الإتمام">
      <Card style={styles.card}>
        <View style={[styles.icon, { backgroundColor: `${palette.gold}26` }]}><Text style={{ color: palette.goldDark, fontSize: 34 }}>◆</Text></View>
        <Text style={[styles.heading, { color: colors.primary }]}>شهادة إتمام المستوى</Text>
        <Text style={[styles.level, { color: colors.text }]}>{data.subject.name} — {data.level.name}</Text>
        <Badge label={data.certificate.grade} tone="gold" />
        <Text style={[styles.meta, { color: colors.muted }]}>رقم الشهادة: {data.certificate.certificateNumber}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>تاريخ الإصدار: {new Date(data.certificate.issuedAt).toLocaleDateString("ar-SA-u-nu-latn")}</Text>
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 28 },
  icon: { width: 76, height: 76, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 24, textAlign: "center", marginTop: 12 },
  level: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "center", marginTop: 8 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 10 },
});