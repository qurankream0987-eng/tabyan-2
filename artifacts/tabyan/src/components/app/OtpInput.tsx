import { useRef } from "react";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

export default function OtpInput({ value, onChange, length = 4 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");
  const setDigit = (i: number, d: string) => {
    const clean = normalizeDigits(d).replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(length, " ").split("");
    arr[i] = clean || " ";
    onChange(arr.join("").trimEnd());
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  };
  return (
    <div dir="ltr" className="flex gap-3 justify-center" onPaste={(e) => {
      const txt = normalizeDigits(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, length);
      if (txt) { onChange(txt); refs.current[Math.min(txt.length, length - 1)]?.focus(); e.preventDefault(); }
    }}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => { if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus(); }}
          className="w-14 h-16 rounded-xl border-2 border-burgundy/40 focus:border-burgundy dark:focus:border-gold bg-white dark:bg-night-surface text-center text-2xl font-readex font-bold text-burgundy outline-none transition" />
      ))}
    </div>
  );
}
