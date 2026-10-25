/**
 * AyahActionSheet — قائمة الضغط المطوّل على آية داخل المصحف (§27).
 * إجراءات حقيقية فقط: تسميع من هنا · استماع من هنا · علامة · مشاركة.
 * (التفسير غير مدرج — لا توجد بيانات تفسير في المشروع، ولا واجهات وهمية.)
 */
import Icon from "@/components/app/Icon";
import ReaderSheet from "./ReaderSheet";
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
  /** يبدأ اختبار الحفظ من هذه الآية إلى آخر السورة (المشغّل الحقيقي) */
  onTestFromHere?: (surahId: number, ayahNum: number) => void;
  /** أخطاء محفوظة لهذه الآية في سجل الجهاز (غير المرفوضة) */
  mistakeCount?: number;
  onShowMistakes?: () => void;
  onClose: () => void;
}

export default function AyahActionSheet({
  verseKey, page, bookmarked, recitationEnabled,
  onReciteFromHere, onListenFromHere, onToggleBookmark, onShare, onTestFromHere, mistakeCount = 0, onShowMistakes, onClose,
}: Props) {
  const [surahId, ayahNum] = verseKey.split(":").map(Number);
  const surahName = SURAHS[surahId - 1]?.name ?? "";

  const actions: { icon: string; label: string; sub?: string; onClick: () => void; hidden?: boolean }[] = [
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
      icon: "mic",
      label: "ابدأ التسميع من هنا",
      sub: `من الآية ${toArabicDigits(ayahNum)} إلى آخر السورة`,
      onClick: () => { onClose(); onReciteFromHere(surahId, ayahNum); },
      hidden: !recitationEnabled,
    },
    {
      icon: "check-square",
      label: "اختبر من هنا",
      sub: `من الآية ${toArabicDigits(ayahNum)} إلى آخر السورة`,
      onClick: () => { onClose(); onTestFromHere?.(surahId, ayahNum); },
      hidden: !onTestFromHere,
    },
    {
      icon: "clock",
      label: "أخطائي في هذه الآية",
      sub: `${toArabicDigits(mistakeCount)} في سجل التلاوة`,
      onClick: () => { onShowMistakes?.(); },
      hidden: !onShowMistakes || mistakeCount === 0,
    },
    {
      icon: "link",
      label: "مشاركة الموضع",
      sub: `${surahName} — الآية ${toArabicDigits(ayahNum)}`,
      onClick: () => { onClose(); onShare(surahId, ayahNum); },
    },
  ];

  return (
    <ReaderSheet
      title={`${surahName} — الآية ${toArabicDigits(ayahNum)}`}
      subtitle={`صفحة ${toArabicDigits(page)}`}
      onClose={onClose}
    >
      <div className="tby-ayah-actions space-y-1" role="group" aria-label="إجراءات الآية">
        {actions.filter(a => !a.hidden).map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            data-testid={`ayah-action-${a.icon}`}
            className="tby-ayah-action w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-right"
          >
            <div aria-hidden="true" className="tby-ayah-action-icon w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--mushaf-primary)_9%,transparent)] text-[var(--mushaf-primary)]">
              <Icon name={a.icon as never} size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-readex text-sm font-bold leading-tight">{a.label}</div>
              {a.sub && <div className="tby-sheet-muted font-readex text-[11px] mt-0.5">{a.sub}</div>}
            </div>
          </button>
        ))}
      </div>
    </ReaderSheet>
  );
}
