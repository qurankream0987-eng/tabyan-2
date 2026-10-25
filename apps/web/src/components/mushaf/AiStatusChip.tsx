/**
 * شارة حالة تبيان AI الصغيرة — بديل اللافتة الكبيرة.
 * النقر يفتح ورقة صغيرة: الرسالة + «حاول مرة أخرى» + «إغلاق». لا تتبعات تقنية.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/app/Icon";

interface Props {
  kind: "listening" | "pending" | "paused" | "error" | "done" | "idle";
  label: string;
  /** رسالة الفشل للمستخدم (إن وُجدت) */
  message?: string | null;
  onRetry?: (() => void) | null;
  onDismiss?: (() => void) | null;
  onOpenChange?: (open: boolean) => void;
}

export default function AiStatusChip({ kind, label, message = null, onRetry = null, onDismiss = null, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);
  const failed = kind === "error";
  return (
    <>
      <button
        type="button"
        className="tby-ai-chip"
        data-kind={kind}
        onClick={() => setOpen(true)}
        aria-label={`تبيان AI: ${label}${failed ? " — تفاصيل وإعادة المحاولة" : ""}`}
        data-testid="mushaf-ai-status-chip"
      >
        <span className="tby-mic-dot" data-kind={kind} aria-hidden />
        <span>{failed ? "تبيان AI · غير متصل" : label}</span>
      </button>
      {open && (
        <div className="tby-sheet-layer" dir="rtl">
          <div className="tby-sheet-scrim" onClick={() => setOpen(false)} aria-hidden />
          <div className="tby-sheet tby-ai-sheet" role="dialog" aria-modal="true" aria-label="حالة تبيان AI">
            <div className="flex justify-center pt-2"><span className="tby-sheet-handle" /></div>
            <div className="px-5 pt-3 pb-5" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="tby-mic-dot" data-kind={kind} aria-hidden />
                <h2 className="tby-sheet-title font-readex text-base font-bold">{failed ? "تبيان AI غير متصل" : `تبيان AI · ${label}`}</h2>
              </div>
              {message && <p className="tby-sheet-muted font-readex text-[13px] leading-relaxed mb-4">{message}</p>}
              <div className="flex gap-2">
                {onRetry && (
                  <button
                    type="button"
                    className="tby-primary-action h-11 px-5 rounded-full font-readex text-sm font-bold inline-flex items-center gap-2"
                    onClick={() => { setOpen(false); onRetry(); }}
                    data-testid="mushaf-ai-retry"
                  >
                    <Icon name="refresh" size={15} /> حاول مرة أخرى
                  </button>
                )}
                <button
                  type="button"
                  className="tby-chip h-11 px-5 rounded-full font-readex text-sm font-bold"
                  onClick={() => { setOpen(false); onDismiss?.(); }}
                  data-testid="mushaf-ai-close"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
