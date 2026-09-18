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

/* ── حساب ملاءمة صفحة المصحف للشاشة (P0 geometry) ────────────────────────
   ★ سياسة معتمدة رسمياً بقرار المستخدم (P0 STOP → VERDICT → قرار A):
     MOBILE PORTRAIT = MOBILE FILL MODE — سطح قراءة QCF متجاوب، وليس
     ورقة مطبوعة مصغّرة. ممنوع إعادة فرض نسبة 622/917 على الهاتف العمودي؛
     أي agent/مراجع آلي يعكس هذا يخالف قراراً معتمداً.
     الهاتف العمودي (< 768px): العرض يملأ الشاشة بهامش صغير، والارتفاع يملأ
     مساحة القراءة بين الشريطين العائمين — الـ15 سطراً تتوزع عمودياً (rowH
     يتنفس) بينما حجم الخط يبقى مشتقاً من العرض وحده: لا تشويه للحروف.
     المكتبي/الأفقي (≥ 768px): النسبة المطبوعة 622/917 محفوظة مع سقف عرض. */
export const PAGE_SIDE_MARGIN = 10;
export const DESKTOP_MIN_W = 768;
export const DESKTOP_MAX_PAGE_W = 560;

export interface MushafPageFit {
  w: number;
  h: number;
  /** fill = هاتف عمودي (ارتفاع كامل) · aspect = نسبة مطبوعة محفوظة (مكتبي/أفقي) */
  mode: "fill" | "aspect";
}

export function computeMushafPageFit(boxW: number, boxH: number): MushafPageFit {
  if (boxW <= 0 || boxH <= 0) return { w: 0, h: 0, mode: "aspect" };
  const availW = boxW - PAGE_SIDE_MARGIN * 2;
  if (availW <= 0) return { w: 0, h: 0, mode: "aspect" };
  if (boxW < DESKTOP_MIN_W) {
    // MOBILE FILL MODE (قرار معتمد): عرض كامل + ارتفاع يملأ مساحة القراءة
    return { w: availW, h: boxH, mode: "fill" };
  }
  // مكتبي/أفقي: النسبة المطبوعة + سقف عرض
  const w = Math.min(availW, boxH * PAGE_ASPECT, DESKTOP_MAX_PAGE_W);
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
