import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import {
  RailwayObjectStorageProvider,
  readRailwayStorageConfig,
} from "./RailwayObjectStorageProvider";
import { getStorageErrorDetails } from "./storageErrorDetails";

type FakeCommand = {
  constructor: { name: string };
  input: Record<string, unknown>;
};

class FakeS3Client {
  readonly commands: FakeCommand[] = [];

  constructor(
    private readonly respond: (
      command: FakeCommand,
    ) => Promise<unknown> | unknown,
  ) {}

  async send(command: unknown): Promise<unknown> {
    const fakeCommand = command as FakeCommand;
    this.commands.push(fakeCommand);
    return this.respond(fakeCommand);
  }
}

const config = {
  displayBucketName: "tabyan-objects-ams",
  bucket: "tabyan-media",
  deploymentRegion: "ams",
  region: "us-east-1",
  endpoint: "https://storage.example.invalid",
  urlStyle: "virtual-host" as const,
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  privatePrefix: "private",
  publicPrefixes: ["public/assets", "public/images"],
  legacyPrivateObjectDir: "/legacy-bucket/private",
};

test("Railway storage config keeps display, S3, deployment, signing, and URL style separate", () => {
  const storageConfig = readRailwayStorageConfig({
    RAILWAY_BUCKET_DISPLAY_NAME: "tabyan-objects-ams",
    RAILWAY_BUCKET_S3_NAME: "tabyan-objects-ams-jwidul",
    RAILWAY_DEPLOYMENT_REGION: "ams",
    RAILWAY_BUCKET_SIGNING_REGION: "auto",
    RAILWAY_BUCKET_URL_STYLE: "virtual-host",
    RAILWAY_BUCKET_ENDPOINT: "https://t3.storageapi.dev/",
    RAILWAY_BUCKET_ACCESS_KEY_ID: "test-access-key",
    RAILWAY_BUCKET_SECRET_ACCESS_KEY: "test-secret-key",
    RAILWAY_PRIVATE_OBJECT_PREFIX: "objects",
    RAILWAY_PUBLIC_OBJECT_PREFIXES: "public/assets,public/images",
  });

  assert.equal(storageConfig.displayBucketName, "tabyan-objects-ams");
  assert.equal(storageConfig.bucket, "tabyan-objects-ams-jwidul");
  assert.equal(storageConfig.deploymentRegion, "ams");
  assert.equal(storageConfig.region, "auto");
  assert.equal(storageConfig.urlStyle, "virtual-host");
  assert.equal(storageConfig.endpoint, "https://t3.storageapi.dev");
  assert.throws(
    () =>
      readRailwayStorageConfig({
        RAILWAY_BUCKET_DISPLAY_NAME: "tabyan-objects-ams",
        RAILWAY_BUCKET_S3_NAME: "tabyan-objects-ams-jwidul",
        RAILWAY_DEPLOYMENT_REGION: "ams",
        RAILWAY_BUCKET_SIGNING_REGION: "auto",
        RAILWAY_BUCKET_URL_STYLE: "force-path",
        RAILWAY_BUCKET_ENDPOINT: "https://t3.storageapi.dev",
        RAILWAY_BUCKET_ACCESS_KEY_ID: "test-access-key",
        RAILWAY_BUCKET_SECRET_ACCESS_KEY: "test-secret-key",
        RAILWAY_PRIVATE_OBJECT_PREFIX: "objects",
        RAILWAY_PUBLIC_OBJECT_PREFIXES: "public/assets",
      }),
    /RAILWAY_BUCKET_URL_STYLE/,
  );
});

test("storage error details include S3 diagnostics while redacting URLs and credentials", () => {
  const details = getStorageErrorDetails(
    Object.assign(
      new Error(
        "PUT denied at https://bucket.storage.invalid/key?X-Amz-Credential=AKIA1234567890ABCDEF",
      ),
      {
        name: "S3HttpError",
        code: "HTTP_403",
        httpStatusCode: 403,
        s3ErrorCode: "SignatureDoesNotMatch",
        requestId: "request-123",
      },
    ),
    ["test-secret-value"],
  );

  assert.deepEqual(details, {
    errorName: "S3HttpError",
    errorCode: "HTTP_403",
    httpStatus: 403,
    s3ErrorCode: "SignatureDoesNotMatch",
    message: "PUT denied at [REDACTED_URL]",
    requestId: "request-123",
  });
});

test("virtual-host style signs against the S3 bucket host with the configured signing region", async () => {
  const storage = new RailwayObjectStorageProvider({
    ...config,
    bucket: "tabyan-objects-ams-jwidul",
    region: "auto",
    endpoint: "https://t3.storageapi.dev",
    urlStyle: "virtual-host",
  });

  const signedUrl = new URL(
    await storage.createWriteCapability(
      "/objects/tabyan-migration-smoke/test.txt",
      60,
    ),
  );

  assert.equal(
    signedUrl.hostname,
    "tabyan-objects-ams-jwidul.t3.storageapi.dev",
  );
  assert.equal(signedUrl.pathname, "/private/tabyan-migration-smoke/test.txt");
  assert.match(
    signedUrl.searchParams.get("X-Amz-Credential") ?? "",
    /\/auto\/s3\/aws4_request$/,
  );
});

function provider(
  client: FakeS3Client,
  sign: (command: FakeCommand, expiresIn: number) => Promise<string> =
    async () => "https://signed.example.invalid/object",
): RailwayObjectStorageProvider {
  return new RailwayObjectStorageProvider(config, {
    client: client as unknown as S3Client,
    sign: async (_client, command, options) =>
      sign(command as FakeCommand, options.expiresIn),
  });
}

test("private uploads sign the S3 key while preserving logical object paths", async () => {
  const client = new FakeS3Client(() => ({}));
  let signedCommand: FakeCommand | undefined;
  let signedExpiry = 0;
  const storage = provider(client, async (command, expiresIn) => {
    signedCommand = command;
    signedExpiry = expiresIn;
    return "signed-put";
  });

  const url = await storage.createWriteCapability("/objects/uploads/video-1", 900);

  assert.equal(url, "signed-put");
  assert.equal(signedCommand?.constructor.name, "PutObjectCommand");
  assert.deepEqual(signedCommand?.input, {
    Bucket: "tabyan-media",
    Key: "private/uploads/video-1",
  });
  assert.equal(signedExpiry, 900);
  const storageWithoutLegacyConfig = new RailwayObjectStorageProvider(
    { ...config, legacyPrivateObjectDir: undefined },
    {
      client: client as unknown as S3Client,
      sign: async () => "signed",
    },
  );
  assert.throws(
    () =>
      storageWithoutLegacyConfig.normalizeObjectPath(
        "https://storage.googleapis.com/a/b",
      ),
    /TABYAN_LEGACY_PRIVATE_OBJECT_DIR/,
  );
  assert.equal(
    storage.normalizeObjectPath(
      "https://storage.googleapis.com/legacy-bucket/private/uploads/video-1",
    ),
    "/objects/uploads/video-1",
  );
});

test("metadata reads decode the ACL key and retain the source checksum", async () => {
  const acl = JSON.stringify({ owner: "user-1", visibility: "private" });
  const client = new FakeS3Client(() => ({
    ContentLength: 120,
    ContentType: "video/mp4",
    LastModified: new Date("2026-01-01T00:00:00.000Z"),
    Metadata: {
      "tabyan-meta-637573746f6d3a61636c506f6c696379": JSON.stringify(acl),
      "tabyan-md5-hash": "source-md5",
    },
  }));
  const storage = provider(client);

  const metadata = await storage.headObject({
    key: "/objects/uploads/video-1",
  });

  assert.deepEqual(metadata, {
    size: 120,
    contentType: "video/mp4",
    md5Hash: "source-md5",
    timeCreated: "2026-01-01T00:00:00.000Z",
    metadata: { "custom:aclPolicy": acl },
  });
  assert.deepEqual(client.commands[0].input, {
    Bucket: "tabyan-media",
    Key: "private/uploads/video-1",
  });
});

test("metadata updates copy the object in place and preserve existing metadata", async () => {
  const previousAcl = JSON.stringify({ owner: "user-1", visibility: "private" });
  const nextAcl = JSON.stringify({ owner: "user-1", visibility: "public" });
  const client = new FakeS3Client((command) => {
    if (command.constructor.name === "HeadObjectCommand") {
      return {
        ETag: '"etag-1"',
        ContentType: "video/mp4",
        CacheControl: "private, max-age=0",
        Metadata: {
          "tabyan-meta-637573746f6d3a61636c506f6c696379": JSON.stringify(previousAcl),
          "tabyan-md5-hash": "source-md5",
        },
      };
    }
    return {};
  });
  const storage = provider(client);

  await storage.updateObjectMetadata(
    { key: "/objects/uploads/video-1" },
    { "custom:aclPolicy": nextAcl },
  );

  const copy = client.commands[1];
  assert.equal(copy.constructor.name, "CopyObjectCommand");
  assert.deepEqual(copy.input, {
    Bucket: "tabyan-media",
    Key: "private/uploads/video-1",
    CopySource: "tabyan-media/private/uploads/video-1",
    CopySourceIfMatch: '"etag-1"',
    MetadataDirective: "REPLACE",
    Metadata: {
      "tabyan-meta-637573746f6d3a61636c506f6c696379": JSON.stringify(nextAcl),
      "tabyan-md5-hash": "source-md5",
    },
    TaggingDirective: "COPY",
    ContentType: "video/mp4",
    CacheControl: "private, max-age=0",
  });
});

test("private inventory lists only the configured namespace and returns logical paths", async () => {
  const client = new FakeS3Client((command) => {
    if (command.constructor.name === "ListObjectsV2Command") {
      return {
        IsTruncated: false,
        Contents: [{ Key: "private/uploads/video-2" }],
      };
    }
    if (command.constructor.name === "HeadObjectCommand") {
      return {
        ContentLength: 50,
        ContentType: "video/mp4",
        Metadata: {},
      };
    }
    throw new Error(`Unexpected command ${command.constructor.name}`);
  });
  const storage = provider(client);

  const entries = await storage.listPrivateObjects("/objects/uploads/");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].objectPath, "/objects/uploads/video-2");
  assert.equal(entries[0].metadata.size, 50);
  assert.deepEqual(client.commands[0].input, {
    Bucket: "tabyan-media",
    Prefix: "private/uploads",
  });
});

test("public lookup skips missing prefixes and keeps references opaque", async () => {
  const client = new FakeS3Client((command) => {
    if (command.input.Key === "public/assets/logo.svg") {
      throw { $metadata: { httpStatusCode: 404 } };
    }
    return { ContentLength: 5, ContentType: "image/svg+xml" };
  });
  const storage = provider(client);

  const object = await storage.findPublicObject("logo.svg");
  assert.deepEqual(object, {
    key: `railway-public:1:${Buffer.from("logo.svg").toString("base64url")}`,
  });

  await storage.headObject(object!);
  assert.deepEqual(
    client.commands.slice(0, 3).map((command) => command.input.Key),
    [
      "public/assets/logo.svg",
      "public/images/logo.svg",
      "public/images/logo.svg",
    ],
  );
});

test("Range reads stream the requested byte window", async () => {
  const client = new FakeS3Client(() => ({
    Body: Readable.from([Buffer.from("bcd")]),
  }));
  const storage = provider(client);
  const stream = storage.getObjectStream(
    { key: "/objects/uploads/video-3" },
    { start: 1, end: 3 },
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));

  assert.equal(Buffer.concat(chunks).toString(), "bcd");
  assert.deepEqual(client.commands[0].input, {
    Bucket: "tabyan-media",
    Key: "private/uploads/video-3",
    Range: "bytes=1-3",
  });
});
