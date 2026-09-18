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
  const btnCls = "w-9 h-9 rounded-full flex items-center justify-center transition btn-press disabled:opacity-30";
  const cycleRepeat = () => {
    const i = REPEAT_STEPS.indexOf(repeat as (typeof REPEAT_STEPS)[number]);
    onRepeatChange(REPEAT_STEPS[(i + 1) % REPEAT_STEPS.length]);
  };

  return (
    <div
      className="mushaf-control-bar absolute inset-x-0 z-[24] backdrop-blur-md"
      style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
      dir="rtl"
    >
      {/* شريط خطأ */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 text-xs font-readex">
          <span className="flex-1">{error}</span>
          <button
            onClick={onTogglePlay}
            className="shrink-0 rounded-md bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25 transition"
          >
            إعادة المحاولة
          </button>
          <button onClick={onClearError} className="w-5 h-5 flex items-center justify-center">
            <Icon name="x" size={11} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 h-12 px-3">
        {/* إغلاق */}
        <button onClick={onClose} className={`${btnCls} text-muted-foreground`} aria-label="إغلاق المشغّل">
          <Icon name="x" size={15} />
        </button>

        {/* معلومات الآية + اختيار القارئ */}
        <div className="flex-1 min-w-0 px-1">
          <p className="font-amiri text-sm leading-tight truncate text-foreground">
            {surahName}
            <span className="font-readex text-[10px] text-muted-foreground mr-1.5">آية {toArabicDigits(ayahNum)}</span>
          </p>
          {/* اختيار القارئ — select أصلي بمظهر نصي خفيف */}
          <div className="relative inline-flex items-center max-w-full">
            <select
              value={reciterId}
              onChange={(e) => onReciterChange(e.target.value as ReciterId)}
              className="appearance-none bg-transparent font-readex text-[10px] text-burgundy dark:text-gold font-semibold pe-3.5 max-w-full truncate cursor-pointer outline-none"
              aria-label="اختيار القارئ"
              dir="rtl"
            >
              {RECITERS.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* أدوات التشغيل */}
        <div className="flex items-center gap-0.5">
          {/* تكرار الآية: ١x/٣x/٥x/١٠x بالتناوب */}
          <button
            onClick={cycleRepeat}
            className={`h-9 min-w-9 px-1.5 rounded-full flex items-center justify-center transition btn-press font-readex text-[11px] font-semibold ${
              repeat > 1
                ? "bg-burgundy/12 dark:bg-gold/15 text-burgundy dark:text-gold"
                : "text-muted-foreground"
            }`}
            aria-label={`تكرار الآية ${toArabicDigits(repeat)} مرات — اضغط للتبديل`}
          >
            {toArabicDigits(repeat)}×
          </button>

          <button onClick={onPrev} className={`${btnCls} text-muted-foreground`} aria-label="الآية السابقة">
            <Icon name="chevron-right" size={18} />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-burgundy dark:bg-gold text-white dark:text-burgundy flex items-center justify-center btn-press transition disabled:opacity-60"
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          >
            {isLoading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Icon name={isPlaying ? "pause" : "play"} size={17} />
            }
          </button>

          <button onClick={onNext} className={`${btnCls} text-muted-foreground`} aria-label="الآية التالية">
            <Icon name="chevron-left" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
