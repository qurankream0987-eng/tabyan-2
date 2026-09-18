/**
 * تبيان — تنبيهات مواقيت الصلاة
 * ميزة مستقلة تماماً: لا تلمس المصحف ولا الطلاب ولا الحلقات.
 *
 * - المواقيت تُحسب يومياً بحسب موقع المستخدم الفعلي (نفس مصدر صفحة المواقيت: aladhan)،
 *   وطريقة الحساب تُختار حسب بلد المستخدم (انظر prayer-calc-method.ts).
 * - الإشعارات تُجدول محلياً (Local Notifications عبر Notification API + Service Worker)،
 *   وتُعاد جدولتها عند تغيّر اليوم أو الموقع أو الإعدادات.
 * - إن رفض المستخدم الإذن يستمر التطبيق طبيعياً (يظهر العداد دون تنبيهات نظام).
 */

import { getCalcMethod, FALLBACK_METHOD } from "./prayer-calc-method";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_DEFS: { key: PrayerKey; label: string; apiKey: string }[] = [
  { key: "fajr",    label: "الفجر",   apiKey: "Fajr"    },
  { key: "dhuhr",   label: "الظهر",   apiKey: "Dhuhr"   },
  { key: "asr",     label: "العصر",   apiKey: "Asr"     },
  { key: "maghrib", label: "المغرب",  apiKey: "Maghrib" },
  { key: "isha",    label: "العشاء",  apiKey: "Isha"    },
];

export interface PrayerNotifSettings {
  enabled: boolean;
  prayers: Record<PrayerKey, boolean>;
}

export interface PrayerTime { key: PrayerKey; label: string; at: Date; }
export interface Coords { lat: number; lng: number; }

const SETTINGS_KEY = "tabyan_prayer_notif_v1";
const COORDS_KEY   = "tabyan_prayer_coords_v1";
const COORDS_MAX_AGE_MS = 6 * 60 * 60 * 1000; // صلاحية الموقع المخزّن: ٦ ساعات
const MAKKAH: Coords = { lat: 21.3891, lng: 39.8579 }; // احتياط عند رفض الموقع

const DEFAULT_SETTINGS: PrayerNotifSettings = {
  enabled: false,
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
};

// ── الإعدادات ────────────────────────────────────────────────────────
export function loadPrayerNotifSettings(): PrayerNotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrayerNotifSettings>;
      return {
        enabled: !!parsed.enabled,
        prayers: { ...DEFAULT_SETTINGS.prayers, ...(parsed.prayers ?? {}) },
      };
    }
  } catch { /* تجاهل التلف */ }
  return structuredClone(DEFAULT_SETTINGS);
}

export function savePrayerNotifSettings(s: PrayerNotifSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* تجاهل */ }
  void reschedulePrayerNotifications();
}

// ── إذن الإشعارات ────────────────────────────────────────────────────
export type NotifPermission = "unsupported" | "granted" | "denied" | "default";

export function getNotifPermission(): NotifPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

// ── الموقع (أقل صلاحية تكفي: تحديد لمرة واحدة، يُخزَّن مؤقتاً) ──────
/** cc = رمز البلد من reverse-geocode — يُستخدم لاختيار طريقة حساب المواقيت */
interface CachedCoords extends Coords { ts?: number; cc?: string | null; }

function loadCachedCoords(): CachedCoords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedCoords;
    if (typeof c.lat !== "number" || typeof c.lng !== "number") return null;
    if (c.ts && Date.now() - c.ts > COORDS_MAX_AGE_MS) {
      localStorage.removeItem(COORDS_KEY); // حذف الموقع المنتهي فعلياً لا مجرد تجاهله
      return null;
    }
    return c;
  } catch { return null; }
}

/** يُستدعى عند إيقاف الميزة — لا يبقى موقع دقيق مخزّناً بعد تعطيلها */
export function clearPrayerCoords(): void {
  try { localStorage.removeItem(COORDS_KEY); } catch { /* تجاهل */ }
}

export function getPrayerCoords(forceRefresh = false): Promise<Coords> {
  if (!forceRefresh) {
    const cached = loadCachedCoords();
    if (cached) return Promise.resolve(cached);
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(MAKKAH);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try { localStorage.setItem(COORDS_KEY, JSON.stringify({ ...c, ts: Date.now() })); } catch { /* تجاهل */ }
        resolve(c);
      },
      () => resolve(MAKKAH),
      { timeout: 10000, maximumAge: 30 * 60 * 1000, enableHighAccuracy: false }
    );
  });
}

// ── طريقة الحساب حسب البلد ───────────────────────────────────────────
function isMakkahFallback(c: Coords): boolean {
  return Math.abs(c.lat - MAKKAH.lat) < 0.01 && Math.abs(c.lng - MAKKAH.lng) < 0.01;
}

async function reverseCountryCode(c: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lng}&localityLanguage=ar`
    );
    const data = await res.json();
    return typeof data?.countryCode === "string" ? data.countryCode : null;
  } catch { return null; }
}

/**
 * يحدد طريقة حساب المواقيت للموقع المعطى:
 * الاحتياط المكّي ⇒ أم القرى؛ وإلا بلد الموقع المخزّن أو reverse-geocode،
 * وعند تعذّر كل ذلك ⇒ الطريقة الاحتياطية العامة.
 */
export async function getPrayerCalcMethod(coords: Coords): Promise<number> {
  if (isMakkahFallback(coords)) return getCalcMethod("SA").method;
  const cached = loadCachedCoords();
  if (
    cached &&
    Math.abs(cached.lat - coords.lat) < 0.05 &&
    Math.abs(cached.lng - coords.lng) < 0.05 &&
    cached.cc
  ) {
    return getCalcMethod(cached.cc).method;
  }
  const cc = await reverseCountryCode(coords);
  if (cc) {
    try { localStorage.setItem(COORDS_KEY, JSON.stringify({ ...coords, cc, ts: Date.now() })); } catch { /* تجاهل */ }
  }
  return getCalcMethod(cc).method;
}

// ── جلب المواقيت ─────────────────────────────────────────────────────
function parseTime(raw: string, base: Date): Date | null {
  const m = raw.trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

export async function fetchTodayPrayerTimes(coords: Coords): Promise<PrayerTime[]> {
  const unix = Math.floor(Date.now() / 1000);
  const method = await getPrayerCalcMethod(coords).catch(() => FALLBACK_METHOD);
  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${unix}?latitude=${coords.lat}&longitude=${coords.lng}&method=${method}`
  );
  const data = await res.json();
  const timings = data?.data?.timings;
  if (!timings) throw new Error("no timings");
  const now = new Date();
  const out: PrayerTime[] = [];
  for (const def of PRAYER_DEFS) {
    const at = parseTime(String(timings[def.apiKey] ?? ""), now);
    if (at) out.push({ key: def.key, label: def.label, at });
  }
  if (!out.length) throw new Error("no parseable timings");
  return out;
}

export function getNextPrayer(times: PrayerTime[], now: Date = new Date()): PrayerTime | null {
  for (const t of times) if (t.at.getTime() > now.getTime()) return t;
  return null; // فاتت كل صلوات اليوم — القادمة فجر الغد
}

/** فجر اليوم التالي — لعرض «الصلاة القادمة» بعد العشاء */
export async function fetchTomorrowFajr(coords: Coords): Promise<PrayerTime | null> {
  try {
    const unix = Math.floor(Date.now() / 1000) + 86400;
    const method = await getPrayerCalcMethod(coords).catch(() => FALLBACK_METHOD);
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${unix}?latitude=${coords.lat}&longitude=${coords.lng}&method=${method}`
    );
    const data = await res.json();
    const raw = data?.data?.timings?.Fajr;
    if (!raw) return null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const at = parseTime(String(raw), tomorrow);
    return at ? { key: "fajr", label: "الفجر", at } : null;
  } catch { return null; }
}

// ── المجدول ──────────────────────────────────────────────────────────
let timers: number[] = [];
let swReg: ServiceWorkerRegistration | null = null;
let started = false;
let generation = 0; // رقم جيل الجدولة — يمنع سباق الطلبات غير المتزامنة

async function ensureSw(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  if (swReg) return swReg;
  try {
    swReg = await navigator.serviceWorker.register(`${BASE}sw.js`);
    return swReg;
  } catch { return null; }
}

async function firePrayerNotification(key: PrayerKey, label: string): Promise<void> {
  // فحص نهائي قبل العرض مباشرة — قد يكون المستخدم أوقف الميزة أثناء انتظار Service Worker
  const cur = loadPrayerNotifSettings();
  if (!cur.enabled || !cur.prayers[key] || getNotifPermission() !== "granted") return;
  const title = `حان الآن وقت صلاة ${label}`;
  const options: NotificationOptions = {
    body: "تبيان — تنبيه مواقيت الصلاة",
    icon: `${BASE}logo.png`,
    badge: `${BASE}logo.png`,
    dir: "rtl",
    lang: "ar",
    tag: `tabyan-prayer-${label}`,
  };
  try {
    const reg = await ensureSw();
    if (reg) { await reg.showNotification(title, options); return; }
  } catch { /* سقوط إلى الإشعار المباشر */ }
  try { new Notification(title, options); } catch { /* الإشعارات غير متاحة */ }
}

function clearTimers(): void {
  for (const t of timers) window.clearTimeout(t);
  timers = [];
}

/** يعيد جدولة إشعارات اليوم وفق الإعدادات الحالية — يُستدعى عند تغيّر الإعداد/اليوم/الموقع */
export async function reschedulePrayerNotifications(): Promise<void> {
  const gen = ++generation;
  clearTimers();
  const s = loadPrayerNotifSettings();
  if (!s.enabled || getNotifPermission() !== "granted") return;

  let times: PrayerTime[];
  try {
    times = await fetchTodayPrayerTimes(await getPrayerCoords());
  } catch {
    // تعذّر الجلب (شبكة) — أعد المحاولة بعد 15 دقيقة ما لم تسبقها جدولة أحدث
    if (gen === generation) {
      timers.push(window.setTimeout(() => void reschedulePrayerNotifications(), 15 * 60 * 1000));
    }
    return;
  }
  if (gen !== generation) return; // تجاوزتها جدولة أحدث أثناء الانتظار — لا تضف مؤقتات قديمة

  const now = Date.now();
  for (const t of times) {
    if (!s.prayers[t.key]) continue;
    const delay = t.at.getTime() - now;
    if (delay <= 0) continue;
    // عند الإطلاق: أعد التحقق من الجيل والإعدادات والإذن — فقد يكون المستخدم أوقف الميزة
    timers.push(window.setTimeout(() => {
      if (gen !== generation) return;
      const cur = loadPrayerNotifSettings();
      if (!cur.enabled || !cur.prayers[t.key] || getNotifPermission() !== "granted") return;
      void firePrayerNotification(t.key, t.label);
    }, delay));
  }

  // تغيّر اليوم ⇒ أوقات جديدة: إعادة جدولة بعد منتصف الليل بقليل
  const midnight = new Date();
  midnight.setHours(24, 0, 30, 0);
  timers.push(window.setTimeout(() => void reschedulePrayerNotifications(), midnight.getTime() - now));
}

/** يُستدعى مرة واحدة عند إقلاع التطبيق */
export async function initPrayerNotifications(): Promise<void> {
  if (started) return;
  started = true;
  if (!loadPrayerNotifSettings().enabled) return;
  if (getNotifPermission() !== "granted") return;
  await ensureSw();
  void reschedulePrayerNotifications();
}
