/**
 * يولّد فهرس البحث القرآني من بيانات الكلمات الكنسية (public/mushaf/quran-words/pages).
 * لا يغيّر أي نص: يطبّق normalizeQuranText نفسه المستخدم في المطابقة، ويحفظ
 * لكل آية: [verseKey, page, النص المطبّع]. العرض يستعمل displayText الأصلي من الصفحات.
 *
 * التشغيل: node scripts/build-quran-search-index.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQuranText } from "../src/lib/recitation-ai/normalizer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = resolve(root, "public/mushaf/quran-words/pages");
const verses = new Map();
for (let page = 1; page <= 604; page += 1) {
  const data = JSON.parse(readFileSync(resolve(pagesDir, `${page}.json`), "utf8"));
  if (data.version !== "qdc-uthmani-hafs-word-text-v1") throw new Error(`unexpected version on page ${page}`);
  for (const word of data.words) {
    let entry = verses.get(word.verseKey);
    if (!entry) {
      entry = { verseKey: word.verseKey, page: word.page, surah: word.surah, ayah: word.ayah, words: [] };
      verses.set(word.verseKey, entry);
    }
    entry.words.push([word.position, normalizeQuranText(word.displayText)]);
  }
}
const ordered = [...verses.values()].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
const rows = ordered.map((v) => [v.verseKey, v.page, v.words.sort((a, b) => a[0] - b[0]).map((w) => w[1]).join(" ")]);
const body = JSON.stringify(rows);
const out = {
  version: "tabyan-quran-search-v1",
  source: "qdc-uthmani-hafs-word-text-v1",
  normalizer: "normalizeQuranText",
  verses: rows.length,
  sha256: createHash("sha256").update(body).digest("hex"),
  rows,
};
writeFileSync(resolve(root, "public/mushaf/quran-words/search-index.json"), JSON.stringify(out));
console.log(`verses=${rows.length} bytes=${JSON.stringify(out).length}`);
