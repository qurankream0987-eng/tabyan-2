import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountDeletionRequests,
  privateMediaDeletionJobs,
} from "@workspace/db";
import {
  buildMediaDeletionRetryUpdate,
  deleteObjectIfPresent,
  runPrivateMediaCleanupJob,
} from "./privateMediaCleanup";
import { ObjectNotFoundError } from "../lib/objectStorage";

type TestJob = {
  id: string;
  requestId: string | null;
  ownerUserId: string | null;
  objectPath: string;
  deletionReason: string;
  mediaType: string;
  attempts: number;
};

function makeDb(
  selectSteps: unknown[][],
  returningSteps: unknown[][] = [],
) {
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const db: any = {
    select: () => {
      const result = selectSteps.shift() ?? [];
      const builder: any = {
        from: () => builder,
        where: () => builder,
        limit: async () => result,
        then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject),
      };
      return builder;
    },
    update: (table: unknown) => {
      let values: Record<string, unknown> = {};
      const builder: any = {
        set: (next: Record<string, unknown>) => {
          values = next;
          updates.push({ table, values });
          return builder;
        },
        where: () => builder,
        returning: async () => returningSteps.shift() ?? [],
        then: (resolve: (value: undefined) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(undefined).then(resolve, reject),
      };
      return builder;
    },
    transaction: async (callback: (tx: unknown) => unknown) => callback(db),
  };
  return { db, updates };
}

function makeJob(overrides: Partial<TestJob> = {}): TestJob {
  return {
    id: "job-1",
    requestId: "request-1",
    ownerUserId: "student-1",
    objectPath: "/objects/private/placement-video.mp4",
    deletionReason: "account_deletion",
    mediaType: "placement_video",
    attempts: 0,
    ...overrides,
  };
}

function makeDependencies(db: unknown, storage: unknown) {
  const log = { error() {}, info() {}, warn() {} };
  return { db, storage, logger: log } as never;
}

function accountDeletionSelectSteps(
  job: TestJob,
  manifest: Record<string, unknown>,
  request: Record<string, unknown>,
  recordingRows: unknown[] = [],
): unknown[][] {
  return [
    [job],
    [manifest],
    [request],
    recordingRows,
    [], // no pending/processing jobs remain
    [{ userId: job.ownerUserId }],
    [], // a rerun sees no due work
  ];
}

test("explicit account deletion deletes an owned private video, then a worker rerun is a no-op", async () => {
  const job = makeJob();
  const { db } = makeDb(
    accountDeletionSelectSteps(job, {
      ownerUserId: job.ownerUserId,
      purpose: "student_placement_video",
      status: "queued",
    }, {
      userId: job.ownerUserId,
      requestedByUserId: job.ownerUserId,
      requestedByRole: "student",
    }),
    [[job]],
  );
  let objectExists = true;
  let deletionCalls = 0;
  const storage = {
    async deleteObjectEntity() {
      deletionCalls += 1;
      objectExists = false;
    },
    async getObjectEntityMetadata() {
      throw new Error("explicit deletion should not need an automatic-retention MIME probe");
    },
  };
  const dependencies = makeDependencies(db, storage);

  await runPrivateMediaCleanupJob(dependencies);
  await runPrivateMediaCleanupJob(dependencies);

  assert.equal(objectExists, false);
  assert.equal(deletionCalls, 1);
});

test("an already-missing object is an idempotent deletion success", async () => {
  let objectExists = true;
  const storage = {
    async deleteObjectEntity() {
      if (!objectExists) throw new ObjectNotFoundError();
      objectExists = false;
    },
  };

  assert.equal(await deleteObjectIfPresent(storage, "/objects/private/item.bin"), false);
  assert.equal(await deleteObjectIfPresent(storage, "/objects/private/item.bin"), true);
  assert.equal(objectExists, false);
});

test("a temporary storage failure leaves the deletion job retryable and does not complete its request", async () => {
  const job = makeJob();
  const { db, updates } = makeDb([
    [job],
    [{ ownerUserId: job.ownerUserId, purpose: "student_placement_video", status: "queued" }],
    [{
      userId: job.ownerUserId,
      requestedByUserId: job.ownerUserId,
      requestedByRole: "student",
    }],
    [],
  ], [[job]]);
  const storage = {
    async deleteObjectEntity() {
      throw new Error("temporary storage outage");
    },
    async getObjectEntityMetadata() {
      throw new Error("explicit deletion should not need an automatic-retention MIME probe");
    },
  };

  await runPrivateMediaCleanupJob(makeDependencies(db, storage));

  assert.ok(updates.some(({ table, values }) =>
    table === privateMediaDeletionJobs
    && values.status === "pending"
    && values.attempts === 1
    && values.lastErrorCode === "storage_delete_failed"));
  assert.equal(updates.some(({ table, values }) =>
    table === accountDeletionRequests && values.status === "completed"), false);
});

test("a proven owner mismatch is retained as unresolved without touching object storage", async () => {
  const job = makeJob();
  const { db, updates } = makeDb([
    [job],
    [{ ownerUserId: "different-owner", purpose: "student_placement_video", status: "reserved" }],
    [{
      userId: job.ownerUserId,
      requestedByUserId: job.ownerUserId,
      requestedByRole: "student",
    }],
    [],
    [],
    [{ userId: job.ownerUserId }],
  ], [[job], [{ id: job.id }]]);
  let deletionCalls = 0;
  const storage = {
    async deleteObjectEntity() {
      deletionCalls += 1;
    },
    async getObjectEntityMetadata() {
      throw new Error("not expected");
    },
  };

  await runPrivateMediaCleanupJob(makeDependencies(db, storage));

  assert.equal(deletionCalls, 0);
  assert.ok(updates.some(({ table, values }) =>
    table === privateMediaDeletionJobs
    && values.status === "retained"
    && values.lastErrorCode === "ownership_unproven_unresolved"));
});

test("another linked participant's live recording is retained instead of blindly deleted", async () => {
  const job = makeJob({
    mediaType: "live_session_recording",
    objectPath: "/objects/private/session.mp4",
  });
  const sessionId = "session-1";
  const { db, updates } = makeDb([
    [job],
    [{ ownerUserId: job.ownerUserId, purpose: "live_session_recording", status: "queued" }],
    [{
      userId: job.ownerUserId,
      requestedByUserId: job.ownerUserId,
      requestedByRole: "student",
    }],
    [{
      sessionId,
      teacherId: null,
      studentId: job.ownerUserId,
    }],
    [{ sessionId, studentId: "other-student" }],
    [],
    [{ userId: job.ownerUserId }],
  ], [[job], [{ id: job.id }]]);
  let deletionCalls = 0;
  const storage = {
    async deleteObjectEntity() {
      deletionCalls += 1;
    },
    async getObjectEntityMetadata() {
      throw new Error("not expected");
    },
  };

  await runPrivateMediaCleanupJob(makeDependencies(db, storage));

  assert.equal(deletionCalls, 0);
  assert.ok(updates.some(({ table, values }) =>
    table === privateMediaDeletionJobs
    && values.status === "retained"
    && values.lastErrorCode === "shared_recording_retained_for_other_participant"));
});

const automaticVideoCases = [
  ["placement", "placement_video", "student_placement_video"],
  ["teacher verification", "verification_video", "teacher_kyc_video"],
  ["session recording", "session_recording", "live_session_recording"],
] as const;

for (const [label, mediaType, purpose] of automaticVideoCases) {
  test(`automatic retention blocks ${label} video`, async () => {
    const job = makeJob({
      requestId: null,
      deletionReason: "automatic_retention",
      mediaType,
    });
    const { db, updates } = makeDb([
      [job],
      [{ ownerUserId: job.ownerUserId, purpose, status: "reserved" }],
    ], [[job], [{ id: job.id }]]);
    let deletionCalls = 0;
    const storage = {
      async deleteObjectEntity() {
        deletionCalls += 1;
      },
      async getObjectEntityMetadata() {
        throw new Error("video policy should block before a storage read");
      },
    };

    await runPrivateMediaCleanupJob(makeDependencies(db, storage));

    assert.equal(deletionCalls, 0);
    assert.ok(updates.some(({ table, values }) =>
      table === privateMediaDeletionJobs && values.status === "retained"));
  });
}

test("retry delay remains bounded and the retry patch never marks a job complete", () => {
  const now = new Date("2026-10-02T12:00:00.000Z");
  const retry = buildMediaDeletionRetryUpdate(2, now, "storage_delete_failed");
  assert.equal(retry.status, "pending");
  assert.equal(retry.attempts, 3);
  assert.equal(retry.lastErrorCode, "storage_delete_failed");
  assert.ok(retry.notBefore.getTime() > now.getTime());
  assert.equal("completedAt" in retry, false);
});