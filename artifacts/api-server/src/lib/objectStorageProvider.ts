import type { Readable } from "node:stream";

export type ObjectStorageObjectRef = {
  /** Opaque logical key. Callers must not parse provider-specific keys. */
  key: string;
};

export type ObjectStorageMetadata = {
  size?: string | number;
  contentType?: string;
  md5Hash?: string;
  timeCreated?: string;
  metadata?: Record<string, unknown> | null;
};

export type ObjectStorageRange = {
  start: number;
  end: number;
};

export type ObjectStorageCustomMetadata = Record<
  string,
  string | number | boolean | null
>;

export type ObjectStorageInventoryEntry = {
  objectPath: string;
  metadata: ObjectStorageMetadata;
};

/**
 * Provider boundary for Tabyan's object storage. Application code uses
 * logical object keys and metadata; only an adapter knows its storage host.
 */
export interface ObjectStorageProvider {
  getPublicObjectSearchPaths(): string[];
  getPrivateObjectDir(): string;
  createReadCapability(
    object: ObjectStorageObjectRef,
    ttlSeconds: number,
  ): Promise<string>;
  createWriteCapability(
    objectPath: string,
    ttlSeconds: number,
  ): Promise<string>;
  normalizeObjectPath(rawPath: string): string;
  headObject(
    object: ObjectStorageObjectRef,
  ): Promise<ObjectStorageMetadata | null>;
  getObjectStream(
    object: ObjectStorageObjectRef,
    range?: ObjectStorageRange,
  ): Readable;
  updateObjectMetadata(
    object: ObjectStorageObjectRef,
    metadata: ObjectStorageCustomMetadata,
  ): Promise<void>;
  deleteObject(object: ObjectStorageObjectRef): Promise<void>;
  findPublicObject(filePath: string): Promise<ObjectStorageObjectRef | null>;
  listPrivateObjects(prefix: string): Promise<ObjectStorageInventoryEntry[]>;
}
