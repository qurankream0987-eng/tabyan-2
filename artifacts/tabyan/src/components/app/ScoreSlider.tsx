export default function ScoreSlider({ label, max, value, onChange }: { label: string; max: number; value: number; onChange: (v: number) => void }) {
  const percent = value / max;
  // Dynamic color logic: Green (success) if >= 90%, Gold if >= 60%, Red (destructive) if < 60%
  const colorClass = percent >= 0.9 ? "text-success" : percent >= 0.6 ? "text-gold-dark dark:text-gold" : "text-destructive";
  const bgClass = percent >= 0.9 ? "bg-success/10 border-success/30" : percent >= 0.6 ? "bg-gold/10 border-gold/30" : "bg-destructive/10 border-destructive/30";
  const accentHex = percent >= 0.9 ? "#10b981" : percent >= 0.6 ? "#d4af37" : "#ef4444";

  return (
    <div className={`rounded-xl p-4 transition-colors duration-300 border ${bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-readex font-bold text-sm text-foreground">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`font-amiri text-2xl transition-colors duration-300 ${colorClass}`}>{value}</span>
          <span className="text-xs text-muted-foreground font-readex">من {max}</span>
        </div>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full cursor-pointer transition-all duration-300" 
        style={{ accentColor: accentHex }} 
        dir="ltr" />
    </div>
  );
}
