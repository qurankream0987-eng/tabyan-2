import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AdminFrame, safeError } from "../../components/admin/admin-common";
import { Button, Card, EmptyState, ErrorState } from "../../components/ui";
import { AdminRow, AdminSheet, ConfirmAction, FormError, FormInput, IconAction, ListSkeleton, SheetFooter, useAdminFeedback, useDirtyState } from "../../components/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { navigateToWelcome, useAuth } from "../../lib/auth";
import { isNonWhitespacePassword } from "../../../../packages/trpc/src/lib/password-validation";
import { normalizeDigits } from "../../../../packages/trpc/src/lib/input-normalization";

const LABELS: Record<string, string> = {
  login_max_attempts: "الحد الأقصى لمحاولات الدخول", login_block_duration_hours: "مدة حظر الدخول بالساعات",
  placement_video_duration_seconds: "مدة فيديو اختبار تحديد المستوى بالثواني", placement_review_deadline_hours: "مهلة مراجعة اختبار تحديد المستوى",
  promotion_video_duration_seconds: "مدة فيديو الترقية بالثواني", fatwa_reassign_hours: "مهلة إعادة إسناد الفتوى بالساعات",
  notif_ayah_time: "وقت إشعار الآية", notif_hadith_time: "وقت إشعار الحديث", notif_ibn_qayyim_time: "وقت إشعار ابن القيم", notif_review_reminder_time: "وقت تذكير المراجعة",
};

export default function Settings() {
  const { colors } = useTheme();
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const { signOut } = useAuth();
  const router = useRouter();
  const q = trpc.admin.settingsGet.useQuery();
  const todayVerse = trpc.dailyVerse.today.useQuery();
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<{ current: string; next: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState(false);
  const [surah, setSurah] = useState("");
  const [ayah, setAyah] = useState("");
  const settingDirty = useDirtyState(editing);
  const passwordDirty = useDirtyState(passwordForm);
  const versePreview = trpc.dailyVerse.preview.useQuery({ surahNumber: Number(surah), ayahNumber: Number(ayah) }, { enabled: Number(surah) >= 1 && Number(surah) <= 114 && Number(ayah) >= 1, retry: 0 });

  const update = trpc.admin.settingsUpdate.useMutation({
    onSuccess: () => { setEditing(null); setEditError(null); notify("حُفظ الإعداد"); void utils.admin.settingsGet.invalidate(); },
    onError: (e: unknown) => setEditError(safeError(e, "تعذر حفظ الإعداد.")),
  });
  const change = trpc.admin.settingsChangeMasterPassword.useMutation({
    onSuccess: async () => { setConfirmPassword(false); setPasswordForm(null); notify("غُيّرت كلمة المرور الرئيسية — سيُسجّل خروج المشرفين"); await signOut(); navigateToWelcome(router); },
    onError: (e: unknown) => { setConfirmPassword(false); setPasswordError(safeError(e, "تعذر تغيير كلمة المرور.")); },
  });
  const verse = trpc.dailyVerse.set.useMutation({
    onSuccess: () => { notify("اعتُمدت آية اليوم"); setSurah(""); setAyah(""); void utils.dailyVerse.today.invalidate(); },
    onError: (e: unknown) => notify(safeError(e, "تعذر اعتماد الآية."), "error"),
  });
  const clearVerse = trpc.dailyVerse.clear.useMutation({
    onSuccess: () => { notify("أُلغي تخصيص آية اليوم"); void utils.dailyVerse.today.invalidate(); },
    onError: (e: unknown) => notify(safeError(e, "تعذر إلغاء تخصيص الآية."), "error"),
  });

  const rows: any[] = (Array.isArray(q.data) ? q.data : []).filter((setting) => LABELS[setting.key]);
  const submitPassword = () => {
    if (!passwordForm) return;
    if (!isNonWhitespacePassword(passwordForm.current)) { setPasswordError("أدخل كلمة المرور الحالية"); return; }
    if (!isNonWhitespacePassword(passwordForm.next)) { setPasswordError("أدخل كلمة المرور الجديدة"); return; }
    setPasswordError(null);
    setConfirmPassword(true);
  };

  return (
    <AdminFrame title="الإعدادات">
      <Text style={[styles.section, { color: colors.text }]}>الإعدادات التشغيلية</Text>
      {q.isLoading ? <ListSkeleton rows={4} /> : q.error ? <ErrorState onRetry={() => void q.refetch()} /> : !rows.length ? <EmptyState title="لا توجد إعدادات قابلة للتعديل" /> : rows.map((setting) => (
        <AdminRow key={setting.key} title={LABELS[setting.key]} subtitle={`القيمة الحالية: ${String(setting.value ?? "—")}`}
          onPress={() => setEditing({ key: setting.key, value: String(setting.value ?? "") })}
          actions={<IconAction icon="create-outline" label={`تعديل ${LABELS[setting.key]}`} onPress={() => setEditing({ key: setting.key, value: String(setting.value ?? "") })} />} />
      ))}

      <Text style={[styles.section, { color: colors.text }]}>الأمان</Text>
      <AdminRow title="كلمة المرور الرئيسية" subtitle="تغييرها يُنهي جلسات جميع المشرفين" leadingIcon="key-outline"
        onPress={() => setPasswordForm({ current: "", next: "" })}
        actions={<IconAction icon="create-outline" label="تغيير كلمة المرور الرئيسية" onPress={() => setPasswordForm({ current: "", next: "" })} />} />

      <Text style={[styles.section, { color: colors.text }]}>آية اليوم</Text>
      <Card>
        {todayVerse.data?.verse ? <Text style={[styles.verse, { color: colors.text }]}>﴿ {todayVerse.data.verse.text} ﴾{"\n"}سورة {todayVerse.data.verse.surahName}، آية {todayVerse.data.verse.ayahNumber}{todayVerse.data.verse.source === "admin" ? " — مخصصة من الإدارة" : " — اختيار تلقائي"}</Text> : null}
        <View style={styles.grid}>
          <View style={styles.cell}><FormInput label="رقم السورة" helper="1-114" keyboardType="number-pad" value={surah} onChangeText={(value) => setSurah(normalizeDigits(value).replace(/\D/g, ""))} /></View>
          <View style={styles.cell}><FormInput label="رقم الآية" keyboardType="number-pad" value={ayah} onChangeText={(value) => setAyah(normalizeDigits(value).replace(/\D/g, ""))} /></View>
        </View>
        {versePreview.data ? <Text style={[styles.verse, { color: colors.text }]}>﴿ {versePreview.data.text} ﴾{"\n"}سورة {versePreview.data.surahName}، آية {versePreview.data.ayahNumber}</Text> : null}
        <View style={styles.actions}>
          <Button label="اعتماد آية اليوم" disabled={!versePreview.data || verse.isPending} loading={verse.isPending} onPress={() => verse.mutate({ surahNumber: Number(surah), ayahNumber: Number(ayah) })} />
          {todayVerse.data?.verse.source === "admin" ? <Button label="إلغاء التخصيص" variant="secondary" loading={clearVerse.isPending} disabled={clearVerse.isPending} onPress={() => clearVerse.mutate({})} /> : null}
        </View>
      </Card>

      <Text style={[styles.section, { color: colors.text }]}>الجلسة</Text>
      <Button label="تسجيل الخروج" variant="danger" icon="log-out-outline" onPress={() => void signOut().then(() => navigateToWelcome(router))} />

      <AdminSheet visible={!!editing} title={editing ? LABELS[editing.key] ?? "الإعداد" : ""} onClose={() => { setEditing(null); setEditError(null); }} dirty={settingDirty} busy={update.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={() => editing && update.mutate({ key: editing.key, value: editing.value } as any)} loading={update.isPending} disabled={!editing?.value.trim()} primaryLabel="حفظ" />}>
        {editing ? <>
          <FormError message={editError} />
          <FormInput label="القيمة الجديدة" required value={editing.value} onChangeText={(value) => { setEditing({ ...editing, value }); setEditError(null); }} keyboardType={/time$/.test(editing.key) ? "default" : "number-pad"} ltr />
        </> : null}
      </AdminSheet>

      <AdminSheet visible={!!passwordForm} title="تغيير كلمة المرور الرئيسية" subtitle="سيُسجَّل خروج جميع المشرفين بعد التغيير" onClose={() => { setPasswordForm(null); setPasswordError(null); }} dirty={passwordDirty} busy={change.isPending}
        footer={(requestClose) => <SheetFooter onSecondary={requestClose} onPrimary={submitPassword} loading={change.isPending} primaryLabel="متابعة" />}>
        {passwordForm ? <>
          <FormError message={passwordError} />
          <FormInput label="كلمة المرور الحالية" required secureTextEntry ltr value={passwordForm.current} onChangeText={(current) => { setPasswordForm({ ...passwordForm, current }); setPasswordError(null); }} />
          <FormInput label="كلمة المرور الجديدة" required secureTextEntry ltr value={passwordForm.next} onChangeText={(next) => { setPasswordForm({ ...passwordForm, next }); setPasswordError(null); }} />
        </> : null}
        {/* Rendered inside the sheet so iOS presents it over the sheet, not from the root controller. */}
        <ConfirmAction visible={confirmPassword} title="تغيير كلمة المرور الرئيسية؟" impact="ستُنهى جلسات جميع المشرفين فوراً، بمن فيهم أنت، وسيلزم الدخول بكلمة المرور الجديدة."
          confirmLabel="تغيير وتسجيل الخروج" loading={change.isPending} onCancel={() => setConfirmPassword(false)}
          onConfirm={() => passwordForm && change.mutate({ current: passwordForm.current, newPassword: passwordForm.next } as any)} />
      </AdminSheet>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", marginTop: 14, marginBottom: 10 },
  verse: { textAlign: "right", lineHeight: 26, marginBottom: 10, fontFamily: "Amiri_400Regular", fontSize: 15 },
  actions: { gap: 8 },
  grid: { flexDirection: "row-reverse", gap: 10 },
  cell: { flex: 1 },
});
