import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 1, 1.5, 2];
export default function AudioPlayerBar({ src, duration }: { src?: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const dur = duration ?? 0;
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3" dir="ltr">
      {src && <audio ref={audioRef} src={src} onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onLoadedMetadata={() => setProgress(0)} />}
      <button onClick={() => { if (!src) { setPlaying(!playing); return; } playing ? audioRef.current?.pause() : audioRef.current?.play(); setPlaying(!playing); }}
        className="w-10 h-10 rounded-full bg-burgundy text-white flex items-center justify-center shrink-0 hover:bg-burgundy-light transition">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="4" height="12" rx="1"/><rect x="8" y="1" width="4" height="12" rx="1"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z"/></svg>
        )}
      </button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-burgundy/15 overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: dur ? `${(progress / dur) * 100}%` : playing ? "45%" : "0%" }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-readex">
          <span>{fmt(progress)}</span><span>{fmt(dur)}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={cn("text-[10px] font-readex font-bold px-1.5 py-0.5 rounded", speed === s ? "bg-gold text-burgundy-dark" : "text-muted-foreground hover:text-foreground")}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
