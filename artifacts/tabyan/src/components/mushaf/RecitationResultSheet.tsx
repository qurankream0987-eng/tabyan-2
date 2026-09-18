/**
 * RecitationResultSheet — bottom sheet نتيجة جلسة التسميع.
 * يعرض ملخص الجلسة فوق المصحف بدون مغادرة القارئ.
 */
import Icon from "@/components/app/Icon";
import { formatDuration, HIDE_MODE_LABELS, toArabicNum, type SessionMode } from "@/lib/recitation-types";
import type { SessionResult } from "@/lib/mushaf/useRecitationSession";

interface Props {
  result: SessionResult;
  onClose: () => void;
  onRepeat: () => void;
}

const MODE_LABEL: Record<SessionMode, string> = {
  general: "تسميع عام",
  educational: "تسميع تعليمي",
};

export default function RecitationResultSheet({ result, onClose, onRepeat }: Props) {
  const {
    surahName, startAyah, endAyah, ayahCount,
    durationSeconds, hideMode, mode,
  } = result;

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const timeLabel = mins > 0
    ? `${toArabicNum(mins)} دقيقة ${secs > 0 ? `و ${toArabicNum(secs)} ثانية` : ""}`
    : `${toArabicNum(secs)} ثانية`;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl shadow-2xl">
        {/* مقبض */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* أيقونة + عنوان */}
        <div className="flex flex-col items-center pt-4 pb-5 px-6 gap-3">
          <div className="w-16 h-16 rounded-3xl bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center">
            <Icon name="check-circle" size={32} className="text-burgundy dark:text-gold" />
          </div>
          <div className="text-center">
            <h2 className="font-amiri text-xl font-bold text-burgundy">أحسنت!</h2>
            <p className="font-readex text-sm text-muted-foreground mt-0.5">انتهت جلسة التسميع</p>
          </div>
        </div>

        {/* تفاصيل الجلسة */}
        <div className="mx-4 mb-4 rounded-2xl bg-muted/40 divide-y divide-border/40">
          <Row icon="quran" label="السورة" value={surahName} />
          <Row
            icon="list"
            label="الآيات"
            value={
              startAyah === endAyah
                ? `آية ${toArabicNum(startAyah)}`
                : `${toArabicNum(startAyah)}–${toArabicNum(endAyah)} (${toArabicNum(ayahCount)} آية)`
            }
          />
          <Row icon="clock" label="المدة الفعلية" value={formatDuration(durationSeconds)} sub={timeLabel} />
          <Row icon="eye-off" label="وضع الإخفاء" value={HIDE_MODE_LABELS[hideMode]} />
          <Row icon="mic" label="نوع الجلسة" value={MODE_LABEL[mode]} />
        </div>

        {/* أزرار */}
        <div className="flex gap-2.5 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border-2 border-border font-readex text-sm font-bold text-foreground hover:bg-muted transition btn-press"
          >
            العودة للمصحف
          </button>
          <button
            onClick={onRepeat}
            className="flex-1 py-3.5 rounded-2xl bg-burgundy dark:bg-gold text-white dark:text-burgundy font-readex text-sm font-bold btn-press hover:opacity-90 transition flex items-center justify-center gap-1.5"
          >
            <Icon name="refresh" size={14} />
            تسميع جديد
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-xl bg-burgundy/8 dark:bg-gold/8 flex items-center justify-center shrink-0">
        <Icon name={icon as "clock"} size={15} className="text-burgundy dark:text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-readex text-[11px] text-muted-foreground">{label}</div>
        <div className="font-readex text-sm font-bold text-foreground leading-tight truncate">{value}</div>
        {sub && <div className="font-readex text-[10px] text-muted-foreground mt-px">{sub}</div>}
      </div>
    </div>
  );
}
