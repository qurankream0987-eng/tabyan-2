import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { ObjectStorageService } from "./objectStorage";
import type {
  ObjectStorageMetadata,
  ObjectStorageObjectRef,
  ObjectStorageProvider,
  ObjectStorageRange,
} from "./objectStorageProvider";

class MemoryStorageProvider implements ObjectStorageProvider {
  readonly metadata = new Map<string, ObjectStorageMetadata>();
  readonly calls: Array<{ method: string; value?: unknown }> = [];

  getPublicObjectSearchPaths(): string[] {
    return ["/public/assets"];
  }

  getPrivateObjectDir(): string {
    return "/private/bucket";
  }

  async createReadCapability(object: ObjectStorageObjectRef, ttlSeconds: number): Promise<string> {
    this.calls.push({ method: "createReadCapability", value: { object, ttlSeconds } });
    return `read:${object.key}`;
  }

  async createWriteCapability(objectPath: string, ttlSeconds: number): Promise<string> {
    this.calls.push({ method: "createWriteCapability", value: { objectPath, ttlSeconds } });
    return `write:${objectPath}`;
  }

  normalizeObjectPath(rawPath: string): string {
    return rawPath;
  }

  async headObject(object: ObjectStorageObjectRef): Promise<ObjectStorageMetadata | null> {
    return this.metadata.get(object.key) ?? null;
  }

  getObjectStream(object: ObjectStorageObjectRef, range?: ObjectStorageRange): Readable {
    this.calls.push({ method: "getObjectStream", value: { object, range } });
    const allBytes = Buffer.from("abcdef");
    return Readable.from([range ? allBytes.subarray(range.start, range.end + 1) : allBytes]);
  }

  async updateObjectMetadata(
    object: ObjectStorageObjectRef,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    const current = this.metadata.get(object.key);
    if (!current) throw new Error("missing");
    this.metadata.set(object.key, {
      ...current,
      metadata: { ...current.metadata, ...metadata },
    });
  }

  async deleteObject(object: ObjectStorageObjectRef): Promise<void> {
    this.metadata.delete(object.key);
  }

  async findPublicObject(): Promise<ObjectStorageObjectRef | null> {
    return null;
  }

  async listPrivateObjects(): Promise<[]> {
    return [];
  }
}

test("upload capabilities keep stable logical paths and a 15-minute expiry", async () => {
  const provider = new MemoryStorageProvider();
  const storage = new ObjectStorageService(provider);

  const capability = await storage.createObjectEntityUploadCapability("book_pdf");

  assert.match(capability.objectPath, /^\/objects\/uploads\/books\/[0-9a-f-]{36}$/i);
  assert.equal(capability.uploadURL, `write:${capability.objectPath}`);
  assert.deepEqual(provider.calls[0], {
    method: "createWriteCapability",
    value: { objectPath: capability.objectPath, ttlSeconds: 900 },
  });
});

test("download responses preserve metadata, Range semantics, and provider opacity", async () => {
  const provider = new MemoryStorageProvider();
  const objectPath = "/objects/uploads/video-1";
  provider.metadata.set(objectPath, {
    size: 6,
    contentType: "video/mp4",
    metadata: {
      "custom:aclPolicy": JSON.stringify({ owner: "user-1", visibility: "public" }),
    },
  });
  const storage = new ObjectStorageService(provider);
  const object = await storage.getObjectEntityFile(objectPath);

  const response = await storage.downloadObject(
    object,
    0,
    { start: 1, end: 3, total: 6 },
  );

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("content-range"), "bytes 1-3/6");
  assert.equal(response.headers.get("content-length"), "3");
  assert.equal(response.headers.get("cache-control"), "public, max-age=0");
  assert.equal(await response.text(), "bcd");
  assert.deepEqual(provider.calls.at(-1), {
    method: "getObjectStream",
    value: { object, range: { start: 1, end: 3 } },
  });
});

test("ACL metadata updates and private deletion stay behind the provider boundary", async () => {
  const provider = new MemoryStorageProvider();
  const objectPath = "/objects/uploads/video-2";
  provider.metadata.set(objectPath, { size: 3, contentType: "video/mp4" });
  const storage = new ObjectStorageService(provider);

  await storage.trySetObjectEntityAclPolicy(objectPath, {
    owner: "user-2",
    visibility: "private",
  });
  assert.equal(
    await storage.canAccessObjectEntity({
      userId: "user-2",
      objectFile: { key: objectPath },
    }),
    true,
  );
  await storage.deleteObjectEntity(objectPath);
  await assert.rejects(
    storage.getObjectEntityFile(objectPath),
    { name: "ObjectNotFoundError" },
  );
});
