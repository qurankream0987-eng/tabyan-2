import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { navigateToWelcome, useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui";
import { StudentScreen, LoadingState, ErrorState, Card } from "../../components/student/student-screen";
import { useTheme } from "../../lib/theme";

export default function Settings() {
  const { token, signOut } = useAuth();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const q = trpc.student.settings.useQuery(undefined, { enabled: !!token });
  const utils = trpc.useUtils();
  const update = trpc.student.updateSettings.useMutation({
    onSuccess: () => void utils.student.settings.invalidate(),
  });
  const deleteAccount = trpc.auth.deleteAccount.useMutation();
  const { colors } = useTheme();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null);
  const deletionInFlight = useRef(false);
  const settings = (q.data ?? {}) as Record<string, unknown>;
  const updateChoice = (key: "videoQuality" | "sessionReminderMinutes", values: Array<string | number>) => {
    const current = settings[key] ?? values[0];
    const index = Math.max(0, values.findIndex((value) => String(value) === String(current)));
    const next = values[(index + 1) % values.length];
    update.mutate({ [key]: next } as never);
  };
  const preferences = [
    ["ayahNotification", "آية اليوم", "إشعار يومي بآية اليوم", true],
    ["hadithNotification", "حديث اليوم", "إشعار يومي بالحديث", true],
    ["ibnQayyimNotification", "درر ابن القيم", "إشعار يومي في المساء", true],
    ["activityNotification", "تقرير النشاط الأسبوعي", "ملخص تقدمك كل أسبوع", false],
  ] as const;

  if (q.isLoading) return <StudentScreen title="الإعدادات"><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title="الإعدادات"><ErrorState onRetry={() => void q.refetch()} /></StudentScreen>;

  const submitDeletion = async () => {
    if (deleteAccount.isPending || deletionInFlight.current) return;
    deletionInFlight.current = true;
    setDeleteError(null);
    try {
      const result = await deleteAccount.mutateAsync({ confirmation: "حذف حسابي" });
      const sharedNote = result.retainedSharedMedia > 0
        ? " أُبقيت بعض التسجيلات المشتركة اللازمة لسجل مشارك آخر."
        : "";
      const notice = result.pendingMediaJobs > 0
        ? `حُذف الحساب، ويجري حذف ملفاته الخاصة المؤهلة في الخلفية. قد تستمر معالجة بعض الوسائط بعد حذف الحساب.${sharedNote}`
        : `حُذف الحساب وانتهت معالجة الوسائط الخاصة المسجلة.${sharedNote}`;
      setDeleteConfirmationOpen(false);
      setDeleteError(null);
      setDeletionNotice(notice);
    } catch (cause) {
      setDeleteError("تعذر حذف الحساب. حاول مرة أخرى.");
    } finally {
      deletionInFlight.current = false;
    }
  };
  const openDeleteConfirmation = () => {
    setDeleteError(null);
    setDeleteConfirmationOpen(true);
  };
  const closeDeleteConfirmation = () => {
    if (deleteAccount.isPending || deletionInFlight.current) return;
    setDeleteConfirmationOpen(false);
    setDeleteError(null);
  };

  return (
    <StudentScreen title={focus === "delete" ? "حذف الحساب" : "الإعدادات"}>
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>تفضيلات الحساب</Text>
        {preferences.map(([key, label, description, fallback]) => {
          const enabled = Boolean(settings[key] ?? fallback);
          return (
            <Pressable
              key={key}
              disabled={update.isPending}
              onPress={() => update.mutate({ [key]: !enabled } as never)}
              style={[styles.preference, { borderBottomColor: colors.border, opacity: update.isPending ? 0.6 : 1 }]}
            >
              <View style={[styles.switch, { backgroundColor: enabled ? colors.primary : colors.input, borderColor: enabled ? colors.primary : colors.border }]}>
                <View style={[styles.switchThumb, { backgroundColor: enabled ? colors.primaryText : colors.muted, alignSelf: enabled ? "flex-end" : "flex-start" }]} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.preferenceTitle, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.preferenceDescription, { color: colors.muted }]}>{description}</Text>
              </View>
            </Pressable>
          );
        })}
        {update.error ? <Text style={[styles.error, { color: colors.danger }]}>تعذر حفظ التفضيلات. حاول مرة أخرى.</Text> : null}
      </Card>
      <Card>
        <Text style={[styles.heading, { color: colors.text }]}>إعدادات الحلقة</Text>
        <Pressable
          disabled={update.isPending}
          onPress={() => updateChoice("videoQuality", ["360p", "480p", "720p", "1080p"])}
          style={[styles.preference, { borderBottomColor: colors.border, opacity: update.isPending ? 0.6 : 1 }]}
        >
          <Text style={[styles.choiceValue, { color: colors.primary }]}>{String(settings.videoQuality ?? "720p")}</Text>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.preferenceTitle, { color: colors.text }]}>جودة الفيديو</Text>
            <Text style={[styles.preferenceDescription, { color: colors.muted }]}>اضغط للتبديل بين مستويات الجودة</Text>
          </View>
        </Pressable>
        <Pressable
          disabled={update.isPending}
          onPress={() => updateChoice("sessionReminderMinutes", [5, 10, 15, 30, 60])}
          style={[styles.preference, { borderBottomColor: colors.border, opacity: update.isPending ? 0.6 : 1 }]}
        >
          <Text style={[styles.choiceValue, { color: colors.primary }]}>{String(settings.sessionReminderMinutes ?? 15)} دقيقة</Text>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.preferenceTitle, { color: colors.text }]}>تذكير قبل الحلقة</Text>
            <Text style={[styles.preferenceDescription, { color: colors.muted }]}>اختر الوقت بالدقائق قبل الموعد</Text>
          </View>
        </Pressable>
      </Card>
      <Card>
        <Text style={[styles.dangerHeading, { color: colors.danger }]}>حذف الحساب</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          راجع تفاصيل حذف الحساب قبل تأكيد الطلب. هذا الإجراء نهائي ولا يمكن التراجع عنه.
        </Text>
        <Button
          label="حذف الحساب"
          icon="trash-outline"
          variant="danger"
          testID="button-delete-account"
          onPress={openDeleteConfirmation}
        />
      </Card>
      <Modal
        visible={deleteConfirmationOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirmation}
      >
        <View style={[styles.confirmationBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            accessibilityViewIsModal
            style={[styles.confirmationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            testID="dialog-delete-account"
          >
            <Text style={[styles.dangerHeading, { color: colors.danger }]}>تأكيد حذف الحساب</Text>
            <Text style={[styles.muted, { color: colors.muted }]} testID="text-delete-account-warning">
              سيُحذف حسابك نهائياً وجميع البيانات الخاصة المرتبطة به. قد تُستثنى البيانات المشتركة أو التي لا يمكن إثبات ملكيتها أو حذفها بأمان.
            </Text>
            {deleteError ? (
              <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]} testID="status-delete-account-error">
                {deleteError}
              </Text>
            ) : null}
            {deleteAccount.isPending ? (
              <Text accessibilityRole="text" style={[styles.pending, { color: colors.muted }]} testID="status-delete-account-pending">
                جارٍ إرسال طلب حذف الحساب…
              </Text>
            ) : null}
            <Button
              label={deleteAccount.isPending ? "جارٍ حذف الحساب…" : "نعم، احذف حسابي"}
              icon="trash-outline"
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={deleteAccount.isPending}
              testID="button-confirm-delete-account"
              onPress={() => void submitDeletion()}
            />
            <Button
              label="إلغاء"
              variant="secondary"
              disabled={deleteAccount.isPending}
              testID="button-cancel-delete-account"
              onPress={closeDeleteConfirmation}
              style={styles.cancelButton}
            />
          </View>
        </View>
      </Modal>
      <Modal visible={deletionNotice !== null} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.noticeBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heading, { color: colors.text }]}>تم حذف الحساب</Text>
            <Text style={[styles.muted, { color: colors.muted }]}>{deletionNotice}</Text>
            <Button
              label="متابعة"
              onPress={() => void signOut().then(() => navigateToWelcome(router))}
            />
          </View>
        </View>
      </Modal>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", marginBottom: 4 },
  dangerHeading: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "right", fontSize: 16 },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 22, marginTop: 10 },
  preference: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  preferenceDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  choiceValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  switch: { width: 44, height: 25, borderRadius: 13, borderWidth: 1, padding: 3, justifyContent: "center" },
  switchThumb: { width: 17, height: 17, borderRadius: 9 },
  confirmationBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  confirmationCard: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 20 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 20, marginVertical: 10 },
  pending: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 20, marginVertical: 10 },
  cancelButton: { marginTop: 8 },
  noticeBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  noticeCard: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 20 },
});