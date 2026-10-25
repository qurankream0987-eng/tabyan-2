import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, FeatureTile, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";
import { confirmAr } from "../../../lib/confirm";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_LABELS: Record<string, string> = { sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت" };

function nextDateFor(day: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const target = DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number]);
  const delta = (target - now.getDay() + 7) % 7 || 7;
  const date = new Date(now);
  date.setDate(now.getDate() + delta);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export default function Schedule() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const query = trpc.student.mySessions.useQuery(undefined, { enabled: !!token });
  const utils = trpc.useUtils();
  const requestChange = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { setChangeId(null); setNewDay(""); setNewTime(""); setReason(""); setActionError(""); void query.refetch(); void utils.student.dashboard.invalidate(); },
    onError: (error) => setActionError(userFacingErrorMessage(error, "تعذر إرسال طلب تغيير الموعد.")),
  });
  const requestCancel = trpc.student.requestScheduleChange.useMutation({
    onSuccess: () => { setCancelId(null); setActionError(""); void query.refetch(); },
    onError: (error) => setActionError(userFacingErrorMessage(error, "تعذر إرسال طلب الإلغاء.")),
  });
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [changeId, setChangeId] = useState<string | null>(null);
  const [newDay, setNewDay] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  const rows = Array.isArray(query.data) ? query.data : [];
  return (
    <Screen>
      <SectionTitle title="جدولي وحلقاتي" />
      <FeatureTile title="احجز حلقة جديدة" description="اختر المسار والمعلم والموعد المتاح" icon="add-circle-outline" accent onPress={() => router.push("/student/booking")} />
       {rows.length === 0 ? <EmptyState title="لا توجد حلقات بعد" description="عند حجز حلقة ستظهر هنا مع تفاصيل الموعد وغرفة الجلسة." action="تصفح المعلمين" onAction={() => router.push("/student/booking")} icon="calendar-outline" /> : rows.map((row: any, index) => <Card key={String(row.id ?? index)}><View style={styles.row}><View style={styles.rowBody}><Text style={[styles.title, { color: colors.text }]}>{String(row.title ?? row.sessionType ?? "حلقة تعليمية")}</Text><Text style={[styles.meta, { color: colors.muted }]}>{String(row.scheduledAt ?? row.startTime ?? row.date ?? "موعد غير محدد")}</Text>{row.teacherName ? <Text style={[styles.meta, { color: colors.muted }]}>المعلم: {String(row.teacherName)}</Text> : null}</View><Badge label={statusLabel(row.status)} tone={row.status === "completed" ? "success" : row.status === "cancelled" ? "danger" : "gold"} /></View><Button label={row.status === "in_progress" ? "دخول الحلقة" : "عرض تفاصيل الحلقة"} variant="secondary" icon={row.status === "in_progress" ? "videocam-outline" : "arrow-back-outline"} onPress={() => row.id && router.push(`/student/session/${row.id}`)} />{(row.status === "scheduled" || row.status === "confirmed") ? <View style={styles.actions}><Button label="تغيير" variant="secondary" onPress={() => { setChangeId(String(row.id)); setNewDay(DAY_KEYS[new Date(row.scheduledAt).getDay()] ?? ""); setNewTime(new Date(row.scheduledAt).toTimeString().slice(0, 5)); setReason(""); }} /><Button label="إلغاء" variant="danger" onPress={() => setCancelId(String(row.id))} /></View> : null}</Card>)}
       <Modal visible={!!cancelId} transparent animationType="slide" onRequestClose={() => { setCancelId(null); setActionError(""); }}><View style={styles.backdrop}><SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}><Text style={[styles.modalTitle, { color: colors.text }]}>تأكيد الإلغاء</Text><Text style={[styles.modalText, { color: colors.muted }]}>هل أنت متأكد من رغبتك في طلب إلغاء هذا الحجز الأسبوعي؟</Text>{actionError ? <Text style={[styles.error, { color: colors.danger }]}>{actionError}</Text> : null}<View style={styles.actions}><Button label="تأكيد الإلغاء" variant="danger" loading={requestCancel.isPending} disabled={requestCancel.isPending} onPress={() => void confirmAr("تأكيد الإلغاء", "سيتم إرسال طلب الإلغاء للمعلم.").then((ok) => { if (ok && cancelId) requestCancel.mutate({ sessionId: cancelId, requestedNewTime: null, reason: "cancel" }); })} /><Button label="تراجع" variant="secondary" onPress={() => { setCancelId(null); setActionError(""); }} /></View></SafeAreaView></View></Modal>
       <Modal visible={!!changeId} transparent animationType="slide" onRequestClose={() => { setChangeId(null); setActionError(""); }}><View style={styles.backdrop}><SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]}><Text style={[styles.modalTitle, { color: colors.text }]}>طلب تغيير الموعد</Text><Text style={[styles.modalText, { color: colors.muted }]}>اختر اليوم والوقت الجديدين</Text><View style={styles.dayGrid}>{Object.entries(DAY_LABELS).map(([key, label]) => <Pressable key={key} onPress={() => setNewDay(key)} style={[styles.day, { backgroundColor: newDay === key ? colors.primary : colors.input, borderColor: colors.border }]}><Text style={{ color: newDay === key ? colors.primaryText : colors.text }}>{label}</Text></Pressable>)}</View><TextInput value={newTime} onChangeText={setNewTime} placeholder="الوقت الجديد: 18:00" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} /><TextInput value={reason} onChangeText={setReason} placeholder="السبب (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />{actionError ? <Text style={[styles.error, { color: colors.danger }]}>{actionError}</Text> : null}<View style={styles.actions}><Button label="إرسال الطلب" loading={requestChange.isPending} disabled={!newDay || !/^\d{2}:\d{2}$/.test(newTime) || requestChange.isPending} onPress={() => { if (changeId) requestChange.mutate({ sessionId: changeId, requestedNewTime: nextDateFor(newDay, newTime), reason: reason.trim() || "change" }); }} /><Button label="تراجع" variant="secondary" onPress={() => { setChangeId(null); setActionError(""); }} /></View></SafeAreaView></View></Modal>
    </Screen>
  );
}

function statusLabel(status: unknown) {
  if (status === "completed") return "مكتملة";
  if (status === "cancelled") return "ملغاة";
  if (status === "active") return "جارية";
  return "قادمة";
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  rowBody: { flex: 1, alignItems: "flex-end" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  modalTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 19, textAlign: "right" },
  modalText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21 },
  dayGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  day: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 20 },
});
