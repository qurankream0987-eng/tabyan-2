import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "@workspace/db";
import { expectedPublicTables } from "../http/databaseSchemaExpectations";
import { RailwayObjectStorageProvider } from "../storage/RailwayObjectStorageProvider";
import { getStorageErrorDetails } from "../storage/storageErrorDetails";

type TableRow = {
  table_schema: string;
  table_name: string;
  table_type: string;
};

type MigrationRow = {
  hash: string;
  created_at: string;
};

type RowPresence = {
  tableName: string;
  hasRows: boolean;
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../../..");
const baselinePath = path.join(
  repositoryRoot,
  "packages/db/migrations/canonical/0000_ams_schema_baseline.sql",
);
const migrationMode = process.env.TABYAN_AMS_SCHEMA_MODE ?? "verify-only";
const selectedStorageProvider =
  process.env.TABYAN_OBJECT_STORAGE_PROVIDER?.trim() || "replit";
const expectedBucketDisplayName = "tabyan-objects-ams";
const expectedBucketS3Name = "tabyan-objects-ams-jwidul";
const expectedDeploymentRegion = "ams";
const expectedBucketSigningRegion = "auto";
const expectedBucketUrlStyle = "virtual-host";
const expectedBucketEndpoint = "https://t3.storageapi.dev";
const expectedDatabaseHost = "tabyan-postgres-ams.railway.internal";
let currentStage = "initialize";

function inspectDatabaseTarget(): {
  databaseUrlPresent: boolean;
  postgresScheme: boolean;
  privateRailwayHost: boolean;
  expectedAmsterdamHost: boolean;
} {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      databaseUrlPresent: false,
      postgresScheme: false,
      privateRailwayHost: false,
      expectedAmsterdamHost: false,
    };
  }
  try {
    const parsed = new URL(connectionString);
    const hostname = parsed.hostname.toLowerCase();
    return {
      databaseUrlPresent: true,
      postgresScheme:
        parsed.protocol === "postgres:" || parsed.protocol === "postgresql:",
      privateRailwayHost: hostname.endsWith(".railway.internal"),
      expectedAmsterdamHost: hostname === expectedDatabaseHost,
    };
  } catch {
    return {
      databaseUrlPresent: true,
      postgresScheme: false,
      privateRailwayHost: false,
      expectedAmsterdamHost: false,
    };
  }
}

async function loadBaseline(): Promise<{
  sql: string;
  hash: string;
  tableNames: string[];
}> {
  const sql = await readFile(baselinePath, "utf8");
  const migrationDirectory = path.dirname(baselinePath);
  const [migrationFiles, journalText] = await Promise.all([
    readdir(migrationDirectory),
    readFile(path.join(migrationDirectory, "meta/_journal.json"), "utf8"),
  ]);
  const sqlFiles = migrationFiles.filter((file) => file.endsWith(".sql"));
  if (sqlFiles.length !== 1 || sqlFiles[0] !== path.basename(baselinePath)) {
    throw new Error("canonical migration folder must contain only the approved baseline");
  }
  const journal = JSON.parse(journalText) as {
    version?: string;
    dialect?: string;
    entries?: Array<{
      idx?: number;
      tag?: string;
      breakpoints?: boolean;
    }>;
  };
  const journalEntry = journal.entries?.[0];
  if (
    journal.version !== "7" ||
    journal.dialect !== "postgresql" ||
    journal.entries?.length !== 1 ||
    journalEntry?.idx !== 0 ||
    journalEntry?.tag !== "0000_ams_schema_baseline" ||
    journalEntry?.breakpoints !== true
  ) {
    throw new Error("canonical migration journal does not match the approved baseline");
  }

  const statements = sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const allowedStatement =
    /^(?:CREATE (?:TABLE|INDEX|UNIQUE INDEX|TYPE|SEQUENCE|SCHEMA)\b|ALTER TABLE\b[\s\S]*\bADD CONSTRAINT\b)/i;
  if (
    statements.some(
      (statement) =>
        !allowedStatement.test(statement) ||
        /^\s*(?:DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(statement),
    )
  ) {
    throw new Error("baseline contains a non-schema statement");
  }

  const parsedTableNames = [
    ...sql.matchAll(/^CREATE TABLE "([^"]+)"\s*\(/gm),
  ].map((match) => match[1]);
  const tableNames = [...new Set(parsedTableNames)].sort();
  if (
    parsedTableNames.length !== expectedPublicTables.size ||
    tableNames.length !== expectedPublicTables.size ||
    tableNames.some((tableName) => !expectedPublicTables.has(tableName))
  ) {
    throw new Error("baseline does not match the approved 54-table schema");
  }

  for (const requiredTable of [
    "sessions",
    "system_settings",
    "user_storage_objects",
    "account_deletion_requests",
    "private_media_deletion_jobs",
  ]) {
    if (!tableNames.includes(requiredTable)) {
      throw new Error(`baseline is missing required table: ${requiredTable}`);
    }
  }

  return {
    sql,
    hash: createHash("sha256").update(sql).digest("hex"),
    tableNames,
  };
}

async function inspectDatabase(
  expectedTables: string[],
  checkRows: boolean,
): Promise<{
  report: Record<string, unknown>;
  publicTableNames: string[];
  migrationHistory: MigrationRow[];
  matchesExpectedTables: boolean;
  hasUnexpectedRelations: boolean;
  hasUnexpectedSchemas: boolean;
  hasRows: boolean;
}> {
  const schemaResult = await pool.query<{ schema_name: string }>(
    `SELECT schema_name
     FROM information_schema.schemata
     WHERE left(schema_name, 3) <> 'pg_'
       AND schema_name <> 'information_schema'
     ORDER BY schema_name`,
  );
  const relationResult = await pool.query<TableRow>(
    `SELECT table_schema, table_name, table_type
     FROM information_schema.tables
     WHERE left(table_schema, 3) <> 'pg_'
       AND table_schema <> 'information_schema'
     ORDER BY table_schema, table_name`,
  );
  const publicTableNames = relationResult.rows
    .filter(
      (row) =>
        row.table_schema === "public" && row.table_type === "BASE TABLE",
    )
    .map((row) => row.table_name)
    .sort();
  const actualTables = new Set(publicTableNames);
  const expectedSet = new Set(expectedTables);
  const missingTables = expectedTables.filter(
    (tableName) => !actualTables.has(tableName),
  );
  const unexpectedTables = publicTableNames.filter(
    (tableName) => !expectedSet.has(tableName),
  );
  const otherRelations = relationResult.rows
    .filter(
      (row) =>
        row.table_type !== "BASE TABLE" ||
        (row.table_schema !== "public" &&
          !(
            row.table_schema === "drizzle" &&
            row.table_name === "__drizzle_migrations"
          )),
    )
    .map((row) => `${row.table_schema}.${row.table_name}:${row.table_type}`);
  const unexpectedSchemas = schemaResult.rows
    .map((row) => row.schema_name)
    .filter((schemaName) => !["public", "drizzle"].includes(schemaName));

  const historyPresence = await pool.query<{ present: boolean }>(
    `SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`,
  );
  const historyTablePresent = historyPresence.rows[0]?.present === true;
  const historyResult = historyTablePresent
    ? await pool.query<MigrationRow>(
        `SELECT hash, created_at::text AS created_at
         FROM drizzle.__drizzle_migrations
         ORDER BY created_at`,
      )
    : { rows: [] as MigrationRow[] };
  const migrationHistory = historyResult.rows;

  const rowPresence: RowPresence[] = [];
  if (checkRows) {
    for (const tableName of publicTableNames) {
      const quotedTableName = tableName.replaceAll('"', '""');
      const result = await pool.query<{ has_rows: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM "public"."${quotedTableName}" LIMIT 1
         ) AS has_rows`,
      );
      rowPresence.push({
        tableName,
        hasRows: result.rows[0]?.has_rows === true,
      });
    }
  }

  const countResult = await pool.query<{
    indexes: string;
    foreign_keys: string;
    sequences: string;
    enums: string;
    custom_types: string;
    functions: string;
    large_objects: string;
  }>(
    `SELECT
       (SELECT count(*)::text FROM pg_indexes WHERE schemaname = 'public') AS indexes,
       (SELECT count(*)::text
        FROM pg_constraint AS constraint_row
        JOIN pg_class AS table_row ON table_row.oid = constraint_row.conrelid
        JOIN pg_namespace AS schema_row ON schema_row.oid = table_row.relnamespace
        WHERE schema_row.nspname = 'public'
          AND constraint_row.contype = 'f') AS foreign_keys,
       (SELECT count(*)::text
        FROM information_schema.sequences
        WHERE sequence_schema = 'public') AS sequences,
       (SELECT count(*)::text
        FROM pg_type AS type_row
        JOIN pg_namespace AS schema_row ON schema_row.oid = type_row.typnamespace
        WHERE schema_row.nspname = 'public'
          AND type_row.typtype = 'e') AS enums,
       (SELECT count(*)::text
        FROM pg_type AS type_row
        JOIN pg_namespace AS schema_row ON schema_row.oid = type_row.typnamespace
        WHERE schema_row.nspname = 'public'
          AND type_row.typtype IN ('c', 'd', 'e', 'r', 'm')
          AND type_row.typrelid = 0) AS custom_types,
       (SELECT count(*)::text
        FROM pg_proc AS procedure_row
        JOIN pg_namespace AS schema_row ON schema_row.oid = procedure_row.pronamespace
        WHERE schema_row.nspname = 'public') AS functions,
       (SELECT count(*)::text FROM pg_largeobject_metadata) AS large_objects`,
  );
  const counts = countResult.rows[0] ?? {
    indexes: "0",
    foreign_keys: "0",
    sequences: "0",
    enums: "0",
    custom_types: "0",
    functions: "0",
    large_objects: "0",
  };

  const hasRows = rowPresence.some((row) => row.hasRows);
  const matchesExpectedTables =
    missingTables.length === 0 && unexpectedTables.length === 0;
  const hasUnexpectedRelations = otherRelations.length > 0;
  const hasUnexpectedSchemas = unexpectedSchemas.length > 0;
  const safeForEmptyBaseline =
    publicTableNames.length === 0 &&
    migrationHistory.length === 0 &&
    !hasUnexpectedRelations &&
    !hasUnexpectedSchemas &&
    !hasRows &&
    Number(counts.indexes) === 0 &&
    Number(counts.sequences) === 0 &&
    Number(counts.enums) === 0 &&
    Number(counts.custom_types) === 0 &&
    Number(counts.functions) === 0 &&
    Number(counts.large_objects) === 0;

  return {
    report: {
      userSchemas: schemaResult.rows.map((row) => row.schema_name),
      publicTableCount: publicTableNames.length,
      publicTables: checkRows
        ? rowPresence
        : publicTableNames,
      expectedTableCount: expectedTables.length,
      missingExpectedTables: missingTables,
      unexpectedPublicTables: unexpectedTables,
      otherRelations,
      unexpectedSchemas,
      indexes: Number(counts.indexes),
      foreignKeys: Number(counts.foreign_keys),
      sequences: Number(counts.sequences),
      enums: Number(counts.enums),
      customTypes: Number(counts.custom_types),
      functions: Number(counts.functions),
      largeObjects: Number(counts.large_objects),
      migrationHistory: {
        tablePresent: historyTablePresent,
        count: migrationHistory.length,
        entries: migrationHistory.map((entry) => ({
          hashPrefix: entry.hash.slice(0, 12),
          createdAt: entry.created_at,
        })),
      },
      safeForEmptyBaseline,
    },
    publicTableNames,
    migrationHistory,
    matchesExpectedTables,
    hasUnexpectedRelations,
    hasUnexpectedSchemas,
    hasRows,
  };
}

async function runPrivateBucketSmokeTest(): Promise<Record<string, unknown>> {
  const displayBucketNameMatches =
    process.env.RAILWAY_BUCKET_DISPLAY_NAME === expectedBucketDisplayName;
  const s3BucketNameMatches =
    process.env.RAILWAY_BUCKET_S3_NAME === expectedBucketS3Name;
  const deploymentRegionMatches =
    process.env.RAILWAY_DEPLOYMENT_REGION === expectedDeploymentRegion;
  const signingRegionMatches =
    process.env.RAILWAY_BUCKET_SIGNING_REGION === expectedBucketSigningRegion;
  const urlStyleMatches =
    process.env.RAILWAY_BUCKET_URL_STYLE === expectedBucketUrlStyle;
  const endpointValue = process.env.RAILWAY_BUCKET_ENDPOINT?.trim();
  let endpointMatches = false;
  let endpointHost: string | undefined;
  if (endpointValue) {
    try {
      const endpoint = new URL(endpointValue);
      endpointHost = endpoint.host;
      endpointMatches =
        endpoint.protocol === "https:" &&
        endpoint.toString().replace(/\/$/, "") === expectedBucketEndpoint;
    } catch {
      endpointMatches = false;
    }
  }
  const result: Record<string, unknown> = {
    activeStorageProvider: selectedStorageProvider,
    expectedBucketDisplayNameMatches: displayBucketNameMatches,
    expectedS3BucketNameMatches: s3BucketNameMatches,
    expectedDeploymentRegionMatches: deploymentRegionMatches,
    expectedSigningRegionMatches: signingRegionMatches,
    expectedUrlStyleMatches: urlStyleMatches,
    expectedEndpointMatches: endpointMatches,
    endpointHost,
    smokeTest: "skipped",
    cleanupConfirmed: null,
  };
  if (
    selectedStorageProvider !== "railway" ||
    !displayBucketNameMatches ||
    !s3BucketNameMatches ||
    !deploymentRegionMatches ||
    !signingRegionMatches ||
    !urlStyleMatches ||
    !endpointMatches
  ) {
    return result;
  }

  const objectPath = "/objects/tabyan-migration-smoke/test.txt";
  const objectRef = { key: objectPath };
  const payload = Buffer.from("tabyan-ams-storage-healthcheck");
  let provider: RailwayObjectStorageProvider | undefined;
  let uploadAttempted = false;
  let cleanupConfirmed = false;
  let failureStage = "configuration";

  try {
    provider = new RailwayObjectStorageProvider();
    failureStage = "preflight-head";
    if (await provider.headObject(objectRef)) {
      throw new Error(
        "synthetic storage smoke key already exists; refusing to overwrite it",
      );
    }
    failureStage = "create-write-capability";
    const uploadUrl = await provider.createWriteCapability(objectPath, 60);
    failureStage = "put";
    uploadAttempted = true;
    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: payload,
    });
    if (!putResponse.ok) {
      const responseText = (await putResponse.text()).slice(0, 4096);
      const xmlValue = (tag: string): string | undefined => {
        const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(
          responseText,
        );
        return match?.[1]?.trim();
      };
      const putError = new Error(
        xmlValue("Message") ?? `Private object PUT returned HTTP ${putResponse.status}.`,
      );
      putError.name = "S3HttpError";
      Object.assign(putError, {
        code: `HTTP_${putResponse.status}`,
        httpStatusCode: putResponse.status,
        s3ErrorCode: xmlValue("Code"),
        requestId:
          putResponse.headers.get("x-amz-request-id") ??
          putResponse.headers.get("x-amz-id-2") ??
          xmlValue("RequestId") ??
          xmlValue("RequestID"),
      });
      throw putError;
    }

    failureStage = "head";
    const metadata = await provider.headObject(objectRef);
    if (!metadata) throw new Error("private object HEAD did not find the object");

    failureStage = "get";
    const chunks: Buffer[] = [];
    for await (const chunk of provider.getObjectStream(objectRef)) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (!Buffer.concat(chunks).equals(payload)) {
      throw new Error("private object GET content did not match");
    }

    failureStage = "delete";
    await provider.deleteObject(objectRef);
    if (await provider.headObject(objectRef)) {
      throw new Error("private object deletion was not confirmed");
    }
    cleanupConfirmed = true;
    return { ...result, smokeTest: "passed", cleanupConfirmed };
  } catch (error) {
    if (provider && uploadAttempted && !cleanupConfirmed) {
      try {
        await provider.deleteObject(objectRef);
        cleanupConfirmed = !(await provider.headObject(objectRef));
      } catch {
        cleanupConfirmed = false;
      }
    }
    return {
      ...result,
      smokeTest: "failed",
      failureStage,
      ...getStorageErrorDetails(error, [
        process.env.RAILWAY_BUCKET_ACCESS_KEY_ID ?? "",
        process.env.RAILWAY_BUCKET_SECRET_ACCESS_KEY ?? "",
      ]),
      cleanupConfirmed,
    };
  }
}

function migrationAlreadyApplied(
  migrationHistory: MigrationRow[],
  baselineHash: string,
  matchesExpectedTables: boolean,
  hasUnexpectedRelations: boolean,
  hasUnexpectedSchemas: boolean,
): boolean {
  return (
    migrationHistory.length === 1 &&
    migrationHistory[0]?.hash === baselineHash &&
    matchesExpectedTables &&
    !hasUnexpectedRelations &&
    !hasUnexpectedSchemas
  );
}

async function main(): Promise<void> {
  currentStage = "validate-mode";
  if (!["apply-empty-baseline", "verify-only"].includes(migrationMode)) {
    throw new Error("unsupported Amsterdam schema mode");
  }

  currentStage = "load-baseline";
  const baseline = await loadBaseline();
  currentStage = "verify-database-target";
  const databaseTarget = inspectDatabaseTarget();
  console.log("AMS_DATABASE_TARGET", JSON.stringify(databaseTarget));
  if (
    !databaseTarget.databaseUrlPresent ||
    !databaseTarget.postgresScheme ||
    !databaseTarget.privateRailwayHost ||
    !databaseTarget.expectedAmsterdamHost
  ) {
    throw new Error("DATABASE_URL is not bound to the private Amsterdam service");
  }
  currentStage = "inspect-before";
  const before = await inspectDatabase(baseline.tableNames, true);
  console.log(
    "AMS_DATABASE_BEFORE",
    JSON.stringify({
      mode: migrationMode,
      ...before.report,
      baselineHashPrefix: baseline.hash.slice(0, 12),
    }),
  );

  if (migrationMode === "verify-only") {
    currentStage = "verify-existing-schema";
    if (
      !migrationAlreadyApplied(
        before.migrationHistory,
        baseline.hash,
        before.matchesExpectedTables,
        before.hasUnexpectedRelations,
        before.hasUnexpectedSchemas,
      )
    ) {
      throw new Error("Amsterdam schema verification failed");
    }
    console.log("AMS_SCHEMA_VERIFICATION PASSED");
    return;
  }

  if (
    migrationAlreadyApplied(
      before.migrationHistory,
      baseline.hash,
      before.matchesExpectedTables,
      before.hasUnexpectedRelations,
      before.hasUnexpectedSchemas,
    )
  ) {
    console.log("AMS_BASELINE_ALREADY_APPLIED; no database writes performed");
    return;
  }

  if (
    !(
      before.report.safeForEmptyBaseline === true &&
      !before.hasRows &&
      before.publicTableNames.length === 0
    )
  ) {
    throw new Error(
      "Amsterdam target is not empty; refusing to apply the baseline",
    );
  }

  currentStage = "storage-smoke-test";
  const storageCheck = await runPrivateBucketSmokeTest();
  console.log("AMS_STORAGE_CHECK", JSON.stringify(storageCheck));
  if (
    storageCheck.smokeTest !== "passed" ||
    storageCheck.cleanupConfirmed !== true
  ) {
    throw new Error(
      "private Amsterdam object storage was not verified; refusing schema initialization",
    );
  }

  currentStage = "apply-baseline";
  execFileSync(
    "npm",
    ["run", "migrate", "--workspace", "@workspace/db"],
    {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  currentStage = "inspect-after";
  const after = await inspectDatabase(baseline.tableNames, true);
  console.log(
    "AMS_DATABASE_AFTER",
    JSON.stringify({
      ...after.report,
      baselineHashPrefix: baseline.hash.slice(0, 12),
    }),
  );
  if (
    !migrationAlreadyApplied(
      after.migrationHistory,
      baseline.hash,
      after.matchesExpectedTables,
      after.hasUnexpectedRelations,
      after.hasUnexpectedSchemas,
    ) ||
    after.publicTableNames.length !== 54
  ) {
    throw new Error("Amsterdam baseline post-migration verification failed");
  }
  console.log(
    "AMS_SCHEMA_BASELINE_APPLIED; publicTables=54; DDL_only=true",
  );
}

try {
  await main();
} catch (error) {
  const candidate = error as { code?: unknown } | null;
  console.error(
    "AMS_SCHEMA_SETUP_FAILED",
    JSON.stringify({
      stage: currentStage,
      errorName: error instanceof Error ? error.name : "unknown",
      errorCode:
        typeof candidate?.code === "string" &&
        /^[A-Za-z0-9_-]{1,40}$/.test(candidate.code)
          ? candidate.code
          : undefined,
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => undefined);
}
