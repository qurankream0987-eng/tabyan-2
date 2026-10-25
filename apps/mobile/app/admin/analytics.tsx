import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminFrame } from "./_common";
import { Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";

export default function Analytics() {
  const q = trpc.admin.analyticsOverview.useQuery(undefined, { retry: 1 });
  const { colors } = useTheme();
  if (q.isLoading) return <AdminFrame title="التحليلات"><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title="التحليلات"><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const d = (q.data ?? {}) as any;
  const funnel = d.funnel ?? {}, content = d.content ?? {};
  const levels = Array.isArray(d.levelCounts) ? d.levelCounts : [];
  const heatmap = Array.isArray(d.heatmap) ? d.heatmap : [];
  const teachers = Array.isArray(d.teacherStats) ? d.teacherStats : [];
  const stats = [
    { label: "إجمالي المستخدمين", value: funnel.totalUsers },
    { label: "طلاب", value: funnel.totalStudents },
    { label: "رفعوا اختبار المستوى", value: funnel.placementSubmitted },
    { label: "اعتُمد مستواهم", value: funnel.placementApproved },
  ];
  const contentStats = [
    ["كتاب في المكتبة", content.booksCount],
    ["تسجيل حصة", content.recordingsCount],
    ["فتوى منشورة", content.fatwasPublished],
    ["إشارة مرجعية", content.bookmarksCount],
  ];
  const maxLevel = Math.max(1, ...levels.map((l: any) => Number(l.c) || 0));
  const heatMax = Math.max(1, ...heatmap.map((h: any) => Number(h.c) || 0));
  const heatValue = (weekday: number, hour: number) => {
    const cell = heatmap.find((h: any) => Number(h.weekday) === weekday && Number(h.hour) === hour);
    return Number(cell?.c) || 0;
  };
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return <AdminFrame title="التحليلات"><Card accent><Text style={[styles.heading, { color: colors.text }]}>نظرة عامة</Text><Text style={[styles.small, { color: colors.muted }]}>مؤشرات استخدام المنصة ومحتواها.</Text></Card>
    <Text style={[styles.section, { color: colors.text }]}>قمع الانضمام</Text><View style={styles.grid}>{stats.map((s) => <Card key={s.label} style={styles.stat}><Text style={[styles.number, { color: colors.primary }]}>{String(s.value ?? 0)}</Text><Text style={[styles.small, { color: colors.muted }]}>{s.label}</Text></Card>)}</View>
     <Text style={[styles.section, { color: colors.text }]}>توزيع الطلاب على المستويات</Text>{levels.length ? <Card>{levels.map((l: any) => { const count = Number(l.c) || 0; return <View key={String(l.levelId ?? "none")} style={styles.barRow}><View style={styles.barLabels}><Text style={[styles.small, { color: colors.text }]}>{String(l.levelName ?? "بدون مستوى")}</Text><Text style={[styles.value, { color: colors.primary }]}>{String(l.c ?? 0)}</Text></View><View style={[styles.track, { backgroundColor: colors.input }]}><View style={[styles.fill, { width: `${(count / maxLevel) * 100}%`, backgroundColor: colors.primary }]} /></View></View>; })}</Card> : <EmptyState title="لا توجد بيانات للمستويات" icon="layers-outline" />}
     <Text style={[styles.section, { color: colors.text }]}>المحتوى</Text><View style={styles.grid}>{contentStats.map(([label, value]) => <Card key={String(label)} style={styles.stat}><Text style={[styles.number, { color: colors.primary }]}>{String(value ?? 0)}</Text><Text style={[styles.small, { color: colors.muted }]}>{String(label)}</Text></Card>)}</View>
     <Text style={[styles.section, { color: colors.text }]}>خريطة الحصص (يوم × ساعة)</Text>{heatmap.length ? <Card><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.heatmap}><View style={styles.heatRow}><View style={styles.dayLabel} />{Array.from({ length: 12 }, (_, i) => <Text key={i} style={[styles.hour, { color: colors.muted }]}>{i + 8}:00</Text>)}</View>{days.map((day, dayIndex) => <View key={day} style={styles.heatRow}><Text style={[styles.dayLabel, { color: colors.text }]}>{day}</Text>{Array.from({ length: 12 }, (_, i) => { const count = heatValue(dayIndex + 1, i + 8); return <View key={i} style={[styles.cell, { backgroundColor: count ? colors.primary : colors.input, opacity: count ? 0.25 + (count / heatMax) * 0.75 : 1 }]}><Text style={[styles.cellText, { color: colors.text }]}>{count || ""}</Text></View>; })}</View>)}</View></ScrollView><Text style={[styles.heatHint, { color: colors.muted }]}>الأوقات من ٨ صباحاً إلى ٧ مساءً</Text></Card> : <EmptyState title="لا توجد بيانات للحصص" icon="calendar-outline" />}
     <Text style={[styles.section, { color: colors.text }]}>أداء المعلمين</Text>{teachers.length ? <Card>{teachers.map((t: any) => { const total = Number(t.total) || 0; const completed = Number(t.completed) || 0; return <View key={String(t.teacherId)} style={styles.teacher}><View style={styles.teacherLabels}><Text style={[styles.small, { color: colors.text }]}>{String(t.fullName ?? "معلم")}</Text><Text style={[styles.small, { color: colors.muted }]}>{String(t.completed ?? 0)} / {String(t.total ?? 0)} مكتملة</Text></View><View style={[styles.track, { backgroundColor: colors.input }]}><View style={[styles.fill, { width: `${total ? Math.min(100, (completed / total) * 100) : 0}%`, backgroundColor: colors.success }]} /></View></View>; })}</Card> : <EmptyState title="لا توجد بيانات للمعلمين" icon="people-outline" />}
  </AdminFrame>;
}
const styles = StyleSheet.create({ heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, textAlign: "right" }, section: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 17, textAlign: "right", marginTop: 12, marginBottom: 8 }, small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 20 }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, stat: { width: "48%", alignItems: "center", padding: 12 }, number: { fontFamily: "Amiri_700Bold", fontSize: 27 }, value: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15 }, barRow: { marginBottom: 11 }, barLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }, track: { height: 8, borderRadius: 8, overflow: "hidden" }, fill: { height: 8, borderRadius: 8 }, teacher: { marginBottom: 12 }, teacherLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }, heatmap: { minWidth: 560, gap: 3 }, heatRow: { flexDirection: "row", alignItems: "center", gap: 3 }, dayLabel: { width: 62, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right" }, hour: { width: 35, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "center" }, cell: { width: 35, height: 26, borderRadius: 5, alignItems: "center", justifyContent: "center" }, cellText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10 }, heatHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 8 } });