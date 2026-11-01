import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { AdminFrame, AdminSelect, safeError } from "../../components/admin/admin-common";
import { Badge, Button, EmptyState, ErrorState } from "../../components/ui";
import {
  ActiveFilters, AdminRow, AdminSearchBar, AdminSheet, ChoiceChips, ConfirmAction, FilterSheet, FormError, FormInput, IconAction, ListSkeleton,
  MobileActionSheet, SheetFooter, SwitchRow, useAdminFeedback, useDirtyState,
} from "../../components/admin/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";

const tabs = [
  ["pending", "بلا إسناد"], ["assigned", "مُسند"], ["answered", "بانتظار النشر"],
  ["published", "منشور"], ["rejected", "مرفوض"],
] as const;
const categories = [
  ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["muamalat", "معاملات"], ["family", "أسرة"],
  ["tajweed", "تجويد"], ["salah", "صلاة"], ["zakah", "زكاة"], ["siyam", "صيام"],
  ["hajj", "حج"], ["taharah", "طهارة"], ["qiraat", "قراءات"], ["other", "أخرى"],
] as const;
type Category = (typeof categories)[number][0];
type Mode = "assign" | "reject" | "review" | "category";

/** "منذ 5 ساعات" up to two days, then whole days, with Arabic count agreement. */
function ageLabel(hours: number): string {
  if (hours < 1) return "منذ أقل من ساعة";
  if (hours < 48) return hours === 1 ? "منذ ساعة" : hours === 2 ? "منذ ساعتين" : hours <= 10 ? `منذ ${hours} ساعات` : `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يومًا`;
}

export default function Fatwas() {
  const { colors } = useTheme();
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("pending");
  const [filters, setFilters] = useState({ priority: "", category: "", mufti: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<{ mode: Mode; row: any } | null>(null);
  const [mufti, setMufti] = useState("");
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"reject-question" | "reject-answer" | null>(null);
  const [menuFor, setMenuFor] = useState<any>(null);
  const dirty = useDirtyState(active ? { mufti, note, answer, urgent, category } : null);

  const q = trpc.admin.fatwaInbox.useQuery({
    tab,
    priority: (filters.priority || undefined) as "urgent" | "normal" | undefined,
    category: filters.category ? filters.category as Category : undefined,
    muftiId: filters.mufti || undefined,
    query: search.trim() || undefined,
  });
  const people = trpc.admin.muftisList.useQuery();
  const refresh = () => { void utils.admin.fatwaInbox.invalidate(); void utils.admin.kpis.invalidate(); };
  const close = () => { setActive(null); setFormError(null); setConfirming(null); };
  const assign = trpc.admin.fatwaAssign.useMutation({
    onSuccess: () => { notify(active?.row?.muftiId ? "تمت إعادة إسناد الفتوى بنجاح" : "تم إرسال الفتوى إلى المفتي بنجاح"); close(); refresh(); },
    onError: (e) => setFormError(safeError(e, "تعذر إرسال الفتوى إلى المفتي، حاول مرة أخرى")),
  });
  const changeCategory = trpc.admin.fatwaUpdateCategory.useMutation({
    onSuccess: () => { notify("تم تحديث تصنيف الفتوى"); close(); refresh(); },
    onError: (e) => setFormError(safeError(e, "تعذر تحديث تصنيف الفتوى، حاول مرة أخرى")),
  });
  const review = trpc.admin.fatwaReviewAnswer.useMutation({
    onSuccess: (_data, variables) => {
      notify(variables.action === "reject" ? "تم رفض الإجابة" : variables.action === "publish_public" ? "تم نشر الفتوى بنجاح" : "تم نشر الفتوى بشكل خاص");
      close(); refresh();
    },
    onError: (e) => { setConfirming(null); setFormError(safeError(e, "تعذر تنفيذ مراجعة الفتوى، حاول مرة أخرى")); },
  });
  const reject = trpc.admin.fatwaRejectQuestion.useMutation({
    onSuccess: () => { notify("تم رفض السؤال"); close(); refresh(); },
    onError: (e) => { setConfirming(null); setFormError(safeError(e, "تعذر رفض السؤال، حاول مرة أخرى")); },
  });
  const busy = assign.isPending || changeCategory.isPending || review.isPending || reject.isPending;

  const open = (mode: Mode, row: any) => {
    setFormError(null);
    setMufti(row.muftiId ?? "");
    setNote("");
    setUrgent(row.priority === "urgent");
    setAnswer(row.answer?.answerText ?? "");
    setCategory(row.category ?? "");
    setActive({ mode, row });
  };
  const rows: any[] = q.data ?? [];
  const filterCount = Object.values(filters).filter(Boolean).length;
  const muftiOptions = (people.data ?? []).map((m: any) => ({ value: String(m.teacherId), label: m.fullName }));
  const editedText = () => (active?.row.answer && answer !== active.row.answer.answerText ? answer.trim() : undefined);
  const rowActions = (row: any) => [
    ...(tab === "pending" || tab === "assigned" ? [{ key: "assign", label: tab === "pending" ? "إسناد لمفتٍ" : "إعادة إسناد", icon: "person-add-outline", onPress: () => open("assign", row) }] : []),
    ...(tab === "answered" && row.answer ? [{ key: "review", label: "مراجعة الإجابة", icon: "document-text-outline", onPress: () => open("review", row) }] : []),
    { key: "category", label: "تغيير التصنيف", icon: "pricetag-outline", onPress: () => open("category", row) },
    ...(tab === "pending" ? [{ key: "reject", label: "رفض السؤال", icon: "close-circle-outline", danger: true, onPress: () => open("reject", row) }] : []),
  ];
  const primaryAction = (row: any) => (tab === "pending" || tab === "assigned"
    ? <Button label={tab === "pending" ? "إسناد" : "إعادة إسناد"} variant="secondary" style={styles.primaryAction} onPress={() => open("assign", row)} />
    : tab === "answered" && row.answer ? <Button label="مراجعة" variant="secondary" style={styles.primaryAction} onPress={() => open("review", row)} /> : null);
  const title = active?.mode === "assign" ? (active.row.muftiId ? "إعادة إسناد الفتوى" : "إسناد الفتوى لمفتٍ")
    : active?.mode === "reject" ? "رفض السؤال" : active?.mode === "review" ? "مراجعة إجابة المفتي" : "تغيير التصنيف";

  return (
    <AdminFrame title="الفتاوى">
      <ChoiceChips label="الحالة" options={tabs.map(([value, label]) => ({ value, label }))} value={tab} onChange={(value) => setTab(value as typeof tab)} />
      <AdminSearchBar value={search} onChange={setSearch} placeholder="بحث في نص السؤال…" filterCount={filterCount} onOpenFilters={() => setFiltersOpen(true)} />
      <ActiveFilters count={filterCount} onClear={() => setFilters({ priority: "", category: "", mufti: "" })} />
      {q.isLoading || people.isLoading ? <ListSkeleton /> : q.error || people.error ? <ErrorState onRetry={() => { void q.refetch(); void people.refetch(); }} />
        : !rows.length ? <EmptyState title="لا عناصر في هذا التبويب" description={filterCount || search ? "غيّر البحث أو امسح الفلاتر." : undefined} icon="chatbubbles-outline" />
        : rows.map((r) => (
          <AdminRow key={r.id} title={r.questionText} subtitle={[r.studentName, r.categoryLabel, r.muftiName].filter(Boolean).join(" · ")}
            badges={<>
              {r.priority === "urgent" ? <Badge label="عاجل" tone="danger" /> : null}
              {r.hoursAgo != null ? <Badge label={`${ageLabel(r.hoursAgo)}${r.hoursAgo >= 48 && tab === "assigned" ? " · متجاوزة المهلة" : ""}`} tone={r.hoursAgo >= 48 && tab === "assigned" ? "danger" : "muted"} /> : null}
            </>}
            actions={<>{primaryAction(r)}<IconAction icon="ellipsis-horizontal" label={`خيارات السؤال`} onPress={() => setMenuFor(r)} /></>} />
        ))}

      <FilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} values={filters} onChange={(values) => setFilters(values as typeof filters)} resultCount={q.isLoading ? undefined : rows.length}
        groups={[
          { key: "priority", label: "الأولوية", options: [{ value: "urgent", label: "عاجل" }, { value: "normal", label: "عادي" }] },
          { key: "category", label: "التصنيف", options: categories.map(([value, label]) => ({ value, label })) },
          { key: "mufti", label: "المفتي المسند إليه", options: muftiOptions },
        ]} />
      <MobileActionSheet visible={!!menuFor} title="إجراءات السؤال" subtitle={menuFor?.questionText} actions={menuFor ? rowActions(menuFor) : []} onClose={() => setMenuFor(null)} />

      <AdminSheet visible={!!active} title={title} subtitle={active?.row.questionText} onClose={close} dirty={dirty} busy={busy} fullScreen={active?.mode === "review"}
        footer={(requestClose) => active?.mode === "assign" ? (
          <SheetFooter onSecondary={requestClose} primaryLabel={active.row.muftiId ? "تأكيد إعادة الإسناد" : "تأكيد الإسناد"} disabled={!mufti} loading={assign.isPending}
            onPrimary={() => assign.mutate({ questionId: active.row.id, muftiId: mufti, urgent, note: note.trim() || undefined })} />
        ) : active?.mode === "reject" ? (
          <SheetFooter danger onSecondary={requestClose} primaryLabel="رفض السؤال" disabled={note.trim().length < 5} loading={reject.isPending} onPrimary={() => setConfirming("reject-question")} />
        ) : active?.mode === "category" ? (
          <SheetFooter onSecondary={requestClose} primaryLabel="حفظ التصنيف" disabled={!category || category === active.row.category} loading={changeCategory.isPending}
            onPrimary={() => changeCategory.mutate({ questionId: active.row.id, category: category as Category })} />
        ) : active?.mode === "review" ? (
          <>
            <SheetFooter onSecondary={requestClose} primaryLabel="نشر عام" disabled={answer.trim().length < 50} loading={review.isPending && review.variables?.action === "publish_public"}
              onPrimary={() => review.mutate({ answerId: active.row.answer.id, action: "publish_public", editedText: editedText(), notes: note.trim() || undefined })} />
            <SheetFooter secondaryLabel="رفض الإجابة" onSecondary={() => setConfirming("reject-answer")} primaryLabel="نشر خاص" loading={review.isPending && review.variables?.action === "publish_private"}
              onPrimary={() => review.mutate({ answerId: active.row.answer.id, action: "publish_private", editedText: editedText(), notes: note.trim() || undefined })} />
          </>
        ) : null}>
        <FormError message={formError} />
        {active?.mode === "assign" ? <>
          <AdminSelect label="المفتي" value={mufti} searchable placeholder="اختر المفتي"
            options={(people.data ?? []).map((m: any) => ({ value: String(m.teacherId), label: `${m.fullName} · معلق ${m.pending}/${m.maxPending}` }))} onChange={(value) => { setMufti(value); setFormError(null); }} />
          <SwitchRow label="وسم كعاجل" helper="يظهر أولاً لدى المفتي" value={urgent} onChange={setUrgent} />
          <FormInput label="ملاحظة للمفتي" helper="اختياري" multiline value={note} onChangeText={setNote} />
        </> : null}
        {active?.mode === "reject" ? (
          <FormInput label="سبب الرفض" required helper="5 أحرف على الأقل — يصل للطالب" multiline value={note} onChangeText={(value) => { setNote(value); setFormError(null); }} />
        ) : null}
        {active?.mode === "category" ? (
          <ChoiceChips label="التصنيف" options={categories.map(([value, label]) => ({ value, label }))} value={category} onChange={setCategory}
            helper="الإسناد يتطلب مفتياً معيّناً لهذا التصنيف" />
        ) : null}
        {active?.mode === "review" ? <>
          {active.row.muftiName ? <Text style={[styles.meta, { color: colors.muted }]}>إجابة: {active.row.muftiName}</Text> : null}
          <FormInput label="نص الإجابة" required multiline helper={`${answer.trim().length} حرفاً — 50 حرفاً على الأقل للنشر العام`} value={answer} onChangeText={setAnswer} />
          <FormInput label="ملاحظات داخلية" helper="لا تظهر للطالب" multiline value={note} onChangeText={setNote} />
        </> : null}
        {/* Confirmations live inside the sheet so iOS presents them above it. */}
        <ConfirmAction visible={confirming === "reject-question"} title="رفض هذا السؤال؟" itemName={active?.row.questionText}
          impact="سيُغلق السؤال ويُبلَّغ الطالب بسبب الرفض. لا يمكن التراجع عن هذا الإجراء." confirmLabel="رفض السؤال" loading={reject.isPending}
          onCancel={() => setConfirming(null)} onConfirm={() => active && reject.mutate({ questionId: active.row.id, reason: note.trim() })} />
        <ConfirmAction visible={confirming === "reject-answer"} title="رفض إجابة المفتي؟" itemName={active?.row.muftiName ?? undefined}
          impact="ستُعاد الإجابة دون نشر، ولن تصل إلى الطالب." confirmLabel="رفض الإجابة" loading={review.isPending}
          onCancel={() => setConfirming(null)} onConfirm={() => active?.row.answer && review.mutate({ answerId: active.row.answer.id, action: "reject", notes: note.trim() || undefined })} />
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  primaryAction: { minHeight: 44, paddingHorizontal: 12 },
  meta: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "right", marginBottom: 10 },
});
