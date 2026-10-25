import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, Card, EmptyState, Icon } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { useAuth } from "../../../lib/auth";
import { confirmAr } from "../../../lib/confirm";
import { uploadNativeFile } from "../../../lib/media/mobile-upload";
import { resolveLibraryAsset } from "../../../lib/media/library-media";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";
import { useTheme } from "../../../lib/theme";
import { TeacherScreen } from "../../../components/teacher/teacher-screen";

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = String(id ?? "");
  const { token } = useAuth();
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const q = trpc.teacher.studentDetail.useQuery({ studentId }, { enabled: !!studentId });
  const recitations = trpc.recitation.studentSessions.useQuery({ studentId, limit: 10 }, { enabled: !!studentId });
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const data = q.data as any;

  const send = trpc.teacher.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setAttachedFile(null);
      setError("");
      setFeedback("تم إرسال الرسالة إلى الطالب.");
      void utils.teacher.studentDetail.invalidate({ studentId });
    },
    onError: (cause) => {
      setFeedback("");
      setError(userFacingErrorMessage(cause, "تعذر إرسال الرسالة."));
    },
  });
  const promote = trpc.teacher.requestPromotion.useMutation({
    onSuccess: () => {
      setError("");
      setFeedback("تم إرسال طلب الترقية للمراجعة.");
      void utils.teacher.studentDetail.invalidate({ studentId });
    },
    onError: (cause) => {
      setFeedback("");
      setError(userFacingErrorMessage(cause, "تعذر إرسال طلب الترقية."));
    },
  });

  const pickPdf = async () => {
    setError("");
    setFeedback("");
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    if (file.size != null && file.size > 20 * 1024 * 1024) {
      setError("حجم الملف يتجاوز ٢٠ ميجابايت.");
      return;
    }
    try {
      setUploadProgress(0);
      const url = await uploadNativeFile(file.uri, {
        name: file.name || `teacher-message-${Date.now()}.pdf`,
        contentType: "application/pdf",
        onProgress: setUploadProgress,
      });
      setAttachedFile({ name: file.name || "ملف PDF", url });
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "تعذر رفع المرفق."));
    } finally {
      setUploadProgress(null);
    }
  };

  const requestPromotion = async () => {
    if (await confirmAr("طلب الترقية", "هل تؤكد إرسال طلب انتقال الطالب إلى المستوى التالي؟")) {
      promote.mutate({ studentId });
    }
  };

  return (
    <TeacherScreen title="ملف الطالب" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {!data ? (
        <EmptyState title="الطالب غير موجود" />
      ) : (
        <>
          <Card style={styles.headerCard}>
            <Text style={[styles.heading, { color: colors.text }]}>{data.info?.user?.fullName ?? "الطالب"}</Text>
            <View style={styles.badges}>
              <Text style={[styles.badge, { color: colors.text, backgroundColor: `${colors.primary}12` }]}>
                {data.info?.student?.totalJuz ?? 0} جزء
              </Text>
              {data.info?.user?.phone ? (
                <Text style={[styles.badge, { color: colors.muted, backgroundColor: colors.input }]}>
                  {data.info.user.phone}
                </Text>
              ) : null}
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>انتقال المستوى</Text>
            <Text style={[styles.muted, { color: colors.muted }]}>طلب الانتقال للمستوى التالي يحتاج مراجعة المشرف.</Text>
            <Button
              label={promote.isPending ? "جارٍ إرسال الطلب…" : "طلب الانتقال للمستوى التالي"}
              icon="school-outline"
              variant="secondary"
              loading={promote.isPending}
              disabled={promote.isPending}
              onPress={() => void requestPromotion()}
            />
          </Card>

          {data.wantsTuhfa !== null && data.wantsTuhfa !== undefined ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>منظومة تحفة الأطفال</Text>
              <Text style={[styles.body, { color: colors.text }]}>
                {data.wantsTuhfa ? "يرغب في الحفظ" : "لا يرغب في الحفظ"}
              </Text>
            </Card>
          ) : null}

          <Section title="الحصص القادمة" colors={colors}>
            {data.upcoming?.length ? data.upcoming.map((session: any) => (
              <Row key={session.id} colors={colors} title={session.topic ?? session.sessionType ?? "حصة"} detail={`${formatDate(session.scheduledAt)} · ${session.durationMinutes ?? "—"} دقيقة`} />
            )) : <Text style={[styles.muted, { color: colors.muted }]}>لا حصص مجدولة</Text>}
          </Section>

          <Section title="سجل التقييمات" colors={colors}>
            {data.evaluations?.length ? data.evaluations.map((evaluation: any) => (
              <Card key={evaluation.id} style={styles.innerCard}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.score, { color: colors.primary }]}>{evaluation.totalScore}/100</Text>
                  <Text style={[styles.small, { color: colors.muted }]}>{formatDate(evaluation.createdAt)}</Text>
                </View>
                <Text style={[styles.small, { color: colors.muted }]}>
                  الحفظ {evaluation.hifzScore}/50 · المراجعة {evaluation.revisionScore}/20 · التجويد {evaluation.tajweedScore}/20 · الأداء {evaluation.commitmentScore}/10
                </Text>
                {evaluation.notes ? <Text style={[styles.body, { color: colors.text }]}>{evaluation.notes}</Text> : null}
              </Card>
            )) : <Text style={[styles.muted, { color: colors.muted }]}>لا تقييمات بعد</Text>}
          </Section>

          <Section title="جلسات التسميع التعليمية" colors={colors}>
            {recitations.isLoading ? <Text style={[styles.muted, { color: colors.muted }]}>جارٍ تحميل الجلسات…</Text> : recitations.isError ? <Text style={[styles.error, { color: colors.danger }]}>تعذر تحميل جلسات التسميع.</Text> : recitations.data?.length ? recitations.data.map((session: any) => (
              <Row key={session.id} colors={colors} title={session.surahName ?? `سورة #${session.surahId}`} detail={`${session.status ?? "—"} · ${formatDate(session.createdAt)}`} />
            )) : <Text style={[styles.muted, { color: colors.muted }]}>لا جلسات تسميع تعليمي بعد</Text>}
          </Section>

          <Section title="التسجيلات المشتركة" colors={colors}>
            {data.recordings?.length ? data.recordings.map((recording: any) => (
              <Pressable
                key={recording.id}
                onPress={() => void Linking.openURL(resolveLibraryAsset(recording.videoUrl, token))}
                style={[styles.recording, { backgroundColor: `${colors.primary}0c` }]}
              >
                <Icon name="play-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.body, { color: colors.text }]}>تسجيل — {Math.round(Number(recording.durationSeconds ?? 0) / 60)} دقيقة</Text>
              </Pressable>
            )) : <Text style={[styles.muted, { color: colors.muted }]}>لا تسجيلات</Text>}
          </Section>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>مراسلة الطالب</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              maxLength={1000}
              multiline
              placeholder="اكتب تشجيعاً أو واجباً منزلياً…"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              textAlign="right"
            />
            {attachedFile ? (
              <View style={[styles.attachment, { backgroundColor: `${colors.primary}0c` }]}>
                <Text style={[styles.small, { color: colors.text }]} numberOfLines={1}>{attachedFile.name}</Text>
                <Pressable onPress={() => setAttachedFile(null)}><Icon name="close-circle-outline" size={18} color={colors.danger} /></Pressable>
              </View>
            ) : (
              <Button label={uploadProgress == null ? "إرفاق ملف PDF (اختياري)" : `جارٍ رفع الملف… ${uploadProgress}%`} icon="attach-outline" variant="secondary" disabled={uploadProgress != null} onPress={() => void pickPdf()} />
            )}
            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
            {feedback ? <Text style={[styles.feedback, { color: colors.success }]}>{feedback}</Text> : null}
            <Button
              label={send.isPending ? "جارٍ الإرسال…" : "إرسال"}
              icon="send-outline"
              loading={send.isPending}
              disabled={!message.trim() || send.isPending || uploadProgress != null}
              onPress={() => send.mutate({ studentId, messageText: message.trim(), ...(attachedFile ? { fileUrl: attachedFile.url } : {}) })}
            />
          </Card>
        </>
      )}
    </TeacherScreen>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useTheme>["colors"]; children: React.ReactNode }) {
  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      {children}
    </Card>
  );
}

function Row({ title, detail, colors }: { title: string; detail: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={[styles.listRow, { backgroundColor: `${colors.primary}0c` }]}>
      <Text style={[styles.body, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.small, { color: colors.muted }]}>{detail}</Text>
    </View>
  );
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? String(value ?? "") : date.toLocaleDateString("ar-SA");
}

const styles = StyleSheet.create({
  headerCard: { alignItems: "center" },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 24, textAlign: "center" },
  badges: { flexDirection: "row-reverse", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  badge: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 8 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21 },
  small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", lineHeight: 18 },
  score: { fontFamily: "Amiri_700Bold", fontSize: 19 },
  innerCard: { marginTop: 8, padding: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listRow: { borderRadius: 12, padding: 10, marginTop: 8 },
  recording: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderRadius: 12, padding: 10, marginTop: 8 },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingTop: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginBottom: 8, textAlignVertical: "top" },
  attachment: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 12, padding: 10, marginBottom: 8 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 8 },
  feedback: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 8 },
});