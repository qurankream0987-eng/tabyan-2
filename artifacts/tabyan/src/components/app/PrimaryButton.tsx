import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export default function PrimaryButton({ className, children, loading = false, disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "btn-bubble btn-primary-bubble inline-flex items-center justify-center gap-2 px-7 py-3 text-sm disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      {loading ? <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}
