import { and, gt, inArray, ne } from "drizzle-orm";
import { schedule } from "node-cron";
import { db, recitationAssignments, recitationSessions } from "@workspace/db";
import { recitationAudioObjectPath } from "@workspace/tabyan-trpc/recitation-contract";
import { logger } from "../lib/logger";
import { ObjectNotFoundError } from "../storage/objectStorage";
import { objectStorageService } from "../storage/objectStorageRuntime";
import { recitationAudioSessionId, recitationAudioToDelete } from "./recitationAudioRetention";

const RECORDINGS_PREFIX = "/objects/uploads/recitation-audio/";
// A finished attempt may still be submitted for a while; until then its audio stays.
export const UNSUBMITTED_GRACE_MS = 6 * 60 * 60 * 1000;

export async function runRecitationAudioCleanup(now = new Date()): Promise<void> {
  try {
    const entries = await objectStorageService.listPrivateObjects(RECORDINGS_PREFIX);
    const sessionIds = entries.map((entry) => recitationAudioSessionId(entry.objectPath)).filter((id): id is string => !!id);
    if (!sessionIds.length) return;
    const submitted = new Set((await db.select({ id: recitationAssignments.sessionId }).from(recitationAssignments)
      .where(and(inArray(recitationAssignments.sessionId, sessionIds), ne(recitationAssignments.status, "cancelled"))))
      .map((row) => row.id).filter((id): id is string => !!id));
    const recent = new Set((await db.select({ id: recitationSessions.id }).from(recitationSessions)
      .where(and(inArray(recitationSessions.id, sessionIds), gt(recitationSessions.startedAt, new Date(now.getTime() - UNSUBMITTED_GRACE_MS)))))
      .map((row) => row.id));
    for (const sessionId of recitationAudioToDelete(sessionIds, submitted, recent)) {
      try {
        await objectStorageService.deleteObjectEntity(recitationAudioObjectPath(sessionId));
      } catch (error) {
        if (!(error instanceof ObjectNotFoundError)) logger.warn({ err: error, sessionId }, "recitation audio was not deleted");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "recitation audio cleanup failed");
  }
}

export function startRecitationAudioCleanupScheduler(): void {
  schedule("17 * * * *", () => {
    void runRecitationAudioCleanup();
  });
  logger.info("recitation audio cleanup scheduler started (cron: hourly)");
}
