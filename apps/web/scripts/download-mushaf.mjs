#!/usr/bin/env node
/**
 * download-mushaf.mjs — مولّد أصول المصحف (QCF v2) — نسخة مُعاد كتابتها (استعادة M1).
 *
 * يولّد لكل صفحة (1..604):
 *   - public/mushaf/fonts/p{n}.woff2  : خط QCF v2 الخاص بالصفحة (يُنزَّل كما هو، بلا أي معالجة)
 *   - public/mushaf/pages/{n}.json    : بيانات الكلمات المدمجة {p,j,h,v:[{k,n,c,w:[[pos,line,type,code]]}]}
 *
 * قاعدة DATA PRESERVATION FIRST:
 *   - لا يولّد ولا يعدّل أي glyph — قيمة `code` تُنقل حرفياً من حقل code_v2 الرسمي (QDC).
 *   - لا يكتب فوق ملف موجود إلا مع --force (الأصول الحالية 604+604 مرجع مجمّد).
 *
 * الاستخدام:
 *   node scripts/download-mushaf.mjs                 # يكمل الناقص فقط (آمن — لا يمس الموجود)
 *   node scripts/download-mushaf.mjs --pages 1,187   # صفحات محددة
 *   node scripts/download-mushaf.mjs --force         # إعادة توليد (خطر — شغّل verify بعدها وقارن git diff)
 *
 * المصادر (QDC — quran.com API v4 / qurancdn):
 *   JSON : https://api.qurancdn.com/api/qdc/verses/by_page/{n}?words=true&per_page=all
 *          &fields=juz_number,hizb_number&word_fields=code_v2,line_v2,position,char_type_name
 *   Fonts: https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p{n}.woff2
 *
 * بعد أي توليد شغّل دائماً: node scripts/verify-mushaf.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS_DIR = join(ROOT, "public/mushaf/fonts");
const PAGES_DIR = join(ROOT, "public/mushaf/pages");
const TOTAL_PAGES = 604;

const API_BASE = process.env.MUSHAF_API_BASE ?? "https://api.qurancdn.com/api/qdc";
const FONT_BASE = process.env.MUSHAF_FONT_BASE ?? "https://static.qurancdn.com/fonts/quran/hafs/v2/woff2";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const pagesArg = args.find((a) => a.startsWith("--pages"));
const PAGES = pagesArg
  ? (pagesArg.includes("=") ? pagesArg.split("=")[1] : args[args.indexOf(pagesArg) + 1])
      .split(",")
      .map((s) => Number(s.trim()))
  : Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

const exists = (p) => access(p).then(() => true, () => false);

async function fetchRetry(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} — ${url}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
  throw lastErr;
}

/** char_type_name → type المدمج: word=0 · end (خاتمة آية)=1 · غيرهما (علامات وقف)=2 */
function wordType(charType) {
  if (charType === "word") return 0;
  if (charType === "end") return 1;
  return 2;
}

/** يحوّل استجابة QDC إلى الصيغة المدمجة — نقل حرفي، صفر تعديل على code_v2 */
function compactPage(pageNum, apiJson) {
  const verses = apiJson.verses;
  if (!Array.isArray(verses) || verses.length === 0) throw new Error(`صفحة ${pageNum}: بلا آيات`);
  const first = verses[0];
  return {
    p: pageNum,
    j: first.juz_number,
    h: first.hizb_number ?? null,
    v: verses.map((v) => {
      const [c, n] = v.verse_key.split(":").map(Number);
      return {
        k: v.verse_key,
        n,
        c,
        w: v.words.map((w) => {
          if (typeof w.code_v2 !== "string" || !w.code_v2) throw new Error(`صفحة ${pageNum} ${v.verse_key}: code_v2 مفقود`);
          if (typeof w.line_v2 !== "number") throw new Error(`صفحة ${pageNum} ${v.verse_key}: line_v2 مفقود`);
          return [w.position, w.line_v2, wordType(w.char_type_name), w.code_v2];
        }),
      };
    }),
  };
}

async function main() {
  await mkdir(FONTS_DIR, { recursive: true });
  await mkdir(PAGES_DIR, { recursive: true });
  let dlFonts = 0, dlPages = 0, skipped = 0;

  for (const page of PAGES) {
    if (page < 1 || page > TOTAL_PAGES || !Number.isInteger(page)) throw new Error(`صفحة خارج النطاق: ${page}`);
    const fontPath = join(FONTS_DIR, `p${page}.woff2`);
    const jsonPath = join(PAGES_DIR, `${page}.json`);

    if (!FORCE && (await exists(fontPath))) skipped++;
    else {
      const res = await fetchRetry(`${FONT_BASE}/p${page}.woff2`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error(`صفحة ${page}: الملف ليس WOFF2`);
      await writeFile(fontPath, buf);
      dlFonts++;
    }

    if (!FORCE && (await exists(jsonPath))) skipped++;
    else {
      const url = `${API_BASE}/verses/by_page/${page}?words=true&per_page=all&fields=juz_number,hizb_number&word_fields=code_v2,line_v2,position,char_type_name`;
      const res = await fetchRetry(url);
      const data = compactPage(page, await res.json());
      await writeFile(jsonPath, JSON.stringify(data));
      dlPages++;
    }
    if (page % 50 === 0) console.log(`… حتى الصفحة ${page}`);
  }
  console.log(`تم: خطوط منزّلة ${dlFonts} · صفحات JSON ${dlPages} · متخطّى (موجود) ${skipped}`);
  console.log("شغّل الآن: node scripts/verify-mushaf.mjs");
}

main().catch((e) => {
  console.error("فشل:", e.message);
  process.exit(1);
});
