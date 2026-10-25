/**
 * RecitationResultSheet — ملخص الجلسة (Part 46) فوق المصحف دون مغادرة القارئ.
 *
 * يعرض: المدة · الآيات · الكلمات · الأخطاء · المصحَّحة · التلميحات · الدقة ·
 * أضعف المواضع · اقتراح المراجعة. التقييم شفاف: طريقة حساب الدقة مكتوبة،
 * والانحرافات غير المؤكدة لا تُحتسب أخطاء. بلا مؤثرات احتفالية.
 */
import Icon from "@/components/app/Icon";
import { formatDuration, toArabicNum, type SessionMode } from "@/lib/recitation-types";
import { SURAHS } from "@/lib/quran-data";
import type { SessionResult } from "@/lib/mushaf/useRecitationSession";
import type { RecitationSummary } from "@/lib/recitation-ai/recitationStateEngine";
import ReaderSheet from "./ReaderSheet";

export interface WeakAyah {
  verseKey: string;
  confirmed: number;
  corrected: number;
  peeks: number;
}

interface Props {
  result: SessionResult;
  /** ملخص Tabyan AI المحلي للجلسة، إن كان التتبع الحي فعّالاً. */
  aiSummary?: RecitationSummary | null;
  weakest?: WeakAyah[];
  /** عنوان وضع الجلسة الفعلي (تلاوة/حفظ/اختبار/متابعة) إن اختلف عن نوع الخادم */
  kindLabel?: string;
  /** فتح سجل الجلسات والأخطاء */
  onOpenHistory?: () => void;
  onClose: () => void;
  onRepeat: () => void;
}

const MODE_LABEL: Record<SessionMode, string> = {
  general: "تلاوة",
  educational: "تسميع تعليمي",
};

function ayahLabel(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return `${SURAHS[surah - 1]?.name ?? ""} ${toArabicNum(ayah)}`;
}

/** اقتراح مراجعة حتمي من نتيجة الجلسة نفسها — لا تقدير ولا نموذج. */
export function reviewSuggestion(summary: RecitationSummary | null | undefined, weakest: WeakAyah[]): string | null {
  if (!summary || summary.wordsHeard === 0) return null;
  if (weakest.length) {
    const names = weakest.slice(0, 2).map((entry) => ayahLabel(entry.verseKey)).join(" و");
    return `أعد تلاوة ${names} ثلاث مرات مع النظر، ثم سمّعها غيباً.`;
  }
  if (summary.accuracyPercent !== null && summary.accuracyPercent >= 95) {
    return "تلاوة متقنة لهذا المقطع — راجعه غيباً بعد يوم لتثبيته.";
  }
  return "تابع التلاوة من الموضع نفسه في جلستك القادمة.";
}

export default function RecitationResultSheet({
  result, aiSummary, weakest = [], kindLabel, onOpenHistory, onClose, onRepeat,
}: Props) {
  const { surahName, startAyah, endAyah, durationSeconds, mode } = result;
  const hasAi = !!aiSummary && aiSummary.wordsHeard > 0;
  const suggestion = reviewSuggestion(aiSummary, weakest);

  const tiles: { label: string; value: string; tone?: "error" | "muted" }[] = [
    { label: "المدة", value: formatDuration(durationSeconds) },
    ...(hasAi ? [
      { label: "الآيات", value: toArabicNum(aiSummary!.ayahsCovered) },
      { label: "الكلمات", value: toArabicNum(aiSummary!.wordsHeard) },
      { label: "الأخطاء", value: toArabicNum(aiSummary!.confirmedMistakes), tone: aiSummary!.confirmedMistakes ? "error" as const : undefined },
      { label: "صُحّحت", value: toArabicNum(aiSummary!.correctedMistakes) },
      { label: "التلميحات", value: toArabicNum(aiSummary!.peeks) },
    ] : [
      { label: "الآيات", value: startAyah === endAyah ? toArabicNum(startAyah) : `${toArabicNum(startAyah)}–${toArabicNum(endAyah)}` },
    ]),
  ];

  return (
    <ReaderSheet
      title="ملخص الجلسة"
      subtitle={`${kindLabel ?? MODE_LABEL[mode]} · ${surahName}`}
      onClose={onClose}
      footer={(
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="tby-chip flex-1 h-12 rounded-2xl font-readex text-sm font-bold"
          >
            العودة للمصحف
          </button>
          <button
            type="button"
            onClick={onRepeat}
            className="tby-primary-action flex-1 h-12 rounded-2xl font-readex text-sm font-bold inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="refresh" size={14} />
            جلسة جديدة
          </button>
        </div>
      )}
    >
      {hasAi && (
        <div className="text-center pt-1 pb-4">
          <p className="tby-sheet-muted font-readex text-[11px]">الدقة</p>
          <p className="font-readex text-3xl font-bold leading-tight mt-0.5" style={{ color: "var(--mushaf-primary)" }}>
            {aiSummary!.accuracyPercent === null ? "—" : `${toArabicNum(aiSummary!.accuracyPercent)}٪`}
          </p>
          {aiSummary!.accuracyPercent === null && (
            <p className="tby-sheet-muted font-readex text-[11px] mt-1">العينة أقصر من أن تُحسب لها دقة ذات معنى</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="tby-sheet-card px-2 py-2.5 text-center min-w-0">
            <div
              className="font-readex text-lg font-bold leading-none tabular-nums"
              style={tile.tone === "error" ? { color: "var(--mushaf-error)" } : undefined}
            >
              {tile.value}
            </div>
            <div className="tby-sheet-muted font-readex text-[11px] mt-1.5 truncate">{tile.label}</div>
          </div>
        ))}
      </div>

      {hasAi && aiSummary!.unconfirmed > 0 && (
        <p className="tby-sheet-muted font-readex text-[11px] mt-3 leading-relaxed">
          {toArabicNum(aiSummary!.unconfirmed)} موضع لم يتأكد بسبب الثقة أو جودة الصوت، فلم يُحتسب خطأ.
        </p>
      )}

      {weakest.length > 0 && (
        <section className="mt-5" aria-label="أضعف المواضع">
          <h3 className="font-readex text-sm font-bold mb-2">أضعف المواضع</h3>
          <ul className="space-y-1.5">
            {weakest.map((entry) => (
              <li key={entry.verseKey} className="tby-sheet-card px-3 py-2.5 flex items-center justify-between gap-2">
                <span className="font-amiri text-base font-bold">{ayahLabel(entry.verseKey)}</span>
                <span className="tby-sheet-muted font-readex text-[11px]">
                  {[
                    entry.confirmed ? `${toArabicNum(entry.confirmed)} خطأ` : null,
                    entry.corrected ? `${toArabicNum(entry.corrected)} مصحَّح` : null,
                    entry.peeks ? `${toArabicNum(entry.peeks)} تلميح` : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestion && (
        <section className="mt-5 tby-sheet-card px-3.5 py-3" aria-label="اقتراح المراجعة">
          <p className="font-readex text-[11px] font-bold" style={{ color: "var(--mushaf-primary)" }}>اقتراح المراجعة</p>
          <p className="font-readex text-sm mt-1 leading-relaxed">{suggestion}</p>
        </section>
      )}

      {hasAi && (
        <details className="mt-4 group">
          <summary className="tby-sheet-muted font-readex text-[11px] cursor-pointer select-none list-none inline-flex items-center gap-1">
            <Icon name="info" size={13} />
            كيف تُحسب الدقة؟
          </summary>
          <p className="tby-sheet-muted font-readex text-[11px] leading-relaxed mt-2">
            الدقة = الكلمات الصحيحة من أول محاولة ÷ (الصحيحة + الأخطاء المؤكدة + الأخطاء المصحَّحة).
            التلميحات لا تُعدّ أخطاء، والانحرافات التي لم تتأكد لا تُحتسب. تبيان AI يقارن ما يسمعه
            بنص المصحف الكنسي فقط، ولا يقيّم أحكام التجويد.
          </p>
        </details>
      )}

      {onOpenHistory && (
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-4 w-full h-11 rounded-xl font-readex text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{ color: "var(--mushaf-primary)" }}
        >
          <Icon name="clock" size={15} />
          سجل الجلسات والأخطاء
        </button>
      )}
    </ReaderSheet>
  );
}
