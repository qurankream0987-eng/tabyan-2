import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db, userStorageObjects } from "@workspace/db";

export type UserStorageOwnershipRecord = {
  ownerUserId: string | null;
  objectPath: string;
  purpose: string;
  status: string;
};

export type OwnershipExpectation = {
  userId: string;
  objectPath: string;
  allowedPurposes?: readonly string[];
};

const PRIVATE_OBJECT_PATH = /^\/objects\/(?!.*\.\.)[\w\-./]+$/;

export function mediaOwnershipMatches(
  record: UserStorageOwnershipRecord | null | undefined,
  expected: OwnershipExpectation,
): boolean {
  return Boolean(
    record
    && record.ownerUserId === expected.userId
    && record.objectPath === expected.objectPath
    && record.status === "reserved"
    && (!expected.allowedPurposes || expected.allowedPurposes.includes(record.purpose)),
  );
}

/**
 * Enforce ownership before storing a client-supplied reference to private media.
 * Non-storage URLs remain valid for fields that also support external media.
 */
export async function requireOwnedPrivateMediaPath(
  userId: string,
  value: string | null | undefined,
  options: { allowedPurposes?: readonly string[] } = {},
): Promise<void> {
  if (!value) return;

  if (!value.startsWith("/objects")) {
    if (value.includes("/objects/")) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "استخدم مسار الملف الداخلي فقط" });
    }
    return;
  }
  if (!PRIVATE_OBJECT_PATH.test(value)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "مسار الملف غير صالح" });
  }

  const [record] = await db.select({
    ownerUserId: userStorageObjects.ownerUserId,
    objectPath: userStorageObjects.objectPath,
    purpose: userStorageObjects.purpose,
    status: userStorageObjects.status,
  }).from(userStorageObjects).where(eq(userStorageObjects.objectPath, value)).limit(1);

  if (!mediaOwnershipMatches(record, {
    userId,
    objectPath: value,
    allowedPurposes: options.allowedPurposes,
  })) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مسموح بهذا الإجراء" });
  }
}