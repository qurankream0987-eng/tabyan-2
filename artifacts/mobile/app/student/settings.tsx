import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui";
import { StudentScreen, LoadingState, ErrorState, Card } from "./_screen";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

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
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const settings = (q.data ?? {}) as Record<string, unknown>;
  const preferences = [
    ["ayahNotification", "آية اليوم", "إشعار يومي بآية اليوم", true],
    ["hadithNotification", "حديث اليوم", "إشعار يومي بالحديث", true],
    ["ibnQayyimNotification", "درر ابن القيم", "إشعار يومي في المساء", true],
    ["activityNotification", "تقرير النشاط الأسبوعي", "ملخص تقدمك كل أسبوع", false],
  ] as const;

  if (q.isLoading) return <StudentScreen title="الإعدادات"><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title="الإعدادات"><ErrorState onRetry={() => void q.refetch()} /></StudentScreen>;

  const submitDeletion = async () => {
    if (confirmation !== "حذف حسابي" || deleteAccount.isPending) return;
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync({ confirmation: "حذف حسابي" });
      await signOut();
      router.replace("/login");
    } catch (cause) {
      setDeleteError(userFacingErrorMessage(cause, "تعذر حذف الحساب. حاول مرة أخرى."));
    }
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
        <Text style={[styles.dangerHeading, { color: colors.danger }]}>حذف الحساب</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          سيؤدي هذا إلى حذف حسابك وبياناته المرتبطة نهائياً. لا يمكن التراجع عن هذا الإجراء.
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="اكتب: حذف حسابي"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
          textAlign="right"
          accessibilityLabel="تأكيد حذف الحساب"
        />
        {deleteError ? <Text style={[styles.error, { color: colors.danger }]}>{deleteError}</Text> : null}
        <Button
          label={deleteAccount.isPending ? "جارٍ حذف الحساب…" : "حذف حسابي نهائياً"}
          icon="trash-outline"
          variant="danger"
          loading={deleteAccount.isPending}
          disabled={confirmation !== "حذف حسابي" || deleteAccount.isPending}
          onPress={() => void submitDeletion()}
        />
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "right" },
  dangerHeading: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "right", fontSize: 16 },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 22, marginTop: 10 },
  preference: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  preferenceDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  switch: { width: 44, height: 25, borderRadius: 13, borderWidth: 1, padding: 3, justifyContent: "center" },
  switchThumb: { width: 17, height: 17, borderRadius: 9 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14, fontFamily: "IBMPlexSansArabic_400Regular" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 20, marginVertical: 10 },
});