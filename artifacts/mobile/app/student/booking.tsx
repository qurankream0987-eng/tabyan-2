import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { StudentScreen, LoadingState, ErrorState, EmptyState, Card } from "./_screen";
import { Button, Icon } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

// ── مطابق لصفحة الحجز في الموقع (Booking.tsx): مواعيد أسبوعية ثابتة مجمعة حسب اليوم ──
const DAY_ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const JS_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_AR: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
};

const PATH_SESSION_TYPES: Record<string, string[]> = {
  quran: ["quran_hifz", "quran_review"],
  qiraat: ["qiraat"],
  tajweed: ["tajweed_level"],
  tajweed_correction: ["tajweed_correction"],
  sharia: ["sharia_fiqh", "sharia_aqeedah", "sharia_seerah"],
};
const PATH_LABELS: Record<string, string> = {
  quran: "القرآن الكريم",
  qiraat: "القراءات",
  tajweed: "دروس التجويد",
  tajweed_correction: "تصحيح التلاوة",
  sharia: "الدروس الشرعية",
};

// تسميات أنواع الحلقات مطابقة للخادم (SESSION_TYPE_LABELS في student router) — تُشتق محليًا لأن الاستجابة لا تتضمن typeLabel
const SESSION_TYPE_LABELS: Record<string, string> = {
  quran_hifz: "حفظ قرآن", quran_review: "مراجعة قرآن", qiraat: "قراءات",
  tajweed_correction: "تصحيح تلاوة", tajweed_level: "تجويد",
  sharia_fiqh: "فقه", sharia_aqeedah: "عقيدة", sharia_seerah: "سيرة",
};
const typeLabelOf = (sc: { sessionType: string; typeLabel?: string }) => sc.typeLabel ?? SESSION_TYPE_LABELS[sc.sessionType] ?? sc.sessionType;

type Schedule = { id: string; sessionType: string; typeLabel?: string; sessionMode: string; maxStudents: number; availableDays: unknown; availableTimes: unknown; durationMinutes: number; levelId: number | null; enrolledCount?: number; isAcceptingBookings?: boolean };
type Teacher = { teacherId: string; name: string; avgRating: string; experienceYears: number; specialization: string | null; schedules: Schedule[] };
type Slot = { day: string; time: string; teacher: Teacher; schedule: Schedule };

const fmtTime12 = (t: string) => {
  const one = (x: string) => {
    const [h, m] = x.split(":").map(Number);
    const period = h >= 12 ? "مساءً" : "صباحاً";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, "0")} ${period}`;
  };
  if (t.includes("-")) { const [s, e] = t.split("-"); return `${one(s)} – ${one(e)}`; }
  return one(t);
};

const nextDateFor = (dayKey: string, timeStr: string) => {
  const target = JS_DAY_KEYS.indexOf(dayKey);
  const d = new Date();
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
  const [h, m] = timeStr.split("-")[0].split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export default function Booking() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ path?: string; levelId?: string }>();
  const pathFilter = params.path ?? "";
  const levelIdParam = Number(params.levelId) || null;
  const allowedTypes = PATH_SESSION_TYPES[pathFilter];

  const teachers = trpc.student.teachers.useQuery(undefined, { enabled: !!token });
  const utils = trpc.useUtils();
  const [sel, setSel] = useState<Slot | null>(null);
  const [booked, setBooked] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const book = trpc.student.bookSession.useMutation({
    onSuccess: () => { setBooked(sel); setSel(null); setError(null); void utils.student.mySessions.invalidate(); void utils.student.dashboard.invalidate(); },
    onError: (e) => setError(userFacingErrorMessage(e, "تعذر إتمام الحجز. حاول مرة أخرى.")),
  });

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const t of (teachers.data ?? []) as Teacher[]) {
      for (const sc of t.schedules ?? []) {
        if (sc.isAcceptingBookings === false) continue; // الحلقات المغلقة لا تُعرض — الحجز فيها يرفضه الخادم
        if (allowedTypes && !allowedTypes.includes(sc.sessionType)) continue;
        if (levelIdParam != null && sc.levelId != null && sc.levelId !== levelIdParam) continue;
        for (const day of (sc.availableDays as string[]) ?? []) {
          for (const time of (sc.availableTimes as string[]) ?? []) {
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push({ day, time, teacher: t, schedule: sc });
          }
        }
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [teachers.data, allowedTypes, levelIdParam]);

  const days = DAY_ORDER.filter((d) => slotsByDay.has(d));

  if (teachers.isLoading) return <StudentScreen title="حجز المواعيد الأسبوعية"><LoadingState /></StudentScreen>;
  if (teachers.error) return <StudentScreen title="حجز المواعيد الأسبوعية"><ErrorState onRetry={() => void teachers.refetch()} /></StudentScreen>;

  const confirm = () => {
    if (!sel) return;
    setError(null);
    book.mutate({
      teacherId: sel.teacher.teacherId,
      sessionType: sel.schedule.sessionType as "qiraat" | "quran_hifz" | "quran_review" | "tajweed_level" | "tajweed_correction" | "sharia_fiqh" | "sharia_aqeedah" | "sharia_seerah",
      scheduleId: sel.schedule.id,
      levelId: sel.schedule.levelId ?? undefined,
      scheduledAt: nextDateFor(sel.day, sel.time),
      durationMinutes: sel.schedule.durationMinutes,
    });
  };

  return (
    <StudentScreen title="حجز المواعيد الأسبوعية" subtitle="اختر اليوم والوقت والشيخ — الموعد يتكرر أسبوعياً بشكل ثابت">
      {allowedTypes ? (
        <View style={styles.filterBadgeWrap}>
          <View style={[styles.filterBadge, { backgroundColor: `${colors.primary}1a` }]}>
            <Text style={[styles.filterBadgeText, { color: colors.primary }]}>مواعيد مسار {PATH_LABELS[pathFilter]} فقط</Text>
          </View>
        </View>
      ) : null}

      {!days.length ? (
        <EmptyState
          title="لا مواعيد متاحة حالياً"
          description={allowedTypes ? `لا توجد مواعيد منشورة لمسار ${PATH_LABELS[pathFilter]} بعد — ستُضاف قريباً` : "سيقوم المسؤول بإضافة جداول الحلقات قريباً"}
        />
      ) : (
        days.map((day) => (
          <View key={day} style={styles.daySection}>
            <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
              <Icon name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[styles.dayTitle, { color: colors.text }]}>{DAY_AR[day]}</Text>
              <Text style={[styles.dayCount, { color: colors.muted }]}>{slotsByDay.get(day)!.length} موعد</Text>
            </View>
            {slotsByDay.get(day)!.map((slot) => {
              const sc = slot.schedule;
              const isGroup = sc.sessionMode === "group";
              const enrolled = typeof sc.enrolledCount === "number" ? sc.enrolledCount : 0;
              const ratio = isGroup ? Math.min(1, enrolled / sc.maxStudents) : 0;
              return (
                <Pressable
                  key={`${sc.id}-${slot.time}`}
                  accessibilityRole="button"
                  onPress={() => setSel(slot)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
                >
                  <Card style={styles.slotCard}>
                    <View style={styles.slotRow}>
                      <View style={[styles.timeBubble, { backgroundColor: `${colors.primary}0d`, borderColor: `${colors.primary}1a` }]}>
                        <Text style={[styles.timeText, { color: colors.primary }]}>{slot.time}</Text>
                      </View>
                      <View style={styles.slotBody}>
                        <Text style={[styles.teacherName, { color: colors.text }]}>{slot.teacher.name}</Text>
                        <Text style={[styles.slotMeta, { color: colors.muted }]}>{typeLabelOf(sc)} · {fmtTime12(slot.time)} · {sc.durationMinutes} دقيقة</Text>
                      </View>
                      <View style={[styles.pickBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.pickBadgeText, { color: colors.primaryText }]}>اختر</Text>
                      </View>
                    </View>
                    {isGroup ? (
                      <View style={styles.groupRow}>
                        <Text style={[styles.groupText, { color: colors.muted }]}>المقاعد المحجوزة {enrolled}/{sc.maxStudents} طالب</Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.barFill, { width: `${Math.max(ratio * 100, 4)}%`, backgroundColor: ratio >= 1 ? colors.danger : ratio >= 0.75 ? palette.gold : colors.success }]} />
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.individualText, { color: colors.muted }]}>حلقة فردية — {slot.teacher.specialization ?? "معلم قرآن"}</Text>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ))
      )}

      {/* تأكيد الحجز الأسبوعي */}
      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => !book.isPending && setSel(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sel ? (
              <>
                <Text style={[styles.sheetTitle, { color: colors.primary }]}>تأكيد الحجز الأسبوعي</Text>
                <Card style={styles.teacherCard}>
                  <Text style={[styles.teacherName, { color: colors.text }]}>{sel.teacher.name}</Text>
                  <Text style={[styles.slotMeta, { color: colors.muted }]}>{sel.teacher.specialization ?? "معلم قرآن"} · ★ {sel.teacher.avgRating}</Text>
                </Card>
                <View style={styles.factsRow}>
                  {([["اليوم", DAY_AR[sel.day]], ["الوقت", sel.time], ["الحلقة", typeLabelOf(sel.schedule)]] as const).map(([l, v]) => (
                    <View key={l} style={[styles.fact, { backgroundColor: `${colors.primary}0d` }]}>
                      <Text style={[styles.factLabel, { color: colors.muted }]}>{l}</Text>
                      <Text style={[styles.factValue, { color: colors.text }]} numberOfLines={1}>{v}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.sheetNote, { color: colors.muted }]}>
                  هذا موعد أسبوعي ثابت يتكرر كل {DAY_AR[sel.day]} الساعة {fmtTime12(sel.time)} حتى نهاية المستوى الحالي
                </Text>
                {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
                <Button label={book.isPending ? "جارٍ الحجز…" : "تأكيد الحجز"} icon="checkmark" loading={book.isPending} disabled={book.isPending} onPress={confirm} />
                <Button label="تراجع" variant="secondary" disabled={book.isPending} onPress={() => setSel(null)} />
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* نجاح الحجز */}
      <Modal visible={!!booked} transparent animationType="fade" onRequestClose={() => setBooked(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {booked ? (
              <>
                <View style={[styles.successIcon, { backgroundColor: `${colors.success}1a` }]}>
                  <Icon name="checkmark" size={28} color={colors.success} />
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>تم تسجيل حجزك الأسبوعي</Text>
                <Text style={[styles.sheetNote, { color: colors.muted }]}>
                  حلقة {typeLabelOf(booked.schedule)} مع {booked.teacher.name}{"\n"}كل {DAY_AR[booked.day]} الساعة {fmtTime12(booked.time)}
                </Text>
                <Button label="جدولي الأسبوعي" icon="calendar-outline" onPress={() => { setBooked(null); router.push("/student/schedule" as never); }} />
                <Button label="إغلاق" variant="secondary" onPress={() => setBooked(null)} />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  filterBadgeWrap: { alignItems: "center", marginBottom: 10 },
  filterBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  filterBadgeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  daySection: { marginBottom: 18 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, paddingBottom: 9, marginBottom: 10 },
  dayTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, flex: 1, textAlign: "right" },
  dayCount: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  slotCard: { paddingVertical: 13, marginBottom: 8 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  timeBubble: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  slotBody: { flex: 1, minWidth: 0 },
  teacherName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, textAlign: "right" },
  slotMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 2 },
  pickBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pickBadgeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  groupRow: { marginTop: 10, gap: 5 },
  groupText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, textAlign: "right" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  individualText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, textAlign: "right", marginTop: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 22 },
  sheet: { borderRadius: 22, borderWidth: 1, padding: 20, gap: 10 },
  sheetTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, textAlign: "center" },
  teacherCard: { paddingVertical: 12 },
  factsRow: { flexDirection: "row", gap: 8 },
  fact: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  factLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  factValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12.5, marginTop: 2 },
  sheetNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "center" },
  errorText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "center" },
  successIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", alignSelf: "center" },
});
