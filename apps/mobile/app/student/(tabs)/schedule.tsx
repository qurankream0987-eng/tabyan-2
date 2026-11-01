import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, ErrorState, Icon, LoadingState, PageHero, Screen, SoftPressable } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { DAY_AR, sessionStatusLabel, sessionStatusTone } from "../../../lib/format";
import { palette, useTheme } from "../../../lib/theme";
import { toast } from "../../../lib/toast";
import { trpc } from "../../../lib/trpc";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

// مطابق لـ StudentSchedule.tsx على الموقع: الحلقات مجمّعة بأيام الأسبوع من السبت،
// والتحويل من getDay() يبقى على ترتيب JS (الأحد=0).
const DAY_ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const JS_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const pad = (n: number) => String(n).padStart(2, "0");
const timeOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function nextDateFor(day: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const delta = (JS_DAY_KEYS.indexOf(day) - now.getDay() + 7) % 7 || 7;
  const date = new Date(now);
  date.setDate(now.getDate() + delta);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

type Session = { id: string; scheduledAt: string | Date; durationMinutes: number; status: string; topic: string | null; teacherName: string; typeLabel: string };
const ACTIVE = new Set(["scheduled", "confirmed", "in_progress"]);

export default function Schedule() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const query = trpc.student.mySessions.useQuery(undefined, { enabled: !!token });
  const utils = trpc.useUtils();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [newDay, setNewDay] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const refresh = () => { void query.refetch(); void utils.student.dashboard.invalidate(); };
  const requestChange = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { toast("تم إرسال طلب التغيير", "success"); setChangeId(null); setNewDay(""); setNewTime(""); setReason(""); refresh(); },
    onError: (error) => toast(userFacingErrorMessage(error, "تعذر إرسال طلب تغيير الموعد."), "error"),
  });
  const requestCancel = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { toast("تم إرسال طلب إلغاء الحجز", "success"); setCancelId(null); refresh(); },
    onError: (error) => toast(userFacingErrorMessage(error, "تعذر إرسال طلب الإلغاء."), "error"),
  });
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  const rows = (Array.isArray(query.data) ? query.data : []) as unknown as Session[];
  const active = rows.filter((s) => ACTIVE.has(s.status)).map((s) => { const date = new Date(s.scheduledAt); return { ...s, dayOfWeek: JS_DAY_KEYS[date.getDay()] ?? "", timeSlot: timeOf(date) }; });
  const grouped = DAY_ORDER.filter((d) => active.some((s) => s.dayOfWeek === d));
  const tint = isDark ? `${palette.gold}1A` : `${palette.burgundy}12`;
  const onTimePicked = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS !== "ios") setPickerOpen(false);
    if (event.type === "dismissed" || !picked) return;
    setNewTime(timeOf(picked));
  };
  const pickerValue = (() => { const [h, m] = newTime.split(":").map(Number); const d = new Date(); d.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0); return d; })();
  const closeChange = () => { setChangeId(null); setPickerOpen(false); };

  return (
    <Screen>
      <PageHero title="جدولي الأسبوعي" />
      {active.length === 0 ? (
        <Card style={[styles.emptyCard, { borderColor: isDark ? `${palette.gold}66` : `${palette.burgundy}55` }]}>
          <View style={[styles.emptyBubble, { backgroundColor: tint }]}><Icon name="calendar-outline" size={36} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>لا حلقات بعد</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>ابدأ بحجز موعدك الأول لبدء رحلة التعلم</Text>
          <Button label="سجّل الآن" icon="add" onPress={() => router.push("/student/booking")} />
        </Card>
      ) : grouped.map((day) => (
        <View key={day} style={styles.dayGroup}>
          <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.dayIcon, { backgroundColor: tint }]}><Icon name="calendar-outline" size={14} color={colors.primary} /></View>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{DAY_AR[day]}</Text>
          </View>
          {active.filter((s) => s.dayOfWeek === day).map((s) => (
            <Card key={s.id}>
              <View style={styles.sessionRow}>
                <View style={[styles.timeBox, { backgroundColor: isDark ? `${palette.gold}0D` : `${palette.burgundy}0D`, borderColor: isDark ? `${palette.gold}1A` : `${palette.burgundy}1A` }]}><Text style={[styles.timeText, { color: colors.primary }]}>{s.timeSlot}</Text></View>
                <View style={styles.sessionBody}>
                  <Text numberOfLines={1} style={[styles.teacher, { color: colors.text }]}>{s.teacherName}</Text>
                  <View style={styles.chips}>
                    <View style={[styles.chip, { backgroundColor: colors.input }]}><Text style={[styles.chipText, { color: colors.muted }]}>{s.typeLabel}</Text></View>
                    <View style={[styles.chip, { backgroundColor: colors.input }]}><Text style={[styles.chipText, { color: colors.muted }]}>{s.durationMinutes} د</Text></View>
                    {s.topic ? <View style={[styles.chip, { backgroundColor: colors.input }]}><Text numberOfLines={1} style={[styles.chipText, { color: colors.muted }]}>{s.topic}</Text></View> : null}
                  </View>
                </View>
                <Badge label={sessionStatusLabel(s.status)} tone={s.status === "in_progress" ? "live" : sessionStatusTone(s.status)} />
              </View>
              {s.status === "in_progress" ? <Button label="دخول الحلقة" icon="videocam-outline" style={styles.enter} onPress={() => router.push(`/student/session/${s.id}` as never)} /> : (
                <View style={styles.actions}>
                  <SoftPressable accessibilityRole="button" onPress={() => { setChangeId(s.id); setNewDay(s.dayOfWeek); setNewTime(s.timeSlot); setReason(""); }} style={[styles.action, { backgroundColor: isDark ? `${palette.gold}0D` : `${palette.burgundy}0D` }]}><Text style={[styles.actionText, { color: colors.primary }]}>تغيير</Text></SoftPressable>
                  <SoftPressable accessibilityRole="button" onPress={() => setCancelId(s.id)} style={[styles.action, { backgroundColor: `${colors.danger}0D` }]}><Text style={[styles.actionText, { color: colors.danger }]}>إلغاء</Text></SoftPressable>
                </View>
              )}
            </Card>
          ))}
        </View>
      ))}

      {active.length > 0 ? (
        <View style={[styles.instructions, { borderTopColor: colors.border }]}>
          <Card style={{ backgroundColor: isDark ? `${palette.gold}0D` : `${palette.burgundy}0D`, borderColor: "transparent", shadowOpacity: 0, elevation: 0 }}>
            <View style={styles.instructionsRow}>
              <Icon name="shield-checkmark-outline" size={20} color={`${colors.primary}80`} />
              <View style={styles.instructionsBody}>
                <Text style={[styles.instructionsTitle, { color: colors.text }]}>تعليمات المواعيد الثابتة</Text>
                {["المواعيد أعلاه ثابتة وتتكرر أسبوعياً حتى انتهائك من المستوى.", "يُسمح بتغيير الموعد مرة واحدة شهرياً وفق الأوقات المتاحة للمعلم.", "إلغاء الموعد نهائياً يتطلب مراجعة من الإدارة لتأكيد الإلغاء."].map((line) => (
                  <Text key={line} style={[styles.instructionsText, { color: colors.muted }]}>• {line}</Text>
                ))}
              </View>
            </View>
          </Card>
          <Button label="احجز حلقة جديدة" variant="secondary" icon="add-circle-outline" onPress={() => router.push("/student/booking")} />
        </View>
      ) : null}

      <Modal visible={!!cancelId} transparent animationType="slide" onRequestClose={() => setCancelId(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={() => setCancelId(null)} />
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.cancelIcon, { backgroundColor: `${colors.danger}1A` }]}><Icon name="close" size={26} color={colors.danger} /></View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>تأكيد الإلغاء</Text>
            <Text style={[styles.modalText, { color: colors.muted }]}>هل أنت متأكد من رغبتك في إلغاء هذا الحجز الأسبوعي؟ لا يمكن التراجع عن هذا الإجراء إلا بطلب جديد.</Text>
            <View style={styles.modalActions}>
              <Button style={styles.flex} label="تأكيد الإلغاء" variant="danger" loading={requestCancel.isPending} disabled={requestCancel.isPending} onPress={() => { if (cancelId) requestCancel.mutate({ sessionId: cancelId, requestedNewTime: null, reason: "cancel" }); }} />
              <Button style={styles.flex} label="تراجع" variant="secondary" onPress={() => setCancelId(null)} />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!changeId} transparent animationType="slide" onRequestClose={closeChange}>
        <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
          <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={closeChange} />
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>طلب تغيير الموعد</Text>
              <Text style={[styles.label, { color: colors.muted }]}>اليوم الجديد</Text>
              <View style={styles.dayGrid}>
                {DAY_ORDER.map((d) => <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: newDay === d }} onPress={() => setNewDay(d)} style={[styles.dayPill, { backgroundColor: newDay === d ? colors.primary : colors.input }]}><Text style={[styles.dayPillText, { color: newDay === d ? colors.primaryText : colors.text }]}>{DAY_AR[d]}</Text></Pressable>)}
              </View>
              <Text style={[styles.label, { color: colors.muted }]}>الوقت الجديد</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="اختيار الوقت" onPress={() => setPickerOpen((v) => !v)} style={[styles.input, styles.timeInput, { borderColor: colors.border, backgroundColor: colors.input }]}>
                <Text style={[styles.timeValue, { color: newTime ? colors.text : colors.muted }]}>{newTime || "اختر الوقت"}</Text>
                <Icon name="time-outline" size={18} color={colors.muted} />
              </Pressable>
              {pickerOpen ? <DateTimePicker value={pickerValue} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onTimePicked} /> : null}
              <Text style={[styles.label, { color: colors.muted }]}>السبب (اختياري)</Text>
              <TextInput value={reason} onChangeText={setReason} multiline maxLength={500} placeholder="اذكر سبب طلب التغيير (مثل: تعارض مع وقت الدوام)..." placeholderTextColor={colors.muted} style={[styles.input, styles.reason, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />
              <View style={styles.modalActions}>
                <Button style={styles.flex} label="إرسال الطلب" loading={requestChange.isPending} disabled={!newDay || !/^\d{2}:\d{2}$/.test(newTime) || requestChange.isPending} onPress={() => { if (changeId) requestChange.mutate({ sessionId: changeId, requestedNewTime: nextDateFor(newDay, newTime), reason: reason.trim() || "change" }); }} />
                <Button style={styles.flex} label="تراجع" variant="secondary" onPress={closeChange} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyCard: { borderStyle: "dashed", borderWidth: 1.5, alignItems: "center", paddingVertical: 34, paddingHorizontal: 20, gap: 8 },
  emptyBubble: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 36, textAlign: "center" },
  emptyText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 21, textAlign: "center", marginBottom: 12 },
  dayGroup: { marginBottom: 10 },
  dayHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderBottomWidth: 1, paddingBottom: 10, marginBottom: 12 },
  dayIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 23 },
  sessionRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  timeBox: { width: 50, height: 48, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, writingDirection: "ltr" },
  sessionBody: { flex: 1, minWidth: 0 },
  teacher: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right", marginBottom: 4 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, maxWidth: "100%" },
  chipText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17 },
  enter: { marginTop: 2 },
  actions: { flexDirection: "row-reverse", gap: 8 },
  action: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  instructions: { marginTop: 14, paddingTop: 18, borderTopWidth: 1, gap: 4 },
  instructionsRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 },
  instructionsBody: { flex: 1 },
  instructionsTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right", marginBottom: 4 },
  instructionsText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, lineHeight: 21, textAlign: "right" },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  sheetScroll: { gap: 10 },
  cancelIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, lineHeight: 28, textAlign: "center" },
  modalText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "center" },
  modalActions: { flexDirection: "row-reverse", gap: 8, marginTop: 6 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 20, textAlign: "right" },
  dayGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  dayPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dayPillText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, textAlign: "right" },
  timeInput: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  timeValue: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, writingDirection: "ltr" },
  reason: { minHeight: 72, paddingVertical: 10, textAlignVertical: "top" },
});
