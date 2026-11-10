import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { pool } from "@workspace/db";
import { appRouter, createContext } from "@workspace/tabyan-trpc";
import router from "./http/routes";
import { logger } from "./lib/logger";
import { expectedPublicTables } from "./http/databaseSchemaExpectations";

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

// The phone loads Mushaf pages, word data and fonts from the API origin. A
// deployed API serves them with the built site; local Vite has the files and
// the API process does not, so development serves the repo copy directly.
if (process.env.NODE_ENV === "development") {
  const mushafDir = path.resolve(process.cwd(), "../web/public/mushaf");
  if (existsSync(mushafDir)) {
    app.use("/mushaf", express.static(mushafDir, { index: false, fallthrough: true }));
  } else {
    logger.warn({ mushafDir }, "Mushaf assets not found; recitation cannot load the Quran text");
  }
}

// In a single-service deployment the API also serves the built web apps, so
// the site, its API and cookies share one origin. Unset in local development,
// where Vite serves the web app and proxies /api here.
function serveSpa(mountPath: string, distDir: string | undefined) {
  if (!distDir) return;
  const root = path.resolve(distDir);
  const indexHtml = path.join(root, "index.html");
  if (!existsSync(indexHtml)) {
    logger.warn({ mountPath, root }, "Web build not found; not serving it");
    return;
  }
  app.use(mountPath, express.static(root, {
    index: false,
    setHeaders(res, filePath) {
      // Vite fingerprints everything under assets/, so it can be cached for good.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));
  app.use(mountPath, (req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
}

serveSpa("/tabyan-staff-preview", process.env.TABYAN_STAFF_PREVIEW_DIST);
serveSpa("/", process.env.TABYAN_WEB_DIST);

export default app;
