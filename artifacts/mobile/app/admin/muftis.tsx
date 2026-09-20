import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, AdminSelect, ConfirmButton, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const cats = [
  ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["muamalat", "معاملات"], ["family", "أسرة"],
  ["tajweed", "تجويد"], ["salah", "صلاة"], ["zakah", "زكاة"], ["siyam", "صيام"],
  ["hajj", "حج"], ["taharah", "طهارة"], ["qiraat", "قراءات"], ["other", "أخرى"],
] as const;

export default function Muftis() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const list = trpc.admin.muftisList.useQuery();
  const stats = trpc.admin.muftisStats.useQuery();
  const teachers = trpc.admin.teachersList.useQuery();
  const [id, setId] = useState("");
  const [selectedCats, setCats] = useState<string[]>([]);
  const [max, setMax] = useState("20");
  const [feedback, setFeedback] = useState("");

  const invalidate = () => {
    void list.refetch();
    void utils.admin.muftisStats.invalidate();
    void teachers.refetch();
  };
  const assign = trpc.admin.muftiAssign.useMutation({
    onSuccess: () => {
      setFeedback("تم تعيين المفتي بنجاح");
      setId("");
      setCats([]);
      setMax("20");
      invalidate();
    },
    onError: (e: unknown) => setFeedback(safeError(e, "تعذر تعيين المفتي، حاول مرة أخرى.")),
  });
  const unassign = trpc.admin.muftiUnassign.useMutation({
    onSuccess: () => {
      setFeedback("تم إلغاء تعيين المفتي");
      invalidate();
    },
    onError: (e: unknown) => setFeedback(safeError(e, "تعذر إلغاء تعيين المفتي، حاول مرة أخرى.")),
  });

  if (list.isLoading || teachers.isLoading || stats.isLoading) {
    return <AdminFrame title="المفتون"><LoadingState /></AdminFrame>;
  }
  if (list.error || teachers.error || stats.error) {
    return <AdminFrame title="المفتون"><ErrorState onRetry={() => { void list.refetch(); void teachers.refetch(); void stats.refetch(); }} /></AdminFrame>;
  }

  const available: any[] = (teachers.data ?? []).filter((t: any) => !t.isMufti && t.kycStatus === "approved");
  const teacherOptions = available.map((teacher) => ({
    value: String(teacher.teacherId),
    label: String(teacher.name ?? teacher.fullName ?? teacher.teacherId),
  }));
  const statRows = Array.isArray(stats.data)
    ? stats.data
    : Object.entries((stats.data ?? {}) as Record<string, unknown>).map(([label, value]) => ({ label, value }));

  return <AdminFrame title="المفتون">
    <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text>
    <Card>
      <Text style={[styles.heading, { color: colors.text }]}>إحصاءات المفتين</Text>
      {statRows.length
        ? statRows.slice(0, 4).map((row: any) => (
          <View key={String(row.label ?? row.key)} style={styles.statRow}>
            <Text style={[styles.muted, { color: colors.muted }]}>{String(row.label ?? row.key)}</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{String(row.value ?? row.count ?? 0)}</Text>
          </View>
        ))
        : <Text style={[styles.muted, { color: colors.muted }]}>لا توجد إحصاءات متاحة</Text>}
    </Card>

    <Card>
      <Text style={[styles.heading, { color: colors.text }]}>تعيين أو تحديث اختصاص مفتي</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>المعلمون الموثقون غير المعيّنين</Text>
      <AdminSelect
        label="المعلم"
        value={id}
        options={teacherOptions}
        onChange={setId}
        placeholder="اختر المعلم"
        searchable
        disabled={assign.isPending}
      />
      <Text style={[styles.muted, { color: colors.muted }]}>التصنيفات التي يمكنه استقبالها</Text>
      <View style={styles.category}>
        {cats.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedCats.includes(key) }}
            disabled={assign.isPending}
            onPress={() => setCats(selectedCats.includes(key) ? selectedCats.filter((x) => x !== key) : [...selectedCats, key])}
            style={[styles.chip, { backgroundColor: selectedCats.includes(key) ? colors.primary : colors.input, opacity: assign.isPending ? 0.5 : 1 }]}
          >
            <Text style={{ color: selectedCats.includes(key) ? colors.primaryText : colors.text, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <AdminInput
        value={max}
        onChangeText={(value) => setMax(normalizeDigits(value).replace(/\D/g, ""))}
        keyboardType="number-pad"
        placeholder="الحد الأقصى للأسئلة المعلقة (1-50)"
      />
      <Button
        label="حفظ التعيين"
        disabled={!id || !selectedCats.length || !Number.isInteger(Number(max)) || Number(max) < 1 || Number(max) > 50 || assign.isPending}
        loading={assign.isPending}
        onPress={() => assign.mutate({ teacherId: id, categories: selectedCats as (typeof cats)[number][0][], maxPending: Number(max) })}
      />
    </Card>

    {!list.data?.length
      ? <EmptyState title="لا مفتين بعد" />
      : list.data.map((m: any) => (
        <Card key={m.teacherId}>
          <Text style={[styles.heading, { color: colors.text }]}>{m.fullName}</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>معلق: {m.pending}/{m.maxPending} · أجاب: {m.answered} · تقييم {m.avgStars}</Text>
          <Text style={[styles.muted, { color: colors.text }]}>
            {(m.categories ?? []).map((c: any) => c.categoryLabel ?? cats.find(([key]) => key === c.category)?.[1] ?? c.category).join("، ")}
          </Text>
          <ConfirmButton
            label="إلغاء التعيين"
            danger
            disabled={unassign.isPending}
            loading={unassign.isPending}
            onConfirm={() => unassign.mutate({ teacherId: m.teacherId })}
          />
        </Card>
      ))}
  </AdminFrame>;
}

const styles = StyleSheet.create({
  heading: { textAlign: "right", fontSize: 17, fontFamily: "IBMPlexSansArabic_700Bold" },
  muted: { textAlign: "right", fontSize: 12, marginVertical: 5, fontFamily: "IBMPlexSansArabic_400Regular" },
  category: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginVertical: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  feedback: { textAlign: "right", marginBottom: 8, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  statRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 7 },
  statValue: { fontFamily: "Amiri_700Bold", fontSize: 20 },
});