import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Icon from "@/components/app/Icon";

export default function Modal({ open, onClose, children, className }: {
  open: boolean; onClose: () => void; children: ReactNode; className?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (!open) return;
    window.addEventListener("keydown", h);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto p-4 sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-burgundy/15 bg-card p-6 text-foreground shadow-2xl dark:border-gold/20 dark:bg-night sm:max-h-[calc(100dvh-3rem)] sm:p-8 animate-fade-up",
        className,
      )}>
        <button onClick={onClose} aria-label="إغلاق" className="absolute top-4 left-4 w-8 h-8 rounded-full bg-burgundy/10 text-burgundy flex items-center justify-center hover:bg-burgundy/20 transition">
          <Icon name="x" size={14} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
