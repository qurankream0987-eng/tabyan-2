import { useState } from "react";
import { DAY_AR, formatDateTime } from "../../lib/format";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, EmptyState, Icon, LoadingState, PageHero, SectionTitle, SoftPressable } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "../../components/teacher/teacher-screen";
import { palette, useTheme } from "../../lib/theme";
import { toast } from "../../lib/toast";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const TITLE_MAX = 200;
const BODY_MAX = 2000;
type Audience = { id: string; typeLabel: string; studentCount: number; availableDays?: unknown; availableTimes?: unknown };

const asStrArr = (value: unknown): string[] => (Array.isArray(value) ? (value as unknown[]).map(String) : []);
const fmtDays = (days: unknown) => asStrArr(days).map((day) => DAY_AR[day] ?? day).join("، ");

export default function Broadcast() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const audiencesQ = trpc.teacher.broadcastAudiences.useQuery(undefined, { retry: false });
  const historyQ = trpc.teacher.broadcastHistory.useQuery(undefined, { retry: false });
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const send = trpc.teacher.sendBroadcast.useMutation({
    onSuccess: (result) => {
      toast(`أُرسل الإشعار إلى ${result.recipientCount} طالباً`, "success");
      setTitle(""); setBody(""); setScheduleId(null); setConfirmOpen(false);
      void utils.teacher.broadcastHistory.invalidate();
      void utils.teacher.broadcastAudiences.invalidate();
    },
    onError: (cause) => { setConfirmOpen(false); toast(userFacingErrorMessage(cause, "تعذر إرسال الإشعار. حاول مرة أخرى."), "error"); },
  });
  const audiences = audiencesQ.data as { allCount?: number; schedules?: Audience[] } | undefined;
  const schedules = audiences?.schedules ?? [];
  const selected = scheduleId ? schedules.find((item) => item.id === scheduleId) : undefined;
  const selectedLabel = selected ? `${selected.typeLabel} (${selected.studentCount} طالب)` : `جميع طلابي (${audiences?.allCount ?? 0} طالب)`;
  const canSend = title.trim().length > 0 && body.trim().length > 0 && title.length <= TITLE_MAX && body.length <= BODY_MAX;

  const review = () => {
    if (!title.trim()) { toast("العنوان مطلوب", "error"); return; }
    if (!body.trim()) { toast("نص الإشعار مطلوب", "error"); return; }
    setConfirmOpen(true);
  };

  const audienceRow = (key: string, active: boolean, disabled: boolean, onPress: () => void, label: string, detail?: string, count?: string) => (
    <SoftPressable key={key} accessibilityRole="radio" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[styles.audience, { opacity: disabled ? 0.6 : 1, backgroundColor: active ? `${colors.primary}1A` : colors.input, borderColor: active ? `${colors.primary}66` : colors.border }]}>
      <View style={[styles.radio, { borderColor: active ? colors.primary : colors.muted, backgroundColor: active ? colors.primary : "transparent" }]} />
      <View style={styles.audienceCopy}>
        <Text numberOfLines={1} style={[styles.audienceText, { color: colors.text }]}>{label}</Text>
        {detail ? <Text numberOfLines={1} style={[styles.detail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      {count ? <Badge label={count} tone={disabled ? "muted" : "gold"} /> : <Icon name="people-outline" size={18} color={palette.gold} />}
    </SoftPressable>
  );

  return (
    <TeacherScreen title="الإشعارات الجماعية" error={!!audiencesQ.error || !!historyQ.error} retry={() => { void audiencesQ.refetch(); void historyQ.refetch(); }}>
      <PageHero icon="notifications-outline" title="الإشعارات الجماعية" subtitle="أرسل إشعاراً لطلابك المسجلين في حلقاتك" />
      {audiencesQ.isLoading ? <LoadingState /> : <Card>
        <Text style={[styles.label, { color: colors.primary }]}>المستهدفون</Text>
        {audienceRow("all", scheduleId === null, false, () => setScheduleId(null), `جميع طلابي (${audiences?.allCount ?? 0} طالب)`)}
        {schedules.map((schedule) => {
          const days = fmtDays(schedule.availableDays);
          const times = asStrArr(schedule.availableTimes).join("، ");
          const detail = [days, times].filter(Boolean).join(" — ");
          const disabled = schedule.studentCount === 0;
          return audienceRow(schedule.id, scheduleId === schedule.id, disabled, () => setScheduleId(schedule.id), schedule.typeLabel, detail || undefined, disabled ? "لا طلاب" : `${schedule.studentCount} طالب`);
        })}
        <Text style={[styles.label, styles.fieldLabel, { color: colors.primary }]}>العنوان</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={TITLE_MAX} placeholder="عنوان الإشعار" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
        <Text style={[styles.counter, { color: colors.muted }]}>{title.length}/{TITLE_MAX}</Text>
        <Text style={[styles.label, styles.fieldLabel, { color: colors.primary }]}>نص الإشعار</Text>
        <TextInput value={body} onChangeText={setBody} maxLength={BODY_MAX} multiline placeholder="اكتب رسالتك لطلابك…" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
        <Text style={[styles.counter, { color: colors.muted }]}>{body.length}/{BODY_MAX}</Text>
        <View style={[styles.note, { backgroundColor: `${palette.gold}14`, borderColor: `${palette.gold}33` }]}><Icon name="notifications-outline" size={15} color={palette.gold} /><Text style={[styles.noteText, { color: colors.muted }]}>يصل الإشعار فقط إلى طلابك المسجلين في حلقاتك — لا يمكن إرساله لغيرهم.</Text></View>
        <Button label={send.isPending ? "جارٍ الإرسال…" : "إرسال الإشعار"} icon="send-outline" disabled={!canSend || send.isPending} onPress={review} />
      </Card>}
      <SectionTitle title="الإشعارات المرسلة" />
      {historyQ.isLoading ? <LoadingState /> : historyQ.data?.length ? historyQ.data.map((item) => (
        <Card key={item.id}>
          <Text numberOfLines={1} style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text>
          <Text numberOfLines={2} style={[styles.detail, { color: colors.muted }]}>{item.body}</Text>
          <View style={styles.historyMeta}>
            <Badge label={item.audience === "all" ? "الكل" : "حلقة محددة"} tone={item.audience === "all" ? "gold" : "info"} />
            <Badge label={`${item.recipientCount} طالباً`} tone="muted" />
            <Text style={[styles.historyDate, { color: colors.muted }]}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </Card>
      )) : <EmptyState title="لا إشعارات سابقة" description="أول إشعار جماعي ترسله سيظهر هنا" />}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.confirm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heading, { color: colors.primary }]}>تأكيد الإرسال</Text>
            <Text style={[styles.confirmText, { color: colors.muted }]}>سيُرسل الإشعار إلى: <Text style={[styles.confirmStrong, { color: colors.text }]}>{selectedLabel}</Text></Text>
            <View style={[styles.previewBox, { backgroundColor: colors.input }]}><Text numberOfLines={1} style={[styles.historyTitle, { color: colors.text }]}>{title}</Text><Text numberOfLines={3} style={[styles.detail, { color: colors.muted }]}>{body}</Text></View>
            <View style={styles.confirmActions}>
              <Button label="إلغاء" variant="secondary" style={styles.confirmButton} disabled={send.isPending} onPress={() => setConfirmOpen(false)} />
              <Button label={send.isPending ? "جارٍ الإرسال…" : "إرسال"} icon="send-outline" style={styles.confirmButton} loading={send.isPending} disabled={send.isPending} onPress={() => send.mutate({ title: title.trim(), body: body.trim(), scheduleId: scheduleId ?? undefined })} />
            </View>
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "Amiri_700Bold", fontSize: 21, lineHeight: 30, textAlign: "center", marginBottom: 10 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", marginBottom: 7 },
  fieldLabel: { marginTop: 12, marginBottom: 0 },
  audience: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 7 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  audienceCopy: { flex: 1, minWidth: 0 },
  audienceText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginTop: 6, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  textarea: { minHeight: 105, paddingTop: 12, textAlignVertical: "top" },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "left", marginTop: 3 },
  note: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 16, padding: 12, marginVertical: 12 },
  noteText: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", lineHeight: 19 },
  historyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4, lineHeight: 18 },
  historyMeta: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 10 },
  historyDate: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, marginRight: "auto" },
  backdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#00000066" },
  confirm: { borderWidth: 1, borderRadius: 24, padding: 18 },
  confirmText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlign: "center", lineHeight: 22, marginBottom: 10 },
  confirmStrong: { fontFamily: "IBMPlexSansArabic_700Bold" },
  previewBox: { borderRadius: 16, padding: 12, marginBottom: 12 },
  confirmActions: { flexDirection: "row-reverse", gap: 8 },
  confirmButton: { flex: 1 },
});
