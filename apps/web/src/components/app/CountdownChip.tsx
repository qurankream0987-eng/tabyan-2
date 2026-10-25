import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function CountdownChip({ deadline }: { deadline: string | Date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(deadline).getTime() - now;
  const over = ms <= 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000);
  return (
    <span dir="ltr" className={cn(
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-readex font-bold tabular-nums",
      over ? "bg-red-100 text-red-700 animate-rec-pulse dark:bg-red-900/40 dark:text-red-300"
        : h < 6 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    )}>
      ⏱ {over && "تجاوز "}{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
