#!/usr/bin/env node
/**
 * download-mushaf.mjs — مولّد أصول المصحف (QCF v2، أو v1 مع --v1) — نسخة مُعاد كتابتها (استعادة M1).
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
 * وضع v1 (طبعة المدينة 1405 — المعتمد حالياً في الموقع والتطبيق):
 *   node scripts/download-mushaf.mjs --v1
 *   يكتب تحت public/mushaf/v1/ (مسارات مستقلة كي لا تختلط رموز v2 المخزّنة بخطوط v1):
 *     v1/pages/{n}.json   : الصيغة المدمجة نفسها من code_v1 و line_number
 *     v1/fonts/p{n}.woff2 : https://static.qurancdn.com/fonts/quran/hafs/v1/woff2/p{n}.woff2
 *     v1/fonts-ttf/p{n}.ttf : https://static.qurancdn.com/fonts/quran/hafs/v1/ttf/p{n}.ttf
 *       (مصدر خطوط التطبيق: node tools/scripts/build-android-mushaf-fonts.mjs --v1)
 *   الطلب يحمل mushaf=2 فتأتي الصفحات بترقيم طبعة 1405 نفسها (تختلف حدودها عن v2 في 25 صفحة:
 *   121-123، 145، 532-534، 565، 568، 570، 576، 584، 586، 588-590، 592-600)،
 *   ويرفض أي كلمة v1_page فيها لا يساوي الصفحة المطلوبة (فحص أمان).
 *   ملاحظة: line_number في صفحتي 1 و2 يبدأ من أسفل الشبكة (9..15 و10..15) — طبيعي،
 *   فصفحتا الافتتاح تُركَّبان بمواضع نسبية لا مطلقة.
 *
 * --concurrency N : عدد الصفحات المتوازية (افتراضي 6).
 *
 * بعد أي توليد شغّل دائماً: node scripts/verify-mushaf.mjs  (أو --v1)
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const V1 = args.includes("--v1");
const VERSION = V1 ? "v1" : "v2";
const MUSHAF_DIR = join(ROOT, V1 ? "public/mushaf/v1" : "public/mushaf");
const FONTS_DIR = join(MUSHAF_DIR, "fonts");
const PAGES_DIR = join(MUSHAF_DIR, "pages");
/** v1 فقط: خطوط TTF الأصلية من المصدر نفسه (يُبنى منها fonts-android للتطبيق) */
const TTF_DIR = V1 ? join(MUSHAF_DIR, "fonts-ttf") : null;
const TOTAL_PAGES = 604;
/** حقل الرمز وحقل السطر لكل إصدار في QDC */
const CODE_FIELD = V1 ? "code_v1" : "code_v2";
const LINE_FIELD = V1 ? "line_number" : "line_v2";
const WORD_FIELDS = V1 ? "code_v1,line_number,v1_page,position,char_type_name" : "code_v2,line_v2,position,char_type_name";
/** mushaf=2 = ترقيم صفحات طبعة 1405 (QCF v1) — بدونه تأتي الآيات بحدود صفحات v2 */
const MUSHAF_PARAM = V1 ? "&mushaf=2" : "";

const API_BASE = process.env.MUSHAF_API_BASE ?? "https://api.qurancdn.com/api/qdc";
const FONT_ROOT = `https://static.qurancdn.com/fonts/quran/hafs/${VERSION}`;
const FONT_BASE = process.env.MUSHAF_FONT_BASE ?? `${FONT_ROOT}/woff2`;
const TTF_BASE = `${FONT_ROOT}/ttf`;
const concurrencyArg = args.find((a) => a.startsWith("--concurrency"));
const CONCURRENCY = concurrencyArg
  ? Number(concurrencyArg.includes("=") ? concurrencyArg.split("=")[1] : args[args.indexOf(concurrencyArg) + 1])
  : 6;
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

/** يحوّل استجابة QDC إلى الصيغة المدمجة — نقل حرفي، صفر تعديل على code_v2 / code_v1 */
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
          const code = w[CODE_FIELD];
          const line = w[LINE_FIELD];
          if (typeof code !== "string" || !code) throw new Error(`صفحة ${pageNum} ${v.verse_key}: ${CODE_FIELD} مفقود`);
          if (typeof line !== "number") throw new Error(`صفحة ${pageNum} ${v.verse_key}: ${LINE_FIELD} مفقود`);
          // حدود صفحات v1 يجب أن تطابق صفحات v2 تماماً — وإلا يتوقف التوليد
          if (V1 && w.v1_page !== pageNum) throw new Error(`صفحة ${pageNum} ${v.verse_key}:${w.position}: v1_page=${w.v1_page} — حدود الصفحة تحركت`);
          return [w.position, line, wordType(w.char_type_name), code];
        }),
      };
    }),
  };
}

async function main() {
  await mkdir(FONTS_DIR, { recursive: true });
  await mkdir(PAGES_DIR, { recursive: true });
  if (TTF_DIR) await mkdir(TTF_DIR, { recursive: true });
  let dlFonts = 0, dlPages = 0, skipped = 0, done = 0;
  for (const page of PAGES) {
    if (page < 1 || page > TOTAL_PAGES || !Number.isInteger(page)) throw new Error(`صفحة خارج النطاق: ${page}`);
  }

  async function processPage(page) {
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

    if (TTF_DIR) {
      const ttfPath = join(TTF_DIR, `p${page}.ttf`);
      if (!FORCE && (await exists(ttfPath))) skipped++;
      else {
        const res = await fetchRetry(`${TTF_BASE}/p${page}.ttf`);
        const buf = Buffer.from(await res.arrayBuffer());
        const sig = buf.readUInt32BE(0);
        if (sig !== 0x00010000 && sig !== 0x74727565) throw new Error(`صفحة ${page}: الملف ليس TTF`);
        await writeFile(ttfPath, buf);
        dlFonts++;
      }
    }

    if (!FORCE && (await exists(jsonPath))) skipped++;
    else {
      const url = `${API_BASE}/verses/by_page/${page}?words=true&per_page=all&fields=juz_number,hizb_number&word_fields=${WORD_FIELDS}${MUSHAF_PARAM}`;
      const res = await fetchRetry(url);
      const data = compactPage(page, await res.json());
      await writeFile(jsonPath, JSON.stringify(data));
      dlPages++;
    }
    if (++done % 50 === 0) console.log(`… ${done}/${PAGES.length} صفحة`);
  }

  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    while (next < PAGES.length) await processPage(PAGES[next++]);
  }));
  console.log(`تم (${VERSION}): خطوط منزّلة ${dlFonts} · صفحات JSON ${dlPages} · متخطّى (موجود) ${skipped}`);
  console.log(`شغّل الآن: node scripts/verify-mushaf.mjs${V1 ? " --v1" : ""}`);
}

main().catch((e) => {
  console.error("فشل:", e.message);
  process.exit(1);
});
