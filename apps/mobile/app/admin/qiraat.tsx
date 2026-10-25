import { useState } from "react";
import { Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFrame, ConfirmButton } from "./_common";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from "../../components/ui";
import { AdminSheet, FormError, useAdminFeedback } from "../../components/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/library-media";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

type Certificate = { id: string; studentName?: string; certificateUrl?: string; status?: string; hoursAgo?: number; createdAt?: string | Date | null; };

export default function Qiraat() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const utils = trpc.useUtils();
  const notify = useAdminFeedback();
  const q = trpc.admin.qiraatList.useQuery(undefined);
  const review = trpc.admin.qiraatReview.useMutation();
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openError, setOpenError] = useState("");
  const rows: Certificate[] = Array.isArray(q.data) ? q.data as Certificate[] : ((q.data as { items?: Certificate[] } | undefined)?.items ?? []);
  const close = () => { setSelected(null); setNote(""); setOpenError(""); };
  const timestamp = (value: Certificate["createdAt"]) => value ? new Date(value).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "";
  const openCertificate = async () => {
    const target = selected?.certificateUrl ? resolveLibraryAsset(selected.certificateUrl, token) : "";
    if (!target) { setOpenError("تعذر فتح الشهادة. تحقق من الاتصال وحاول مرة أخرى."); return; }
    try { if (!(await Linking.canOpenURL(target))) throw new Error("unsupported"); await Linking.openURL(target); }
    catch { setOpenError("تعذر فتح الشهادة. تحقق من الاتصال وحاول مرة أخرى."); }
  };
  const run = async (approve: boolean) => {
    if (!selected || review.isPending) return;
    if (!approve && note.trim().length < 10) {
      setFeedback("اكتب ملاحظة رفض من 10 أحرف على الأقل.");
      return;
    }
    try {
      await review.mutateAsync({ certId: selected.id, approve, notes: note.trim() || undefined });
      close(); setFeedback(""); notify("تمت المراجعة"); void q.refetch(); void utils.admin.kpis.invalidate();
    } catch (error) { setFeedback(userFacingErrorMessage(error, "تعذر تنفيذ المراجعة.")); }
  };
  return (
    <AdminFrame title="شهادات الإجازة">
      <Text style={[styles.description, { color: colors.muted }]}>بوابة مسار القراءات — لا دخول إلا بإجازة الشاطبية موثّقة</Text>
      {feedback ? <Text style={[styles.feedback, { color: feedback.startsWith("تعذر") ? colors.danger : colors.success }]}>{feedback}</Text> : null}
      <SectionTitle title={`الشهادات (${rows.length})`} />
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState onRetry={() => void q.refetch()} message={userFacingErrorMessage(q.error, "تعذر تحميل الشهادات.")} /> : !rows.length ? <EmptyState title="لا شهادات مرفوعة" description="ستظهر الشهادات عند إرسالها للمراجعة." icon="document-text-outline" /> : rows.map((row) => (
        <Card key={row.id}>
          <View style={styles.row}><View style={styles.body}><Text style={[styles.name, { color: colors.text }]}>{row.studentName ?? "طالب"}</Text><Text style={[styles.note, { color: colors.muted }]}>{timestamp(row.createdAt)}{row.hoursAgo != null ? ` · منذ ${Math.max(0, Math.round(row.hoursAgo))} س` : ""}</Text><Badge label={row.status === "approved" ? "مقبول" : row.status === "rejected" ? "مرفوض" : "قيد المراجعة"} tone={row.status === "approved" ? "success" : row.status === "rejected" ? "danger" : "gold"} /></View>{(!row.status || row.status === "pending") ? <Button label="مراجعة" icon="document-text-outline" onPress={() => { setSelected(row); setNote(""); setOpenError(""); setFeedback(""); }} /> : null}</View>
        </Card>
      ))}
      <Button label="تحديث البيانات" variant="secondary" icon="refresh-outline" onPress={() => void q.refetch()} />
      <AdminSheet visible={!!selected} title="مراجعة شهادة الإجازة" subtitle={selected?.studentName} onClose={close} busy={review.isPending} dirty={!!note}
        footer={<View style={{ gap: 8 }}>
          <ConfirmButton primary label="اعتماد" icon="checkmark-circle-outline" loading={review.isPending} title="اعتماد شهادة الإجازة؟" itemName={selected?.studentName} impact="ستُعتمد الإجازة وتظهر في ملف الطالب." onConfirm={() => void run(true)} />
          <ConfirmButton label="رفض" danger disabled={note.trim().length < 10} loading={review.isPending} title="رفض شهادة الإجازة؟" itemName={selected?.studentName} impact="ستُرفض الشهادة ويصل الطالب سبب الرفض المكتوب." onConfirm={() => void run(false)} />
        </View>}>
          <FormError message={feedback} />
          <Text style={[styles.title, { color: colors.primary }]}>مراجعة شهادة الإجازة</Text><Text style={[styles.modalName, { color: colors.text }]}>{selected?.studentName}</Text>
          {selected?.certificateUrl ? <Button label="فتح الشهادة للمعاينة" variant="secondary" icon="document-text-outline" onPress={() => void openCertificate()} /> : <Text style={[styles.note, { color: colors.muted }]}>لا توجد شهادة مرفقة</Text>}
          {openError ? <Text style={[styles.note, { color: colors.danger }]}>{openError}</Text> : null}
          <TextInput value={note} onChangeText={setNote} placeholder="ملاحظات (10 أحرف على الأقل عند الرفض)…" placeholderTextColor={colors.muted} multiline maxLength={500} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21, marginBottom: 6 },
  feedback: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "right", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { flex: 1, alignItems: "flex-end" },
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