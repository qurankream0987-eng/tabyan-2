/**
 * AyahActionSheet — قائمة الضغط المطوّل على آية داخل المصحف (§27).
 * إجراءات حقيقية فقط: تسميع من هنا · استماع من هنا · علامة · مشاركة.
 * (التفسير غير مدرج — لا توجد بيانات تفسير في المشروع، ولا واجهات وهمية.)
 */
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";

interface Props {
  verseKey: string;            // "سورة:آية"
  page: number;
  bookmarked: boolean;
  recitationEnabled: boolean;
  onReciteFromHere: (surahId: number, ayahNum: number) => void;
  onListenFromHere: (surahId: number, ayahNum: number) => void;
  onToggleBookmark: () => void;
  onShare: (surahId: number, ayahNum: number) => void;
  onClose: () => void;
}

export default function AyahActionSheet({
  verseKey, page, bookmarked, recitationEnabled,
  onReciteFromHere, onListenFromHere, onToggleBookmark, onShare, onClose,
}: Props) {
  const [surahId, ayahNum] = verseKey.split(":").map(Number);
  const surahName = SURAHS[surahId - 1]?.name ?? "";

  const actions: { icon: string; label: string; sub?: string; onClick: () => void; hidden?: boolean }[] = [
    {
      icon: "mic",
      label: "ابدأ التسميع من هنا",
      sub: `من الآية ${toArabicDigits(ayahNum)} إلى آخر السورة`,
      onClick: () => { onClose(); onReciteFromHere(surahId, ayahNum); },
      hidden: !recitationEnabled,
    },
    {
      icon: "headphones",
      label: "استمع من هنا",
      sub: "تشغيل التلاوة من هذه الآية",
      onClick: () => { onClose(); onListenFromHere(surahId, ayahNum); },
    },
    {
      icon: "bookmark",
      label: bookmarked ? "إزالة العلامة من الصفحة" : "علامة على الصفحة",
      sub: `صفحة ${toArabicDigits(page)}`,
      onClick: () => { onToggleBookmark(); onClose(); },
    },
    {
      icon: "link",
      label: "مشاركة الموضع",
      sub: `${surahName} — الآية ${toArabicDigits(ayahNum)}`,
      onClick: () => { onClose(); onShare(surahId, ayahNum); },
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-col items-center pt-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mb-3" />
          <p className="font-amiri text-lg font-bold text-burgundy dark:text-gold mb-1">
            {surahName} — الآية {toArabicDigits(ayahNum)}
          </p>
          <p className="font-readex text-[11px] text-muted-foreground mb-2">صفحة {toArabicDigits(page)}</p>
        </div>

        <div className="px-4 space-y-1">
          {actions.filter(a => !a.hidden).map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition text-right btn-press"
            >
              <div className="w-10 h-10 rounded-full bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center shrink-0">
                <Icon name={a.icon as never} size={17} className="text-burgundy dark:text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold text-foreground leading-tight">{a.label}</div>
                {a.sub && <div className="font-readex text-[11px] text-muted-foreground mt-0.5">{a.sub}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
