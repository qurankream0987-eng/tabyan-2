import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { VideoPlayerStatus, VideoView, useVideoPlayer, type VideoSource } from "expo-video";
import { Button, Card, EmptyState, ErrorState, Icon } from "./ui";
import { useTheme } from "../lib/theme";
import { userFacingErrorMessage } from "../lib/user-facing-error";
import { useAuth } from "../lib/auth";
import { resolveLibraryPlayableSource } from "../lib/library-media";

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

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "—";
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Minimal local-file preview player for a just-recorded, not-yet-uploaded
 * video (placement/KYC self-review). No auth resolution needed — the URI is
 * the device's own local recording, never a private object reference.
 */
export function LocalVideoPreview({ uri, style }: { uri: string; style?: object }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = false; });
  return <NativeVideoView player={player} style={style ?? styles.videoView} nativeControls contentFit="contain" />;
}

export function LibraryMediaPlayer({
  source,
  contentType,
  onDiagnosticEvent,
  onTimeUpdate,
  initialPositionSeconds = 0,
}: {
  source: string;
  contentType: "audio" | "video";
  onDiagnosticEvent?: (event: LibraryMediaDiagnosticEvent) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialPositionSeconds?: number;
}) {
  const { colors } = useTheme();
  const { token } = useAuth();
  const resolvedSource = resolveLibraryPlayableSource(source, token);
  const [retryKey, setRetryKey] = useState(0);

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

  return (
    <PlayableMedia
      key={`${resolvedSource.uri}:${retryKey}`}
      source={resolvedSource}
      contentType={contentType}
      onRetry={() => setRetryKey((value) => value + 1)}
      onDiagnosticEvent={onDiagnosticEvent}
      onTimeUpdate={onTimeUpdate}
      initialPositionSeconds={initialPositionSeconds}
    />
  );
}

function PlayableMedia({
  source,
  contentType,
  onRetry,
  onDiagnosticEvent,
  onTimeUpdate,
  initialPositionSeconds,
}: {
  source: VideoSource;
  contentType: "audio" | "video";
  onRetry: () => void;
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
    const timeSubscription = player.addListener("timeUpdate", ({ currentTime: nextTime }) => {
      setCurrentTime(nextTime);
      setDuration(player.duration);
      onTimeUpdate?.(nextTime, player.duration);
    });
    const statusSubscription = player.addListener("statusChange", ({ status: nextStatus, error: playerError }) => {
      setStatus(nextStatus);
      onDiagnosticEvent?.({ status: nextStatus, error: safeDiagnosticError(playerError) });
      if (nextStatus === "error") {
        setError(userFacingErrorMessage(playerError, "تعذر تشغيل هذا الملف الإعلامي."));
        setPlaying(false);
        return;
      }
      if (nextStatus === "readyToPlay") {
        setError("");
        setDuration(player.duration);
      }
    });
    const playingSubscription = player.addListener("playingChange", ({ isPlaying }) => {
      setPlaying(isPlaying);
    });
    return () => {
      timeSubscription.remove();
      statusSubscription.remove();
      playingSubscription.remove();
      try { player.pause(); } catch { /* player may already be released */ }
    };
  }, [onDiagnosticEvent, onTimeUpdate, player]);

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
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
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
  videoView: { width: "100%", height: 230 },
  audioView: { width: "100%", height: 104 },
  loading: { position: "absolute", alignSelf: "center", top: "45%", alignItems: "center", gap: 6 },
  loadingText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  controls: { flexDirection: "row-reverse", alignItems: "center", gap: 9, marginTop: 10, flexWrap: "wrap" },
  playButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  time: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, flex: 1, textAlign: "right" },
});