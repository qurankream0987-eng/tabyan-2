import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminSelect, safeError } from "../../components/admin/admin-common";
import { Badge, Button, EmptyState, ErrorState } from "../../components/ui";
import {
  AdminRow, AdminSheet, ChoiceChips, ConfirmAction, FormError, FormInput, HeaderAction, IconAction, ListSkeleton, SheetFooter, SwitchRow,
  useAdminFeedback, useDirtyState,
} from "../../components/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

const FALLBACK_SUBJECTS = [
  { key: "aqeedah", name: "العقيدة" },
  { key: "fiqh", name: "الفقه" },
  { key: "seerah", name: "السيرة النبوية" },
];
const SHARIA_TYPES = ["sharia_aqeedah", "sharia_fiqh", "sharia_seerah"];
const TABS = [{ value: "subjects", label: "المواد" }, { value: "levels", label: "المستويات" }, { value: "circles", label: "الحلقات" }];

export default function Sharia() {
  const { colors } = useTheme();
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const subjects = trpc.sharia.adminListSubjects.useQuery();
  const levels = trpc.admin.levelsList.useQuery();
  const schedules = trpc.admin.schedulesList.useQuery();
  const [tab, setTab] = useState<"subjects" | "levels" | "circles">("subjects");
  const [edit, setEdit] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dirty = useDirtyState(edit);
  const subjectRows: any[] = Array.isArray(subjects.data) && subjects.data.length ? subjects.data : FALLBACK_SUBJECTS;
  const [subjectKey, setSubjectKey] = useState("aqeedah");
  const subjectOptions = subjectRows.map((subject) => ({ value: String(subject.key), label: String(subject.name) }));
  const selectedSubject = subjectRows.find((subject) => subject.key === subjectKey) ?? subjectRows[0];
  const levelRows: any[] = (Array.isArray(levels.data) ? levels.data : []).filter((level) => level.path === "sharia" && level.nameEn === selectedSubject?.key).sort((a, b) => a.orderIndex - b.orderIndex);
  const circleRows: any[] = (Array.isArray(schedules.data) ? schedules.data : []).filter((schedule) => SHARIA_TYPES.includes(String(schedule.sessionType)));
  const invalidate = () => { void utils.sharia.adminListSubjects.invalidate(); void utils.admin.levelsList.invalidate(); void utils.admin.schedulesList.invalidate(); };
  const closeForm = () => { setEdit(null); setFormError(null); };
  const upsert = trpc.sharia.adminUpsertSubject.useMutation({
    onSuccess: () => { closeForm(); notify("تم حفظ المادة"); invalidate(); },
    onError: (error) => setFormError(safeError(error, "تعذر حفظ المادة.")),
  });
  const remove = trpc.sharia.adminDeleteSubject.useMutation({
    onSuccess: () => { setDeleting(null); notify("حُذفت المادة"); invalidate(); },
    onError: (error) => { setDeleting(null); notify(safeError(error, "تعذر حذف المادة."), "error"); },
  });
  const reorder = trpc.sharia.adminReorderLevels.useMutation({
    onSuccess: () => { notify("تم تغيير ترتيب المستويات"); invalidate(); },
    onError: (error) => notify(safeError(error, "تعذر تغيير الترتيب."), "error"),
  });
  const toggle = trpc.admin.scheduleBookingToggle.useMutation({
    onMutate: (vars) => setPendingId(String(vars.scheduleId)),
    onSuccess: () => { notify("تم تحديث حالة التسجيل"); invalidate(); },
    onError: (error) => notify(safeError(error, "تعذر تحديث حالة التسجيل."), "error"),
    onSettled: () => setPendingId(null),
  });
  const saveSubject = () => {
    if (!edit?.key?.trim() || !edit?.name?.trim()) { setFormError("المفتاح والاسم مطلوبان"); return; }
    if (!/^[a-z0-9_]+$/.test(edit.key.trim())) { setFormError("مفتاح المادة بأحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط"); return; }
    if (edit.color && !/^#[0-9A-Fa-f]{6}$/.test(edit.color)) { setFormError("اللون بصيغة HEX مثل #800020"); return; }
    setFormError(null);
    upsert.mutate({ id: edit.id, key: edit.key.trim(), name: edit.name.trim(), description: edit.description?.trim() || null, color: edit.color || null, orderIndex: Number(edit.orderIndex ?? subjectRows.length), isActive: edit.isActive !== false } as any);
  };
  const moveLevel = (index: number, offset: number) => {
    const other = index + offset;
    if (other < 0 || other >= levelRows.length) return;
    const ids = levelRows.map((level) => level.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    reorder.mutate({ subjectKey: selectedSubject?.key ?? "aqeedah", levelIds: ids } as any);
  };
  const newSubject = () => setEdit({ orderIndex: subjectRows.length, isActive: true });
  const loading = subjects.isLoading || levels.isLoading || schedules.isLoading;
  const failed = subjects.error || levels.error || schedules.error;

  return (
    <AdminFrame title="إدارة الدروس الشرعية" right={tab === "subjects" ? <HeaderAction label="إضافة" accessibilityLabel="إضافة مادة" onPress={newSubject} /> : undefined}>
      <ChoiceChips label="القسم" options={TABS} value={tab} onChange={(value) => setTab(value as typeof tab)} />
      {loading ? <ListSkeleton /> : failed ? <ErrorState onRetry={() => { void subjects.refetch(); void levels.refetch(); void schedules.refetch(); }} /> : <>
        {tab === "subjects" ? (!subjectRows.length ? <EmptyState title="لا مواد بعد" description="أضف مادة شرعية للبدء." action="إضافة مادة" onAction={newSubject} /> : subjectRows.map((subject) => (
          <AdminRow key={subject.id ?? subject.key} title={subject.name} subtitle={`${subject.key} · ${subject.levelCount ?? 0} مستويات`} muted={subject.isActive === false}
            badges={<Badge label={subject.isActive === false ? "معطلة" : "مفعلة"} tone={subject.isActive === false ? "danger" : "success"} />}
            actions={subject.id ? <>
              <IconAction icon="create-outline" label={`تعديل ${subject.name}`} onPress={() => setEdit({ ...subject })} />
              <IconAction icon="trash-outline" tone="danger" label={`حذف ${subject.name}`} onPress={() => setDeleting(subject)} />
            </> : undefined} />
        ))) : null}
        {tab === "levels" ? <>
          <AdminSelect label="المادة" value={selectedSubject?.key ?? "aqeedah"} options={subjectOptions} onChange={setSubjectKey} />
          {!levelRows.length ? <EmptyState title="لا توجد مستويات لهذه المادة" description="أضف المستويات من صفحة المستويات." /> : levelRows.map((level, index) => (
            <AdminRow key={level.id} title={`${level.orderIndex}. ${level.name}`} subtitle={`${selectedSubject?.name ?? "—"} · ${level.isActive === false ? "معطل" : "مفعل"} · ${level.isHidden ? "مخفي" : "ظاهر"}`}
              actions={<>
                <IconAction icon="arrow-up-outline" label={`نقل ${level.name} لأعلى`} disabled={index === 0 || reorder.isPending} onPress={() => moveLevel(index, -1)} />
                <IconAction icon="arrow-down-outline" label={`نقل ${level.name} لأسفل`} disabled={index === levelRows.length - 1 || reorder.isPending} onPress={() => moveLevel(index, 1)} />
              </>} />
          ))}
        </> : null}
        {tab === "circles" ? (!circleRows.length ? <EmptyState title="لا حلقات شرعية بعد" description="أنشئ جداول للمعلمين من صفحة الجداول." /> : circleRows.map((schedule) => (
          <AdminRow key={schedule.id} title={`${schedule.teacherName ?? "معلم"} · ${schedule.typeLabel ?? schedule.sessionType}`}
            subtitle={`${schedule.levelName ?? "عام"} · ${(schedule.availableDays ?? []).join("، ")} · ${(schedule.availableTimes ?? []).join("، ")} · ${schedule.sessionMode === "group" ? `جماعية (${schedule.maxStudents ?? "—"})` : "فردية"} · ${schedule.durationMinutes ?? "—"} دقيقة`}
            badges={<Badge label={schedule.isAcceptingBookings ? "التسجيل مفتوح" : "التسجيل مغلق"} tone={schedule.isAcceptingBookings ? "success" : "muted"} />}
            actions={<View style={styles.toggle}><Button label={schedule.isAcceptingBookings ? "إغلاق" : "فتح"} variant="secondary" loading={pendingId === String(schedule.id)} disabled={pendingId === String(schedule.id)}
              onPress={() => toggle.mutate({ scheduleId: schedule.id, accepting: !schedule.isAcceptingBookings } as any)} /></View>} />
        ))) : null}
      </>}

      <AdminSheet visible={!!edit} title={edit?.id ? "تعديل مادة" : "إضافة مادة"} subtitle={edit?.id ? edit.name : undefined} onClose={closeForm} dirty={dirty} busy={upsert.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={saveSubject} loading={upsert.isPending} primaryLabel={edit?.id ? "حفظ التعديلات" : "إضافة المادة"} />}>
        {edit ? <>
          <FormError message={formError} />
          <FormInput label="اسم المادة" required value={edit.name ?? ""} onChangeText={(name) => { setEdit({ ...edit, name }); setFormError(null); }} />
          <FormInput label="المفتاح الإنجليزي" required ltr editable={!edit.id} helper={edit.id ? "لا يتغير المفتاح بعد إنشاء المادة" : "أحرف إنجليزية صغيرة وأرقام و _ فقط، مثل aqeedah"} value={edit.key ?? ""} onChangeText={(key) => { setEdit({ ...edit, key }); setFormError(null); }} />
          <FormInput label="الوصف" helper="اختياري" multiline value={edit.description ?? ""} onChangeText={(description) => setEdit({ ...edit, description })} />
          <FormInput label="اللون" helper="اختياري، بصيغة HEX مثل #800020" ltr value={edit.color ?? ""} onChangeText={(color) => setEdit({ ...edit, color })} />
          <FormInput label="الترتيب" keyboardType="number-pad" value={String(edit.orderIndex ?? 0)} onChangeText={(value) => setEdit({ ...edit, orderIndex: Number(normalizeDigits(value).replace(/\D/g, "")) })} />
          <SwitchRow label="المادة مفعّلة" helper="المواد المعطلة لا تظهر للطلاب" value={edit.isActive !== false} onChange={(isActive) => setEdit({ ...edit, isActive })} />
          {edit.color && /^#[0-9A-Fa-f]{6}$/.test(edit.color) ? <View style={[styles.swatch, { backgroundColor: edit.color, borderColor: colors.border }]}><Text style={styles.swatchText}>{edit.color}</Text></View> : null}
        </> : null}
      </AdminSheet>

      <ConfirmAction visible={!!deleting} title="حذف هذه المادة؟" itemName={deleting?.name}
        impact="ستُحذف المادة من قائمة المواد الشرعية. إن كانت مرتبطة بمستويات أو محتوى فقد يرفض الخادم الحذف — عطّلها بدلاً من ذلك." confirmLabel="حذف المادة"
        loading={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate({ id: deleting.id } as any)} />
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  toggle: { minWidth: 86 },
  swatch: { height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  swatchText: { color: "#fff", fontFamily: "IBMPlexSansArabic_700Bold" },
});
