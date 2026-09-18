/**
 * MushafHideModeSheet — اختيار وضع إخفاء مستقل عن جلسة التسميع.
 * يُطبَّق على جميع كلمات الصفحة الحالية فوراً.
 */
import Icon from "@/components/app/Icon";
import type { HideMode } from "@/lib/recitation-types";

const MODES: { key: HideMode; label: string; desc: string; icon: string }[] = [
  {
    key: "visible_review",
    label: "القراءة العادية",
    desc: "النص ظاهر كاملاً",
    icon: "eye",
  },
  {
    key: "full_hide",
    label: "إخفاء كامل",
    desc: "الكلمات تختفي من أماكنها — سمّع من الذاكرة",
    icon: "eye-off",
  },
  {
    key: "first_word",
    label: "الكلمة الأولى",
    desc: "أول كلمة من كل آية تبقى مؤشراً",
    icon: "filter",
  },
  {
    key: "progressive_reveal",
    label: "كشف تدريجي",
    desc: "اكشف كلمة بكلمة أثناء التسميع بالضغط",
    icon: "eye",
  },
];

interface Props {
  current: HideMode;
  onChange: (mode: HideMode) => void;
  onClose: () => void;
}

export default function MushafHideModeSheet({ current, onChange, onClose }: Props) {
  const select = (mode: HideMode) => { onChange(mode); onClose(); };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl" style={{ touchAction: "auto" }}>
        {/* مقبض */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-1">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              <Icon name="x" size={17} />
            </button>
            <h2 className="font-amiri text-lg font-bold text-burgundy">وضع الإخفاء</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* الخيارات */}
        <div className="px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-2 space-y-1.5">
          {MODES.map(m => {
            const active = current === m.key;
            return (
              <button
                key={m.key}
                onClick={() => select(m.key)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition btn-press ${
                  active
                    ? "border-burgundy dark:border-gold bg-burgundy/5 dark:bg-gold/5"
                    : "border-border hover:border-burgundy/25 dark:hover:border-gold/25"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
                  active ? "bg-burgundy dark:bg-gold text-white dark:text-burgundy" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon name={m.icon as "eye" | "eye-off" | "filter"} size={16} />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className={`font-readex text-sm font-bold leading-tight ${active ? "text-burgundy dark:text-gold" : "text-foreground"}`}>
                    {m.label}
                  </div>
                  <div className="font-readex text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</div>
                </div>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-burgundy dark:bg-gold flex items-center justify-center shrink-0">
                    <Icon name="check" size={11} className="text-white dark:text-burgundy" />
                  </div>
                )}
              </button>
            );
          })}

          <p className="font-readex text-[11px] text-muted-foreground text-center pt-1">
            التسميع الكامل مع تتبع الآيات: افتح من زر التسميع
          </p>
        </div>
      </div>
    </div>
  );
}
