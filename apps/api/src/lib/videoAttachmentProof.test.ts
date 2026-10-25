import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFinalizedVideoAttachmentProof,
  createIssuedVideoAttachmentProof,
  verifyVideoAttachmentProof,
} from "@workspace/tabyan-trpc";

process.env.SESSION_SECRET ??= "video-attachment-proof-test-secret-32-bytes";

const now = 1_800_000_000_000;
const expectation = {
  userId: "teacher-1",
  role: "teacher" as const,
  purpose: "live_session_recording" as const,
  objectPath: "/objects/uploads/live-session-recordings/video-1",
};

test("live-session recording proof is user, role, purpose, path, and state bound", () => {
  const issued = createIssuedVideoAttachmentProof({ ...expectation, now });
  const decodedIssued = verifyVideoAttachmentProof(issued, {
    ...expectation,
    state: "issued",
  }, now + 1);
  assert.ok(decodedIssued);

  const finalized = createFinalizedVideoAttachmentProof({
    ...expectation,
    durationSeconds: 125.4,
    issuedAt: decodedIssued.issuedAt,
    nonce: decodedIssued.nonce,
    now: now + 2,
  });
  const decodedFinalized = verifyVideoAttachmentProof(finalized, {
    ...expectation,
    state: "finalized",
  }, now + 3);
  assert.equal(decodedFinalized?.durationSeconds, 125.4);
  assert.equal(decodedFinalized?.nonce, decodedIssued.nonce);

  assert.equal(verifyVideoAttachmentProof(finalized, {
    ...expectation,
    userId: "teacher-2",
    state: "finalized",
  }, now + 3), null);
  assert.equal(verifyVideoAttachmentProof(finalized, {
    ...expectation,
    purpose: "teacher_kyc_video",
    state: "finalized",
  }, now + 3), null);
  assert.equal(verifyVideoAttachmentProof(finalized, {
    ...expectation,
    objectPath: `${expectation.objectPath}-other`,
    state: "finalized",
  }, now + 3), null);
  assert.equal(verifyVideoAttachmentProof(finalized, {
    ...expectation,
    state: "issued",
  }, now + 3), null);
});

test("video attachment proof rejects tampering and expiry", () => {
  const issued = createIssuedVideoAttachmentProof({ ...expectation, now });
  const [payload, signature] = issued.split(".");
  const tampered = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`;
  assert.equal(verifyVideoAttachmentProof(tampered, {
    ...expectation,
    state: "issued",
  }, now + 1), null);
  assert.equal(verifyVideoAttachmentProof(issued, {
    ...expectation,
    state: "issued",
  }, now + 15 * 60 * 1000), null);
});