#!/usr/bin/env node

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const SAFE_TARGET_BYTES = 3_800_000_000;
const QCF_ROOT = join(ROOT, "artifacts/mobile/assets/mushaf");
const cleanSafe = process.argv.includes("--clean-safe");
const mushafAssetsPolicy = process.env.MUSHAF_ASSETS_ENABLED ?? "false";
const mushafAssetsPolicyValid = mushafAssetsPolicy === "true" || mushafAssetsPolicy === "false";
const mushafAssetsEnabled = mushafAssetsPolicy === "true";

function run(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function bytesFor(path) {
  if (!existsSync(path)) return 0;
  return Number(run("du", ["-x", "-B1", "-s", path]).split(/\s+/)[0]);
}

function countFiles(path, pattern) {
  if (!existsSync(path)) return 0;
  return run("find", [path, "-maxdepth", "1", "-type", "f", "-name", pattern, "-printf", "."]).length;
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString("en-US")} bytes (${(bytes / 1_000_000_000).toFixed(3)} GB decimal)`;
}

function projectPath(path) {
  return relative(ROOT, path) || ".";
}

function classify(path) {
  const value = projectPath(path);
  if (value.startsWith(".git/") || value === ".git") return ["REQUIRED", "preserve Git; do not delete"];
  if (value.startsWith("node_modules/")) return ["REQUIRED", "review before Launch; do not delete automatically"];
  if (value.startsWith("attached_assets/") && /\.(zip|tar|tgz|tar\.gz)$/i.test(value)) return ["RECOVERY", "preserve; move only with verified backup"];
  if (value.includes("/dist/") || value.endsWith("/dist")) return ["GENERATED", "review; active artifact outputs are protected"];
  if (value.includes(".cache/") || value.startsWith(".cache")) return ["CACHE", "regeneratable; clean only with --clean-safe"];
  if (value.includes("mushaf")) return ["REQUIRED", "preserve canonical Mushaf/QCF"];
  return ["UNKNOWN", "manual review required"];
}

function listFiles(minBytes, maxBytes = Number.POSITIVE_INFINITY) {
  const lines = run("find", [
    ROOT,
    "-xdev",
    "-type",
    "f",
    "-size",
    `+${minBytes - 1}c`,
    ...(Number.isFinite(maxBytes) ? ["-size", `-${maxBytes + 1}c`] : []),
    "-printf",
    "%s\\t%p\\n",
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [size, path] = line.split("\t");
      const [category, action] = classify(path);
      return { size: Number(size), path: projectPath(path), category, action };
    })
    .sort((a, b) => b.size - a.size);
  return lines;
}

function printLargeFiles(title, files) {
  console.log(`${title}:`);
  if (!files.length) {
    console.log("NONE");
    return;
  }
  for (const file of files) {
    console.log(`- ${file.path} | ${formatBytes(file.size)} | ${file.category} | ${file.action}`);
  }
}

const appConfig = JSON.parse(readFileSync(join(ROOT, "artifacts/mobile/app.json"), "utf8")).expo;
const sizeBefore = bytesFor(ROOT);
const qcf = {
  json: countFiles(join(QCF_ROOT, "pages"), "*.json"),
  canonical: countFiles(join(QCF_ROOT, "quran-words/pages"), "*.json"),
  fonts: countFiles(join(QCF_ROOT, "fonts"), "*.ttf"),
};
const qcfComplete = qcf.json === 604 && qcf.canonical === 604 && qcf.fonts === 604;
const qcfAbsent = qcf.json === 0 && qcf.canonical === 0 && qcf.fonts === 0;
const identityPass =
  appConfig.ios?.bundleIdentifier === "app.replit.tbyan" &&
  appConfig.android?.package === "com.tabyan.app" &&
  appConfig.extra?.eas?.projectId === "bcac43ba-905a-4b13-a834-b36051da4da6" &&
  appConfig.version === "1.0.0" &&
  appConfig.ios?.buildNumber === "6";
const qcfPass = mushafAssetsPolicyValid && (mushafAssetsEnabled ? qcfComplete : qcfAbsent);

console.log("TABYAN APP STORE PREFLIGHT");
console.log(`MODE: ${cleanSafe ? "CLEAN-SAFE (explicit)" : "DRY-RUN"}`);
console.log(`PHYSICAL_WORKSPACE_SIZE_BYTES: ${sizeBefore}`);
console.log(`PHYSICAL_WORKSPACE_SIZE_HUMAN: ${formatBytes(sizeBefore)}`);
console.log("INTERNAL_SAFE_TARGET: <= 3,800,000,000 bytes");
console.log(`SIZE_GATE: ${sizeBefore <= SAFE_TARGET_BYTES ? "PASS" : "FAIL"}`);

console.log("\nLARGE_FILES_OVER_100MB:");
printLargeFiles("FILES", listFiles(100 * 1024 * 1024));
console.log("\nLARGE_FILES_50_TO_100MB:");
printLargeFiles("FILES", listFiles(50 * 1024 * 1024, 100 * 1024 * 1024));

console.log("\nHEAVY_DIRECTORIES:");
for (const directory of [
  ".git",
  ".git/lfs",
  "node_modules",
  ".local",
  ".cache",
  "attached_assets",
  "artifacts",
  "artifacts/mobile",
  "artifacts/tabyan",
  "artifacts/api-server",
]) {
  console.log(`- ${directory} | ${existsSync(join(ROOT, directory)) ? formatBytes(bytesFor(join(ROOT, directory))) : "ABSENT"}`);
}
const largestDirectories = run("du", ["-x", "-B1", "-d", "6", ROOT])
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [size, path] = line.split(/\s+(.+)/);
    return { size: Number(size), path: projectPath(path) };
  })
  .sort((a, b) => b.size - a.size)
  .slice(0, 15);
console.log("TOP_15_DIRECTORIES:");
for (const item of largestDirectories) console.log(`- ${item.path} | ${formatBytes(item.size)}`);

console.log("\nQCF_INTEGRITY:");
console.log(`QCF_JSON: ${qcf.json}`);
console.log(`QCF_CANONICAL: ${qcf.canonical}`);
console.log(`QCF_FONTS: ${qcf.fonts}`);
console.log(`MUSHAF_ASSETS_ENABLED: ${mushafAssetsEnabled}`);
console.log(`QCF_POLICY: ${mushafAssetsEnabled ? "REQUIRED" : "INTENTIONAL_EXCLUSION"}`);
console.log(`QCF_INTEGRITY_GATE: ${qcfPass ? (mushafAssetsEnabled ? "PASS" : "PASS_BY_POLICY") : "FAIL"}`);

console.log("\nIDENTITY:");
console.log(`IOS_BUNDLE_ID: ${appConfig.ios?.bundleIdentifier ?? "MISSING"}`);
console.log(`ANDROID_PACKAGE: ${appConfig.android?.package ?? "MISSING"}`);
console.log(`EXPO_PROJECT_ID: ${appConfig.extra?.eas?.projectId ?? "MISSING"}`);
console.log(`VERSION: ${appConfig.version ?? "MISSING"}`);
console.log(`IOS_BUILD: ${appConfig.ios?.buildNumber ?? "MISSING"}`);
console.log(`IDENTITY_GATE: ${identityPass ? "PASS" : "FAIL"}`);

const recoveryFiles = run("find", [
  ROOT,
  "-xdev",
  "-type",
  "f",
  "(",
  "-iname",
  "*.zip",
  "-o",
  "-iname",
  "*.tar",
  "-o",
  "-iname",
  "*.tgz",
  "-o",
  "-iname",
  "*.tar.gz",
  "-o",
  "-iname",
  "*backup*",
  "-o",
  "-iname",
  "*recovery*",
  ")",
  "-printf",
  "%s\\t%p\\n",
])
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [size, path] = line.split("\t");
    return { size: Number(size), path: projectPath(path) };
  })
  .sort((a, b) => b.size - a.size);
console.log("\nRECOVERY_ARCHIVES_FOUND:");
for (const item of recoveryFiles) console.log(`- ${item.path} | ${formatBytes(item.size)}`);
console.log(`RECOVERY_TOTAL_SIZE: ${formatBytes(recoveryFiles.reduce((sum, item) => sum + item.size, 0))}`);

const generatedPaths = [
  "artifacts/mobile/dist",
  "artifacts/mobile/.expo",
  "artifacts/tabyan/dist",
  "artifacts/api-server/dist",
  "coverage",
  "logs",
  "tmp",
];
const generatedPresent = generatedPaths.filter((path) => existsSync(join(ROOT, path)));
console.log("\nGENERATED_OUTPUTS:");
console.log(`GENERATED_OUTPUTS_PRESENT: ${generatedPresent.length ? "YES" : "NO"}`);
console.log(`GENERATED_OUTPUTS_SIZE: ${formatBytes(generatedPresent.reduce((sum, path) => sum + bytesFor(join(ROOT, path)), 0))}`);
for (const path of generatedPresent) {
  const protectedPath = path.endsWith("/dist");
  console.log(`- ${path} | ${formatBytes(bytesFor(join(ROOT, path)))} | ${protectedPath ? "PROTECTED_ACTIVE_OUTPUT" : "REVIEW"}`);
}

if (cleanSafe) {
  const safeCachePaths = [".cache", "coverage", "logs", "tmp"];
  for (const path of safeCachePaths) {
    const absolute = join(ROOT, path);
    if (!existsSync(absolute)) continue;
    rmSync(absolute, { recursive: true, force: true });
    console.log(`CLEAN_SAFE_ACTION: removed ${path}`);
  }
  console.log("CLEAN_SAFE_PROTECTED: dist, QCF, node_modules, attached_assets, recovery archives, and .git were not touched");
}

console.log("\nAPP_STORE_ARCHIVE_USES_PHYSICAL_WORKSPACE: YES");
console.log(".replitignore DOES NOT reduce Replit App Store Launch archive size.");

const blockers = [];
if (sizeBefore > SAFE_TARGET_BYTES) blockers.push("physical workspace exceeds INTERNAL_SAFE_TARGET");
if (!mushafAssetsPolicyValid) blockers.push("MUSHAF_ASSETS_ENABLED must be exactly true or false");
if (!qcfPass) blockers.push(mushafAssetsEnabled ? "QCF integrity failed while Mushaf assets are enabled" : "QCF files must remain absent while Mushaf assets are intentionally excluded");
if (!identityPass) blockers.push("Expo/Apple identity gate failed");
if (recoveryFiles.some((item) => item.size >= 100 * 1024 * 1024)) blockers.push("large recovery archive requires an explicit staging decision");

console.log("\nAPP_STORE_PREFLIGHT:");
if (blockers.length) {
  console.log("FAIL");
  console.log("BLOCKERS:");
  for (const blocker of blockers) console.log(`- ${blocker}`);
  console.log("DRY_RUN: FAIL");
  console.log("FILES_DELETED_BY_PREFLIGHT: 0");
  process.exitCode = 2;
} else {
  console.log("PASS");
  console.log("DRY_RUN: PASS");
  console.log("FILES_DELETED_BY_PREFLIGHT: 0");
}