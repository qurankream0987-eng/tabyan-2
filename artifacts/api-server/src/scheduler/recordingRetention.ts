import { schedule } from "node-cron";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db, recordings } from "@workspace/db";
import { logger } from "../lib/logger";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const storage = new ObjectStorageService();
const BATCH_SIZE = 25;

/**
 * Retention is deliberately object-first: the database remains readable until
 * cloud deletion has been confirmed, so a failed storage operation is retried
 * on the next daily pass instead of silently losing the evidence trail.
 */
export async function runRecordingRetentionJob(): Promise<void> {
  const now = new Date();
  try {
    const due = await db.select({
      id: recordings.id,
      videoUrl: recordings.videoUrl,
      retentionAttempts: recordings.retentionAttempts,
    }).from(recordings).where(and(
      eq(recordings.status, "ready"),
      eq(recordings.isDeleted, false),
      isNotNull(recordings.expiresAt),
      lte(recordings.expiresAt, now),
    )).limit(BATCH_SIZE);

    for (const recording of due) {
      try {
        await storage.deleteObjectEntity(recording.videoUrl);
        await db.update(recordings).set({
          isDeleted: true,
          deletedAt: now,
          retentionLastError: null,
        }).where(eq(recordings.id, recording.id));
        logger.info({ recordingId: recording.id }, "expired session recording deleted");
      } catch (err) {
        // A missing file is terminally absent, so it is safe to complete the
        // soft-delete while retaining no dangling playable reference.
        if (err instanceof ObjectNotFoundError) {
          await db.update(recordings).set({
            isDeleted: true,
            deletedAt: now,
            retentionLastError: "object_missing_before_retention",
          }).where(eq(recordings.id, recording.id));
          continue;
        }
        await db.update(recordings).set({
          retentionAttempts: (recording.retentionAttempts ?? 0) + 1,
          retentionLastError: err instanceof Error ? err.message.slice(0, 500) : "unknown_retention_error",
        }).where(eq(recordings.id, recording.id));
        logger.error({ err, recordingId: recording.id }, "session recording retention deletion failed");
      }
    }
  } catch (err) {
    logger.error({ err }, "recordingRetentionJob failed");
  }
}

export function startRecordingRetentionScheduler(): void {
  void runRecordingRetentionJob();
  // 03:17 UTC avoids clashing with the per-minute reminder scheduler.
  schedule("17 3 * * *", () => {
    void runRecordingRetentionJob();
  });
  logger.info("recording retention scheduler started (cron: daily)");
}