import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { StudentScreen, LoadingState, ErrorState, EmptyState, Card } from "./_screen";
import SectionIcon from "../../components/section-icon";
import { palette, useTheme } from "../../lib/theme";
import { resolveLibraryAsset } from "../../lib/library-media";
import { Button, Icon } from "../../components/ui";
import { uploadNativeFile } from "../../lib/mobile-upload";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { useState } from "react";

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
};
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function Ijazat() {
  const { token } = useAuth();
  const router = useRouter();
  const q = trpc.student.myIjazat.useQuery(undefined, { enabled: !!token });
  const { colors, isDark } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [answer, setAnswer] = useState<"yes" | null>(null);
  const submit = trpc.student.submitQiraatCertificate.useMutation({
    onSuccess: () => { setError(null); void q.refetch(); },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إرسال الشهادة. حاول مرة أخرى.")),
  });
  if (q.isLoading) return <StudentScreen title="القراءات"><LoadingState /></StudentScreen>;
  if (q.error) return <StudentScreen title="القراءات"><ErrorState onRetry={() => void q.refetch()} /></StudentScreen>;
  const rows = Array.isArray(q.data) ? q.data as Array<any> : [];
  if (!rows.length && answer === null) {
    return (
      <StudentScreen title="القراءات">
        <QiraatLanding
          isDark={isDark}
          onSubmit={() => setAnswer("yes")}
          onDecline={() => router.replace("/student/levels/quran" as never)}
        />
      </StudentScreen>
    );
  }
  return (
    <StudentScreen title="القراءات">
      <Text style={[styles.intro, { color: colors.muted }]}>الشهادات والإجازات المرفوعة في حسابك وحالتها الحالية</Text>
      <Card>
        <Text style={[styles.uploadTitle, { color: colors.text }]}>رفع شهادة قراءات</Text>
        <Text style={[styles.note, { color: colors.muted }]}>اختر صورة أو ملف PDF واضحاً، بحد أقصى ١٠ ميجابايت. لن يُرسل الملف قبل اكتمال رفعه والتحقق منه.</Text>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Button
          label={uploading ? "جارٍ رفع الشهادة…" : "اختيار وثيقة الإجازة"}
          icon="cloud-upload-outline"
          loading={uploading || submit.isPending}
          disabled={uploading || submit.isPending}
          onPress={() => void pickCertificate()}
        />
      </Card>
      {rows.length ? rows.map((x, i) => (
        <Card key={String(x.id ?? i)}>
          <Text style={[styles.title, { color: colors.text }]}>شهادة القراءات</Text>
          <Text style={[styles.status, { color: x.status === "approved" ? colors.success : x.status === "rejected" ? colors.danger : colors.primary }]}>
            {statusLabel[x.status] ?? "حالة غير معروفة"}
          </Text>
          {x.reviewNotes ? <Text style={[styles.note, { color: colors.muted }]}>ملاحظة المراجع: {String(x.reviewNotes)}</Text> : null}
          {x.createdAt ? <Text style={[styles.note, { color: colors.muted }]}>تاريخ الإرسال: {new Date(x.createdAt).toLocaleDateString("ar-SA")}</Text> : null}
          {x.certificateUrl ? (
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(resolveLibraryAsset(String(x.certificateUrl), token))}
              style={[styles.link, { color: colors.primary }]}
            >
              فتح الشهادة
            </Text>
          ) : null}
        </Card>
      )) : <EmptyState title="لا توجد إجازات بعد" description="ستظهر هنا بعد رفع شهادة واعتمادها من الإدارة." />}
    </StudentScreen>
  );

  async function pickCertificate() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    const contentType = file.mimeType ?? (file.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (!ACCEPTED_DOCUMENT_TYPES.includes(contentType)) {
      setError("صيغة غير مدعومة — اختر PDF أو JPG أو PNG فقط.");
      return;
    }
    if (file.size != null && file.size > MAX_FILE_BYTES) {
      setError("حجم الملف يتجاوز ١٠ ميجابايت.");
      return;
    }
    setUploading(true);
    try {
      const objectPath = await uploadNativeFile(file.uri, {
        name: file.name || `qiraat-certificate-${Date.now()}.${contentType === "application/pdf" ? "pdf" : "jpg"}`,
        contentType,
        purpose: "qiraat_certificate",
      });
      await submit.mutateAsync({ certificateUrl: objectPath });
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "تعذر رفع الشهادة. حاول مرة أخرى."));
    } finally {
      setUploading(false);
    }
  }
}

function QiraatLanding({
  isDark,
  onSubmit,
  onDecline,
}: {
  isDark: boolean;
  onSubmit: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.landing}>
      <View style={[styles.heroIcon, { backgroundColor: isDark ? `${palette.gold}1a` : palette.cream }]}>
        <SectionIcon name="qiraat" size={38} />
      </View>
      <Text style={[styles.heroTitle, { color: colors.primary }]}>القراءات</Text>
      <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
        برنامج خاص بالمجازين برواية حفص عن عاصم
      </Text>

      <Card style={[
        styles.qiraatMainCard,
        {
          borderColor: isDark ? `${palette.gold}33` : `${palette.burgundy}1f`,
          shadowColor: isDark ? palette.maroonDeep : palette.burgundy,
          shadowOpacity: isDark ? 0.18 : 0.06,
        },
      ]}>
        <View style={[styles.questionIcon, { backgroundColor: isDark ? `${palette.gold}1a` : `${palette.gold}26` }]}>
          <Icon name="shield-outline" size={24} color={isDark ? palette.gold : palette.goldDark} />
        </View>
        <Text style={[styles.questionTitle, { color: colors.primary }]}>
          هل لديك إجازة برواية حفص عن عاصم{"\n"}عن طريق الشاطبية؟
        </Text>
        <Text style={[styles.questionNote, { color: colors.muted }]}>
          هذا البرنامج مخصص لحملة الإجازة بالسند المتصل
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تقديم إجازة رواية"
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryAction,
              { backgroundColor: isDark ? palette.gold : palette.burgundy, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Text style={[styles.primaryActionText, { color: isDark ? palette.night : palette.cream }]}>
              تقديم إجازة رواية
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="لا، ليس بعد"
            onPress={onDecline}
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryAction,
              {
                backgroundColor: isDark ? `${colors.text}12` : `${palette.burgundy}0d`,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryActionText, { color: isDark ? palette.gold : palette.burgundy }]}>
              لا، ليس بعد
            </Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  landing: { alignItems: "center", paddingTop: 8 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 28, lineHeight: 38, textAlign: "center", marginTop: 3 },
  heroSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 19, textAlign: "center", marginTop: 1 },
  qiraatMainCard: { width: "100%", maxWidth: 360, marginTop: 16, padding: 18, borderRadius: 22, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  questionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 12 },
  questionTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 31, textAlign: "center" },
  questionNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 19, textAlign: "center", marginTop: 9 },
  actionRow: { flexDirection: "row", gap: 8, width: "100%", marginTop: 18 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  primaryAction: {},
  secondaryAction: {},
  primaryActionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "center" },
  secondaryActionText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "center" },
  intro: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 12 },
  uploadTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  status: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginTop: 8 },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 7 },
  link: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginTop: 10 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginVertical: 8 },
});