#!/usr/bin/env node
// Records packages/db/migrations/canonical/0000_ams_schema_baseline.sql as
// applied in drizzle.__drizzle_migrations, for a database whose tables were
// restored from a dump rather than created by `drizzle-kit migrate`. Later
// migrations then apply on top of it, and /readiness reports migrationHistory ok.
// Refuses unless every table the baseline creates already exists.
// usage: DATABASE_URL=... node tools/scripts/mark-baseline-applied.mjs
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(path.resolve(fileURLToPath(import.meta.url), "../../../packages/db/package.json"));
const { Client } = require("pg");

const migrations = path.resolve(fileURLToPath(import.meta.url), "../../../packages/db/migrations/canonical");
const sql = await readFile(path.join(migrations, "0000_ams_schema_baseline.sql"), "utf8");
const journal = JSON.parse(await readFile(path.join(migrations, "meta/_journal.json"), "utf8"));
const entry = journal.entries.find((e) => e.tag === "0000_ams_schema_baseline");
const hash = createHash("sha256").update(sql).digest("hex");
const baselineTables = [...sql.matchAll(/^CREATE TABLE "([^"]+)"/gm)].map((m) => m[1]);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  const present = new Set(rows.map((r) => r.table_name));
  const missing = baselineTables.filter((t) => !present.has(t));
  if (missing.length) throw new Error(`refusing: tables missing from the database: ${missing.join(", ")}`);

  await client.query("BEGIN");
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(
    "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)",
  );
  const existing = await client.query("SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1", [hash]);
  if (existing.rowCount === 0) {
    await client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [hash, entry.when]);
  }
  await client.query("COMMIT");
  console.log(existing.rowCount === 0 ? `baseline recorded (${hash.slice(0, 12)})` : "baseline already recorded");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
