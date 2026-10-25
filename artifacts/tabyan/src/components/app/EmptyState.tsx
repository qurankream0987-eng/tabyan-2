import type { ReactNode } from "react";

export default function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4 page-enter">
      {/* Gold diamond ornament */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <span className="absolute inset-0 rounded-full bg-gold/12 dark:bg-gold/18 blur-xl" />
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="relative drop-shadow-[0_0_14px_rgba(212,175,55,0.35)]">
          <path d="M36 8 L64 36 L36 64 L8 36 Z" stroke="var(--svg-primary)" strokeWidth="1.5" />
          <path d="M36 20 L52 36 L36 52 L20 36 Z" stroke="var(--svg-accent)" strokeWidth="1.5" />
          <circle cx="36" cy="36" r="5" fill="var(--svg-primary)" fillOpacity="0.6" />
        </svg>
      </div>
      <h3 className="font-amiri text-xl font-bold text-burgundy">{title}</h3>
      {hint && (
        <p className="font-readex text-sm text-muted-foreground max-w-xs leading-relaxed">{hint}</p>
      )}
      {action}
    </div>
  );
}
