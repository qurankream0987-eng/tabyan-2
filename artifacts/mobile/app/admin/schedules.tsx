import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AdminDateTimeField, AdminFrame, AdminSelect, ConfirmButton, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { normalizeDigits } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";

const SESSION_TYPES = [
  ["quran_hifz", "حفظ قرآن"], ["quran_review", "مراجعة قرآن"], ["qiraat", "قراءات"],
  ["tajweed_correction", "تصحيح تلاوة"], ["tajweed_level", "تجويد"],
  ["sharia_fiqh", "فقه"], ["sharia_aqeedah", "عقيدة"], ["sharia_seerah", "سيرة"],
] as const;
const PROGRAMS = [
  { id: "quran", label: "القرآن الكريم", types: ["quran_hifz", "quran_review", "qiraat"], paths: ["quran", "qiraat"] },
  { id: "tajweed", label: "دروس التجويد", types: ["tajweed_correction", "tajweed_level"], paths: ["tajweed", "tajweed_correction"] },
  { id: "sharia", label: "الدروس الشرعية", types: ["sharia_fiqh", "sharia_aqeedah", "sharia_seerah"], paths: ["sharia"] },
] as const;
const DAYS = [["saturday", "السبت"], ["sunday", "الأحد"], ["monday", "الإثنين"], ["tuesday", "الثلاثاء"], ["wednesday", "الأربعاء"], ["thursday", "الخميس"], ["friday", "الجمعة"]] as const;

function timeLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function Schedules() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const q = trpc.admin.schedulesList.useQuery();
  const bookings = trpc.admin.bookingsList.useQuery();
  const teachers = trpc.admin.teachersList.useQuery();
  const levels = trpc.admin.levelThresholds.useQuery();
  const [teacherId, setTeacherId] = useState("");
  const [program, setProgram] = useState<(typeof PROGRAMS)[number]["id"]>("quran");
  const [type, setType] = useState("quran_hifz");
  const [levelId, setLevelId] = useState("");
  const [mode, setMode] = useState("individual");
  const [max, setMax] = useState("1");
  const [days, setDays] = useState<string[]>([]);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [duration, setDuration] = useState("30");
  const [feedback, setFeedback] = useState("");
  const [tab, setTab] = useState<"schedules" | "bookings">("schedules");

  const done = (message: string) => ({
    onSuccess: () => {
      setFeedback(message);
      void utils.admin.schedulesList.invalidate();
      void utils.admin.bookingsList.invalidate();
    },
    onError: (error: unknown) => setFeedback(safeError(error, "تعذر تنفيذ العملية.")),
  });
  const create = trpc.admin.scheduleCreate.useMutation(done("أُنشئ الجدول"));
  const remove = trpc.admin.scheduleDelete.useMutation(done("حُذف الجدول"));
  const cancel = trpc.admin.bookingCancel.useMutation(done("أُلغي الحجز"));
  const toggle = trpc.admin.scheduleToggle.useMutation(done("تم تحديث حالة الجدول"));
  const bookToggle = trpc.admin.scheduleBookingToggle.useMutation(done("تم تحديث التسجيل"));

  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  const booked: any[] = Array.isArray(bookings.data) ? bookings.data : [];
  const teacherRows: any[] = Array.isArray(teachers.data) ? teachers.data : [];
  const levelRows: any[] = Array.isArray(levels.data) ? levels.data : [];
  const activeProgram = PROGRAMS.find((item) => item.id === program) ?? PROGRAMS[0];
  const typeOptions = SESSION_TYPES.filter(([key]) => (activeProgram.types as readonly string[]).includes(key)).map(([value, label]) => ({ value, label }));
  const levelOptions = levelRows
    .filter((level) => (activeProgram.paths as readonly string[]).includes(String(level.path)))
    .filter((level) => level.name !== "إجازة حفص")
    .map((level) => ({ value: String(level.id), label: String(level.name) }));
  const teacherOptions = teacherRows.map((teacher) => ({ value: String(teacher.teacherId ?? teacher.id), label: String(teacher.name ?? teacher.fullName ?? teacher.teacherId) }));
  const programOptions = PROGRAMS.map((item) => ({ value: item.id, label: item.label }));

  const addSlot = () => {
    const start = timeLabel(slotStart);
    const end = timeLabel(slotEnd);
    if (!start || !end) { setFeedback("حدد وقت البداية والنهاية"); return; }
    if (end <= start) { setFeedback("وقت النهاية يجب أن يكون بعد البداية"); return; }
    if (slots.some((slot) => start < slot.end && slot.start < end)) { setFeedback("هذا الموعد يتعارض مع موعد موجود"); return; }
    setSlots((current) => [...current, { start, end }]);
    setSlotStart("");
    setSlotEnd("");
    setFeedback("");
  };

  const maxNumber = Math.max(1, Math.min(50, Number(max) || 1));
  const durationNumber = Math.max(15, Math.min(120, Number(duration) || 30));
  const createDisabled = !teacherId || !days.length || !slots.length || create.isPending || (mode === "group" && maxNumber < 2);
  const toggleDay = (day: string) => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day]);

  if (q.isLoading || bookings.isLoading || teachers.isLoading || levels.isLoading) return <AdminFrame title="الجداول"><LoadingState /></AdminFrame>;
  if (q.error || bookings.error || teachers.error || levels.error) return <AdminFrame title="الجداول"><ErrorState onRetry={() => { void q.refetch(); void bookings.refetch(); void teachers.refetch(); void levels.refetch(); }} /></AdminFrame>;

  return (
    <AdminFrame title="الجداول والحجوزات">
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      <View style={styles.tabs}><Button label="الجداول الأسبوعية" variant={tab === "schedules" ? "primary" : "secondary"} onPress={() => setTab("schedules")} style={styles.tab} /><Button label="الحجوزات" variant={tab === "bookings" ? "primary" : "secondary"} onPress={() => setTab("bookings")} style={styles.tab} /></View>
      {tab === "bookings" ? booked.length ? booked.map((booking) => <Card key={booking.id}><Text style={[styles.title, { color: colors.text }]}>{booking.typeLabel ?? "حجز"} · {booking.studentName ?? "طالب"}</Text><Text style={[styles.hint, { color: colors.muted }]}>{booking.teacherName ?? "—"} · {String(booking.scheduledAt ?? "—")} · {booking.status}</Text>{!["cancelled", "completed"].includes(booking.status) ? <Button label="إلغاء الحجز" variant="danger" onPress={() => cancel.mutate({ id: booking.id })} /> : null}</Card>) : <EmptyState title="لا حجوزات" /> : <>
      <Card accent>
        <Text style={[styles.title, { color: colors.text }]}>إنشاء جدول أسبوعي</Text>
        <AdminSelect label="البرنامج" value={program} options={programOptions} onChange={(value) => {
          const next = PROGRAMS.find((item) => item.id === value) ?? PROGRAMS[0];
          setProgram(next.id);
          setType(next.types[0]);
          setLevelId("");
        }} />
        <AdminSelect label="المعلم" value={teacherId} options={teacherOptions} onChange={setTeacherId} placeholder="اختر المعلم" />
        <AdminSelect label="نوع الحصة" value={type} options={typeOptions} onChange={setType} />
        <AdminSelect label="المستوى" value={levelId} options={levelOptions} onChange={setLevelId} placeholder="كل المستويات" />
        <AdminSelect label="نمط الجلسة" value={mode} options={[{ value: "individual", label: "فردية" }, { value: "group", label: "جماعية" }]} onChange={setMode} />
        <Text style={[styles.label, { color: colors.muted }]}>الأيام المتاحة</Text>
        <View style={styles.dayGrid}>
          {DAYS.map(([value, label]) => (
            <Button key={value} label={label} variant={days.includes(value) ? "primary" : "secondary"} onPress={() => toggleDay(value)} style={styles.dayButton} />
          ))}
        </View>
         <View style={styles.row}>
          <View style={styles.flex}>
            <AdminDateTimeField label="من" mode="time" value={slotStart} onChange={setSlotStart} />
          </View>
          <View style={styles.flex}>
            <AdminDateTimeField label="إلى" mode="time" value={slotEnd} onChange={setSlotEnd} />
          </View>
         </View>
        <Button label="إضافة الموعد" variant="secondary" icon="add-outline" onPress={addSlot} />
        {slots.length ? <View style={styles.slotList}>{slots.map((slot, index) => <View key={`${slot.start}-${slot.end}-${index}`} style={[styles.slot, { backgroundColor: `${colors.primary}12` }]}><Text style={[styles.slotText, { color: colors.primary }]}>{slot.start} - {slot.end}</Text><Button label="حذف" variant="quiet" onPress={() => setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></View>)}</View> : null}
         {mode === "group" ? <View style={styles.row}>
           <View style={styles.flex}><AdminInputLike value={max} onChange={(value) => setMax(normalizeDigits(value).replace(/\D/g, ""))} label="السعة القصوى (2-50)" colors={colors} keyboardType="number-pad" /></View>
           <View style={styles.flex}><AdminInputLike value={duration} onChange={(value) => setDuration(normalizeDigits(value).replace(/\D/g, ""))} label="المدة بالدقائق (15-120)" colors={colors} keyboardType="number-pad" /></View>
         </View> : <View><AdminInputLike value={duration} onChange={(value) => setDuration(normalizeDigits(value).replace(/\D/g, ""))} label="المدة بالدقائق (15-120)" colors={colors} keyboardType="number-pad" /></View>}
         <Button label="إنشاء الجدول" loading={create.isPending} disabled={createDisabled} onPress={() => create.mutate({ teacherId, sessionType: type as any, levelId: levelId ? Number(levelId) : undefined, sessionMode: mode as any, maxStudents: mode === "group" ? maxNumber : 1, availableDays: days as any, availableTimes: slots.map((slot) => `${slot.start}-${slot.end}`), durationMinutes: durationNumber } as any)} />
      </Card>

      {!rows.length ? <EmptyState title="لا توجد جداول" description="ستظهر الجداول الأسبوعية هنا بعد إنشائها." icon="calendar-outline" /> : rows.map((schedule) => (
        <Card key={schedule.id}>
          <Text style={[styles.title, { color: colors.text }]}>{schedule.typeLabel ?? schedule.sessionType} · {schedule.teacherName ?? schedule.teacherId}</Text>
          <Text style={[styles.hint, { color: colors.muted }]}>{(schedule.availableDays ?? []).join("، ")} · {(schedule.availableTimes ?? []).join(" · ")} · {schedule.durationMinutes} دقيقة</Text>
          <View style={styles.actions}>
            <Button label={schedule.isActive === false ? "تفعيل الجدول" : "تعطيل الجدول"} variant="secondary" onPress={() => toggle.mutate({ scheduleId: schedule.id, active: schedule.isActive === false })} />
            <Button label={schedule.isAcceptingBookings === false ? "فتح التسجيل" : "إغلاق التسجيل"} variant="secondary" onPress={() => bookToggle.mutate({ scheduleId: schedule.id, accepting: schedule.isAcceptingBookings === false })} />
            <ConfirmButton label="حذف الجدول" danger onConfirm={() => remove.mutate({ scheduleId: schedule.id })} />
          </View>
        </Card>
      ))}

       </>}
    </AdminFrame>
  );
}

function AdminInputLike({ value, onChange, label, colors, keyboardType }: { value: string; onChange: (value: string) => void; label: string; colors: { text: string; border: string; input: string; muted: string }; keyboardType: "number-pad" }) {
  return <><Text style={[styles.label, { color: colors.muted }]}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} /></>;
}

const styles = StyleSheet.create({
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", marginBottom: 9 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right", marginTop: 9, marginBottom: 5 },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", lineHeight: 19, marginBottom: 9 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular" },
  row: { flexDirection: "row-reverse", gap: 8 },
  flex: { flex: 1 },
  dayGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginBottom: 9 },
  dayButton: { flexGrow: 1, minWidth: "27%" },
  slotList: { gap: 6, marginVertical: 8 },
  slot: { borderRadius: 12, paddingHorizontal: 10, minHeight: 44, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  slotText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  actions: { gap: 7 },
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "right", marginBottom: 8 },
  tabs: { flexDirection: "row-reverse", gap: 8, marginBottom: 10 },
  tab: { flex: 1 },
});