#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname, "..");
const pageDir = join(root, "assets/mushaf/pages");
const wordDir = join(root, "assets/mushaf/quran-words/pages");
const fontDir = join(root, "assets/mushaf/fonts");
const goldenPages = [1, 2, 27, 187, 300, 604];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [pages, words, fonts] = await Promise.all([
  readdir(pageDir),
  readdir(wordDir),
  readdir(fontDir),
]);
assert(pages.filter((name) => /^\d+\.json$/.test(name)).length === 604, "Native QCF page JSON count is not 604");
assert(words.filter((name) => /^\d+\.json$/.test(name)).length === 604, "Native canonical word JSON count is not 604");
assert(fonts.filter((name) => /^p\d+\.ttf$/.test(name)).length === 604, "Native QCF TTF count is not 604");

for (const page of goldenPages) {
  const data = JSON.parse(await readFile(join(pageDir, `${page}.json`), "utf8"));
  assert(data.p === page && Array.isArray(data.v) && data.v.length > 0, `Golden page ${page} has no QCF verses`);
  const tuples = data.v.flatMap((verse) => verse.w ?? []);
  assert(tuples.length > 0 && tuples.every((word) =>
    Number.isInteger(word[0]) && Number.isInteger(word[1]) && typeof word[3] === "string" && word[3].length > 0,
  ), `Golden page ${page} has an invalid QCF tuple`);
  assert(tuples.some((word) => word[2] === 1), `Golden page ${page} has no ayah marker`);
  assert(tuples.every((word) => word[1] >= 1 && word[1] <= 15), `Golden page ${page} exceeds the 15-line geometry`);
}

console.log(`Native QCF PASS: 604 pages, 604 canonical word files, 604 TTF fonts; golden pages ${goldenPages.join(",")}`);