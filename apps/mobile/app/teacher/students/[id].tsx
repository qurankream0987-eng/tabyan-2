import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { formatDate, formatDateTime, formatDuration, sessionStatusLabel, sessionStatusTone } from "../../../lib/format";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, Icon, initials } from "../../../components/ui";
import { LibraryMediaPlayer } from "../../../components/library/library-media-player";
import { trpc } from "../../../lib/trpc";
import { useAuth } from "../../../lib/auth";
import { confirmAr } from "../../../lib/confirm";
import { toast } from "../../../lib/toast";
import { uploadNativeFile } from "../../../lib/media/mobile-upload";
import { resolveLibraryAsset } from "../../../lib/media/library-media";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";
import { palette, useTheme } from "../../../lib/theme";
import { TeacherScreen } from "../../../components/teacher/teacher-screen";
import { RecitationAssignmentsSection } from "../../../components/teacher/recitation-assignments";

/** Web HIDE_MODE_LABELS for educational recitation sessions. */
const HIDE_MODE_LABELS: Record<string, string> = {
  full_hide: "إخفاء كامل",
  first_word: "الكلمة الأولى فقط",
  progressive_reveal: "كشف تدريجي",
  visible_review: "مراجعة بالنص",
};

function recitationTitle(session: { surahId: number | null; surahName: string | null; startAyah: number | null; endAyah: number | null }) {
  const surah = session.surahName ?? (session.surahId && SURAHS[session.surahId - 1] ? `سورة ${SURAHS[session.surahId - 1].name}` : `سورة #${session.surahId ?? "؟"}`);
  const range = session.startAyah && session.endAyah ? (session.startAyah === session.endAyah ? `آية ${session.startAyah}` : `${session.startAyah}–${session.endAyah}`) : null;
  return range ? `${surah} — ${range}` : surah;
}

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = String(id ?? "");
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const utils = trpc.useUtils();
  const q = trpc.teacher.studentDetail.useQuery({ studentId }, { enabled: !!studentId });
  const recitations = trpc.recitation.studentSessions.useQuery({ studentId, limit: 10 }, { enabled: !!studentId });
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [openRecordingId, setOpenRecordingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const data = q.data as any;
  const evaluations: any[] = data?.evaluations ?? [];
  const avgScore = evaluations.length ? Math.round(evaluations.reduce((sum, e) => sum + Number(e.totalScore ?? 0), 0) / evaluations.length) : null;

  const send = trpc.teacher.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setAttachedFile(null);
      setError("");
      toast("أُرسلت رسالتك", "success");
      void utils.teacher.studentDetail.invalidate({ studentId });
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إرسال الرسالة.")),
  });
  const promote = trpc.teacher.requestPromotion.useMutation({
    onSuccess: (result) => {
      setError("");
      toast(result?.toLevel ? `تم إرسال طلب الانتقال إلى "${result.toLevel}" للمراجعة` : "تم إرسال طلب الترقية للمراجعة", "success");
      void utils.teacher.studentDetail.invalidate({ studentId });
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إرسال طلب الترقية.")),
  });

  const pickPdf = async () => {
    setError("");
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
      toast("تم رفع الملف بنجاح", "success");
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
    <TeacherScreen title="ملف الطالب" back loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {!data ? (
        <EmptyState title="الطالب غير موجود" />
      ) : (
        <>
          <Card style={styles.headerCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: palette.gold }]}>
              <Text style={[styles.avatarText, { color: colors.primaryText }]}>{initials(data.info?.user?.fullName)}</Text>
            </View>
            <Text style={[styles.heading, { color: colors.primary }]}>{data.info?.user?.fullName ?? "الطالب"}</Text>
            <View style={styles.badges}>
              <Text style={[styles.badge, { color: colors.text, backgroundColor: `${colors.primary}12` }]}>
                <Icon name="book-outline" size={12} color={colors.text} /> {data.info?.student?.totalJuz ?? 0} جزء
              </Text>
              {avgScore != null ? (
                <Text style={[styles.badge, { color: colors.text, backgroundColor: `${palette.gold}26` }]}>
                  <Icon name="star" size={12} color={isDark ? palette.gold : palette.goldDark} /> متوسط {avgScore}%
                </Text>
              ) : null}
              {data.info?.user?.phone ? (
                <Text style={[styles.badge, { color: colors.muted, backgroundColor: colors.input }]}>
                  {data.info.user.phone}
                </Text>
              ) : null}
            </View>
          </Card>

          <RecitationAssignmentsSection studentId={studentId} />

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

          {/* Web: the card always shows; a null choice reads «لم يحدد اختياره بعد». */}
          <Card>
            <View style={styles.tuhfaRow}>
              <View style={[styles.tuhfaIcon, { backgroundColor: `${palette.gold}26` }]}><Icon name="library-outline" size={20} color={isDark ? palette.gold : palette.goldDark} /></View>
              <View style={styles.flex}>
                <Text style={[styles.sectionTitle, styles.tuhfaTitle, { color: colors.primary }]}>منظومة تحفة الأطفال</Text>
                <Text style={[styles.tuhfaChoice, { color: data.wantsTuhfa === true ? colors.success : colors.muted }]}>
                  {data.wantsTuhfa === true ? "يرغب في الحفظ" : data.wantsTuhfa === false ? "لا يرغب في الحفظ" : "لم يحدد اختياره بعد"}
                </Text>
              </View>
              {data.wantsTuhfa === true ? <View style={[styles.tuhfaCheck, { backgroundColor: `${colors.success}26` }]}><Icon name="checkmark" size={16} color={colors.success} /></View> : null}
            </View>
          </Card>

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
            {recitations.isLoading ? <Text style={[styles.muted, { color: colors.muted }]}>جارٍ تحميل الجلسات…</Text> : recitations.isError ? <Text style={[styles.error, { color: colors.danger }]}>تعذر تحميل جلسات التسميع.</Text> : recitations.data?.length ? recitations.data.map((session) => (
              <View key={session.id} style={[styles.listRow, { backgroundColor: `${colors.primary}0c` }]}>
                <View style={styles.rowBetween}>
                  <Text numberOfLines={1} style={[styles.recitationTitle, { color: colors.primary }]}>{recitationTitle(session)}</Text>
                  <Badge label={sessionStatusLabel(session.status) || "—"} tone={sessionStatusTone(session.status)} />
                </View>
                <Text style={[styles.small, { color: colors.muted }]}>
                  {[
                    session.durationSeconds != null ? formatDuration(session.durationSeconds) : null,
                    session.hideMode ? HIDE_MODE_LABELS[session.hideMode] ?? session.hideMode : null,
                    session.createdAt ? formatDateTime(session.createdAt) : null,
                  ].filter(Boolean).join(" · ")}
                </Text>
              </View>
            )) : <Text style={[styles.muted, { color: colors.muted }]}>لا جلسات تسميع تعليمي بعد</Text>}
          </Section>

          <Section title="تسجيلات مشتركة" colors={colors}>
            {data.recordings?.length ? data.recordings.map((recording: any) => {
              const open = openRecordingId === recording.id;
              return (
                <View key={recording.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenRecordingId(open ? null : recording.id)}
                    style={[styles.recording, { backgroundColor: `${colors.primary}0c` }]}
                  >
                    <Icon name={open ? "chevron-up-outline" : "play-circle-outline"} size={18} color={colors.primary} />
                    <Text style={[styles.body, styles.flex, { color: colors.text }]}>تسجيل — {Math.round(Number(recording.durationSeconds ?? 0) / 60)} دقيقة</Text>
                    <Text style={[styles.small, { color: colors.muted }]}>{formatDateTime(recording.createdAt)}</Text>
                  </Pressable>
                  {open ? <View style={styles.player}><LibraryMediaPlayer source={resolveLibraryAsset(recording.videoUrl, token)} contentType="video" /></View> : null}
                </View>
              );
            }) : <Text style={[styles.muted, { color: colors.muted }]}>لا تسجيلات</Text>}
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


const styles = StyleSheet.create({
  headerCard: { alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 22, lineHeight: 30, includeFontPadding: false },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 36, textAlign: "center" },
  flex: { flex: 1, minWidth: 0 },
  tuhfaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  tuhfaIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tuhfaTitle: { marginBottom: 0 },
  tuhfaChoice: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 20, textAlign: "right" },
  tuhfaCheck: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  recitationTitle: { flex: 1, fontFamily: "Amiri_700Bold", fontSize: 15, lineHeight: 24, textAlign: "right" },
  player: { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  badges: { flexDirection: "row-reverse", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  badge: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 8 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right" },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21 },
  small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", lineHeight: 18 },
  score: { fontFamily: "Amiri_700Bold", fontSize: 19 },
  innerCard: { marginTop: 8, padding: 10 },
  rowBetween: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  listRow: { borderRadius: 12, padding: 10, marginTop: 8 },
  recording: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderRadius: 12, padding: 10, marginTop: 8 },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingTop: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, marginBottom: 8, textAlignVertical: "top" },
  attachment: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 12, padding: 10, marginBottom: 8 },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginBottom: 8 },
});