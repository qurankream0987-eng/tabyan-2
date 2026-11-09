import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { PassThrough, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type {
  ObjectStorageCustomMetadata,
  ObjectStorageInventoryEntry,
  ObjectStorageMetadata,
  ObjectStorageObjectRef,
  ObjectStorageProvider,
  ObjectStorageRange,
} from "./objectStorageProvider";

const PRIVATE_OBJECT_KEY_PREFIX = "/objects/";
const PUBLIC_REF_PREFIX = "railway-public:";
const MAX_PRESIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;
const METADATA_KEY_PREFIX = "tabyan-meta-";
const MD5_METADATA_KEY = "tabyan-md5-hash";

export type RailwayStorageConfig = {
  displayBucketName: string;
  bucket: string;
  deploymentRegion: string;
  region: string;
  endpoint: string;
  urlStyle: "path" | "virtual-host";
  accessKeyId: string;
  secretAccessKey: string;
  privatePrefix: string;
  publicPrefixes: string[];
  legacyPrivateObjectDir?: string;
};

type S3Signer = (
  client: S3Client,
  command: object,
  options: { expiresIn: number },
) => Promise<string>;

export class RailwayObjectStorageProvider implements ObjectStorageProvider {
  private readonly client: S3Client;
  private readonly sign: S3Signer;

  constructor(
    private readonly config: RailwayStorageConfig = readRailwayStorageConfig(),
    dependencies?: { client?: S3Client; sign?: S3Signer },
  ) {
    this.client =
      dependencies?.client ??
      new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.urlStyle === "path",
        // Presigned PUTs are signed before the body exists; the SDK's default
        // CRC32 of the empty body makes S3 reject the real upload (BadDigest).
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    this.sign =
      dependencies?.sign ??
      ((client, command, options) =>
        getSignedUrl(client, command as never, options));
  }

  getPublicObjectSearchPaths(): string[] {
    return this.config.publicPrefixes.map(
      (prefix) => `/${this.config.bucket}/${prefix}`,
    );
  }

  getPrivateObjectDir(): string {
    return `/${this.config.bucket}/${this.config.privatePrefix}`;
  }

  async createReadCapability(
    object: ObjectStorageObjectRef,
    ttlSeconds: number,
  ): Promise<string> {
    const { key } = this.fileFor(object);
    return this.presign(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      ttlSeconds,
    );
  }

  async createWriteCapability(
    objectPath: string,
    ttlSeconds: number,
  ): Promise<string> {
    const key = this.privateObjectPathToKey(objectPath);
    return this.presign(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key }),
      ttlSeconds,
    );
  }

  normalizeObjectPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    if (!this.config.legacyPrivateObjectDir) {
      throw new Error(
        "Cannot normalize a legacy GCS URL without TABYAN_LEGACY_PRIVATE_OBJECT_DIR.",
      );
    }

    const rawObjectPath = new URL(rawPath).pathname;
    let legacyDir = this.config.legacyPrivateObjectDir;
    if (!legacyDir.startsWith("/")) legacyDir = `/${legacyDir}`;
    if (!legacyDir.endsWith("/")) legacyDir = `${legacyDir}/`;
    if (!rawObjectPath.startsWith(legacyDir)) return rawObjectPath;
    return `${PRIVATE_OBJECT_KEY_PREFIX}${rawObjectPath.slice(legacyDir.length)}`;
  }

  async headObject(
    object: ObjectStorageObjectRef,
  ): Promise<ObjectStorageMetadata | null> {
    const { key } = this.fileFor(object);
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return toObjectStorageMetadata(result);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  getObjectStream(
    object: ObjectStorageObjectRef,
    range?: ObjectStorageRange,
  ): Readable {
    const { key } = this.fileFor(object);
    const output = new PassThrough();
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
    });

    void this.client
      .send(command)
      .then(async (result) => {
        const body = result.Body as unknown;
        if (!body) {
          output.end();
          return;
        }
        if (isNodeReadable(body)) {
          body.on("error", (error) => output.destroy(error));
          body.pipe(output);
          return;
        }
        if (isWebReadableStream(body)) {
          Readable.fromWeb(body).on("error", (error) => output.destroy(error)).pipe(output);
          return;
        }
        if (isBlob(body)) {
          output.end(Buffer.from(await body.arrayBuffer()));
          return;
        }
        output.destroy(new Error("Railway object storage returned an unsupported stream."));
      })
      .catch((error: unknown) => {
        output.destroy(asError(error));
      });

    return output;
  }

  async replaceObjectContent(
    object: ObjectStorageObjectRef,
    filePath: string,
    contentType: string,
    backupPrefix: string,
  ): Promise<void> {
    const { key } = this.fileFor(object);
    const bucket = this.config.bucket;
    const current = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    await this.client.send(new CopyObjectCommand({
      Bucket: bucket,
      Key: `${backupPrefix.replace(/^\/+|\/+$/g, "")}/${key}`,
      CopySource: `${encodeURIComponent(bucket)}/${encodeCopyKey(key)}`,
      MetadataDirective: "COPY",
    }));
    const hash = createHash("md5");
    await pipeline(createReadStream(filePath), hash);
    const { size } = await stat(filePath);
    await this.client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: size,
      ContentType: contentType,
      Metadata: { ...current.Metadata, [MD5_METADATA_KEY]: hash.digest("base64") },
      ...(current.CacheControl ? { CacheControl: current.CacheControl } : {}),
    }));
  }

  async updateObjectMetadata(
    object: ObjectStorageObjectRef,
    metadata: ObjectStorageCustomMetadata,
  ): Promise<void> {
    const { key } = this.fileFor(object);
    const current = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    const mergedMetadata = {
      ...decodeCustomMetadata(current.Metadata),
      ...metadata,
    };
    const encodedMetadata = encodeCustomMetadata(mergedMetadata);
    const md5Hash = current.Metadata?.[MD5_METADATA_KEY];
    if (md5Hash) encodedMetadata[MD5_METADATA_KEY] = md5Hash;

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        CopySource: `${encodeURIComponent(this.config.bucket)}/${encodeCopyKey(key)}`,
        ...(current.ETag ? { CopySourceIfMatch: current.ETag } : {}),
        MetadataDirective: "REPLACE",
        Metadata: encodedMetadata,
        TaggingDirective: "COPY",
        ContentType: current.ContentType ?? "application/octet-stream",
        ...(current.CacheControl ? { CacheControl: current.CacheControl } : {}),
        ...(current.ContentDisposition
          ? { ContentDisposition: current.ContentDisposition }
          : {}),
        ...(current.ContentEncoding ? { ContentEncoding: current.ContentEncoding } : {}),
        ...(current.ContentLanguage ? { ContentLanguage: current.ContentLanguage } : {}),
        ...(current.Expires ? { Expires: current.Expires } : {}),
      }),
    );
  }

  async deleteObject(object: ObjectStorageObjectRef): Promise<void> {
    const { key } = this.fileFor(object);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async findPublicObject(
    filePath: string,
  ): Promise<ObjectStorageObjectRef | null> {
    validateRelativePath(filePath, "public object path");
    for (let index = 0; index < this.config.publicPrefixes.length; index += 1) {
      const key = `${this.config.publicPrefixes[index]}/${filePath}`;
      try {
        await this.client.send(
          new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
        );
        return {
          key: `${PUBLIC_REF_PREFIX}${index}:${Buffer.from(filePath).toString("base64url")}`,
        };
      } catch (error) {
        if (!isNotFound(error)) throw error;
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
    const relativePrefix = prefix
      .slice(PRIVATE_OBJECT_KEY_PREFIX.length)
      .replace(/^\/+|\/+$/g, "");
    if (relativePrefix) validateRelativePath(relativePrefix, "private object prefix");
    const objectPrefix = [
      this.config.privatePrefix,
      relativePrefix.replace(/\/+$/, ""),
    ]
      .filter(Boolean)
      .join("/");

    const entries: ObjectStorageInventoryEntry[] = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: objectPrefix,
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        }),
      );
      for (const item of result.Contents ?? []) {
        if (!item.Key || item.Key.endsWith("/")) continue;
        if (!item.Key.startsWith(`${this.config.privatePrefix}/`)) continue;
        const relativeKey = item.Key.slice(this.config.privatePrefix.length + 1);
        const objectPath = `${PRIVATE_OBJECT_KEY_PREFIX}${relativeKey}`;
        const metadata = await this.headObject({ key: objectPath });
        if (!metadata) {
          throw new Error("Listed Railway object disappeared before metadata read.");
        }
        entries.push({ objectPath, metadata });
      }
      if (result.IsTruncated && !result.NextContinuationToken) {
        throw new Error("Railway object listing omitted its continuation token.");
      }
      continuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return entries;
  }

  private async presign(
    command: object,
    ttlSeconds: number,
  ): Promise<string> {
    if (
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < 1 ||
      ttlSeconds > MAX_PRESIGNED_URL_TTL_SECONDS
    ) {
      throw new Error("Presigned URL expiry must be between 1 second and 7 days.");
    }
    const url = await this.sign(this.client, command, { expiresIn: ttlSeconds });
    if (!url) throw new Error("Railway object storage returned an empty signed URL.");
    return url;
  }

  private fileFor(object: ObjectStorageObjectRef): { key: string } {
    if (object.key.startsWith(PUBLIC_REF_PREFIX)) {
      const match = /^railway-public:(\d+):([A-Za-z0-9_-]+)$/.exec(object.key);
      if (!match) throw new Error("Invalid public object reference.");
      const prefix = this.config.publicPrefixes[Number(match[1])];
      if (!prefix) throw new Error("Public object prefix is no longer configured.");
      const filePath = Buffer.from(match[2], "base64url").toString();
      validateRelativePath(filePath, "public object path");
      return { key: `${prefix}/${filePath}` };
    }
    return { key: this.privateObjectPathToKey(object.key) };
  }

  private privateObjectPathToKey(objectPath: string): string {
    if (!objectPath.startsWith(PRIVATE_OBJECT_KEY_PREFIX)) {
      throw new Error("Private storage operations require an /objects/ key.");
    }
    const relativeKey = objectPath.slice(PRIVATE_OBJECT_KEY_PREFIX.length);
    validateRelativePath(relativeKey, "private object key");
    return `${this.config.privatePrefix}/${relativeKey}`;
  }
}

export function readRailwayStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): RailwayStorageConfig {
  const displayBucketName = requiredEnv(env, "RAILWAY_BUCKET_DISPLAY_NAME");
  const bucket = requiredEnv(env, "RAILWAY_BUCKET_S3_NAME");
  const deploymentRegion = requiredEnv(env, "RAILWAY_DEPLOYMENT_REGION");
  const region = requiredEnv(env, "RAILWAY_BUCKET_SIGNING_REGION");
  const urlStyleValue = requiredEnv(env, "RAILWAY_BUCKET_URL_STYLE");
  if (urlStyleValue !== "path" && urlStyleValue !== "virtual-host") {
    throw new Error(
      "RAILWAY_BUCKET_URL_STYLE must be either path or virtual-host.",
    );
  }
  const endpoint = requiredEnv(env, "RAILWAY_BUCKET_ENDPOINT");
  const accessKeyId = requiredEnv(env, "RAILWAY_BUCKET_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv(env, "RAILWAY_BUCKET_SECRET_ACCESS_KEY");
  const privatePrefix = normalizePrefix(
    requiredEnv(env, "RAILWAY_PRIVATE_OBJECT_PREFIX"),
    "RAILWAY_PRIVATE_OBJECT_PREFIX",
  );
  const publicPrefixes = requiredEnv(env, "RAILWAY_PUBLIC_OBJECT_PREFIXES")
    .split(",")
    .map((value) => normalizePrefix(value, "RAILWAY_PUBLIC_OBJECT_PREFIXES"));
  if (new Set(publicPrefixes).size !== publicPrefixes.length) {
    throw new Error("RAILWAY_PUBLIC_OBJECT_PREFIXES contains duplicate prefixes.");
  }

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error("RAILWAY_BUCKET_ENDPOINT must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(endpointUrl.protocol)) {
    throw new Error("RAILWAY_BUCKET_ENDPOINT must use HTTP or HTTPS.");
  }

  const legacyPrivateObjectDir =
    env.TABYAN_LEGACY_PRIVATE_OBJECT_DIR?.trim() || undefined;
  return {
    displayBucketName,
    bucket,
    deploymentRegion,
    region,
    endpoint: endpointUrl.toString().replace(/\/$/, ""),
    urlStyle: urlStyleValue,
    accessKeyId,
    secretAccessKey,
    privatePrefix,
    publicPrefixes,
    ...(legacyPrivateObjectDir ? { legacyPrivateObjectDir } : {}),
  };
}

function toObjectStorageMetadata(
  metadata: HeadObjectCommandOutput,
): ObjectStorageMetadata {
  return {
    size: metadata.ContentLength,
    contentType: metadata.ContentType,
    md5Hash: metadata.Metadata?.[MD5_METADATA_KEY],
    timeCreated: metadata.LastModified?.toISOString(),
    metadata: decodeCustomMetadata(metadata.Metadata),
  };
}

function encodeCustomMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const encoded: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(`Unsupported object metadata value for key ${key}.`);
    }
    encoded[`${METADATA_KEY_PREFIX}${Buffer.from(key).toString("hex")}`] =
      JSON.stringify(value);
  }
  const encodedBytes = Object.entries(encoded).reduce(
    (sum, [key, value]) => sum + Buffer.byteLength(key) + Buffer.byteLength(value),
    0,
  );
  if (encodedBytes > 1800) {
    throw new Error("Custom object metadata exceeds the safe S3 metadata limit.");
  }
  return encoded;
}

function decodeCustomMetadata(
  metadata: Record<string, string | undefined> | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || key === MD5_METADATA_KEY) continue;
    if (key.startsWith(METADATA_KEY_PREFIX)) {
      const encodedKey = key.slice(METADATA_KEY_PREFIX.length);
      if (!/^(?:[0-9a-f]{2})+$/.test(encodedKey)) {
        throw new Error("Railway object storage returned malformed metadata.");
      }
      const originalKey = Buffer.from(encodedKey, "hex").toString("utf8");
      try {
        decoded[originalKey] = JSON.parse(value) as unknown;
      } catch {
        decoded[originalKey] = value;
      }
      continue;
    }
    // Preserve legacy GCS custom metadata if copied without the Railway
    // metadata-key encoding. S3 normalizes metadata keys to lowercase.
    decoded[key === "custom:aclpolicy" ? "custom:aclPolicy" : key] = value;
  }
  return Object.keys(decoded).length ? decoded : null;
}

function normalizePrefix(value: string, variable: string): string {
  const prefix = value.trim().replace(/^\/+|\/+$/g, "");
  if (
    !prefix ||
    prefix.split("/").some((part) => !part || part === "." || part === "..") ||
    prefix.includes("\\")
  ) {
    throw new Error(`${variable} must be a non-empty relative object prefix.`);
  }
  return prefix;
}

function validateRelativePath(value: string, description: string): void {
  if (
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Invalid ${description}.`);
  }
}

function encodeCopyKey(key: string): string {
  return encodeURIComponent(key).replace(/%2F/gi, "/");
}

function isNodeReadable(value: unknown): value is Readable {
  return !!value && typeof (value as { pipe?: unknown }).pipe === "function";
}

function isWebReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return (
    !!value &&
    typeof (value as { getReader?: unknown }).getReader === "function"
  );
}

function isBlob(value: unknown): value is Blob {
  return !!value && typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function";
}

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: unknown;
    Code?: unknown;
    code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  } | null;
  return (
    candidate?.$metadata?.httpStatusCode === 404 ||
    candidate?.name === "NotFound" ||
    candidate?.name === "NoSuchKey" ||
    candidate?.Code === "NoSuchKey" ||
    candidate?.code === "NotFound" ||
    candidate?.code === "NoSuchKey"
  );
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required when Railway storage is selected.`);
  return value;
}
