/**
 * تحميل بيانات صفحات المصحف — JSON محلي لكل صفحة (public/mushaf/pages) مع:
 * - ذاكرة مؤقتة في الذاكرة (لا يتكرر الطلب داخل الجلسة)
 * - Cache API للعودة السريعة والصمود مع ضعف الشبكة
 * - جلب مسبق للصفحات المجاورة (تقليب بلا وميض أبيض)
 * لا يُحمَّل أكثر من صفحة وما حولها — ممنوع جلب الـ604 دفعة واحدة.
 */
import type { MushafPageData } from "./types";

export const TOTAL_PAGES = 604;
/** نسبة عرض/ارتفاع صفحة الطبعة المدنية */
export const PAGE_ASPECT = 622 / 917;

/** Phones fit to available width and scroll vertically; wider screens also fit by height. */
export const PAGE_SIDE_MARGIN = 4;
export const DESKTOP_MIN_W = 768;
export const DESKTOP_MAX_PAGE_W = 720;
export const SHORT_LANDSCAPE_MAX_W = 1024;
export const SHORT_LANDSCAPE_MAX_H = 500;
export const PAGE_VERTICAL_MARGIN = 0;
/** Narrow reading stages have 8px of CSS padding at both the top and bottom. */
export const NARROW_STAGE_PADDING = 8;

export interface MushafPageFit {
  w: number;
  h: number;
  mode: "aspect";
}

export function computeMushafPageFit(boxW: number, boxH: number): MushafPageFit {
  if (boxW <= 16 || boxH <= 16) {
    return { w: 0, h: 0, mode: "aspect" };
  }
  const available = Math.max(0, boxW - PAGE_SIDE_MARGIN * 2);
  // Phones (including wide, short landscape viewports) use available width and scroll vertically.
  const phoneViewport = boxW < DESKTOP_MIN_W
    || (boxW < SHORT_LANDSCAPE_MAX_W && boxH < SHORT_LANDSCAPE_MAX_H);
  if (phoneViewport) {
    return { w: available, h: available / PAGE_ASPECT, mode: "aspect" };
  }
  const availableHeight = Math.max(0, boxH - PAGE_VERTICAL_MARGIN * 2);
  if (availableHeight === 0) return { w: 0, h: 0, mode: "aspect" };
  const w = Math.min(available, availableHeight * PAGE_ASPECT, DESKTOP_MAX_PAGE_W);
  return { w, h: w / PAGE_ASPECT, mode: "aspect" };
}

const CACHE_NAME = "tabyan-mushaf-v2";
const LEGACY_CACHES = ["tabyan-mushaf-pages-v1"]; // ذاكرة صور PNG القديمة — تُمحى مرة واحدة

const mem = new Map<number, Promise<MushafPageData>>();

function pageUrl(page: number): string {
  return `${import.meta.env.BASE_URL}mushaf/pages/${page}.json`;
}

async function fetchPage(page: number): Promise<MushafPageData> {
  const url = pageUrl(page);
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return (await hit.json()) as MushafPageData;
  } catch {
    /* Cache API قد يكون غير متاح — نكمل بالشبكة */
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`تعذر تحميل الصفحة ${page} (HTTP ${res.status})`);
  const clone = res.clone();
  const data = (await res.json()) as MushafPageData;
  cache?.put(url, clone).catch(() => {});
  return data;
}

/** يحمّل صفحة (مصداقية 1..604) — الوعد مخزّن، والفشل يُنسى كي تعمل إعادة المحاولة */
export function loadPage(page: number): Promise<MushafPageData> {
  if (page < 1 || page > TOTAL_PAGES) return Promise.reject(new Error(`صفحة خارج النطاق: ${page}`));
  let p = mem.get(page);
  if (!p) {
    p = fetchPage(page);
    p.catch(() => mem.delete(page));
    mem.set(page, p);
  }
  return p;
}

/** جلب مسبق هادئ للصفحات المجاورة — الأخطاء تُبتلع عمداً (مجرد تحسين) */
export function prefetchAround(page: number): void {
  for (const n of [page + 1, page - 1, page + 2]) {
    if (n >= 1 && n <= TOTAL_PAGES) loadPage(n).catch(() => {});
  }
}

/** عدد الصفحات المحفوظة في ذاكرة الجهاز (لمؤشر الفهرس) */
export async function cachedPageCount(): Promise<number> {
  try {
    const c = await caches.open(CACHE_NAME);
    const keys = await c.keys();
    return keys.filter((k) => k.url.includes("/mushaf/pages/")).length;
  } catch {
    return 0;
  }
}

/** تفريغ ذاكرة صفحات المصحف من الجهاز */
export async function clearMushafCache(): Promise<void> {
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* تجاهُل */
  }
}

/** إزالة ذاكرة صور PNG القديمة (النظام السابق) — تُستدعى مرة واحدة عند فتح صفحة المصحف */
export function purgeLegacyMushafCaches(): void {
  for (const name of LEGACY_CACHES) caches.delete(name).catch(() => {});
}
