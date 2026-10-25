/**
 * Video recovery audit & reconciliation — DRY RUN by default.
 *
 *   npm exec --workspace @workspace/api-server -- node --import tsx src/scripts/videoRecoveryAudit.ts
 *     [--deep]                 full ffprobe decode of every video (downloads each object to tmp)
 *     [--report <file.json>]   write the full machine-readable report
 *     [--apply <planId>]       apply exactly the repair plan a dry run printed
 *     [--audit-file <file>]    JSONL audit trail for --apply (default ./video-recovery-audit.jsonl)
 *
 * Reads the database named by DATABASE_URL and the bucket in PRIVATE_OBJECT_DIR.
 * The object store is never written or deleted. The only database write is
 * rewriting a legacy URL to the durable object key it already embeds, on the
 * exact row, guarded by the old value, inside one transaction.
 */
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, createWriteStream, writeFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pool } from "@workspace/db";
import { objectStorageService } from "../lib/objectStorageRuntime";
import { parseObjectAclPolicy } from "../lib/objectAcl";
import { probeVideoFileDetails, validateMp4Structure, validateWebmStructure } from "../lib/videoStructure";
import {
  classifyVideoObjects,
  embeddedObjectPath,
  redactReference,
  type ObjectFacts,
  type OwnerFacts,
  type StoredReference,
} from "../lib/videoRecovery";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const deep = flag("--deep");
const applyPlanId = option("--apply");
const reportFile = option("--report");
const auditFile = option("--audit-file") ?? "video-recovery-audit.jsonl";
async function readRange(
  objectPath: string,
  metadata: { size?: string | number; contentType?: string; metadata?: Record<string, unknown> | null },
  start: number,
  end: number,
): Promise<Buffer> {
  const response = await objectStorageService.downloadObject(
    { key: objectPath },
    0,
    { start, end, total: Number(metadata.size ?? 0) },
    metadata,
  );
  return Buffer.from(await response.arrayBuffer());
}

async function inspectObjects(): Promise<{ videos: ObjectFacts[]; nonVideo: number; outsideUploads: string[] }> {
  // Intentionally lists the private namespace, including legacy prefixes.
  // This audit tool is never run automatically or against production without approval.
  const objects = await objectStorageService.listPrivateObjects("/objects/");
  const videos: ObjectFacts[] = [];
  const outsideUploads: string[] = [];
  let nonVideo = 0;
  for (const object of objects) {
    const objectPath = object.objectPath;
    const metadata = object.metadata;
    if (!objectPath.startsWith("/objects/uploads/")) outsideUploads.push(objectPath);
    const size = Number(metadata.size ?? 0);
    const contentType = String(metadata.contentType ?? "");
    const head = size > 0
      ? await readRange(objectPath, metadata, 0, Math.min(size, 64 * 1024) - 1)
      : Buffer.alloc(0);
    const looksMp4 = head.length >= 8 && head.toString("latin1", 4, 8) === "ftyp";
    const looksWebm = head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    const declaredVideo = contentType.startsWith("video/");
    if (!looksMp4 && !looksWebm && !declaredVideo) {
      nonVideo += 1;
      continue;
    }
    const tail = size > head.length
      ? await readRange(objectPath, metadata, Math.max(0, size - 64 * 1024), size - 1)
      : null;
    let valid = looksMp4
      ? validateMp4Structure(head, tail, size)
      : looksWebm ? validateWebmStructure(head, tail, size) : false;
    if (valid && deep) {
      const tempPath = join(tmpdir(), `tabyan-recovery-${randomUUID()}`);
      try {
        const response = await objectStorageService.downloadObject(
          { key: objectPath },
          0,
          undefined,
          metadata,
        );
        if (!response.body) throw new Error("Object stream was empty.");
        await pipeline(
          Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
          createWriteStream(tempPath),
        );
        valid = (await probeVideoFileDetails(tempPath)).valid;
      } finally {
        await unlink(tempPath).catch(() => {});
      }
    }
    videos.push({
      objectPath,
      size,
      contentType,
      md5: typeof metadata.md5Hash === "string" ? metadata.md5Hash : null,
      createdAt: typeof metadata.timeCreated === "string" ? metadata.timeCreated : null,
      aclOwner: parseObjectAclPolicy(metadata)?.owner ?? null,
      structure: valid ? "valid" : "corrupt",
    });
  }
  return { videos, nonVideo, outsideUploads };
}

const quote = (identifier: string) => `"${identifier.replace(/"/g, "\"\"")}"`;

/** Every text/varchar/jsonb column in the public schema that mentions an object. */
async function collectReferences(): Promise<StoredReference[]> {
  const columns = await pool.query<{ table_name: string; column_name: string; data_type: string }>(`
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and c.data_type in ('character varying', 'text', 'jsonb')`);
  const keys = await pool.query<{ table_name: string; columns: string[] }>(`
    select tc.table_name, array_agg(kcu.column_name::text order by kcu.ordinal_position) as columns
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'
    group by tc.table_name`);
  const keyOf = new Map(keys.rows.map((row) => [row.table_name, row.columns]));
  const references: StoredReference[] = [];
  for (const column of columns.rows) {
    const pk = keyOf.get(column.table_name) ?? [];
    if (pk.includes(column.column_name) || pk.length === 0) continue;
    const keyExpr = pk.map((name) => `${quote(name)}::text`).join(` || ':' || `);
    const result = await pool.query<{ key: string; value: string }>(
      `select ${keyExpr} as key, ${quote(column.column_name)}::text as value
       from ${quote(column.table_name)}
       where ${quote(column.column_name)}::text ~ 'objects/|storage\\.googleapis\\.com'`,
    );
    const isJson = column.data_type === "jsonb";
    for (const row of result.rows) {
      const values = isJson
        ? row.value.match(/[^"\s]*objects\/(?:[\w-]+\/)*[\w-]+[^"\s]*/g) ?? []
        : [row.value];
      for (const value of values) {
        references.push({
          table: column.table_name,
          column: column.column_name,
          keyColumn: pk.join(","),
          key: row.key,
          value,
          reportOnly: isJson || pk.length !== 1,
        });
      }
    }
  }
  return references;
}

async function loadOwners(ids: string[]): Promise<Map<string, OwnerFacts>> {
  if (ids.length === 0) return new Map();
  const result = await pool.query<{ id: string; role: string }>("select id, role from users where id = any($1)", [ids]);
  const found = new Map(result.rows.map((row) => [row.id, { role: row.role }]));
  return new Map(ids.map((id) => [id, found.get(id) ?? null]));
}

async function main() {
  const { videos, nonVideo, outsideUploads } = await inspectObjects();
  const references = await collectReferences();
  const videoPaths = new Set(videos.map((video) => video.objectPath));
  // Only references that are (or claim to be) video: embedded object is a video
  // object, or the column is one of the known video fields.
  const videoColumns = new Set([
    "students.placement_test_video_url", "teachers.kyc_video_url", "recordings.video_url",
    "promotion_requests.video_url",
  ]);
  const videoReferences = references.filter((reference) => {
    const path = embeddedObjectPath(reference.value);
    return (path && videoPaths.has(path)) || videoColumns.has(`${reference.table}.${reference.column}`);
  });
  const owners = await loadOwners([...new Set(videos.map((video) => video.aclOwner).filter((id): id is string => !!id))]);
  const result = classifyVideoObjects(videos, videoReferences, owners);
  const repairs = result.objects.flatMap((entry) => entry.repairs);
  const planId = createHash("sha256")
    .update(JSON.stringify(repairs.map((repair) => [repair.reference.table, repair.reference.column, repair.reference.key, repair.reference.value, repair.newValue])))
    .digest("hex").slice(0, 16);
  const count = (prefix: string) => result.objects.filter((entry) => entry.klass.startsWith(prefix)).length;
  const knownVideoRefs = references.filter((reference) => videoColumns.has(`${reference.table}.${reference.column}`));
  const nonObjectVideoRows = await pool.query<{ n: number }>(`
    select (select count(*) from students where placement_test_video_url is not null and placement_test_video_url !~ 'objects/')
         + (select count(*) from teachers where kyc_video_url is not null and kyc_video_url !~ 'objects/')
         + (select count(*) from recordings where video_url !~ 'objects/')
         + (select count(*) from promotion_requests where video_url !~ 'objects/') as n`);

  console.log("VIDEO RECOVERY AUDIT", applyPlanId ? "(APPLY)" : "(DRY RUN)");
  console.log(`Database: ${new URL(process.env.DATABASE_URL ?? "postgres://unknown/").hostname.replace(/^(.{4}).*?(\..*)?$/, "$1…$2")}`);
  console.log("");
  console.log(`Total DB video records (known video columns):  ${knownVideoRefs.length}`);
  console.log(`  of which non-object values (placeholders):    ${nonObjectVideoRows.rows[0]?.n ?? 0}`);
  console.log(`Total storage video objects:                   ${videos.length}   (non-video objects skipped: ${nonVideo})`);
  console.log(`Objects outside uploads/ (legacy prefixes):    ${outsideUploads.length}`);
  console.log(`A  Valid linked videos:                        ${count("A_")}`);
  console.log(`B  Valid but legacy/broken DB link:            ${count("B_")}`);
  console.log(`   Recoverable repairs planned:                ${repairs.length}`);
  console.log(`C  Orphan — ACL owner is a user in this DB:    ${count("C_ORPHAN_OWNER_KNOWN")}  (report only — needs a human decision)`);
  console.log(`C  Orphan — ACL owner NOT in this DB:          ${count("C_ORPHAN_OWNER_UNKNOWN")}  (likely another environment's user)`);
  console.log(`C  Orphan — no ownership metadata:             ${count("C_ORPHAN_NO_OWNER")}  (never finalized)`);
  console.log(`D  DB references to missing objects:           ${result.missing.length}`);
  console.log(`E  Corrupt/truncated (linked / unlinked):      ${count("E_CORRUPT_LINKED")} / ${count("E_CORRUPT_UNLINKED")}`);
  console.log(`F  Unverified:                                 ${count("F_")}`);
  console.log(`Objects referenced by >1 row:                  ${result.sharedObjects.length}`);
  console.log(`Byte-identical duplicate objects:              ${result.objects.filter((entry) => entry.duplicateOf.length).length}`);
  console.log("");
  for (const entry of result.objects) {
    const refs = entry.references.map((reference) => `${reference.table}.${reference.column}[${reference.key}]`).join(", ") || "-";
    const owner = entry.object.aclOwner ? `${entry.object.aclOwner.slice(0, 8)}…(${owners.get(entry.object.aclOwner)?.role ?? "not in DB"})` : "none";
    console.log(`${entry.klass.padEnd(24)} ${entry.object.objectPath}  ${entry.object.size}B  owner=${owner}  refs=${refs}${entry.duplicateOf.length ? `  identical-to=${entry.duplicateOf.join(",")}` : ""}`);
  }
  for (const reference of result.missing) {
    console.log(`${"D_MISSING_OBJECT".padEnd(24)} ${reference.table}.${reference.column}[${reference.key}] → ${redactReference(reference.value)}`);
  }
  console.log("");
  console.log(`Repair plan id: ${planId} (${repairs.length} change${repairs.length === 1 ? "" : "s"})`);
  for (const repair of repairs) {
    console.log(`  ${repair.reference.table}.${repair.reference.column}[${repair.reference.key}]: ${redactReference(repair.reference.value)} → ${repair.newValue}`);
  }

  if (reportFile) {
    writeFileSync(reportFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      planId,
      objects: result.objects.map((entry) => ({
        ...entry,
        references: entry.references.map((reference) => ({ ...reference, value: redactReference(reference.value) })),
        repairs: entry.repairs.map((repair) => ({ ...repair, reference: { ...repair.reference, value: redactReference(repair.reference.value) } })),
      })),
      missing: result.missing.map((reference) => ({ ...reference, value: redactReference(reference.value) })),
      sharedObjects: result.sharedObjects,
      outsideUploads,
    }, null, 2), { mode: 0o600 });
    console.log(`Report written: ${reportFile}`);
  }

  if (!applyPlanId) {
    console.log(repairs.length ? `\nDry run only. To apply exactly this plan: --apply ${planId}` : "\nNothing to repair.");
    return;
  }
  if (applyPlanId !== planId) {
    console.error(`\nRefusing to apply: plan ${applyPlanId} does not match the current plan ${planId}. Re-run the dry run and review.`);
    process.exitCode = 2;
    return;
  }
  if (repairs.length === 0) {
    console.log("\nApply: nothing to change (already consistent).");
    return;
  }
  const runId = randomUUID();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const applied: string[] = [];
    for (const repair of repairs) {
      const { table, column, keyColumn, key, value } = repair.reference;
      const updated = await client.query(
        `update ${quote(table)} set ${quote(column)} = $1 where ${quote(keyColumn)}::text = $2 and ${quote(column)} = $3`,
        [repair.newValue, key, value],
      );
      if (updated.rowCount !== 1) throw new Error(`Row ${table}[${key}] changed since the dry run; nothing applied`);
      applied.push(JSON.stringify({
        runId,
        planId,
        at: new Date().toISOString(),
        table,
        column,
        keyColumn,
        key,
        oldValueRedacted: redactReference(value),
        oldValueSha256: createHash("sha256").update(value).digest("hex"),
        newValue: repair.newValue,
        evidence: repair.evidence,
      }));
    }
    await client.query("commit");
    appendFileSync(auditFile, `${applied.join("\n")}\n`, { mode: 0o600 });
    console.log(`\nApplied ${applied.length} repair(s). Audit: ${auditFile} (run ${runId}).`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Video recovery audit failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
