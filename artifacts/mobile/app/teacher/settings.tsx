import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, Icon } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { useTheme, palette } from "../../lib/theme";
import { TeacherScreen } from "./_components";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { isValidPersonName, normalizePersonName } from "../../../../lib/tabyan-trpc/src/lib/input-normalization";

const VIDEO_QUALITY = ["360p", "480p", "720p", "1080p"] as const;
const AUDIO_QUALITY = [
  ["low", "منخفضة"],
  ["medium", "متوسطة"],
  ["high", "عالية"],
] as const;
const REMINDER_MINUTES = [5, 10, 15, 30, 60] as const;

type TeacherSettingsData = {
  videoQuality?: (typeof VIDEO_QUALITY)[number];
  audioQuality?: (typeof AUDIO_QUALITY)[number][0];
  autoRecord?: boolean;
  reminderMinutes?: number;
  defaultCameraOn?: boolean;
  defaultMicOn?: boolean;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
};

export default function Settings() {
  const { token, signOut } = useAuth();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!token, retry: false });
  const settingsQuery = trpc.teacher.settings.useQuery(undefined, { enabled: !!token, retry: false });
  const kyc = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !!token, retry: false });
  const update = trpc.teacher.updateSettings.useMutation();
  const updateProfile = trpc.teacher.updateProfile.useMutation();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const data = me.data as { fullName?: string; phone?: string; teacher?: { bio?: string | null } | null } | undefined;
  const settings = (settingsQuery.data ?? {}) as TeacherSettingsData;

  useEffect(() => {
    if (!data) return;
    setFullName(data.fullName ?? "");
    setBio(data.teacher?.bio ?? "");
  }, [data?.fullName, data?.teacher?.bio]);

  const saveSetting = async (key: string, value: boolean | number | string) => {
    if (update.isPending) return;
    setFeedback(null);
    setPendingKey(key);
    try {
      await update.mutateAsync({ [key]: value } as never);
      await settingsQuery.refetch();
      setFeedback({ tone: "success", text: "حُفظت الإعدادات" });
    } catch (cause) {
      setFeedback({ tone: "error", text: userFacingErrorMessage(cause, "تعذر حفظ الإعدادات. حاول مرة أخرى.") });
    } finally {
      setPendingKey(null);
    }
  };

  const saveProfile = async () => {
    const normalizedName = normalizePersonName(fullName);
    if (!isValidPersonName(normalizedName)) {
      setFeedback({ tone: "error", text: "الاسم غير صالح" });
      return;
    }
    setFullName(normalizedName);
    setFeedback(null);
    setPendingKey("profile");
    try {
      await updateProfile.mutateAsync({ fullName: normalizedName, bio: bio.slice(0, 500) });
      await me.refetch();
      setFeedback({ tone: "success", text: "حُفظ ملفك" });
    } catch (cause) {
      setFeedback({ tone: "error", text: userFacingErrorMessage(cause, "تعذر حفظ الملف. حاول مرة أخرى.") });
    } finally {
      setPendingKey(null);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  const retry = () => {
    void me.refetch();
    void settingsQuery.refetch();
    void kyc.refetch();
  };
  const hasError = !!me.error || !!settingsQuery.error || !!kyc.error;
  const loading = me.isLoading || settingsQuery.isLoading || kyc.isLoading;

  return (
    <TeacherScreen title="إعدادات المعلم" loading={loading} error={hasError} retry={retry}>
      {feedback ? <Text style={[styles.feedback, { color: feedback.tone === "success" ? colors.success : colors.danger }]}>{feedback.text}</Text> : null}
      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={[styles.avatarText, { color: colors.primaryText }]}>{(fullName || "معلم").slice(0, 1)}</Text></View>
        <Text style={[styles.profileName, { color: colors.text }]}>{fullName || "معلم"}</Text>
        <Text style={[styles.phone, { color: colors.muted }]}>{data?.phone ?? ""}</Text>
        <View style={styles.badges}>
          <Badge label={kyc.data?.kycStatus === "approved" ? "موثّق" : kyc.data?.kycStatus === "rejected" ? "مرفوض" : kyc.data?.kycStatus === "awaiting_assessment" ? "بانتظار اختبار القبول" : kyc.data?.kycStatus === "in_progress" ? "الاختبار قيد التنفيذ" : "قيد المراجعة"} tone={kyc.data?.kycStatus === "approved" ? "success" : kyc.data?.kycStatus === "rejected" ? "danger" : "gold"} />
          {kyc.data?.isMufti ? <Badge label="مفتٍ" tone="gold" /> : null}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>الملف الشخصي</Text>
        <Text style={[styles.label, { color: colors.text }]}>الاسم</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="right" maxLength={50} />
        <Text style={[styles.label, { color: colors.text }]}>نبذة تعريفية</Text>
        <TextInput value={bio} onChangeText={setBio} multiline maxLength={500} style={[styles.input, styles.bio, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} textAlign="right" />
        <Button label={pendingKey === "profile" ? "جارٍ الحفظ…" : "حفظ الملف"} loading={pendingKey === "profile"} onPress={() => void saveProfile()} />
      </Card>

      <Card>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>إعدادات الحصص</Text>
        <Toggle label="التسجيل التلقائي" hint="بدء التسجيل فور بدء الحصة" value={settings.autoRecord ?? false} pending={pendingKey === "autoRecord"} onChange={(value) => void saveSetting("autoRecord", value)} />
        <Toggle label="الكاميرا مفعّلة افتراضياً" value={settings.defaultCameraOn ?? true} pending={pendingKey === "defaultCameraOn"} onChange={(value) => void saveSetting("defaultCameraOn", value)} />
        <Toggle label="المايك مفعّل افتراضياً" value={settings.defaultMicOn ?? true} pending={pendingKey === "defaultMicOn"} onChange={(value) => void saveSetting("defaultMicOn", value)} />
        <SettingOptions label="جودة الفيديو" values={VIDEO_QUALITY.map((value) => [value, value] as const)} selected={settings.videoQuality ?? "720p"} pending={pendingKey === "videoQuality"} onSelect={(value) => void saveSetting("videoQuality", value)} />
        <SettingOptions label="جودة الصوت" values={AUDIO_QUALITY} selected={settings.audioQuality ?? "high"} pending={pendingKey === "audioQuality"} onSelect={(value) => void saveSetting("audioQuality", value)} />
      </Card>

      <Card>
        <Text style={[styles.sectionHeading, { color: colors.primary }]}>الإشعارات والمظهر</Text>
        <Pressable onPress={toggleTheme} style={styles.themeRow}>
          <Text style={[styles.value, { color: colors.muted }]}>{isDark ? "مفعّل" : "معطّل"}</Text>
          <Text style={[styles.label, { color: colors.text }]}>الوضع الليلي</Text>
        </Pressable>
        <Toggle label="الإشعارات" value={settings.notificationsEnabled ?? true} pending={pendingKey === "notificationsEnabled"} onChange={(value) => void saveSetting("notificationsEnabled", value)} />
        <Toggle label="الصوت" value={settings.soundEnabled ?? true} pending={pendingKey === "soundEnabled"} onChange={(value) => void saveSetting("soundEnabled", value)} />
        <Toggle label="الاهتزاز" value={settings.vibrationEnabled ?? true} pending={pendingKey === "vibrationEnabled"} onChange={(value) => void saveSetting("vibrationEnabled", value)} />
        <SettingOptions label="تذكير قبل الحصة" values={REMINDER_MINUTES.map((value) => [String(value), `${value} دقيقة`] as const)} selected={String(settings.reminderMinutes ?? 15)} pending={pendingKey === "reminderMinutes"} onSelect={(value) => void saveSetting("reminderMinutes", Number(value))} />
      </Card>

      <Button label="تسجيل الخروج" icon="log-out-outline" variant="danger" onPress={() => void logout()} />
    </TeacherScreen>
  );
}

function Toggle({ label, hint, value, pending, onChange }: { label: string; hint?: string; value: boolean; pending: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable disabled={pending} onPress={() => onChange(!value)} style={[styles.toggleRow, { opacity: pending ? 0.6 : 1 }]}>
      <View style={[styles.switch, { backgroundColor: value ? palette.gold : colors.input, borderColor: value ? palette.gold : colors.border }]}><View style={[styles.thumb, { backgroundColor: value ? colors.primaryText : colors.muted, alignSelf: value ? "flex-end" : "flex-start" }]} /></View>
      <View style={styles.toggleBody}><Text style={[styles.label, { color: colors.text }]}>{label}</Text>{hint ? <Text style={[styles.hint, { color: colors.muted }]}>{pending ? "جارٍ الحفظ…" : hint}</Text> : null}</View>
    </Pressable>
  );
}

function SettingOptions({ label, values, selected, pending, onSelect }: { label: string; values: readonly (readonly [string, string])[]; selected: string; pending: boolean; onSelect: (value: string) => void }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.optionsBlock}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.options}>
        {values.map(([value, text]) => {
          const active = value === selected;
          return <Pressable key={value} disabled={pending} onPress={() => onSelect(value)} style={[styles.option, { backgroundColor: active ? (isDark ? palette.gold : palette.burgundy) : "transparent", borderColor: active ? (isDark ? palette.gold : palette.burgundy) : colors.border, opacity: pending ? 0.6 : 1 }]}><Text style={[styles.optionText, { color: active ? colors.primaryText : colors.text }]}>{text}</Text></Pressable>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "right", fontSize: 12, marginBottom: 4 },
  profileCard: { alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Amiri_700Bold", fontSize: 30 },
  profileName: { fontFamily: "Amiri_700Bold", fontSize: 21, marginTop: 6 },
  phone: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 2 },
  badges: { flexDirection: "row-reverse", gap: 7, marginTop: 9 },
  sectionHeading: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 8 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginTop: 5, marginBottom: 10 },
  bio: { minHeight: 84, textAlignVertical: "top", paddingTop: 11 },
  toggleRow: { minHeight: 56, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "transparent" },
  toggleBody: { flex: 1, alignItems: "flex-end" },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  switch: { width: 48, height: 25, borderRadius: 14, borderWidth: 1, padding: 2, justifyContent: "center" },
  thumb: { width: 19, height: 19, borderRadius: 10 },
  optionsBlock: { marginTop: 10 },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 7 },
  option: { minHeight: 38, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  optionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  themeRow: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 3 },
  value: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
});