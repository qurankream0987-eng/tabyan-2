/**
 * Mushaf page data, page fonts and canonical recitation words, fetched from the
 * site that serves the web Mushaf. Each page has its own QCF v2 font; Android
 * cannot load woff2, so the app uses the TTF copy of the same font set.
 */
import * as FileSystem from "expo-file-system/legacy";
import * as Font from "expo-font";
import type { CanonicalQuranWord } from "@workspace/tabyan-domain/quran-live-matcher";
import type { MushafPageData } from "@workspace/tabyan-domain/mushaf-page-data";
import { pageOfAyah } from "@workspace/tabyan-domain/mushaf-page-index";
import { buildSearchIndex, type QuranSearchIndex, type SearchRow } from "@workspace/tabyan-domain/quran-search";
import { normalizeQuranText } from "../recitation/quran-normalizer";
import { setQuranVocabulary } from "../recitation/quran-vocabulary";
import { apiOrigin } from "../trpc";

export const QURAN_TEXT_VERSION = "qdc-uthmani-hafs-word-text-v1";

/** A matcher word that also knows where it sits on the printed page. */
export interface MushafCanonicalWord extends CanonicalQuranWord {
  page: number;
  line: number;
}

interface StoredPageWords {
  version: string;
  page: number;
  words: Omit<MushafCanonicalWord, "normalizedText">[];
}

export function mushafAssetUrl(path: string) {
  // EXPO_PUBLIC_MUSHAF_ORIGIN lets a development build load the assets from a local copy.
  const origin = process.env.EXPO_PUBLIC_MUSHAF_ORIGIN ?? apiOrigin();
  return `${origin.replace(/\/+$/, "")}/mushaf/${path}`;
}

/** Caches one request per key; a failed request is forgotten so a retry refetches. */
function memoized<T>(load: (page: number) => Promise<T>) {
  const cache = new Map<number, Promise<T>>();
  return (page: number) => {
    let request = cache.get(page);
    if (!request) {
      request = load(page);
      request.catch(() => cache.delete(page));
      cache.set(page, request);
    }
    return request;
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(mushafAssetUrl(path));
  if (!response.ok) throw new Error(`Mushaf asset ${path} failed (HTTP ${response.status})`);
  return (await response.json()) as T;
}

export function pageFontFamily(page: number) {
  return `QCF2_p${page}`;
}

export const loadMushafPage = memoized((page) => fetchJson<MushafPageData>(`pages/${page}.json`));

/** The first bytes of a TrueType font, base64. */
const TRUETYPE_SIGNATURE = "AAEAAA==";
const FONT_CACHE_DIR = `${FileSystem.cacheDirectory}mushaf-fonts-qcf2/`;

/**
 * Downloads a page font and keeps it only if it really is a font. The site answers an
 * unknown path with its HTML page and status 200, and expo-font would cache that for good
 * under the URL, leaving the page drawn in a fallback font.
 */
async function pageFontFile(page: number) {
  const target = `${FONT_CACHE_DIR}p${page}.ttf`;
  if ((await FileSystem.getInfoAsync(target)).exists) return target;
  await FileSystem.makeDirectoryAsync(FONT_CACHE_DIR, { intermediates: true });
  const partial = `${target}.part`;
  const { status } = await FileSystem.downloadAsync(mushafAssetUrl(`fonts-android/p${page}.ttf`), partial);
  const signature = await FileSystem.readAsStringAsync(partial, { encoding: FileSystem.EncodingType.Base64, position: 0, length: 4 });
  if (status !== 200 || signature !== TRUETYPE_SIGNATURE) {
    await FileSystem.deleteAsync(partial, { idempotent: true });
    throw new Error(`Mushaf font for page ${page} is not a font (HTTP ${status})`);
  }
  await FileSystem.moveAsync({ from: partial, to: target });
  return target;
}

export const ensurePageFont = memoized(async (page) => {
  const family = pageFontFamily(page);
  if (!Font.isLoaded(family)) await Font.loadAsync({ [family]: { uri: await pageFontFile(page) } });
});

const loadPageWords = memoized(async (page): Promise<MushafCanonicalWord[]> => {
  const data = await fetchJson<StoredPageWords>(`quran-words/pages/${page}.json`);
  if (data.version !== QURAN_TEXT_VERSION || data.page !== page || !Array.isArray(data.words)) {
    throw new Error(`Quran words for page ${page} are not in the expected format`);
  }
  return data.words.map((word) => ({ ...word, normalizedText: normalizeQuranText(word.displayText) }));
});

/**
 * The words of a surah range, numbered exactly like the Mushaf page glyphs, so
 * matcher feedback keys (`verseKey:position`) colour the right word on the page.
 */
export async function loadRangeWords(surah: number, startAyah: number, endAyah: number) {
  const firstPage = pageOfAyah(surah, startAyah);
  const lastPage = pageOfAyah(surah, endAyah);
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  const words = (await Promise.all(pages.map(loadPageWords))).flat();
  return words
    .filter((word) => word.surah === surah && word.ayah >= startAyah && word.ayah <= endAyah)
    .sort((a, b) => a.ayah - b.ayah || a.position - b.position);
}

let searchIndex: Promise<QuranSearchIndex> | null = null;

/** The Quran search index (about 850 KB), loaded on the first search only. */
export function loadSearchIndex() {
  searchIndex ??= fetchJson<{ version: string; rows: SearchRow[] }>("quran-words/search-index.json")
    .then((data) => {
      if (data.version !== "tabyan-quran-search-v1" || !Array.isArray(data.rows)) throw new Error("Quran search index is not in the expected format");
      setQuranVocabulary(data.rows);
      return buildSearchIndex(data.rows);
    })
    .catch((error: unknown) => {
      searchIndex = null;
      throw error;
    });
  return searchIndex;
}
