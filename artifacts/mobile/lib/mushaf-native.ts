import { isLoaded, loadAsync, unloadAsync } from "expo-font";
import type { MushafPageData } from "./mushaf-types";
import { normalizeQuranText } from "./quran-normalizer";

export const QCF_PAGE_COUNT = 604;
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

interface StoredPage {
  version: string;
  page: number;
  words: Array<Omit<CanonicalQuranWord, "normalizedText">>;
}

type RequireContext = {
  keys(): string[];
  (key: string): unknown;
};

export const MUSHAF_ASSETS_ENABLED = false;

function unavailableContext(): RequireContext {
  const load = ((key: string) => {
    throw new Error(`أصول المصحف غير متاحة مؤقتًا: ${key}`);
  }) as unknown as RequireContext;
  const context = load;
  context.keys = () => [];
  return context;
}

const pageAssets = (() => {
  if (!MUSHAF_ASSETS_ENABLED) return unavailableContext();
  try {
    return require.context("../assets/mushaf/pages", false, /^\.\/\d+\.json$/) as RequireContext;
  } catch {
    return unavailableContext();
  }
})();
const canonicalAssets = (() => {
  if (!MUSHAF_ASSETS_ENABLED) return unavailableContext();
  try {
    return require.context("../assets/mushaf/quran-words/pages", false, /^\.\/\d+\.json$/) as RequireContext;
  } catch {
    return unavailableContext();
  }
})();
const fontAssets = (() => {
  if (!MUSHAF_ASSETS_ENABLED) return unavailableContext();
  try {
    return require.context("../assets/mushaf/fonts", false, /^\.\/p\d+\.ttf$/) as RequireContext;
  } catch {
    return unavailableContext();
  }
})();

const fontLoads = new Map<number, Promise<void>>();
const loadedFontPages = new Set<number>();
const pageLoads = new Map<number, Promise<MushafPageData>>();
const canonicalLoads = new Map<number, Promise<CanonicalQuranWord[]>>();

function unwrap<T>(value: unknown): T {
  if (value && typeof value === "object" && "default" in value) return (value as { default: T }).default;
  return value as T;
}

function pageKey(page: number) {
  if (!Number.isInteger(page) || page < 1 || page > QCF_PAGE_COUNT) throw new Error(`صفحة QCF غير صالحة: ${page}`);
  return String(page);
}

export function qcfFontFamily(page: number) {
  return `QCF2_p${pageKey(page)}`;
}

export function qcfFontSource(page: number) {
  return unwrap<number>(fontAssets(`./p${pageKey(page)}.ttf`));
}

export async function ensureQcfFont(page: number) {
  const family = qcfFontFamily(page);
  if (isLoaded(family)) {
    loadedFontPages.add(page);
    return;
  }
  let pending = fontLoads.get(page);
  if (!pending) {
    pending = loadAsync(family, qcfFontSource(page))
      .then(() => { loadedFontPages.add(page); })
      .finally(() => { fontLoads.delete(page); });
    fontLoads.set(page, pending);
  }
  await pending;
}

export function retainQcfFonts(currentPage: number, radius = 3) {
  for (const page of [...loadedFontPages]) {
    if (Math.abs(page - currentPage) <= radius || fontLoads.has(page)) continue;
    const family = qcfFontFamily(page);
    loadedFontPages.delete(page);
    void unloadAsync(family).catch(() => {});
  }
}

export function loadQcfPage(page: number): Promise<MushafPageData> {
  const key = pageKey(page);
  const cached = pageLoads.get(page);
  if (cached) return cached;
  const request = Promise.resolve(unwrap<MushafPageData>(pageAssets(`./${key}.json`)))
    .then((data) => {
      if (data.p !== page || !Array.isArray(data.v)) throw new Error(`بيانات صفحة QCF غير متوافقة: ${page}`);
      return data;
    })
    .catch((error) => {
      pageLoads.delete(page);
      throw error;
    });
  pageLoads.set(page, request);
  return request;
}

export function loadCanonicalWordsForPage(page: number): Promise<CanonicalQuranWord[]> {
  const key = pageKey(page);
  const cached = canonicalLoads.get(page);
  if (cached) return cached;
  const request = Promise.resolve(unwrap<StoredPage>(canonicalAssets(`./${key}.json`)))
    .then((data) => {
      if (data.version !== QURAN_TEXT_VERSION || data.page !== page || !Array.isArray(data.words)) {
        throw new Error(`بيانات كلمات القرآن غير متوافقة: ${page}`);
      }
      return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
    })
    .catch((error) => {
      canonicalLoads.delete(page);
      throw error;
    });
  canonicalLoads.set(page, request);
  return request;
}