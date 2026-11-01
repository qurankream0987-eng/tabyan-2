import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { assertFfprobeAvailable, ffprobeRuntimePath } from "./media/videoStructure";
import { startSessionReminderScheduler } from "./jobs/sessionReminder";
import { startPrivateMediaCleanupScheduler } from "./jobs/privateMediaCleanup";
import { startRecitationAudioCleanupScheduler } from "./jobs/recitationAudioCleanup";
import { attachSessionCallSignaling } from "./realtime/signaling";
import { attachRecitationRealtime } from "./realtime/recitationRealtime";
import { attachNabrQrcGateway } from "./realtime/nabrQrcGateway";
import { stopTarteelWhisperWorker } from "./recitation-providers/TarteelWhisperWorker";

/* فحص إقلاع: غياب ffprobe يعطّل التحقق الخادمي من سلامة الفيديو —
   يُسجَّل خطأ صريح عند بدء التشغيل بدلاً من رفض فيديوهات صالحة لاحقاً */
if (!assertFfprobeAvailable()) {
  logger.error({ ffprobePath: ffprobeRuntimePath() }, "ffprobe binary unavailable — video upload validation is degraded; check ffprobe-static installation");
} else {
  logger.info({ ffprobePath: ffprobeRuntimePath() }, "ffprobe ready — video upload validation enabled");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
attachSessionCallSignaling(server);
attachRecitationRealtime(server);
attachNabrQrcGateway(server);

async function startSchedulersAfterReadiness(): Promise<void> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/readiness`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      logger.error(
        { status: response.status },
        "Internal readiness check failed; background schedulers remain stopped",
      );
      return;
    }

    const readiness = await response.json() as {
      tableCount?: number;
    };
    logger.info(
      { tableCount: readiness.tableCount },
      "Internal /readiness check passed",
    );

    if (process.env.TABYAN_SCHEDULERS_ENABLED !== "true") {
      logger.info("Background schedulers are disabled by configuration");
      return;
    }

    startSessionReminderScheduler();
    startPrivateMediaCleanupScheduler();
    startRecitationAudioCleanupScheduler();
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "unknown" },
      "Internal readiness check failed; background schedulers remain stopped",
    );
  }
}

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  logger.info(
    {
      activeStorageProvider:
        process.env.TABYAN_OBJECT_STORAGE_PROVIDER?.trim() || "replit",
      schedulersEnabled:
        process.env.TABYAN_SCHEDULERS_ENABLED === "true",
    },
    "Runtime startup configuration",
  );
  void startSchedulersAfterReadiness();
});

process.once("SIGTERM", () => {
  stopTarteelWhisperWorker();
  process.exit(0);
});
process.once("SIGINT", () => {
  stopTarteelWhisperWorker();
  process.exit(130);
});
