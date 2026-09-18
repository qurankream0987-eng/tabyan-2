import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  style?: CSSProperties;
}

export default function GlassCard({ children, className, onClick, hover = true, style }: GlassCardProps) {
  const interactive = !!(hover || onClick);
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={style}
      className={cn(
        "card-bubble group",
        interactive && "cursor-pointer hover:-translate-y-[2px] hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
        "transition-all duration-200 p-3.5 sm:p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
