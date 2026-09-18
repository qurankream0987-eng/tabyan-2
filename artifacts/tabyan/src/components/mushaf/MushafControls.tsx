/**
 * MushafControls — أدوات قارئ المصحف الجديدة (مطابقة المرجع البصري).
 *
 * الشريط العلوي: خفيف جداً — رجوع · اسم السورة · جزء [· مؤشر تكبير].
 * الشريط السفلي: pill عائمة مركزية — فهرس · صوت · تسميع · إخفاء · علامة.
 *   - زر التسميع: دائري بارز (لون تبيان).
 *   - لا أزرار prev/next — الـ swipe هو الأساس.
 * sessionActive: يُخفي الـ pill السفلية (RecitationSessionBar يحل محلها).
 * visible: يتحكم في ظهور الشريطين (Focus Mode).
 */
import Icon from "@/components/app/Icon";
import { toArabicDigits } from "@/lib/mushaf/format";
import type { HideMode } from "@/lib/recitation-types";

interface ControlsProps {
  page: number;
  surahName: string;
  juz: number | null;
  bookmarked: boolean;
  zoom: number;
  visible: boolean;
  sessionActive: boolean;
  recitationEnabled: boolean;
  globalHideMode: HideMode;
  audioActive: boolean;
  onClose: () => void;
  onToggleBookmark: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenIndex: () => void;
  onOpenSearch: () => void;
  onOpenAudio: () => void;
  onOpenHide: () => void;
  onStartRecitation: () => void;
  onRevealGlobalWord: () => void;
}

const iconBtn = "w-10 h-10 rounded-full flex items-center justify-center transition btn-press text-muted-foreground hover:text-foreground active:scale-95";

export default function MushafControls({
  page, surahName, juz, bookmarked, zoom, visible, sessionActive,
  recitationEnabled, globalHideMode, audioActive,
  onClose, onToggleBookmark, onZoomIn, onZoomOut, onZoomReset,
  onOpenIndex, onOpenSearch, onOpenAudio, onOpenHide, onStartRecitation,
  onRevealGlobalWord,
}: ControlsProps) {
  const bottomHidden = sessionActive || !visible;
  const isHiding     = globalHideMode !== "visible_review";
  const isZoomed     = zoom > 1.05;

  return (
    <>
      {/* ══ الشريط العلوي — تدرج شفاف بلا حد ════════════════════════════ */}
      <div
        className={`mushaf-top-bar absolute inset-x-0 top-0 z-20 flex items-center gap-1 px-2 transition-transform duration-300 ${
          visible ? "" : "-translate-y-full"
        }`}
        style={{
          height: "calc(3.25rem + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        dir="rtl"
      >
        {/* رجوع */}
        <button onClick={onClose} className={iconBtn} aria-label="العودة">
          <Icon name="arrow-right" size={20} />
        </button>

        {/* اسم السورة + الجزء */}
        <div className="flex-1 min-w-0 text-center">
          {surahName && (
            <p className="mushaf-top-surah font-amiri text-base leading-tight truncate">{surahName}</p>
          )}
          {juz !== null && (
            <p className="mushaf-top-meta font-readex text-[10px] leading-tight">
              الجزء {toArabicDigits(juz)} · صفحة {toArabicDigits(page)}
            </p>
          )}
        </div>

        {/* تكبير مرئي أو بحث */}
        {isZoomed ? (
          <button
            onClick={onZoomReset}
            className="h-8 px-2.5 rounded-full bg-burgundy/10 dark:bg-gold/10 font-readex text-[11px] font-bold text-burgundy dark:text-gold transition btn-press"
            aria-label="إعادة التكبير"
          >
            {Math.round(zoom * 100)}٪
          </button>
        ) : (
          <button onClick={onOpenSearch} className={iconBtn} aria-label="بحث">
            <Icon name="search" size={18} />
          </button>
        )}
      </div>

      {/* ══ الشريط السفلي — pill عائمة ════════════════════════════════════ */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none transition-transform duration-300 ${
          bottomHidden ? "translate-y-full" : ""
        }`}
        style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom, 0px))" }}
        dir="rtl"
      >
        <div className="mushaf-control-bar rounded-full flex items-center gap-0.5 px-2 py-1.5 pointer-events-auto shadow-lg">

          {/* فهرس */}
          <button onClick={onOpenIndex} className={iconBtn} aria-label="فهرس المصحف">
            <Icon name="books" size={19} />
          </button>

          {/* صوت */}
          <button
            onClick={onOpenAudio}
            className={`${iconBtn} relative ${audioActive ? "text-burgundy dark:text-gold" : ""}`}
            aria-label="تشغيل التلاوة"
          >
            <Icon name="headphones" size={18} />
            {audioActive && (
              <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-burgundy dark:bg-gold" />
            )}
          </button>

          {/* ── تسميع — زر بارز ── */}
          {recitationEnabled ? (
            <button
              onClick={onStartRecitation}
              className="w-12 h-12 rounded-full bg-burgundy dark:bg-gold text-white dark:text-burgundy flex items-center justify-center btn-press transition shadow-md hover:opacity-90 active:scale-95 mx-1"
              aria-label="بدء جلسة تسميع"
            >
              <Icon name="mic" size={20} />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-1" aria-hidden>
              <Icon name="mic" size={18} className="text-muted-foreground/30" />
            </div>
          )}

          {/* إخفاء */}
          <button
            onClick={onOpenHide}
            className={`${iconBtn} ${isHiding ? "text-burgundy dark:text-gold" : ""}`}
            aria-label="وضع الإخفاء"
          >
            <Icon name="eye-off" size={18} />
          </button>

          {/* كشف كلمة — يظهر فقط في وضع الكشف التدريجي المستقل */}
          {globalHideMode === "progressive_reveal" && !sessionActive && (
            <button
              onClick={onRevealGlobalWord}
              className="h-8 px-2.5 rounded-full bg-burgundy/12 dark:bg-gold/12 font-readex text-[11px] font-bold text-burgundy dark:text-gold btn-press transition hover:bg-burgundy/20 dark:hover:bg-gold/20 active:scale-95"
              aria-label="كشف كلمة"
            >
              كشف
            </button>
          )}

          {/* علامة */}
          <button
            onClick={onToggleBookmark}
            className={`${iconBtn} ${bookmarked ? "text-gold" : ""}`}
            aria-label={bookmarked ? "إزالة العلامة" : "حفظ علامة"}
          >
            <Icon name="bookmark" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
