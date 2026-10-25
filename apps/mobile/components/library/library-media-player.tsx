import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useEventListener } from "expo";
import { VideoPlayerStatus, VideoView, useVideoPlayer, type VideoSource } from "expo-video";
import { Button, Card, EmptyState, ErrorState, Icon } from "../ui";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";
import { useAuth } from "../../lib/auth";
import { apiOrigin } from "../../lib/trpc";
import {
  privateObjectPathFromUrl,
  resolveLibraryPlayableSource,
  type LibraryPlayableSource,
} from "../../lib/media/library-media";
import {
  downloadPrivateMediaToCache,
  removeCachedPrivateMedia,
  type CachePreparationStage,
} from "../../lib/media/private-media-cache";

const NativeVideoView = VideoView as unknown as React.ComponentType<any>;

export type LibraryMediaDiagnosticError = {
  code: string | number | null;
  message: string | null;
  nativeError: string | { code?: string | number; domain?: string; message?: string } | null;
};

export type LibraryMediaDiagnosticEvent = {
  status: VideoPlayerStatus;
  error: LibraryMediaDiagnosticError | null;
};

type PreparationDiagnosticDetails = Record<string, boolean | number | string | null | undefined>;
type PreparationStage =
  | CachePreparationStage
  | "AUTH_NOT_READY"
  | "PLAYER_SOURCE"
  | "PLAYER_RUNTIME"
  | "PLAYER_UNSUPPORTED"
  | "PLAYBACK_URL_REQUEST"
  | "WEB_MEDIA_ELEMENT"
  | "UNKNOWN";

export function placementVideoDiagnosticCode(
  stage: PreparationStage,
  platform: "web" | "ios" | "android" = Platform.OS as "web" | "ios" | "android",
) {
  if (platform !== "web") {
    const nativeNumber: Record<PreparationStage, string> = {
      AUTH_NOT_READY: "01",
      DOWNLOAD_STARTED: "02",
      DOWNLOAD_FAILED: "02",
      ACCESS_REJECTED: "09",
      CACHE_WRITE_STARTED: "03",
      CACHE_WRITE_FAILED: "03",
      LOCAL_FILE_MISSING: "04",
      LOCAL_FILE_EMPTY: "05",
      LOCAL_FILE_READY: "06",
      PLAYER_SOURCE: "06",
      MEDIA_UNSUPPORTED: "08",
      PLAYER_RUNTIME: "07",
      PLAYER_UNSUPPORTED: "08",
      PLAYBACK_URL_REQUEST: "09",
      WEB_MEDIA_ELEMENT: "99",
      UNKNOWN: "99",
    };
    return `NV${nativeNumber[stage]}${platform === "ios" ? "-I" : "-A"}`;
  }

  const number = stage === "PLAYER_RUNTIME"
    ? "15"
    : stage === "PLAYBACK_URL_REQUEST"
      ? "16"
      : stage === "WEB_MEDIA_ELEMENT"
        ? "18"
        : "99";
  return `PV${number}-W`;
}

function formatDiagnosticMessage(message: string, code: string | null) {
  return code ? `${message}\nرمز التشخيص: ${code}` : message;
}

function preparationDiagnostic(step: string, details: PreparationDiagnosticDetails = {}) {
  // Internal diagnostics only. Never include the source URL, bearer token, or
  // any user identity in preparation logs.
  console.info("[Tabyan secure-video preparation]", JSON.stringify({
    step,
    platform: Platform.OS,
    ...details,
  }));
}

function preparationFailure(step: string, error: unknown) {
  const candidate = error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: typeof error, message: String(error) };
  console.warn("[Tabyan secure-video preparation]", JSON.stringify({
    step,
    platform: Platform.OS,
    errorName: candidate.name,
    errorType: typeof error === "object" && error !== null ? error.constructor?.name : typeof error,
  }));
}

function createDiagnosticRequestId() {
  const cryptoApi = (globalThis as {
    crypto?: {
      randomUUID?: () => string;
      getRandomValues?: (array: Uint8Array) => Uint8Array;
    };
  }).crypto;
  const value = cryptoApi?.randomUUID?.();
  if (value && /^[0-9a-f-]{36}$/i.test(value)) return value;
  if (!cryptoApi?.getRandomValues) return null;
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function safeDiagnosticError(error: unknown): LibraryMediaDiagnosticError | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    nativeError?: unknown;
  };
  const code = typeof candidate.code === "string" || typeof candidate.code === "number" ? candidate.code : null;
  const message = typeof candidate.message === "string" ? candidate.message.slice(0, 500) : null;
  let nativeError: LibraryMediaDiagnosticError["nativeError"] = null;
  if (typeof candidate.nativeError === "string") {
    nativeError = candidate.nativeError.slice(0, 500);
  } else if (candidate.nativeError && typeof candidate.nativeError === "object") {
    const native = candidate.nativeError as { code?: unknown; domain?: unknown; message?: unknown };
    nativeError = {
      code: typeof native.code === "string" || typeof native.code === "number" ? native.code : undefined,
      domain: typeof native.domain === "string" ? native.domain.slice(0, 200) : undefined,
      message: typeof native.message === "string" ? native.message.slice(0, 500) : undefined,
    };
  }
  return { code, message, nativeError };
}

function nativePlayerDiagnosticCode(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : "";
  const unsupported = /unsupported|decoder|decode|codec|format|cannot open/i.test(message);
  return placementVideoDiagnosticCode(unsupported ? "PLAYER_UNSUPPORTED" : "PLAYER_RUNTIME");
}

function safeNativeDiagnosticError(code: string): LibraryMediaDiagnosticError {
  return { code, message: null, nativeError: null };
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "—";
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Extracts a YouTube video ID without embedding a WebView in the native app. */
export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v") ?? "";
        return /^[\w-]{11}$/.test(id) ? id : null;
      }
      const match = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
      return match?.[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Minimal local-file preview player for a just-recorded, not-yet-uploaded
 * video (placement/KYC self-review). No auth resolution needed — the URI is
 * the device's own local recording, never a private object reference.
 */
export type LocalPreviewAudioStatus = "checking" | "available" | "missing";

export function LocalVideoPreview({
  uri,
  style,
  placementControls = false,
  onAudioTrackStatusChange,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  placementControls?: boolean;
  onAudioTrackStatusChange?: (status: LocalPreviewAudioStatus) => void;
}) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    if (Platform.OS === "ios" && placementControls) {
      instance.muted = false;
      instance.volume = 1;
      instance.audioMixingMode = "doNotMix";
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying: nextPlaying }) => {
    setIsPlaying(nextPlaying);
    if (nextPlaying) setHasEnded(false);
  });
  useEventListener(player, "playToEnd", () => {
    setIsPlaying(false);
    setHasEnded(true);
  });
  useEventListener(player, "availableAudioTracksChange", ({ availableAudioTracks }) => {
    onAudioTrackStatusChange?.(availableAudioTracks.length > 0 ? "available" : "missing");
  });
  useEventListener(player, "sourceLoad", () => {
    onAudioTrackStatusChange?.(player.availableAudioTracks.length > 0 ? "available" : "missing");
  });

  return (
    <View style={[
      placementControls ? styles.placementPreviewFrame : styles.localPreviewFrame,
      { backgroundColor: colors.background },
      style,
    ]}>
      <NativeVideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        nativeControls={!placementControls}
        contentFit="contain"
      />
      {placementControls && !isPlaying ? (
        <View pointerEvents="box-none" style={styles.localPreviewPlayLayer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasEnded ? "إعادة تشغيل التسجيل" : "تشغيل معاينة التسجيل"}
            testID="placement-preview-play"
            onPress={() => {
              if (Platform.OS === "ios" && placementControls) {
                player.muted = false;
                player.volume = 1;
              }
              if (hasEnded || (player.duration > 0 && player.currentTime >= player.duration)) {
                player.currentTime = 0;
              }
              player.play();
            }}
            style={({ pressed }) => [
              styles.localPreviewPlay,
              styles.placementPreviewPlay,
              { backgroundColor: colors.card, borderColor: "white", opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Icon name={hasEnded ? "refresh" : "play"} size={24} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function LibraryMediaPlayer({
  source,
  contentType,
  preferPrivateDownload = false,
  onDiagnosticEvent,
  onTimeUpdate,
  initialPositionSeconds = 0,
}: {
  source: string;
  contentType: "audio" | "video";
  preferPrivateDownload?: boolean;
  onDiagnosticEvent?: (event: LibraryMediaDiagnosticEvent) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialPositionSeconds?: number;
}) {
  const { colors } = useTheme();
  const { token, role, ready: authReady } = useAuth();
  const youtubeId = contentType === "video" ? youtubeVideoId(source) : null;
  const resolvedSource = resolveLibraryPlayableSource(source, token);
  const authenticatedSource = resolveLibraryPlayableSource(source, token, "native");
  const [retryKey, setRetryKey] = useState(0);
  const [cachedSource, setCachedSource] = useState<LibraryPlayableSource | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [preparationErrorCode, setPreparationErrorCode] = useState<string | null>(null);
  const [playerErrorCode, setPlayerErrorCode] = useState<string | null>(null);
  const fallbackAttempted = useRef(false);
  const cachedUri = useRef<string | null>(null);
  const sourceGeneration = useRef(0);
  const sourceUri = resolvedSource?.uri ?? "";
  const privateUri = authenticatedSource?.uri ?? "";
  const authorization = authenticatedSource?.headers?.Authorization;
  const privateVideoPreparation = preferPrivateDownload && contentType === "video";
  const webPlacementReview = Platform.OS === "web" && privateVideoPreparation;
  const privateDownloadRequired = privateVideoPreparation
    && authReady
    && !!privateUri
    && !!authorization;
  const nativePrivateDownloadRequired = privateDownloadRequired && !webPlacementReview;

  const releaseCachedSource = useCallback(async (uri: string | null) => {
    if (!uri) return;
    if (Platform.OS === "web" && uri.startsWith("blob:")) {
      URL.revokeObjectURL(uri);
      return;
    }
    if (Platform.OS === "web" && /^https?:\/\//i.test(uri)) return;
    await removeCachedPrivateMedia(uri);
  }, []);

  const releaseCachedSourceAfterUnmount = useCallback((uri: string | null) => {
    if (!uri) return;
    setTimeout(() => void releaseCachedSource(uri), 0);
  }, [releaseCachedSource]);

  useEffect(() => {
    sourceGeneration.current += 1;
    fallbackAttempted.current = false;
    setCachedSource(null);
    setRecovering(false);
    setRecoveryError("");
    setPreparationErrorCode(null);
    setPlayerErrorCode(null);
    const previous = cachedUri.current;
    cachedUri.current = null;
    releaseCachedSourceAfterUnmount(previous);
    return () => {
      sourceGeneration.current += 1;
      const current = cachedUri.current;
      cachedUri.current = null;
      releaseCachedSourceAfterUnmount(current);
    };
  }, [releaseCachedSourceAfterUnmount, sourceUri]);

  const recoverPrivateVideo = useCallback(async () => {
    if (
      contentType !== "video"
      || !privateUri
      || !authorization
      || fallbackAttempted.current
    ) return;

    fallbackAttempted.current = true;
    setRecovering(true);
    setRecoveryError("");
    const generation = sourceGeneration.current;
    let failedStep: PreparationStage = "DOWNLOAD_STARTED";
    try {
      preparationDiagnostic("DOWNLOAD_STARTED", {
        authTokenPresent: !!authorization,
        authHeaderSent: !!authorization,
      });
      const uri = await downloadPrivateMediaToCache(privateUri, { Authorization: authorization }, (stage) => {
        failedStep = stage;
        preparationDiagnostic(stage);
      });
      preparationDiagnostic("LOCAL_FILE_READY", {
        localFileReady: true,
        localUriIsFile: uri.startsWith("file://"),
      });
      if (generation !== sourceGeneration.current) {
        preparationDiagnostic("PREPARATION_STALE_SOURCE_DISCARDED");
        await releaseCachedSource(uri);
        return;
      }
      failedStep = "PLAYER_SOURCE";
      preparationDiagnostic("PLAYER_SOURCE", {
        sourceKind: Platform.OS === "web" ? "short-lived-playback-url" : "local-file",
      });
      cachedUri.current = uri;
      setCachedSource({ uri });
    } catch (error) {
      preparationFailure(failedStep, error);
      if (generation === sourceGeneration.current) {
        setPreparationErrorCode(placementVideoDiagnosticCode(failedStep));
        setRecoveryError("تعذر تجهيز الفيديو للتشغيل الآمن.");
      }
    } finally {
      if (generation === sourceGeneration.current) setRecovering(false);
    }
  }, [authorization, contentType, privateUri, releaseCachedSource]);

  useEffect(() => {
    if (nativePrivateDownloadRequired) void recoverPrivateVideo();
  }, [nativePrivateDownloadRequired, recoverPrivateVideo, retryKey]);

  const retry = useCallback(() => {
    const generation = sourceGeneration.current + 1;
    sourceGeneration.current = generation;
    fallbackAttempted.current = true;
    setRecovering(true);
    setRecoveryError("");
    setPreparationErrorCode(null);
    setPlayerErrorCode(null);

    const previous = cachedUri.current;
    cachedUri.current = null;
    setCachedSource(null);

    setTimeout(() => {
      void releaseCachedSource(previous).finally(() => {
        if (generation !== sourceGeneration.current) return;
        fallbackAttempted.current = false;
        setRetryKey((value) => value + 1);
      });
    }, 0);
  }, [releaseCachedSource]);

  if (youtubeId) {
    return <YouTubeExternalPlayer videoId={youtubeId} />;
  }

  // Keep invalid data away from useVideoPlayer. In particular, an object key
  // must never be displayed or handed to the native player as a raw path.
  if (!resolvedSource) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.text }]}>{contentType === "audio" ? "مشغل الصوت" : "مشغل الفيديو"}</Text>
        <EmptyState title="الملف غير متاح" description="لا يوجد مصدر صالح لتشغيل هذا الملف." />
      </Card>
    );
  }

  if (webPlacementReview) {
    return (
      <PlacementWebVideoPlayer
        source={source}
        privateUri={privateUri}
        authorization={authorization}
        role={role}
        authReady={authReady}
        onDiagnosticEvent={onDiagnosticEvent}
        onTimeUpdate={onTimeUpdate}
        initialPositionSeconds={initialPositionSeconds}
      />
    );
  }

  if (privateVideoPreparation && !authReady && !cachedSource) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.text }]}>مشغل الفيديو</Text>
        <View style={styles.recovery}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ التحقق من جلسة الدخول…</Text>
        </View>
      </Card>
    );
  }

  if (privateVideoPreparation && !privateDownloadRequired && !cachedSource) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.text }]}>مشغل الفيديو</Text>
        <ErrorState
          message={formatDiagnosticMessage(
            "تعذر تجهيز الفيديو للتشغيل الآمن.",
            Platform.OS === "web" ? "PV01A-W" : placementVideoDiagnosticCode("AUTH_NOT_READY"),
          )}
          onRetry={retry}
        />
      </Card>
    );
  }

  if (privateDownloadRequired && !cachedSource) {
    return (
      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.text }]}>مشغل الفيديو</Text>
        {recoveryError
          ? <ErrorState message={formatDiagnosticMessage(recoveryError, preparationErrorCode)} onRetry={retry} />
          : <View style={styles.recovery}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ تجهيز الفيديو للتشغيل الآمن…</Text>
          </View>}
      </Card>
    );
  }

  return (
    <PlayableMedia
      key={`${cachedSource?.uri ?? resolvedSource.uri}:${retryKey}`}
      source={cachedSource ?? resolvedSource}
      contentType={contentType}
      onRetry={retry}
      onPlaybackError={(code) => {
        if (privateVideoPreparation) setPlayerErrorCode(code);
      }}
      diagnosticCode={privateVideoPreparation ? playerErrorCode : null}
      recovering={recovering}
      onDiagnosticEvent={onDiagnosticEvent}
      onTimeUpdate={onTimeUpdate}
      initialPositionSeconds={initialPositionSeconds}
    />
  );
}

function YouTubeExternalPlayer({ videoId }: { videoId: string }) {
  const { colors } = useTheme();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const open = async () => {
    setOpening(true);
    setError("");
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error("unsupported YouTube URL");
      await Linking.openURL(url);
    } catch {
      setError("تعذر فتح فيديو YouTube. تحقق من الاتصال وحاول مرة أخرى.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.text }]}>مشغل الفيديو</Text>
      <View style={[styles.externalVideo, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Icon name="logo-youtube" size={42} color={colors.danger} />
        <Text style={[styles.externalTitle, { color: colors.text }]}>فيديو YouTube</Text>
        <Text style={[styles.externalHint, { color: colors.muted }]}>يفتح في تطبيق YouTube أو المتصفح دون استخدام WebView.</Text>
      </View>
      {error ? <Text style={[styles.externalError, { color: colors.danger }]}>{error}</Text> : null}
      <Button label={opening ? "جارٍ الفتح…" : error ? "إعادة المحاولة" : "فتح الفيديو"} icon="open-outline" loading={opening} disabled={opening} onPress={() => void open()} />
    </Card>
  );
}

type PlacementWebPlayerState = "idle" | "requesting" | "ready" | "error";
type PlacementWebIssueCode =
  | "PV16A-W"
  | "PV16B-W"
  | "PV16C-W"
  | "PV16D-W"
  | "PV16E-W"
  | "PV16F-W"
  | "PV16G-W"
  | "PV16H-W"
  | "PV16I-W"
  | "PV16J-W"
  | "PV16K-W"
  | "PV16Z-W";

type PlacementWebVideoElement = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  error?: { code?: number | null } | null;
  pause?: () => void;
};

type PlacementWebTraceStage =
  | "T0" | "T1" | "T2" | "T3" | "T4" | "T5" | "T6"
  | "T7" | "T8" | "T9" | "T10" | "T11" | "T12" | "T13" | "T14" | "T15";

function placementWebMediaErrorCode(code: unknown) {
  switch (code) {
    case 1: return "PV18A-W";
    case 2: return "PV18B-W";
    case 3: return "PV18C-W";
    case 4: return "PV18D-W";
    default: return "PV18Z-W";
  }
}

function placementWebHttpErrorCode(status: number): PlacementWebIssueCode {
  if (status === 401) return "PV16E-W";
  if (status === 403) return "PV16F-W";
  if (status === 404) return "PV16G-W";
  if (status === 409) return "PV16H-W";
  if (status >= 500) return "PV16I-W";
  return "PV16Z-W";
}

function placementWebErrorMessage(code: string, traceStage: PlacementWebTraceStage | null) {
  const messages: Record<string, string> = {
    "PV18A-W": "أوقف المتصفح تشغيل فيديو اختبار القبول قبل اكتماله.",
    "PV18B-W": "تعذر الوصول إلى بيانات فيديو اختبار القبول.",
    "PV18C-W": "تعذر فك ترميز فيديو اختبار القبول على هذا المتصفح.",
    "PV18D-W": "صيغة فيديو اختبار القبول غير مدعومة على هذا المتصفح.",
    "PV18Z-W": "تعذر تشغيل فيديو اختبار القبول.",
    "PV16A-W": "لم تكتمل جاهزية جلسة الدخول بعد.",
    "PV16B-W": "جلسة الدخول لا تحتوي على رمز مصادقة صالح.",
    "PV16C-W": "تعذر إرسال طلب رابط التشغيل إلى الخادم.",
    "PV16D-W": "تعذر إتمام طلب رابط التشغيل من المتصفح.",
    "PV16E-W": "رفض الخادم جلسة الدخول الحالية.",
    "PV16F-W": "لا تملك جلسة الدخول صلاحية تشغيل فيديو اختبار القبول.",
    "PV16G-W": "لم يعثر الخادم على مسار التشغيل المطلوب.",
    "PV16H-W": "رفض الخادم الطلب بسبب تعارض في الحالة.",
    "PV16I-W": "تعذر الخادم تجهيز رابط التشغيل حالياً.",
    "PV16J-W": "استجابة رابط التشغيل من الخادم غير صالحة.",
    "PV16K-W": "تعذر قراءة استجابة رابط التشغيل من الخادم.",
    "PV16Z-W": "تعذر تجهيز رابط تشغيل فيديو اختبار القبول.",
  };
  const message = messages[code] ?? messages["PV18Z-W"];
  return `${message}\nرمز التشخيص: ${code}${traceStage ? `\nمرحلة التشغيل: ${traceStage}` : ""}`;
}

function PlacementWebVideoPlayer({
  source,
  privateUri,
  authorization,
  role,
  authReady,
  onDiagnosticEvent,
  onTimeUpdate,
  initialPositionSeconds,
}: {
  source: string;
  privateUri: string;
  authorization?: string;
  role: "student" | "teacher" | "admin" | null;
  authReady: boolean;
  onDiagnosticEvent?: (event: LibraryMediaDiagnosticEvent) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialPositionSeconds: number;
}) {
  const { colors } = useTheme();
  const videoRef = useRef<PlacementWebVideoElement | null>(null);
  const onDiagnosticEventRef = useRef(onDiagnosticEvent);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const traceStageRef = useRef<PlacementWebTraceStage | null>(null);
  const requestStartedRef = useRef<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [state, setState] = useState<PlacementWebPlayerState>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorTraceStage, setErrorTraceStage] = useState<PlacementWebTraceStage | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const objectPath = privateObjectPathFromUrl(privateUri);
  const identity = `${source}|${privateUri}`;
  const requestIdentity = `${identity}:${retryNonce}`;

  onDiagnosticEventRef.current = onDiagnosticEvent;
  onTimeUpdateRef.current = onTimeUpdate;

  const recordTrace = useCallback((stage: PlacementWebTraceStage) => {
    traceStageRef.current = stage;
    preparationDiagnostic("PLACEMENT_WEB_VIDEO_TRACE", { stage });
  }, []);

  useEffect(() => {
    setPlaybackUrl(null);
    setState("idle");
    setErrorCode(null);
    setErrorTraceStage(null);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    requestStartedRef.current = null;
    traceStageRef.current = null;
  }, [identity]);

  useEffect(() => {
    const requestKey = requestIdentity;
    if (requestStartedRef.current === requestKey) return;
    if (!authReady) {
      preparationDiagnostic("PLACEMENT_WEB_VIDEO_AUTH_NOT_READY", {
        authReady: false,
        tokenPresent: false,
        role: null,
      });
      return;
    }
    preparationDiagnostic("PLACEMENT_WEB_VIDEO_AUTH_STATE", {
      authReady: true,
      tokenPresent: !!authorization,
      role,
      sessionValid: null,
    });
    if (!authorization) {
      setState("error");
      setErrorCode("PV16B-W");
      return;
    }
    if (role !== "admin") {
      setState("error");
      setErrorCode("PV16F-W");
      return;
    }
    if (!objectPath) {
      setState("error");
      setErrorCode("PV16J-W");
      return;
    }

    requestStartedRef.current = requestKey;
    setState("requesting");
    setErrorCode(null);
    setErrorTraceStage(null);
    recordTrace("T0");
    const requestId = createDiagnosticRequestId();
    preparationDiagnostic("PLACEMENT_WEB_VIDEO_URL_REQUEST", {
      diagnosticRequestId: requestId,
      authTokenPresent: true,
      objectPathPresent: true,
    });

    void (async () => {
      let failureCode: PlacementWebIssueCode = "PV16C-W";
      try {
        const headers: Record<string, string> = {
          Authorization: authorization,
          "Content-Type": "application/json",
        };
        if (requestId) headers["X-Diagnostic-Request-ID"] = requestId;
        const response = await fetch(`${apiOrigin()}/api/storage/placement-playback-url`, {
          method: "POST",
          headers,
          body: JSON.stringify({ objectPath }),
          mode: "cors",
          credentials: "omit",
        });
        if (!response.ok) {
          failureCode = placementWebHttpErrorCode(response.status);
          preparationDiagnostic("PLACEMENT_WEB_VIDEO_URL_REJECTED", {
            status: response.status,
            safeCategory: failureCode,
          });
          throw new Error(`Placement playback URL request failed with status ${response.status}`);
        }
        let payload: { url?: unknown; expiresInSeconds?: unknown };
        try {
          payload = await response.json() as {
            url?: unknown;
            expiresInSeconds?: unknown;
          };
        } catch (error) {
          failureCode = "PV16K-W";
          preparationFailure("PLACEMENT_WEB_VIDEO_RESPONSE_PARSE", error);
          throw error;
        }
        const candidateUrl = typeof payload.url === "string" ? payload.url : "";
        const playbackHref = candidateUrl.startsWith("/")
          ? `${apiOrigin().replace(/\/$/, "")}${candidateUrl}`
          : candidateUrl;
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(playbackHref, apiOrigin());
        } catch {
          failureCode = "PV16J-W";
          throw new Error("Placement playback URL is invalid");
        }
        const apiBase = new URL(apiOrigin());
        if (
          parsedUrl.origin !== apiBase.origin
          || !/^\/api\/storage\/placement-playback\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(parsedUrl.pathname)
          || parsedUrl.searchParams.has("token")
        ) {
          failureCode = "PV16J-W";
          throw new Error("Placement playback URL was rejected");
        }
        recordTrace("T1");
        preparationDiagnostic("PLACEMENT_WEB_VIDEO_URL_RECEIVED", {
          expiresInSeconds: typeof payload.expiresInSeconds === "number" ? payload.expiresInSeconds : null,
          hasOpaquePath: true,
          hasBearerToken: false,
        });
        setPlaybackUrl(playbackHref);
        setState("ready");
      } catch (error) {
        if (failureCode === "PV16C-W" && error instanceof TypeError) {
          const browserOnline = (globalThis as {
            navigator?: { onLine?: boolean };
          }).navigator?.onLine;
          failureCode = browserOnline === true
            ? "PV16D-W"
            : "PV16C-W";
        }
        preparationFailure("PLACEMENT_WEB_VIDEO_URL", error);
        setErrorCode(failureCode);
        setState("error");
      }
    })();
  }, [
    apiOrigin,
    authReady,
    authorization,
    objectPath,
    recordTrace,
    role,
    requestIdentity,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const loaded = () => {
      recordTrace("T4");
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      if (Number.isFinite(initialPositionSeconds) && initialPositionSeconds > 0) {
        try { video.currentTime = initialPositionSeconds; } catch { /* metadata may still be settling */ }
      }
      setDuration(nextDuration);
      onDiagnosticEventRef.current?.({ status: "readyToPlay", error: null });
    };
    const timeUpdate = () => {
      const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setCurrentTime(nextTime);
      setDuration(nextDuration);
      onTimeUpdateRef.current?.(nextTime, nextDuration);
    };
    const play = () => {
      recordTrace("T7");
      setPlaying(true);
      onDiagnosticEventRef.current?.({ status: "readyToPlay", error: null });
    };
    const playing = () => recordTrace("T8");
    const pause = () => setPlaying(false);
    const mediaError = () => {
      recordTrace("T13");
      setPlaying(false);
      const code = placementWebMediaErrorCode(video.error?.code);
      setErrorCode(code);
      setErrorTraceStage(traceStageRef.current);
      setState("error");
      onDiagnosticEventRef.current?.({
        status: "error",
        error: { code, message: "HTML5 video element error", nativeError: null },
      });
    };
    const eventStages: Array<[string, PlacementWebTraceStage]> = [
      ["loadstart", "T3"],
      ["loadeddata", "T5"],
      ["canplay", "T6"],
      ["waiting", "T9"],
      ["stalled", "T10"],
      ["seeking", "T11"],
      ["seeked", "T12"],
      ["emptied", "T14"],
      ["abort", "T15"],
    ];
    const traceHandlers = eventStages.map(([event, stage]) => {
      const handler = () => recordTrace(stage);
      video.addEventListener(event, handler);
      return [event, handler] as const;
    });
    recordTrace("T2");
    video.addEventListener("loadedmetadata", loaded);
    video.addEventListener("playing", playing);
    video.addEventListener("timeupdate", timeUpdate);
    video.addEventListener("play", play);
    video.addEventListener("pause", pause);
    video.addEventListener("error", mediaError);
    onDiagnosticEventRef.current?.({ status: "loading", error: null });
    return () => {
      video.removeEventListener("loadedmetadata", loaded);
      video.removeEventListener("playing", playing);
      video.removeEventListener("timeupdate", timeUpdate);
      video.removeEventListener("play", play);
      video.removeEventListener("pause", pause);
      video.removeEventListener("error", mediaError);
      traceHandlers.forEach(([event, handler]) => video.removeEventListener(event, handler));
      try { (video as any).pause?.(); } catch { /* element may already be detached */ }
    };
  }, [initialPositionSeconds, playbackUrl, recordTrace]);

  const retry = useCallback(() => {
    setPlaybackUrl(null);
    setErrorCode(null);
    setErrorTraceStage(null);
    setState("idle");
    setRetryNonce((value) => value + 1);
  }, []);

  const errorMessage = errorCode ? placementWebErrorMessage(errorCode, errorTraceStage) : "";

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.text }]}>مشغل الفيديو</Text>
      {state === "error" ? (
        <ErrorState message={errorMessage} onRetry={retry} />
      ) : (
        <>
          <View style={[styles.mediaFrame, { backgroundColor: colors.background }]}>
            {playbackUrl ? createElement("video", {
              ref: videoRef,
              src: playbackUrl,
              controls: true,
              preload: "metadata",
              playsInline: true,
              "aria-label": "فيديو اختبار القبول",
              style: {
                width: "100%",
                height: 230,
                display: "block",
                backgroundColor: "#000",
              },
            }) : null}
            {state !== "ready" ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.muted }]}>
                  {state === "requesting" ? "جارٍ تجهيز رابط التشغيل…" : "جارٍ تحميل الفيديو…"}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.controls}>
            <Text style={[styles.time, { color: colors.muted }]}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>
              {playing ? "يعمل الفيديو الآن" : "استخدم أدوات الفيديو للتشغيل أو الإيقاف"}
            </Text>
          </View>
        </>
      )}
    </Card>
  );
}

function PlayableMedia({
  source,
  contentType,
  onRetry,
  onPlaybackError,
  diagnosticCode,
  recovering,
  onDiagnosticEvent,
  onTimeUpdate,
  initialPositionSeconds,
}: {
  source: VideoSource;
  contentType: "audio" | "video";
  onRetry: () => void;
  onPlaybackError: (code: string) => void;
  diagnosticCode: string | null;
  recovering: boolean;
  onDiagnosticEvent?: (event: LibraryMediaDiagnosticEvent) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialPositionSeconds: number;
}) {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<VideoPlayerStatus>("loading");
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 1;
    if (Number.isFinite(initialPositionSeconds) && initialPositionSeconds > 0) {
      instance.currentTime = initialPositionSeconds;
    }
  });

  useEffect(() => {
    setStatus(player.status);
    onDiagnosticEvent?.({ status: player.status, error: null });
    return () => {
      try { player.pause(); } catch { /* player may already be released */ }
    };
  }, [onDiagnosticEvent, player]);
  useEventListener(player, "timeUpdate", ({ currentTime: nextTime }) => {
    setCurrentTime(nextTime);
    setDuration(player.duration);
    onTimeUpdate?.(nextTime, player.duration);
  });
  useEventListener(player, "statusChange", ({ status: nextStatus, error: playerError }) => {
    setStatus(nextStatus);
    const nativeCode = Platform.OS === "web" ? null : nativePlayerDiagnosticCode(playerError);
    onDiagnosticEvent?.({
      status: nextStatus,
      error: nativeCode ? safeNativeDiagnosticError(nativeCode) : safeDiagnosticError(playerError),
    });
    if (nextStatus === "error") {
      setError(Platform.OS === "web" ? userFacingErrorMessage(playerError, "تعذر تشغيل هذا الملف الإعلامي.") : "تعذر تشغيل الفيديو على هذا الجهاز.");
      setPlaying(false);
      onPlaybackError(nativeCode ?? placementVideoDiagnosticCode("UNKNOWN"));
      return;
    }
    if (nextStatus === "readyToPlay") {
      setError("");
      setDuration(player.duration);
    }
  });
  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlaying(isPlaying);
  });

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.text }]}>{contentType === "audio" ? "مشغل الصوت" : "مشغل الفيديو"}</Text>
      {recovering ? (
        <View style={styles.recovery}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ تجهيز الفيديو للتشغيل الآمن…</Text>
        </View>
      ) : error ? (
        <ErrorState message={formatDiagnosticMessage(error, diagnosticCode)} onRetry={onRetry} />
      ) : (
        <>
          <View style={[styles.mediaFrame, { backgroundColor: colors.background }]}>
            <NativeVideoView
              player={player}
              style={contentType === "audio" ? styles.audioView : styles.videoView}
              nativeControls
              contentFit="contain"
              fullscreenOptions={{ enable: contentType === "video" }}
            />
            {status === "loading" ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.muted }]}>جارٍ تحميل الملف…</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? "إيقاف مؤقت" : "تشغيل"}
              onPress={togglePlayback}
              style={[styles.playButton, { backgroundColor: colors.primary }]}
            >
              <Icon name={playing ? "pause" : "play"} size={18} color={colors.primaryText} />
            </Pressable>
            <Text style={[styles.time, { color: colors.muted }]}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>استخدم شريط المشغل للتقديم أو الرجوع</Text>
          </View>
          {contentType === "video" ? <Button label="ملء الشاشة" icon="expand-outline" variant="secondary" onPress={() => { try { (player as any).enterFullscreen?.(); } catch { /* native controls remain available */ } }} /> : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right", marginBottom: 10 },
  mediaFrame: { width: "100%", borderRadius: 16, overflow: "hidden", position: "relative" },
  localPreviewFrame: { width: "100%", height: 230, borderRadius: 14, overflow: "hidden", position: "relative", alignItems: "center", justifyContent: "center" },
  placementPreviewFrame: { width: "100%", aspectRatio: 3 / 4, borderRadius: 14, overflow: "hidden", position: "relative", alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  localPreviewPlay: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  placementPreviewPlay: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  localPreviewPlayLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  videoView: { width: "100%", height: 230 },
  audioView: { width: "100%", height: 104 },
  loading: { position: "absolute", alignSelf: "center", top: "45%", alignItems: "center", gap: 6 },
  loadingText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  recovery: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 },
  controls: { flexDirection: "row-reverse", alignItems: "center", gap: 9, marginTop: 10, flexWrap: "wrap" },
  playButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  time: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, flex: 1, textAlign: "right" },
  externalVideo: { minHeight: 180, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  externalTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "center" },
  externalHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 19, textAlign: "center" },
  externalError: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 8 },
});
