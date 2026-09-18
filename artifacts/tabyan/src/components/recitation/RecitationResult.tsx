/**
 * RecitationResult — شاشة نتيجة جلسة التسميع (Phase 1A — لا AI لا نتائج وهمية)
 * accuracyScore = NULL دائماً — لا يُعرض حقل الدقة إطلاقاً في هذه المرحلة
 */
import Icon from "@/components/app/Icon";
import { HIDE_MODE_LABELS, formatDuration, toArabicNum, type HideMode, type SessionMode } from "@/lib/recitation-types";

interface RecitationResultProps {
  durationSeconds: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  hideMode: HideMode;
  mode: SessionMode;
  onClose: () => void;
  onNewSession: () => void;
  onViewHistory: () => void;
}

export default function RecitationResult({
  durationSeconds,
  surahName,
  startAyah,
  endAyah,
  hideMode,
  mode,
  onClose,
  onNewSession,
  onViewHistory,
}: RecitationResultProps) {
  const ayahRange =
    startAyah === endAyah
      ? `آية ${toArabicNum(startAyah)}`
      : `الآيات ${toArabicNum(startAyah)}–${toArabicNum(endAyah)}`;

  const durationDisplay = formatDuration(durationSeconds);
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6"
      dir="rtl"
    >
      {/* أيقونة النجاح */}
      <div className="w-24 h-24 rounded-full bg-green-500/10 dark:bg-green-400/10 flex items-center justify-center mb-6 border-4 border-green-500/20 dark:border-green-400/20">
        <Icon name="check-circle" size={44} className="text-green-600 dark:text-green-400" />
      </div>

      <h1 className="font-amiri text-3xl font-bold text-burgundy text-center mb-2">
        أحسنت! انتهى التسميع
      </h1>
      <p className="font-readex text-sm text-muted-foreground text-center mb-8">
        {mode === "educational" ? "جلسة تعليمية — سيراها معلمك" : "جلسة تسميع شخصية"}
      </p>

      {/* بطاقة الملخص */}
      <div className="w-full max-w-sm glass rounded-[1.5rem] shadow-card border border-gold/30 dark:border-gold/20 p-5 space-y-4 mb-8">
        {/* الوقت */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
            <Icon name="timer" size={20} className="text-burgundy" />
          </div>
          <div>
            <div className="font-readex text-[11px] text-muted-foreground">مدة التسميع الفعلي</div>
            <div className="font-amiri text-2xl text-burgundy font-bold leading-tight" dir="ltr">
              {durationDisplay}
            </div>
            {minutes > 0 && (
              <div className="font-readex text-xs text-muted-foreground">
                {toArabicNum(minutes)} دقيقة{seconds > 0 ? ` و${toArabicNum(seconds)} ثانية` : ""}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* السورة والآيات */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
            <Icon name="quran" size={20} className="text-burgundy" />
          </div>
          <div>
            <div className="font-readex text-[11px] text-muted-foreground">النطاق المُسمَّع</div>
            <div className="font-amiri text-lg text-burgundy font-bold leading-tight">{surahName}</div>
            <div className="font-readex text-xs text-muted-foreground">{ayahRange}</div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* وضع الإخفاء */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
            <Icon name="eye-off" size={20} className="text-burgundy" />
          </div>
          <div>
            <div className="font-readex text-[11px] text-muted-foreground">وضع الإخفاء المستخدم</div>
            <div className="font-readex text-sm text-foreground font-bold">
              {HIDE_MODE_LABELS[hideMode]}
            </div>
          </div>
        </div>

        {/* لا نتيجة دقة في Phase 1A */}
      </div>

      {/* أزرار */}
      <div className="w-full max-w-sm space-y-2">
        <button
          onClick={onNewSession}
          className="w-full py-3.5 rounded-2xl bg-burgundy text-white font-readex font-bold text-sm btn-press hover:bg-burgundy/90 transition flex items-center justify-center gap-2"
        >
          <Icon name="mic" size={16} />
          جلسة تسميع جديدة
        </button>
        <button
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl border border-burgundy/30 dark:border-gold/30 text-burgundy font-readex font-bold text-sm btn-press hover:bg-burgundy/5 dark:hover:bg-gold/5 transition flex items-center justify-center gap-2"
        >
          <Icon name="clock" size={16} />
          سجل جلساتي
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-muted-foreground font-readex text-sm hover:text-foreground transition"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
