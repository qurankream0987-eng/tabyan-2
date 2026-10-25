/**
 * MushafAudioBar — شريط مشغّل الصوت البسيط.
 * يظهر فوق الشريط السفلي مباشرةً عند تفعيل الصوت.
 * يعمل بشكل مستقل عن جلسة التسميع. يتضمن اختيار القارئ (يُحفظ محلياً).
 */
import Icon from "@/components/app/Icon";
import { toArabicDigits } from "@/lib/mushaf/format";
import { RECITERS, type ReciterId } from "@/lib/mushaf/useAudioPlayer";

interface Props {
  surahName: string;
  ayahNum: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  repeat: number;
  reciterId: ReciterId;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRepeatChange: (n: number) => void;
  onReciterChange: (id: ReciterId) => void;
  onClose: () => void;
  onClearError: () => void;
}

const REPEAT_STEPS = [1, 3, 5, 10] as const;

export default function MushafAudioBar({
  surahName, ayahNum, isPlaying, isLoading, error, repeat, reciterId,
  onTogglePlay, onNext, onPrev, onRepeatChange, onReciterChange, onClose, onClearError,
}: Props) {
  const btnCls = "tby-icon-btn shrink-0 disabled:opacity-30";
  const cycleRepeat = () => {
    const i = REPEAT_STEPS.indexOf(repeat as (typeof REPEAT_STEPS)[number]);
    onRepeatChange(REPEAT_STEPS[(i + 1) % REPEAT_STEPS.length]);
  };

  return (
    <div
      className="tby-dock tby-audio-dock absolute z-[24] rounded-2xl overflow-hidden left-1/2 -translate-x-1/2 w-[min(28rem,calc(100%-1.5rem))]"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
      dir="rtl"
      role="region"
      aria-label="مشغّل التلاوة"
    >
      {/* شريط خطأ */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-readex border-b border-[var(--mushaf-chrome-border)]"
          style={{ color: "var(--mushaf-error)", background: "color-mix(in srgb, var(--mushaf-error) 9%, transparent)" }}
          role="alert"
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoading}
            aria-busy={isLoading}
            className="tby-audio-retry"
            data-testid="audio-retry"
          >
            إعادة المحاولة
          </button>
          <button type="button" onClick={onClearError} aria-label="إغلاق التنبيه" className="tby-icon-btn shrink-0">
            <Icon name="x" size={11} />
          </button>
        </div>
      )}

      <div className="tby-audio-content">
        {/* إغلاق */}
        <button type="button" onClick={onClose} data-testid="audio-close" className={`${btnCls} text-[var(--mushaf-chrome-muted)]`} aria-label="إغلاق المشغّل">
          <Icon name="x" size={15} />
        </button>

        {/* معلومات الآية + اختيار القارئ */}
        <div className="tby-audio-info">
          <p aria-live="polite" className="font-amiri text-sm leading-tight truncate text-[var(--mushaf-chrome-fg)]">
            {surahName}
            <span className="font-readex text-[10px] text-[var(--mushaf-chrome-muted)] mr-1.5">آية {toArabicDigits(ayahNum)}</span>
          </p>
          {/* اختيار القارئ — select أصلي بمظهر نصي خفيف */}
          <div className="tby-audio-reciter relative inline-flex items-center max-w-full">
            <select
              value={reciterId}
              onChange={(e) => onReciterChange(e.target.value as ReciterId)}
              className="appearance-none bg-transparent font-readex text-[10px] text-burgundy dark:text-gold font-semibold pe-3.5 max-w-full truncate cursor-pointer outline-none"
              aria-label="اختيار القارئ"
              data-testid="audio-reciter"
              dir="rtl"
            >
              {RECITERS.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* أدوات التشغيل */}
        <div className="tby-audio-actions">
          {/* تكرار الآية: ١x/٣x/٥x/١٠x بالتناوب */}
          <button
            type="button"
            onClick={cycleRepeat}
            aria-pressed={repeat > 1}
            data-testid="audio-repeat"
            className={`tby-audio-repeat h-11 min-w-11 px-1.5 rounded-full flex items-center justify-center transition btn-press font-readex text-[11px] font-semibold ${
              repeat > 1
                ? "bg-burgundy/12 dark:bg-gold/15 text-burgundy dark:text-gold"
                : "text-[var(--mushaf-chrome-muted)]"
            }`}
            aria-label={`تكرار الآية ${toArabicDigits(repeat)} مرات — اضغط للتبديل`}
          >
            {toArabicDigits(repeat)}×
          </button>

          <button type="button" onClick={onPrev} data-testid="audio-prev" className={`${btnCls} text-[var(--mushaf-chrome-muted)]`} aria-label="الآية السابقة">
            <Icon name="chevron-right" size={18} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoading}
            aria-busy={isLoading}
            data-testid="audio-toggle"
            className="tby-primary-action w-11 h-11 shrink-0 rounded-full flex items-center justify-center btn-press transition disabled:opacity-60"
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isLoading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin tby-spinner" aria-hidden="true" />
              : <Icon name={isPlaying ? "pause" : "play"} size={17} />
            }
          </button>

          <button type="button" onClick={onNext} data-testid="audio-next" className={`${btnCls} text-[var(--mushaf-chrome-muted)]`} aria-label="الآية التالية">
            <Icon name="chevron-left" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
