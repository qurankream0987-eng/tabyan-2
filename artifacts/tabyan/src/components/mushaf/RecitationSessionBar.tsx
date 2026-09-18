/**
 * RecitationSessionBar — شريط جلسة التسميع النشطة.
 * يظهر في أسفل المصحف بديلاً عن الشريط السفلي العادي.
 * صغير — لا يغطي نص القرآن — ارتفاعه مماثل لشريط الأدوات.
 *
 * busy: يُعطّل كل الأزرار الحرجة أثناء انتظار الخادم.
 * sessionError: خطأ مرئي مع زر إغلاق — يظهر فوق الشريط.
 */
import { useMemo } from "react";
import Icon from "@/components/app/Icon";
import {
  formatDuration,
  HIDE_MODE_LABELS,
  toArabicNum,
  type HideMode,
  type SessionMode,
} from "@/lib/recitation-types";
import type { RecitationPhase, RecitationRange } from "@/lib/mushaf/useRecitationSession";
import { getRecitationAiIndicator, type RecitationAiState } from "@/lib/mushaf/recitation-ai-indicator";

interface Props {
  range: RecitationRange;
  mode: SessionMode;
  hideMode: HideMode;
  phase: RecitationPhase;
  elapsedSecs: number;
  currentVerseKey: string | null;
  busy: boolean;
  sessionError: string | null;
  aiAvailable: boolean;
  aiState: RecitationAiState;
  onStartAi: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onNextAyah: () => void;
  onPrevAyah: () => void;
  onRevealWord: () => void;
  onRevealAyah: () => void;
  onClearError: () => void;
}

export default function RecitationSessionBar({
  range, mode, hideMode, phase, elapsedSecs,
  currentVerseKey, busy, sessionError, aiAvailable, aiState, onStartAi,
  onPause, onResume, onEnd, onCancel,
  onNextAyah, onPrevAyah, onRevealWord, onRevealAyah,
  onClearError,
}: Props) {
  const isPaused = phase === "paused";
  const aiIndicator = getRecitationAiIndicator(aiState, phase);

  const currentAyahNum = useMemo(() => {
    if (!currentVerseKey) return null;
    return parseInt(currentVerseKey.split(":")[1], 10);
  }, [currentVerseKey]);

  const canPrev = mode === "educational" && !busy && currentAyahNum !== null && currentAyahNum > range.startAyah;
  const canNext = mode === "educational" && !busy && currentAyahNum !== null && currentAyahNum < range.endAyah;

  const btnCls = "w-10 h-10 rounded-full flex items-center justify-center transition btn-press disabled:opacity-30 disabled:pointer-events-none";
  const barBg  = "mushaf-control-bar absolute inset-x-0 bottom-0 z-[25] backdrop-blur-md";

  const handleEnd = () => {
    if (busy) return;
    if (window.confirm("إنهاء التسميع وحفظ الجلسة؟")) onEnd();
  };
  const handleCancel = () => {
    if (busy) return;
    if (window.confirm("إلغاء جلسة التسميع دون حفظ؟")) onCancel();
  };

  return (
    <div
      className={barBg}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      dir="rtl"
    >
      {/* ── شريط خطأ — يظهر فوق الشريط الرئيسي ── */}
      {sessionError && (
        <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-2">
          <Icon name="alert-triangle" size={14} className="shrink-0" />
          <span className="flex-1 font-readex text-xs leading-tight">{sessionError}</span>
          <button
            onClick={onClearError}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition shrink-0"
            aria-label="إغلاق الخطأ"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      {/* ── شريط الجلسة الرئيسي ── */}
      <div
        className="flex items-center h-14 px-2 gap-1"
      >
        {/* ── يسار: تبيان AI + إلغاء ── */}
        <div className="flex items-center gap-0.5">
          {aiAvailable && (
            <button
              onClick={onStartAi}
              disabled={busy || isPaused || aiState === "connecting" || aiState === "listening" || aiState === "stopping"}
              className="h-8 px-2 rounded-full border border-gold/45 bg-gold/10 text-burgundy dark:text-gold font-readex text-[10px] font-bold disabled:opacity-45 btn-press inline-flex items-center gap-1"
              aria-label={aiIndicator.label}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  aiIndicator.kind === "listening"
                    ? "bg-emerald-500"
                    : aiIndicator.kind === "failed"
                      ? "bg-red-500"
                      : aiIndicator.kind === "paused"
                        ? "bg-muted-foreground/60"
                        : "bg-gold animate-pulse"
                }`}
                aria-hidden="true"
              />
              <span>{aiIndicator.shortLabel}</span>
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={busy || aiState === "stopping"}
            className={`${btnCls} text-muted-foreground hover:text-burgundy dark:hover:text-gold`}
            aria-label="إلغاء الجلسة"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* ── وسط: معلومات + تنقل بين الآيات ── */}
        <div className="flex-1 flex items-center justify-center gap-0.5 min-w-0">
          {mode === "educational" ? (
            <button
              onClick={onPrevAyah}
              disabled={!canPrev || isPaused}
              className={`${btnCls} text-muted-foreground`}
              aria-label="الآية السابقة"
            >
              <Icon name="chevron-right" size={17} />
            </button>
          ) : <div className="w-10" aria-hidden />}

          {/* معلومات الجلسة */}
          <div className="flex-1 text-center min-w-0 px-1">
            <div className="font-readex text-[11px] font-bold text-foreground leading-tight truncate">
              {mode === "general" ? "التسميع العام" : "التسميع التعليمي"}
            </div>
            {mode === "educational" && (
              <div
                className="font-readex text-[10px] text-burgundy dark:text-gold leading-tight truncate"
                title={`النطاق التعليمي: ${range.surahName} — الآيات ${range.startAyah}–${range.endAyah}`}
              >
                النطاق: {range.surahName} · {toArabicNum(range.startAyah)}–{toArabicNum(range.endAyah)}
              </div>
            )}
            {currentAyahNum !== null && (
              <div className="font-readex text-[10px] text-muted-foreground font-normal leading-tight truncate">
                الآية {toArabicNum(currentAyahNum)}
                {mode === "educational" && ` / ${toArabicNum(range.endAyah)}`}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className={`font-readex text-[10px] font-bold tabular-nums ${isPaused ? "text-muted-foreground/60" : "text-burgundy dark:text-gold"}`}>
                {busy ? "…" : formatDuration(elapsedSecs)}
              </span>
              <span className="font-readex text-[9px] text-muted-foreground/70 border border-muted-foreground/20 rounded-full px-1.5 py-px leading-tight">
                {HIDE_MODE_LABELS[hideMode]}
              </span>
            </div>
          </div>

          {mode === "educational" ? (
            <button
              onClick={onNextAyah}
              disabled={!canNext || isPaused}
              className={`${btnCls} text-muted-foreground`}
              aria-label="الآية التالية"
            >
              <Icon name="chevron-left" size={17} />
            </button>
          ) : <div className="w-10" aria-hidden />}
        </div>

        {/* ── يمين: كشف (progressive فقط) + إيقاف/استئناف + إنهاء ── */}
        <div className="flex items-center gap-0.5">
          {hideMode === "progressive_reveal" && !isPaused && (
            <button
              onClick={onRevealWord}
              disabled={busy}
              className={`${btnCls} text-muted-foreground hover:text-burgundy dark:hover:text-gold`}
              aria-label="كشف كلمة"
            >
              <Icon name="eye" size={16} />
            </button>
          )}

          {/* pause / resume */}
          <button
            onClick={isPaused ? onResume : onPause}
            disabled={busy || aiState === "stopping"}
            className={`${btnCls} text-muted-foreground hover:text-foreground`}
            aria-label={isPaused ? "استئناف التسميع" : "إيقاف مؤقت"}
          >
            {busy
              ? <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              : <Icon name={isPaused ? "play" : "pause"} size={18} />
            }
          </button>

          {/* إنهاء */}
          <button
            onClick={handleEnd}
            disabled={busy}
            className="h-9 px-3 rounded-full bg-burgundy dark:bg-gold text-white dark:text-burgundy font-readex text-[11px] font-bold btn-press hover:opacity-90 transition flex items-center gap-1 disabled:opacity-50"
            aria-label="إنهاء الجلسة"
          >
            <Icon name="check" size={13} />
            <span>إنهاء</span>
          </button>
        </div>
      </div>

      {/* شريط تقدم الآيات */}
      {mode === "educational" && currentAyahNum !== null && range.endAyah > range.startAyah && (
        <div className="absolute inset-x-0 h-0.5" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}>
          <div
            className="h-full bg-burgundy/40 dark:bg-gold/40 transition-all duration-300"
            style={{
              width: `${((currentAyahNum - range.startAyah) / (range.endAyah - range.startAyah)) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
