import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Icon } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { TeacherScreen, OfflineNotice } from "../../components/teacher/teacher-screen";
import { assignmentRange } from "../../components/teacher/recitation-assignments";
import { formatDateTime } from "../../lib/format";
import { useTheme, palette } from "../../lib/theme";

// ── لوحة المعلم مطابقة للموقع (TeacherHome.tsx):
//    ترحيب → 4 مؤشرات → حصتك القادمة → ملخص الأسبوع → إجراءان سريعان — كل البيانات من teacher.dashboard
export default function TeacherHome() {
  const { token, name } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const q = trpc.teacher.dashboard.useQuery(undefined, { enabled: !!token });
  const reviewQueue = trpc.recitationAssignments.reviewQueue.useQuery(undefined, { enabled: !!token });
  // Students submit while this screen is in the background; reload the queue whenever it is shown again.
  const refetchQueue = reviewQueue.refetch;
  useFocusEffect(useCallback(() => { if (token) void refetchQueue(); }, [token, refetchQueue]));
  const d = (q.data ?? {}) as any;
  const summary = d.summary ?? {};
  const isMufti = d.teacher?.isMufti === true;

  const stats = [
    { v: d.weekCount, l: "حصص الأسبوع", icon: "calendar-outline" },
    { v: d.studentsCount, l: "طلابي", icon: "person-outline" },
    { v: summary.pendingEvaluations, l: "تقييمات", icon: "school-outline" },
    { v: summary.avgRating, l: "تقييمي", icon: "star-outline" },
  ];

  return (
    <TeacherScreen title="لوحة المعلم" home loading={q.isLoading} error={!!q.error && !q.data} retry={() => void q.refetch()}>
      {q.isError ? <OfflineNotice /> : null}

      {/* ترحيب + مؤشرات */}
      <Card accent style={styles.hero}>
        <Image source={isDark ? require("../../assets/images/logo-dark.png") : require("../../assets/images/logo-light.png")} resizeMode="contain" style={styles.heroLogo} accessibilityLabel="تبيان" />
        <Text style={[styles.heroTitle, { color: colors.text }]}>مرحباً {name ?? "أيها المعلم"}</Text>
        <Text style={[styles.heroSub, { color: colors.muted }]}>«خيركم من تعلّم القرآن وعلّمه»</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.l} style={[styles.statCell, { backgroundColor: `${colors.primary}0f`, borderColor: `${colors.primary}14` }]}>
              <Icon name={s.icon} size={15} color={palette.goldDark} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{s.v ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* حصتك القادمة */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>حصتك القادمة</Text>
      {!d.nextSession ? (
        <EmptyState title="لا حصص قادمة" description="سيظهر هنا أقرب موعد" />
      ) : (
        <Card style={{ borderColor: `${palette.gold}40`, borderWidth: 2 }}>
          <View style={styles.nextRow}>
            <View style={[styles.nextIcon, { backgroundColor: `${colors.primary}14` }]}>
              <Icon name="school-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.nextTitle, { color: colors.text }]}>{d.nextSession.typeLabel}{d.nextSession.topic ? ` — ${d.nextSession.topic}` : ""}</Text>
              <Text style={[styles.nextMeta, { color: colors.muted }]}>الطالب: {d.nextSession.studentName} · {formatDateTime(d.nextSession.scheduledAt)}</Text>
            </View>
            <CountdownChip deadline={d.nextSession.scheduledAt} colors={colors} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/teacher/session/${d.nextSession.id}` as never)}
            style={({ pressed }) => [styles.enterBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Text style={[styles.enterBtnText, { color: colors.primaryText }]}>دخول غرفة الحصة</Text>
          </Pressable>
        </Card>
      )}

      {/* واجبات تسميع سلّمها الطلاب وتنتظر تقييم المعلم (web ReviewQueueSection) */}
      {reviewQueue.data ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>تسميعات بانتظار المراجعة</Text>
          {reviewQueue.data.length === 0 ? (
            <Card><Text style={[styles.emptyText, { color: colors.muted }]}>لا تسميعات بانتظار مراجعتك</Text></Card>
          ) : reviewQueue.data.map(({ assignment, studentName }) => (
            <Pressable
              key={assignment.id}
              accessibilityRole="button"
              onPress={() => router.push(`/teacher/students/${assignment.studentId}` as never)}
              style={({ pressed }) => [styles.reviewRow, { backgroundColor: `${colors.primary}0c`, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.reviewIcon, { backgroundColor: `${colors.primary}14` }]}><Icon name="mic-outline" size={18} color={colors.primary} /></View>
              <View style={styles.reviewText}>
                <Text style={[styles.reviewTitle, { color: colors.text }]} numberOfLines={1}>{studentName}</Text>
                <Text style={[styles.reviewDetail, { color: colors.muted }]} numberOfLines={1}>{assignmentRange(assignment)}{assignment.submittedAt ? ` · ${formatDateTime(assignment.submittedAt)}` : ""}</Text>
              </View>
              <Icon name="chevron-back" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </>
      ) : null}

      {/* ملخص الأسبوع */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 12 }]}>ملخص الأسبوع</Text>
        <View style={styles.weekGrid}>
          {[
            { v: summary.completedThisWeek, l: "حصة مكتملة", icon: "checkmark-outline" },
            { v: summary.teachingHours, l: "ساعات التدريس", icon: "calendar-outline" },
            { v: d.recordingsThisMonth, l: "تسجيل الشهر", icon: "bookmark-outline" },
          ].map((s) => (
            <View key={s.l} style={[styles.weekCell, { backgroundColor: `${colors.primary}0d`, borderColor: `${colors.primary}14` }]}>
              <Icon name={s.icon} size={16} color={palette.goldDark} />
              <Text style={[styles.weekValue, { color: colors.primary }]}>{s.v ?? 0}</Text>
              <Text style={[styles.weekLabel, { color: colors.muted }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* إجراءان سريعان */}
      <View style={styles.quickGrid}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/teacher/evaluations" as never)} style={({ pressed }) => [styles.quickCellWrap, { opacity: pressed ? 0.88 : 1 }]}>
          <Card style={styles.quickCell}>
            <Icon name="school-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickTitle, { color: colors.text }]}>تقييمات معلقة</Text>
            <Text style={[styles.quickSub, { color: colors.muted }]}>{summary.pendingEvaluations ?? 0} بانتظارك</Text>
          </Card>
        </Pressable>
        <Pressable
          accessibilityRole="button"
           onPress={() => router.push((isMufti && d.pendingFatwas != null ? "/teacher/fatwas" : "/teacher/schedule") as never)}
          style={({ pressed }) => [styles.quickCellWrap, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Card style={styles.quickCell}>
             <Icon name={isMufti && d.pendingFatwas != null ? "chatbox-ellipses-outline" : "calendar-outline"} size={22} color={colors.primary} />
             <Text style={[styles.quickTitle, { color: colors.text }]}>{isMufti && d.pendingFatwas != null ? "صندوق الفتاوى" : "جدولي"}</Text>
             <Text style={[styles.quickSub, { color: colors.muted }]}>{isMufti && d.pendingFatwas != null ? `${d.pendingFatwas} سؤال معلق` : "مواعيدي وطلبات التغيير"}</Text>
          </Card>
        </Pressable>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  reviewRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderRadius: 16, padding: 12, marginBottom: 8 },
  reviewIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  reviewText: { flex: 1, minWidth: 0 },
  reviewTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  reviewDetail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right" },
  hero: { alignItems: "center", paddingVertical: 20 },
  heroLogo: { width: 96, height: 48, marginBottom: 10 },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 23 },
  heroSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11.5, marginTop: 3 },
  statsGrid: { flexDirection: "row", gap: 7, marginTop: 16, alignSelf: "stretch" },
  statCell: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, alignItems: "center", gap: 3 },
  statValue: { fontFamily: "Amiri_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 9.5, textAlign: "center" },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginTop: 6, marginBottom: 2 },
  emptyText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, textAlign: "center", lineHeight: 21 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  nextIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  nextTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, textAlign: "right" },
  nextMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 3 },
  enterBtn: { borderRadius: 999, paddingVertical: 11, alignItems: "center", marginTop: 14 },
  enterBtnText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, color: palette.gold },
  weekGrid: { flexDirection: "row", gap: 7 },
  weekCell: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 13, alignItems: "center", gap: 4 },
  weekValue: { fontFamily: "Amiri_700Bold", fontSize: 20 },
  weekLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 15, alignSelf: "stretch", textAlign: "center" },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickCellWrap: { flex: 1 },
  quickCell: { alignItems: "center", gap: 6, paddingVertical: 16 },
  quickTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "center" },
  quickSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, lineHeight: 15, alignSelf: "stretch", textAlign: "center" },
  countdown: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden" },
});

function CountdownChip({ deadline, colors }: { deadline: string | Date; colors: ReturnType<typeof useTheme>["colors"] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const ms = new Date(deadline).getTime() - now;
  const over = ms <= 0;
  const absolute = Math.abs(ms);
  const hours = Math.floor(absolute / 3600000);
  const minutes = Math.floor((absolute % 3600000) / 60000);
  const seconds = Math.floor((absolute % 60000) / 1000);
  const color = over ? colors.danger : hours < 6 ? colors.primary : colors.success;
  return <Text style={[styles.countdown, { color, backgroundColor: `${color}22` }]}>{over ? "تجاوز " : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</Text>;
}
