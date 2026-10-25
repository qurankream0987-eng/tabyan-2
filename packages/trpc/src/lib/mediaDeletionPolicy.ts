export const AUTOMATICALLY_DELETABLE_MEDIA_TYPES = [
  "profile_asset",
  "student_certificate",
] as const;

export type AutomaticallyDeletableMediaType =
  (typeof AUTOMATICALLY_DELETABLE_MEDIA_TYPES)[number];

export type MediaDeletionReason =
  | "automatic_retention"
  | "account_deletion"
  | "manual_admin_delete";

const PROTECTED_VIDEO_MEDIA_TYPES = new Set([
  "placement_video",
  "verification_video",
  "promotion_video",
  "session_recording",
  "live_session_recording",
  "student_placement_video",
  "teacher_kyc_video",
]);

const AUTOMATICALLY_DELETABLE_MEDIA_TYPE_SET: ReadonlySet<string> =
  new Set(AUTOMATICALLY_DELETABLE_MEDIA_TYPES);

export function isProtectedVideoMediaType(mediaType: string): boolean {
  return PROTECTED_VIDEO_MEDIA_TYPES.has(mediaType);
}

export function isAutomaticallyDeletableMediaType(
  mediaType: string,
): mediaType is AutomaticallyDeletableMediaType {
  return AUTOMATICALLY_DELETABLE_MEDIA_TYPE_SET.has(mediaType);
}

export function canDeletePrivateMedia(candidate: {
  reason: MediaDeletionReason;
  mediaType: string;
  objectPath: string;
  ownershipProven: boolean;
  isPrivate: boolean;
  isShared: boolean;
  manualAdminAuthorized?: boolean;
  contentType?: string | null;
}): boolean {
  if (
    !candidate.objectPath.startsWith("/objects/")
    || candidate.objectPath.includes("..")
    || candidate.objectPath.includes("\\")
    || !candidate.ownershipProven
    || !candidate.isPrivate
    || candidate.isShared
  ) return false;

  if (candidate.reason === "account_deletion") return true;
  if (candidate.reason === "manual_admin_delete") return candidate.manualAdminAuthorized === true;

  if (!isAutomaticallyDeletableMediaType(candidate.mediaType)) return false;

  const contentType = candidate.contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (contentType.startsWith("video/") || isProtectedVideoMediaType(candidate.mediaType)) return false;
  const path = candidate.objectPath.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  return !/\.(mp4|m4v|mov|webm|mkv|avi|3gp|mpeg|mpg)$/.test(path);
}

export function mediaDeletionRetryDelayMs(attempt: number): number {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  const retryBaseMs = 5 * 60 * 1000;
  const retryMaxMs = 24 * 60 * 60 * 1000;
  return Math.min(retryMaxMs, retryBaseMs * (2 ** Math.min(normalizedAttempt - 1, 10)));
}