import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Badge, Button, Card, ErrorState, Icon, LoadingState, Screen, SvgIcon, ThemePreferencePicker, initials, type SvgIconName } from "../../../components/ui";
import { navigateToWelcome, useAuth } from "../../../lib/auth";
import { storage } from "../../../lib/storage";
import { toast } from "../../../lib/toast";
import { trpc } from "../../../lib/trpc";
import { palette, useTheme } from "../../../lib/theme";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

// نفس صفحة «حسابي» على الموقع (StudentAccount): الملف، التقدم، المكتبة، الإعدادات، الحذف، الخروج.

type ProgressRow = { levelId: number; name: string; status: string; completedSessions: number; completedJuz: number; averageScore: number | string | null };
const PROGRESS_STATUS: Record<string, { label: string; tone: "success" | "gold" | "muted" }> = {
  completed: { label: "مكتمل", tone: "success" },
  in_progress: { label: "جارٍ", tone: "gold" },
  locked: { label: "مقفل", tone: "muted" },
};

type Settings = { ayahNotification?: boolean | null; hadithNotification?: boolean | null; ibnQayyimNotification?: boolean | null; activityNotification?: boolean | null; videoQuality?: string | null; sessionReminderMinutes?: number | null };
type SettingsPatch = Partial<{ ayahNotification: boolean; hadithNotification: boolean; ibnQayyimNotification: boolean; activityNotification: boolean; videoQuality: string; sessionReminderMinutes: number }>;

const VIDEO_QUALITIES = ["360p", "480p", "720p", "1080p"];
const REMINDER_MINUTES = [5, 10, 15, 30, 60];

export default function Account() {
  const { token, name, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!token, retry: false });
  const progress = trpc.student.progress.useQuery(undefined, { enabled: !!token });
  const myLib = trpc.library.myLibrary.useQuery(undefined, { enabled: !!token });
  const settingsQuery = trpc.student.settings.useQuery(undefined, { enabled: !!token });
  const update = trpc.student.updateSettings.useMutation({
    onSuccess: () => { toast("حُفظت الإعدادات", "success"); void utils.student.settings.invalidate(); },
    onError: (error) => { toast(userFacingErrorMessage(error, "تعذر حفظ الإعدادات. حاول مرة أخرى."), "error"); void utils.student.settings.invalidate(); },
  });
  // تحديث متفائل حتى يظهر أثر الضغط مباشرة، مع إعادة الجلب عند نجاح/فشل الطلب.
  const setSetting = (patch: SettingsPatch) => {
    if (update.isPending) return;
    utils.student.settings.setData(undefined, (current) => (current ? { ...current, ...patch } : current));
    update.mutate(patch);
  };

  // أصوات التنبيه أثناء التسميع — تفضيل محلي على الجهاز (lib/storage).
  const [cuesEnabled, setCuesEnabled] = useState(storage.recitationCuesEnabledSync());
  useEffect(() => { void storage.getRecitationCuesEnabled().then(setCuesEnabled); }, []);
  const toggleCues = (value: boolean) => { setCuesEnabled(value); void storage.setRecitationCuesEnabled(value); };

  // حذف الحساب — نفس المسار الذي كان في صفحة الإعدادات.
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null);
  const deletionInFlight = useRef(false);
  const submitDeletion = async () => {
    if (deleteAccount.isPending || deletionInFlight.current) return;
    deletionInFlight.current = true;
    setDeleteError(null);
    try {
      const result = await deleteAccount.mutateAsync({ confirmation: "حذف حسابي" });
      const sharedNote = result.retainedSharedMedia > 0 ? " أُبقيت بعض التسجيلات المشتركة اللازمة لسجل مشارك آخر." : "";
      setDeleteConfirmationOpen(false);
      setDeletionNotice(result.pendingMediaJobs > 0
        ? `حُذف الحساب، ويجري حذف ملفاته الخاصة المؤهلة في الخلفية. قد تستمر معالجة بعض الوسائط بعد حذف الحساب.${sharedNote}`
        : `حُذف الحساب وانتهت معالجة الوسائط الخاصة المسجلة.${sharedNote}`);
    } catch {
      setDeleteError("تعذر حذف الحساب. حاول مرة أخرى.");
    } finally {
      deletionInFlight.current = false;
    }
  };
  const closeDeleteConfirmation = () => {
    if (deleteAccount.isPending || deletionInFlight.current) return;
    setDeleteConfirmationOpen(false);
    setDeleteError(null);
  };

  // ?focus=delete (من صفحة الدعم/الخصوصية): نمرّر إلى بطاقة الحذف ونبرزها.
  const scrollRef = useRef<ScrollView | null>(null);
  const deleteCardY = useRef<number | null>(null);
  const [highlightDelete, setHighlightDelete] = useState(false);
  const focusDelete = focus === "delete";
  const ready = !me.isLoading;
  useEffect(() => {
    if (!focusDelete || !ready) return;
    const timer = setTimeout(() => {
      setHighlightDelete(true);
      if (deleteCardY.current != null) scrollRef.current?.scrollTo({ y: Math.max(0, deleteCardY.current - 24), animated: true });
    }, 350);
    const clear = setTimeout(() => setHighlightDelete(false), 3500);
    return () => { clearTimeout(timer); clearTimeout(clear); };
  }, [focusDelete, ready]);

  if (me.isLoading) return <Screen><LoadingState /></Screen>;

  const data = me.data as { fullName?: string; phone?: string; role?: string; age?: number | null; student?: { totalJuz?: number | null } | null } | undefined;
  const userName = data?.fullName ?? name ?? "طالب";
  const age = data?.age;
  const totalJuz = data?.student?.totalJuz ?? 0;
  const rows = Array.isArray(progress.data) ? (progress.data as ProgressRow[]) : [];
  const s = (settingsQuery.data ?? null) as Settings | null;
  const chipStyle = { backgroundColor: isDark ? `${palette.gold}14` : `${palette.burgundy}14`, borderColor: isDark ? `${palette.gold}1F` : `${palette.burgundy}1F` };
  const tint = isDark ? "rgba(255,255,255,0.05)" : `${palette.burgundy}0D`;
  const headingColor = isDark ? palette.gold : palette.burgundy;
  const busy = update.isPending;

  return (
    <Screen scrollRef={scrollRef}>
      {/* بطاقة الملف الشخصي */}
      <Card accent style={styles.profile}>
        <View pointerEvents="none" style={[styles.profileGlow, { backgroundColor: `${palette.gold}${isDark ? "1F" : "1A"}` }]} />
        <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: palette.gold }]}>
          <Text style={[styles.avatarText, { color: colors.primaryText }]}>{initials(userName)}</Text>
        </View>
        <Text style={[styles.name, { color: headingColor }]}>{userName}</Text>
        {data?.phone ? <Text style={[styles.phone, { color: colors.muted }]}>{data.phone}</Text> : null}
        <View style={styles.chips}>
          {age != null ? <Text style={[styles.chip, chipStyle, { color: colors.text }]}>العمر: {age} سنة</Text> : null}
          <Text style={[styles.chip, chipStyle, { color: colors.text }]}>الأجزاء: {totalJuz}</Text>
        </View>
      </Card>
      {me.error ? <ErrorState onRetry={() => void me.refetch()} /> : null}

      {/* تقدمي الدراسي */}
      <Card>
        <CardHeading title="تقدمي الدراسي" icon="chart" action="عرض الكل" onAction={() => router.push("/student/progress" as never)} />
        {progress.isLoading ? <Text style={[styles.hint, { color: colors.muted }]}>جارٍ التحميل…</Text>
          : !rows.length ? <Text style={[styles.hint, { color: colors.muted }]}>لا تقدم مسجل بعد</Text>
          : rows.map((row) => {
            const status = PROGRESS_STATUS[row.status] ?? PROGRESS_STATUS.locked;
            const score = Number(row.averageScore ?? 0);
            return (
              <View key={row.levelId} style={[styles.progressRow, { backgroundColor: tint }]}>
                <Badge label={status.label} tone={status.tone} />
                <View style={styles.progressBody}>
                  <Text style={[styles.progressName, { color: colors.text }]}>{row.name}</Text>
                  <Text style={[styles.progressMeta, { color: colors.muted }]}>
                    {row.completedSessions ?? 0} حلقة · {row.completedJuz ?? 0} أجزاء · متوسط {Number.isFinite(score) ? Math.round(score) : 0}%
                  </Text>
                </View>
              </View>
            );
          })}
      </Card>

      {/* مكتبتي */}
      <Card>
        <CardHeading title="مكتبتي" icon="library" action="فتح المكتبة" onAction={() => router.push("/student/library" as never)} />
        <View style={styles.libraryGrid}>
          <View style={[styles.libraryCell, { backgroundColor: tint }]}>
            <Text style={[styles.libraryCount, { color: headingColor }]}>{myLib.data?.bookmarks.length ?? 0}</Text>
            <Text style={[styles.libraryLabel, { color: colors.muted }]}>إشارات مرجعية</Text>
          </View>
          <View style={[styles.libraryCell, { backgroundColor: tint }]}>
            <Text style={[styles.libraryCount, { color: headingColor }]}>{myLib.data?.downloads.length ?? 0}</Text>
            <Text style={[styles.libraryLabel, { color: colors.muted }]}>تنزيلات</Text>
          </View>
        </View>
      </Card>

      {/* الإعدادات */}
      <Card>
        <CardHeading title="الإعدادات" icon="settings" />
        <ThemePreferencePicker />
        <Divider />
        <Toggle label="أصوات التنبيه أثناء التسميع" desc="إشارات هادئة للجاهزية والخطأ المؤكد والتصحيح وإكمال الآية وإنهاء التسميع" checked={cuesEnabled} onChange={toggleCues} showStatus />
        <Divider />
        {settingsQuery.error ? <ErrorState message="تعذر تحميل التفضيلات." onRetry={() => void settingsQuery.refetch()} /> : (
          <>
            <Toggle label="آية اليوم" desc="يومياً 6:00 صباحاً" checked={s?.ayahNotification ?? true} onChange={(v) => setSetting({ ayahNotification: v })} disabled={busy} showStatus />
            <Toggle label="حديث اليوم" desc="يومياً 12:00 ظهراً" checked={s?.hadithNotification ?? true} onChange={(v) => setSetting({ hadithNotification: v })} disabled={busy} />
            <Toggle label="درر ابن القيم" desc="يومياً 9:00 مساءً" checked={s?.ibnQayyimNotification ?? true} onChange={(v) => setSetting({ ibnQayyimNotification: v })} disabled={busy} />
            <Toggle label="تقرير النشاط الأسبوعي" checked={s?.activityNotification ?? false} onChange={(v) => setSetting({ activityNotification: v })} disabled={busy} />
            <Divider />
            <Text style={[styles.choiceLabel, { color: colors.text }]}>جودة الفيديو</Text>
            <View style={styles.choices}>
              {VIDEO_QUALITIES.map((quality) => <Chip key={quality} label={quality} active={(s?.videoQuality ?? "720p") === quality} disabled={busy} onPress={() => setSetting({ videoQuality: quality })} />)}
            </View>
            <Text style={[styles.choiceLabel, styles.choiceLabelSpaced, { color: colors.text }]}>تذكير قبل الحلقة</Text>
            <View style={styles.choices}>
              {REMINDER_MINUTES.map((minutes) => <Chip key={minutes} label={`${minutes} دقيقة`} active={(s?.sessionReminderMinutes ?? 15) === minutes} disabled={busy} onPress={() => setSetting({ sessionReminderMinutes: minutes })} />)}
            </View>
          </>
        )}
      </Card>

      {/* روابط لا تظهر في مكان آخر على الهاتف */}
      <Card style={styles.linksCard}>
        <LinkRow label="إجازاتي وشهاداتي" icon="ribbon-outline" onPress={() => router.push("/student/ijazat" as never)} />
        <Divider />
        <LinkRow label="إعدادات الإشعارات" icon="notifications-outline" onPress={() => router.push("/student/notifications/settings" as never)} />
        <Divider />
        <LinkRow label="المساعدة والدعم" icon="help-circle-outline" onPress={() => router.push("/student/help" as never)} />
      </Card>

      {/* حذف الحساب */}
      {data?.role === "student" || !data ? (
        <View onLayout={(event) => { deleteCardY.current = event.nativeEvent.layout.y; }}>
          <Card style={[styles.deleteCard, { borderColor: highlightDelete ? colors.danger : `${colors.danger}66`, borderWidth: highlightDelete ? 2 : 1 }]}>
            <Text style={[styles.deleteHeading, { color: colors.danger }]}>حذف الحساب</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>ستظهر لك تفاصيل الحذف وتأكيده قبل إرسال الطلب. هذا الإجراء نهائي ولا يمكن التراجع عنه.</Text>
            <Button label="حذف الحساب" icon="trash-outline" variant="danger" testID="button-delete-account" onPress={() => { setDeleteError(null); setDeleteConfirmationOpen(true); }} style={styles.deleteButton} />
          </Card>
        </View>
      ) : null}

      <Button label="تسجيل الخروج" icon="log-out-outline" variant="danger" onPress={() => void signOut().then(() => navigateToWelcome(router))} />
      <Text style={[styles.footer, { color: colors.muted }]}>تبيان — نسخة تجريبية · مجانية 100٪ لوجه الله</Text>

      <Modal visible={deleteConfirmationOpen} transparent animationType="fade" onRequestClose={closeDeleteConfirmation}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]} testID="dialog-delete-account">
            <Text style={[styles.deleteHeading, { color: colors.danger }]}>هل أنت متأكد؟</Text>
            <Text style={[styles.hint, { color: colors.muted }]} testID="text-delete-account-warning">
              <Text style={{ color: colors.danger, fontFamily: "IBMPlexSansArabic_700Bold" }}>هذا الإجراء نهائي. </Text>
              سيُحذف حسابك نهائياً وجميع البيانات الخاصة المرتبطة به. قد تُستثنى البيانات المشتركة أو التي لا يمكن إثبات ملكيتها أو حذفها بأمان.
            </Text>
            {deleteError ? <Text accessibilityRole="alert" style={[styles.hint, { color: colors.danger }]} testID="status-delete-account-error">{deleteError}</Text> : null}
            {deleteAccount.isPending ? <Text style={[styles.hint, { color: colors.muted }]} testID="status-delete-account-pending">جارٍ إرسال طلب حذف الحساب…</Text> : null}
            <Button label={deleteAccount.isPending ? "جارٍ حذف الحساب…" : "نعم، احذف حسابي"} icon="trash-outline" variant="danger" loading={deleteAccount.isPending} disabled={deleteAccount.isPending} testID="button-confirm-delete-account" onPress={() => void submitDeletion()} style={styles.dialogButton} />
            <Button label="إلغاء" variant="secondary" disabled={deleteAccount.isPending} testID="button-cancel-delete-account" onPress={closeDeleteConfirmation} style={styles.dialogButtonSpaced} />
          </View>
        </View>
      </Modal>
      <Modal visible={deletionNotice !== null} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.deleteHeading, { color: colors.text }]}>تم حذف الحساب</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>{deletionNotice}</Text>
            <Button label="متابعة" onPress={() => void signOut().then(() => navigateToWelcome(router))} style={styles.dialogButton} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

/** Amiri heading with a web line icon, like the web card titles. */
function CardHeading({ title, icon, action, onAction }: { title: string; icon: SvgIconName; action?: string; onAction?: () => void }) {
  const { colors, isDark } = useTheme();
  const color = isDark ? palette.gold : palette.burgundy;
  return (
    <View style={styles.heading}>
      <View style={styles.headingLead}>
        <SvgIcon name={icon} size={20} color={color} />
        <Text style={[styles.headingText, { color }]}>{title}</Text>
      </View>
      {action ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}><Text style={[styles.headingAction, { color: colors.primary }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function Toggle({ label, desc, checked, onChange, disabled = false, showStatus = false }: { label: string; desc?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; showStatus?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked, disabled }} accessibilityLabel={label} disabled={disabled} onPress={() => onChange(!checked)} style={({ pressed }) => [styles.toggle, { opacity: disabled ? 0.6 : pressed ? 0.82 : 1 }]}>
      <View style={[styles.switch, { backgroundColor: checked ? palette.gold : colors.input, borderColor: checked ? palette.gold : colors.border }]}>
        <View style={[styles.switchThumb, { backgroundColor: checked ? colors.primaryText : colors.muted, alignSelf: checked ? "flex-end" : "flex-start" }]} />
      </View>
      <View style={styles.toggleBody}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        {desc ? <Text style={[styles.toggleDesc, { color: colors.muted }]}>{desc}</Text> : null}
        {showStatus ? <Text style={[styles.toggleStatus, { color: colors.muted }]}>{checked ? "مفعّل" : "معطّل"}</Text> : null}
      </View>
    </Pressable>
  );
}

function Chip({ label, active, disabled, onPress }: { label: string; active: boolean; disabled: boolean; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const brand = isDark ? palette.gold : palette.burgundy;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[styles.chipOption, { backgroundColor: active ? brand : "transparent", borderColor: active ? brand : colors.border, opacity: disabled ? 0.6 : 1 }]}>
      <Text style={[styles.chipOptionText, { color: active ? colors.primaryText : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.82 : 1 }]}>
      <View style={[styles.linkIcon, { backgroundColor: `${palette.gold}20` }]}><Icon name={icon} size={17} color={colors.primary} /></View>
      <Text style={[styles.linkLabel, { color: colors.text }]}>{label}</Text>
      <Icon name="chevron-back" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: 24, overflow: "hidden" },
  profileGlow: { position: "absolute", top: -140, alignSelf: "center", width: 320, height: 220, borderRadius: 160 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 26, lineHeight: 34, includeFontPadding: false },
  name: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 36, textAlign: "center" },
  phone: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginTop: 2, writingDirection: "ltr" },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  chip: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, overflow: "hidden" },
  heading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  headingLead: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexShrink: 1 },
  headingText: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 30, textAlign: "right" },
  headingAction: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right" },
  progressRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderRadius: 14, padding: 12, marginBottom: 8 },
  progressBody: { flex: 1, minWidth: 0 },
  progressName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  progressMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 2 },
  libraryGrid: { flexDirection: "row-reverse", gap: 8 },
  libraryCell: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 12 },
  libraryCount: { fontFamily: "Amiri_700Bold", fontSize: 22, lineHeight: 32 },
  libraryLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  toggle: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 10 },
  toggleBody: { flex: 1, minWidth: 0 },
  toggleLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  toggleDesc: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 2 },
  toggleStatus: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, textAlign: "right", marginTop: 2 },
  switch: { width: 48, height: 25, borderRadius: 14, borderWidth: 1, padding: 2, justifyContent: "center" },
  switchThumb: { width: 19, height: 19, borderRadius: 10 },
  choiceLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginBottom: 8 },
  choiceLabelSpaced: { marginTop: 14 },
  choices: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  chipOption: { minHeight: 38, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  chipOptionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  linksCard: { paddingVertical: 6 },
  linkRow: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  linkIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  linkLabel: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, textAlign: "right" },
  deleteCard: { gap: 8 },
  deleteHeading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  deleteButton: { marginTop: 4 },
  footer: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "center", marginTop: 14, marginBottom: 8 },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  dialogButton: { marginTop: 6 },
  dialogButtonSpaced: { marginTop: 2 },
});
