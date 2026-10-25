import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { pool } from "@workspace/db";
import { appRouter, createContext } from "@workspace/tabyan-trpc";
import router from "./routes";
import { logger } from "./lib/logger";
import { expectedPublicTables } from "./databaseSchemaExpectations";

const app: Express = express();
const diagnosticRequestIdPattern = /^[A-Za-z0-9_-]{8,80}$/;

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readiness", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    const tableResult = await pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const actualPublicTables = new Set(
      tableResult.rows.map((row) => row.table_name),
    );
    const missingTables = [...expectedPublicTables].filter(
      (tableName) => !actualPublicTables.has(tableName),
    );
    const unexpectedTables = [...actualPublicTables].filter(
      (tableName) => !expectedPublicTables.has(tableName),
    );
    const historyTableResult = await pool.query<{ present: boolean }>(
      `SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`,
    );
    const historyTablePresent = historyTableResult.rows[0]?.present === true;
    let migrationHistoryCount = 0;
    if (historyTablePresent) {
      const historyResult = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations`,
      );
      migrationHistoryCount = Number(historyResult.rows[0]?.count ?? 0);
    }

    const schemaReady =
      missingTables.length === 0 && unexpectedTables.length === 0;
    const migrationHistoryReady =
      historyTablePresent && migrationHistoryCount > 0;
    if (!schemaReady || !migrationHistoryReady) {
      logger.warn(
        {
          expectedTableCount: expectedPublicTables.size,
          actualTableCount: actualPublicTables.size,
          missingTables,
          unexpectedTables,
          migrationHistoryCount,
        },
        "Database schema readiness check failed",
      );
      res.status(503).json({
        status: "not_ready",
        checks: {
          database: "ok",
          schema: schemaReady ? "ok" : "incomplete",
          migrationHistory: migrationHistoryReady ? "ok" : "missing",
        },
      });
      return;
    }

    res.status(200).json({
      status: "ready",
      checks: {
        database: "ok",
        schema: "ok",
        migrationHistory: "ok",
      },
      tableCount: actualPublicTables.size,
    });
  } catch {
    res.status(503).json({
      status: "not_ready",
      checks: { database: "unavailable" },
    });
  }
});

function normalizeOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

const configuredCorsOrigins = new Set(
  [
    "https://tibyanquran.com",
    "https://www.tibyanquran.com",
    ...(process.env.TABYAN_ALLOWED_ORIGINS ?? "").split(","),
    process.env.EXPO_PUBLIC_DOMAIN,
  ].map((value) => normalizeOrigin(value)).filter((value): value is string => !!value),
);

function isAllowedCorsOrigin(value: string): boolean {
  const origin = normalizeOrigin(value);
  if (!origin) return false;
  if (configuredCorsOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (process.env.NODE_ENV !== "production"
      && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          // Playback capabilities are bearer credentials for one object —
          // keep them out of access logs like query-string tokens.
          url: req.url?.split("?")[0]
            ?.replace(/\/(placement|media)-playback\/[^/]+$/, "/$1-playback/[capability]"),
          diagnosticRequestId: typeof req.headers["x-diagnostic-request-id"] === "string"
            && diagnosticRequestIdPattern.test(req.headers["x-diagnostic-request-id"])
            ? req.headers["x-diagnostic-request-id"]
            : undefined,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isAllowedCorsOrigin(origin) ? origin : false);
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
