import GlassCard from "./GlassCard";
import type { ReactNode } from "react";

export function InitialsAvatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return (
    <div className="rounded-full gold-ring bg-gradient-to-br from-burgundy to-burgundy-light text-white flex items-center justify-center font-amiri shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || "؟"}
    </div>
  );
}

export default function CircularUserCard({ name, subtitle, lines, actions, onClick }: {
  name: string; subtitle?: string; lines?: string[]; actions?: ReactNode; onClick?: () => void;
}) {
  return (
    <GlassCard onClick={onClick} className="flex items-center gap-4">
      <InitialsAvatar name={name} />
      <div className="flex-1 min-w-0">
        <h3 className="font-amiri text-lg text-burgundy truncate">{name}</h3>
        {subtitle && <p className="text-xs font-readex font-bold text-gold-dark dark:text-gold">{subtitle}</p>}
        {lines?.map((l, i) => <p key={i} className="text-xs text-muted-foreground font-readex truncate">{l}</p>)}
      </div>
      {actions && <div className="flex flex-col gap-1.5 shrink-0">{actions}</div>}
    </GlassCard>
  );
}
