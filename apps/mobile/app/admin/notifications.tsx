import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFrame, AdminSelect } from "../../components/admin/admin-common";
import { AdminSheet, FormError, SheetFooter, useAdminFeedback, useDirtyState } from "../../components/admin-ui";
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
  const [creating, setCreating] = useState(false);
  const notify = useAdminFeedback();
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number][0]>("all_students");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number][0]>("general");
  const [recurring, setRecurring] = useState(false);
  const [pattern, setPattern] = useState("daily_morning");
  const [resultMessage, setResultMessage] = useState("");
  const dirty = useDirtyState(creating ? { audience, target, title, body, type, recurring, pattern } : null);

  const templates = api.notificationsTemplates.useQuery();
  const log = api.notificationsLog.useQuery();
  const recurringList = api.notificationsRecurring.useQuery();
  const levels = api.levelThresholds.useQuery();
  const create = api.notificationCreate.useMutation({
    onSuccess: (result) => {
      setTitle(""); setBody(""); setTarget(""); setRecurring(false); setCreating(false);
      setResultMessage(`تم إرسال الإشعار إلى ${result.sentCount} مستخدم`);
      notify(`أُرسل الإشعار إلى ${result.sentCount} مستخدم`);
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
      {resultMessage ? <Text accessibilityRole="alert" style={[styles.success, { color: colors.text }]}>{resultMessage}</Text> : null}

      {tab === "create" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Button label="إشعار جديد" icon="add-outline" onPress={() => { create.reset(); setCreating(true); }} />
          <AdminSheet visible={creating} title="إشعار جديد" onClose={() => setCreating(false)} dirty={dirty} busy={create.isPending}
            footer={(requestClose) => <SheetFooter primaryLabel="إرسال الإشعار" onSecondary={requestClose} loading={create.isPending}
              disabled={title.trim().length < 3 || (audience === "specific_level" && !target) || (audience === "specific_user" && !target.trim())}
              onPrimary={() => { if (!create.isPending && title.trim().length >= 3 && (!(audience === "specific_level" || audience === "specific_user") || target.trim())) create.mutate({ audienceType: audience, audienceTarget: target.trim() || undefined, title: title.trim(), body: body || undefined, type, isRecurring: recurring, recurrencePattern: recurring ? pattern : undefined }); }} />}>
            <FormError message={create.error ? userFacingErrorMessage(create.error, "تعذر إرسال الإشعار. تحقق من البيانات وحاول مرة أخرى.") : null} />
            <Text style={[styles.heading, { color: colors.text }]}>إشعار جديد</Text>
             <AdminSelect label="الجمهور" value={audience} options={AUDIENCES.map(([value, label]) => ({ value, label }))} onChange={(value) => { setAudience(value as (typeof AUDIENCES)[number][0]); setTarget(""); setResultMessage(""); }} />
            {audience === "specific_level" ? <View><Text style={[styles.label, { color: colors.muted }]}>المستوى</Text><View style={styles.choiceGrid}>{levelsData.map((level) => <Pressable key={String(level.id)} onPress={() => setTarget(String(level.id))} style={[styles.choice, { backgroundColor: target === String(level.id) ? colors.primary : colors.input }]}><Text style={{ color: target === String(level.id) ? colors.primaryText : colors.text, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 }}>{level.name ?? String(level.id)}</Text></Pressable>)}</View></View> : null}
             {audience === "specific_user" ? <TextInput value={target} onChangeText={(value) => { setTarget(value); setResultMessage(""); }} placeholder="معرّف المستخدم" placeholderTextColor={colors.muted} style={inputStyle} textAlign="left" /> : null}
             <TextInput value={title} onChangeText={(value) => { setTitle(value); setResultMessage(""); }} placeholder="العنوان *" placeholderTextColor={colors.muted} maxLength={200} style={inputStyle} textAlign="right" />
             <TextInput value={body} onChangeText={(value) => { setBody(value); setResultMessage(""); }} placeholder="النص…" placeholderTextColor={colors.muted} maxLength={1000} multiline style={[...inputStyle, styles.textarea]} textAlign="right" />
             <AdminSelect label="نوع الإشعار" value={type} options={TYPES.map(([value, label]) => ({ value, label }))} onChange={(value) => setType(value as (typeof TYPES)[number][0])} />
            <Pressable onPress={() => setRecurring((current) => !current)} style={styles.checkRow}><View style={[styles.checkbox, { borderColor: recurring ? colors.primary : colors.border, backgroundColor: recurring ? colors.primary : "transparent" }]} /> <Text style={[styles.checkText, { color: colors.text }]}>إشعار متكرر</Text></Pressable>
             {recurring ? <AdminSelect label="نمط التكرار" value={pattern} options={[["daily_morning", "يومي صباحاً (06:00)"], ["daily_noon", "يومي ظهراً (12:00)"], ["daily_evening", "يومي مساءً (21:00)"], ["weekly", "أسبوعي"]].map(([value, label]) => ({ value, label }))} onChange={setPattern} /> : null}
          </AdminSheet>
          <Card>
            <Text style={[styles.heading, { color: colors.text }]}>قوالب جاهزة</Text>
            {templates.isLoading ? <LoadingState /> : templates.error ? <ErrorState onRetry={() => void templates.refetch()} /> : templatesData.map((template) => <Pressable key={template.key} onPress={() => { setTitle(template.title); setBody(template.body); setType(template.type as (typeof TYPES)[number][0]); create.reset(); setCreating(true); }} style={[styles.template, { borderBottomColor: colors.border }]}><Text style={[styles.templateTitle, { color: colors.text }]}>{template.title}</Text><Text style={[styles.templateBody, { color: colors.muted }]} numberOfLines={2}>{template.body}</Text></Pressable>)}
          </Card>
        </ScrollView>
      ) : tab === "log" ? (
        log.isLoading ? <LoadingState /> : log.error ? <ErrorState onRetry={() => void log.refetch()} /> : logData.length ? logData.map((item) => <Card key={item.id}>
          <Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.templateBody, { color: colors.muted }]}>{item.body ?? "—"}</Text>
          <View style={[styles.meta, { flexWrap: "wrap" }]}>
            <Badge label={TYPES.find(([key]) => key === item.notificationType)?.[1] ?? "عام"} />
            <Badge label={AUDIENCES.find(([key]) => key === item.audienceType)?.[1] ?? "غير محدد"} tone="muted" />
            {item.isRecurring ? <Badge label="متكرر" tone="muted" /> : null}
          </View>
          <Text style={[styles.templateBody, { color: colors.muted }]}>{item.sentAt ? new Date(item.sentAt).toLocaleString("ar-SA") : "—"} · بواسطة {item.adminName ?? "—"}</Text>
        </Card>) : <EmptyState title="لا إشعارات مرسلة" />
      ) : recurringList.isLoading ? <LoadingState /> : recurringList.error ? <ErrorState onRetry={() => void recurringList.refetch()} /> : recurringData.length ? recurringData.map((item) => <Card key={item.id}><View style={styles.recurringRow}><View style={styles.recurringCopy}><Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.templateBody, { color: colors.muted }]}>{item.recurrencePattern ?? "—"}</Text>{item.body ? <Text style={[styles.templateBody, { color: colors.muted }]}>{item.body}</Text> : null}</View><Button label="إيقاف التكرار" variant="danger" loading={toggle.isPending} disabled={toggle.isPending} onPress={() => toggle.mutate({ id: item.id, isRecurring: false })} /></View></Card>) : <EmptyState title="لا إشعارات مجدولة" description="أنشئ إشعارًا متكررًا من تبويب إنشاء." />}
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