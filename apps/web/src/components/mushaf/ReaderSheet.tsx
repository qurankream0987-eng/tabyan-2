/**
 * ReaderSheet — غلاف موحّد لكل أوراق قارئ المصحف.
 *
 * - هاتف/لوحي: ورقة سفلية (bottom sheet) بسطح ورقي ومقبض.
 * - مكتبي (≥1024px): لوحة جانبية على جهة البداية (يمين RTL) والمصحف يبقى
 *   في وسط الشاشة خلف غطاء خفيف — لا شكل لوحة تحكم إدارية.
 * - dialog حقيقي: aria-modal، عنوان مرتبط، Escape يغلق، التركيز ينتقل للورقة
 *   ويعود لعنصر الفتح عند الإغلاق.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import Icon from "@/components/app/Icon";

interface Props {
  title: string;
  /** سطر وصفي اختياري أسفل العنوان */
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** منطقة ثابتة أسفل الورقة (أزرار) */
  footer?: ReactNode;
  /** عنصر في طرف الترويسة المقابل لزر الإغلاق */
  headerAction?: ReactNode;
  /** يمنع الإغلاق بالغطاء/Escape أثناء عملية حرجة */
  dismissible?: boolean;
  className?: string;
}

export default function ReaderSheet({
  title, subtitle, onClose, children, footer, headerAction, dismissible = true, className = "",
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (dismissibleRef.current) onCloseRef.current();
      }
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        )).filter(element => element.getClientRects().length > 0 && !element.closest("[inert]"));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) {
          event.preventDefault();
          panel.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="tby-sheet-layer" dir="rtl">
      <div className="tby-sheet-scrim" onClick={() => { if (dismissible) onClose(); }} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`tby-sheet outline-none ${className}`}
      >
        <div className="tby-sheet-header flex flex-col items-center pt-3 shrink-0">
          <div className="tby-sheet-handle mb-2" aria-hidden />
          <div className="flex items-center justify-between w-full px-3 pb-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              className="tby-icon-btn tby-sheet-close shrink-0"
              aria-label="إغلاق"
              data-testid="reader-sheet-close"
            >
              <Icon name="x" size={18} />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <h2 id={titleId} className="tby-sheet-title font-amiri text-lg font-bold leading-tight truncate">{title}</h2>
              {subtitle && <div className="tby-sheet-muted font-readex text-[11px] mt-0.5 truncate">{subtitle}</div>}
            </div>
            <div className="w-11 shrink-0 flex justify-center">{headerAction}</div>
          </div>
        </div>
        <div className="tby-sheet-body flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-3">{children}</div>
        {footer && (
          <div className="tby-sheet-footer shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">{footer}</div>
        )}
        {!footer && <div className="shrink-0 h-[calc(0.75rem+env(safe-area-inset-bottom,0px))]" aria-hidden />}
      </div>
    </div>
  );
}
