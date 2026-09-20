import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const videoAttachmentPurposeSchema = z.enum([
  "student_placement_video",
  "teacher_kyc_video",
]);

export type VideoAttachmentPurpose = z.infer<typeof videoAttachmentPurposeSchema>;
export type VideoAttachmentProofState = "issued" | "finalized";

export type VideoAttachmentProofPayload = {
  version: 1;
  state: VideoAttachmentProofState;
  userId: string;
  role: "student" | "teacher";
  purpose: VideoAttachmentPurpose;
  objectPath: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  durationSeconds?: number;
};

export type VideoAttachmentProofExpectation = {
  userId: string;
  role: "student" | "teacher";
  purpose: VideoAttachmentPurpose;
  objectPath: string;
  state: VideoAttachmentProofState;
};

const ISSUED_PROOF_TTL_MS = 15 * 60 * 1000;
const FINALIZED_PROOF_TTL_MS = 60 * 60 * 1000;

function proofSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("video attachment proof secret is unavailable");
  }
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string): string {
  return createHmac("sha256", proofSecret())
    .update(`tabyan-video-attachment-v1.${payload}`)
    .digest("base64url");
}

function serialize(payload: VideoAttachmentProofPayload): string {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

function newPayload(
  input: Omit<VideoAttachmentProofPayload, "version" | "state" | "issuedAt" | "expiresAt" | "nonce">,
  state: VideoAttachmentProofState,
  expiresAt: number,
  issuedAt = Date.now(),
  nonce: string = randomUUID(),
): VideoAttachmentProofPayload {
  return {
    ...input,
    version: 1,
    state,
    issuedAt,
    expiresAt,
    nonce,
  };
}

export function createIssuedVideoAttachmentProof(input: {
  userId: string;
  role: "student" | "teacher";
  purpose: VideoAttachmentPurpose;
  objectPath: string;
  now?: number;
}): string {
  const now = input.now ?? Date.now();
  return serialize(newPayload({
    userId: input.userId,
    role: input.role,
    purpose: input.purpose,
    objectPath: input.objectPath,
  }, "issued", now + ISSUED_PROOF_TTL_MS, now));
}

export function createFinalizedVideoAttachmentProof(input: {
  userId: string;
  role: "student" | "teacher";
  purpose: VideoAttachmentPurpose;
  objectPath: string;
  durationSeconds: number;
  issuedAt?: number;
  nonce?: string;
  now?: number;
}): string {
  const now = input.now ?? Date.now();
  return serialize(newPayload({
    userId: input.userId,
    role: input.role,
    purpose: input.purpose,
    objectPath: input.objectPath,
    durationSeconds: input.durationSeconds,
  }, "finalized", now + FINALIZED_PROOF_TTL_MS, input.issuedAt ?? now, input.nonce ?? randomUUID()));
}

export function verifyVideoAttachmentProof(
  proof: string,
  expected: VideoAttachmentProofExpectation,
  now = Date.now(),
): VideoAttachmentProofPayload | null {
  try {
    const [encodedPayload, providedSignature] = proof.split(".");
    if (!encodedPayload || !providedSignature || proof.length > 8192) return null;
    const expectedSignature = signature(encodedPayload);
    const providedBytes = Buffer.from(providedSignature, "base64url");
    const expectedBytes = Buffer.from(expectedSignature, "base64url");
    if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return null;

    const payload = JSON.parse(decode(encodedPayload)) as Partial<VideoAttachmentProofPayload>;
    if (
      payload.version !== 1
      || payload.state !== expected.state
      || payload.userId !== expected.userId
      || payload.role !== expected.role
      || payload.purpose !== expected.purpose
      || payload.objectPath !== expected.objectPath
      || typeof payload.issuedAt !== "number"
      || typeof payload.expiresAt !== "number"
      || typeof payload.nonce !== "string"
      || payload.expiresAt <= now
      || payload.issuedAt > now + 60_000
    ) return null;
    if (expected.state === "finalized" && (typeof payload.durationSeconds !== "number" || !Number.isFinite(payload.durationSeconds))) {
      return null;
    }
    return payload as VideoAttachmentProofPayload;
  } catch {
    return null;
  }
}

export function videoProofDurationIsPlacementSafe(durationSeconds: number): boolean {
  return Number.isFinite(durationSeconds) && durationSeconds >= 45 && durationSeconds <= 300;
}