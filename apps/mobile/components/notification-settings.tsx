import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, ErrorState, Header, Icon, LoadingState, Screen, SectionTitle } from "./ui";
import { useAuth } from "../lib/auth";
import { trpc } from "../lib/trpc";
import { useTheme, palette } from "../lib/theme";
import { userFacingErrorMessage } from "../lib/user-facing-error";

type ToggleKey =
  | "sessionReminders"
  | "sessionChanges"
  | "evaluations"
  | "achievements"
  | "announcements"
  | "ayahOfDay"
  | "payments"
  | "dndDuringPrayer"
  | "dndDuringSession"
  | "pushEnabled"
  | "soundEnabled"
  | "vibrationEnabled";

type SettingRow = { key: ToggleKey; label: string; hint: string; icon: string };

const TYPE_SETTINGS: SettingRow[] = [
  { key: "sessionReminders", label: "تذكير الجلسات", hint: "تنبيه قبل بدء كل جلسة", icon: "time-outline" },
  { key: "sessionChanges", label: "تغييرات المواعيد", hint: "عند تعديل أو إلغاء موعد", icon: "calendar-outline" },
  { key: "evaluations", label: "التقييمات", hint: "عند وصول تقييم جديد من المعلم", icon: "star-outline" },
  { key: "achievements", label: "الإنجازات", hint: "الشهادات وإتمام المستويات", icon: "ribbon-outline" },
  { key: "announcements", label: "إعلانات الإدارة", hint: "التعميمات والأخبار", icon: "notifications-outline" },
  { key: "ayahOfDay", label: "آية اليوم", hint: "آية يومية للتدبر", icon: "book-outline" },
  { key: "payments", label: "المدفوعات", hint: "الفواتير والاشتراكات", icon: "receipt-outline" },
];

const DND_SETTINGS: SettingRow[] = [
  { key: "dndDuringPrayer", label: "صامت وقت الصلاة", hint: "إيقاف التنبيهات في أوقات الصلاة", icon: "moon-outline" },
  { key: "dndDuringSession", label: "صامت أثناء الجلسة", hint: "إيقاف التنبيهات أثناء جلساتك", icon: "mic-off-outline" },
];

const CHANNEL_SETTINGS: SettingRow[] = [
  { key: "pushEnabled", label: "الإشعارات الفورية", hint: "استلام التنبيهات داخل المنصة", icon: "notifications-outline" },
  { key: "soundEnabled", label: "الصوت", hint: "نغمة عند وصول إشعار", icon: "headset-outline" },
  { key: "vibrationEnabled", label: "الاهتزاز", hint: "اهتزاز الجهاز عند التنبيه", icon: "phone-portrait-outline" },
];

const REMINDER_OPTIONS = [
  { value: 15, label: "قبل ١٥ دقيقة" },
  { value: 30, label: "قبل ٣٠ دقيقة" },
  { value: 60, label: "قبل ساعة" },
  { value: 1440, label: "قبل يوم" },
] as const;

const AYAH_TIME_OPTIONS = [
  { value: "05:00", label: "الفجر", icon: "moon-outline" },
  { value: "12:00", label: "الظهر", icon: "sunny-outline" },
  { value: "18:30", label: "المغرب", icon: "sunny-outline" },
  { value: "20:00", label: "العشاء", icon: "moon-outline" },
] as const;

export function NotificationSettingsScreen({ listPath }: { listPath: string }) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const settingsQuery = trpc.notifications.getSettings.useQuery(undefined, { enabled: !!token, retry: false });
  const update = trpc.notifications.updateSettings.useMutation();
  const clearRead = trpc.notifications.clearRead.useMutation();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const settings = settingsQuery.data as Record<string, unknown> | undefined;

  const save = async (key: string, value: boolean | number | string) => {
    if (update.isPending) return;
    setFeedback(null);
    setPendingKey(key);
    try {
      await update.mutateAsync({ [key]: value } as never);
      await settingsQuery.refetch();
      setFeedback({ tone: "success", text: "تم حفظ الإعدادات" });
    } catch (cause) {
      setFeedback({ tone: "error", text: userFacingErrorMessage(cause, "تعذر حفظ الإعدادات. حاول مرة أخرى.") });
    } finally {
      setPendingKey(null);
    }
  };

  const clearReadNotifications = async () => {
    if (clearRead.isPending) return;
    setFeedback(null);
    try {
      await clearRead.mutateAsync();
      setFeedback({ tone: "success", text: "تم مسح الإشعارات المقروءة" });
    } catch (cause) {
      setFeedback({ tone: "error", text: userFacingErrorMessage(cause, "تعذر مسح الإشعارات المقروءة. حاول مرة أخرى.") });
    }
  };

  if (settingsQuery.error) {
    return <><Header title="إعدادات الإشعارات" back /><Screen><ErrorState message="تعذر تحميل إعدادات الإشعارات. تحقق من الاتصال وحاول مرة أخرى." onRetry={() => void settingsQuery.refetch()} /></Screen></>;
  }
  if (settingsQuery.isLoading || !settings) {
    return <><Header title="إعدادات الإشعارات" back /><Screen><LoadingState label="جارٍ تحميل إعدادات الإشعارات…" /></Screen></>;
  }

  return (
    <>
      <Header title="إعدادات الإشعارات" back />
      <Screen>
        <Pressable onPress={() => router.replace(listPath as never)} style={styles.backLink}>
          <Text style={[styles.backText, { color: colors.primary }]}>الإشعارات</Text>
        </Pressable>
        {feedback ? <Text style={[styles.feedback, { color: feedback.tone === "success" ? colors.success : colors.danger }]}>{feedback.text}</Text> : null}

        <SectionTitle title="أنواع الإشعارات" />
        <Card>{TYPE_SETTINGS.map((item) => <SettingToggle key={item.key} item={item} value={Boolean(settings[item.key])} pending={pendingKey === item.key} onChange={(value) => void save(item.key, value)} />)}</Card>

        <SectionTitle title="التوقيت" />
        <Card>
          <Text style={[styles.groupLabel, { color: colors.text }]}>موعد تذكير الجلسة</Text>
          <View style={styles.optionWrap}>
            {REMINDER_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                active={settings.reminderBeforeMinutes === option.value}
                disabled={pendingKey !== null}
                loading={pendingKey === "reminderBeforeMinutes"}
                onPress={() => void save("reminderBeforeMinutes", option.value)}
              />
            ))}
          </View>
          <Text style={[styles.groupLabel, styles.secondLabel, { color: colors.text }]}>وقت وصول آية اليوم</Text>
          <View style={styles.timeGrid}>
            {AYAH_TIME_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                icon={option.icon}
                active={settings.ayahDeliveryTime === option.value}
                disabled={pendingKey !== null}
                loading={pendingKey === "ayahDeliveryTime"}
                onPress={() => void save("ayahDeliveryTime", option.value)}
              />
            ))}
          </View>
          <Text style={[styles.currentTime, { color: colors.muted }]}>{String(settings.ayahDeliveryTime ?? "06:00")}</Text>
        </Card>

        <SectionTitle title="عدم الإزعاج" />
        <Card>{DND_SETTINGS.map((item) => <SettingToggle key={item.key} item={item} value={Boolean(settings[item.key])} pending={pendingKey === item.key} onChange={(value) => void save(item.key, value)} />)}</Card>

        <SectionTitle title="قنوات التنبيه" />
        <Card>{CHANNEL_SETTINGS.map((item) => <SettingToggle key={item.key} item={item} value={Boolean(settings[item.key])} pending={pendingKey === item.key} onChange={(value) => void save(item.key, value)} />)}</Card>

        <Pressable disabled={clearRead.isPending} onPress={() => void clearReadNotifications()} style={[styles.clearButton, { borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}10`, opacity: clearRead.isPending ? 0.55 : 1 }]}>
          <Text style={[styles.clearText, { color: colors.danger }]}>{clearRead.isPending ? "جارٍ المسح…" : "مسح الإشعارات المقروءة"}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

function SettingToggle({ item, value, pending, onChange }: { item: SettingRow; value: boolean; pending: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable disabled={pending} onPress={() => onChange(!value)} style={({ pressed }) => [styles.settingRow, { opacity: pending ? 0.6 : pressed ? 0.82 : 1 }]}>
      <View style={[styles.settingIcon, { backgroundColor: `${palette.gold}20` }]}><Icon name={item.icon} size={16} color={colors.primary} /></View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
        <Text style={[styles.settingHint, { color: colors.muted }]}>{pending ? "جارٍ الحفظ…" : item.hint}</Text>
      </View>
      <View style={[styles.switch, { backgroundColor: value ? palette.gold : colors.input, borderColor: value ? palette.gold : colors.border }]}>
        <View style={[styles.switchThumb, { backgroundColor: value ? colors.primaryText : colors.muted, alignSelf: value ? "flex-end" : "flex-start" }]} />
      </View>
    </Pressable>
  );
}

function OptionButton({ label, icon, active, disabled, loading, onPress }: { label: string; icon?: string; active: boolean; disabled: boolean; loading: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.option, { backgroundColor: active ? (isDark ? palette.gold : palette.burgundy) : "transparent", borderColor: active ? (isDark ? palette.gold : palette.burgundy) : colors.border, opacity: disabled && !loading ? 0.55 : 1 }]}>
      {loading ? <Text style={[styles.optionText, { color: active ? colors.primaryText : colors.text }]}>…</Text> : null}
      {!loading && icon ? <Icon name={icon} size={13} color={active ? colors.primaryText : colors.primary} /> : null}
      <Text style={[styles.optionText, { color: active ? colors.primaryText : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 4 },
  backText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "right", fontSize: 12, marginBottom: 4 },
  groupLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginBottom: 9 },
  secondLabel: { marginTop: 18 },
  optionWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  timeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  option: { minHeight: 40, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, flexGrow: 1 },
  optionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "center" },
  currentTime: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "left", marginTop: 7 },
  settingRow: { minHeight: 66, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingBody: { flex: 1, alignItems: "flex-end" },
  settingLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  settingHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  switch: { width: 48, height: 25, borderRadius: 14, borderWidth: 1, padding: 2, justifyContent: "center" },
  switchThumb: { width: 19, height: 19, borderRadius: 10 },
  clearButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 18 },
  clearText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
});