// تبيان — تنزيل بيانات وخطوط مصحف QCF v2 (مجمع الملك فهد عبر Quran Foundation)
// المصدر: api.qurancdn.com (بيانات الكلمات code_v2/line_v2) + static.qurancdn.com (خطوط woff2 لكل صفحة)
// يُشغَّل مرة واحدة عند الإعداد: node scripts/download-mushaf.mjs — آمن لإعادة التشغيل (يتخطى الملفات السليمة)
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";

const OUT = "artifacts/tabyan/public/mushaf";
const PAGES = 604;
const API = (p) =>
  `https://api.qurancdn.com/api/qdc/verses/by_page/${p}?words=true&word_fields=code_v2,line_v2&per_page=all&fields=chapter_id,page_number,juz_number,hizb_number`;
const FONT = (p) => `https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p${p}.woff2`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "tabyan-mushaf-setup/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

// تحويل استجابة API إلى صيغة مدمجة: كلمات [position, line, type, code_v2] — type: 0=كلمة 1=خاتمة آية 2=علامة وقف
function compact(data, page) {
  const vs = data.verses;
  if (!vs?.length) throw new Error(`page ${page}: no verses`);
  return {
    p: page,
    j: vs[0].juz_number,
    h: vs[0].hizb_number ?? null,
    v: vs.map((v) => ({
      k: v.verse_key,
      n: v.verse_number,
      c: v.chapter_id,
      w: v.words.map((w) => [
        w.position,
        w.line_v2,
        w.char_type_name === "word" ? 0 : w.char_type_name === "end" ? 1 : 2,
        w.code_v2,
      ]),
    })),
  };
}

async function validJson(file) {
  try {
    const d = JSON.parse(await readFile(file, "utf8"));
    const words = d.v?.reduce((n, v) => n + v.w.length, 0) ?? 0;
    const maxLine = Math.max(0, ...d.v.flatMap((v) => v.w.map((w) => w[1])));
    return words > 0 && maxLine >= 1 && maxLine <= 15;
  } catch {
    return false;
  }
}

async function validFont(file) {
  try {
    return (await stat(file)).size > 5000;
  } catch {
    return false;
  }
}

async function processPage(page) {
  const jsonFile = path.join(OUT, "pages", `${page}.json`);
  const fontFile = path.join(OUT, "fonts", `p${page}.woff2`);
  if (!(await validJson(jsonFile))) {
    const res = await fetchRetry(API(page));
    const data = compact(await res.json(), page);
    await writeFile(jsonFile, JSON.stringify(data));
  }
  if (!(await validFont(fontFile))) {
    const res = await fetchRetry(FONT(page));
    await writeFile(fontFile, Buffer.from(await res.arrayBuffer()));
  }
}

async function main() {
  await mkdir(path.join(OUT, "pages"), { recursive: true });
  await mkdir(path.join(OUT, "fonts"), { recursive: true });
  const failures = [];
  const POOL = 10;
  let next = 1, done = 0;
  async function worker() {
    while (next <= PAGES) {
      const page = next++;
      try {
        await processPage(page);
      } catch (e) {
        failures.push({ page, error: String(e) });
      }
      if (++done % 50 === 0) console.log(`progress: ${done}/${PAGES} (failures: ${failures.length})`);
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));

  // تحقق نهائي شامل: لا صفحة مفقودة ولا ملف ناقص
  const problems = [];
  for (let p = 1; p <= PAGES; p++) {
    const jf = path.join(OUT, "pages", `${p}.json`);
    const ff = path.join(OUT, "fonts", `p${p}.woff2`);
    if (!(await validJson(jf))) problems.push(`json ${p}`);
    if (!(await validFont(ff))) problems.push(`font ${p}`);
  }
  if (failures.length) console.log("download failures:", failures);
  if (problems.length) {
    console.error(`VALIDATION FAILED (${problems.length}):`, problems.slice(0, 20));
    process.exit(1);
  }
  console.log(`OK — ${PAGES} pages + ${PAGES} fonts validated`);
}

main();
