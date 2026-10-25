import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AdminFrame, AdminSelect, safeError } from "../../components/admin/admin-common";
import { Badge, EmptyState, ErrorState } from "../../components/ui";
import {
  AdminRow, AdminSheet, AdminToolbar, ChoiceChips, ConfirmAction, FormError, FormInput, HeaderAction, IconAction, ListSkeleton,
  MobileActionSheet, SheetFooter, SwitchRow, useAdminFeedback, useDirtyState,
} from "../../components/admin/admin-ui";
import { trpc } from "../../lib/trpc";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

const PATHS = [
  { value: "quran", label: "القرآن الكريم" },
  { value: "tajweed", label: "التجويد" },
  { value: "qiraat", label: "القراءات" },
  { value: "sharia", label: "العلوم الشرعية" },
];
const LEVEL_DELETE_IMPACT = "إن وُجدت بيانات مرتبطة بالمستوى (تقدم طلاب أو جلسات أو محتوى أو تقييمات) فسيُرفض الحذف — أخفِه أو عطّله بدلاً من ذلك.";

export default function Levels() {
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const q = trpc.admin.levelsList.useQuery();
  const subjectsQ = trpc.sharia.adminListSubjects.useQuery();
  const [path, setPath] = useState("quran");
  const [edit, setEdit] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const dirty = useDirtyState(edit);
  const invalidate = () => { void utils.admin.levelsList.invalidate(); void utils.admin.levelThresholds.invalidate(); };
  const closeForm = () => { setEdit(null); setFormError(null); };
  const create = trpc.admin.levelCreate.useMutation({
    onSuccess: () => { closeForm(); notify("أُضيف المستوى"); invalidate(); },
    onError: (error) => setFormError(safeError(error, "تعذر إضافة المستوى.")),
  });
  const update = trpc.admin.levelUpdate.useMutation({
    onSuccess: () => { closeForm(); notify("حُدّث المستوى"); invalidate(); },
    onError: (error) => setFormError(safeError(error, "تعذر حفظ المستوى.")),
  });
  // Row-level toggles (active / hidden) keep their own per-row loading and toast.
  const quickUpdate = trpc.admin.levelUpdate.useMutation({
    onMutate: (vars) => setPendingId(vars.id),
    onSuccess: () => { notify("حُدّث المستوى"); invalidate(); },
    onError: (error) => notify(safeError(error, "تعذر تحديث المستوى."), "error"),
    onSettled: () => setPendingId(null),
  });
  const remove = trpc.admin.levelDelete.useMutation({
    onSuccess: () => { setDeleting(null); notify("حُذف المستوى"); invalidate(); },
    onError: (error) => { setDeleting(null); notify(safeError(error, "تعذر حذف المستوى."), "error"); },
  });
  const swap = trpc.admin.levelSwap.useMutation({
    onMutate: (vars) => setPendingId(vars.idA),
    onSuccess: () => { notify("تم تغيير الترتيب"); invalidate(); },
    onError: (error) => notify(safeError(error, "تعذر تغيير الترتيب."), "error"),
    onSettled: () => setPendingId(null),
  });

  const allRows: any[] = Array.isArray(q.data) ? q.data : [];
  const rows = allRows.filter((level) => level.path === path).sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0));
  const aqeedahOptions = allRows.filter((level) => level.path === "sharia" && level.nameEn === "aqeedah_quran").sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0));
  const shariaSubjects = Array.isArray(subjectsQ.data) && subjectsQ.data.length
    ? subjectsQ.data.map((subject: any) => ({ value: String(subject.key), label: String(subject.name) }))
    : [{ value: "aqeedah", label: "العقيدة" }, { value: "fiqh", label: "الفقه" }, { value: "seerah", label: "السيرة النبوية" }];
  const numberField = (key: string, label: string) => <FormInput label={label} value={String(edit?.[key] ?? "")} keyboardType="number-pad" onChangeText={(value) => setEdit({ ...edit, [key]: normalizeDigits(value).replace(/\D/g, "") })} />;

  const save = () => {
    if (!edit?.name?.trim()) { setFormError("اسم المستوى مطلوب"); return; }
    const positive = (key: string, fallback: number, min = 0) => Math.max(min, Number(edit[key] || fallback) || fallback);
    const payload = {
      name: edit.name.trim(), nameEn: edit.nameEn || undefined, path: edit.path || "quran",
      orderIndex: positive("orderIndex", rows.length + 1, 1), sessionsCount: positive("sessionsCount", 5, 1),
      requiredJuz: positive("requiredJuz", 0), requiredSessions: positive("requiredSessions", 0),
      requiresIjazah: Boolean(edit.requiresIjazah), isHidden: Boolean(edit.isHidden),
      isActive: edit.isActive !== false, aqeedahLevelId: edit.aqeedahLevelId ? positive("aqeedahLevelId", 1, 1) : null,
    };
    setFormError(null);
    if (edit.id) update.mutate({ id: edit.id, ...payload } as any);
    else create.mutate(payload as any);
  };
  const newLevel = () => setEdit({ path, sessionsCount: 5, requiredJuz: 0, requiredSessions: 0, orderIndex: rows.length + 1, isActive: true, isHidden: false });
  const actionsFor = (level: any) => {
    const index = rows.findIndex((row) => row.id === level.id);
    return [
      { key: "edit", label: "تعديل المستوى", icon: "create-outline", onPress: () => setEdit({ ...level }) },
      { key: "active", label: level.isActive === false ? "تفعيل المستوى" : "تعطيل المستوى", icon: level.isActive === false ? "checkmark-circle-outline" : "pause-circle-outline", onPress: () => quickUpdate.mutate({ id: level.id, isActive: level.isActive === false } as any) },
      { key: "hidden", label: level.isHidden ? "إظهار للطلاب" : "إخفاء عن الطلاب", icon: level.isHidden ? "eye-outline" : "eye-off-outline", onPress: () => quickUpdate.mutate({ id: level.id, isHidden: !level.isHidden } as any) },
      ...(index > 0 ? [{ key: "up", label: "نقل لأعلى", icon: "arrow-up-outline", onPress: () => swap.mutate({ idA: level.id, idB: rows[index - 1].id }) }] : []),
      ...(index < rows.length - 1 ? [{ key: "down", label: "نقل لأسفل", icon: "arrow-down-outline", onPress: () => swap.mutate({ idA: level.id, idB: rows[index + 1].id }) }] : []),
      { key: "delete", label: "حذف المستوى", icon: "trash-outline", danger: true, onPress: () => setDeleting(level) },
    ];
  };

  return (
    <AdminFrame title="إدارة المستويات" right={<HeaderAction label="إضافة" accessibilityLabel="إضافة مستوى" onPress={newLevel} />}>
      <ChoiceChips label="المسار" options={PATHS} value={path} onChange={setPath} />
      <AdminToolbar count={q.isLoading ? undefined : rows.length} countLabel="مستوى" />
      {q.isLoading ? <ListSkeleton /> : q.error ? <ErrorState onRetry={() => void q.refetch()} /> : !rows.length
        ? <EmptyState title="لا توجد مستويات" description="أنشئ مستوى جديداً ليظهر هنا." icon="layers-outline" action="إضافة مستوى" onAction={newLevel} />
        : rows.map((level) => (
          <AdminRow key={level.id} title={`${level.orderIndex}. ${level.name}`} muted={level.isActive === false}
            subtitle={`${level.sessionsCount} جلسات · ${level.requiredJuz} أجزاء${level.requiresIjazah ? " · يتطلب إجازة" : ""}`}
            badges={<>{level.isActive === false ? <Badge label="معطل" tone="danger" /> : <Badge label="مفعل" tone="success" />}{level.isHidden ? <Badge label="مخفي" tone="muted" /> : null}</>}
            actions={<>
              <IconAction icon="create-outline" label={`تعديل ${level.name}`} onPress={() => setEdit({ ...level })} />
              <IconAction icon="ellipsis-horizontal" label={`خيارات ${level.name}`} loading={pendingId === level.id} onPress={() => setMenuFor(level)} />
            </>} />
        ))}

      <MobileActionSheet visible={!!menuFor} title={menuFor?.name ?? ""} subtitle={PATHS.find((item) => item.value === menuFor?.path)?.label} actions={menuFor ? actionsFor(menuFor) : []} onClose={() => setMenuFor(null)} />

      <AdminSheet visible={!!edit} title={edit?.id ? "تعديل مستوى" : "إضافة مستوى"} subtitle={edit?.id ? edit.name : PATHS.find((item) => item.value === edit?.path)?.label}
        onClose={closeForm} dirty={dirty} busy={create.isPending || update.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={save} loading={create.isPending || update.isPending} primaryLabel={edit?.id ? "حفظ التعديلات" : "إضافة المستوى"} />}>
        {edit ? <>
          <FormError message={formError} />
          <FormInput label="اسم المستوى" required value={String(edit.name ?? "")} onChangeText={(name) => { setEdit({ ...edit, name }); setFormError(null); }} />
          {edit.path === "sharia"
            ? <AdminSelect label="المادة الشرعية" value={String(edit.nameEn ?? "")} options={shariaSubjects} onChange={(value) => setEdit({ ...edit, nameEn: value })} />
            : <FormInput label="الاسم الإنجليزي" helper="اختياري" ltr value={String(edit.nameEn ?? "")} onChangeText={(nameEn) => setEdit({ ...edit, nameEn })} />}
          <ChoiceChips label="المسار" options={PATHS} value={edit.path ?? "quran"} onChange={(value) => setEdit({ ...edit, path: value })} />
          <View style={styles.grid}>
            <View style={styles.cell}>{numberField("orderIndex", "الترتيب")}</View>
            <View style={styles.cell}>{numberField("sessionsCount", "عدد الجلسات")}</View>
          </View>
          <View style={styles.grid}>
            <View style={styles.cell}>{numberField("requiredJuz", "الأجزاء المطلوبة")}</View>
            <View style={styles.cell}>{numberField("requiredSessions", "الجلسات المطلوبة")}</View>
          </View>
          {edit.path === "quran" ? <AdminSelect label="متطلب العقيدة الإلزامي" value={edit.aqeedahLevelId ? String(edit.aqeedahLevelId) : ""} options={[{ value: "", label: "بلا متطلب" }, ...aqeedahOptions.map((level) => ({ value: String(level.id), label: level.name }))]} onChange={(value) => setEdit({ ...edit, aqeedahLevelId: value ? Number(value) : null })} /> : null}
          <SwitchRow label="يتطلب إجازة" value={!!edit.requiresIjazah} onChange={(requiresIjazah) => setEdit({ ...edit, requiresIjazah })} />
          <SwitchRow label="المستوى مفعّل" value={edit.isActive !== false} onChange={(isActive) => setEdit({ ...edit, isActive })} />
          <SwitchRow label="مخفي عن الطلاب" value={!!edit.isHidden} onChange={(isHidden) => setEdit({ ...edit, isHidden })} />
        </> : null}
      </AdminSheet>

      <ConfirmAction visible={!!deleting} title="حذف هذا المستوى نهائياً؟" itemName={deleting?.name} impact={LEVEL_DELETE_IMPACT} confirmLabel="حذف نهائي"
        loading={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate({ id: deleting.id })} />
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row-reverse", gap: 10 },
  cell: { flex: 1 },
});
