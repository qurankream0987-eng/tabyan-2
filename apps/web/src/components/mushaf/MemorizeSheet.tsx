/**
 * MemorizeSheet — «الحفظ» (Part 22–24).
 *
 * 1) مع تبيان AI (إن كان مفعّلاً): إظهار الآيات / إخفاء الآيات، وخيار
 *    «إخفاء علامات الآيات» للحفظ فقط. عند الإخفاء تبقى هندسة الأسطر كما هي
 *    (opacity فقط) وتنكشف الكلمات تدريجياً مع التلاوة الصحيحة.
 * 2) مراجعة ذاتية دون ميكروفون: أوضاع الإخفاء اليدوية الحالية على الصفحة.
 * 3) مدخل «اختبار الحفظ» حين يتوفر.
 */
import Icon from "@/components/app/Icon";
import type { HideMode } from "@/lib/recitation-types";
import ReaderSheet from "./ReaderSheet";
import { SwitchRow } from "./RecitationSessionSettingsSheet";

const SELF_REVIEW_MODES: { key: HideMode; label: string; desc: string }[] = [
  { key: "visible_review", label: "القراءة العادية", desc: "النص ظاهر كاملاً" },
  { key: "full_hide", label: "إخفاء كامل", desc: "الكلمات تختفي من أماكنها" },
  { key: "first_word", label: "الكلمة الأولى", desc: "أول كلمة من كل آية تبقى مؤشراً" },
  { key: "progressive_reveal", label: "كشف تدريجي", desc: "اكشف كلمة بكلمة بالضغط" },
];

interface Props {
  aiAvailable: boolean;
  recitationEnabled: boolean;
  hideVerses: boolean;
  hideMarkers: boolean;
  onHideVersesChange: (value: boolean) => void;
  onHideMarkersChange: (value: boolean) => void;
  onStart: () => void;
  selfReviewMode: HideMode;
  onSelfReviewModeChange: (mode: HideMode) => void;
  onOpenTest?: () => void;
  onClose: () => void;
}

export default function MemorizeSheet({
  aiAvailable, recitationEnabled, hideVerses, hideMarkers, onHideVersesChange, onHideMarkersChange, onStart,
  selfReviewMode, onSelfReviewModeChange, onOpenTest, onClose,
}: Props) {
  const canStart = aiAvailable && recitationEnabled;
  return (
    <ReaderSheet
      title="الحفظ"
      subtitle={canStart ? "سمّع من الذاكرة وتبيان AI يكشف ما تتلوه صحيحاً" : "مراجعة ذاتية على الصفحة"}
      onClose={onClose}
      footer={canStart ? (
        <button
          type="button"
          onClick={onStart}
          className="tby-primary-action w-full h-12 rounded-2xl font-readex text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <Icon name="mic" size={17} />
          {hideVerses ? "ابدأ الحفظ" : "ابدأ التلاوة"}
        </button>
      ) : undefined}
    >
      {canStart && (
        <section className="space-y-2 pt-1" aria-label="عرض الآيات أثناء التلاوة">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="عرض الآيات">
            {[
              { value: false, label: "إظهار الآيات", icon: "eye" as const },
              { value: true, label: "إخفاء الآيات", icon: "eye-off" as const },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={hideVerses === option.value}
                onClick={() => onHideVersesChange(option.value)}
                className="tby-option h-16 flex flex-col items-center justify-center gap-1 font-readex text-sm font-bold"
              >
                <Icon name={option.icon} size={18} />
                {option.label}
              </button>
            ))}
          </div>
          <SwitchRow
            label="إخفاء علامات الآيات"
            description="أصعب: تختفي أرقام الآيات أيضاً دون أي تغيير في مواضع الأسطر."
            checked={hideMarkers}
            disabled={!hideVerses}
            onChange={onHideMarkersChange}
          />
          <p className="tby-sheet-muted font-readex text-[11px] leading-relaxed">
            تنكشف الكلمات حين تُتلى صحيحة. زر «تلميح» يكشف كلمة، ثم عدة كلمات، ثم بقية الآية، ويُسجَّل منفصلاً عن الأخطاء.
          </p>
        </section>
      )}

      {onOpenTest && canStart && (
        <button
          type="button"
          onClick={onOpenTest}
          className="tby-sheet-card mt-4 w-full px-3.5 py-3 flex items-center gap-3 text-right"
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--mushaf-primary)_10%,transparent)] text-[var(--mushaf-primary)]">
            <Icon name="check-square" size={18} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-readex text-sm font-bold">اختبار الحفظ</span>
            <span className="tby-sheet-muted block font-readex text-[11px] mt-0.5">بداية آية ظاهرة، وأكمل الباقي من ذاكرتك</span>
          </span>
          <Icon name="chevron-left" size={16} className="tby-sheet-muted" />
        </button>
      )}

      <section className={canStart ? "mt-5 pt-4 border-t border-[var(--mushaf-chrome-border)]" : "pt-1"} aria-label="مراجعة ذاتية دون ميكروفون">
        <h3 className="font-readex text-sm font-bold mb-1">مراجعة ذاتية دون ميكروفون</h3>
        <p className="tby-sheet-muted font-readex text-[11px] mb-2">تُطبَّق على الصفحة فوراً ولا تُسجَّل جلسة.</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="وضع المراجعة الذاتية">
          {SELF_REVIEW_MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              role="radio"
              aria-checked={selfReviewMode === mode.key}
              onClick={() => onSelfReviewModeChange(mode.key)}
              className="tby-option px-3 py-2.5 text-right"
            >
              <span className="block font-readex text-[13px] font-bold leading-tight">{mode.label}</span>
              <span className="tby-sheet-muted block font-readex text-[10px] mt-0.5 leading-tight">{mode.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </ReaderSheet>
  );
}
