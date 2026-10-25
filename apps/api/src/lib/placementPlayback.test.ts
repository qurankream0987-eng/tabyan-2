import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMediaPlaybackCapability,
  createPlacementPlaybackCapability,
  decodeMediaPlaybackCapability,
  MEDIA_PLAYBACK_TTL_SECONDS,
  decodePlacementPlaybackCapability,
  PLACEMENT_PLAYBACK_TTL_SECONDS,
  placementDiagnosticObjectFingerprint,
} from "./placementPlayback";

process.env.SESSION_SECRET ??= "placement-playback-test-secret-32-bytes";

const input = {
  objectPath: "/objects/uploads/placement-video-1",
  userId: "admin-1",
  role: "admin",
  diagnosticId: "diagnostic-123",
};

test("placement playback capability is opaque, stateless, and decodable in a fresh context", () => {
  const now = 1_800_000_000_000;
  const token = createPlacementPlaybackCapability({ ...input, now });
  assert.equal(token.includes(input.objectPath), false);
  assert.equal(token.includes(input.userId), false);
  assert.equal(token.split(".").length, 4);

  const decoded = decodePlacementPlaybackCapability(token, now + 1);
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.equal(decoded.payload.objectPath, input.objectPath);
    assert.equal(decoded.payload.purpose, "placement_playback");
    assert.equal(decoded.payload.expiresAt, now + PLACEMENT_PLAYBACK_TTL_SECONDS * 1000);
  }
});

test("tampering and expiry are rejected without process-local state", () => {
  const now = 1_800_000_000_000;
  const token = createPlacementPlaybackCapability({ ...input, now });
  const parts = token.split(".");
  parts[1] = `${parts[1].slice(0, -1)}${parts[1].endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(decodePlacementPlaybackCapability(parts.join("."), now), {
    ok: false,
    reason: "SIGNATURE_INVALID",
  });
  assert.deepEqual(
    decodePlacementPlaybackCapability(token, now + PLACEMENT_PLAYBACK_TTL_SECONDS * 1000),
    { ok: false, reason: "TOKEN_EXPIRED" },
  );
});

test("placement diagnostic fingerprint is stable, opaque, and path-bound", () => {
  const first = placementDiagnosticObjectFingerprint(input.objectPath);
  const repeated = placementDiagnosticObjectFingerprint(input.objectPath);
  const different = placementDiagnosticObjectFingerprint("/objects/uploads/placement-video-2");

  assert.match(first, /^[0-9a-f]{32}$/);
  assert.equal(repeated, first);
  assert.notEqual(different, first);
  assert.equal(first.includes(input.objectPath), false);
  assert.equal(first.includes(input.userId), false);
});

test("media playback capability is bound to its purpose and object", () => {
  const now = 1_800_000_000_000;
  const media = createMediaPlaybackCapability({
    objectPath: "/objects/uploads/live-session-recordings/rec-1",
    userId: "student-1",
    role: "student",
    now,
  });
  const decoded = decodeMediaPlaybackCapability(media, now + 1);
  assert.equal(decoded.ok, true);
  if (decoded.ok) {
    assert.equal(decoded.payload.purpose, "media_playback");
    assert.equal(decoded.payload.objectPath, "/objects/uploads/live-session-recordings/rec-1");
    assert.equal(decoded.payload.expiresAt, now + MEDIA_PLAYBACK_TTL_SECONDS * 1000);
  }
  // A media capability cannot be replayed against the placement route and vice versa.
  assert.deepEqual(decodePlacementPlaybackCapability(media, now + 1), { ok: false, reason: "PURPOSE_MISMATCH" });
  const placement = createPlacementPlaybackCapability({ ...input, now });
  assert.deepEqual(decodeMediaPlaybackCapability(placement, now + 1), { ok: false, reason: "PURPOSE_MISMATCH" });
  assert.deepEqual(decodeMediaPlaybackCapability(media, now + MEDIA_PLAYBACK_TTL_SECONDS * 1000), { ok: false, reason: "TOKEN_EXPIRED" });
  assert.throws(() => createMediaPlaybackCapability({ objectPath: "/objects/../secret", userId: "u", role: "student", now }));
});
