import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, AdminSelect, ConfirmButton, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { normalizeDigits } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";

const PATHS = [
  { value: "quran", label: "القرآن الكريم" },
  { value: "tajweed", label: "التجويد" },
  { value: "qiraat", label: "القراءات" },
  { value: "sharia", label: "العلوم الشرعية" },
];

export default function Levels() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const q = trpc.admin.levelsList.useQuery();
  const [edit, setEdit] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const done = (message: string) => ({
    onSuccess: () => { setFeedback(message); setEdit(null); void utils.admin.levelsList.invalidate(); void utils.admin.levelThresholds.invalidate(); },
    onError: (error: unknown) => setFeedback(safeError(error, "تعذر تنفيذ العملية.")),
  });
  const create = trpc.admin.levelCreate.useMutation(done("أُضيف المستوى"));
  const update = trpc.admin.levelUpdate.useMutation(done("حُدّث المستوى"));
  const remove = trpc.admin.levelDelete.useMutation(done("حُذف المستوى"));
  const swap = trpc.admin.levelSwap.useMutation(done("تم تغيير الترتيب"));
  if (q.isLoading) return <AdminFrame title="المستويات"><LoadingState /></AdminFrame>;
  if (q.error) return <AdminFrame title="المستويات"><ErrorState onRetry={() => void q.refetch()} /></AdminFrame>;
  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  const field = (key: string, label: string, keyboardType: "default" | "number-pad" = "default") => <AdminInput value={String(edit?.[key] ?? "")} onChangeText={(value) => setEdit({ ...edit, [key]: keyboardType === "number-pad" ? normalizeDigits(value).replace(/\D/g, "") : value })} placeholder={label} keyboardType={keyboardType} />;
  const save = () => {
    if (!edit?.name?.trim()) { setFeedback("اسم المستوى مطلوب"); return; }
    const positive = (key: string, fallback: number, min = 0) => Math.max(min, Number(edit[key] || fallback) || fallback);
    const payload = {
      name: edit.name.trim(), nameEn: edit.nameEn || undefined, path: edit.path || "quran",
      orderIndex: positive("orderIndex", rows.length + 1, 1), sessionsCount: positive("sessionsCount", 5, 1),
      requiredJuz: positive("requiredJuz", 0), requiredSessions: positive("requiredSessions", 0),
      requiresIjazah: Boolean(edit.requiresIjazah), isHidden: Boolean(edit.isHidden),
      isActive: edit.isActive !== false, aqeedahLevelId: edit.aqeedahLevelId ? positive("aqeedahLevelId", 1, 1) : null,
    };
    if (edit.id) update.mutate({ id: edit.id, ...payload } as any);
    else create.mutate(payload as any);
  };
  return (
    <AdminFrame title="إدارة المستويات">
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      <Button label="إضافة مستوى" icon="add-outline" onPress={() => setEdit({ path: "quran", sessionsCount: 5, orderIndex: rows.length + 1, isActive: true })} />
      {!rows.length ? <EmptyState title="لا توجد مستويات" description="أنشئ مستوى جديدًا ليظهر هنا." icon="layers-outline" /> : rows.map((level, index) => (
        <Card key={level.id}>
          <Text style={[styles.name, { color: colors.text }]}>{level.orderIndex}. {level.name}</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>{PATHS.find((path) => path.value === level.path)?.label ?? level.path} · {level.sessionsCount} جلسات · {level.requiredJuz} أجزاء · {level.isActive === false ? "معطل" : "مفعل"} · {level.isHidden ? "مخفي" : "ظاهر"}</Text>
          <View style={styles.actions}>
            <Button label={level.isActive === false ? "تفعيل" : "تعطيل"} variant="secondary" onPress={() => update.mutate({ id: level.id, isActive: level.isActive === false } as any)} />
            <Button label={level.isHidden ? "إظهار" : "إخفاء"} variant="secondary" onPress={() => update.mutate({ id: level.id, isHidden: !level.isHidden } as any)} />
            {index > 0 ? <Button label="أعلى" variant="secondary" onPress={() => swap.mutate({ idA: level.id, idB: rows[index - 1].id })} /> : null}
            {index < rows.length - 1 ? <Button label="أسفل" variant="secondary" onPress={() => swap.mutate({ idA: level.id, idB: rows[index + 1].id })} /> : null}
            <Button label="تعديل" variant="secondary" onPress={() => setEdit({ ...level })} />
            <ConfirmButton label="حذف" danger onConfirm={() => remove.mutate({ id: level.id })} />
          </View>
        </Card>
      ))}
      {edit ? (
        <Card accent>
          <Text style={[styles.name, { color: colors.text }]}>{edit.id ? "تعديل مستوى" : "إضافة مستوى"}</Text>
          {field("name", "اسم المستوى *")}
          {field("nameEn", "الاسم الإنجليزي / المادة الشرعية")}
          <AdminSelect label="المسار" value={edit.path ?? "quran"} options={PATHS} onChange={(value) => setEdit({ ...edit, path: value })} />
          {field("orderIndex", "الترتيب", "number-pad")}
          {field("sessionsCount", "عدد الجلسات", "number-pad")}
          {field("requiredJuz", "الأجزاء المطلوبة", "number-pad")}
          {field("requiredSessions", "الجلسات المطلوبة", "number-pad")}
          {field("aqeedahLevelId", "معرّف متطلب العقيدة (اختياري)", "number-pad")}
          <Button label={edit.requiresIjazah ? "إلغاء متطلب الإجازة" : "يتطلب إجازة"} variant="secondary" onPress={() => setEdit({ ...edit, requiresIjazah: !edit.requiresIjazah })} />
          <Button label="حفظ" loading={create.isPending || update.isPending} onPress={save} />
          <Button label="إلغاء" variant="quiet" onPress={() => setEdit(null)} />
        </Card>
      ) : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 4 },
  actions: { gap: 7 },
  feedback: { textAlign: "right", marginBottom: 8 },
});