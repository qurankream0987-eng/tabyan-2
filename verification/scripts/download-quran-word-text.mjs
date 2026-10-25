/**
 * Build-time snapshot of Hafs/Uthmani word text aligned with the existing QCF
 * page corpus. This is intentionally never imported by the browser.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

const PAGE_COUNT = 604;
const OUT = "artifacts/tabyan/public/mushaf/quran-words";
const API = (page) =>
  `https://api.qurancdn.com/api/qdc/verses/by_page/${page}?words=true&word_fields=text_uthmani,code_v2,line_v2&per_page=all&fields=chapter_id,page_number,juz_number,hizb_number`;
const VERSION = "qdc-uthmani-hafs-word-text-v1";

async function getJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "tabyan-quran-text-snapshot/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function compact(payload, page) {
  if (!Array.isArray(payload.verses) || payload.verses.length === 0) {
    throw new Error(`page ${page}: no verses`);
  }
  const words = [];
  for (const verse of payload.verses) {
    for (const word of verse.words ?? []) {
      if (word.char_type_name !== "word") continue;
      if (typeof word.text_uthmani !== "string" || typeof word.position !== "number" || typeof word.line_v2 !== "number") {
        throw new Error(`page ${page}: incomplete word ${verse.verse_key}:${word.position}`);
      }
      words.push({
        verseKey: verse.verse_key,
        surah: verse.chapter_id,
        ayah: verse.verse_number,
        position: word.position,
        page,
        line: word.line_v2,
        displayText: word.text_uthmani,
      });
    }
  }
  if (words.length === 0) throw new Error(`page ${page}: no word tokens`);
  return { version: VERSION, page, words };
}

async function sha256(file) {
  return crypto.createHash("sha256").update(await readFile(file)).digest("hex");
}

await mkdir(`${OUT}/pages`, { recursive: true });
const manifest = {
  version: VERSION,
  source: "Quran Foundation QDC",
  endpoint: "https://api.qurancdn.com/api/qdc/verses/by_page/{page}",
  query: "words=true&word_fields=text_uthmani,code_v2,line_v2&per_page=all&fields=chapter_id,page_number,juz_number,hizb_number",
  recitation: "Hafs an Asim",
  pages: {},
};

let next = 1;
const failures = [];
async function worker() {
  while (next <= PAGE_COUNT) {
    const page = next++;
    const file = `${OUT}/pages/${page}.json`;
    try {
      const data = compact(await getJson(API(page)), page);
      await writeFile(file, JSON.stringify(data));
      manifest.pages[page] = { words: data.words.length, sha256: await sha256(file) };
    } catch (error) {
      failures.push({ page, error: String(error) });
    }
    if (page % 50 === 0) console.log(`quran word text: ${page}/${PAGE_COUNT}`);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
if (failures.length) {
  throw new Error(`Failed pages: ${JSON.stringify(failures)}`);
}
manifest.pageCount = Object.keys(manifest.pages).length;
manifest.totalWords = Object.values(manifest.pages).reduce((sum, page) => sum + page.words, 0);
await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${manifest.pageCount} pages / ${manifest.totalWords} words (${VERSION})`);