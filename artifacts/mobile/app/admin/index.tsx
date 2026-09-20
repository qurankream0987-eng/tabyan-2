import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminFrame, adminRoutes } from "./_common";
import { ErrorState, FeatureTile, Card, Icon, LoadingState, SectionTitle } from "../../components/ui";
import { useTheme, palette } from "../../lib/theme";
import { trpc } from "../../lib/trpc";

// ── لوحة المشرف مطابقة للموقع (AdminHome.tsx):
//    «لوحة التحكم المركزية» → 4 مؤشرات KPI → «يحتاج تدخّلك الآن» (6 عناصر) → مسارات الإدارة — كل البيانات من admin.kpis
export default function AdminHome() {
  const router = useRouter();
  const { colors } = useTheme();
  const q = trpc.admin.kpis.useQuery();
  const admins = trpc.admin.activeAdmins.useQuery(undefined, { retry: false });
  if (q.isLoading) return <AdminFrame title="لوحة التحكم المركزية"><LoadingState /></AdminFrame>;
  if (q.error || !q.data) return <AdminFrame title="لوحة التحكم المركزية"><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const k = q.data as any;
  const u = k?.urgent ?? {};

  const kpiCards = [
    { v: k?.activeStudents, l: "طالب نشط", icon: "people-outline" },
    { v: k?.sessionsToday, l: "حصص اليوم", icon: "calendar-outline" },
    { v: k?.completedMonth, l: "حصص مكتملة هذا الشهر", icon: "checkmark-outline" },
    { v: k?.avgRating, l: "متوسط تقييم الطلاب", icon: "star-outline" },
  ];
  const urgentItems = [
    { label: "طلبات ترقية", count: u.pendingReviews, to: "/admin/promotions", icon: "trending-up-outline" },
    { label: "شهادات إجازة", count: u.pendingQiraat, to: "/admin/qiraat", icon: "ribbon-outline" },
    { label: "اختبارات تحديد المستوى", count: u.pendingPlacement, to: "/admin/students-review", icon: "videocam-outline" },
    { label: "قبول المعلمين", count: u.pendingKyc, to: "/admin/teachers-review", icon: "shield-checkmark-outline" },
    { label: "فتاوى بلا إسناد", count: u.pendingFatwas, to: "/admin/fatwas", icon: "chatbox-ellipses-outline" },
    { label: "فتاوى متأخرة +48 ساعة", count: u.lateFatwas48h, to: "/admin/fatwas", icon: "time-outline" },
  ];

  return (
    <AdminFrame title="لوحة التحكم المركزية">
      {/* مؤشرات KPI الأربعة */}
      <View style={styles.kpiGrid}>
        {kpiCards.map((s) => (
          <View key={s.l} style={styles.kpiWrap}>
            <Card style={styles.kpiCell}>
              <Icon name={s.icon} size={17} color={palette.goldDark} />
              <Text style={[styles.kpiValue, { color: colors.primary }]} numberOfLines={1}>{s.v ?? "—"}</Text>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>{s.l}</Text>
            </Card>
          </View>
        ))}
      </View>

      {/* يحتاج تدخّلك الآن */}
      <Card>
        <View style={styles.urgentHead}>
          <View style={[styles.urgentDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.urgentTitle, { color: colors.primary }]}>يحتاج تدخّلك الآن</Text>
        </View>
        <View style={styles.urgentGrid}>
          {urgentItems.map((it) => {
            const has = typeof it.count === "number" && it.count > 0;
            return (
              <Pressable
                key={it.label + it.to}
                accessibilityRole="button"
                onPress={() => router.push(it.to as never)}
                style={({ pressed }) => [
                  styles.urgentCell,
                  {
                    backgroundColor: has ? `${palette.gold}1f` : `${colors.primary}08`,
                    borderColor: has ? `${palette.gold}40` : "transparent",
                    opacity: pressed ? 0.85 : has ? 1 : 0.55,
                  },
                ]}
              >
                <Icon name={it.icon} size={15} color={has ? palette.goldDark : colors.muted} />
                <Text style={[styles.urgentLabel, { color: colors.text }]} numberOfLines={1}>{it.label}</Text>
                <Text style={[styles.urgentCount, { color: has ? palette.goldDark : colors.muted }]}>{typeof it.count === "number" ? it.count : "—"}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.activeTitle, { color: colors.primary }]}>المشرفون النشطون</Text>
        {admins.isLoading ? (
          <LoadingState label="جارٍ تحميل المشرفين النشطين…" />
        ) : admins.error ? (
          <View style={[styles.activeError, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}35` }]}>
            <Icon name="warning-outline" size={18} color={colors.danger} />
            <Text style={[styles.activeErrorText, { color: colors.danger }]}>تعذّر تحميل المشرفين النشطين</Text>
            <Text style={[styles.activeHint, { color: colors.muted }]}>حاول تحديث الصفحة مرة أخرى</Text>
          </View>
        ) : !admins.data?.length ? (
          <Text style={[styles.activeEmpty, { color: colors.muted }]}>لا جلسات إدارة نشطة</Text>
        ) : (
          <View style={styles.activeList}>
            {admins.data.map((admin) => (
              <View key={admin.id} style={[styles.activeRow, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
                <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                <View style={styles.activeCopy}>
                  <Text style={[styles.activeName, { color: colors.text }]} numberOfLines={1}>{admin.fullName}</Text>
                  <Text style={[styles.activePhone, { color: colors.muted }]} numberOfLines={1}>{admin.phone ?? "—"}</Text>
                </View>
                <Text style={[styles.activeSince, { color: colors.muted }]}>{hoursSince(admin.lastActivity)} س</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* مسارات الإدارة */}
      <SectionTitle title="مسارات الإدارة" />
      <View>{adminRoutes.map(([path, title, icon]) => <FeatureTile key={path} title={title} icon={icon} onPress={() => router.push(`/admin/${path}` as any)} />)}</View>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiWrap: { flexBasis: "48%", flexGrow: 1 },
  kpiCell: { alignItems: "flex-start", gap: 5, paddingVertical: 14 },
  kpiValue: { fontFamily: "Amiri_700Bold", fontSize: 23 },
  kpiLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right" },
  urgentHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  urgentDot: { width: 8, height: 8, borderRadius: 4 },
  urgentTitle: { fontFamily: "Amiri_700Bold", fontSize: 19 },
  urgentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  urgentCell: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, padding: 11, minHeight: 52 },
  urgentLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11.5, flex: 1, textAlign: "right" },
  urgentCount: { fontFamily: "Amiri_700Bold", fontSize: 17 },
  activeTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 12 },
  activeList: { gap: 8 },
  activeRow: { minHeight: 58, borderRadius: 16, borderWidth: 1, padding: 11, flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  activeCopy: { flex: 1, alignItems: "flex-end", minWidth: 0 },
  activeName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  activePhone: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  activeSince: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right" },
  activeEmpty: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right" },
  activeError: { borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "center", gap: 5 },
  activeErrorText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "center" },
  activeHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "center" },
});

function hoursSince(value: string | Date | null | undefined) {
  const timestamp = new Date(value ?? 0).getTime();
  return Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
}
