#!/usr/bin/env node
/**
 * Copy the verified Web QCF v2 source into the Native artifact.
 * This is intentionally a deterministic copy: Native and Web must share the
 * same page JSON, canonical word JSON, and lossless-converted page fonts.
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = resolve(mobileRoot, "../tabyan");
const sources = [
  ["public/mushaf/pages", "assets/mushaf/pages"],
  ["public/mushaf/quran-words/pages", "assets/mushaf/quran-words/pages"],
  ["public/mushaf/fonts-ttf", "assets/mushaf/fonts"],
];

for (const [from, to] of sources) {
  const source = resolve(webRoot, from);
  const destination = resolve(mobileRoot, to);
  await mkdir(destination, { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
  console.log(`synced ${from} -> ${to}`);
}