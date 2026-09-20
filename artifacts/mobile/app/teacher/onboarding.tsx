import { useRef, useState } from "react";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState } from "../../components/ui";
import { LocalVideoPreview } from "../../components/library-media-player";
import { TeacherScreen } from "./_components";
import { useAuth } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { uploadNativeFile, uploadNativeVideo } from "../../lib/mobile-upload";
import { useTheme, palette } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

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

export default function Onboarding() {
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<any>(null);
  const startedAt = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoProof, setVideoProof] = useState("");
  const [videoName, setVideoName] = useState("");
  const [answers, setAnswers] = useState<string[]>(Array(10).fill(""));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const hasRecordingPermission = !!permission?.granted && !!microphonePermission?.granted;

  const kyc = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !!token, retry: false });
  const certificates = trpc.teacher.myCertificates.useQuery(undefined, { enabled: !!token, retry: false });
  const startAssessment = trpc.teacher.startAssessment.useMutation({
    onSuccess: () => {
      setError("");
      void kyc.refetch();
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر بدء اختبار القبول.")),
  });
  const submitKyc = trpc.teacher.submitKyc.useMutation({
    onSuccess: async () => {
      setVideoUrl("");
      setVideoProof("");
      setLocalVideoUri(null);
      setVideoName("");
      setAnswers(Array(10).fill(""));
      await kyc.refetch();
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "تعذر إرسال طلب القبول.")),
  });
  const addCertificate = trpc.teacher.addCertificate.useMutation({
    onSuccess: () => {
      setError("");
      void certificates.refetch();
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "فشل حفظ الشهادة. حاول مرة أخرى.")),
  });
  const removeCertificate = trpc.teacher.removeCertificate.useMutation({
    onSuccess: () => {
      setError("");
      setDeleteId(null);
      void certificates.refetch();
    },
    onError: (cause) => setError(userFacingErrorMessage(cause, "فشل حذف الشهادة. حاول مرة أخرى.")),
  });
  const status = kyc.data as KycData | undefined;

  const uploadFile = async (uri: string, name: string, contentType: string, kind: "video" | "certificate") => {
    setUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      if (kind === "video") {
        const uploaded = await uploadNativeVideo(uri, setUploadProgress, {
          name,
          contentType,
          purpose: "teacher_kyc_video",
        });
        setLocalVideoUri(uri);
        setVideoName(name);
        setVideoUrl(uploaded.playableObjectPath);
        setVideoProof(uploaded.videoProof);
      } else {
        const path = await uploadNativeFile(uri, { name, contentType, onProgress: setUploadProgress });
        await addCertificate.mutateAsync({ filePath: path, title: name.slice(0, 200) });
      }
    } catch (cause) {
      setError(userFacingErrorMessage(cause, kind === "video" ? "فشل رفع الفيديو. حاول مرة أخرى." : "فشل رفع الشهادة. حاول مرة أخرى."));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const chooseVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.name || `teacher-intro-${Date.now()}.mp4`, asset.mimeType || "video/mp4", "video");
  };

  const chooseCertificate = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.name || `certificate-${Date.now()}`, asset.mimeType || "application/octet-stream", "certificate");
  };

  const recordVideo = async () => {
    if (recording) return;
    if (!hasRecordingPermission) {
      const [cameraResult, microphoneResult] = await Promise.all([requestPermission(), requestMicrophonePermission()]);
      if (!cameraResult.granted || !microphoneResult.granted) {
        setError("يلزم السماح بالكاميرا والميكروفون لتسجيل الفيديو.");
        return;
      }
    }
    if (!cameraRef.current) {
      setError("تعذر تشغيل الكاميرا. أعد فتح الشاشة وحاول مرة أخرى.");
      return;
    }
    setError("");
    setRecording(true);
    startedAt.current = Date.now();
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 60 });
      const duration = Math.ceil((Date.now() - (startedAt.current ?? Date.now())) / 1000);
      if (!result?.uri) throw new Error("لم يتم إنشاء ملف الفيديو.");
      if (duration < 30) {
        setError("يجب أن تكون مدة الفيديو 30 ثانية على الأقل. سجّل مرة أخرى.");
        setLocalVideoUri(null);
        return;
      }
      await uploadFile(result.uri, `teacher-intro-${Date.now()}.mp4`, "video/mp4", "video");
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "تعذر تسجيل الفيديو. تحقق من صلاحيات الكاميرا والميكروفون."));
    } finally {
      setRecording(false);
      startedAt.current = null;
    }
  };

  const submit = () => {
    const allAnswered = answers.every((answer) => answer.trim().length >= 3);
    if (!videoUrl || !videoProof || !allAnswered || submitKyc.isPending) {
      setError("أرفق فيديو وأجب عن الأسئلة العشرة بإجابات لا تقل عن 3 أحرف.");
      return;
    }
    setError("");
    submitKyc.mutate({ videoUrl, videoProof, answers: QUESTIONS.map((q, index) => ({ q, a: answers[index].trim() })) });
  };

  const loading = kyc.isLoading;
  const hasError = !!kyc.error;
  if (loading) return <TeacherScreen title="اعتماد المعلم"><LoadingState /></TeacherScreen>;
  if (hasError) return <TeacherScreen title="اعتماد المعلم"><ErrorState message="تعذر تحميل حالة الاعتماد." onRetry={() => void kyc.refetch()} /></TeacherScreen>;

  if (status?.kycStatus === "approved") {
    return <TeacherScreen title="اعتماد المعلم"><Card style={styles.center}><Icon name="checkmark-circle" size={52} color={colors.success} /><Text style={[styles.heading, { color: colors.primary }]}>تم قبول طلبك</Text><Text style={[styles.body, { color: colors.muted }]}>أنت معلم معتمد في منصة تبيان.</Text>{status.isMufti ? <Badge label="مفتٍ معتمد" tone="gold" /> : null}<Button label="إلى لوحة المعلم" onPress={() => router.replace("/teacher" as never)} /></Card></TeacherScreen>;
  }

  if (status?.kycStatus === "awaiting_assessment") {
    return <TeacherScreen title="اختبار القبول"><Card style={styles.center}><Icon name="clipboard-outline" size={48} color={colors.primary} /><Text style={[styles.heading, { color: colors.primary }]}>اختبار قبول المعلم</Text><Text style={[styles.body, { color: colors.muted }]}>أكمل الفيديو التعريفي والأسئلة العشرة لإرسال طلبك إلى المشرف.</Text><Card style={[styles.notice, { backgroundColor: `${palette.gold}1a` }]}><Text style={[styles.body, { color: colors.text }]}>التدريس في تبيان عمل تطوعي، ويُعتمد الحساب بعد اجتياز الاختبار والمراجعة.</Text></Card>{error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}<Button label="ادخل الاختبار" icon="arrow-forward-outline" loading={startAssessment.isPending} onPress={() => startAssessment.mutate({ volunteer: true })} /></Card><Certificates certificates={certificates.data as Certificate[] | undefined} loading={certificates.isLoading} error={certificates.error} onPick={chooseCertificate} deleteId={deleteId} setDeleteId={setDeleteId} onDelete={(id) => removeCertificate.mutate({ id })} disabled={addCertificate.isPending || removeCertificate.isPending} deleting={removeCertificate.isPending} /></TeacherScreen>;
  }

  if (status?.kycStatus === "pending" && !videoUrl) {
    return <TeacherScreen title="طلب القبول"><Card style={styles.center}><Icon name="time-outline" size={48} color={palette.goldDark} /><Text style={[styles.heading, { color: colors.primary }]}>طلبك قيد المراجعة</Text><Text style={[styles.body, { color: colors.muted }]}>يراجع المشرف فيديو التعريف وإجاباتك، وستصلك النتيجة بعد المراجعة.</Text>{error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}</Card>{status.notes ? <Card><Text style={[styles.sectionTitle, { color: colors.primary }]}>ملاحظات المراجع</Text><Text style={[styles.body, { color: colors.text }]}>{status.notes}</Text></Card> : null}<Certificates certificates={certificates.data as Certificate[] | undefined} loading={certificates.isLoading} error={certificates.error} onPick={chooseCertificate} deleteId={deleteId} setDeleteId={setDeleteId} onDelete={(id) => removeCertificate.mutate({ id })} disabled={addCertificate.isPending || removeCertificate.isPending} deleting={removeCertificate.isPending} /></TeacherScreen>;
  }

  return (
    <TeacherScreen title="اختبار قبول المعلم">
      {status?.kycStatus === "rejected" ? <Card style={[styles.notice, { backgroundColor: `${colors.danger}12` }]}><Text style={[styles.sectionTitle, { color: colors.danger }]}>رُفض الطلب السابق</Text><Text style={[styles.body, { color: colors.text }]}>{status.notes || "يمكنك تعديل بياناتك وإعادة الإرسال."}</Text></Card> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>١. الفيديو التعريفي</Text>
        <Text style={[styles.body, { color: colors.muted }]}>سجّل فيديو مدته من 30 إلى 60 ثانية أو اختر فيديو موجودًا من جهازك.</Text>
        {hasRecordingPermission && !localVideoUri ? <NativeCameraView ref={cameraRef} facing="front" mode="video" style={styles.camera} /> : null}
        {localVideoUri ? <LocalVideoPreview uri={localVideoUri} style={styles.preview} /> : null}
        <View style={styles.actions}>
          <Button label={recording ? "إيقاف التسجيل" : "تسجيل فيديو"} icon={recording ? "stop-circle-outline" : "videocam-outline"} disabled={uploading} onPress={recording ? () => cameraRef.current?.stopRecording() : recordVideo} />
          <Button label="اختيار فيديو" icon="folder-open-outline" variant="secondary" disabled={uploading || recording} onPress={() => void chooseVideo()} />
        </View>
        {localVideoUri ? <Button label="إعادة التسجيل أو الاختيار" icon="refresh-outline" variant="secondary" disabled={uploading || recording} onPress={() => { setLocalVideoUri(null); setVideoUrl(""); setVideoName(""); }} /> : null}
        {uploading ? <UploadProgress value={uploadProgress} colors={colors} /> : null}
        {videoUrl && !uploading ? <Text style={[styles.confirmed, { color: colors.success }]}><Icon name="checkmark-circle" size={16} color={colors.success} /> تم رفع {videoName || "الفيديو"} بنجاح</Text> : null}
      </Card>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>٢. الأسئلة العشرة</Text>
        {QUESTIONS.map((question, index) => <View key={question} style={styles.question}><Text style={[styles.label, { color: colors.text }]}>{index + 1}. {question}</Text><TextInput value={answers[index]} onChangeText={(value) => setAnswers((current) => current.map((answer, i) => i === index ? value : answer))} multiline style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} textAlign="right" /></View>)}
        <Button label="إرسال طلب القبول" icon="send-outline" loading={submitKyc.isPending} disabled={uploading || !videoUrl || !answers.every((answer) => answer.trim().length >= 3)} onPress={submit} />
      </Card>
      <Certificates certificates={certificates.data as Certificate[] | undefined} loading={certificates.isLoading} error={certificates.error} onPick={chooseCertificate} deleteId={deleteId} setDeleteId={setDeleteId} onDelete={(id) => removeCertificate.mutate({ id })} disabled={addCertificate.isPending || removeCertificate.isPending} deleting={removeCertificate.isPending} />
    </TeacherScreen>
  );
}

function UploadProgress({ value, colors }: { value: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  return <View style={styles.upload}><View style={[styles.track, { backgroundColor: colors.input }]}><View style={[styles.fill, { width: `${value}%`, backgroundColor: palette.gold }]} /></View><Text style={[styles.meta, { color: colors.muted }]}>جارٍ الرفع… {value}%</Text></View>;
}

function Certificates({ certificates, loading, error, onPick, deleteId, setDeleteId, onDelete, disabled = false, deleting = false }: { certificates?: Certificate[]; loading: boolean; error: unknown; onPick: () => void; deleteId: string | null; setDeleteId: (id: string | null) => void; onDelete: (id: string) => void; disabled?: boolean; deleting?: boolean }) {
  const { colors } = useTheme();
  return <Card><View style={styles.certificateHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>الشهادات والمؤهلات (اختياري)</Text><Button label="إضافة" icon="add-outline" variant="secondary" disabled={disabled} onPress={onPick} /></View>{loading ? <LoadingState label="جارٍ تحميل الشهادات…" /> : error ? <ErrorState message="تعذر تحميل الشهادات." /> : certificates?.length ? certificates.map((certificate) => <View key={certificate.id} style={[styles.certificate, { borderBottomColor: colors.border }]}><View style={styles.certificateCopy}><Text style={[styles.label, { color: colors.text }]}>{certificate.title || "شهادة"}</Text><Text style={[styles.meta, { color: colors.muted }]}>{String(certificate.createdAt ?? "")}</Text></View>{deleteId === certificate.id ? <View style={styles.deleteActions}><Button label="إلغاء" variant="secondary" disabled={deleting} onPress={() => setDeleteId(null)} /><Button label={deleting ? "جارٍ الحذف…" : "حذف"} variant="danger" loading={deleting} disabled={deleting} onPress={() => onDelete(certificate.id)} /></View> : <Pressable accessibilityLabel="حذف الشهادة" onPress={() => setDeleteId(certificate.id)}><Icon name="trash-outline" size={18} color={colors.danger} /></Pressable>}</View>) : <EmptyState title="لا شهادات مرفوعة بعد" description="يمكنك إضافة صور أو ملفات PDF لشهاداتك." icon="ribbon-outline" />}</Card>;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: 8 },
  heading: { fontFamily: "Amiri_700Bold", fontSize: 24, textAlign: "center" },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right", marginBottom: 8 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right" },
  notice: { borderWidth: 1, borderColor: `${palette.gold}55` },
  error: { fontFamily: "IBMPlexSansArabic_600SemiBold", textAlign: "right", marginBottom: 8 },
  camera: { width: "100%", height: 230, borderRadius: 18, overflow: "hidden", marginTop: 10 },
  preview: { width: "100%", height: 230, backgroundColor: palette.maroon, borderRadius: 18, marginTop: 10 },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 10 },
  confirmed: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 8 },
  upload: { marginTop: 10 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 4 },
  question: { marginBottom: 12 },
  label: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right" },
  input: { minHeight: 64, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingTop: 9, marginTop: 5, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlignVertical: "top" },
  certificateHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  certificate: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  certificateCopy: { flex: 1, alignItems: "flex-end" },
  deleteActions: { flexDirection: "row-reverse", gap: 6 },
});