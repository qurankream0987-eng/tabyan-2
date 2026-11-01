#!/usr/bin/env node
// Downloads the Tilawi recitation model (live transcription, provider
// "tilawi") into apps/api/models/tilawi, pinned to one Hugging Face revision
// and checked against its sha256. Skips files that are already correct.
//
// usage: node tools/scripts/fetch-asr-model.mjs [target dir]
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const target = path.resolve(process.argv[2] ?? path.join(root, "apps/api/models/tilawi"));

const REPO = "muhdur/tilawi-fastconformer-quran";
const REVISION = "e9448a0e84f3adb64c28b7a8db501dd8e0e59a84";
const FILES = {
  "fastconformer_full_mixed.onnx": "4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
  "vocab.json": "c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

await mkdir(target, { recursive: true });
for (const [name, expected] of Object.entries(FILES)) {
  const file = path.join(target, name);
  const existing = await readFile(file).catch(() => null);
  if (existing && sha256(existing) === expected) continue;
  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${name}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed (${response.status}): ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (sha256(body) !== expected) throw new Error(`checksum mismatch for ${name}`);
  await writeFile(`${file}.part`, body);
  await rename(`${file}.part`, file);
  console.log(`fetched ${name} (${(body.length / 1e6).toFixed(1)} MB)`);
}
console.log(`recitation model ready in ${target}`);
