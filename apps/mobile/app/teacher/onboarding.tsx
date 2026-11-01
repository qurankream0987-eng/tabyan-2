import { useEffect, useRef, useState } from "react";
import { formatDate } from "../../lib/format";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PageHero, SoftPressable } from "../../components/ui";
import { LibraryMediaPlayer, LocalVideoPreview } from "../../components/library/library-media-player";
import { TeacherScreen } from "../../components/teacher/teacher-screen";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { uploadNativeFile, uploadNativeVideo } from "../../lib/media/mobile-upload";
import { resolveLibraryAsset } from "../../lib/media/library-media";
import { reviewableRecordingOptions } from "../../lib/media/native-recording";
import { useTheme, palette } from "../../lib/theme";
import { toast } from "../../lib/toast";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { getAccountGeneration, isCurrentAccountGeneration, onAccountTransition } from "../../lib/account-transition";
import { removePrivateTemporaryFile, trackPrivateTemporaryFile } from "../../lib/media/private-temporary-files";

const NativeCameraView = CameraView as unknown as React.ComponentType<any>;

const QUESTIONS = [
  "ما مؤهلك العلمي في القرآن وعلومه؟",
  "هل تحمل إجازة بالسند؟ وفي أي رواية؟",
  "كم سنة خبرة في تعليم القرآن؟",
  "ما الفئات العمرية التي درّستها؟",
  "ما أسلوبك في التحفيز والمتابعة؟",
  "كيف تتعامل مع الطالب الضعيف؟",
  "ما أهم كتب التجويد التي درستها؟",
  "هل لديك خبرة في التعليم عن بُعد؟",
  "ما أوقات تفرغك الأسبوعية؟",
  "لماذا تريد الانضمام إلى تبيان؟",
];

type Certificate = { id: string; filePath: string; title: string | null; createdAt: string | Date | null };
type KycData = { kycStatus: "awaiting_assessment" | "in_progress" | "pending" | "approved" | "rejected"; notes: string | null; isMufti: boolean; isVolunteer: boolean };
type VideoMethod = "record" | "upload";

export default function Onboarding() {
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  const startedAt = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoMethod, setVideoMethod] = useState<VideoMethod>("upload");
  const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProof, setVideoProof] = useState("");
  const [videoName, setVideoName] = useState("");
  const [certificateTitle, setCertificateTitle] = useState("");
  const [answers, setAnswers] = useState<string[]>(Array(10).fill(""));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const hasRecordingPermission = !!permission?.granted && !!microphonePermission?.granted;

  useEffect(() => onAccountTransition(() => cameraRef.current?.stopRecording()), []);
  useEffect(() => () => {
    if (localVideoUri) void removePrivateTemporaryFile(localVideoUri).catch(() => undefined);
  }, [localVideoUri]);

  const kyc = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !!token, retry: false });
  const certificates = trpc.teacher.myCertificates.useQuery(undefined, { enabled: !!token, retry: false });
  const startAssessment = trpc.teacher.startAssessment.useMutation({
    onSuccess: () => { setError(""); void kyc.refetch(); },
    onError: (cause) => toast(userFacingErrorMessage(cause, "تعذر بدء اختبار القبول."), "error"),
  });
  const submitKyc = trpc.teacher.submitKyc.useMutation({
    onSuccess: async () => {
      setVideoUrl(""); setVideoProof(""); setLocalVideoUri(null); setVideoName("");
      setAnswers(Array(10).fill(""));
      await kyc.refetch();
      toast("أُرسل طلب القبول — سيراجعه المشرف خلال 24 ساعة", "success");
    },
    onError: (cause) => toast(userFacingErrorMessage(cause, "تعذر إرسال طلب القبول."), "error"),
  });
  const addCertificate = trpc.teacher.addCertificate.useMutation({
    onSuccess: () => { toast("أُضيفت الشهادة", "success"); void certificates.refetch(); },
    onError: (cause) => toast(userFacingErrorMessage(cause, "فشل حفظ الشهادة. حاول مرة أخرى."), "error"),
  });
  const removeCertificate = trpc.teacher.removeCertificate.useMutation({
    onSuccess: () => { toast("حُذفت الشهادة", "success"); setDeleteId(null); void certificates.refetch(); },
    onError: (cause) => toast(userFacingErrorMessage(cause, "فشل حذف الشهادة. حاول مرة أخرى."), "error"),
  });
  const status = kyc.data as KycData | undefined;

  const uploadFile = async (
    uri: string,
    name: string,
    contentType: string,
    kind: "video" | "certificate",
    title?: string,
    accountGeneration = getAccountGeneration(),
    recorded = false,
  ) => {
    if (!(await trackPrivateTemporaryFile(uri, accountGeneration))) return false;
    setUploading(true);
    setUploadProgress(0);
    setError("");
    let keepVideoCopy = false;
    try {
      if (kind === "video") {
        const uploaded = await uploadNativeVideo(uri, setUploadProgress, {
          name,
          contentType,
          purpose: "teacher_kyc_video",
          expectedAccountGeneration: accountGeneration,
        });
        if (!isCurrentAccountGeneration(accountGeneration)) return false;
        setLocalVideoUri(uri);
        setVideoName(recorded ? "فيديو مصوّر من داخل التطبيق" : name);
        setVideoUrl(uploaded.playableObjectPath);
        setVideoProof(uploaded.videoProof);
        keepVideoCopy = true;
        toast(recorded ? "تم رفع الفيديو المصوّر" : "تم رفع الفيديو", "success");
      } else {
        const path = await uploadNativeFile(uri, {
          name,
          contentType,
          onProgress: setUploadProgress,
          expectedAccountGeneration: accountGeneration,
        });
        if (!isCurrentAccountGeneration(accountGeneration)) return false;
        await addCertificate.mutateAsync({ filePath: path, title: (title?.trim() || name).slice(0, 200) });
      }
      return true;
    } catch (cause) {
      if (!isCurrentAccountGeneration(accountGeneration)) return false;
      toast(userFacingErrorMessage(cause, kind === "video" ? "فشل رفع الفيديو — حاول مرة أخرى" : "فشل رفع الشهادة — حاول مرة أخرى"), "error");
      return false;
    } finally {
      if (kind === "certificate" || !keepVideoCopy) {
        await removePrivateTemporaryFile(uri).catch(() => undefined);
      }
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const chooseVideo = async () => {
    const accountGeneration = getAccountGeneration();
    const result = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.name || `teacher-intro-${Date.now()}.mp4`, asset.mimeType || "video/mp4", "video", undefined, accountGeneration);
  };

  const chooseCertificate = async () => {
    const accountGeneration = getAccountGeneration();
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const added = await uploadFile(asset.uri, asset.name || `certificate-${Date.now()}`, asset.mimeType || "application/octet-stream", "certificate", certificateTitle, accountGeneration);
    if (added) setCertificateTitle("");
  };

  const recordVideo = async () => {
    const accountGeneration = getAccountGeneration();
    if (recording) return;
    if (!hasRecordingPermission) {
      const [cameraResult, microphoneResult] = await Promise.all([requestPermission(), requestMicrophonePermission()]);
      if (!cameraResult.granted || !microphoneResult.granted) {
        setError("يلزم السماح بالكاميرا والميكروفون لتسجيل الفيديو.");
        return;
      }
      if (!isCurrentAccountGeneration(accountGeneration)) return;
    }
    if (!cameraRef.current) {
      setError("تعذر تشغيل الكاميرا. أعد فتح الشاشة وحاول مرة أخرى.");
      return;
    }
    setError("");
    setRecording(true);
    startedAt.current = Date.now();
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 60, ...reviewableRecordingOptions });
      const duration = Math.ceil((Date.now() - (startedAt.current ?? Date.now())) / 1000);
      if (!result?.uri) throw new Error("لم يتم إنشاء ملف الفيديو.");
      if (!(await trackPrivateTemporaryFile(result.uri, accountGeneration))) return;
      if (!isCurrentAccountGeneration(accountGeneration)) {
        await removePrivateTemporaryFile(result.uri);
        return;
      }
      if (duration < 30) {
        setError("يجب أن تكون مدة الفيديو 30 ثانية على الأقل. سجّل مرة أخرى.");
        setLocalVideoUri(null);
        await removePrivateTemporaryFile(result.uri);
        return;
      }
      await uploadFile(result.uri, `teacher-intro-${Date.now()}.mp4`, "video/mp4", "video", undefined, accountGeneration, true);
    } catch (cause) {
      if (!isCurrentAccountGeneration(accountGeneration)) return;
      setError(userFacingErrorMessage(cause, "تعذر تسجيل الفيديو. تحقق من صلاحيات الكاميرا والميكروفون."));
    } finally {
      setRecording(false);
      startedAt.current = null;
    }
  };

  const allAnswered = answers.every((answer) => answer.trim().length >= 3);
  const submit = () => {
    if (!videoUrl || !videoProof || !allAnswered || submitKyc.isPending) {
      setError("أرفق فيديو وأجب عن الأسئلة العشرة بإجابات لا تقل عن 3 أحرف.");
      return;
    }
    setError("");
    submitKyc.mutate({ videoUrl, videoProof, answers: QUESTIONS.map((q, index) => ({ q, a: answers[index].trim() })) });
  };

  const resetVideo = () => { setLocalVideoUri(null); setVideoUrl(""); setVideoProof(""); setVideoName(""); };
  const certificateProps = { certificates: certificates.data as Certificate[] | undefined, loading: certificates.isLoading, error: certificates.error, title: certificateTitle, onTitleChange: setCertificateTitle, onPick: chooseCertificate, deleteId, setDeleteId, onDelete: (id: string) => removeCertificate.mutate({ id }), disabled: addCertificate.isPending || removeCertificate.isPending, deleting: removeCertificate.isPending, token };
  const reviewNotes = status?.notes?.trim() ?? "";

  if (kyc.isLoading) return <TeacherScreen title="اعتماد المعلم"><LoadingState /></TeacherScreen>;
  if (kyc.error) return <TeacherScreen title="اعتماد المعلم"><ErrorState message="تعذر تحميل حالة الاعتماد." onRetry={() => void kyc.refetch()} /></TeacherScreen>;

  if (status?.kycStatus === "approved") {
    return <TeacherScreen title="اعتماد المعلم"><Card style={styles.center}><Icon name="check-circle" size={52} color={colors.success} /><Text style={[styles.heading, { color: colors.primary }]}>تم قبول طلبك</Text><Text style={[styles.body, styles.centerText, { color: colors.muted }]}>أنت معلم متطوع معتمد في منصة تبيان — بارك الله فيك</Text>{status.isMufti ? <Badge label="أنت أيضاً مفتٍ معتمد — راجع صندوق الفتاوى" tone="gold" style={styles.centerBadge} /> : null}<Button label="إلى لوحتي" style={styles.fullWidth} onPress={() => router.replace("/teacher" as never)} /></Card></TeacherScreen>;
  }

  if (status?.kycStatus === "awaiting_assessment") {
    return (
      <TeacherScreen title="اختبار القبول">
        <Card style={styles.center}>
          <Icon name="clipboard" size={48} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.primary }]}>اختبار القبول</Text>
          <Text style={[styles.body, styles.centerText, { color: colors.muted }]}>يرجى الدخول إلى اختبار قبول المعلم لإتمام إجراءات التسجيل.</Text>
          <Text style={[styles.hint, { color: palette.goldDark }]}>بانتظار اختبار القبول</Text>
          <View style={[styles.notice, { backgroundColor: `${palette.gold}1a` }]}>
            <Text style={[styles.noticeTitle, { color: colors.primary }]}><Icon name="star" size={15} color={colors.primary} /> العمل في المنصة تطوعي</Text>
            <Text style={[styles.body, { color: colors.text }]}>• التدريس في تبيان عمل تطوعي احتسابي بلا مقابل مادي.{"\n"}• تنظّم مواعيدك بنفسك ويمكنك التوقف في أي وقت.{"\n"}• يُعتمد حسابك بعد اجتياز اختبار القبول ومراجعة الإشراف.</Text>
          </View>
          <Button label={startAssessment.isPending ? "جارٍ فتح الاختبار…" : "ادخل الاختبار"} icon="arrow-left" style={styles.fullWidth} loading={startAssessment.isPending} onPress={() => startAssessment.mutate({ volunteer: true })} />
          <Button label="رجوع" variant="quiet" onPress={() => router.canGoBack() ? router.back() : router.replace("/teacher" as never)} />
        </Card>
        <Certificates {...certificateProps} />
      </TeacherScreen>
    );
  }

  if (status?.kycStatus === "pending" && !videoUrl && answers.every((answer) => !answer)) {
    return (
      <TeacherScreen title="طلب القبول">
        <Card style={styles.center}>
          <Icon name="hourglass" size={48} color={palette.goldDark} />
          <Text style={[styles.heading, { color: colors.primary }]}>طلب القبول قيد المراجعة</Text>
          <Text style={[styles.body, styles.centerText, { color: colors.muted }]}>يراجع المشرف فيديو التعريف وإجاباتك — ستصلك النتيجة خلال 24 ساعة</Text>
          <Button label="تعديل الطلب وإعادة الإرسال" variant="quiet" onPress={() => setAnswers(Array(10).fill(" "))} />
        </Card>
        {reviewNotes ? <ReviewNotes notes={reviewNotes} /> : null}
        <Certificates {...certificateProps} />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen title="اختبار قبول المعلم">
      <Card style={styles.center}>
        <PageHero icon="id-card" title="اختبار قبول المعلم" style={styles.hero} />
        {status?.kycStatus === "in_progress" ? <Text style={[styles.hint, { color: palette.goldDark }]}>الاختبار قيد التنفيذ</Text> : null}
        {status?.kycStatus === "rejected" ? <View style={[styles.rejected, { backgroundColor: `${colors.danger}1A` }]}><Text style={[styles.body, styles.centerText, { color: colors.danger }]}>رُفض طلبك السابق{status.notes ? `: ${status.notes}` : ""} — يمكنك إعادة التقديم</Text></View> : null}
        <Text style={[styles.body, styles.centerText, { color: colors.muted }]}>خطوتان: فيديو تعريفي + 10 أسئلة</Text>
      </Card>
      {status?.kycStatus === "pending" && reviewNotes ? <ReviewNotes notes={reviewNotes} /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}><Icon name="video" size={17} color={colors.primary} /> ١. الفيديو التعريفي</Text>
        <Text style={[styles.body, { color: colors.muted }]}>صوّر فيديو تعريفيًا لمدة <Text style={styles.bold}>30 ثانية على الأقل</Text> تتلو فيه آيات بصوتك، أو أرفق فيديو جاهزًا من الاستديو</Text>
        <View style={styles.methods}>
          {([["record", "سجل مقطع فيديو", "camera"], ["upload", "ارفق المقطع", "upload"]] as const).map(([method, label, icon]) => {
            const active = videoMethod === method;
            return (
              <SoftPressable key={method} accessibilityRole="button" accessibilityState={{ selected: active }} disabled={uploading || recording} onPress={() => setVideoMethod(method)} style={[styles.method, { backgroundColor: active ? colors.primary : colors.input, borderColor: active ? colors.primary : colors.border }]}>
                <Icon name={icon} size={16} color={active ? colors.primaryText : colors.primary} />
                <Text style={[styles.methodText, { color: active ? colors.primaryText : colors.primary }]}>{label}</Text>
              </SoftPressable>
            );
          })}
        </View>
        {videoMethod === "record" && !videoUrl ? (
          <>
            {hasRecordingPermission ? <NativeCameraView ref={cameraRef} facing="front" mode="video" style={styles.camera} /> : null}
            <Button label={recording ? "إيقاف التسجيل" : "بدء التسجيل"} icon={recording ? "stop" : "video"} disabled={uploading} style={styles.spaced} onPress={recording ? () => cameraRef.current?.stopRecording() : recordVideo} />
          </>
        ) : null}
        {videoMethod === "upload" ? <Button label={uploading ? "جارٍ الرفع…" : videoUrl ? "استبدال الفيديو" : "ارفق المقطع"} icon="upload" variant="secondary" disabled={uploading || recording} style={styles.spaced} onPress={() => void chooseVideo()} /> : null}
        {uploading ? <UploadProgress value={uploadProgress} colors={colors} /> : null}
        {videoUrl && !uploading ? (
          <>
            <View style={[styles.confirmed, { backgroundColor: `${colors.success}1A` }]}><Icon name="check-circle" size={16} color={colors.success} /><Text style={[styles.confirmedText, { color: colors.success }]}>تم رفع الفيديو: <Text style={styles.bold}>{videoName || "الملف"}</Text></Text></View>
            {localVideoUri ? <LocalVideoPreview uri={localVideoUri} style={styles.preview} /> : <View style={styles.preview}><LibraryMediaPlayer source={resolveLibraryAsset(videoUrl, token)} contentType="video" /></View>}
            {videoMethod === "record" ? <Button label="إعادة التسجيل" icon="refresh" variant="secondary" disabled={uploading || recording} style={styles.spaced} onPress={resetVideo} /> : null}
          </>
        ) : null}
      </Card>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}><Icon name="edit" size={17} color={colors.primary} /> ٢. الأسئلة العشرة</Text>
        {QUESTIONS.map((question, index) => <View key={question} style={styles.question}><Text style={[styles.label, { color: colors.text }]}>{index + 1}. {question}</Text><TextInput value={answers[index]} onChangeText={(value) => setAnswers((current) => current.map((answer, i) => i === index ? value : answer))} multiline style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" /></View>)}
        <Button label={submitKyc.isPending ? "جارٍ الإرسال…" : "إرسال طلب القبول"} icon="send" loading={submitKyc.isPending} disabled={uploading || !videoUrl || !videoProof || !allAnswered} onPress={submit} />
      </Card>
      <Certificates {...certificateProps} />
    </TeacherScreen>
  );
}

function ReviewNotes({ notes }: { notes: string }) {
  const { colors } = useTheme();
  return <Card style={[styles.notice, { backgroundColor: `${palette.gold}1a` }]}><Text style={[styles.sectionTitle, { color: palette.goldDark }]}><Icon name="info" size={17} color={palette.goldDark} /> ملاحظات من الإدارة</Text><Text style={[styles.body, { color: colors.text }]}>{notes}</Text></Card>;
}

function UploadProgress({ value, colors }: { value: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  return <View style={styles.upload}><View style={[styles.track, { backgroundColor: colors.input }]}><View style={[styles.fill, { width: `${value}%`, backgroundColor: palette.gold }]} /></View><Text style={[styles.meta, { color: colors.muted }]}>جارٍ الرفع… {value}%</Text></View>;
}

function Certificates({ certificates, loading, error, title, onTitleChange, onPick, deleteId, setDeleteId, onDelete, disabled = false, deleting = false, token }: { certificates?: Certificate[]; loading: boolean; error: unknown; title: string; onTitleChange: (value: string) => void; onPick: () => void; deleteId: string | null; setDeleteId: (id: string | null) => void; onDelete: (id: string) => void; disabled?: boolean; deleting?: boolean; token: string | null }) {
  const { colors } = useTheme();
  // In-app browser: the capability URL carries the session token, so it must not reach the system browser history.
  const view = (certificate: Certificate) => {
    if (!token) { toast("سجّل الدخول مجددًا لعرض الشهادة.", "error"); return; }
    void WebBrowser.openBrowserAsync(resolveLibraryAsset(certificate.filePath, token)).catch(() => toast("تعذر فتح الشهادة. حاول مرة أخرى.", "error"));
  };
  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}><Icon name="certificate" size={17} color={colors.primary} /> شهادات ومؤهلات (اختياري)</Text>
      <Text style={[styles.body, { color: colors.muted }]}>ارفع صور أو ملفات PDF لإجازاتك وشهاداتك لتعزيز طلبك</Text>
      <TextInput value={title} onChangeText={onTitleChange} maxLength={200} placeholder="عنوان الشهادة (اختياري)…" placeholderTextColor={colors.muted} style={[styles.input, styles.titleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" />
      <Button label={disabled ? "جارٍ الرفع…" : "إضافة شهادة"} icon="plus" variant="secondary" disabled={disabled} style={styles.spaced} onPress={onPick} />
      {loading ? <LoadingState label="جارٍ تحميل الشهادات…" /> : error ? <ErrorState message="تعذر تحميل الشهادات." /> : certificates?.length ? certificates.map((certificate) => (
        <View key={certificate.id} style={[styles.certificate, { borderBottomColor: colors.border }]}>
          <Icon name="file-text" size={16} color={colors.muted} />
          <View style={styles.certificateCopy}><Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>{certificate.title || "شهادة"}</Text><Text style={[styles.meta, { color: colors.muted }]}>{formatDate(certificate.createdAt)}</Text></View>
          {deleteId === certificate.id ? (
            <View style={styles.deleteActions}><Button label="إلغاء" variant="quiet" disabled={deleting} onPress={() => setDeleteId(null)} /><Button label="حذف" variant="danger" loading={deleting} disabled={deleting} onPress={() => onDelete(certificate.id)} /></View>
          ) : (
            <View style={styles.certificateActions}>
              <Pressable accessibilityRole="link" accessibilityLabel="عرض الشهادة" hitSlop={8} onPress={() => view(certificate)} style={styles.viewLink}><Icon name="link" size={13} color={colors.primary} /><Text style={[styles.viewText, { color: colors.primary }]}>عرض</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="حذف الشهادة" hitSlop={8} onPress={() => setDeleteId(certificate.id)}><Icon name="trash" size={18} color={colors.danger} /></Pressable>
            </View>
          )}
        </View>
      )) : <EmptyState title="لا شهادات مرفوعة بعد" />}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: 8 },
  centerText: { textAlign: "center" },
  centerBadge: { alignSelf: "center" },
  fullWidth: { alignSelf: "stretch", marginTop: 6 },
  hero: { paddingBottom: 4 },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 36, textAlign: "center" },
  hint: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "center" },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 28, textAlign: "right", marginBottom: 8 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right" },
  bold: { fontFamily: "IBMPlexSansArabic_700Bold" },
  notice: { alignSelf: "stretch", borderWidth: 1, borderColor: `${palette.gold}55`, borderRadius: 16, padding: 12, gap: 6 },
  noticeTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  rejected: { alignSelf: "stretch", borderRadius: 14, padding: 10 },
  error: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginBottom: 8 },
  methods: { flexDirection: "row-reverse", gap: 8, marginTop: 12 },
  method: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 },
  methodText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, flexShrink: 1 },
  camera: { width: "100%", height: 230, borderRadius: 18, overflow: "hidden", marginTop: 10 },
  preview: { width: "100%", minHeight: 200, backgroundColor: palette.maroon, borderRadius: 18, overflow: "hidden", marginTop: 10 },
  spaced: { marginTop: 10 },
  confirmed: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  confirmedText: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right" },
  upload: { marginTop: 10 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 4 },
  question: { marginBottom: 12 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right" },
  input: { minHeight: 64, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingTop: 9, marginTop: 5, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlignVertical: "top" },
  titleInput: { minHeight: 46, paddingTop: 0, textAlignVertical: "center", marginTop: 10 },
  certificate: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  certificateCopy: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  certificateActions: { flexDirection: "row-reverse", alignItems: "center", gap: 14 },
  viewLink: { flexDirection: "row-reverse", alignItems: "center", gap: 3, minHeight: 32, justifyContent: "center" },
  viewText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12 },
  deleteActions: { flexDirection: "row-reverse", gap: 4 },
});
