import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  canAccessObject,
  objectAclMetadata,
  parseObjectAclPolicy,
  type ObjectAclPolicy,
  ObjectPermission,
} from "./objectAcl";
import type {
  ObjectStorageInventoryEntry,
  ObjectStorageMetadata,
  ObjectStorageObjectRef,
  ObjectStorageProvider,
  ObjectStorageRange,
} from "./objectStorageProvider";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export type UploadObjectScope =
  | "default"
  | "live_session_recording"
  | "book_pdf";

export type ObjectEntityUploadCapability = {
  uploadURL: string;
  objectPath: string;
};

export class ObjectStorageService {
  constructor(
    private readonly provider: ObjectStorageProvider,
  ) {}

  getPublicObjectSearchPaths(): string[] {
    return this.provider.getPublicObjectSearchPaths();
  }

  getPrivateObjectDir(): string {
    return this.provider.getPrivateObjectDir();
  }

  async searchPublicObject(
    filePath: string,
  ): Promise<ObjectStorageObjectRef | null> {
    return this.provider.findPublicObject(filePath);
  }

  async listPrivateObjects(
    prefix = "/objects/",
  ): Promise<ObjectStorageInventoryEntry[]> {
    return this.provider.listPrivateObjects(prefix);
  }

  async downloadObject(
    object: ObjectStorageObjectRef,
    cacheTtlSec = 3600,
    range?: ObjectStorageRange & { total: number },
    knownMetadata?: ObjectStorageMetadata,
  ): Promise<Response> {
    const metadata = knownMetadata ?? (await this.provider.headObject(object));
    if (!metadata) throw new ObjectNotFoundError();

    const aclPolicy = parseObjectAclPolicy(metadata);
    const isPublic = aclPolicy?.visibility === "public";
    const nodeStream = this.provider.getObjectStream(
      object,
      range ? { start: range.start, end: range.end } : undefined,
    );
    // Wait for the first byte before committing HTTP headers so transient
    // upstream resets can still be retried by callers.
    await waitForFirstByte(nodeStream);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      "Accept-Ranges": "bytes",
    };
    if (metadata.size) {
      headers["Content-Length"] = String(
        range
          ? range.end - range.start + 1
          : metadata.size,
      );
    }
    if (range) {
      headers["Content-Range"] =
        `bytes ${range.start}-${range.end}/${range.total}`;
    }
    return new Response(webStream, { status: range ? 206 : 200, headers });
  }

  async createObjectEntityUploadCapability(
    scope: UploadObjectScope = "default",
  ): Promise<ObjectEntityUploadCapability> {
    const folder =
      scope === "live_session_recording"
        ? "uploads/live-session-recordings"
        : scope === "book_pdf"
          ? "uploads/books"
          : "uploads";
    const objectPath = `/objects/${folder}/${randomUUID()}`;
    const uploadURL = await this.provider.createWriteCapability(objectPath, 900);
    return { uploadURL, objectPath };
  }

  async getObjectEntityUploadURL(
    scope: UploadObjectScope = "default",
  ): Promise<string> {
    return (await this.createObjectEntityUploadCapability(scope)).uploadURL;
  }

  async createObjectEntityReadCapability(
    objectPath: string,
    ttlSeconds: number,
  ): Promise<string> {
    return this.provider.createReadCapability(
      this.objectEntityFileHandle(objectPath),
      ttlSeconds,
    );
  }

  /** Opaque handle; only the selected storage provider interprets its key. */
  objectEntityFileHandle(objectPath: string): ObjectStorageObjectRef {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    return { key: objectPath };
  }

  async getObjectEntityWithMetadata(
    objectPath: string,
  ): Promise<{ file: ObjectStorageObjectRef; metadata: ObjectStorageMetadata }> {
    const file = this.objectEntityFileHandle(objectPath);
    const metadata = await this.provider.headObject(file);
    if (!metadata) throw new ObjectNotFoundError();
    return { file, metadata };
  }

  async getObjectEntityMetadata(
    objectPath: string,
  ): Promise<ObjectStorageMetadata> {
    return (await this.getObjectEntityWithMetadata(objectPath)).metadata;
  }

  async getObjectEntityFile(
    objectPath: string,
  ): Promise<ObjectStorageObjectRef> {
    const { file } = await this.getObjectEntityWithMetadata(objectPath);
    return file;
  }

  async getObjectEntityAclPolicy(
    objectPath: string,
  ): Promise<ObjectAclPolicy | null> {
    return parseObjectAclPolicy(
      await this.getObjectEntityMetadata(objectPath),
    );
  }

  normalizeObjectEntityPath(rawPath: string): string {
    return this.provider.normalizeObjectPath(rawPath);
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const object = this.objectEntityFileHandle(normalizedPath);
    const metadata = await this.provider.headObject(object);
    if (!metadata) throw new ObjectNotFoundError();
    await this.provider.updateObjectMetadata(
      object,
      objectAclMetadata(aclPolicy),
    );
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: ObjectStorageObjectRef;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    const metadata = await this.provider.headObject(objectFile);
    if (!metadata) throw new ObjectNotFoundError();
    return canAccessObject({
      userId,
      aclPolicy: parseObjectAclPolicy(metadata),
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  /** Deletes a private object and confirms its absence before DB completion. */
  async deleteObjectEntity(objectPath: string): Promise<void> {
    const object = this.objectEntityFileHandle(objectPath);
    if (!(await this.provider.headObject(object))) {
      throw new ObjectNotFoundError();
    }
    await this.provider.deleteObject(object);
    if (await this.provider.headObject(object)) {
      throw new Error("Object deletion was not confirmed");
    }
  }
}

async function waitForFirstByte(stream: Readable): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      stream.off("error", onError);
      stream.off("end", onEnd);
      stream.off("data", onData);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onData = (chunk: Buffer) => {
      stream.pause();
      cleanup();
      stream.unshift(chunk);
      resolve();
    };
    stream.once("error", onError);
    stream.once("end", onEnd);
    stream.once("data", onData);
  });
}
