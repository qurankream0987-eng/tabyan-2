/**
 * البحث في نص القرآن الكنسي (Part 32, 37) — نصاً أو بالتلاوة.
 *
 * - الفهرس مولّد من بيانات الكلمات الكنسية (scripts/build-quran-search-index.mjs)
 *   ومطبّع بـ normalizeQuranText نفسه؛ يُحمَّل كسولاً عند أول بحث فقط.
 * - المرشحات من فهرس مقلوب (كلمة → آيات) مع مطابقة تقريبية لتهجئات ASR، ثم
 *   تُرتَّب بمحاذاة موزونة للعبارة كاملة (تسمح بالعبور إلى الآية التالية).
 * - لا يُفحص المصحف كله لكل كلمة؛ ولا يُعرض نص ASR كأنه قرآن — النتيجة
 *   دائماً موضع كنسي (سورة/آية/صفحة) ونصه من المصحف.
 */
import { normalizeQuranText } from "./normalizer";

export type SearchRow = [verseKey: string, page: number, text: string];

export interface QuranSearchIndex {
  rows: SearchRow[];
  tokens: string[][];
  inverted: Map<string, number[]>;
  vocabulary: string[];
}

export interface QuranSearchResult {
  verseKey: string;
  page: number;
  /** 0..1 — جودة مطابقة العبارة */
  score: number;
  /** آخر آية تشملها المطابقة (قد تعبر إلى التالية) */
  endVerseKey: string;
  /** موضع أول كلمة مطابقة داخل الآية (1-based) */
  startPosition: number;
}

const PUNCTUATION = /[.,!?;:"'()[\]{}«»<>\-–—…،؛؟٪0-9٠-٩]/g;

export function queryTokens(text: string): string[] {
  return normalizeQuranText(text.replace(PUNCTUATION, " ")).split(" ").filter(Boolean);
}

export function buildSearchIndex(rows: SearchRow[]): QuranSearchIndex {
  const tokens = rows.map((row) => row[2].split(" ").filter(Boolean));
  const inverted = new Map<string, number[]>();
  tokens.forEach((list, verse) => {
    for (const token of new Set(list)) {
      const hits = inverted.get(token);
      if (hits) hits.push(verse);
      else inverted.set(token, [verse]);
    }
  });
  return { rows, tokens, inverted, vocabulary: [...inverted.keys()] };
}

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

function charDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length] / Math.max(a.length, b.length, 1);
}

function tokenCost(heard: string, expected: string, prefixOk: boolean) {
  if (heard === expected) return 0;
  if (prefixOk && heard.length >= 2 && expected.startsWith(heard)) return 0.15;
  const distance = charDistance(heard, expected);
  return distance <= 0.25 ? 0.35 + distance : 1;
}

/** كلمات المفردات القريبة إملائياً (تهجئات ASR) — تُحسب مرة لكل كلمة استعلام. */
function fuzzyVocabulary(index: QuranSearchIndex, token: string, prefixOk: boolean): string[] {
  const out: string[] = [];
  for (const word of index.vocabulary) {
    if (Math.abs(word.length - token.length) > 2 && !(prefixOk && word.startsWith(token))) continue;
    if (tokenCost(token, word, prefixOk) < 1) out.push(word);
    if (out.length > 60) break;
  }
  return out;
}

const INDEL = 0.9;

/** محاذاة شبه عامة: العبارة كلها مقابل نافذة حرة داخل الآية (+ التالية). */
function alignPhrase(query: string[], target: string[], openLast: boolean) {
  const h = query.length;
  const w = target.length;
  let previous = new Float64Array(w + 1);
  let startPrev = new Int32Array(w + 1);
  for (let j = 0; j <= w; j += 1) startPrev[j] = j;
  for (let i = 1; i <= h; i += 1) {
    const current = new Float64Array(w + 1);
    const startCur = new Int32Array(w + 1);
    current[0] = previous[0] + INDEL;
    startCur[0] = 0;
    for (let j = 1; j <= w; j += 1) {
      const diag = previous[j - 1] + tokenCost(query[i - 1], target[j - 1], openLast && i === h);
      const up = previous[j] + INDEL;
      const left = current[j - 1] + INDEL;
      if (diag <= up && diag <= left) { current[j] = diag; startCur[j] = startPrev[j - 1]; }
      else if (up <= left) { current[j] = up; startCur[j] = startPrev[j]; }
      else { current[j] = left; startCur[j] = startCur[j - 1]; }
    }
    previous = current;
    startPrev = startCur;
  }
  let best = Infinity;
  let bestEnd = 0;
  for (let j = 1; j <= w; j += 1) if (previous[j] < best) { best = previous[j]; bestEnd = j; }
  return { score: Math.max(0, 1 - best / h), start: startPrev[bestEnd], end: bestEnd };
}

export interface SearchOptions {
  limit?: number;
  /** الكلمة الأخيرة قد تكون ناقصة (كتابة جارية/تلاوة مستمرة) */
  openLast?: boolean;
  minScore?: number;
}

export function searchQuran(index: QuranSearchIndex, query: string, options: SearchOptions = {}): QuranSearchResult[] {
  const q = queryTokens(query).slice(0, 24);
  if (!q.length) return [];
  const limit = options.limit ?? 8;
  const minScore = options.minScore ?? (q.length === 1 ? 0.6 : 0.55);
  // 1) مرشحات: عدد كلمات الاستعلام المختلفة الموجودة في الآية (أو التالية لها).
  const hits = new Map<number, number>();
  q.forEach((token, i) => {
    const openLast = !!options.openLast && i === q.length - 1;
    const forms = index.inverted.has(token) && !openLast ? [token] : [token, ...fuzzyVocabulary(index, token, openLast)];
    const verses = new Set<number>();
    for (const form of forms) for (const verse of index.inverted.get(form) ?? []) verses.add(verse);
    for (const verse of verses) {
      hits.set(verse, (hits.get(verse) ?? 0) + 1);
      // عبارة تعبر حد الآية: نعطي الآية السابقة فرصة كمرشح.
      if (verse > 0) hits.set(verse - 1, (hits.get(verse - 1) ?? 0) + 0.5);
    }
  });
  const needed = Math.max(1, Math.ceil(q.length * 0.4));
  const candidates = [...hits.entries()]
    .filter(([, count]) => count >= needed)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 300);
  // 2) ترتيب دقيق بمحاذاة العبارة كاملة.
  const results: QuranSearchResult[] = [];
  for (const [verse] of candidates) {
    const own = index.tokens[verse];
    const next = index.tokens[verse + 1] ?? [];
    const sameSurah = index.rows[verse + 1]?.[0].split(":")[0] === index.rows[verse][0].split(":")[0];
    const target = sameSurah ? own.concat(next) : own;
    const alignment = alignPhrase(q, target, !!options.openLast);
    if (alignment.score < minScore || alignment.start >= own.length) continue;
    const endsInNext = alignment.end > own.length;
    results.push({
      verseKey: index.rows[verse][0],
      page: index.rows[verse][1],
      score: Math.round(alignment.score * 1000) / 1000,
      endVerseKey: endsInNext ? index.rows[verse + 1][0] : index.rows[verse][0],
      startPosition: alignment.start + 1,
    });
  }
  results.sort((a, b) => b.score - a.score || compareKeys(a.verseKey, b.verseKey));
  return results.slice(0, limit);
}

function compareKeys(a: string, b: string) {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}
