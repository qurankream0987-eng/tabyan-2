import { StyleSheet, Text } from "react-native";
import { Badge, Card, EmptyState, ErrorState, LoadingState, SectionTitle, StudentScreen } from "./_screen";
import { Button } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";

export default function Tilawah() {
  const { token, role } = useAuth();
  const { colors } = useTheme();
  const eligibility = trpc.student.recitationEligibility.useQuery(undefined, { enabled: !!token });
  const status = trpc.recitation.status.useQuery();

  const eligible = (eligibility.data as { eligible?: boolean } | undefined)?.eligible === true;
  const realtimeEnabled = status.data?.liveTrackingEnabled === true;

  if (eligibility.isLoading || status.isLoading) return <StudentScreen title="التلاوة"><LoadingState /></StudentScreen>;
  if (eligibility.error) return <StudentScreen title="التلاوة"><ErrorState onRetry={() => void eligibility.refetch()} /></StudentScreen>;
  if (status.error) return <StudentScreen title="التلاوة"><ErrorState onRetry={() => void status.refetch()} /></StudentScreen>;
  if (role !== "student" || !eligible) {
    return <StudentScreen title="التلاوة" subtitle="تصحيح القراءة"><SectionTitle title="الأهلية" /><Badge label="تحتاج إلى إكمال اختبار القبول" tone="muted" /><EmptyState title="التسميع غير متاح بعد" description="أكمل اختبار القبول أولاً، ثم ستظهر لك جلسة التسميع الحي." icon="musical-notes-outline" /></StudentScreen>;
  }

  return (
    <StudentScreen title="التلاوة" subtitle="تصحيح القراءة">
      <SectionTitle title="تصحيح القراءة" />
      <Badge label={realtimeEnabled ? "الخدمة متاحة عند اكتمال متطلبات النسخة" : "التصحيح الحي غير مفعّل في الخادم حالياً"} tone="muted" />
      <Card>
        <Text style={[styles.text, { color: colors.text }]}>التصحيح الحي يحتاج أصول المصحف المرافقة للصفحات. هذه الأصول مستثناة عمدًا من النسخة الحالية، لذلك لا يمكن بدء جلسة حية هنا.</Text>
        <Text style={[styles.secondaryText, { color: colors.muted }]}>لن يتم طلب إذن الميكروفون أو فتح اتصال تسميع قبل توفر الأصول في إصدار مخصص لهذه الميزة.</Text>
        <Button label="بدء التسميع الحي" disabled variant="secondary" style={styles.button} />
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 24 },
  secondaryText: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 22, marginTop: 12 },
  button: { marginTop: 18 },
});