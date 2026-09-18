import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminDateTimeField, AdminFrame, AdminSelect } from "./_common";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const AUDIENCES = [
  ["all_students", "كل الطلاب"],
  ["all_teachers", "كل المعلمين"],
  ["specific_level", "مستوى محدد"],
  ["specific_user", "مستخدم محدد"],
] as const;
const TYPES = [
  ["general", "عام"], ["reminder", "تذكير"], ["result", "نتيجة"], ["activity", "نشاط"],
  ["ayah_day", "آية اليوم"], ["hadith_day", "حديث اليوم"], ["ibn_qayyim", "درر ابن القيم"],
  ["session", "حصة"], ["fatwa", "فتوى"], ["recording", "تسجيل"],
] as const;

type Tab = "create" | "log" | "recurring";

export default function Notifications() {
  const { colors } = useTheme();
  const api = trpc.admin;
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("create");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number][0]>("all_students");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number][0]>("general");
  const [recurring, setRecurring] = useState(false);
  const [pattern, setPattern] = useState("daily_morning");
  const [scheduledAt, setScheduledAt] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const templates = api.notificationsTemplates.useQuery();
  const log = api.notificationsLog.useQuery();
  const recurringList = api.notificationsRecurring.useQuery();
  const levels = api.levelThresholds.useQuery();
  const create = api.notificationCreate.useMutation({
    onSuccess: (result) => {
      setTitle(""); setBody(""); setTarget(""); setScheduledAt(""); setRecurring(false);
      setResultMessage(`تم إرسال الإشعار إلى ${result.sentCount} مستخدم`);
      void utils.admin.notificationsLog.invalidate();
      void utils.admin.notificationsRecurring.invalidate();
    },
  });
  const toggle = api.notificationToggleRecurring.useMutation({
    onSuccess: () => {
      setResultMessage("تم تحديث حالة الإشعار المجدول");
      void utils.admin.notificationsRecurring.invalidate();
    },
    onError: (error) => setResultMessage(userFacingErrorMessage(error, "تعذر تحديث الإشعار المجدول. حاول مرة أخرى.")),
  });

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }];
  const levelsData = (levels.data ?? []) as Array<{ id: number | string; name?: string }>;
  const templatesData = templates.data ?? [];
  const logData = log.data ?? [];
  const recurringData = recurringList.data ?? [];

  return (
    <AdminFrame title="مركز الإشعارات">
      <View style={styles.tabs}>
        {([["create", "إنشاء"], ["log", "السجل"], ["recurring", "المجدولة"]] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, { backgroundColor: tab === key ? colors.primary : colors.input }]}>
            <Text style={[styles.tabText, { color: tab === key ? colors.primaryText : colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "create" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card accent>
            <Text style={[styles.heading, { color: colors.text }]}>إشعار جديد</Text>
             <AdminSelect label="الجمهور" value={audience} options={AUDIENCES.map(([value, label]) => ({ value, label }))} onChange={(value) => { setAudience(value as (typeof AUDIENCES)[number][0]); setTarget(""); setResultMessage(""); }} />
            {audience === "specific_level" ? <View><Text style={[styles.label, { color: colors.muted }]}>المستوى</Text><View style={styles.choiceGrid}>{levelsData.map((level) => <Pressable key={String(level.id)} onPress={() => setTarget(String(level.id))} style={[styles.choice, { backgroundColor: target === String(level.id) ? colors.primary : colors.input }]}><Text style={{ color: target === String(level.id) ? colors.primaryText : colors.text, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 }}>{level.name ?? String(level.id)}</Text></Pressable>)}</View></View> : null}
             {audience === "specific_user" ? <TextInput value={target} onChangeText={(value) => { setTarget(value); setResultMessage(""); }} placeholder="معرّف المستخدم" placeholderTextColor={colors.muted} style={inputStyle} textAlign="left" /> : null}
             <TextInput value={title} onChangeText={(value) => { setTitle(value); setResultMessage(""); }} placeholder="العنوان *" placeholderTextColor={colors.muted} maxLength={200} style={inputStyle} textAlign="right" />
             <TextInput value={body} onChangeText={(value) => { setBody(value); setResultMessage(""); }} placeholder="النص…" placeholderTextColor={colors.muted} maxLength={1000} multiline style={[...inputStyle, styles.textarea]} textAlign="right" />
             <AdminSelect label="نوع الإشعار" value={type} options={TYPES.map(([value, label]) => ({ value, label }))} onChange={(value) => setType(value as (typeof TYPES)[number][0])} />
            <Pressable onPress={() => setRecurring((current) => !current)} style={styles.checkRow}><View style={[styles.checkbox, { borderColor: recurring ? colors.primary : colors.border, backgroundColor: recurring ? colors.primary : "transparent" }]} /> <Text style={[styles.checkText, { color: colors.text }]}>إشعار متكرر</Text></Pressable>
             {recurring ? <><AdminSelect label="نمط التكرار" value={pattern} options={[["daily_morning", "يومي صباحًا"], ["daily_noon", "يومي ظهرًا"], ["daily_evening", "يومي مساءً"], ["weekly", "أسبوعي"]].map(([value, label]) => ({ value, label }))} onChange={setPattern} /><View style={styles.row}><View style={styles.flex}><AdminDateTimeField label="تاريخ الإرسال" mode="date" value={scheduledAt} onChange={setScheduledAt} /></View><View style={styles.flex}><AdminDateTimeField label="وقت الإرسال" mode="time" value={scheduledAt} onChange={setScheduledAt} /></View></View></> : null}
             <Button label={create.isPending ? "جارٍ الإرسال…" : "إرسال الإشعار"} loading={create.isPending} disabled={title.trim().length < 2 || (audience === "specific_level" && !target) || (audience === "specific_user" && !target.trim()) || (recurring && !scheduledAt) || create.isPending} onPress={() => create.mutate({ audienceType: audience, audienceTarget: target || undefined, title: title.trim(), body: body || undefined, notifType: type, isRecurring: recurring, recurrencePattern: recurring ? pattern : undefined, scheduledAt: scheduledAt || undefined })} />
            {resultMessage ? <Text style={[styles.success, { color: colors.success }]}>{resultMessage}</Text> : null}
             {create.error ? <Text style={[styles.error, { color: colors.danger }]}>{userFacingErrorMessage(create.error, "تعذر إرسال الإشعار. تحقق من البيانات وحاول مرة أخرى.")}</Text> : null}
          </Card>
          <Card>
            <Text style={[styles.heading, { color: colors.text }]}>قوالب جاهزة</Text>
            {templates.isLoading ? <LoadingState /> : templatesData.map((template) => <Pressable key={template.key} onPress={() => { setTitle(template.title); setBody(template.body); setType(template.type as (typeof TYPES)[number][0]); }} style={[styles.template, { borderBottomColor: colors.border }]}><Text style={[styles.templateTitle, { color: colors.text }]}>{template.title}</Text><Text style={[styles.templateBody, { color: colors.muted }]} numberOfLines={2}>{template.body}</Text></Pressable>)}
          </Card>
        </ScrollView>
      ) : tab === "log" ? (
        log.isLoading ? <LoadingState /> : log.error ? <ErrorState onRetry={() => void log.refetch()} /> : logData.length ? logData.map((item) => <Card key={item.id}><Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.templateBody, { color: colors.muted }]}>{item.body ?? "—"}</Text><View style={styles.meta}><Badge label={item.notificationType} /><Badge label={item.audienceType} tone="muted" /><Text style={[styles.templateBody, { color: colors.muted }]}>{String(item.sentAt ?? "—")}</Text></View></Card>) : <EmptyState title="لا إشعارات مرسلة" />
      ) : recurringList.isLoading ? <LoadingState /> : recurringList.error ? <ErrorState onRetry={() => void recurringList.refetch()} /> : recurringData.length ? recurringData.map((item) => <Card key={item.id}><View style={styles.recurringRow}><View style={styles.recurringCopy}><Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.templateBody, { color: colors.muted }]}>{item.recurrencePattern ?? "—"}</Text></View><Button label="إيقاف التكرار" variant="danger" loading={toggle.isPending} disabled={toggle.isPending} onPress={() => toggle.mutate({ id: item.id, isRecurring: false })} /></View></Card>) : <EmptyState title="لا إشعارات مجدولة" description="أنشئ إشعارًا متكررًا من تبويب إنشاء." />}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center" },
  tabText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 11 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "right", marginTop: 10, marginBottom: 6 },
  choiceGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 5 },
  choice: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, marginBottom: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  textarea: { minHeight: 90, paddingTop: 12 },
  checkRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginVertical: 9 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1 },
  checkText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12 },
  template: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  templateTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  templateBody: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 3 },
  meta: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 7, marginTop: 8 },
  recurringRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  recurringCopy: { flex: 1 },
  row: { flexDirection: "row-reverse", gap: 8 },
  flex: { flex: 1 },
  error: { textAlign: "right", fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginTop: 8 },
  success: { textAlign: "right", fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, marginTop: 8 },
});