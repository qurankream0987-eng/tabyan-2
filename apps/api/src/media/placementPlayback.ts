import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

export const PLACEMENT_PLAYBACK_TTL_SECONDS = 15 * 60;
export const MEDIA_PLAYBACK_TTL_SECONDS = 15 * 60;
export const PLACEMENT_DIAGNOSTIC_VERSION = "fingerprint-v1";

/**
 * placement_playback: admin placement review (unchanged contract).
 * media_playback: every other private Web <video>/<audio> — the capability
 * replaces the long-lived app bearer token that used to sit in `?token=`.
 */
export type PlaybackCapabilityPurpose = "placement_playback" | "media_playback";

export type PlacementPlaybackCapabilityPayload = {
  version: 1;
  objectPath: string;
  userId: string;
  role: string;
  purpose: PlaybackCapabilityPurpose;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  diagnosticId: string | null;
};

const placementObjectPathSchema = z.string().regex(/^\/objects\/uploads\/(?!.*\.\.)[\w-]+$/);
/** Media objects may live in the dedicated recording/book prefixes. */
export const mediaObjectPathSchema = z.string().regex(/^\/objects\/uploads\/(?:(?:live-session-recordings|books)\/)?[\w-]+$/);
const capabilityPayloadSchema = z.object({
  version: z.literal(1),
  objectPath: mediaObjectPathSchema,
  userId: z.string().min(1).max(200),
  role: z.string().min(1).max(40),
  purpose: z.enum(["placement_playback", "media_playback"]),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  nonce: z.string().uuid(),
  diagnosticId: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/).nullable(),
});

const PLACEMENT_DIAGNOSTIC_DOMAIN = "placement-diagnostic-object-v1";

export type PlacementPlaybackCapabilityFailure =
  | "TOKEN_NOT_FOUND"
  | "TOKEN_EXPIRED"
  | "SIGNATURE_INVALID"
  | "PURPOSE_MISMATCH"
  | "OBJECT_MISMATCH";

type CapabilityResult =
  | { ok: true; payload: PlacementPlaybackCapabilityPayload }
  | { ok: false; reason: PlacementPlaybackCapabilityFailure };

function capabilitySecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("placement playback capability secret is unavailable");
  }
  return secret;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`tabyan-placement-playback-encryption-v1:${capabilitySecret()}`)
    .digest();
}

function signingKey() {
  return createHash("sha256")
    .update(`tabyan-placement-playback-signing-v1:${capabilitySecret()}`)
    .digest();
}

function diagnosticKey() {
  return createHash("sha256")
    .update(`${PLACEMENT_DIAGNOSTIC_DOMAIN}:${capabilitySecret()}`)
    .digest();
}

/**
 * Returns a server-only, non-reversible identifier for one canonical object.
 * The raw object path must never be placed in diagnostic logs or public URLs.
 */
export function placementDiagnosticObjectFingerprint(objectPath: string): string {
  const canonicalPath = placementObjectPathSchema.parse(objectPath);
  return createHmac("sha256", diagnosticKey())
    .update(canonicalPath, "utf8")
    .digest("hex")
    .slice(0, 32);
}

function sign(body: string) {
  return createHmac("sha256", signingKey())
    .update(`tabyan-placement-playback-v1.${body}`)
    .digest("base64url");
}

/**
 * Creates a stateless opaque capability. AES-GCM keeps object/user fields out
 * of the URL; the additional HMAC makes the signed-capability contract
 * explicit and allows tampering to be classified before decryption.
 */
export function createPlacementPlaybackCapability(input: {
  objectPath: string;
  userId: string;
  role: string;
  diagnosticId: string | null;
  now?: number;
}): string {
  return createPlaybackCapability({ ...input, purpose: "placement_playback" });
}

export function createMediaPlaybackCapability(input: {
  objectPath: string;
  userId: string;
  role: string;
  now?: number;
}): string {
  return createPlaybackCapability({ ...input, diagnosticId: null, purpose: "media_playback" });
}

function createPlaybackCapability(input: {
  objectPath: string;
  userId: string;
  role: string;
  diagnosticId: string | null;
  purpose: PlaybackCapabilityPurpose;
  now?: number;
}): string {
  const now = input.now ?? Date.now();
  const ttlSeconds = input.purpose === "placement_playback"
    ? PLACEMENT_PLAYBACK_TTL_SECONDS
    : MEDIA_PLAYBACK_TTL_SECONDS;
  const payload: PlacementPlaybackCapabilityPayload = {
    version: 1,
    objectPath: input.purpose === "placement_playback"
      ? placementObjectPathSchema.parse(input.objectPath)
      : mediaObjectPathSchema.parse(input.objectPath),
    userId: input.userId,
    role: input.role,
    purpose: input.purpose,
    issuedAt: now,
    expiresAt: now + ttlSeconds * 1000,
    nonce: randomUUID(),
    diagnosticId: input.diagnosticId,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const body = [
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
  return `${body}.${sign(body)}`;
}

export function decodePlacementPlaybackCapability(
  token: string | null | undefined,
  now = Date.now(),
): CapabilityResult {
  return decodePlaybackCapability(token, "placement_playback", now);
}

export function decodeMediaPlaybackCapability(
  token: string | null | undefined,
  now = Date.now(),
): CapabilityResult {
  return decodePlaybackCapability(token, "media_playback", now);
}

/** A capability minted for one purpose is never accepted by the other route. */
function decodePlaybackCapability(
  token: string | null | undefined,
  expectedPurpose: PlaybackCapabilityPurpose,
  now: number,
): CapabilityResult {
  if (!token) return { ok: false, reason: "TOKEN_NOT_FOUND" };
  const parts = token.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return { ok: false, reason: "SIGNATURE_INVALID" };
  }

  const body = parts.slice(0, 3).join(".");
  const actualSignature = Buffer.from(parts[3], "base64url");
  const expectedSignature = Buffer.from(sign(body), "base64url");
  if (
    actualSignature.length !== expectedSignature.length
    || !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return { ok: false, reason: "SIGNATURE_INVALID" };
  }

  try {
    const iv = Buffer.from(parts[0], "base64url");
    const ciphertext = Buffer.from(parts[1], "base64url");
    const authTag = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
      return { ok: false, reason: "SIGNATURE_INVALID" };
    }
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed = capabilityPayloadSchema.safeParse(JSON.parse(plaintext));
    if (!parsed.success) return { ok: false, reason: "SIGNATURE_INVALID" };
    if (parsed.data.purpose !== expectedPurpose) {
      return { ok: false, reason: "PURPOSE_MISMATCH" };
    }
    if (
      expectedPurpose === "placement_playback"
      && !placementObjectPathSchema.safeParse(parsed.data.objectPath).success
    ) {
      return { ok: false, reason: "OBJECT_MISMATCH" };
    }
    if (parsed.data.expiresAt <= now) {
      return { ok: false, reason: "TOKEN_EXPIRED" };
    }
    return { ok: true, payload: parsed.data };
  } catch {
    return { ok: false, reason: "SIGNATURE_INVALID" };
  }
}