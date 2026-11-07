import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Crypto from "expo-crypto";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StudentScreen, LoadingState, ErrorState, Card } from "../../components/student/student-screen";
import { Button, Icon } from "../../components/ui";
import SectionIcon from "../../components/ui/section-icon";
import { LocalVideoPreview } from "../../components/library/library-media-player";
import { PlacementPreview } from "../../components/placement/placement-preview";
import { PlacementRecordingHUD } from "../../components/placement/placement-recording-hud";
import { placementCaptureMetrics, usesPlacementCameraMode } from "../../lib/placement/placement-capture-layout";
import { inspectIOSPlacementVideo, prepareIOSPlacementRecording } from "../../modules/tabyan-session-recorder/src";
import {
  deriveIOSPlacementPreviewViewModel, hasPlacementCapturePermissions, isIOSPlacementPreviewPhase,
  placementMediaFailure, placementVideoUploadMetadata, type PlacementVideoInspection,
} from "../../lib/placement/placement-media";
import { useTheme, palette } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { uploadNativeVideo } from "../../lib/media/mobile-upload";
import { reviewableCameraProps, reviewableRecordingOptions } from "../../lib/media/native-recording";
import { trpc } from "../../lib/trpc";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { getAccountGeneration, isCurrentAccountGeneration, onAccountTransition } from "../../lib/account-transition";
import { removePrivateTemporaryFile, trackPrivateTemporaryFile } from "../../lib/media/private-temporary-files";
import { createPermissionSettingsReturnWatcher, readPlacementPermissionStatus, type PermissionReturnWatcher } from "../../lib/platform/permission-settings-return";
import {
  canStartPlacementRecording,
  canStopPlacementRecording,
  elapsedRecordingSeconds,
  hasReachedMaximumDuration,
  hasReachedMinimumDuration,
  microphoneFailureMessage,
  placementRecorderPhaseForFlow,
  shouldConfirmPlacementNavigation,
  transitionPlacementRecorderPhase,
  type PlacementRecorderEvent,
  type PlacementRecorderPhase,
} from "../../lib/placement/placement-recording";

// ── مطابق لصفحة اختبار القبول في الموقع (Placement.tsx) ─────────────────────
const NON_IOS_ATTEMPT_LIMIT = 5;
const MIN_SECONDS = 45;
// نفس حد التسجيل في تجربة الموقع. لا يتغير عقد الإرسال؛ القيمة ترسل كما هي عند توفرها.
const MAX_SECONDS = 300;

const INSTRUCTIONS = ["اقرأ سورة الفاتحة", "اقرأ ما تيسّر من حفظك"];
const QURAN_RECORDING_INSTRUCTIONS = [
  "ضع الهاتف أمامك مباشرة.",
  "ارفع صوتك بوضوح أثناء التلاوة.",
  "اجلس في مكان هادئ قبل التسجيل.",
];

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toAr = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const formatElapsedTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${toAr(minutes).padStart(2, "٠")}:${toAr(remainder).padStart(2, "٠")}`;
};

type PlacementFlowState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "WAITING_CAMERA"
  | "READY"
  | "COUNTDOWN"
  | "STARTING"
  | "RECORDING"
  | "STOPPING"
  | "FINALIZING"
  | "VALIDATING"
  | "RECORDED"
  | "PREVIEW"
  | "UPLOADING"
  | "SUBMITTED"
  | "ERROR";

type PlacementScores = {
  tajweed?: number;
  makharij?: number;
  fluency?: number;
  overall?: number;
};

export default function Placement() {
  const params = useLocalSearchParams<{ path?: string; levelId?: string }>();
  const isTilawah = params.path === "tajweed_correction";
  const pathType = isTilawah ? "tajweed_correction" : "quran";
  const levelIdParam = Number(params.levelId) || undefined;
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors } = useTheme();

  const [permission, request, getCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission, getMicrophonePermission] = useMicrophonePermissions();
  const [captureState, setCaptureState] = useState<PlacementFlowState>("IDLE");
  const [cameraReady, setCameraReady] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdownValue, setCountdownValue] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [maxDurationReached, setMaxDurationReached] = useState(false);
  const inspectedMediaRef = useRef<PlacementVideoInspection | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reservingAttempt, setReservingAttempt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptReserved, setAttemptReserved] = useState(false);
  const [studyTuhfa, setStudyTuhfa] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const captureStateRef = useRef<PlacementFlowState>("IDLE");
  const recorderPhaseRef = useRef<PlacementRecorderPhase>("permission");
  const cameraReadyRef = useRef(false);
  const recordingInFlightRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const permissionRequestInFlightRef = useRef(false);
  const permissionReturnWatcherRef = useRef<PermissionReturnWatcher | null>(null);
  const submitInFlightGenerationRef = useRef<number | null>(null);
  const recordingStartedAt = useRef<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownValueRef = useRef(0);
  const countdownResolveRef = useRef<((completed: boolean) => void) | null>(null);
  const discardRecordingRef = useRef(false);
  const leaveAlertOpenRef = useRef(false);
  const videoUriRef = useRef<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const pathTypeRef = useRef(pathType);
  if (pathTypeRef.current !== pathType) pathTypeRef.current = pathType;
  const setDraftVideoUri = useCallback((uri: string | null) => {
    inspectedMediaRef.current = null;
    videoUriRef.current = uri;
    setVideoUri(uri);
  }, []);
  const setActiveAttemptId = useCallback((id: string | null) => {
    attemptIdRef.current = id;
    setAttemptId(id);
  }, []);
  const transitionFlow = useCallback((next: PlacementFlowState) => {
    captureStateRef.current = next;
    recorderPhaseRef.current = placementRecorderPhaseForFlow(next);
    setCaptureState(next);
  }, []);
  const advanceRecordingPhase = useCallback((event: PlacementRecorderEvent, next: PlacementFlowState) => {
    const phase = recorderPhaseRef.current;
    const nextPhase = transitionPlacementRecorderPhase(phase, event);
    if (nextPhase === phase) return false;
    transitionFlow(next);
    return true;
  }, [transitionFlow]);
  const clearCountdown = useCallback((updateUi = true) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    const resolve = countdownResolveRef.current;
    countdownResolveRef.current = null;
    countdownValueRef.current = 0;
    if (updateUi) setCountdownValue(0);
    resolve?.(false);
  }, []);
  const runCountdown = useCallback((accountGeneration: number, requestedPath: string) => new Promise<boolean>((resolve) => {
    clearCountdown(false);
    countdownValueRef.current = 3;
    setCountdownValue(3);
    countdownResolveRef.current = resolve;
    countdownTimerRef.current = setInterval(() => {
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== requestedPath) {
        clearCountdown(false);
        return;
      }
      const next = countdownValueRef.current - 1;
      countdownValueRef.current = next;
      if (next <= 0) {
        const complete = countdownResolveRef.current;
        countdownResolveRef.current = null;
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdownValue(0);
        complete?.(true);
      } else {
        setCountdownValue(next);
      }
    }, 700);
  }), [clearCountdown]);
  const handleCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
    setCameraReady(true);
    if (
      !recordingInFlightRef.current
      && ["IDLE", "WAITING_CAMERA", "ERROR"].includes(captureStateRef.current)
    ) {
      transitionFlow("READY");
    }
  }, [transitionFlow]);
  const handleCameraMountError = useCallback(() => {
    cameraReadyRef.current = false;
    setCameraReady(false);
    setError("تعذر تجهيز الكاميرا. أغلق الشاشة وافتحها ثم حاول مرة أخرى.");
    transitionFlow("ERROR");
  }, [transitionFlow]);
  const stopActiveRecording = useCallback((showError = true) => {
    if (!canStopPlacementRecording(captureStateRef.current, stopRequestedRef.current)) return;
    stopRequestedRef.current = true;
    if (!advanceRecordingPhase("stop", "FINALIZING")) transitionFlow("FINALIZING");
    try {
      if (!cameraRef.current) throw new Error("camera unavailable");
      cameraRef.current.stopRecording();
    } catch {
      stopRequestedRef.current = false;
      transitionFlow("RECORDING");
      if (showError) setError("تعذر إيقاف التسجيل. حاول مرة أخرى.");
    }
  }, [advanceRecordingPhase, transitionFlow]);

  const refreshPermissionsAfterSettings = useCallback(async () => {
    const accountGeneration = getAccountGeneration();
    try {
      const currentPermissions = await readPlacementPermissionStatus(getCameraPermission, getMicrophonePermission);
      if (!isCurrentAccountGeneration(accountGeneration)) return;
      setError(null);
      if (!currentPermissions.camera.granted || !currentPermissions.microphone.granted) {
        cameraReadyRef.current = false;
        setCameraReady(false);
        transitionFlow("IDLE");
        return;
      }
      transitionFlow(cameraReadyRef.current ? "READY" : "WAITING_CAMERA");
    } catch {
      if (!isCurrentAccountGeneration(accountGeneration)) return;
      setError("تعذر تحديث إذن الكاميرا والميكروفون. تحقق من إعدادات الجهاز وحاول مرة أخرى.");
    }
  }, [getCameraPermission, getMicrophonePermission, transitionFlow]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const watcher = createPermissionSettingsReturnWatcher({
      subscribe: (listener) => AppState.addEventListener("change", listener),
      refresh: refreshPermissionsAfterSettings,
      getGeneration: getAccountGeneration,
      isCurrentGeneration: isCurrentAccountGeneration,
      initialAppState: AppState.currentState,
    });
    permissionReturnWatcherRef.current = watcher;
    return () => {
      watcher.dispose();
      if (permissionReturnWatcherRef.current === watcher) {
        permissionReturnWatcherRef.current = null;
      }
    };
  }, [refreshPermissionsAfterSettings]);

  useFocusEffect(useCallback(() => {
    permissionReturnWatcherRef.current?.onScreenFocus();
  }, []));

  useEffect(() => {
    if (captureState !== "RECORDING") return;
    const updateElapsed = () => {
      const startedAt = recordingStartedAt.current;
      if (startedAt !== null) {
        const elapsed = elapsedRecordingSeconds(startedAt, Date.now(), MAX_SECONDS);
        setElapsedSeconds(elapsed);
        if (hasReachedMaximumDuration(elapsed, MAX_SECONDS)) {
          setMaxDurationReached(true);
          stopActiveRecording(false);
        }
      }
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [captureState, stopActiveRecording]);

  useEffect(() => {
    if (Platform.OS !== "ios" || !shouldConfirmPlacementNavigation(captureState)) return;
    return navigation.addListener("beforeRemove", (event) => {
      event.preventDefault();
      if (leaveAlertOpenRef.current) return;
      leaveAlertOpenRef.current = true;
      const finalizing = ["FINALIZING", "STOPPING", "VALIDATING"].includes(captureStateRef.current);
      const buttons = finalizing
        ? [{
            text: "حسناً",
            onPress: () => { leaveAlertOpenRef.current = false; },
          }]
        : [
            {
              text: "متابعة التسجيل",
              style: "cancel" as const,
              onPress: () => { leaveAlertOpenRef.current = false; },
            },
            {
              text: "إلغاء التسجيل",
              style: "destructive" as const,
              onPress: () => {
                leaveAlertOpenRef.current = false;
                discardRecordingRef.current = true;
                stopActiveRecording(false);
              },
            },
          ];
      Alert.alert(
        finalizing ? "جارٍ حفظ التسجيل" : "التسجيل جارٍ الآن",
        finalizing ? "انتظر اكتمال حفظ الفيديو قبل مغادرة الشاشة." : "هل تريد إلغاء التسجيل؟",
        buttons,
        { cancelable: false },
      );
    });
  }, [captureState, navigation, stopActiveRecording]);

  useEffect(() => onAccountTransition(() => {
    permissionReturnWatcherRef.current?.reset();
    clearCountdown();
    stopActiveRecording(false);
    if (!cameraRef.current) {
      cameraReadyRef.current = false;
      setCameraReady(false);
    }
    const previousVideoUri = videoUriRef.current;
    videoUriRef.current = null;
    if (previousVideoUri) void removePrivateTemporaryFile(previousVideoUri).catch(() => undefined);
    setVideoUri(null);
    setDurationSeconds(0);
    setElapsedSeconds(0);
    setMaxDurationReached(false);
    setUploadProgress(0);
    setReservingAttempt(false);
    setActiveAttemptId(null);
    setAttemptReserved(false);
    setError(null);
    setAttemptsUsed(0);
    setStudyTuhfa(null);
    if (!recordingInFlightRef.current) {
      transitionFlow(cameraReadyRef.current ? "READY" : "IDLE");
    }
  }), [clearCountdown, stopActiveRecording, setActiveAttemptId, transitionFlow]);
  useEffect(() => () => {
    if (videoUri) void removePrivateTemporaryFile(videoUri).catch(() => undefined);
  }, [videoUri]);
  useEffect(() => {
    clearCountdown();
    stopActiveRecording(false);
    if (!cameraRef.current) {
      cameraReadyRef.current = false;
      setCameraReady(false);
    }
    setDraftVideoUri(null);
    setDurationSeconds(0);
    setMaxDurationReached(false);
    setUploadProgress(0);
    setReservingAttempt(false);
    setAttemptsUsed(0);
    setActiveAttemptId(null);
    setAttemptReserved(false);
    setStudyTuhfa(null);
    setError(null);
    if (!recordingInFlightRef.current) {
      transitionFlow(cameraReadyRef.current ? "READY" : "IDLE");
    }
  }, [pathType, clearCountdown, setActiveAttemptId, setDraftVideoUri, stopActiveRecording, transitionFlow]);
  useEffect(() => () => {
    clearCountdown(false);
    stopActiveRecording(false);
  }, [clearCountdown, stopActiveRecording]);

  const status = trpc.student.placementStatus.useQuery(undefined, { enabled: !!token, refetchInterval: 15_000 });
  const statusData = status.data as any;
  const attemptsMax = Platform.OS === "ios"
    ? Number.isSafeInteger(statusData?.maxAttempts) && statusData.maxAttempts >= 0
      ? statusData.maxAttempts
      : 0
    : NON_IOS_ATTEMPT_LIMIT;
  const recordAttempt = trpc.student.recordPlacementAttempt.useMutation();
  const st = statusData?.status as string | undefined;
  const submit = trpc.student.submitPlacement.useMutation();
  const utils = trpc.useUtils();
  const needsLevelCheck = !isTilawah && levelIdParam != null;

  const reserveAttempt = async (
    id: string,
    duration: number,
    accountGeneration: number,
    recordedPath: "quran" | "tajweed_correction",
  ) => {
    if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
    setReservingAttempt(true);
    try {
      const result = await recordAttempt.mutateAsync({
        attemptId: id,
        pathType: recordedPath,
        durationSeconds: duration,
      });
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
      setAttemptsUsed(Math.max(0, Math.min(attemptsMax, result.attemptsUsed)));
      if (attemptIdRef.current === id) {
        setAttemptReserved(true);
        setError(null);
      }
      void utils.student.placementStatus.invalidate();
    } catch (cause) {
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
      if (attemptIdRef.current === id) {
        setAttemptReserved(false);
        setError(userFacingErrorMessage(cause, "تعذر حفظ المحاولة على الحساب. أعد المحاولة قبل الإرسال."));
      }
      void utils.student.placementStatus.invalidate();
    } finally {
      if (
        isCurrentAccountGeneration(accountGeneration)
        && pathTypeRef.current === recordedPath
        && attemptIdRef.current === id
      ) {
        setReservingAttempt(false);
      }
    }
  };

  // منظومة تحفة الأطفال: تظهر في أول أربعة مستويات مرتبة من مسار القرآن فقط — مطابق للموقع والخادم
  const levelsQuery = trpc.student.levels.useQuery({ path: "quran" }, { enabled: !!token && needsLevelCheck });
  const quranLevels = (levelsQuery.data ?? []) as Array<{ id: number }>;
  const matchedLevelIndex = levelIdParam != null ? quranLevels.findIndex((l) => l.id === levelIdParam) : -1;
  const showTuhfaChoice = !isTilawah && matchedLevelIndex >= 0 && matchedLevelIndex < 4;

  // الخادم هو مصدر الحقيقة؛ تتم مزامنة العداد بعد التحميل وبعد الرفض/الإرسال.
  useEffect(() => {
    const byPath = statusData?.attemptsByPath as Record<string, number> | undefined;
    const serverCount = byPath?.[pathType];
    if (typeof serverCount === "number") setAttemptsUsed(Math.max(0, Math.min(attemptsMax, serverCount)));
  }, [pathType, statusData, attemptsMax]);

  const title = isTilawah ? "تصحيح التلاوة — اختبار القبول" : "اختبار القبول";
  const previewModel = deriveIOSPlacementPreviewViewModel({
    flowState: captureState,
    uri: videoUri,
    media: inspectedMediaRef.current,
    fallbackDurationSeconds: durationSeconds,
    minSeconds: MIN_SECONDS,
    maxSeconds: MAX_SECONDS,
    attemptsUsed,
    attemptsMax,
  });
  const hasRecordingPermission = hasPlacementCapturePermissions(!!permission?.granted, !!microphonePermission?.granted);
  const isRecording = captureState === "RECORDING";
  const isUploading = captureState === "UPLOADING";
  const isSubmitted = captureState === "SUBMITTED";
  const permissionNeedsSettings = [permission, microphonePermission].some(
    (item) => item?.status === "denied" && item.canAskAgain === false,
  );
  const requestRecordingPermissions = async () => {
    if (permissionRequestInFlightRef.current) return false;
    permissionRequestInFlightRef.current = true;
    const accountGeneration = getAccountGeneration();
    const requestedPath = pathTypeRef.current;
    transitionFlow("REQUESTING_PERMISSION");
    setError(null);
    try {
      const cameraResult = permission?.granted ? permission : await request();
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== requestedPath) return false;
      if (!cameraResult.granted) {
        setError("يلزم السماح باستخدام الكاميرا لتسجيل اختبار القبول.");
        transitionFlow("ERROR");
        return false;
      }

      // iOS presents one system permission sheet at a time; request these in order.
      const microphoneResult = microphonePermission?.granted
        ? microphonePermission
        : await requestMicrophonePermission();
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== requestedPath) return false;
      if (!microphoneResult.granted) {
        setError("يلزم السماح باستخدام الميكروفون لتسجيل صوت التلاوة.");
        transitionFlow("ERROR");
        return false;
      }

      setError(null);
      transitionFlow(cameraReadyRef.current ? "READY" : "WAITING_CAMERA");
      return true;
    } catch {
      if (isCurrentAccountGeneration(accountGeneration) && pathTypeRef.current === requestedPath) {
        setError("تعذر طلب إذن الكاميرا والميكروفون. تحقق من إعدادات الجهاز وحاول مرة أخرى.");
        transitionFlow("ERROR");
      }
      return false;
    } finally {
      permissionRequestInFlightRef.current = false;
    }
  };
  const openPermissionSettings = async () => {
    if (Platform.OS === "web") return;
    const accountGeneration = getAccountGeneration();
    permissionReturnWatcherRef.current?.markSettingsOpened();
    try {
      await Linking.openSettings();
    } catch {
      permissionReturnWatcherRef.current?.cancelSettingsReturn();
      if (!isCurrentAccountGeneration(accountGeneration)) return;
      setError("تعذر فتح إعدادات الجهاز. افتح الإعدادات يدوياً واسمح بالكاميرا والميكروفون.");
    }
  };

  const record = async () => {
    if (!canStartPlacementRecording(captureStateRef.current, recordingInFlightRef.current)) return;
    recordingInFlightRef.current = true;
    const accountGeneration = getAccountGeneration();
    const recordedPath = pathType;
    let uncommittedUri: string | null = null;
    try {
      if (status.isLoading || status.error) {
        setError("تعذر التحقق من محاولاتك على الحساب. أعد المحاولة قبل التسجيل.");
        transitionFlow("ERROR");
        return;
      }
      if (attemptsUsed >= attemptsMax) {
        setError(`استنفدت محاولاتك (${toAr(attemptsMax)}). انتظر مراجعة المشرف.`);
        transitionFlow("ERROR");
        return;
      }
      if (videoUriRef.current) {
        transitionFlow("PREVIEW");
        return;
      }
      if (!hasRecordingPermission) {
        await requestRecordingPermissions();
        return;
      }
      if (!cameraReadyRef.current) {
        setError("جارٍ تجهيز الكاميرا. انتظر ظهور المعاينة ثم ابدأ التسجيل.");
        transitionFlow("WAITING_CAMERA");
        return;
      }
      const camera = cameraRef.current;
      if (!camera) {
        setError("تعذر تشغيل الكاميرا. أعد فتح الشاشة وحاول مرة أخرى.");
        transitionFlow("ERROR");
        return;
      }

      setError(null);
      setElapsedSeconds(0);
      setMaxDurationReached(false);
      stopRequestedRef.current = false;
      discardRecordingRef.current = false;
      if (recorderPhaseRef.current === "error") advanceRecordingPhase("retry", "READY");
      if (Platform.OS === "ios") {
        if (!advanceRecordingPhase("start", "COUNTDOWN")) return;
        const countdownCompleted = await runCountdown(accountGeneration, recordedPath);
        if (!countdownCompleted || !isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) {
          return;
        }
        if (!advanceRecordingPhase("countdownComplete", "STARTING")) return;
      } else if (!advanceRecordingPhase("startImmediately", "STARTING")) {
        return;
      }
      if (Platform.OS === "ios") {
        await prepareIOSPlacementRecording();
        if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
      }
      const recordingPromise = camera.recordAsync({
        maxDuration: MAX_SECONDS,
        ...reviewableRecordingOptions,
      });
      if (!recordingPromise || typeof recordingPromise.then !== "function") {
        throw new Error("camera did not start a recording");
      }
      // expo-camera has no recording-start event; start timing only after the
      // native recorder accepts the request, never during the countdown.
      recordingStartedAt.current = Date.now();
      if (!advanceRecordingPhase("recordingStarted", "RECORDING")) {
        camera.stopRecording();
        throw new Error("camera did not enter the recording state");
      }
      const result = await recordingPromise;
      uncommittedUri = result?.uri ?? null;
      if (uncommittedUri && !(await trackPrivateTemporaryFile(uncommittedUri, accountGeneration))) {
        uncommittedUri = null;
        return;
      }
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) {
        if (uncommittedUri) await removePrivateTemporaryFile(uncommittedUri);
        uncommittedUri = null;
        return;
      }
      if (captureStateRef.current === "RECORDING") {
        stopRequestedRef.current = true;
        advanceRecordingPhase("stop", "FINALIZING");
      }
      if (discardRecordingRef.current) {
        if (uncommittedUri) await removePrivateTemporaryFile(uncommittedUri);
        uncommittedUri = null;
        setDraftVideoUri(null);
        setElapsedSeconds(0);
        setError(null);
        transitionFlow(cameraReadyRef.current ? "READY" : "IDLE");
        return;
      }
      const dur = Math.max(1, elapsedRecordingSeconds(
        recordingStartedAt.current ?? Date.now(),
        Date.now(),
        MAX_SECONDS,
      ));
      if (hasReachedMaximumDuration(dur, MAX_SECONDS)) setMaxDurationReached(true);
      if (dur < MIN_SECONDS) {
        if (uncommittedUri) await removePrivateTemporaryFile(uncommittedUri);
        uncommittedUri = null;
        setDraftVideoUri(null);
        setError(`مدة التسجيل ${toAr(dur)} ثانية — الحد الأدنى ${toAr(MIN_SECONDS)} ثانية. سجّل مرة أخرى.`);
        transitionFlow("ERROR");
        return;
      }
      if (!uncommittedUri) {
        setError("تعذر حفظ ملف التسجيل. أعد المحاولة.");
        transitionFlow("ERROR");
        return;
      }
      const id = Crypto.randomUUID();
      if (Platform.OS === "ios") {
        if (!advanceRecordingPhase("finalized", "VALIDATING")) transitionFlow("VALIDATING");
      } else {
        transitionFlow("RECORDED");
      }
      setDraftVideoUri(uncommittedUri);
      const finalizedUri = uncommittedUri;
      uncommittedUri = null;
      setDurationSeconds(dur);
      setElapsedSeconds(dur);
      setActiveAttemptId(id);
      setAttemptReserved(false);
      if (Platform.OS !== "ios") transitionFlow("PREVIEW");
      // Preserve consumption: a valid-length finalized recording reserves its
      // attempt just as before, even if subsequent file inspection rejects it.
      await reserveAttempt(id, dur, accountGeneration, recordedPath);
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
      if (Platform.OS === "ios") {
        let media: PlacementVideoInspection;
        try {
          media = await inspectIOSPlacementVideo(finalizedUri);
        } catch (cause) {
          if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
          inspectedMediaRef.current = null;
          setError(userFacingErrorMessage(cause, "تعذر فحص ملف التسجيل. أعد التسجيل أو حدّث نسخة التطبيق."));
          transitionFlow("ERROR");
          return;
        }
        if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath || videoUriRef.current !== finalizedUri) return;
        inspectedMediaRef.current = media;
        const failure = placementMediaFailure(media, MIN_SECONDS, MAX_SECONDS);
        setDurationSeconds(media.durationSeconds);
        if (failure) {
          setError(failure);
          transitionFlow("ERROR");
          return;
        }
      }
      if (Platform.OS === "ios") {
        if (!advanceRecordingPhase("validated", "PREVIEW")) transitionFlow("PREVIEW");
      }
    } catch (cause) {
      if (uncommittedUri) {
        await removePrivateTemporaryFile(uncommittedUri).catch(() => undefined);
        uncommittedUri = null;
      }
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) return;
      setError(
        microphoneFailureMessage(cause, Platform.OS === "ios")
          ?? (Platform.OS === "ios"
            ? userFacingErrorMessage(cause, "تعذر بدء تسجيل الفيديو أو الصوت. أعد المحاولة.")
            : "تعذر تسجيل الفيديو أو الصوت. تحقق من إذن الكاميرا والميكروفون ثم أعد المحاولة."),
      );
      transitionFlow("ERROR");
    } finally {
      clearCountdown(false);
      recordingStartedAt.current = null;
      stopRequestedRef.current = false;
      recordingInFlightRef.current = false;
      discardRecordingRef.current = false;
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== recordedPath) {
        transitionFlow(cameraReadyRef.current ? "READY" : "IDLE");
      } else if (["COUNTDOWN", "STARTING", "RECORDING", "STOPPING", "FINALIZING", "RECORDED"].includes(captureStateRef.current)) {
        transitionFlow(videoUriRef.current ? "PREVIEW" : cameraReadyRef.current ? "READY" : "IDLE");
      }
    }
  };
  const stopRecording = () => stopActiveRecording();
  const resetRecording = () => {
    const currentVideoUri = videoUriRef.current;
    if (
      !currentVideoUri
      || attemptsUsed >= attemptsMax
      || recordingInFlightRef.current
      || submitInFlightGenerationRef.current === getAccountGeneration()
    ) return;
    void removePrivateTemporaryFile(currentVideoUri).catch(() => undefined);
    setDraftVideoUri(null);
    setDurationSeconds(0);
    setElapsedSeconds(0);
    setMaxDurationReached(false);
    setUploadProgress(0);
    setError(null);
    setReservingAttempt(false);
    setActiveAttemptId(null);
    setAttemptReserved(false);
    if (Platform.OS === "ios") setStudyTuhfa(null);
    cameraReadyRef.current = false;
    setCameraReady(false);
    if (!advanceRecordingPhase("rerecord", "WAITING_CAMERA")) transitionFlow("WAITING_CAMERA");
  };
  const uploadAndSubmit = async () => {
    if (
      !videoUri
      || captureStateRef.current === "UPLOADING"
      || submit.isPending
      || submitInFlightGenerationRef.current === getAccountGeneration()
    ) return;
    if (Platform.OS === "ios" && !previewModel.submissionReady) {
      setError(previewModel.failureMessage ?? "يجب نجاح فحص الصورة والصوت داخل ملف التسجيل قبل الإرسال.");
      return;
    }
    const accountGeneration = getAccountGeneration();
    if (!attemptId || !attemptReserved) {
      setError("يجب تثبيت المحاولة على حسابك قبل إرسال الاختبار.");
      return;
    }
    // سؤال المنظومة آخر خطوة — لا يُرسل الاختبار قبل إجابة صريحة عند ظهوره
    if (needsLevelCheck && levelsQuery.isLoading) { setError("جارٍ التحقق من مستوى المسار قبل الإرسال."); return; }
    if (needsLevelCheck && levelsQuery.error) { setError("تعذر التحقق من مستوى المسار. أعد المحاولة."); return; }
    if (showTuhfaChoice && studyTuhfa === null) { setError("أجب عن سؤال المنظومة أدناه لإكمال الإرسال."); return; }
    submitInFlightGenerationRef.current = accountGeneration;
    if (!advanceRecordingPhase("accept", "UPLOADING")) transitionFlow("UPLOADING");
    setError(null);
    let serverConfirmed = false;
    try {
      let uploadMetadata: { name: string; contentType: string } | undefined;
      if (Platform.OS === "ios") {
        let media: PlacementVideoInspection;
        try {
          media = await inspectIOSPlacementVideo(videoUri);
        } catch (cause) {
          if (isCurrentAccountGeneration(accountGeneration) && pathTypeRef.current === pathType) {
            inspectedMediaRef.current = null;
          }
          throw cause;
        }
        if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== pathType) return;
        inspectedMediaRef.current = media;
        const revalidated = deriveIOSPlacementPreviewViewModel({
          flowState: "PREVIEW",
          uri: videoUri,
          media,
          fallbackDurationSeconds: durationSeconds,
          minSeconds: MIN_SECONDS,
          maxSeconds: MAX_SECONDS,
          attemptsUsed,
          attemptsMax,
        });
        setDurationSeconds(media.durationSeconds);
        if (!revalidated.submissionReady) {
          throw new Error(revalidated.failureMessage ?? "يجب نجاح فحص الصورة والصوت داخل ملف التسجيل قبل الإرسال.");
        }
        uploadMetadata = placementVideoUploadMetadata(media);
      }
      const uploaded = await uploadNativeVideo(videoUri, setUploadProgress, {
        expectedAccountGeneration: accountGeneration,
        ...uploadMetadata,
      });
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== pathType) return;
      await submit.mutateAsync({
        videoUrl: uploaded.playableObjectPath,
        videoProof: uploaded.videoProof,
        attemptId,
        pathType,
        studyTuhfa: showTuhfaChoice ? studyTuhfa === true : undefined,
        levelId: !isTilawah ? levelIdParam : undefined,
      });
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== pathType) return;
      serverConfirmed = true;
      setDraftVideoUri(null);
      if (!advanceRecordingPhase("uploadSucceeded", "SUBMITTED")) transitionFlow("SUBMITTED");
      void utils.student.placementStatus.invalidate();
    } catch (cause) {
      if (!isCurrentAccountGeneration(accountGeneration) || pathTypeRef.current !== pathType) return;
      setError(userFacingErrorMessage(cause, "خطأ في إرسال الفيديو، يرجى المحاولة مرة أخرى."));
      if (!advanceRecordingPhase("uploadFailed", "PREVIEW")) transitionFlow("PREVIEW");
    } finally {
      if (submitInFlightGenerationRef.current === accountGeneration) {
        submitInFlightGenerationRef.current = null;
      }
      if (
        isCurrentAccountGeneration(accountGeneration)
        && pathTypeRef.current === pathType
        && !serverConfirmed
      ) {
        if (!advanceRecordingPhase("uploadFailed", "PREVIEW")) transitionFlow("PREVIEW");
      }
    }
  };

  /* ── بعد الإرسال / قيد المراجعة ── */
  if (isSubmitted || (st === "pending" && statusData?.hasVideo)) {
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
            <TimelineStep icon="check" label="تم الاستلام" state="done" colors={colors} />
            <TimelineStep icon="clock" label="قيد المراجعة" state="active" colors={colors} />
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
            <Icon name="check" size={40} color={colors.success} />
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
        <Button label="اختر موعد حلقتك" icon="calendar" onPress={() => router.push("/student/booking" as never)} />
      </StudentScreen>
    );
  }

  if (status.isLoading) return <StudentScreen title={title}><LoadingState /></StudentScreen>;
  if (status.error && !status.data) return <StudentScreen title={title}><ErrorState onRetry={() => void status.refetch()} /></StudentScreen>;
  if (!permission) return <StudentScreen title={title}><LoadingState /></StudentScreen>;

  const instructions = isTilawah ? INSTRUCTIONS : [...INSTRUCTIONS, ...QURAN_RECORDING_INSTRUCTIONS];
  const currentStep = Platform.OS === "ios"
    ? previewModel.phase === "UPLOADING" ? 3 : isIOSPlacementPreviewPhase(previewModel.phase) ? 2 : 1
    : isUploading || submit.isPending ? 3 : videoUri ? 2 : 1;
  const steps = ["التعليمات", "التسجيل", "المعاينة", "الإرسال"];
  const cameraMode = usesPlacementCameraMode(Platform.OS, captureState);
  const captureControl = (
    <PlacementShutter
      state={captureState}
      belowCamera={cameraMode}
      disabled={isRecording
        ? captureState !== "RECORDING"
        : status.isLoading || !!status.error || attemptsUsed >= attemptsMax
          || !canStartPlacementRecording(captureState, recordingInFlightRef.current)}
      onPress={() => {
        if (captureStateRef.current === "RECORDING") stopRecording();
        else void record();
      }}
    />
  );

  if (Platform.OS === "ios" && videoUri && isIOSPlacementPreviewPhase(previewModel.phase)) {
    return (
      <StudentScreen title={title}>
        <PlacementPreview
          model={previewModel}
          uri={videoUri}
          error={error}
          attemptReserved={attemptReserved}
          reservingAttempt={reservingAttempt}
          isUploading={isUploading}
          submitPending={submit.isPending}
          uploadProgress={uploadProgress}
          workflowReady={
            attemptReserved
            && !reservingAttempt
            && !isUploading
            && !submit.isPending
            && !(needsLevelCheck && (levelsQuery.isLoading || !!levelsQuery.error))
            && (!showTuhfaChoice || studyTuhfa !== null)
          }
          canReset={
            attemptReserved
            && !reservingAttempt
            && !isUploading
            && !submit.isPending
            && submitInFlightGenerationRef.current !== getAccountGeneration()
          }
          hasAttemptId={!!attemptId}
          accessory={showTuhfaChoice ? (
            <View style={[styles.tuhfaBox, { borderColor: `${palette.gold}40`, backgroundColor: `${palette.gold}0f` }]}>
              <Text style={[styles.tuhfaTitle, { color: colors.text }]}>هل تريد حفظ منظومة تحفة الأطفال؟</Text>
              <Text style={[styles.tuhfaSub, { color: colors.muted }]}>
                اختر أحد الخيارين قبل الإرسال. إجابتك لا تؤثر على نتيجة الاختبار.
              </Text>
              <View style={styles.tuhfaRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStudyTuhfa(true)}
                  style={[
                    styles.tuhfaBtn,
                    studyTuhfa === true
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { borderColor: `${palette.gold}66`, backgroundColor: `${palette.gold}14` },
                  ]}
                >
                  <Text style={[styles.tuhfaBtnText, { color: studyTuhfa === true ? colors.primaryText : palette.goldDark }]}>أريد</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStudyTuhfa(false)}
                  style={[
                    styles.tuhfaBtn,
                    studyTuhfa === false
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tuhfaBtnText, { color: studyTuhfa === false ? colors.primaryText : colors.muted }]}>لا أريد</Text>
                </Pressable>
              </View>
              {studyTuhfa === true ? (
                <Text style={[styles.tuhfaInfo, { color: colors.text }]}>
                  هي أبيات شعرية لتعلّم أحكام التجويد، وسيكون المقرر ثلاثة أبيات في الحلقة.
                </Text>
              ) : null}
            </View>
          ) : null}
          onSubmit={() => void uploadAndSubmit()}
          onRerecord={resetRecording}
          onResyncAttempt={attemptId
            ? () => void reserveAttempt(attemptId, durationSeconds, getAccountGeneration(), pathType)
            : undefined}
        />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen title={title} subtitle="تقييم مستوى التلاوة" cameraMode={cameraMode}>
      {/* بانر إعادة التسجيل بعد الرفض */}
      {st === "rejected" && !cameraMode ? (
        <Card style={{ borderRightWidth: 4, borderRightColor: colors.danger, backgroundColor: `${colors.danger}0d` }}>
          <Text style={[styles.rejectedTitle, { color: colors.danger }]}>طُلب منك إعادة التسجيل</Text>
          {statusData?.notes ? (
            <Text style={[styles.rejectedNotes, { color: colors.text }]}>{statusData.notes}</Text>
          ) : (
            <Text style={[styles.rejectedNotes, { color: colors.muted }]}>راجع التعليمات أدناه ثم سجّل فيديو جديداً</Text>
          )}
          <Text style={[styles.rejectedAttempts, { color: colors.muted }]}>تجدّدت محاولاتك — لديك {toAr(attemptsMax)} محاولات جديدة</Text>
        </Card>
      ) : null}

      {/* التوجيه + معالج الخطوات */}
      {!cameraMode ? <Card key="placement-guidance" style={styles.centerCard}>
        {Platform.OS !== "ios" || !videoUri ? <>
        <View style={[styles.stepIcon, { backgroundColor: `${colors.primary}1a` }]}>
          <SectionIcon name="camera" size={34} />
        </View>
        <Text style={[styles.introBox, { backgroundColor: `${colors.primary}0d`, color: colors.text }]}>
          ضع الهاتف بشكل مستقيم، واجلس في مكان هادئ قبل بدء اختبار القبول.
        </Text>
        </> : null}
        <View style={[styles.stepsRow, Platform.OS === "ios" && videoUri ? { marginTop: 0 } : undefined]}>
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
                    ? <Icon name="check" size={12} color={palette.burgundy} />
                    : <Text style={[styles.stepNum, { color: state === "next" ? colors.muted : state === "active" ? colors.primaryText : palette.gold }]}>{toAr(i + 1)}</Text>}
                </View>
                <Text style={[styles.stepLabel, { color: state === "next" ? colors.muted : colors.primary }]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </Card> : null}

      {/* التسجيل */}
      <Card key="placement-capture" style={cameraMode ? styles.recordingCaptureCard : undefined}>
        {attemptsUsed >= attemptsMax && !videoUri ? (
          <View style={styles.exhaustedState}>
            <View style={[styles.exhaustedIcon, { backgroundColor: `${palette.gold}26` }]}>
              <SectionIcon name="shield" size={34} />
            </View>
            <Text style={[styles.exhaustedTitle, { color: colors.primary }]}>انتهت المحاولات</Text>
            <Text style={[styles.exhaustedText, { color: colors.muted }]}>
              استُخدمت جميع المحاولات المتاحة لاختبار القبول ({toAr(attemptsMax)} محاولات). للحصول على محاولة إضافية، يرجى التواصل مع الإدارة.
            </Text>
            <View style={[styles.exhaustedContact, { backgroundColor: `${palette.gold}26` }]}>
              <Icon name="help" size={16} color={palette.goldDark} />
              <Text style={[styles.exhaustedContactText, { color: palette.goldDark }]}>تواصل مع الإدارة لإعادة فتح المحاولات</Text>
            </View>
          </View>
        ) : hasRecordingPermission ? (
          <>
            {videoUri && Platform.OS !== "ios" ? (
              <LocalVideoPreview
                uri={videoUri}
                style={styles.preview}
              />
            ) : videoUri ? (
              <Text style={{ color: colors.muted }}>
                {previewModel.phase === "VALIDATING"
                  ? "جارٍ فحص مسارات الصورة والصوت في الملف…"
                  : "تعذر اعتماد التسجيل للمعاينة والإرسال. أعد التسجيل."}
              </Text>
            ) : (
              <View style={[styles.cameraStage, cameraMode ? styles.expandedCameraStage : undefined, { backgroundColor: colors.background }]}>
                <CameraView
                  ref={cameraRef}
                  style={[StyleSheet.absoluteFillObject, styles.cameraView]}
                  facing="front"
                  mode="video"
                  mute={false}
                  {...reviewableCameraProps}
                  onCameraReady={handleCameraReady}
                  onMountError={handleCameraMountError}
                />
                {Platform.OS === "ios" && isRecording ? (
                  <PlacementRecordingHUD
                    elapsed={formatElapsedTime(elapsedSeconds)}
                    maximum={formatElapsedTime(MAX_SECONDS)}
                    minimumLabel={toAr(MIN_SECONDS)}
                    minimumReached={hasReachedMinimumDuration(elapsedSeconds, MIN_SECONDS)}
                  />
                ) : null}
                {cameraMode && !isRecording ? (
                  <View pointerEvents="none" style={[styles.capturePhaseNotice, { backgroundColor: colors.card }]}>
                    <Text style={[styles.finalizingText, { color: colors.text }]}>
                      {captureState === "COUNTDOWN" ? `استعد للتسجيل: ${toAr(countdownValue)}`
                        : captureState === "STARTING" ? "جارٍ بدء التسجيل…"
                          : "جارٍ حفظ ملف التسجيل…"}
                    </Text>
                  </View>
                ) : null}
                {Platform.OS === "ios" && !cameraMode ? (
                  <View style={styles.captureOverlay}>
                    {captureState === "COUNTDOWN" ? (
                      <View style={[styles.countdownBadge, { backgroundColor: colors.card }]}>
                        <Text style={[styles.countdownText, { color: colors.primary }]}>{toAr(countdownValue)}</Text>
                      </View>
                    ) : captureState === "FINALIZING" || captureState === "STOPPING" ? (
                      <View style={[styles.finalizingBadge, { backgroundColor: colors.card }]}>
                        <Text style={[styles.finalizingText, { color: colors.text }]}>جارٍ حفظ ملف التسجيل…</Text>
                      </View>
                    ) : captureState === "STARTING" ? (
                      <View style={[styles.finalizingBadge, { backgroundColor: colors.card }]}>
                        <Text style={[styles.finalizingText, { color: colors.text }]}>جارٍ بدء التسجيل…</Text>
                      </View>
                    ) : !cameraReady ? (
                      <View style={[styles.finalizingBadge, { backgroundColor: colors.card }]}>
                        <Text style={[styles.finalizingText, { color: colors.text }]}>جارٍ تجهيز الكاميرا…</Text>
                      </View>
                    ) : null}
                    {cameraReady ? captureControl : null}
                  </View>
                ) : null}
              </View>
            )}
            {cameraMode && !videoUri ? (
              <View style={styles.captureFooter}>{cameraReady ? captureControl : null}</View>
            ) : null}
            {videoUri && maxDurationReached ? (
              <Text style={[styles.maximumDurationNotice, { color: colors.success }]}>اكتمل الحد الأقصى للتسجيل</Text>
            ) : null}
            {videoUri ? null : captureState === "RECORDING" && Platform.OS !== "ios" ? (
              <View style={[styles.recordingStatus, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}44` }]}>
                <View style={styles.recordingStatusLabel}>
                  <View style={[styles.recordingDot, { backgroundColor: colors.danger }]} />
                  <Text style={[styles.recordingStatusText, { color: colors.danger }]}>التسجيل جارٍ</Text>
                </View>
                <Text style={[styles.recordingTimer, { color: colors.text }]}>{formatElapsedTime(elapsedSeconds)}</Text>
              </View>
            ) : captureState === "STOPPING" || captureState === "FINALIZING" ? (
              <Text style={[styles.recordingStatusText, { color: colors.muted }]}>جارٍ حفظ ملف التسجيل…</Text>
            ) : null}
            {Platform.OS !== "ios" ? (
              <Button
                testID="placement-record-button"
                label={
                  videoUri
                    ? (attemptsUsed >= attemptsMax ? "انتهت محاولات التسجيل" : "إعادة تسجيل الاختبار")
                    : isRecording
                      ? "إيقاف التسجيل"
                      : captureState === "STARTING"
                        ? "جارٍ بدء التسجيل…"
                        : !cameraReady
                          ? "جارٍ تجهيز الكاميرا…"
                          : "بدء تسجيل الاختبار"
                }
                icon={videoUri ? (attemptsUsed >= attemptsMax ? "lock" : "refresh") : isRecording ? "stop" : "video"}
                loading={captureState === "STARTING" || captureState === "STOPPING" || captureState === "FINALIZING"}
                onPress={() => {
                  if (videoUri) resetRecording();
                  else if (captureStateRef.current === "RECORDING") stopRecording();
                  else void record();
                }}
                disabled={
                  isUploading
                  || reservingAttempt
                  || status.isLoading
                  || !!status.error
                  || attemptsUsed >= attemptsMax
                  || (videoUri !== null && !attemptReserved)
                  || (!videoUri && !cameraReady)
                  || ["REQUESTING_PERMISSION", "WAITING_CAMERA", "COUNTDOWN", "STARTING", "STOPPING", "FINALIZING"].includes(captureState)
                  || (recordingInFlightRef.current && !isRecording)
                }
              />
            ) : !videoUri && !cameraMode ? (
              <View style={[styles.preRecordInfo, { backgroundColor: `${colors.primary}0d`, borderColor: `${colors.primary}22` }]}>
                <Text style={[styles.preRecordAttempt, { color: colors.primary }]}>
                  المحاولة {toAr(Math.min(attemptsMax, attemptsUsed + 1))} من {toAr(attemptsMax)}
                </Text>
                <Text style={[styles.preRecordDescription, { color: colors.text }]}>
                  ارفع صوتك بوضوح. مدة التسجيل من {toAr(MIN_SECONDS)} إلى {toAr(MAX_SECONDS)} ثانية.
                </Text>
              </View>
            ) : null}
            {!cameraMode ? (
              <Text style={[styles.attemptsText, { color: colors.muted }]}>
                {Platform.OS === "ios"
                  ? `المحاولات المستخدمة: ${toAr(attemptsUsed)} من ${toAr(attemptsMax)}`
                  : `المحاولات المستخدمة: ${toAr(attemptsUsed)} من ${toAr(attemptsMax)} — المدة من ${toAr(MIN_SECONDS)} إلى ${toAr(MAX_SECONDS)} ثانية`}
              </Text>
            ) : null}
            {videoUri && captureState !== "VALIDATING" ? (
              <View style={styles.recorded}>
                <View style={styles.recordedHeader}>
                    <Icon
                      name={Platform.OS !== "ios" || previewModel.submissionReady ? "check-circle" : "alert-triangle"}
                      size={22}
                      color={Platform.OS !== "ios" || previewModel.submissionReady ? colors.success : colors.danger}
                    />
                  <Text style={[styles.recordedText, { color: colors.text }]}>
                    {Platform.OS === "ios" && !previewModel.submissionReady ? "التسجيل غير معتمد بعد" : "التسجيل جاهز للمراجعة"}
                  </Text>
                </View>
                {attemptsUsed >= attemptsMax ? (
                  <Text style={[styles.finalAttemptNotice, { color: colors.muted }]}>
                    {Platform.OS === "ios" && !previewModel.submissionReady
                      ? "لا يمكن إرسال هذا التسجيل قبل تأكيد الصورة والصوت. تواصل مع الإدارة لإعادة فتح محاولة."
                      : "احتفظ بهذا التسجيل وأرسله للمراجعة. للحصول على محاولة إضافية، تواصل مع الإدارة."}
                  </Text>
                ) : null}
                <View style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>{isTilawah ? "تصحيح التلاوة" : "حفظ ومراجعة القرآن"}</Text></View>
                <View style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>مدة التسجيل: {toAr(durationSeconds)} ثانية</Text></View>
                {isUploading ? <Text style={[styles.progressText, { color: colors.primary }]}>جارٍ الرفع والتحقق… {uploadProgress}%</Text> : null}
                {!attemptReserved && attemptId ? (
                  <Button
                    label={reservingAttempt ? "جارٍ تثبيت المحاولة…" : "إعادة مزامنة المحاولة"}
                    icon="refresh"
                    loading={reservingAttempt}
                    disabled={reservingAttempt}
                    onPress={() => void reserveAttempt(attemptId, durationSeconds, getAccountGeneration(), pathType)}
                  />
                ) : null}
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
                  label={isUploading ? "جارٍ الإرسال…" : "إرسال الاختبار"}
                  icon="upload"
                  loading={isUploading || submit.isPending}
                  disabled={
                    isUploading
                    || reservingAttempt
                    || !attemptReserved
                    || submit.isPending
                    || isSubmitted
                    || (Platform.OS === "ios" && !previewModel.submissionReady)
                    || (needsLevelCheck && (levelsQuery.isLoading || !!levelsQuery.error))
                    || (showTuhfaChoice && studyTuhfa === null)
                  }
                  onPress={() => void uploadAndSubmit()}
                />
                {attemptsUsed < attemptsMax ? (
                  <Button
                    label="حذف التسجيل وإعادة المحاولة"
                    icon="refresh"
                    variant="secondary"
                    disabled={isUploading || reservingAttempt || !attemptReserved || submit.isPending}
                    onPress={resetRecording}
                  />
                ) : null}
              </View>
            ) : null}
            {!videoUri && error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Text style={[styles.permissionText, { color: colors.text }]}>نحتاج إذن الكاميرا والميكروفون لتسجيل اختبار القبول.</Text>
            {permissionNeedsSettings ? (
              <Button
                label="فتح إعدادات الجهاز"
                icon="settings"
                onPress={() => void openPermissionSettings()}
              />
            ) : (
              <Button
                label={captureState === "REQUESTING_PERMISSION" ? "جارٍ طلب الإذن…" : "منح إذن الكاميرا والميكروفون"}
                icon="lock"
                loading={captureState === "REQUESTING_PERMISSION"}
                disabled={captureState === "REQUESTING_PERMISSION"}
                onPress={() => void requestRecordingPermissions()}
              />
            )}
            {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
            <Text style={[styles.permissionNote, { color: colors.muted }]}>إذا رفضت الإذن، افتح إعدادات الجهاز ومنحه يدوياً.</Text>
          </>
        )}
      </Card>

      {/* التعليمات */}
      {!cameraMode && (Platform.OS !== "ios" || !videoUri) ? <Card key="placement-instructions">
        <Text style={[styles.instructionsTitle, { color: colors.primary }]}>التعليمات</Text>
        {instructions.map((t) => (
          <View key={t} style={styles.bulletRow}><View style={styles.bullet} /><Text style={[styles.bulletText, { color: colors.text }]}>{t}</Text></View>
        ))}
      </Card> : null}
    </StudentScreen>
  );
}


function PlacementShutter({ state, disabled, onPress, belowCamera }: {
  state: PlacementFlowState; disabled: boolean; onPress: () => void; belowCamera: boolean;
}) {
  const { colors } = useTheme();
  const recording = state === "RECORDING";
  const finishing = state === "STOPPING" || state === "FINALIZING";
  const busy = finishing || state === "STARTING" || state === "COUNTDOWN";
  return <>
    <Pressable
      testID="placement-record-button"
      accessibilityRole="button"
      accessibilityLabel={recording ? "إيقاف تسجيل فيديو اختبار القبول" : busy ? "انتظر إنهاء العملية" : "بدء تسجيل فيديو اختبار القبول"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.shutterRing,
        belowCamera ? styles.compactShutterRing : undefined,
        belowCamera ? { borderColor: colors.primary, backgroundColor: `${colors.primary}12` } : undefined,
        { opacity: disabled ? 0.55 : pressed ? 0.82 : 1 },
      ]}
    >
      {recording || finishing
        ? <View style={[styles.shutterStop, { backgroundColor: colors.danger }]} />
        : <View style={[styles.shutterCore, { backgroundColor: colors.danger }]} />}
    </Pressable>
    <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={[styles.shutterCaption, belowCamera ? { color: colors.text } : undefined]}>
      {recording ? "إيقاف التسجيل" : state === "COUNTDOWN" ? "استعد للتسجيل" : busy ? "انتظر قليلاً" : "ابدأ التسجيل"}
    </Text>
  </>;
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
  exhaustedState: { alignItems: "center", paddingVertical: 18, paddingHorizontal: 8 },
  exhaustedIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  exhaustedTitle: { fontFamily: "Amiri_700Bold", fontSize: 23, textAlign: "center" },
  exhaustedText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "center", marginTop: 6 },
  exhaustedContact: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, marginTop: 14 },
  exhaustedContactText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11 },
  finalAttemptNotice: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 19, textAlign: "right" },
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
  stepsRow: { flexDirection: "row-reverse", justifyContent: "center", gap: 18, marginTop: 18 },
  stepItem: { alignItems: "center", gap: 5 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepNum: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11.5 },
  stepLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 9.5 },
  cameraStage: { width: "100%", aspectRatio: 3 / 4, borderRadius: 18, overflow: "hidden", marginBottom: 12, position: "relative" },
  recordingCaptureCard: { flex: 1, minHeight: 0, padding: 0, marginBottom: 0, borderWidth: 0, backgroundColor: "transparent" },
  expandedCameraStage: { flex: 1, minHeight: 0, aspectRatio: undefined, marginBottom: 0 },
  captureFooter: { height: placementCaptureMetrics.controlsHeight, flexShrink: 0, alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 4 },
  capturePhaseNotice: { position: "absolute", top: 8, left: 12, right: 12, borderRadius: 12, padding: 10 },
  cameraView: { borderRadius: 18 },
  captureOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 152, alignItems: "center", justifyContent: "flex-end", gap: 7, paddingHorizontal: 14, paddingTop: 36, paddingBottom: 14, backgroundColor: "rgba(20, 15, 14, 0.56)" },
  countdownBadge: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, borderColor: "white" },
  countdownText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 46, lineHeight: 56 },
  finalizingBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
  finalizingText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "center" },
  shutterRing: { width: 84, height: 84, minWidth: 84, minHeight: 84, borderRadius: 42, borderWidth: 5, borderColor: "white", backgroundColor: "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" },
  compactShutterRing: { width: 76, height: 76, minWidth: 76, minHeight: 76, borderRadius: 38 },
  shutterCore: { width: 56, height: 56, borderRadius: 28 },
  shutterStop: { width: 30, height: 30, borderRadius: 6 },
  shutterCaption: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18, color: "white", textAlign: "center" },
  preRecordInfo: { alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 6 },
  preRecordAttempt: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  preRecordDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "center" },
  recordingStatus: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  recordingStatusLabel: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  recordingDot: { width: 9, height: 9, borderRadius: 5 },
  recordingStatusText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "center" },
  recordingTimer: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "center", writingDirection: "ltr" },
  attemptsText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 8 },
  audioVerification: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  audioVerificationText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 18, textAlign: "right", flex: 1 },
  maximumDurationNotice: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "center", marginBottom: 8 },
  recorded: { alignItems: "stretch", gap: 8, marginTop: 16 },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: "#1d1b1a", marginBottom: 12 },
  recordedHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  recordedText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
  progressText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, textAlign: "right" },
  errorText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 8 },
  permissionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, textAlign: "right", lineHeight: 23, marginBottom: 14 },
  permissionNote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", lineHeight: 20, marginTop: 12 },
  instructionsTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right", marginBottom: 10 },
  bulletRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, marginBottom: 7 },
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
