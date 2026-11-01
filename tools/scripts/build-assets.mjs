#!/usr/bin/env node
// Large static web assets (the Mushaf page fonts and word data, ~260 MB) live
// in the object storage bucket instead of the deploy upload, which Railway
// caps. `upload` copies them from the repo into the bucket and writes
// tools/scripts/build-assets.manifest.json; the Docker build runs `fetch`,
// which downloads them back into apps/web/public and checks every sha256.
//
// usage: node tools/scripts/build-assets.mjs upload|fetch
// env:   RAILWAY_BUCKET_ENDPOINT, RAILWAY_BUCKET_S3_NAME,
//        RAILWAY_BUCKET_ACCESS_KEY_ID, RAILWAY_BUCKET_SECRET_ACCESS_KEY,
//        RAILWAY_BUCKET_URL_STYLE (path | virtual-host, default virtual-host)
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "apps/api/package.json"));
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const publicDir = path.join(root, "apps/web/public");
const assetDirs = ["mushaf/fonts", "mushaf/fonts-android", "mushaf/quran-words"];
const keyPrefix = "build-assets/web/";
const manifestPath = path.join(root, "tools/scripts/build-assets.manifest.json");

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function client() {
  return new S3Client({
    endpoint: requiredEnv("RAILWAY_BUCKET_ENDPOINT"),
    region: process.env.RAILWAY_BUCKET_SIGNING_REGION?.trim() || "auto",
    forcePathStyle: (process.env.RAILWAY_BUCKET_URL_STYLE ?? "virtual-host") === "path",
    credentials: {
      accessKeyId: requiredEnv("RAILWAY_BUCKET_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("RAILWAY_BUCKET_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function inParallel(items, limit, task) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) await task(items[next++]);
  }));
}

async function upload() {
  const s3 = client();
  const bucket = requiredEnv("RAILWAY_BUCKET_S3_NAME");
  const files = [];
  for (const dir of assetDirs) {
    const entries = await readdir(path.join(publicDir, dir), { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const relative = path.relative(publicDir, path.join(entry.parentPath, entry.name));
      files.push(relative.split(path.sep).join("/"));
    }
  }
  files.sort();
  const entries = [];
  let done = 0;
  await inParallel(files, 8, async (file) => {
    const body = await readFile(path.join(publicDir, file));
    const hash = sha256(body);
    const Key = keyPrefix + file;
    const existing = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key })).catch(() => null);
    if (existing?.Metadata?.sha256 !== hash) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: body, Metadata: { sha256: hash } }));
    }
    entries.push({ path: file, size: body.length, sha256: hash });
    if (++done % 100 === 0) console.log(`uploaded ${done}/${files.length}`);
  });
  entries.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(manifestPath, `${JSON.stringify({ keyPrefix, files: entries }, null, 1)}\n`);
  console.log(`uploaded ${entries.length} files; manifest written`);
}

async function fetchAssets() {
  const s3 = client();
  const bucket = requiredEnv("RAILWAY_BUCKET_S3_NAME");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  let done = 0;
  await inParallel(manifest.files, 16, async (entry) => {
    const target = path.join(publicDir, entry.path);
    const local = await readFile(target).catch(() => null);
    if (local && sha256(local) === entry.sha256) return;
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: manifest.keyPrefix + entry.path }));
    const body = Buffer.from(await response.Body.transformToByteArray());
    if (sha256(body) !== entry.sha256) throw new Error(`checksum mismatch for ${entry.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    if (++done % 200 === 0) console.log(`fetched ${done}/${manifest.files.length}`);
  });
  console.log(`build assets ready (${manifest.files.length} files)`);
}

const mode = process.argv[2];
if (mode === "upload") await upload();
else if (mode === "fetch") await fetchAssets();
else {
  console.error("usage: build-assets.mjs upload|fetch");
  process.exit(1);
}
