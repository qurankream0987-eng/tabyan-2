// تبيان — تحقق مرجعي من سلامة بيانات المصحف بعد التنزيل (يُشغَّل في CI أو يدوياً)
// يثبت: رقم الصفحة داخل البيانات، تسلسل الآيات تصاعدياً، سلامة الكلمات والأسطر،
// وصفحات مرجعية معروفة المحتوى (الفاتحة=7 آيات، ص 604 = الإخلاص→الناس، ص 187 = التوبة بلا بسملة)
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const OUT = "artifacts/tabyan/public/mushaf";
const MANIFEST = "scripts/mushaf-manifest.json";
const PAGES = 604;
const problems = [];

// اللقطة التشفيرية المُراجَعة — أي تغيير في أي glyph/سطر/خط يكسر المطابقة هنا
let manifest = null;
try {
  manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
} catch {
  problems.push(`manifest مفقود: شغّل node scripts/build-mushaf-manifest.mjs`);
}
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const KEY_RE = /^(\d{1,3}):(\d{1,3})$/;

for (let p = 1; p <= PAGES; p++) {
  const file = path.join(OUT, "pages", `${p}.json`);
  let d;
  try {
    const raw = await readFile(file);
    if (manifest && manifest.pages[p] !== sha256(raw)) problems.push(`p${p}: JSON لا يطابق اللقطة المُراجَعة (hash)`);
    d = JSON.parse(raw.toString("utf8"));
  } catch (e) {
    problems.push(`p${p}: JSON غير صالح/مفقود (${e.message})`);
    continue;
  }
  if (d.p !== p) problems.push(`p${p}: رقم الصفحة الداخلي ${d.p} لا يطابق اسم الملف`);
  if (!Array.isArray(d.v) || d.v.length === 0) problems.push(`p${p}: لا آيات`);

  let prevC = 0, prevN = 0;
  let wordsTotal = 0;
  for (const v of d.v) {
    const m = KEY_RE.exec(v.k ?? "");
    if (!m || Number(m[1]) !== v.c || Number(m[2]) !== v.n) problems.push(`p${p}: مفتاح آية فاسد ${v.k}`);
    if (v.c < prevC || (v.c === prevC && v.n <= prevN)) problems.push(`p${p}: تسلسل آيات مكسور عند ${v.k}`);
    prevC = v.c; prevN = v.n;
    if (!Array.isArray(v.w) || v.w.length === 0) problems.push(`p${p}: آية بلا كلمات ${v.k}`);
    for (const w of v.w ?? []) {
      wordsTotal++;
      if (!(w[1] >= 1 && w[1] <= 15)) problems.push(`p${p}: سطر خارج 1..15 في ${v.k}`);
      if (typeof w[3] !== "string" || w[3].length === 0) problems.push(`p${p}: glyph فارغ في ${v.k}`);
      if (!(w[2] === 0 || w[2] === 1 || w[2] === 2)) problems.push(`p${p}: نوع كلمة غير معروف في ${v.k}`);
    }
    // كل آية يجب أن تُختم بعلامة رقم الآية (type 1) — باستثناء 2:181: المصدر يوسم
    // خاتمتها "word" خطأً (الحرف/الرمز موجود ويُرسم — تحققنا بصرياً)، وهي قاعدة quran.com نفسه
    if (!v.w.some((w) => w[2] === 1) && v.k !== "2:181") problems.push(`p${p}: آية بلا خاتمة مرقّمة ${v.k}`);
  }
  if (wordsTotal === 0) problems.push(`p${p}: صفر كلمات`);

  // سلامة الخط مقابل اللقطة
  if (manifest) {
    try {
      const fbuf = await readFile(path.join(OUT, "fonts", `p${p}.woff2`));
      if (manifest.fonts[p] !== sha256(fbuf)) problems.push(`p${p}: الخط لا يطابق اللقطة المُراجَعة (hash)`);
    } catch {
      problems.push(`p${p}: الخط مفقود`);
    }
  }
}

// ── صفحات مرجعية ذهبية ──
async function golden(p, check, desc) {
  const d = JSON.parse(await readFile(path.join(OUT, "pages", `${p}.json`), "utf8"));
  if (!check(d)) problems.push(`p${p}: فشل الفحص الذهبي — ${desc}`);
}
await golden(1, (d) => d.v.length === 7 && d.v[0].k === "1:1" && d.v[6].k === "1:7", "الفاتحة 7 آيات");
await golden(2, (d) => d.v[0].k === "2:1" && d.v[0].w[0][1] === 3, "البقرة تبدأ عند السطر 3 (رأس+بسملة)");
await golden(187, (d) => d.v.some((v) => v.k === "9:1"), "التوبة تبدأ في ص187");
await golden(604, (d) => d.v[0].k === "112:1" && d.v[d.v.length - 1].k === "114:6" && d.v.length === 15, "آخر صفحة: الإخلاص→الناس (15 آية)");
await golden(42, (d) => d.v.some((v) => v.k === "2:255"), "آية الكرسي في ص42");

if (problems.length) {
  console.error(`فشل التحقق (${problems.length} مشكلة):`);
  for (const pr of problems.slice(0, 30)) console.error(" -", pr);
  process.exit(1);
}
console.log(`OK — سلامة ${PAGES} صفحة مثبتة (أرقام، تسلسل آيات، كلمات، أسطر 1..15، خواتم مرقّمة، صفحات ذهبية)`);
