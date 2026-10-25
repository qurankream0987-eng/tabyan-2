import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";

interface VideoTimerProps {
  durationMinutes?: number;
  onComplete?: () => void;
  onTick?: (elapsed: number, remaining: number) => void;
}

export default function VideoTimer({ durationMinutes = 15, onComplete, onTick }: VideoTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const remaining = totalSeconds - elapsed;
  const progress = (elapsed / totalSeconds) * 100;
  const isWarning = remaining <= 120 && remaining > 30;
  const isCritical = remaining <= 30;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete?.();
          return totalSeconds;
        }
        onTick?.(next, totalSeconds - next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, totalSeconds, onComplete, onTick]);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isCritical ? "bg-destructive/10" : isWarning ? "bg-yellow-500/10" : "bg-burgundy/5 dark:bg-white/5"
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isCritical ? "bg-destructive/20 text-destructive" : isWarning ? "bg-yellow-500/20 text-yellow-600" : "bg-burgundy/10 text-burgundy"
      }`}>
        <Icon name="clock" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-readex text-xs font-bold text-muted-foreground">وقت المشاهدة</span>
          <span className={`font-readex text-sm font-bold ${
            isCritical ? "text-destructive" : isWarning ? "text-yellow-600" : "text-foreground"
          }`} dir="ltr">
            {formatTime(remaining)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isCritical ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-gold"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={() => setPaused(!paused)}
        className="w-8 h-8 rounded-full bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center text-burgundy"
      >
        <Icon name={paused ? "video" : "clock"} size={14} />
      </button>
    </div>
  );
}
