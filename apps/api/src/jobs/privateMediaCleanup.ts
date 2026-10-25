import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { schedule } from "node-cron";
import {
  accountDeletionRequests,
  db,
  privateMediaDeletionJobs,
  recordings,
  sessionParticipants,
  userStorageObjects,
} from "@workspace/db";
import {
  canDeletePrivateMedia,
  mediaDeletionRetryDelayMs,
  type MediaDeletionReason,
} from "@workspace/tabyan-trpc/media-deletion-policy";
import { logger } from "../lib/logger";
import { ObjectNotFoundError, ObjectStorageService } from "../storage/objectStorage";
import { objectStorageService } from "../storage/objectStorageRuntime";

const storage = objectStorageService;
const BATCH_SIZE = 25;
const PROCESSING_LEASE_MS = 15 * 60 * 1000;

type CleanupJob = {
  id: string;
  requestId: string | null;
  ownerUserId: string | null;
  objectPath: string;
  deletionReason: string;
  mediaType: string;
  attempts: number;
};

type RetryUpdate = {
  status: "pending";
  attempts: number;
  notBefore: Date;
  lockedAt: null;
  lastErrorCode: string;
};

type CleanupDependencies = {
  db: typeof db;
  storage: Pick<ObjectStorageService, "deleteObjectEntity" | "getObjectEntityMetadata">;
  logger: Pick<typeof logger, "error" | "info" | "warn">;
};

const defaultDependencies: CleanupDependencies = { db, storage, logger };

function isPrivateObjectPath(path: string): boolean {
  return path.startsWith("/objects/") && !path.includes("..") && !path.includes("\\");
}

function isMediaDeletionReason(reason: string): reason is MediaDeletionReason {
  return reason === "automatic_retention"
    || reason === "account_deletion"
    || reason === "manual_admin_delete";
}

export function buildMediaDeletionRetryUpdate(
  previousAttempts: number,
  now: Date,
  lastErrorCode: string,
): RetryUpdate {
  const attempts = previousAttempts + 1;
  return {
    status: "pending",
    attempts,
    notBefore: new Date(now.getTime() + mediaDeletionRetryDelayMs(attempts)),
    lockedAt: null,
    lastErrorCode,
  };
}

/** Missing objects are an idempotent success; other storage failures must retry. */
export async function deleteObjectIfPresent(
  objectStorage: Pick<ObjectStorageService, "deleteObjectEntity">,
  objectPath: string,
): Promise<boolean> {
  try {
    await objectStorage.deleteObjectEntity(objectPath);
    return false;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return true;
    throw error;
  }
}

async function finishAccountDeletionRequest(dbClient: typeof db, requestId: string, now: Date): Promise<void> {
  await dbClient.transaction(async (tx) => {
    const [outstanding] = await tx.select({ id: privateMediaDeletionJobs.id })
      .from(privateMediaDeletionJobs).where(and(
        eq(privateMediaDeletionJobs.requestId, requestId),
        inArray(privateMediaDeletionJobs.status, ["pending", "processing"]),
      )).limit(1);
    if (outstanding) return;

    const [request] = await tx.select({ userId: accountDeletionRequests.userId })
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.id, requestId))
      .limit(1);
    if (!request) return;

    if (request.userId) {
      // Preserve only the anonymous manifest/status needed for shared media;
      // object ownership is removed after all requested deletions settle.
      await tx.update(userStorageObjects).set({ ownerUserId: null })
        .where(eq(userStorageObjects.ownerUserId, request.userId));
    }
    await tx.update(privateMediaDeletionJobs).set({ ownerUserId: null })
      .where(and(
        eq(privateMediaDeletionJobs.requestId, requestId),
        inArray(privateMediaDeletionJobs.status, ["completed", "retained"]),
      ));
    await tx.update(accountDeletionRequests).set({
      status: "completed",
      completedAt: now,
      userId: null,
      requestedByUserId: null,
    }).where(eq(accountDeletionRequests.id, requestId));
  });
}

async function retainBlockedJob(
  dbClient: typeof db,
  log: CleanupDependencies["logger"],
  job: CleanupJob,
  now: Date,
  errorCode: string,
  staleBefore: Date,
  claimedByThisRun = false,
): Promise<void> {
  const [retained] = await dbClient.update(privateMediaDeletionJobs).set({
    status: "retained",
    lockedAt: null,
    completedAt: now,
    lastErrorCode: errorCode,
  }).where(and(
    eq(privateMediaDeletionJobs.id, job.id),
    or(
      eq(privateMediaDeletionJobs.status, "pending"),
      and(
        eq(privateMediaDeletionJobs.status, "processing"),
        claimedByThisRun
          ? eq(privateMediaDeletionJobs.lockedAt, now)
          : or(
            isNull(privateMediaDeletionJobs.lockedAt),
            lte(privateMediaDeletionJobs.lockedAt, staleBefore),
          ),
      ),
    ),
  )).returning({ id: privateMediaDeletionJobs.id });
  if (!retained) return;

  if (job.requestId && job.ownerUserId) {
    await dbClient.update(userStorageObjects).set({ status: "retained" })
      .where(and(
        eq(userStorageObjects.objectPath, job.objectPath),
        eq(userStorageObjects.ownerUserId, job.ownerUserId),
      ));
  }
  log.warn({
    deletionJobId: job.id,
    deletionReason: job.deletionReason,
    mediaType: job.mediaType,
    errorCode,
  }, "private media deletion blocked; object retained");
  if (job.requestId) await finishAccountDeletionRequest(dbClient, job.requestId, now);
}

async function completeJob(
  dbClient: typeof db,
  job: CleanupJob,
  now: Date,
  wasAlreadyMissing: boolean,
): Promise<void> {
  await dbClient.transaction(async (tx) => {
    await tx.update(privateMediaDeletionJobs).set({
      status: "completed",
      lockedAt: null,
      ownerUserId: job.requestId ? job.ownerUserId : null,
      completedAt: now,
      lastErrorCode: wasAlreadyMissing ? "object_missing" : null,
    }).where(eq(privateMediaDeletionJobs.id, job.id));

    await tx.update(userStorageObjects).set({
      status: "deleted",
      deletedAt: now,
      ...(job.requestId ? {} : { ownerUserId: null }),
    }).where(eq(userStorageObjects.objectPath, job.objectPath));
  });
  if (job.requestId) await finishAccountDeletionRequest(dbClient, job.requestId, now);
}

async function hasOtherLegitimateParticipant(
  dbClient: typeof db,
  objectPath: string,
  deletingUserId: string,
): Promise<boolean> {
  const linkedRecordings = await dbClient.select({
    sessionId: recordings.sessionId,
    teacherId: recordings.teacherId,
    studentId: recordings.studentId,
  }).from(recordings).where(and(
    eq(recordings.videoUrl, objectPath),
    eq(recordings.status, "ready"),
    eq(recordings.isDeleted, false),
  ));
  if (!linkedRecordings.length) return false;
  const sessionIds = [...new Set(linkedRecordings.map((row) => row.sessionId))];
  const participants = sessionIds.length
    ? await dbClient.select({
      sessionId: sessionParticipants.sessionId,
      studentId: sessionParticipants.studentId,
    }).from(sessionParticipants).where(inArray(sessionParticipants.sessionId, sessionIds))
    : [];

  return linkedRecordings.some((recording) =>
    (recording.teacherId != null && recording.teacherId !== deletingUserId)
    || (recording.studentId != null && recording.studentId !== deletingUserId)
    || participants.some((participant) =>
      participant.sessionId === recording.sessionId && participant.studentId !== deletingUserId));
}

async function retryJob(
  dbClient: typeof db,
  log: CleanupDependencies["logger"],
  job: CleanupJob,
  now: Date,
  errorCode: string,
): Promise<void> {
  const retry = buildMediaDeletionRetryUpdate(job.attempts, now, errorCode);
  await dbClient.update(privateMediaDeletionJobs).set(retry).where(and(
    eq(privateMediaDeletionJobs.id, job.id),
    eq(privateMediaDeletionJobs.status, "processing"),
  ));
  log.error({
    deletionJobId: job.id,
    requestId: job.requestId,
    attempts: retry.attempts,
    errorCode,
  }, "private media cleanup failed; retry scheduled");
}

async function processClaimedJob(
  dependencies: CleanupDependencies,
  job: CleanupJob,
  now: Date,
  staleBefore: Date,
): Promise<void> {
  const { db: dbClient, storage: objectStorage, logger: log } = dependencies;
  if (!isPrivateObjectPath(job.objectPath)) {
    await retainBlockedJob(dbClient, log, job, now, "invalid_private_object_path", staleBefore, true);
    return;
  }
  if (!isMediaDeletionReason(job.deletionReason)) {
    await retainBlockedJob(dbClient, log, job, now, "unknown_deletion_reason", staleBefore, true);
    return;
  }

  try {
    const [manifest] = await dbClient.select({
      ownerUserId: userStorageObjects.ownerUserId,
      purpose: userStorageObjects.purpose,
      status: userStorageObjects.status,
    }).from(userStorageObjects)
      .where(eq(userStorageObjects.objectPath, job.objectPath))
      .limit(1);
    const ownershipProven = Boolean(
      job.ownerUserId
      && manifest?.ownerUserId === job.ownerUserId
      && manifest.status !== "deleted",
    );
    let requestMatchesOwner = job.deletionReason === "automatic_retention" && !job.requestId;
    let manualAdminAuthorized = false;

    if (job.requestId) {
      const [request] = await dbClient.select({
        userId: accountDeletionRequests.userId,
        requestedByUserId: accountDeletionRequests.requestedByUserId,
        requestedByRole: accountDeletionRequests.requestedByRole,
      }).from(accountDeletionRequests)
        .where(eq(accountDeletionRequests.id, job.requestId))
        .limit(1);
      requestMatchesOwner = Boolean(
        request
        && request.userId
        && request.userId === job.ownerUserId,
      );
      if (job.deletionReason === "account_deletion") {
        requestMatchesOwner = Boolean(
          requestMatchesOwner
          && request?.requestedByRole === "student"
          && request.requestedByUserId === request.userId,
        );
      } else if (job.deletionReason === "manual_admin_delete") {
        manualAdminAuthorized = Boolean(
          requestMatchesOwner
          && request?.requestedByRole === "admin"
          && request.requestedByUserId
          && request.requestedByUserId !== request.userId,
        );
        requestMatchesOwner = manualAdminAuthorized;
      }
    }

    const isShared = job.deletionReason === "automatic_retention" || !job.ownerUserId
      ? false
      : await hasOtherLegitimateParticipant(dbClient, job.objectPath, job.ownerUserId);
    const isPrivate = Boolean(manifest && manifest.purpose !== "book_pdf");
    const preflightAllowed = canDeletePrivateMedia({
      reason: job.deletionReason,
      mediaType: job.mediaType,
      objectPath: job.objectPath,
      ownershipProven: ownershipProven && requestMatchesOwner,
      isPrivate,
      isShared,
      manualAdminAuthorized,
    });
    if (!preflightAllowed) {
      const errorCode = !ownershipProven || !requestMatchesOwner
        ? "ownership_unproven_unresolved"
        : isShared
          ? "shared_recording_retained_for_other_participant"
          : !isPrivate
            ? "shared_library_asset_retained"
            : job.deletionReason === "automatic_retention"
              ? "video_retention_disabled_or_type_not_allowed"
              : "deletion_policy_denied";
      await retainBlockedJob(dbClient, log, job, now, errorCode, staleBefore, true);
      return;
    }

    if (job.deletionReason === "automatic_retention") {
      let contentType: string | null = null;
      try {
        const metadata = await objectStorage.getObjectEntityMetadata(job.objectPath);
        contentType = metadata.contentType ?? null;
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          await completeJob(dbClient, job, now, true);
          return;
        }
        await retryJob(dbClient, log, job, now, "storage_metadata_check_failed");
        return;
      }

      if (!canDeletePrivateMedia({
        reason: job.deletionReason,
        mediaType: job.mediaType,
        objectPath: job.objectPath,
        ownershipProven: ownershipProven && requestMatchesOwner,
        isPrivate,
        isShared,
        contentType,
      })) {
        await retainBlockedJob(dbClient, log, job, now, "video_retention_disabled_or_type_not_allowed", staleBefore, true);
        return;
      }
    }

    try {
      const wasAlreadyMissing = await deleteObjectIfPresent(objectStorage, job.objectPath);
      await completeJob(dbClient, job, now, wasAlreadyMissing);
      log.info({
        deletionJobId: job.id,
        deletionReason: job.deletionReason,
        mediaType: job.mediaType,
        wasAlreadyMissing,
      }, "private media cleanup completed");
    } catch (error) {
      await retryJob(dbClient, log, job, now, "storage_delete_failed");
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      await completeJob(dbClient, job, now, true);
      return;
    }
    await retryJob(dbClient, log, job, now, "ownership_or_policy_check_failed");
  }
}

export async function runPrivateMediaCleanupJob(
  dependencies: CleanupDependencies = defaultDependencies,
): Promise<void> {
  const { db: dbClient, logger: log } = dependencies;
  const now = new Date();
  try {
    const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);
    const due = await dbClient.select({
      id: privateMediaDeletionJobs.id,
      requestId: privateMediaDeletionJobs.requestId,
      ownerUserId: privateMediaDeletionJobs.ownerUserId,
      objectPath: privateMediaDeletionJobs.objectPath,
      deletionReason: privateMediaDeletionJobs.deletionReason,
      mediaType: privateMediaDeletionJobs.mediaType,
      attempts: privateMediaDeletionJobs.attempts,
    }).from(privateMediaDeletionJobs).where(and(
      lte(privateMediaDeletionJobs.notBefore, now),
      or(
        eq(privateMediaDeletionJobs.status, "pending"),
        and(
          eq(privateMediaDeletionJobs.status, "processing"),
          or(
            isNull(privateMediaDeletionJobs.lockedAt),
            lte(privateMediaDeletionJobs.lockedAt, staleBefore),
          ),
        ),
      ),
    )).limit(BATCH_SIZE);

    for (const candidate of due as CleanupJob[]) {
      if (!isPrivateObjectPath(candidate.objectPath)) {
        await retainBlockedJob(dbClient, log, candidate, now, "invalid_private_object_path", staleBefore);
        continue;
      }

      const [claimed] = await dbClient.update(privateMediaDeletionJobs).set({
        status: "processing",
        lockedAt: now,
      }).where(and(
        eq(privateMediaDeletionJobs.id, candidate.id),
        lte(privateMediaDeletionJobs.notBefore, now),
        or(
          eq(privateMediaDeletionJobs.status, "pending"),
          and(
            eq(privateMediaDeletionJobs.status, "processing"),
            or(
              isNull(privateMediaDeletionJobs.lockedAt),
              lte(privateMediaDeletionJobs.lockedAt, staleBefore),
            ),
          ),
        ),
      )).returning({
        id: privateMediaDeletionJobs.id,
        requestId: privateMediaDeletionJobs.requestId,
        ownerUserId: privateMediaDeletionJobs.ownerUserId,
        objectPath: privateMediaDeletionJobs.objectPath,
        deletionReason: privateMediaDeletionJobs.deletionReason,
        mediaType: privateMediaDeletionJobs.mediaType,
        attempts: privateMediaDeletionJobs.attempts,
      });
      if (claimed) await processClaimedJob(dependencies, claimed, now, staleBefore);
    }
  } catch (error) {
    log.error({
      errName: error instanceof Error ? error.name : "unknown",
    }, "privateMediaCleanupJob failed");
  }
}

export function startPrivateMediaCleanupScheduler(): void {
  void runPrivateMediaCleanupJob();
  schedule("*/5 * * * *", () => {
    void runPrivateMediaCleanupJob();
  });
  logger.info("private media cleanup scheduler started (cron: every 5 minutes)");
}