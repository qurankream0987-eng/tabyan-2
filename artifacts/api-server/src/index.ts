import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { assertFfprobeAvailable, ffprobeRuntimePath } from "./lib/videoStructure";
import { startSessionReminderScheduler } from "./scheduler/sessionReminder";
import { startRecordingRetentionScheduler } from "./scheduler/recordingRetention";
import { attachSessionCallSignaling } from "./signaling";
import { attachRecitationRealtime } from "./recitationRealtime";

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

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  startSessionReminderScheduler();
  startRecordingRetentionScheduler();
});
