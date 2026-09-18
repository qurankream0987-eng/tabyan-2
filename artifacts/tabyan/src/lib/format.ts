// Shared Arabic formatting helpers
import type { IconName } from "@/components/Icon";
import productRegistry from "../../../../lib/tabyan-domain/product-registry.json";

export const DAY_AR: Record<string, string> = {
  sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء",
  thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
};
const DAYS_SHORT = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const fmtTime = (d: string | Date | null | undefined) =>
  new Date(d ?? 0).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (d: string | Date | null | undefined) =>
  new Date(d ?? 0).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "long" });

export const fmtDateTime = (d: string | Date | null | undefined) => `${fmtDate(d)} — ${fmtTime(d)}`;

export const dayName = (d: string | Date) => DAYS_SHORT[new Date(d).getDay()];

export const weekdayKey = (d: string | Date) =>
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(d).getDay()];

export const hoursSince = (d: string | Date | null | undefined) =>
  Math.max(0, Math.floor((Date.now() - new Date(d ?? 0).getTime()) / 3600000));

export const isToday = (d: string | Date) => {
  const x = new Date(d), n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
};

export const isTomorrow = (d: string | Date) => {
  const x = new Date(d), n = new Date();
  const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return x.getFullYear() === t.getFullYear() && x.getMonth() === t.getMonth() && x.getDate() === t.getDate();
};

/** تسمية ذكية ليوم الموعد حسب تاريخ اليوم الفعلي على جهاز المستخدم: «اليوم» / «غداً» / اسم اليوم (يغطي الأسبوع القادم تلقائياً) */
export const sessionDayLabel = (d: string | Date) =>
  isToday(d) ? "اليوم" : isTomorrow(d) ? "غداً" : dayName(d);

export const FATWA_CATEGORIES: Record<string, string> = {
  aqeedah: "عقيدة", fiqh: "فقه", muamalat: "معاملات", family: "أسرة", tajweed: "تجويد",
  salah: "صلاة", zakah: "زكاة", siyam: "صيام", hajj: "حج", taharah: "طهارة", qiraat: "قراءات", other: "أخرى",
};

const PATH_ICONS: Record<keyof typeof productRegistry.paths, IconName> = {
  quran: "quran",
  tajweed_correction: "mic",
  qiraat: "certificate",
  tajweed: "books",
  sharia: "library",
};
type PathKey = keyof typeof productRegistry.paths;
const PATH_ORDER = productRegistry.pathOrder as PathKey[];

export const PATH_META = Object.fromEntries(
  PATH_ORDER.map((key) => [
    key,
    { name: productRegistry.paths[key].label, icon: PATH_ICONS[key], desc: productRegistry.paths[key].description },
  ]),
) as Record<string, { name: string; icon: IconName; desc: string }>;
