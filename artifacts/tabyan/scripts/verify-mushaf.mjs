#!/usr/bin/env node
/**
 * verify-mushaf.mjs — التحقق الآلي من أصول المصحف (QCF v2) — نسخة مُعاد كتابتها (استعادة M1).
 *
 * يفحص (قراءة فقط — لا يعدّل أي ملف):
 *   1) الاكتمال: 604 خط woff2 + 604 ملف JSON.
 *   2) سلامة الخطوط: توقيع wOF2 + حجم معقول (20KB..250KB — الفعلي ~40..180KB).
 *   3) مخطط JSON: {p,j,h,v[]} · كل كلمة [pos:int≥1, line:1..15, type:0|1|2, code:string≠""] ·
 *      p يطابق اسم الملف · الآيات بمفاتيح صحيحة · لا JSON فارغ.
 *   4) الصفحات الذهبية (الحالات الخاصة المثبتة):
 *      - ص1  : الفاتحة كاملة 1:1..1:7، البسملة آية مرقّمة (1:1 تنتهي بخاتمة type=1)، الأسطر 2..8.
 *      - ص2  : تبدأ بـ 2:1 (رأس البقرة + بسملة يحجزان سطرين قبل أول كلمة).
 *      - ص187: تبدأ بـ 9:1 (التوبة بلا بسملة — أول سطر كلمات هو 2، السطر 1 لرأس السورة فقط).
 *      - ص604: تنتهي بـ 114:6 وخاتمتها type=1 على السطر 15.
 *      - 2:181 (ص27): خاتمتها موسومة type=0 في بيانات QDC نفسها — quirk موثّق، لا "يُصلَّح".
 *   5) (اختياري) خطوط TTF المحوّلة إن وُجدت: توقيع sfnt (0x00010000).
 *
 * الاستخدام: node scripts/verify-mushaf.mjs   (خرج 0 = سليم، ≠0 = فشل مع تقرير)
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS_DIR = join(ROOT, "public/mushaf/fonts");
const PAGES_DIR = join(ROOT, "public/mushaf/pages");
const TTF_DIR = join(ROOT, "public/mushaf/fonts-ttf");
const TOTAL = 604;

const errors = [];
const err = (m) => errors.push(m);

async function verifyFonts() {
  const files = new Set(await readdir(FONTS_DIR));
  for (let p = 1; p <= TOTAL; p++) {
    const name = `p${p}.woff2`;
    if (!files.has(name)) { err(`خط مفقود: ${name}`); continue; }
    const path = join(FONTS_DIR, name);
    const s = await stat(path);
    if (s.size < 20_000 || s.size > 250_000) err(`حجم شاذ ${name}: ${s.size}B`);
    const head = (await readFile(path)).subarray(0, 4).toString("latin1");
    if (head !== "wOF2") err(`توقيع غير صحيح ${name}: ${JSON.stringify(head)}`);
  }
  console.log(`✔ خطوط woff2: ${files.size} ملف مفحوص`);
}

async function loadPage(p) {
  return JSON.parse(await readFile(join(PAGES_DIR, `${p}.json`), "utf8"));
}

async function verifyPages() {
  for (let p = 1; p <= TOTAL; p++) {
    let d;
    try { d = await loadPage(p); } catch (e) { err(`JSON ${p}: ${e.message}`); continue; }
    if (d.p !== p) err(`JSON ${p}: الحقل p=${d.p} لا يطابق اسم الملف`);
    if (!Number.isInteger(d.j) || d.j < 1 || d.j > 30) err(`JSON ${p}: جزء غير صالح ${d.j}`);
    if (!Array.isArray(d.v) || d.v.length === 0) { err(`JSON ${p}: بلا آيات`); continue; }
    for (const v of d.v) {
      if (!/^\d+:\d+$/.test(v.k)) err(`JSON ${p}: مفتاح آية غير صالح ${v.k}`);
      const [c, n] = v.k.split(":").map(Number);
      if (v.c !== c || v.n !== n) err(`JSON ${p} ${v.k}: c/n لا يطابقان المفتاح`);
      if (!Array.isArray(v.w) || v.w.length === 0) { err(`JSON ${p} ${v.k}: بلا كلمات`); continue; }
      for (const w of v.w) {
        if (!Array.isArray(w) || w.length !== 4) { err(`JSON ${p} ${v.k}: كلمة غير رباعية`); continue; }
        const [pos, line, type, code] = w;
        if (!Number.isInteger(pos) || pos < 1) err(`JSON ${p} ${v.k}: position غير صالح ${pos}`);
        if (!Number.isInteger(line) || line < 1 || line > 15) err(`JSON ${p} ${v.k}: line خارج 1..15: ${line}`);
        if (![0, 1, 2].includes(type)) err(`JSON ${p} ${v.k}: type غير معروف ${type}`);
        if (typeof code !== "string" || code.length === 0) err(`JSON ${p} ${v.k}: code فارغ`);
      }
    }
  }
  console.log(`✔ صفحات JSON: ${TOTAL} ملف مفحوص`);
}

async function verifyGolden() {
  // ص1 — الفاتحة: بسملتها آية مرقّمة (لا سطر بسملة مستقل)
  const p1 = await loadPage(1);
  const keys1 = p1.v.map((v) => v.k);
  if (JSON.stringify(keys1) !== JSON.stringify(["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"]))
    err(`ذهبية ص1: آيات الفاتحة ناقصة/زائدة: ${keys1}`);
  const basmalah = p1.v[0];
  if (basmalah && basmalah.w[basmalah.w.length - 1][2] !== 1)
    err("ذهبية ص1: 1:1 (البسملة المرقّمة) لا تنتهي بخاتمة type=1");
  const lines1 = [...new Set(p1.v.flatMap((v) => v.w.map((w) => w[1])))].sort((a, b) => a - b);
  if (lines1[0] !== 2) err(`ذهبية ص1: أول سطر كلمات ${lines1[0]} — المتوقع 2 (السطر 1 لرأس السورة)`);

  // ص2 — بداية البقرة: رأس سورة + بسملة قبل أول كلمة
  const p2 = await loadPage(2);
  if (p2.v[0].k !== "2:1") err(`ذهبية ص2: أول آية ${p2.v[0].k} — المتوقع 2:1`);
  if (p2.v[0].w[0][1] < 3) err(`ذهبية ص2: أول سطر كلمات ${p2.v[0].w[0][1]} — يجب ≥3 (رأس+بسملة)`);

  // ص187 — التوبة بلا بسملة: سطر محجوز واحد فقط
  const p187 = await loadPage(187);
  if (p187.v[0].k !== "9:1") err(`ذهبية ص187: أول آية ${p187.v[0].k} — المتوقع 9:1`);
  if (p187.v[0].w[0][1] !== 2) err(`ذهبية ص187: أول سطر كلمات ${p187.v[0].w[0][1]} — المتوقع 2 (بلا بسملة)`);

  // ص604 — خاتمة المصحف
  const p604 = await loadPage(604);
  const last = p604.v[p604.v.length - 1];
  if (last.k !== "114:6") err(`ذهبية ص604: آخر آية ${last.k} — المتوقع 114:6`);
  const lastW = last.w[last.w.length - 1];
  if (lastW[2] !== 1 || lastW[1] !== 15) err(`ذهبية ص604: خاتمة 114:6 ليست type=1 على السطر 15`);

  // 2:181 (ص27) — quirk مصدره QDC: الخاتمة موسومة type=0 — يجب أن تبقى كما هي (لا "إصلاح")
  const p27 = await loadPage(27);
  const v181 = p27.v.find((v) => v.k === "2:181");
  if (!v181) err("ذهبية ص27: 2:181 غير موجودة");
  else if (v181.w.some((w) => w[2] === 1)) err("ذهبية ص27: 2:181 صارت تحوي type=1 — الـquirk الموثق تغيّر (تحقق يدوياً)");

  console.log("✔ الصفحات الذهبية: 1 · 2 · 187 · 604 · quirk 2:181");
}

async function verifyTtf() {
  let files;
  try { files = (await readdir(TTF_DIR)).filter((f) => f.endsWith(".ttf")); } catch { 
    console.log("ℹ لا مجلد fonts-ttf بعد — تخطي فحص TTF (يولَّد بـ scripts/convert-mushaf-fonts.py)");
    return;
  }
  for (const f of files) {
    const head = (await readFile(join(TTF_DIR, f))).readUInt32BE(0);
    if (head !== 0x00010000 && head !== 0x74727565) err(`TTF غير صالح: ${f}`);
  }
  console.log(`✔ خطوط TTF محوّلة: ${files.length} ملف (${files.map((f) => f.replace(/\.ttf$/, "")).sort().join("، ") || "لا شيء"})`);
}

await verifyFonts();
await verifyPages();
await verifyGolden();
await verifyTtf();

if (errors.length) {
  console.error(`\n✘ فشل التحقق — ${errors.length} خطأ:`);
  for (const e of errors.slice(0, 50)) console.error("  -", e);
  process.exit(1);
}
console.log("\n✔ جميع فحوص أصول المصحف ناجحة");
