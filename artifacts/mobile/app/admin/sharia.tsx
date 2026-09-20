import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, AdminSelect, ConfirmButton, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { normalizeDigits } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";

const FALLBACK_SUBJECTS = [
  { key: "aqeedah", name: "العقيدة" },
  { key: "fiqh", name: "الفقه" },
  { key: "seerah", name: "السيرة النبوية" },
];
const SHARIA_TYPES = ["sharia_aqeedah", "sharia_fiqh", "sharia_seerah"];

export default function Sharia() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const subjects = trpc.sharia.adminListSubjects.useQuery();
  const levels = trpc.admin.levelsList.useQuery();
  const schedules = trpc.admin.schedulesList.useQuery();
  const [tab, setTab] = useState<"subjects" | "levels" | "circles">("subjects");
  const [edit, setEdit] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const subjectRows: any[] = Array.isArray(subjects.data) && subjects.data.length ? subjects.data : FALLBACK_SUBJECTS;
  const [subjectKey, setSubjectKey] = useState("aqeedah");
  const subjectOptions = subjectRows.map((subject) => ({ value: String(subject.key), label: String(subject.name) }));
  const selectedSubject = subjectRows.find((subject) => subject.key === subjectKey) ?? subjectRows[0];
  const levelRows: any[] = (Array.isArray(levels.data) ? levels.data : []).filter((level) => level.path === "sharia" && level.nameEn === selectedSubject?.key).sort((a, b) => a.orderIndex - b.orderIndex);
  const circleRows: any[] = (Array.isArray(schedules.data) ? schedules.data : []).filter((schedule) => SHARIA_TYPES.includes(String(schedule.sessionType)));
  const done = (message: string) => ({ onSuccess: () => { setFeedback(message); setEdit(null); void utils.sharia.adminListSubjects.invalidate(); void utils.admin.levelsList.invalidate(); void utils.admin.schedulesList.invalidate(); }, onError: (error: unknown) => setFeedback(safeError(error, "تعذر تنفيذ العملية.")) });
  const upsert = trpc.sharia.adminUpsertSubject.useMutation(done("تم حفظ المادة"));
  const remove = trpc.sharia.adminDeleteSubject.useMutation(done("حُذفت المادة"));
  const reorder = trpc.sharia.adminReorderLevels.useMutation(done("تم تغيير ترتيب المستويات"));
  const toggle = trpc.admin.scheduleBookingToggle.useMutation(done("تم تحديث حالة التسجيل"));
  const saveSubject = () => {
    if (!edit?.key?.trim() || !edit?.name?.trim()) { setFeedback("المفتاح والاسم مطلوبان"); return; }
    if (!/^[a-z0-9_]+$/.test(edit.key.trim())) { setFeedback("مفتاح المادة بأحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط"); return; }
    upsert.mutate({ id: edit.id, key: edit.key.trim(), name: edit.name.trim(), description: edit.description?.trim() || null, color: edit.color || null, orderIndex: Number(edit.orderIndex ?? subjectRows.length), isActive: edit.isActive !== false } as any);
  };
  const moveLevel = (index: number, offset: number) => {
    const other = index + offset;
    if (other < 0 || other >= levelRows.length) return;
    const ids = levelRows.map((level) => level.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    reorder.mutate({ subjectKey: selectedSubject?.key ?? "aqeedah", levelIds: ids } as any);
  };
  if (subjects.isLoading || levels.isLoading || schedules.isLoading) return <AdminFrame title="الدروس الشرعية"><LoadingState /></AdminFrame>;
  if (subjects.error || levels.error || schedules.error) return <AdminFrame title="الدروس الشرعية"><ErrorState onRetry={() => { void subjects.refetch(); void levels.refetch(); void schedules.refetch(); }} /></AdminFrame>;
  return (
    <AdminFrame title="إدارة الدروس الشرعية">
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      <View style={styles.tabs}>{[["subjects", "المواد"], ["levels", "المستويات"], ["circles", "الحلقات"]].map(([key, label]) => <Button key={key} label={label} variant={tab === key ? "primary" : "secondary"} onPress={() => setTab(key as typeof tab)} style={styles.tab} />)}</View>
      {tab === "subjects" ? (
        <>
          <Button label="إضافة مادة" icon="add-outline" onPress={() => setEdit({ orderIndex: subjectRows.length, isActive: true })} />
          {!subjectRows.length ? <EmptyState title="لا مواد بعد" description="أضف مادة شرعية للبدء." /> : subjectRows.map((subject) => <Card key={subject.id ?? subject.key}><View style={styles.row}><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{subject.name}</Text><Text style={[styles.muted, { color: colors.muted }]}>{subject.key} · {subject.levelCount ?? 0} مستويات</Text></View><Text style={[styles.status, { color: subject.isActive === false ? colors.danger : colors.success }]}>{subject.isActive === false ? "معطلة" : "مفعلة"}</Text></View><View style={styles.actions}><Button label="تعديل" variant="secondary" onPress={() => setEdit({ ...subject })} /><ConfirmButton label="حذف" danger onConfirm={() => remove.mutate({ id: subject.id } as any)} /></View></Card>)}
           {edit ? <Card accent><Text style={[styles.title, { color: colors.text }]}>{edit.id ? "تعديل مادة" : "إضافة مادة"}</Text><AdminInput value={edit.key ?? ""} onChangeText={(value) => setEdit({ ...edit, key: value })} placeholder="المفتاح الإنجليزي" /><AdminInput value={edit.name ?? ""} onChangeText={(value) => setEdit({ ...edit, name: value })} placeholder="اسم المادة" /><AdminInput value={edit.description ?? ""} onChangeText={(value) => setEdit({ ...edit, description: value })} placeholder="الوصف (اختياري)" multiline /><AdminInput value={String(edit.orderIndex ?? 0)} onChangeText={(value) => setEdit({ ...edit, orderIndex: Number(normalizeDigits(value).replace(/\D/g, "")) })} placeholder="الترتيب" keyboardType="number-pad" /><Button label={edit.isActive === false ? "تفعيل المادة" : "تعطيل المادة"} variant="secondary" onPress={() => setEdit({ ...edit, isActive: edit.isActive === false })} /><Button label="حفظ" loading={upsert.isPending} onPress={saveSubject} /><Button label="إلغاء" variant="quiet" onPress={() => setEdit(null)} /></Card> : null}
        </>
      ) : null}
       {tab === "levels" ? <><AdminSelect label="المادة" value={selectedSubject?.key ?? "aqeedah"} options={subjectOptions} onChange={setSubjectKey} />{!levelRows.length ? <EmptyState title="لا توجد مستويات لهذه المادة" /> : levelRows.map((level, index) => <Card key={level.id}><View style={styles.row}><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{level.orderIndex}. {level.name}</Text><Text style={[styles.muted, { color: colors.muted }]}>{selectedSubject?.name ?? "—"} · {level.isActive === false ? "معطل" : "مفعل"} · {level.isHidden ? "مخفي" : "ظاهر"}</Text></View><View style={styles.reorder}><Button label="↑" variant="secondary" disabled={index === 0 || reorder.isPending} onPress={() => moveLevel(index, -1)} /><Button label="↓" variant="secondary" disabled={index === levelRows.length - 1 || reorder.isPending} onPress={() => moveLevel(index, 1)} /></View></View></Card>)}</> : null}
       {tab === "circles" ? (!circleRows.length ? <EmptyState title="لا حلقات شرعية بعد" description="أنشئ جداول للمعلمين من صفحة الجداول." /> : circleRows.map((schedule) => <Card key={schedule.id}><Text style={[styles.title, { color: colors.text }]}>{schedule.teacherName ?? "معلم"} · {schedule.typeLabel ?? schedule.sessionType}</Text><Text style={[styles.muted, { color: colors.muted }]}>{schedule.levelName ?? "عام"} · {(schedule.availableDays ?? []).join("، ")} · {(schedule.availableTimes ?? []).join("، ")} · {schedule.sessionMode === "group" ? `جماعية (${schedule.maxStudents ?? "—"})` : "فردية"} · {schedule.durationMinutes ?? "—"} دقيقة</Text><Button label={schedule.isAcceptingBookings ? "إغلاق التسجيل" : "فتح التسجيل"} variant="secondary" onPress={() => toggle.mutate({ scheduleId: schedule.id, accepting: !schedule.isAcceptingBookings } as any)} /></Card>)) : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", gap: 6, marginBottom: 10 },
  tab: { flex: 1 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 4, lineHeight: 19 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  status: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  actions: { flexDirection: "row-reverse", gap: 7, marginTop: 10 },
  reorder: { gap: 5 },
  feedback: { textAlign: "right", marginBottom: 8, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
});