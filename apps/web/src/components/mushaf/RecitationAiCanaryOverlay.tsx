import { useEffect, useRef, useState } from "react";
import type { ConnectivityMetrics, RealtimeDiagnostics } from "@/lib/recitation-ai/useOpenAiRealtimeTranscription";
import type { LiveRevealLatencyMetrics } from "@/lib/recitation-ai/types";
import type { MatcherDiagnostics } from "@/lib/recitation-ai/QuranLiveMatcher";
import type { RecitationPhase } from "@/lib/mushaf/useRecitationSession";
import {
  getRecitationAiIndicator,
  type RecitationAiState,
} from "@/lib/mushaf/recitation-ai-indicator";

interface Props {
  state: RecitationAiState;
  error: string | null;
  metrics: ConnectivityMetrics;
  latency: LiveRevealLatencyMetrics;
  diagnostics: MatcherDiagnostics;
  runtimeDiagnostics: RealtimeDiagnostics;
  lastMatchAt: number | null;
  lastRevealAt: number | null;
  range: string | null;
  recitationPhase: RecitationPhase;
  reconnectCount?: number;
  audioIssue?: string | null;
  onAudioFileTest?: (file: File) => Promise<boolean>;
}

function time(value: number | null) {
  return value === null ? "—" : `${value} ms`;
}

export function connectionLabel(state: Props["state"]) {
  if (state === "connecting") return "يستعد…";
  if (state === "requesting_mic") return "يطلب إذن الميكروفون";
  if (state === "listening") return "يستمع الآن";
  if (state === "stopping") return "يعالج…";
  if (state === "failed") return "خطأ";
  return "متوقف";
}

function age(now: number, value: number | null) {
  return value === null ? null : Math.max(0, Math.round(now - value));
}

function pipelineLabel(
  state: Props["state"],
  runtime: RealtimeDiagnostics,
  matcher: MatcherDiagnostics,
  lastMatchAgeMs: number | null,
  lastRevealAgeMs: number | null,
) {
  if (state !== "listening") return "WAITING";
  if (runtime.lastAudioAgeMs !== null && runtime.lastAudioAgeMs > 2_500) return "AUDIO_STOPPED";
  if (runtime.providerStalledDuringActiveSpeech) return "PROVIDER_STALLED_DURING_ACTIVE_SPEECH";
  if (runtime.lastAudioAgeMs !== null && runtime.lastAudioAgeMs < 500
    && (runtime.lastDeltaAgeMs === null || runtime.lastDeltaAgeMs > 3_500)) return "PROVIDER_STALLED";
  if (runtime.lastDeltaAgeMs !== null && runtime.lastDeltaAgeMs < 3_500
    && matcher.matcherUpdateCount > 0 && (lastMatchAgeMs === null || lastMatchAgeMs > 3_500)) return "MATCHER_STALLED";
  if (lastMatchAgeMs !== null && lastMatchAgeMs < 3_500
    && matcher.committedRevealCount > 0 && (lastRevealAgeMs === null || lastRevealAgeMs > 3_500)) return "RENDER_STALLED";
  return "PIPELINE_ACTIVE";
}

export default function RecitationAiCanaryOverlay({
  state, error, metrics, latency, diagnostics, runtimeDiagnostics, lastMatchAt, lastRevealAt, range, recitationPhase,
  reconnectCount = 0, audioIssue = null, onAudioFileTest,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => performance.now());
  const [audioFileRunning, setAudioFileRunning] = useState(false);
  const [audioFileError, setAudioFileError] = useState<string | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const lastMatchAgeMs = age(now, lastMatchAt);
  const lastRevealAgeMs = age(now, lastRevealAt);
  const pipeline = pipelineLabel(state, runtimeDiagnostics, diagnostics, lastMatchAgeMs, lastRevealAgeMs);
  const indicator = getRecitationAiIndicator(state, recitationPhase);
  const indicatorDot = {
    listening: "bg-emerald-500",
    paused: "bg-muted-foreground/60",
    reconnecting: "bg-gold",
    failed: "bg-red-500",
  }[indicator.kind];
  const runAudioFile = async (file: File) => {
    if (!onAudioFileTest) return;
    setAudioFileRunning(true);
    setAudioFileError(null);
    try {
      const sent = await onAudioFileTest(file);
      if (!sent) setAudioFileError("تعذر إرسال ملف الاختبار عبر اتصال المزوّد");
    } catch (cause) {
      setAudioFileError(cause instanceof Error ? cause.message : "تعذر تشغيل ملف الاختبار");
    } finally {
      setAudioFileRunning(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  return (
    <aside
      className="absolute left-3 top-3 z-[28] pointer-events-auto"
      dir="rtl"
      aria-label="حالة تبيان AI"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex h-7 items-center gap-1.5 rounded-full border border-gold/35 bg-background/95 px-2.5 shadow-sm backdrop-blur-md font-readex text-[10px] text-burgundy dark:text-gold"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${indicatorDot} ${
            indicator.kind === "listening" || indicator.kind === "reconnecting" ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
        <span>{indicator.label}</span>
      </button>

      {expanded && (
        <div className="mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gold/35 bg-background/95 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <strong className="font-readex text-xs text-burgundy dark:text-gold">تبيان AI · Canary</strong>
            <span className="font-readex text-[10px] text-muted-foreground">للتطوير · {connectionLabel(state)}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-readex text-[10px] text-muted-foreground">
            <span>الميكروفون: <b className="text-foreground">{runtimeDiagnostics.audioSource === "audio-file" ? "ملف اختبار" : state === "listening" || state === "stopping" ? "يعمل" : "—"}</b></span>
            <span>أول صوت: <b className="text-foreground">{time(metrics.firstAudioMs)}</b></span>
            <span>اتصال: <b className="text-foreground">{time(metrics.connectionMs)}</b></span>
            <span>اتصال المزوّد: <b className="text-foreground">{time(runtimeDiagnostics.providerConnectionMs)}</b></span>
            <span>أول delta: <b className="text-foreground">{time(metrics.firstPartialMs)}</b></span>
            <span>أول partial p50: <b className="text-foreground">{time(metrics.firstSpeechPartialP50Ms)}</b></span>
            <span>أول partial p95: <b className="text-foreground">{time(metrics.firstSpeechPartialP95Ms)}</b></span>
            <span>نقل p50: <b className="text-foreground">{time(metrics.transportP50Ms)}</b></span>
            <span>خادم→مزوّد p50: <b className="text-foreground">{time(metrics.backendProviderP50Ms)}</b></span>
            <span>المزوّد p50: <b className="text-foreground">{time(metrics.providerP50Ms)}</b></span>
            <span>Matcher p50: <b className="text-foreground">{time(latency.matcherP50Ms)}</b></span>
            <span>Render p50: <b className="text-foreground">{time(latency.renderP50Ms)}</b></span>
            <span>كلي p50: <b className="text-foreground">{time(latency.totalP50Ms)}</b></span>
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <p className="font-readex text-[10px] text-muted-foreground">المسار: <b className="text-foreground">{pipeline}</b></p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-readex text-[10px] text-muted-foreground">
              <span>المزوّد: <b className="text-foreground">{runtimeDiagnostics.asrProvider ?? "—"}</b></span>
              <span>مصدر الصوت: <b className="text-foreground">{runtimeDiagnostics.audioSource ?? "—"}</b></span>
              <span>فتح WebSocket: <b className="text-foreground">{time(runtimeDiagnostics.websocketOpenMs)}</b></span>
              <span>بدء التقاط الميكروفون: <b className="text-foreground">{time(runtimeDiagnostics.micCaptureStartMs)}</b></span>
              <span>أول إطار صوت: <b className="text-foreground">{time(runtimeDiagnostics.firstAudioFrameMs)}</b></span>
              <span>أول partial للمزوّد: <b className="text-foreground">{time(runtimeDiagnostics.firstProviderPartialMs)}</b></span>
              <span>أول final للمزوّد: <b className="text-foreground">{time(runtimeDiagnostics.firstProviderFinalMs)}</b></span>
              <span>بدء المطابقة: <b className="text-foreground">{time(runtimeDiagnostics.matcherStartMs)}</b></span>
              <span>نهاية المطابقة: <b className="text-foreground">{time(runtimeDiagnostics.matcherEndMs)}</b></span>
              <span>تحديث الواجهة: <b className="text-foreground">{time(runtimeDiagnostics.uiCommitMs)}</b></span>
              <span>الاستجابة من آخر إطار صوت: <b className="text-foreground">{time(runtimeDiagnostics.totalFeedbackMs)}</b></span>
              <span>مدة/حجم الإطار: <b className="text-foreground">{runtimeDiagnostics.chunkDurationMs} ms / {runtimeDiagnostics.bytesPerChunk} B</b></span>
              <span>طابور الإرسال: <b className="text-foreground">{runtimeDiagnostics.queueDepth} chunks / {runtimeDiagnostics.wsBufferedBytes} B</b></span>
              <span>إطارات ساقطة: <b className="text-foreground">{runtimeDiagnostics.droppedChunkCount}</b></span>
              <span>Audio chunks: <b className="text-foreground">{runtimeDiagnostics.audioChunkCount}</b></span>
              <span>Worklet: <b className="text-foreground">{runtimeDiagnostics.workletMessageCount}</b></span>
              <span>Transcript deltas: <b className="text-foreground">{runtimeDiagnostics.transcriptDeltaCount}</b></span>
              <span>Completed: <b className="text-foreground">{runtimeDiagnostics.transcriptCompletedCount}</b></span>
              <span>Matches: <b className="text-foreground">{diagnostics.matcherMatchCount}</b></span>
              <span>Revealed: <b className="text-foreground">{diagnostics.committedRevealCount}</b></span>
              <span>آخر صوت: <b className="text-foreground">{time(runtimeDiagnostics.lastAudioAgeMs)}</b></span>
              <span>RMS: <b className="text-foreground">{runtimeDiagnostics.audioLevelRms.toFixed(4)}</b></span>
              <span>Speech active: <b className="text-foreground">{runtimeDiagnostics.speechActive ? "YES" : "NO"}</b></span>
              <span>آخر نشاط كلام: <b className="text-foreground">{time(runtimeDiagnostics.lastSpeechActiveAgeMs)}</b></span>
              <span>آخر delta: <b className="text-foreground">{time(runtimeDiagnostics.lastDeltaAgeMs)}</b></span>
              <span>أطول نشاط بلا delta: <b className="text-foreground">{time(runtimeDiagnostics.longestActiveSpeechWithoutDeltaMs)}</b></span>
              <span>آخر match: <b className="text-foreground">{time(lastMatchAgeMs)}</b></span>
              <span>آخر reveal: <b className="text-foreground">{time(lastRevealAgeMs)}</b></span>
            </div>
            <p className="mt-1 font-readex text-[10px] text-muted-foreground">
              WS {runtimeDiagnostics.wsConnected ? "OPEN" : "CLOSED"} · Backend {runtimeDiagnostics.backendWsConnected ? "OPEN" : "—"} ·
              {" "}AudioContext {runtimeDiagnostics.audioContextState} · Track {runtimeDiagnostics.micTrackReadyState}
            </p>
            <p className="mt-0.5 font-readex text-[10px] text-muted-foreground">
              Range {range ?? "—"} · mic {runtimeDiagnostics.micTrackEnabled ? "enabled" : "—"} / {runtimeDiagnostics.micTrackMuted ? "muted" : "unmuted"}
            </p>
            <p className="font-readex text-[10px] text-muted-foreground">
              p95 مزوّد {time(metrics.providerP95Ms)} · matcher {time(latency.matcherP95Ms)} · كلي {time(latency.totalP95Ms)}
            </p>
            <p className="mt-0.5 font-readex text-[9px] leading-4 text-muted-foreground">
              FIRST_PARTIAL يبدأ من نشاط الكلام المكتشف؛ total feedback من آخر إطار أرسله العميل، وليس من بداية نطق الكلمة.
            </p>
            <p className="mt-0.5 font-readex text-[10px] text-muted-foreground">
              matcher أقصى {time(latency.matcherMaxMs)} · اكتمال بصري تقريبي {time(latency.visualCompletionP50Ms)}
            </p>
            <p className="mt-1 font-readex text-[10px] text-muted-foreground">حالة المطابقة</p>
            <p className="mt-0.5 font-readex text-[10px] leading-5 text-foreground">
              تتبع {diagnostics.trackingModeMatches} · استعادة {diagnostics.recoveryModeEntries}/{diagnostics.recoverySuccesses}
              {" · "}لا تطابق {diagnostics.matcherNoMatchCount} · provisional {diagnostics.provisionalRevealCount}
              {" · "}تراجع {diagnostics.backtracks}
            </p>
            <p className="mt-0.5 font-readex text-[10px] text-muted-foreground">
              reconnectCount {reconnectCount} · lostPositionCount {diagnostics.recoveryModeEntries} · wrongJumpsBlocked {diagnostics.falseForwardJumps}
              {" · "}audio {audioIssue ?? "ok"}
            </p>
            {onAudioFileTest && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="font-readex text-[10px] leading-4 text-muted-foreground">
                  اختبار ملف حقيقي عبر WebSocket الموثّق والمزوّد الحالي؛ يُرسل PCM من المتصفح ولا يُحفظ الملف.
                </p>
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  aria-label="اختر ملف صوت حقيقياً للاختبار"
                  data-testid="recitation-audio-file-input"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void runAudioFile(file);
                  }}
                />
                <button
                  type="button"
                  className="tby-chip mt-1 h-8 rounded-full px-3 font-readex text-[10px] font-bold"
                  disabled={audioFileRunning}
                  data-testid="recitation-audio-file-test"
                  onClick={() => audioFileInputRef.current?.click()}
                >
                  {audioFileRunning ? "يرسل ملف الصوت…" : "اختبر تسجيلاً صوتياً"}
                </button>
                {audioFileError && (
                  <p className="mt-1 font-readex text-[10px] leading-4 text-red-600 dark:text-red-300" role="alert">
                    {audioFileError}
                  </p>
                )}
              </div>
            )}
          </div>
          {error && <p className="mt-2 font-readex text-[10px] leading-5 text-red-600 dark:text-red-300">{error}</p>}
        </div>
      )}
    </aside>
  );
}