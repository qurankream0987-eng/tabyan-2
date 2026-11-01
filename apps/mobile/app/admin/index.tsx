import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminFrame, adminRoutes } from "../../components/admin/admin-common";
import { ErrorState, FeatureTile, Card, Icon, LoadingState, PageHero, SectionTitle } from "../../components/ui";
import { useTheme, palette } from "../../lib/theme";
import { trpc } from "../../lib/trpc";
import { ListSkeleton } from "../../components/admin/admin-ui";

// ── لوحة المشرف مطابقة للموقع (AdminHome.tsx):
//    «لوحة التحكم المركزية» → 4 مؤشرات KPI → «يحتاج تدخّلك الآن» (6 عناصر) → مسارات الإدارة — كل البيانات من admin.kpis
export default function AdminHome() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const q = trpc.admin.kpis.useQuery(undefined, { refetchInterval: 30_000 });
  const admins = trpc.admin.activeAdmins.useQuery(undefined, { retry: false });
  if (q.isLoading) return <AdminFrame title="لوحة التحكم المركزية"><ListSkeleton rows={4} /></AdminFrame>;
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

  // COUNT(*) may arrive as a string; each queue is a distinct status, so the total is their sum.
  const counted = urgentItems.map((it) => ({ ...it, count: Number(it.count) || 0 }));
  // Pending queues first (most urgent on top), cleared ones after with a green dot.
  const queue = [...counted].sort((a, b) => b.count - a.count);
  const hasPending = queue.some((it) => it.count > 0);
  const totalPending = counted.reduce((sum, it) => sum + it.count, 0);
  const accent = isDark ? palette.gold : palette.burgundy;
  const shortcuts = [
    { label: "إضافة كتاب", to: "/admin/library", icon: "library-outline" },
    { label: "إنشاء جدول", to: "/admin/schedules", icon: "calendar-outline" },
    { label: "إضافة حساب", to: "/admin/accounts", icon: "person-add-outline" },
    { label: "إرسال إشعار", to: "/admin/notifications", icon: "notifications-outline" },
    { label: "مراقبة الجلسات", to: "/admin/sessions-monitoring", icon: "videocam-outline" },
  ];

  return (
    <AdminFrame title="لوحة التحكم المركزية">
      {/* رأس الصفحة: درع في فقاعة + تحية + ملخص المهام المعلّقة */}
      <PageHero icon="shield-outline" title="لوحة التحكم المركزية" subtitle={totalPending > 0 ? `${totalPending} مهمة بانتظار مراجعتك` : "لا مهام معلّقة الآن"} />

      {/* يحتاج تدخّلك الآن — شبكة من عمودين، الأكثر إلحاحاً أولاً */}
      <Card>
        <View style={styles.urgentHead}>
          <View style={[styles.urgentDot, { backgroundColor: hasPending ? colors.danger : colors.success }]} />
          <Text style={[styles.urgentTitle, { color: accent }]}>يحتاج تدخّلك الآن</Text>
        </View>
        {!hasPending ? <Text style={[styles.activeEmpty, { color: colors.muted }]}>أنجزت كل المراجعات المعلّقة.</Text> : null}
        <View style={styles.urgentGrid}>
          {queue.map((it) => {
            const pending = it.count > 0;
            return (
              <Pressable key={it.label} accessibilityRole="button" accessibilityLabel={`${it.label}: ${it.count}`} onPress={() => router.push(it.to as never)}
                style={({ pressed }) => [styles.urgentTile, pending
                  ? { backgroundColor: `${palette.gold}${isDark ? "29" : "1F"}`, borderColor: `${palette.gold}40` }
                  : { backgroundColor: colors.input, borderColor: colors.border, opacity: 0.8 }, pressed && { opacity: 0.85 }]}>
                <View style={styles.urgentTileHead}>
                  <Icon name={it.icon} size={18} color={pending ? accent : colors.muted} />
                  <View style={[styles.tileDot, { backgroundColor: pending ? colors.danger : colors.success }]} />
                </View>
                <Text style={[styles.urgentCount, { color: pending ? accent : colors.muted }]}>{it.count}</Text>
                <Text style={[styles.urgentLabel, { color: pending ? colors.text : colors.muted }]} numberOfLines={2}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* مؤشرات KPI (قيم حقيقية من admin.kpis) — بطاقات زجاجية كما في الموقع */}
      <View style={styles.kpiGrid}>
        {kpiCards.map((s) => (
          <View key={s.l} style={styles.kpiWrap}>
            <Card style={styles.kpiCell}>
              <Icon name={s.icon} size={22} color={palette.gold} />
              <Text style={[styles.kpiValue, { color: accent }]} numberOfLines={1}>{s.v ?? "—"}</Text>
              <Text style={[styles.kpiLabel, { color: colors.muted }]} numberOfLines={2}>{s.l}</Text>
            </Card>
          </View>
        ))}
      </View>

      <SectionTitle title="إجراءات سريعة" />
      <View style={styles.shortcuts}>
        {shortcuts.map((it) => (
          <Pressable key={it.to} accessibilityRole="button" onPress={() => router.push(it.to as never)}
            style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.card, borderColor: isDark ? `${palette.gold}26` : `${palette.burgundy}1A`, opacity: pressed ? 0.85 : 1 }]}>
            <Icon name={it.icon} size={18} color={accent} />
            <Text style={[styles.shortcutText, { color: accent }]} numberOfLines={1}>{it.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={[styles.activeTitle, { color: accent }]}>المشرفون النشطون</Text>
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
                <Text style={[styles.activeSince, { color: colors.muted }]}>منذ {hoursSince(admin.lastActivity)} س</Text>
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
  kpiGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  kpiWrap: { flexBasis: "47%", flexGrow: 1, minWidth: 0 },
  kpiCell: { alignItems: "flex-end", gap: 4, paddingVertical: 16, marginBottom: 0, minHeight: 112 },
  kpiValue: { fontFamily: "Amiri_700Bold", fontSize: 26, lineHeight: 38, marginTop: 2 },
  kpiLabel: { alignSelf: "stretch", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right" },
  urgentHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 12 },
  urgentDot: { width: 8, height: 8, borderRadius: 4 },
  urgentTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 30 },
  urgentGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  urgentTile: { flexBasis: "47%", flexGrow: 1, minWidth: 0, minHeight: 96, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "flex-end", gap: 2 },
  urgentTileHead: { alignSelf: "stretch", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  tileDot: { width: 8, height: 8, borderRadius: 4 },
  urgentLabel: { alignSelf: "stretch", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18, textAlign: "right" },
  urgentCount: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 34 },
  shortcuts: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  shortcut: { flexBasis: "47%", flexGrow: 1, minHeight: 52, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12 },
  shortcutText: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
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
