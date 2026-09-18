import { pageOfAyah } from "../mushaf/page-index";
import { normalizeQuranText } from "./normalizer";

export interface RecitationRange {
  surahId: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
}

export const QURAN_TEXT_VERSION = "qdc-uthmani-hafs-word-text-v1";

export interface CanonicalQuranWord {
  surah: number;
  ayah: number;
  verseKey: string;
  position: number;
  page: number;
  line: number;
  displayText: string;
  normalizedText: string;
}

interface StoredWord {
  surah: number;
  ayah: number;
  verseKey: string;
  position: number;
  page: number;
  line: number;
  displayText: string;
}

interface StoredPage {
  version: string;
  page: number;
  words: StoredWord[];
}

const pageCache = new Map<number, Promise<CanonicalQuranWord[]>>();

function wordUrl(page: number) {
  const base = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/mushaf/quran-words/pages/${page}.json`;
}

async function loadPage(page: number): Promise<CanonicalQuranWord[]> {
  const existing = pageCache.get(page);
  if (existing) return existing;
  const request = fetch(wordUrl(page))
    .then(async (response) => {
      if (!response.ok) throw new Error(`تعذر تحميل نص القرآن للصفحة ${page}`);
      const data = await response.json() as StoredPage;
      if (data.version !== QURAN_TEXT_VERSION || data.page !== page || !Array.isArray(data.words)) {
        throw new Error(`بيانات كلمات القرآن للصفحة ${page} غير متوافقة`);
      }
      return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
    })
    .catch((error) => {
      pageCache.delete(page);
      throw error;
    });
  pageCache.set(page, request);
  return request;
}

/** يحمل نطاق الجلسة فقط؛ لا تبحث المطابقة القرآن كله أثناء كل delta. */
export async function loadCanonicalWordsForRange(range: RecitationRange): Promise<CanonicalQuranWord[]> {
  const firstPage = pageOfAyah(range.surahId, range.startAyah);
  const lastPage = pageOfAyah(range.surahId, range.endAyah);
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  const words = (await Promise.all(pages.map(loadPage))).flat();
  return words
    .filter((word) => word.surah === range.surahId && word.ayah >= range.startAyah && word.ayah <= range.endAyah)
    .sort((a, b) => a.ayah - b.ayah || a.position - b.position);
}

/** تحميل كلمات صفحة كاملة، بما فيها الصفحة التي تجمع نهاية سورة وبداية أخرى. */
export function loadCanonicalWordsForPage(page: number): Promise<CanonicalQuranWord[]> {
  return loadPage(page);
}

/** جلب مسبق هادئ لكلمات صفحة — يستخدمه قارئ التسميع قبل الانتقال. */
export function prefetchCanonicalWordsForPage(page: number): void {
  loadPage(page).catch(() => {});
}