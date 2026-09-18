import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StudentScreen, LoadingState, ErrorState, Card } from "./_screen";
import { Button, Icon } from "../../components/ui";
import SectionIcon from "../../components/section-icon";
import { useTheme, palette } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { uploadNativeVideo } from "../../lib/mobile-upload";
import { trpc } from "../../lib/trpc";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const NativeCameraView = CameraView as unknown as React.ComponentType<any>;
const NativeVideoView = VideoView as unknown as React.ComponentType<any>;

// ── مطابق لصفحة اختبار القبول في الموقع (Placement.tsx) ─────────────────────
const MAX_ATTEMPTS = 3;
const MIN_SECONDS = 45;
// نفس حد التسجيل في تجربة الموقع. لا يتغير عقد الإرسال؛ القيمة ترسل كما هي عند توفرها.
const MAX_SECONDS = 300;
const ATTEMPTS_KEY = "tabyan_placement_attempts";

const INSTRUCTIONS = ["اقرأ سورة الفاتحة", "اقرأ ما تيسّر من حفظك"];
const QURAN_RECORDING_INSTRUCTIONS = [
  "ضع الهاتف أمامك مباشرة.",
  "ارفع صوتك بوضوح أثناء التلاوة.",
  "اجلس في مكان هادئ قبل التسجيل.",
];

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toAr = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

type PlacementScores = {
  tajweed?: number;
  makharij?: number;
  fluency?: number;
  overall?: number;
};

async function readAttempts(pathType: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return 0;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const n = obj[pathType];
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch { return 0; }
}
async function writeAttempts(pathType: string, n: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    obj[pathType] = n;
    await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(obj));
  } catch { /* التخزين ممتلئ/محجوب — تبقى المحاولات للجلسة فقط */ }
}

export default function Placement() {
  const params = useLocalSearchParams<{ path?: string; levelId?: string }>();
  const isTilawah = params.path === "tajweed_correction";
  const pathType = isTilawah ? "tajweed_correction" : "quran";
  const levelIdParam = Number(params.levelId) || undefined;
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();

  const [permission, request] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [studyTuhfa, setStudyTuhfa] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  const recordingStartedAt = useRef<number | null>(null);

  const status = trpc.student.placementStatus.useQuery(undefined, { enabled: !!token });
  const statusData = status.data as any;
  const st = statusData?.status as string | undefined;
  const submit = trpc.student.submitPlacement.useMutation();
  const utils = trpc.useUtils();

  // منظومة تحفة الأطفال: تظهر في أول أربعة مستويات مرتبة من مسار القرآن فقط — مطابق للموقع والخادم
  const levelsQuery = trpc.student.levels.useQuery({ path: "quran" }, { enabled: !!token && !isTilawah });
  const quranLevels = (levelsQuery.data ?? []) as Array<{ id: number }>;
  const matchedLevelIndex = levelIdParam != null ? quranLevels.findIndex((l) => l.id === levelIdParam) : -1;
  const showTuhfaChoice = !isTilawah && matchedLevelIndex >= 0 && matchedLevelIndex < 4;

  useEffect(() => { void readAttempts(pathType).then(setAttemptsUsed); }, [pathType]);
  // عند طلب إعادة التسجيل تتجدد المحاولات — مطابق للموقع
  useEffect(() => {
    if (st === "rejected") { void writeAttempts(pathType, 0); setAttemptsUsed(0); }
  }, [st, pathType]);

  const title = isTilawah ? "تصحيح التلاوة — اختبار القبول" : "اختبار القبول";
  const hasRecordingPermission = !!permission?.granted && !!microphonePermission?.granted;
  const requestRecordingPermissions = async () => {
    const [cameraResult, microphoneResult] = await Promise.all([request(), requestMicrophonePermission()]);
    if (!cameraResult.granted || !microphoneResult.granted) {
      setError("يلزم السماح بالكاميرا والميكروفون. افتح إعدادات الجهاز ومنحهما يدوياً.");
    } else {
      setError(null);
    }
  };

  const record = async () => {
    if (!hasRecordingPermission) {
      await requestRecordingPermissions();
      return;
    }
    if (!cameraRef.current) {
      setError("تعذر تشغيل الكاميرا. أعد فتح الشاشة وحاول مرة أخرى.");
      return;
    }
    if (attemptsUsed >= MAX_ATTEMPTS) { setError(`استنفدت محاولاتك (${toAr(MAX_ATTEMPTS)}). انتظر مراجعة المشرف.`); return; }
    setError(null);
    setSent(false);
    setRecording(true);
    recordingStartedAt.current = Date.now();
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_SECONDS });
      const dur = Math.max(1, Math.min(MAX_SECONDS, Math.ceil((Date.now() - (recordingStartedAt.current ?? Date.now())) / 1000)));
      if (dur < MIN_SECONDS) {
        setVideoUri(null);
        setError(`مدة التسجيل ${toAr(dur)} ثانية — الحد الأدنى ${toAr(MIN_SECONDS)} ثانية. سجّل مرة أخرى.`);
        return;
      }
      const used = attemptsUsed + 1;
      setAttemptsUsed(used);
      void writeAttempts(pathType, used);
      setVideoUri(result?.uri ?? null);
      setDurationSeconds(dur);
    } catch {
      setError("تعذر تسجيل الفيديو. تحقق من صلاحية الكاميرا والميكروفون ثم حاول.");
    } finally {
      setRecording(false);
      recordingStartedAt.current = null;
    }
  };
  const stopRecording = () => cameraRef.current?.stopRecording();
  const resetRecording = () => { setVideoUri(null); setDurationSeconds(0); setUploadProgress(0); setSent(false); setError(null); };
  const uploadAndSubmit = async () => {
    if (!videoUri || uploading || submit.isPending) return;
    // سؤال المنظومة آخر خطوة — لا يُرسل الاختبار قبل إجابة صريحة عند ظهوره
    if (levelsQuery.isLoading) { setError("جارٍ التحقق من مستوى المسار قبل الإرسال."); return; }
    if (levelsQuery.error) { setError("تعذر التحقق من مستوى المسار. أعد المحاولة."); return; }
    if (showTuhfaChoice && studyTuhfa === null) { setError("أجب عن سؤال المنظومة أدناه لإكمال الإرسال."); return; }
    setUploading(true);
    setError(null);
    setSent(false);
    try {
      const objectPath = await uploadNativeVideo(videoUri, setUploadProgress);
      await submit.mutateAsync({
        videoUrl: objectPath,
        durationSeconds: durationSeconds || undefined,
        pathType,
        studyTuhfa: showTuhfaChoice ? studyTuhfa === true : undefined,
        levelId: !isTilawah ? levelIdParam : undefined,
      });
      setSent(true);
      void utils.student.placementStatus.invalidate();
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "خطأ في إرسال الفيديو، يرجى المحاولة مرة أخرى."));
    } finally {
      setUploading(false);
    }
  };

  /* ── بعد الإرسال / قيد المراجعة ── */
  if (sent || (st === "pending" && statusData?.hasVideo)) {
    return (
      <StudentScreen title={title}>
        <Card style={styles.centerCard}>
          <View style={[styles.bigIcon, { backgroundColor: `${palette.gold}26` }]}>
            <Icon name="star" size={40} color={palette.goldDark} />
          </View>
          <Text style={[styles.resultTitle, { color: colors.primary }]}>تهانينا!</Text>
          <Text style={[styles.resultBold, { color: colors.text }]}>تم إرسال اختبارك بنجاح</Text>
          <Text style={[styles.resultSub, { color: colors.muted }]}>وصل فيديوك إلى المشرف للمراجعة</Text>
          {!isTilawah ? (
            <Text style={[styles.resultBold, { color: colors.text, marginTop: 12 }]}>
              تم إرسال الفيديو بنجاح. سيقوم معلم القرآن بمراجعته، وستتلقى الرد خلال ٢٤ ساعة.
            </Text>
          ) : null}
        </Card>
        <Card style={styles.timelineCard}>
          <Text style={[styles.timelineTitle, { color: colors.primary }]}>حالة الاختبار</Text>
          <View style={styles.timeline}>
            <TimelineStep icon="checkmark" label="تم الاستلام" state="done" colors={colors} />
            <TimelineStep icon="time-outline" label="قيد المراجعة" state="active" colors={colors} />
            <TimelineStep icon="star" label="النتيجة" state="next" colors={colors} />
          </View>
        </Card>
        <Card>
          <Text style={[styles.reviewNote, { color: colors.text }]}>سيتم مراجعة الاختبار والرد خلال ٢٤ ساعة من الإرسال</Text>
          <Text style={[styles.reviewListTitle, { color: colors.text }]}>سيتم إشعارك عند:</Text>
          {["الموافقة على طلبك", "فتح المواعيد للاختيار", "طلب إعادة التسجيل (مع ملاحظات)"].map((t) => (
            <View key={t} style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>{t}</Text></View>
          ))}
        </Card>
        <Button label="العودة للرئيسية" onPress={() => router.replace("/student/home" as never)} />
      </StudentScreen>
    );
  }

  /* ── تمت الموافقة ── */
  if (st === "approved") {
    const scores = statusData?.scores as PlacementScores | undefined;
    const scoreItems: Array<{ key: keyof PlacementScores; label: string }> = [
      { key: "tajweed", label: "التجويد" },
      { key: "makharij", label: "مخارج الحروف" },
      { key: "fluency", label: "الطلاقة" },
      { key: "overall", label: "التقييم العام" },
    ];
    const visibleScores = scoreItems.filter((item) => typeof scores?.[item.key] === "number");
    return (
      <StudentScreen title={title}>
        <Card style={styles.centerCard}>
          <View style={[styles.bigIcon, { backgroundColor: `${colors.success}1f` }]}>
            <Icon name="checkmark" size={40} color={colors.success} />
          </View>
          <Text style={[styles.resultTitle, { color: colors.primary }]}>تمت الموافقة!</Text>
          {statusData?.resultLevelName ? (
            <View style={[styles.levelPill, { backgroundColor: `${palette.gold}26`, borderColor: `${palette.gold}4d` }]}>
              <Text style={[styles.levelPillText, { color: colors.text }]}>مستواك المعتمد: <Text style={{ color: palette.goldDark }}>{statusData.resultLevelName}</Text></Text>
            </View>
          ) : null}
          {statusData?.notes ? (
            <View style={[styles.notesBox, { backgroundColor: `${palette.gold}1a`, borderColor: `${palette.gold}33` }]}>
              <Text style={[styles.notesTitle, { color: colors.primary }]}>ملاحظة المراجع:</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{statusData.notes}</Text>
            </View>
          ) : null}
          {visibleScores.length ? (
            <View style={[styles.scoresBox, { backgroundColor: `${colors.primary}0d`, borderColor: `${colors.primary}1a` }]}>
              <Text style={[styles.scoresTitle, { color: colors.primary }]}>تقييم الأداء</Text>
              {visibleScores.map((item) => {
                const value = Math.min(100, Math.max(0, Number(scores?.[item.key] ?? 0)));
                return (
                  <View key={item.key} style={styles.scoreRow}>
                    <View style={styles.scoreLabelRow}>
                      <Text style={[styles.scoreLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.scoreValue, { color: colors.primary }]}>{toAr(Math.round(value))}٪</Text>
                    </View>
                    <View style={[styles.scoreTrack, { backgroundColor: colors.input }]}>
                      <View style={[styles.scoreFill, { width: `${value}%`, backgroundColor: palette.gold }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Card>
        <Button label="اختر موعد حلقتك" icon="calendar-outline" onPress={() => router.push("/student/booking" as never)} />
      </StudentScreen>
    );
  }

  if (status.isLoading) return <StudentScreen title={title}><LoadingState /></StudentScreen>;
  if (status.error && !status.data) return <StudentScreen title={title}><ErrorState onRetry={() => void status.refetch()} /></StudentScreen>;
  if (!permission) return <StudentScreen title={title}><LoadingState /></StudentScreen>;

  const instructions = isTilawah ? INSTRUCTIONS : [...INSTRUCTIONS, ...QURAN_RECORDING_INSTRUCTIONS];
  const currentStep = uploading || submit.isPending ? 3 : videoUri ? 2 : 1;
  const steps = ["التعليمات", "التسجيل", "المعاينة", "الإرسال"];

  return (
    <StudentScreen title={title} subtitle="تقييم مستوى التلاوة">
      {/* بانر إعادة التسجيل بعد الرفض */}
      {st === "rejected" ? (
        <Card style={{ borderStartWidth: 4, borderStartColor: colors.danger, backgroundColor: `${colors.danger}0d` }}>
          <Text style={[styles.rejectedTitle, { color: colors.danger }]}>طُلب منك إعادة التسجيل</Text>
          {statusData?.notes ? (
            <Text style={[styles.rejectedNotes, { color: colors.text }]}>{statusData.notes}</Text>
          ) : (
            <Text style={[styles.rejectedNotes, { color: colors.muted }]}>راجع التعليمات أدناه ثم سجّل فيديو جديداً</Text>
          )}
          <Text style={[styles.rejectedAttempts, { color: colors.muted }]}>تجدّدت محاولاتك — لديك {toAr(MAX_ATTEMPTS)} محاولات جديدة</Text>
        </Card>
      ) : null}

      {/* التوجيه + معالج الخطوات */}
      <Card style={styles.centerCard}>
        <View style={[styles.stepIcon, { backgroundColor: `${colors.primary}1a` }]}>
          <SectionIcon name="camera" size={34} />
        </View>
        <Text style={[styles.introBox, { backgroundColor: `${colors.primary}0d`, color: colors.text }]}>
          ضع الهاتف بشكل مستقيم، واجلس في مكان هادئ قبل بدء اختبار القبول.
        </Text>
        <View style={styles.stepsRow}>
          {steps.map((label, i) => {
            const state = i < currentStep ? "done" : i === currentStep ? "active" : "next";
            return (
              <View key={label} style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  state === "done" && { backgroundColor: palette.gold, borderColor: palette.gold },
                  state === "active" && { backgroundColor: colors.primary, borderColor: colors.primary },
                  state === "next" && { borderColor: colors.border },
                ]}>
                  {state === "done"
                    ? <Icon name="checkmark" size={12} color={palette.burgundy} />
                    : <Text style={[styles.stepNum, { color: state === "next" ? colors.muted : state === "active" ? colors.primaryText : palette.gold }]}>{toAr(i + 1)}</Text>}
                </View>
                <Text style={[styles.stepLabel, { color: state === "next" ? colors.muted : colors.primary }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* التسجيل */}
      <Card>
        {hasRecordingPermission ? (
          <>
            {videoUri ? <RecordedVideoPreview uri={videoUri} style={styles.preview} /> : <NativeCameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />}
            <Button
              label={videoUri ? "إعادة تسجيل الاختبار" : recording ? "إيقاف التسجيل" : "بدء تسجيل الاختبار"}
              icon={videoUri ? "refresh-outline" : recording ? "stop-circle-outline" : "videocam-outline"}
              onPress={() => (videoUri ? resetRecording() : recording ? stopRecording() : void record())}
              disabled={uploading || (!videoUri && attemptsUsed >= MAX_ATTEMPTS)}
            />
            <Text style={[styles.attemptsText, { color: colors.muted }]}>
              المحاولات المستخدمة: {toAr(attemptsUsed)} من {toAr(MAX_ATTEMPTS)} — المدة من {toAr(MIN_SECONDS)} إلى {toAr(MAX_SECONDS)} ثانية
            </Text>
            {videoUri ? (
              <View style={styles.recorded}>
                <View style={styles.recordedHeader}>
                  <Icon name="checkmark-circle-outline" size={22} color={colors.success} />
                  <Text style={[styles.recordedText, { color: colors.text }]}>التسجيل جاهز للمراجعة</Text>
                </View>
                <View style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>{isTilawah ? "تصحيح التلاوة" : "حفظ ومراجعة القرآن"}</Text></View>
                <View style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>مدة التسجيل: {toAr(durationSeconds)} ثانية</Text></View>
                {uploading ? <Text style={[styles.progressText, { color: colors.primary }]}>جارٍ الرفع والتحقق… {uploadProgress}%</Text> : null}
                {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
                {showTuhfaChoice ? (
                  <View style={[styles.tuhfaBox, { borderColor: `${palette.gold}40`, backgroundColor: `${palette.gold}0f` }]}>
                    <Text style={[styles.tuhfaTitle, { color: colors.text }]}>هل تريد حفظ منظومة تحفة الأطفال؟</Text>
                      <Text style={[styles.tuhfaSub, { color: colors.muted }]}>خطوة اختيارية — إجابتك لا تؤثر على نتيجة الاختبار، لكن اختر أحد الخيارين قبل الإرسال</Text>
                    <View style={styles.tuhfaRow}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setStudyTuhfa(true)}
                        style={[styles.tuhfaBtn, studyTuhfa === true ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: `${palette.gold}66`, backgroundColor: `${palette.gold}14` }]}
                      >
                        <Text style={[styles.tuhfaBtnText, { color: studyTuhfa === true ? colors.primaryText : palette.goldDark }]}>أريد</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setStudyTuhfa(false)}
                        style={[styles.tuhfaBtn, studyTuhfa === false ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
                      >
                        <Text style={[styles.tuhfaBtnText, { color: studyTuhfa === false ? colors.primaryText : colors.muted }]}>لا أريد</Text>
                      </Pressable>
                    </View>
                    {studyTuhfa === true ? (
                        <Text style={[styles.tuhfaInfo, { color: colors.text }]}>
                        هي عبارة عن أبيات شعرية تعلمك أحكام التجويد والقراءة القرآنية الصحيحة، وسيكون المقرر عليك (3) أبيات في الحلقة.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Button
                  label={uploading ? "جارٍ الإرسال…" : "إرسال الاختبار"}
                  icon="cloud-upload-outline"
                  loading={uploading || submit.isPending}
                   disabled={uploading || submit.isPending || sent || levelsQuery.isLoading || !!levelsQuery.error || (showTuhfaChoice && studyTuhfa === null)}
                  onPress={() => void uploadAndSubmit()}
                />
                <Button label="حذف التسجيل وإعادة المحاولة" icon="refresh-outline" variant="secondary" disabled={uploading} onPress={resetRecording} />
              </View>
            ) : null}
            {!videoUri && error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Text style={[styles.permissionText, { color: colors.text }]}>نحتاج إذن الكاميرا والميكروفون لتسجيل اختبار القبول.</Text>
            <Button label="منح إذن الكاميرا والميكروفون" icon="lock-open-outline" onPress={() => void requestRecordingPermissions()} />
            <Text style={[styles.permissionNote, { color: colors.muted }]}>إذا رفضت الإذن، افتح إعدادات الجهاز ومنحه يدوياً.</Text>
          </>
        )}
      </Card>

      {/* التعليمات */}
      <Card>
        <Text style={[styles.instructionsTitle, { color: colors.primary }]}>التعليمات</Text>
        {instructions.map((t) => (
          <View key={t} style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>{t}</Text></View>
        ))}
      </Card>
    </StudentScreen>
  );
}

function RecordedVideoPreview({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = false; });
  return <NativeVideoView player={player} style={style} nativeControls contentFit="contain" />;
}

function TimelineStep({
  icon,
  label,
  state,
  colors,
}: {
  icon: string;
  label: string;
  state: "done" | "active" | "next";
  colors: { primary: string; muted: string; border: string; primaryText: string };
}) {
  const color = state === "next" ? colors.muted : colors.primary;
  return (
    <View style={styles.timelineStep}>
      <View style={[
        styles.timelineDot,
        {
          backgroundColor: state === "done" ? palette.gold : state === "active" ? colors.primary : "transparent",
          borderColor: state === "next" ? colors.border : state === "done" ? palette.gold : colors.primary,
        },
      ]}>
        <Icon name={icon} size={13} color={state === "done" ? palette.burgundy : state === "active" ? colors.primaryText : color} />
      </View>
      <Text style={[styles.timelineLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerCard: { alignItems: "center", paddingVertical: 20 },
  bigIcon: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  resultTitle: { fontFamily: "Amiri_700Bold", fontSize: 27 },
  resultBold: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14.5, textAlign: "center", marginTop: 6, lineHeight: 24 },
  resultSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, marginTop: 4, textAlign: "center" },
  reviewNote: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", lineHeight: 22 },
  reviewListTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right", marginTop: 12, marginBottom: 8 },
  levelPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 8, marginTop: 10 },
  levelPillText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  notesBox: { borderRadius: 14, borderWidth: 1, padding: 13, marginTop: 14, alignSelf: "stretch" },
  notesTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  notesText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 5 },
  rejectedTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  rejectedNotes: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 6 },
  rejectedAttempts: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, textAlign: "right", marginTop: 8 },
  stepIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  introBox: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12.5, lineHeight: 21, textAlign: "center", overflow: "hidden" },
  stepsRow: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 18 },
  stepItem: { alignItems: "center", gap: 5 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepNum: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11.5 },
  stepLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 9.5 },
  camera: { width: "100%", aspectRatio: 3 / 4, borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  attemptsText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 8 },
  recorded: { alignItems: "stretch", gap: 8, marginTop: 16 },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: "#1d1b1a", marginBottom: 12 },
  recordedHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  recordedText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  progressText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right" },
  errorText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 8 },
  permissionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, textAlign: "right", lineHeight: 23, marginBottom: 14 },
  permissionNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", lineHeight: 20, marginTop: 12 },
  instructionsTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right", marginBottom: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  tuhfaBox: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 6 },
  tuhfaTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "center" },
  tuhfaSub: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center" },
  tuhfaRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  tuhfaBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, alignItems: "center" },
  tuhfaBtnText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  tuhfaInfo: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 8 },
  bullet: { width: 8, height: 8, marginTop: 6, borderRadius: 2, backgroundColor: palette.gold, transform: [{ rotate: "45deg" }] },
  bulletText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12.5, lineHeight: 21, textAlign: "right", flex: 1 },
  timelineCard: { paddingVertical: 18 },
  timelineTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right", marginBottom: 15 },
  timeline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", position: "relative" },
  timelineStep: { alignItems: "center", gap: 5, flex: 1 },
  timelineDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  timelineLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10, textAlign: "center" },
  scoresBox: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 16, gap: 12 },
  scoresTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  scoreRow: { gap: 6 },
  scoreLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "right" },
  scoreValue: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  scoreTrack: { height: 8, borderRadius: 8, overflow: "hidden" },
  scoreFill: { height: 8, borderRadius: 8 },
});
