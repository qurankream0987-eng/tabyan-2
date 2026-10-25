import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "مؤكد", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  scheduled: { label: "قيد التأكيد", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  pending: { label: "قيد المراجعة", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  completed: { label: "مكتملة", cls: "bg-burgundy/10 text-burgundy dark:bg-gold/15" },
  cancelled: { label: "ملغاة", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  no_show: { label: "لم يحضر", cls: "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200" },
  approved: { label: "مقبول", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  assigned: { label: "مُسند", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  answered: { label: "تم الرد", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  published: { label: "منشور", cls: "bg-gold/20 text-gold-dark" },
  live: { label: "بث مباشر", cls: "bg-burgundy text-white animate-rec-pulse" },
};
export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  if (status === "in_progress") return null;
  const s = MAP[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-readex font-bold shadow-sm", s.cls, className)}>{s.label}</span>;
}
