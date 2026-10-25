/**
 * ReaderModeFab — الزر الدائري الرئيسي أسفل يمين القارئ + الأداة السياقية أسفل اليسار.
 *
 * - نقرة: إجراء الوضع الحالي (ميكروفون / تشغيل-إيقاف / اختبار).
 * - ضغط مطوّل (≥ 480ms) أو قائمة السياق أو ArrowUp / Shift+F10 / زر ContextMenu:
 *   يفتح منتقي الأوضاع (قراءة · استماع · تسميع · اختبار).
 * - النقرة التي تلي ضغطاً مطوّلاً تُلغى كي لا يُنفَّذ الإجراء بالخطأ.
 * - أثناء جلسة نشطة: تبديل الوضع مقفل بصراحة، ويُعرض «إنهاء الجلسة» بدلاً من ذلك.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/app/Icon";

export type ReaderMode = "read" | "listen" | "recite" | "test";

export const READER_MODES: { key: ReaderMode; icon: IconName; label: string; hint: string }[] = [
  { key: "read", icon: "quran", label: "قراءة", hint: "المصحف وحده" },
  { key: "listen", icon: "headphones", label: "استماع", hint: "تلاوة القارئ آية بآية" },
  { key: "recite", icon: "mic", label: "تسميع", hint: "تبيان يتابع تلاوتك" },
  { key: "test", icon: "check-square", label: "اختبار", hint: "اختبار حفظ على بطاقات" },
];

export type FabState = "ready" | "busy" | "listening" | "paused" | "failed";

interface FabProps {
  mode: ReaderMode;
  icon: IconName | "spinner";
  label: string;
  state: FabState;
  disabled?: boolean;
  hidden: boolean;
  onAction: () => void;
  onModeChange: (mode: ReaderMode) => void;
  /** جلسة جارية: يُقفل التبديل ويُعرض إجراء الإنهاء */
  lock?: { reason: string; endLabel: string; onEnd: () => void } | null;
  unavailable?: Partial<Record<ReaderMode, string>>;
  /** النقرة تفتح المنتقي بدل الإجراء (وضع القراءة: لا إجراء خاص) */
  actionOpensSelector?: boolean;
  /** يُبلغ القارئ بفتح/إغلاق المنتقي ليوقف مؤقت إخفاء الأدوات */
  onOpenChange?: (open: boolean) => void;
}

const LONG_PRESS_MS = 480;

export default function ReaderModeFab({
  mode, icon, label, state, disabled = false, hidden, onAction, onModeChange, lock = null, unavailable = {}, actionOpensSelector = false, onOpenChange,
}: FabProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  useEffect(() => { onOpenChangeRef.current?.(open); }, [open]);
  useEffect(() => () => { onOpenChangeRef.current?.(false); }, []);

  const clearTimer = () => { if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; } };
  useEffect(() => clearTimer, []);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    const first = anchorRef.current?.querySelector<HTMLButtonElement>(".tby-mode-option:not(:disabled)");
    first?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openSelector = useCallback(() => { clearTimer(); setOpen(true); }, []);

  const choose = (next: ReaderMode) => {
    setOpen(false);
    if (next !== mode) onModeChange(next);
    buttonRef.current?.focus();
  };

  return (
    <div className="tby-fab-anchor" data-hidden={hidden} inert={hidden} ref={anchorRef} dir="rtl">
      {open && (
        <div className="tby-mode-selector" role="menu" aria-label="اختر وضع القارئ">
          <p className="tby-mode-selector-title" aria-hidden="true">وضع القارئ</p>
          {lock && <p className="tby-mode-lock" role="note">{lock.reason}</p>}
          {READER_MODES.map((option) => {
            const reason = unavailable[option.key];
            const locked = !!lock && option.key !== mode;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={option.key === mode}
                disabled={locked || !!reason}
                className="tby-mode-option"
                onClick={() => choose(option.key)}
                data-testid={`mushaf-mode-${option.key}`}
              >
                <span className="tby-mode-option-icon"><Icon name={option.icon} size={18} /></span>
                <span className="tby-mode-option-text">
                  <span className="tby-mode-option-label">{option.label}</span>
                  <span className="tby-mode-option-hint">{reason ?? option.hint}</span>
                </span>
                {option.key === mode && <Icon name="check" size={15} className="tby-mode-option-check" />}
              </button>
            );
          })}
          {lock && (
            <button
              type="button"
              role="menuitem"
              className="tby-mode-option tby-mode-option--end"
              onClick={() => { setOpen(false); lock.onEnd(); }}
              data-testid="mushaf-mode-end-session"
            >
              <span className="tby-mode-option-icon"><Icon name="stop" size={16} /></span>
              <span className="tby-mode-option-label">{lock.endLabel}</span>
            </button>
          )}
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="tby-mode-fab"
        data-state={state}
        data-mode={mode}
        disabled={disabled}
        aria-label={`${label} — اضغط مطولاً أو سهم أعلى لتغيير الوضع`}
        title={`${label} · اضغط مطولاً لتغيير الوضع`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={state === "busy"}
        data-testid="mushaf-mode-fab"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          suppressClickRef.current = false;
          startRef.current = { x: event.clientX, y: event.clientY };
          clearTimer();
          timerRef.current = window.setTimeout(() => {
            suppressClickRef.current = true;
            openSelector();
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(event) => {
          const s = startRef.current;
          if (s && Math.hypot(event.clientX - s.x, event.clientY - s.y) > 10) clearTimer();
        }}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        onContextMenu={(event) => { event.preventDefault(); suppressClickRef.current = true; openSelector(); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            openSelector();
          }
        }}
        onClick={() => {
          if (suppressClickRef.current) { suppressClickRef.current = false; return; }
          if (open) { setOpen(false); return; }
          if (actionOpensSelector) { openSelector(); return; }
          onAction();
        }}
      >
        {icon === "spinner"
          ? <span className="tby-fab-spinner" aria-hidden="true" />
          : <Icon name={icon} size={24} />}
        <span className="tby-mode-fab-tag" aria-hidden="true">{READER_MODES.find((m) => m.key === mode)?.label}</span>
      </button>
    </div>
  );
}

interface ContextProps {
  icon: IconName;
  label: string;
  pressed?: boolean;
  hidden: boolean;
  onClick: () => void;
  testId: string;
  children?: ReactNode;
}

/** الأداة السياقية أسفل اليسار — مرآة الزر الرئيسي. */
export function ReaderContextButton({ icon, label, pressed, hidden, onClick, testId }: ContextProps) {
  return (
    <div className="tby-context-anchor" data-hidden={hidden} inert={hidden}>
      <button
        type="button"
        className="tby-context-btn"
        aria-label={label}
        title={label}
        aria-pressed={pressed}
        onClick={onClick}
        data-testid={testId}
      >
        <Icon name={icon} size={20} />
      </button>
    </div>
  );
}
