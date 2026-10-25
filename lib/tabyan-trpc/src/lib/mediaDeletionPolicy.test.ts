import { describe, expect, it } from "vitest";
import {
  canDeletePrivateMedia,
  isAutomaticallyDeletableMediaType,
  isProtectedVideoMediaType,
  mediaDeletionRetryDelayMs,
} from "./mediaDeletionPolicy";

describe("reason-specific private media deletion policy", () => {
  it.each([
    "placement_video",
    "verification_video",
    "promotion_video",
    "session_recording",
    "live_session_recording",
    "student_placement_video",
    "teacher_kyc_video",
  ])("refuses automatic retention for protected video type %s", (mediaType) => {
    expect(isProtectedVideoMediaType(mediaType)).toBe(true);
    expect(isAutomaticallyDeletableMediaType(mediaType)).toBe(false);
    expect(canDeletePrivateMedia({
      reason: "automatic_retention",
      mediaType,
      objectPath: "/objects/video.mp4",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
      contentType: "video/mp4",
    })).toBe(false);
  });

  it.each(["user_upload", "book_pdf", "qiraat_certificate", "unknown"])(
    "fails closed for ambiguous or non-private media type %s",
    (mediaType) => {
      expect(isAutomaticallyDeletableMediaType(mediaType)).toBe(false);
      expect(canDeletePrivateMedia({
        reason: "automatic_retention",
        mediaType,
        objectPath: "/objects/item.bin",
        ownershipProven: true,
        isPrivate: true,
        isShared: false,
      })).toBe(false);
    },
  );

  it("allows explicit account deletion of a proven private video, not automatic retention", () => {
    const candidate = {
      mediaType: "placement_video",
      objectPath: "/objects/placement.mp4",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
      contentType: "video/mp4",
    };
    expect(canDeletePrivateMedia({ ...candidate, reason: "automatic_retention" })).toBe(false);
    expect(canDeletePrivateMedia({ ...candidate, reason: "account_deletion" })).toBe(true);
  });

  it("allows account deletion of proven-owned private objects with unknown media types", () => {
    expect(canDeletePrivateMedia({
      reason: "account_deletion",
      mediaType: "other_private_media",
      objectPath: "/objects/uploads/opaque-id",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
      contentType: "application/octet-stream",
    })).toBe(true);
  });

  it("does not delete private media when ownership is unknown or another participant needs it", () => {
    const candidate = {
      reason: "account_deletion" as const,
      mediaType: "live_session_recording",
      objectPath: "/objects/session/recording.mp4",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
    };
    expect(canDeletePrivateMedia({ ...candidate, ownershipProven: false })).toBe(false);
    expect(canDeletePrivateMedia({ ...candidate, isShared: true })).toBe(false);
    expect(canDeletePrivateMedia({ ...candidate, isPrivate: false })).toBe(false);
  });

  it("keeps manual admin deletion distinct and requires an authorized admin workflow", () => {
    const candidate = {
      reason: "manual_admin_delete" as const,
      mediaType: "verification_video",
      objectPath: "/objects/teacher/kyc.mp4",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
    };
    expect(canDeletePrivateMedia(candidate)).toBe(false);
    expect(canDeletePrivateMedia({ ...candidate, manualAdminAuthorized: true })).toBe(true);
  });

  it("allows automatic deletion only for safe non-video allowlist types", () => {
    const base = {
      reason: "automatic_retention" as const,
      objectPath: "/objects/avatar.webp",
      ownershipProven: true,
      isPrivate: true,
      isShared: false,
      contentType: "image/webp",
    };
    expect(isAutomaticallyDeletableMediaType("profile_asset")).toBe(true);
    expect(canDeletePrivateMedia({ ...base, mediaType: "profile_asset" })).toBe(true);
    expect(canDeletePrivateMedia({ ...base, mediaType: "student_certificate" })).toBe(true);
    expect(canDeletePrivateMedia({ ...base, mediaType: "profile_asset", contentType: "video/mp4" })).toBe(false);
    expect(canDeletePrivateMedia({ ...base, mediaType: "user_upload" })).toBe(false);
  });

  it("keeps bounded retries for safe non-video cleanup jobs", () => {
    expect(mediaDeletionRetryDelayMs(1)).toBe(5 * 60 * 1000);
    expect(mediaDeletionRetryDelayMs(2)).toBe(10 * 60 * 1000);
    expect(mediaDeletionRetryDelayMs(10)).toBe(24 * 60 * 60 * 1000);
    expect(mediaDeletionRetryDelayMs(100)).toBe(24 * 60 * 60 * 1000);
  });
});