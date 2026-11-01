import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFrame, ConfirmButton } from "../../components/admin/admin-common";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from "../../components/ui";
import { LibraryMediaPlayer } from "../../components/library/library-media-player";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { AdminRow, AdminSheet, FormError, useAdminFeedback } from "../../components/admin/admin-ui";

type Promotion = { id: string; studentName?: string; fromName?: string; toName?: string; fromLevelName?: string; toLevelName?: string; videoUrl?: string; status?: string; hoursAgo?: number; };

export default function Promotions() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const notify = useAdminFeedback();
  // Same source as Web: pending requests plus the reviewed history.
  const q = trpc.admin.promotionsList.useQuery(undefined);
  const review = trpc.admin.promotionReview.useMutation();
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const rows: Promotion[] = Array.isArray(q.data) ? q.data as Promotion[] : ((q.data as { items?: Promotion[] } | undefined)?.items ?? []);
  const pending = rows.filter((row) => !row.status || row.status === "pending");
  const reviewed = rows.filter((row) => row.status && row.status !== "pending");
  const close = () => { setSelected(null); setNote(""); setError(""); };
  const run = async (approve: boolean) => {
    if (!selected || review.isPending) return;
    try {
      await review.mutateAsync({ requestId: selected.id, approve, notes: note.trim() || undefined });
      close(); notify("تمت المراجعة — أُشعر الطالب"); void q.refetch(); void utils.admin.kpis.invalidate(); void utils.admin.promotionsPendingList.invalidate();
    } catch (error) { setError(userFacingErrorMessage(error, "تعذر تنفيذ المراجعة.")); }
  };
  const levelText = (row: Promotion) => `${row.fromName ?? row.fromLevelName ?? ""}${(row.fromName ?? row.fromLevelName) && (row.toName ?? row.toLevelName) ? " ← " : ""}${row.toName ?? row.toLevelName ?? ""}`;
  return (
    <AdminFrame title="طلبات الترقية">
      <Text style={[styles.description, { color: colors.muted }]}>شاهد فيديو التلاوة (60 ثانية) وقرر — التوصيات من المعلمين استرشادية فقط</Text>
      <SectionTitle title={`بانتظار المراجعة (${pending.length})`} />
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState onRetry={() => void q.refetch()} message={userFacingErrorMessage(q.error, "تعذر تحميل الطلبات.")} /> : !pending.length ? <EmptyState title="لا طلبات معلقة" description="ستظهر طلبات الترقية الجديدة هنا." icon="trending-up" /> : pending.map((row) => (
        <Card key={row.id} accent>
          <View style={styles.row}><View style={styles.rowBody}><Text style={[styles.name, { color: colors.text }]}>{row.studentName ?? "طالب"}</Text><Text style={[styles.note, { color: colors.muted }]}>{levelText(row)}</Text><Text style={[styles.note, { color: colors.muted }]}>منذ {Math.max(0, Math.round(row.hoursAgo ?? 0))} ساعة</Text></View><Button label="مراجعة" icon="video" onPress={() => { setSelected(row); setNote(""); }} /></View>
        </Card>
      ))}
      {reviewed.length ? <>
        <SectionTitle title={`سجل المراجعات (${reviewed.length})`} />
        {reviewed.map((row) => (
          <AdminRow key={row.id} title={row.studentName ?? "طالب"} subtitle={levelText(row)} muted
            badges={<Badge label={row.status === "approved" ? "مقبول" : row.status === "rejected" ? "مرفوض" : String(row.status)} tone={row.status === "approved" ? "success" : row.status === "rejected" ? "danger" : "muted"} />} />
        ))}
      </> : null}
      <Button label="تحديث البيانات" variant="secondary" icon="refresh" onPress={() => void q.refetch()} />
      <AdminSheet visible={!!selected} title="مراجعة طلب ترقية" subtitle={selected?.studentName} onClose={close} dirty={!!note} busy={review.isPending}
        footer={<View style={{ gap: 8 }}>
          <ConfirmButton primary label="ترقية" icon="check" loading={review.isPending} title="اعتماد الترقية؟" itemName={selected?.studentName} impact="يُنقل الطالب فوراً إلى المستوى التالي ويصله إشعار «مبروك!»." onConfirm={() => void run(true)} />
          <ConfirmButton label="رفض" danger loading={review.isPending} title="رفض طلب الترقية؟" itemName={selected?.studentName} impact="سيبقى الطالب في مستواه الحالي ويُبلَّغ بالملاحظات المكتوبة." onConfirm={() => void run(false)} />
        </View>}>
          <FormError message={error} />
          <Text style={[styles.title, { color: colors.primary }]}>مراجعة طلب ترقية</Text><Text style={[styles.modalName, { color: colors.text }]}>{selected?.studentName}</Text><Text style={[styles.note, { color: colors.muted }]}>{selected ? levelText(selected) : ""}</Text>
          {selected?.videoUrl?.startsWith("teacher_request_") ? <Text style={[styles.note, { color: colors.muted }]}>طلب ترقية مرفوع من المعلم — لا يوجد فيديو مرفق.</Text> : selected?.videoUrl ? <LibraryMediaPlayer source={selected.videoUrl} contentType="video" /> : <Text style={[styles.note, { color: colors.muted }]}>لا يوجد فيديو مرفق</Text>}
          <TextInput value={note} onChangeText={setNote} placeholder="ملاحظات المراجعة…" placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
          <Text style={[styles.note, { color: colors.muted }]}>عند القبول: يُنقل الطالب فوراً ويصله إشعار «مبروك!»</Text>
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21, marginBottom: 6 },
  feedback: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "right", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBody: { flex: 1, alignItems: "flex-end" },
  name: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 20 },
  title: { fontFamily: "Amiri_700Bold", fontSize: 23, textAlign: "center", marginBottom: 8 },
  modalName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "center" },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  modalContent: { padding: 20, gap: 12 },
  close: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  input: { minHeight: 84, borderWidth: 1, borderRadius: 16, padding: 13, fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right" },
});