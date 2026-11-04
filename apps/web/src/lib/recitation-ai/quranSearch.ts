/**
 * Loads the Quran search index for the web reader; the search itself is shared
 * with the mobile app (@workspace/tabyan-domain/quran-search).
 */
import { buildSearchIndex, type QuranSearchIndex, type SearchRow } from "@workspace/tabyan-domain/quran-search";

export * from "@workspace/tabyan-domain/quran-search";

let indexPromise: Promise<QuranSearchIndex> | null = null;

export function loadQuranSearchIndex(): Promise<QuranSearchIndex> {
  if (!indexPromise) {
    const base = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/$/, "");
    indexPromise = fetch(`${base}/mushaf/quran-words/search-index.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذّر تحميل فهرس البحث");
        const data = await response.json() as { version: string; rows: SearchRow[] };
        if (data.version !== "tabyan-quran-search-v1" || !Array.isArray(data.rows)) throw new Error("فهرس البحث غير متوافق");
        return buildSearchIndex(data.rows);
      })
      .catch((error) => { indexPromise = null; throw error; });
  }
  return indexPromise;
}
