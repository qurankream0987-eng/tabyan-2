/** Arabic labels and dates with Latin digits, shared by every screen. */

const LOCALE = "ar-SA-u-nu-latn";

export function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" })} — ${date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" })}`;
}

/** Web formatDuration: m:ss, or h:mm:ss past an hour. */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

const SESSION_STATUS_LABELS: Record<string, string> = {
  scheduled: "قيد التأكيد",
  confirmed: "مؤكدة",
  pending: "قيد المراجعة",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
  no_show: "لم يحضر",
  // recitation sessions
  listening: "جارٍ الاستماع",
  paused: "متوقفة مؤقتًا",
  failed: "لم تكتمل",
};

export function sessionStatusLabel(status: unknown) {
  return SESSION_STATUS_LABELS[String(status)] ?? String(status ?? "");
}

export function sessionStatusTone(status: unknown): "gold" | "success" | "danger" | "muted" {
  if (status === "completed" || status === "confirmed" || status === "in_progress") return "success";
  if (status === "cancelled" || status === "no_show" || status === "failed") return "danger";
  return "gold";
}

const FATWA_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الإجابة",
  assigned: "مُسندة",
  answered: "أُجيبت",
  pending_review: "بانتظار المراجعة",
  published_public: "منشورة للعموم",
  published_private: "أُرسلت للسائل",
  published: "منشورة",
  rejected: "مرفوضة",
  cancelled: "ملغاة",
};

export function fatwaStatusLabel(status: unknown) {
  return FATWA_STATUS_LABELS[String(status)] ?? String(status ?? "");
}

/** Web StatusBadge colours: amber while waiting, blue once assigned, green when answered, gold when published, red when closed. */
export function fatwaStatusTone(status: unknown): "gold" | "success" | "danger" | "muted" | "info" | "warning" {
  if (status === "pending" || status === "pending_review") return "warning";
  if (status === "assigned") return "info";
  if (status === "answered") return "success";
  if (status === "rejected" || status === "cancelled") return "danger";
  if (String(status ?? "").startsWith("published")) return "gold";
  return "muted";
}

export const DAY_AR: Record<string, string> = { sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت" };
