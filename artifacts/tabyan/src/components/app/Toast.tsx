import { useToastStore } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed top-4 inset-x-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div key={t.id} className={cn(
          "glass rounded-xl px-5 py-3 font-readex font-bold text-sm shadow-card animate-fade-up max-w-md text-center",
          t.kind === "success" && "border-r-4 border-gold text-burgundy",
          t.kind === "error"   && "border-r-4 border-red-500 text-red-700 dark:text-red-400",
          t.kind === "info"    && "border-r-4 border-burgundy text-burgundy"
        )}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
