import type { IconName } from "@/components/app/Icon";

export type NotifTypeMeta = {
  label: string;
  icon: IconName;
  /** خلفية أيقونة الدائرة */
  bg: string;
  /** خلفية شارة النوع */
  chipBg: string;
};

/** أنواع الإشعارات — التسمية والأيقونة والألوان */
export const NOTIF_TYPE_META: Record<string, NotifTypeMeta> = {
  session_reminder: {
    label: "تذكير جلسة", icon: "clock",
    bg: "bg-burgundy/10 text-burgundy dark:bg-gold/10",
    chipBg: "bg-burgundy/10 text-burgundy dark:bg-gold/15",
  },
  session_change: {
    label: "تغيير موعد", icon: "calendar",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    chipBg: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  evaluation: {
    label: "تقييم", icon: "star",
    bg: "bg-gold/15 text-gold-dark dark:text-gold",
    chipBg: "bg-gold/15 text-gold-dark dark:text-gold",
  },
  achievement: {
    label: "إنجاز", icon: "certificate",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    chipBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  announcement: {
    label: "إعلان", icon: "bell",
    bg: "bg-burgundy/10 text-burgundy dark:bg-gold/10",
    chipBg: "bg-burgundy/10 text-burgundy dark:bg-gold/15",
  },
  ayah: {
    label: "آية اليوم", icon: "quran",
    bg: "bg-gold/15 text-gold-dark dark:text-gold",
    chipBg: "bg-gold/15 text-gold-dark dark:text-gold",
  },
  payment: {
    label: "مدفوعات", icon: "file-text",
    bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    chipBg: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  placement: {
    label: "تحديد المستوى", icon: "video",
    bg: "bg-burgundy/10 text-burgundy dark:bg-gold/10",
    chipBg: "bg-burgundy/10 text-burgundy dark:bg-gold/15",
  },
  promotion: {
    label: "ترقية", icon: "trending-up",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    chipBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  general: {
    label: "عام", icon: "bell",
    bg: "bg-burgundy/10 text-burgundy dark:bg-gold/10",
    chipBg: "bg-muted text-muted-foreground",
  },
  session: {
    label: "جلسات", icon: "calendar",
    bg: "bg-burgundy/10 text-burgundy dark:bg-gold/10",
    chipBg: "bg-burgundy/10 text-burgundy dark:bg-gold/15",
  },
  activity: {
    label: "نشاط", icon: "chart",
    bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    chipBg: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};

/** رابط الانضمام المباشر — لتذكيرات الجلسات فقط عند توفر meetingUrl في الحمولة */
export function getMeetingUrl(n: { type: string; payload?: unknown }): string | null {
  if (n.type !== "session_reminder") return null;
  const p = n.payload;
  if (p == null || typeof p !== "object") return null;
  const url = (p as Record<string, unknown>).meetingUrl;
  return typeof url === "string" && /^https?:\/\//.test(url) ? url : null;
}

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toAr = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

/** وقت نسبي بالعربية: الآن / منذ ٥ د / منذ ٣ س / أمس / تاريخ كامل */
export function relTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${toAr(mins)} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${toAr(hours)} س`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${toAr(days)} أيام`;
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
}

/** وقت كامل للتفاصيل */
export function fullTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    + " — " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}
