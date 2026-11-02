#!/usr/bin/env node
// Builds the Mushaf page fonts the mobile app loads: the QCF v2 TTF set
// (apps/web/public/mushaf/fonts-ttf) without its TrueType hinting tables.
//
// Android cannot load the woff2 set the site uses, and it applies TrueType
// hinting, which these fonts' instructions do not survive: glyphs such as
// ٱلْحَمْدُ, يَوْمِ and صِرَٰطَ come out clipped or broken. Without fpgm/prep/cvt
// the glyph programs cannot run and Android draws the outlines unhinted, exactly
// as browsers show them. Outlines, metrics, cmap and layout tables are untouched.
//
// usage: node tools/scripts/build-android-mushaf-fonts.mjs        (v2: fonts-ttf → fonts-android)
//        node tools/scripts/build-android-mushaf-fonts.mjs --v1   (v1: v1/fonts-ttf → v1/fonts-android, the set the app loads)
// Then upload with tools/scripts/build-assets.mjs upload.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mushafDir = path.join(root, "apps/web/public/mushaf", process.argv.includes("--v1") ? "v1" : "");
const sourceDir = path.join(mushafDir, "fonts-ttf");
const targetDir = path.join(mushafDir, "fonts-android");
const HINTING_TABLES = new Set(["fpgm", "prep", "cvt ", "hdmx", "VDMX", "LTSH"]);

function tableChecksum(data) {
  const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
  let sum = 0;
  for (let index = 0; index < padded.length; index += 4) sum = (sum + padded.readUInt32BE(index)) >>> 0;
  return sum;
}

/** Rewrites an sfnt font without the hinting tables. */
function stripHinting(font) {
  const tables = [];
  for (let index = 0; index < font.readUInt16BE(4); index += 1) {
    const record = 12 + index * 16;
    const tag = font.toString("latin1", record, record + 4);
    if (HINTING_TABLES.has(tag)) continue;
    const offset = font.readUInt32BE(record + 8);
    tables.push({ tag, data: font.subarray(offset, offset + font.readUInt32BE(record + 12)) });
  }
  const searchPower = 2 ** Math.floor(Math.log2(tables.length));
  const header = Buffer.alloc(12 + tables.length * 16);
  font.copy(header, 0, 0, 4);
  header.writeUInt16BE(tables.length, 4);
  header.writeUInt16BE(searchPower * 16, 6);
  header.writeUInt16BE(Math.log2(searchPower), 8);
  header.writeUInt16BE(tables.length * 16 - searchPower * 16, 10);
  const bodies = [];
  let offset = header.length;
  tables.forEach(({ tag, data }, index) => {
    const record = 12 + index * 16;
    header.write(tag, record, "latin1");
    header.writeUInt32BE(tableChecksum(data), record + 4);
    header.writeUInt32BE(offset, record + 8);
    header.writeUInt32BE(data.length, record + 12);
    const padding = Buffer.alloc((4 - (data.length % 4)) % 4);
    bodies.push(data, padding);
    offset += data.length + padding.length;
  });
  return Buffer.concat([header, ...bodies]);
}

await mkdir(targetDir, { recursive: true });
const files = (await readdir(sourceDir)).filter((name) => name.endsWith(".ttf"));
for (const name of files) {
  await writeFile(path.join(targetDir, name), stripHinting(await readFile(path.join(sourceDir, name))));
}
console.log(`wrote ${files.length} fonts to ${path.relative(root, targetDir)}`);
