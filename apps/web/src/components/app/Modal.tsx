import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Icon from "@/components/app/Icon";

export default function Modal({ open, onClose, children, className }: {
  open: boolean; onClose: () => void; children: ReactNode; className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusable()[0] ?? panelRef.current)?.focus({ preventScroll: true }));
    const h = (e: KeyboardEvent) => {
      const panels = document.querySelectorAll(".tabyan-modal-panel[tabindex]");
      if (panels[panels.length - 1] !== panelRef.current) return;
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { e.preventDefault(); panelRef.current?.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", h);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", h);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal>
      <div className="tabyan-modal-backdrop absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className={cn(
        "tabyan-modal-panel relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-burgundy/15 bg-card p-5 text-foreground shadow-xl dark:border-gold/20 dark:bg-night sm:max-h-[calc(100dvh-3rem)] sm:p-7",
        className,
      )}>
        <button onClick={onClose} aria-label="إغلاق" className="absolute top-3 left-3 w-11 h-11 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center hover:bg-burgundy/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition sm:top-4 sm:left-4">
          <Icon name="x" size={14} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
