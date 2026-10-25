import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const selectedRows: unknown[][] = [];
  const makeBuilder = () => {
    const builder: any = {};
    for (const method of ["from", "where"]) builder[method] = vi.fn(() => builder);
    builder.limit = vi.fn(async () => selectedRows.shift() ?? []);
    return builder;
  };
  const db = { select: vi.fn(() => makeBuilder()) };
  const userStorageObjects = new Proxy({}, {
    get: (_target, property) => `user_storage_objects.${String(property)}`,
  });
  return { selectedRows, db, userStorageObjects };
});

vi.mock("@workspace/db", () => ({
  db: mocks.db,
  userStorageObjects: mocks.userStorageObjects,
}));

import {
  mediaOwnershipMatches,
  requireOwnedPrivateMediaPath,
  type UserStorageOwnershipRecord,
} from "./user-storage-ownership";

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const path = "/objects/uploads/private-file";

function reservation(overrides: Partial<UserStorageOwnershipRecord> = {}): UserStorageOwnershipRecord {
  return {
    ownerUserId: ownerId,
    objectPath: path,
    purpose: "user_upload",
    status: "reserved",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.selectedRows.length = 0;
  mocks.db.select.mockClear();
});

describe("private media ownership manifest", () => {
  it("authorizes only the exact reserved path for its recorded owner", () => {
    expect(mediaOwnershipMatches(reservation(), { userId: ownerId, objectPath: path })).toBe(true);
    expect(mediaOwnershipMatches(reservation(), { userId: otherId, objectPath: path })).toBe(false);
    expect(mediaOwnershipMatches(reservation(), { userId: ownerId, objectPath: `${path}-changed` })).toBe(false);
  });

  it("rejects missing, inactive, and purpose-mismatched ownership records", () => {
    expect(mediaOwnershipMatches(undefined, { userId: ownerId, objectPath: path })).toBe(false);
    expect(mediaOwnershipMatches(reservation({ status: "queued" }), { userId: ownerId, objectPath: path })).toBe(false);
    expect(mediaOwnershipMatches(reservation({ status: "deleted" }), { userId: ownerId, objectPath: path })).toBe(false);
    expect(mediaOwnershipMatches(reservation(), {
      userId: ownerId, objectPath: path, allowedPurposes: ["qiraat_certificate"],
    })).toBe(false);
  });

  it("rejects a historical client-supplied path with no ownership manifest", async () => {
    mocks.selectedRows.push([]);
    await expect(requireOwnedPrivateMediaPath(ownerId, path))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a path owned by another authenticated user", async () => {
    mocks.selectedRows.push([reservation({ ownerUserId: otherId })]);
    await expect(requireOwnedPrivateMediaPath(ownerId, path))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts a finalized-purpose reservation only for its matching owner and purpose", async () => {
    mocks.selectedRows.push([reservation({ purpose: "qiraat_certificate" })]);
    await expect(requireOwnedPrivateMediaPath(ownerId, path, {
      allowedPurposes: ["qiraat_certificate"],
    })).resolves.toBeUndefined();
  });

  it("does not query ownership for an external URL", async () => {
    await expect(requireOwnedPrivateMediaPath(ownerId, "https://example.test/image.jpg"))
      .resolves.toBeUndefined();
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});