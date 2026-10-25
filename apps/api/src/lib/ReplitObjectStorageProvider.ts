import { Readable } from "node:stream";
import { File, Storage, type FileMetadata } from "@google-cloud/storage";
import type {
  ObjectStorageInventoryEntry,
  ObjectStorageCustomMetadata,
  ObjectStorageMetadata,
  ObjectStorageObjectRef,
  ObjectStorageProvider,
  ObjectStorageRange,
} from "./objectStorageProvider";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const PRIVATE_OBJECT_KEY_PREFIX = "/objects/";
const PUBLIC_REF_PREFIX = "replit-public:";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ReplitObjectStorageProvider implements ObjectStorageProvider {
  getPublicObjectSearchPaths(): string[] {
    const paths = Array.from(
      new Set(
        (process.env.PUBLIC_OBJECT_SEARCH_PATHS ?? "")
          .split(",")
          .map((path) => path.trim())
          .filter(Boolean),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS is not configured for Replit object storage.",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR ?? "";
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR is not configured for Replit object storage.");
    }
    return dir;
  }

  async createReadCapability(
    object: ObjectStorageObjectRef,
    ttlSeconds: number,
  ): Promise<string> {
    const file = this.fileFor(object);
    return signObjectURL({
      bucketName: file.bucket.name,
      objectName: file.name,
      method: "GET",
      ttlSec: ttlSeconds,
    });
  }

  async createWriteCapability(
    objectPath: string,
    ttlSeconds: number,
  ): Promise<string> {
    const { bucketName, objectName } = this.privateObjectPathToGcs(objectPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: ttlSeconds,
    });
  }

  normalizeObjectPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir.endsWith("/")) privateObjectDir = `${privateObjectDir}/`;
    if (!rawObjectPath.startsWith(privateObjectDir)) return rawObjectPath;
    return `/objects/${rawObjectPath.slice(privateObjectDir.length)}`;
  }

  async headObject(
    object: ObjectStorageObjectRef,
  ): Promise<ObjectStorageMetadata | null> {
    const file = this.fileFor(object);
    try {
      const [metadata] = await file.getMetadata();
      return toObjectStorageMetadata(metadata);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  getObjectStream(
    object: ObjectStorageObjectRef,
    range?: ObjectStorageRange,
  ): Readable {
    const file = this.fileFor(object);
    return range
      ? file.createReadStream({ start: range.start, end: range.end })
      : file.createReadStream();
  }

  async updateObjectMetadata(
    object: ObjectStorageObjectRef,
    metadata: ObjectStorageCustomMetadata,
  ): Promise<void> {
    await this.fileFor(object).setMetadata({ metadata });
  }

  async deleteObject(object: ObjectStorageObjectRef): Promise<void> {
    await this.fileFor(object).delete();
  }

  async findPublicObject(
    filePath: string,
  ): Promise<ObjectStorageObjectRef | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    for (let index = 0; index < searchPaths.length; index += 1) {
      const file = this.fileFromPath(`${searchPaths[index]}/${filePath}`);
      const [exists] = await file.exists();
      if (exists) {
        const encodedPath = Buffer.from(filePath).toString("base64url");
        return { key: `${PUBLIC_REF_PREFIX}${index}:${encodedPath}` };
      }
    }
    return null;
  }

  async listPrivateObjects(
    prefix: string,
  ): Promise<ObjectStorageInventoryEntry[]> {
    if (!prefix.startsWith(PRIVATE_OBJECT_KEY_PREFIX)) {
      throw new Error("Private object inventory requires an /objects/ prefix.");
    }
    const privateDir = this.privateDirParts();
    const relativePrefix = prefix.slice(PRIVATE_OBJECT_KEY_PREFIX.length);
    let objectPrefix = [privateDir.prefix, relativePrefix]
      .filter(Boolean)
      .join("/");
    if (!objectPrefix.endsWith("/")) objectPrefix = `${objectPrefix}/`;
    const [files] = await objectStorageClient
      .bucket(privateDir.bucketName)
      .getFiles({ prefix: objectPrefix });

    const entries: ObjectStorageInventoryEntry[] = [];
    for (const file of files) {
      const metadata = file.metadata ?? (await file.getMetadata())[0];
      const relativeKey = privateDir.prefix
        ? file.name.slice(privateDir.prefix.length + 1)
        : file.name;
      entries.push({
        objectPath: `${PRIVATE_OBJECT_KEY_PREFIX}${relativeKey}`,
        metadata: toObjectStorageMetadata(metadata),
      });
    }
    return entries;
  }

  private fileFor(object: ObjectStorageObjectRef): File {
    if (object.key.startsWith(PUBLIC_REF_PREFIX)) {
      const match = /^replit-public:(\d+):([A-Za-z0-9_-]+)$/.exec(object.key);
      if (!match) throw new Error("Invalid public object reference.");
      const searchPath = this.getPublicObjectSearchPaths()[Number(match[1])];
      if (!searchPath) throw new Error("Public object search path is no longer configured.");
      const filePath = Buffer.from(match[2], "base64url").toString();
      return this.fileFromPath(`${searchPath}/${filePath}`);
    }
    return this.fileFromPath(this.privateObjectPathToGcsPath(object.key));
  }

  private privateObjectPathToGcs(objectPath: string): {
    bucketName: string;
    objectName: string;
  } {
    if (!objectPath.startsWith(PRIVATE_OBJECT_KEY_PREFIX)) {
      throw new Error("Private storage operations require an /objects/ key.");
    }
    const relativeKey = objectPath.slice(PRIVATE_OBJECT_KEY_PREFIX.length);
    if (!relativeKey || relativeKey.split("/").some((part) => part === "." || part === "..")) {
      throw new Error("Invalid private object key.");
    }
    return this.parseObjectPath(
      `${this.getPrivateObjectDir().replace(/\/+$/, "")}/${relativeKey}`,
    );
  }

  private privateObjectPathToGcsPath(objectPath: string): string {
    const { bucketName, objectName } = this.privateObjectPathToGcs(objectPath);
    return `/${bucketName}/${objectName}`;
  }

  private privateDirParts(): { bucketName: string; prefix: string } {
    const parts = this.getPrivateObjectDir().replace(/^\/+|\/+$/g, "").split("/");
    const bucketName = parts.shift();
    if (!bucketName || parts.length === 0) {
      throw new Error("PRIVATE_OBJECT_DIR must contain a bucket and object prefix.");
    }
    return { bucketName, prefix: parts.join("/") };
  }

  private fileFromPath(path: string): File {
    const { bucketName, objectName } = this.parseObjectPath(path);
    return objectStorageClient.bucket(bucketName).file(objectName);
  }

  private parseObjectPath(path: string): {
    bucketName: string;
    objectName: string;
  } {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const parts = normalized.split("/");
    if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
      throw new Error("Invalid object path.");
    }
    return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
  }
}

function toObjectStorageMetadata(metadata: FileMetadata): ObjectStorageMetadata {
  return {
    size: metadata.size,
    contentType: metadata.contentType,
    md5Hash: metadata.md5Hash,
    timeCreated: metadata.timeCreated,
    metadata: metadata.metadata as Record<string, unknown> | null | undefined,
  };
}

function isNotFound(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 404;
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT";
  ttlSec: number;
}): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to sign Replit object URL (HTTP ${response.status}).`,
    );
  }
  const result = (await response.json()) as { signed_url?: unknown };
  if (typeof result.signed_url !== "string" || !result.signed_url) {
    throw new Error("Replit object storage returned an invalid signed URL.");
  }
  return result.signed_url;
}
