// تبيان — يبني manifest تشفيرياً لأصول المصحف (SHA-256 لكل ملف JSON/خط)
// الغرض: تثبيت «لقطة المصدر المُراجَعة» — أي تعديل/حذف/استبدال glyph لاحقاً يكسر الفحص في verify-mushaf.mjs
// يُشغَّل بعد download-mushaf.mjs أو بعد أي إعادة تنزيل مقصودة: node scripts/build-mushaf-manifest.mjs
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = "artifacts/tabyan/public/mushaf";
const MANIFEST = "scripts/mushaf-manifest.json";
const PAGES = 604;

const hash = (buf) => createHash("sha256").update(buf).digest("hex");

const pages = {};
const fonts = {};
for (let p = 1; p <= PAGES; p++) {
  pages[p] = hash(await readFile(path.join(OUT, "pages", `${p}.json`)));
  fonts[p] = hash(await readFile(path.join(OUT, "fonts", `p${p}.woff2`)));
}

const manifest = {
  _about: "لقطة مُراجَعة من أصول مصحف تبيان QCF v2 — لا تُعدَّل يدوياً؛ أعد بناءها فقط بعد إعادة تنزيل مقصودة ومراجعة",
  sources: {
    words: "https://api.qurancdn.com/api/qdc/verses/by_page/{n} (code_v2, line_v2)",
    fonts: "https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p{n}.woff2",
    publisher: "King Fahd Glorious Quran Printing Complex — via Quran Foundation CDN",
  },
  generatedAt: new Date().toISOString(),
  pages,
  fonts,
};
await writeFile(MANIFEST, JSON.stringify(manifest, null, 0));
console.log(`manifest written: ${MANIFEST} (${PAGES} pages + ${PAGES} fonts)`);
