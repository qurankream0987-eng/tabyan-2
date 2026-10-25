import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, EmptyState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { TeacherScreen } from "./_components";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const TITLE_MAX = 200;
const BODY_MAX = 2000;
type Audience = { id: string; typeLabel: string; studentCount: number; availableDays?: unknown; availableTimes?: unknown };

export default function Broadcast() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const audiencesQ = trpc.teacher.broadcastAudiences.useQuery(undefined, { retry: false });
  const historyQ = trpc.teacher.broadcastHistory.useQuery(undefined, { retry: false });
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const send = trpc.teacher.sendBroadcast.useMutation({
    onSuccess: (result) => {
      setSentMessage(`تم إرسال الإشعار إلى ${result.recipientCount} طالبًا`);
      setTitle(""); setBody(""); setScheduleId(null); setConfirmOpen(false);
      void utils.teacher.broadcastHistory.invalidate();
      void utils.teacher.broadcastAudiences.invalidate();
    },
  });
  const audiences = audiencesQ.data as { allCount?: number; schedules?: Audience[] } | undefined;
  const schedules = audiences?.schedules ?? [];
  const selected = scheduleId ? schedules.find((item) => item.id === scheduleId) : undefined;
  const canSend = title.trim().length > 0 && body.trim().length > 0 && title.length <= TITLE_MAX && body.length <= BODY_MAX;

  return (
    <TeacherScreen title="الإشعارات الجماعية" error={!!audiencesQ.error || !!historyQ.error} retry={() => { void audiencesQ.refetch(); void historyQ.refetch(); }}>
      {audiencesQ.isLoading ? <LoadingState /> : <Card>
        <Text style={[styles.heading, { color: colors.text }]}>إرسال رسالة للطلاب</Text>
        <Text style={[styles.label, { color: colors.muted }]}>المستهدفون</Text>
        <Pressable onPress={() => setScheduleId(null)} style={[styles.audience, { backgroundColor: scheduleId === null ? `${colors.primary}20` : colors.input, borderColor: scheduleId === null ? colors.primary : colors.border }]}><Text style={[styles.audienceText, { color: colors.text }]}>جميع طلابي ({audiences?.allCount ?? 0} طالب)</Text></Pressable>
        {schedules.map((schedule) => <Pressable key={schedule.id} disabled={schedule.studentCount === 0} onPress={() => setScheduleId(schedule.id)} style={[styles.audience, { opacity: schedule.studentCount === 0 ? 0.5 : 1, backgroundColor: scheduleId === schedule.id ? `${colors.primary}20` : colors.input, borderColor: scheduleId === schedule.id ? colors.primary : colors.border }]}><View style={styles.audienceCopy}><Text style={[styles.audienceText, { color: colors.text }]}>{schedule.typeLabel}</Text><Text style={[styles.detail, { color: colors.muted }]}>{schedule.studentCount} طالب</Text></View></Pressable>)}
        <TextInput value={title} onChangeText={setTitle} maxLength={TITLE_MAX} placeholder="عنوان الإشعار" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
        <Text style={[styles.counter, { color: colors.muted }]}>{title.length}/{TITLE_MAX}</Text>
        <TextInput value={body} onChangeText={setBody} maxLength={BODY_MAX} multiline placeholder="نص الإشعار" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
        <Text style={[styles.counter, { color: colors.muted }]}>{body.length}/{BODY_MAX}</Text>
        <Text style={[styles.note, { color: colors.muted }]}>يصل الإشعار فقط إلى طلابك المسجلين في حلقاتك. الجمهور يحدده الخادم.</Text>
        <Button label="مراجعة الإرسال" icon="send-outline" disabled={!canSend || !scheduleId && (audiences?.allCount ?? 0) === 0} onPress={() => setConfirmOpen(true)} />
        {sentMessage ? <Text style={[styles.success, { color: colors.success }]}>{sentMessage}</Text> : null}
         {send.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(send.error, "تعذر إرسال الإشعار. حاول مرة أخرى.")}</Text> : null}
      </Card>}
      {historyQ.isLoading ? <LoadingState /> : historyQ.data?.length ? historyQ.data.map((item) => <Card key={item.id}><Text style={[styles.historyTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.detail, { color: colors.muted }]}>{item.body}</Text><Text style={[styles.detail, { color: colors.muted }]}>{item.audience === "all" ? "جميع الطلاب" : "حلقة محددة"} · {item.recipientCount} طالبًا · {String(item.createdAt)}</Text></Card>) : <EmptyState title="لا إشعارات سابقة" description="أول إشعار جماعي ترسله سيظهر هنا." />}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.backdrop}><View style={[styles.confirm, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.heading, { color: colors.text }]}>تأكيد الإرسال</Text><Text style={[styles.confirmText, { color: colors.muted }]}>سيُرسل الإشعار إلى {selected ? `${selected.typeLabel} (${selected.studentCount} طالب)` : `جميع طلابي (${audiences?.allCount ?? 0} طالب)`}</Text><Card><Text style={[styles.historyTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.detail, { color: colors.muted }]}>{body}</Text></Card><Button label="إلغاء" variant="secondary" disabled={send.isPending} onPress={() => setConfirmOpen(false)} /><Button label="تأكيد الإرسال" loading={send.isPending} disabled={send.isPending} onPress={() => send.mutate({ title: title.trim(), body: body.trim(), scheduleId: scheduleId ?? undefined })} /></View></View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "Amiri_700Bold", fontSize: 21, textAlign: "right", marginBottom: 10 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 7 },
  audience: { flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 7 },
  audienceCopy: { flex: 1 },
  audienceText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginTop: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  textarea: { minHeight: 105, paddingTop: 12 },
  counter: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "left", marginTop: 3 },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", lineHeight: 19, marginVertical: 10 },
  success: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 8 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 8 },
  historyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  detail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 5, lineHeight: 18 },
  backdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#00000066" },
  confirm: { borderWidth: 1, borderRadius: 24, padding: 18 },
  confirmText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlign: "right", lineHeight: 22, marginBottom: 10 },
});