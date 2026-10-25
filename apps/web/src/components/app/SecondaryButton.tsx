import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export default function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "btn-bubble btn-secondary-bubble inline-flex items-center justify-center gap-2 px-7 py-3 text-sm disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}
