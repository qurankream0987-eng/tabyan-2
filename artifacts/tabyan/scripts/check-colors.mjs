#!/usr/bin/env node
/**
 * check-colors.mjs — حارس ألوان Dark Mode لـ Tabyan
 *
 * يفحص مصادر artifacts/tabyan/src عن:
 *  1) فئات Tailwind تستخدم لوناً مخصصاً غير مسجّل في @theme inline مع
 *     modifier فعّال (dark: / focus: / hover: / opacity /N).
 *  2) قيم hex جامدة (#RRGGBB أو #RGB) داخل className — خارج مجلد mushaf
 *     وخارج مجلد components/ui (ملفات shadcn المولّدة).
 *
 * الاستخدام:  node scripts/check-colors.mjs [--ci]
 *   --ci  يُوقف بـ exit 1 عند وجود مشاكل (مناسب لـ CI).
 *
 * لإسكات سطر بعينه: أضف التعليق  // check-colors-ignore  في نهايته.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

// ── إعداد المسارات ────────────────────────────────────────────────────────────
const ROOT     = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SRC_DIR  = join(ROOT, "src");
const CSS_FILE = join(SRC_DIR, "index.css");
const CI_MODE  = process.argv.includes("--ci");

// ── ألوان Tailwind المدمجة (دائماً مقبولة مع أرقامها 50-950) ─────────────────
const TAILWIND_BUILTIN_BASES = new Set([
  "slate","gray","zinc","neutral","stone",
  "red","orange","amber","yellow","lime","green","emerald","teal",
  "cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose",
  "black","white","transparent","current","inherit",
]);
const TAILWIND_SHADES = new Set([
  "50","100","150","200","250","300","350","400","450",
  "500","550","600","650","700","750","800","850","900","950",
]);

/**
 * هل اسم اللون ينتمي إلى لوحة Tailwind المدمجة؟
 * يتعامل مع: red / red-500 / slate-900 / white / black …
 */
function isTailwindBuiltin(colorName) {
  if (TAILWIND_BUILTIN_BASES.has(colorName)) return true;
  const lastDash = colorName.lastIndexOf("-");
  if (lastDash === -1) return false;
  const base  = colorName.slice(0, lastDash);
  const shade = colorName.slice(lastDash + 1);
  return TAILWIND_BUILTIN_BASES.has(base) && TAILWIND_SHADES.has(shade);
}

// ── استخراج الألوان المسجّلة من @theme inline في index.css ───────────────────
function extractRegisteredColors(cssPath) {
  const css = readFileSync(cssPath, "utf8");
  const themeMatch = css.match(/@theme\s+inline\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!themeMatch) {
    console.error("❌ لم يُعثر على كتلة @theme inline في index.css");
    process.exit(1);
  }
  const block  = themeMatch[1];
  const colors = new Set();
  for (const m of block.matchAll(/--color-([\w-]+)\s*:/g)) {
    colors.add(m[1]);
  }
  return colors;
}

// ── بناء قائمة ملفات TSX/TS بشكل تعاودي ──────────────────────────────────────
function collectFiles(dir, exts = [".tsx", ".ts", ".jsx", ".js"]) {
  const files = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) { walk(full); continue; }
      if (exts.includes(extname(full))) files.push(full);
    }
  }
  walk(dir);
  return files;
}

// ── الألوان المسجّلة في @theme ────────────────────────────────────────────────
const REGISTERED = extractRegisteredColors(CSS_FILE);

// ── مجموعة بادئات فئات الألوان في Tailwind ───────────────────────────────────
const COLOR_PREFIXES = [
  "bg","text","border","from","to","via","ring","fill","stroke",
  "accent","caret","divide","outline","decoration","placeholder",
  "inset-ring","shadow","ring-offset",
];
const PREFIX_ALT = COLOR_PREFIXES.map(p => p.replace(/-/g, "\\-")).join("|");

// modifiers التي تجعل الفئة "نشطة" وتستوجب الفحص
const RISKY_MODIFIER_RE = /^(?:dark|hover|focus|focus-within|focus-visible|active|group-hover|peer-hover|group-focus|group-active|aria-[\w-]+|data-[\w[\]=.-]+):/;

function isRisky(cls) {
  return RISKY_MODIFIER_RE.test(cls) || /\/\d/.test(cls);
}

// ── فحص hex في className ─────────────────────────────────────────────────────
const HEX_IN_CLASS_RE = /#[0-9A-Fa-f]{3,8}\b/g;

// مسارات مستثناة من فحص الألوان (المصحف، shadcn المولّدة)
const UNREGISTERED_EXCLUDE_DIRS = ["mushaf", "MushafFahd", "MushafReader", "MushafPage", "MushafControls"];
const HEX_EXCLUDE_DIRS = [
  ...UNREGISTERED_EXCLUDE_DIRS,
  join("components", "ui"), // shadcn-generated UI primitives
];

function shouldSkipUnregisteredCheck(filePath) {
  return UNREGISTERED_EXCLUDE_DIRS.some(d => filePath.includes(d));
}
function shouldSkipHexCheck(filePath) {
  return HEX_EXCLUDE_DIRS.some(d => filePath.includes(d));
}

// ── استخراج قيم className مع رقم السطر ──────────────────────────────────────
function extractClassNameValues(src) {
  const lines   = src.split("\n");
  const results = [];
  let i = 0;

  while (i < src.length) {
    const idx = src.indexOf("className", i);
    if (idx === -1) break;

    // رقم السطر لبداية className
    const lineNum = src.slice(0, idx).split("\n").length;

    // تحقق من أن هذا السطر لا يحمل علامة الإسكات
    const lineContent = lines[lineNum - 1] ?? "";
    const isSuppressed = lineContent.includes("check-colors-ignore");

    let j = idx + 9;
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] !== "=") { i = j; continue; }
    j++;
    while (j < src.length && /\s/.test(src[j])) j++;

    const opener = src[j];
    j++;
    let value = "";

    if (opener === '"' || opener === "'") {
      const closer = opener;
      let k = j;
      while (k < src.length && src[k] !== closer) {
        if (src[k] === "\\") k++;
        k++;
      }
      value = src.slice(j, k);
      results.push({ value, lineNum, suppressed: isSuppressed });
      i = k + 1;
    } else if (opener === "{") {
      let depth = 1, k = j;
      while (k < src.length && depth > 0) {
        if (src[k] === "{") depth++;
        else if (src[k] === "}") depth--;
        k++;
      }
      value = src.slice(j, k - 1);
      results.push({ value, lineNum, suppressed: isSuppressed });
      i = k;
    } else {
      i = j;
    }
  }
  return results;
}

// ── تشغيل الفحصين ─────────────────────────────────────────────────────────────
const allFiles = collectFiles(SRC_DIR);
const errors   = [];

for (const file of allFiles) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");
  const classNameBlocks = extractClassNameValues(src);

  // ─ فحص 1: فئات ألوان غير مسجّلة مع modifier خطر ─────────────────────────
  if (!shouldSkipUnregisteredCheck(file)) {
    for (const { value, lineNum, suppressed } of classNameBlocks) {
      if (suppressed) continue;

      // نظّف: أزل linear-gradient و rgba و url
      const cleanValue = value.replace(
        /(?:linear-gradient|radial-gradient|conic-gradient|url|rgba?)\([^)]*\)/g, ""
      );

      const tokens = cleanValue.split(/[\s\n\r`'"{}+&|?:,\[\]]+/).filter(Boolean);

      for (const token of tokens) {
        if (!isRisky(token)) continue;

        // أزل كل modifiers
        let cls = token;
        while (RISKY_MODIFIER_RE.test(cls)) cls = cls.replace(/^[^:]+:/, "");

        const m = cls.match(new RegExp(
          `^(?:${PREFIX_ALT})-([a-z][a-z0-9-]*)(?:\\/[\\d.]+)?$`
        ));
        if (!m) continue;

        const colorName = m[1];
        if (isTailwindBuiltin(colorName)) continue;
        if (/^\d+$/.test(colorName)) continue;
        if (["inherit","current","transparent"].includes(colorName)) continue;
        if (REGISTERED.has(colorName)) continue;

        errors.push({
          file: rel,
          lineNum,
          token,
          kind: "unregistered",
          message: `لون مخصص غير مسجّل في @theme: "${colorName}" (الفئة: ${token})`,
        });
      }
    }
  }

  // ─ فحص 2: hex جامد في className (خارج المجلدات المستثناة) ───────────────
  if (!shouldSkipHexCheck(file)) {
    for (const { value, lineNum, suppressed } of classNameBlocks) {
      if (suppressed) continue;
      const hexMatches = [...value.matchAll(HEX_IN_CLASS_RE)];
      for (const hm of hexMatches) {
        errors.push({
          file: rel,
          lineNum,
          token: hm[0],
          kind: "hex",
          message: `hex جامد في className: "${hm[0]}" — استخدم متغير CSS أو لون @theme`,
        });
      }
    }
  }
}

// ── طباعة النتائج ─────────────────────────────────────────────────────────────
if (errors.length === 0) {
  console.log("✅ check-colors: لا توجد مخالفات — كل ألوان className مسجّلة ولا hex جامدة.");
  process.exit(0);
}

console.log(`\n🔴 check-colors: وُجدت ${errors.length} مخالفة\n`);
console.log("=".repeat(72));

const byFile = {};
for (const e of errors) {
  (byFile[e.file] ??= []).push(e);
}

for (const [f, errs] of Object.entries(byFile)) {
  console.log(`\n📄 ${f}`);
  for (const e of errs) {
    console.log(`   ⚠  سطر ${e.lineNum}:  ${e.message}`);
  }
}

console.log("\n" + "=".repeat(72));
console.log("\nكيفية الإصلاح:");
console.log("  • لون غير مسجّل: أضف  --color-xxx: var(--xxx)  في @theme inline بـ index.css");
console.log("  • hex جامد:       استبدله بـ bg-burgundy / text-gold / var(--burgundy)");
console.log("  • لإسكات سطر:    أضف التعليق  // check-colors-ignore  في نهايته\n");

if (CI_MODE) process.exit(1);
