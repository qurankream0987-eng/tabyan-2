import { cn } from "@/lib/utils";
import type { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  style?: CSSProperties;
}

export default function GlassCard({ children, className, onClick, hover = false, style }: GlassCardProps) {
  const interactive = !!(hover || onClick);
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      style={style}
      className={cn(
        "card-bubble group",
        interactive && "card-interactive",
        onClick && "cursor-pointer",
        "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
