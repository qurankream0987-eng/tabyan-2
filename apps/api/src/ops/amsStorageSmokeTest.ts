import {
  RailwayObjectStorageProvider,
  readRailwayStorageConfig,
} from "../storage/RailwayObjectStorageProvider";
import { getStorageErrorDetails } from "../storage/storageErrorDetails";

const expected = {
  displayBucketName: "tabyan-objects-ams",
  bucket: "tabyan-objects-ams-jwidul",
  deploymentRegion: "ams",
  signingRegion: "auto",
  endpoint: "https://t3.storageapi.dev",
  urlStyle: "virtual-host",
} as const;

const syntheticObjectPath = "/objects/tabyan-migration-smoke/test.txt";
const objectRef = { key: syntheticObjectPath };
const payload = Buffer.from("tabyan-ams-storage-healthcheck");

function makePutError(response: Response, responseText: string): Error {
  const xmlValue = (tag: string): string | undefined => {
    const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(
      responseText,
    );
    return match?.[1]?.trim();
  };
  const error = new Error(
    xmlValue("Message") ?? `Private object PUT returned HTTP ${response.status}.`,
  );
  error.name = "S3HttpError";
  Object.assign(error, {
    code: `HTTP_${response.status}`,
    httpStatusCode: response.status,
    s3ErrorCode: xmlValue("Code"),
    requestId:
      response.headers.get("x-amz-request-id") ??
      response.headers.get("x-amz-id-2") ??
      xmlValue("RequestId") ??
      xmlValue("RequestID"),
  });
  return error;
}

async function main(): Promise<void> {
  const config = readRailwayStorageConfig();
  const contractChecks = {
    displayBucketName: config.displayBucketName === expected.displayBucketName,
    s3BucketName: config.bucket === expected.bucket,
    deploymentRegion: config.deploymentRegion === expected.deploymentRegion,
    signingRegion: config.region === expected.signingRegion,
    endpoint: config.endpoint === expected.endpoint,
    urlStyle: config.urlStyle === expected.urlStyle,
  };
  console.log("AMS_STORAGE_CONTRACT", JSON.stringify(contractChecks));
  if (Object.values(contractChecks).some((matches) => !matches)) {
    throw new Error("Railway S3 configuration does not match the approved contract.");
  }

  const provider = new RailwayObjectStorageProvider(config);
  let stage = "preflight-head";
  let uploadAttempted = false;
  let putPassed = false;
  let headPassed = false;
  let getPassed = false;
  let deletePassed = false;
  let cleanupConfirmed = false;

  try {
    if (await provider.headObject(objectRef)) {
      throw new Error("synthetic storage smoke key exists; refusing to overwrite it");
    }

    stage = "create-write-capability";
    const uploadUrl = await provider.createWriteCapability(syntheticObjectPath, 60);
    stage = "put";
    uploadAttempted = true;
    const putResponse = await fetch(uploadUrl, { method: "PUT", body: payload });
    if (!putResponse.ok) {
      throw makePutError(putResponse, (await putResponse.text()).slice(0, 4096));
    }
    putPassed = true;

    stage = "head";
    const metadata = await provider.headObject(objectRef);
    if (!metadata) throw new Error("synthetic object was not found by HEAD");
    headPassed = true;

    stage = "get";
    const chunks: Buffer[] = [];
    for await (const chunk of provider.getObjectStream(objectRef)) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (!Buffer.concat(chunks).equals(payload)) {
      throw new Error("synthetic object GET content did not match");
    }
    getPassed = true;

    stage = "delete";
    await provider.deleteObject(objectRef);
    deletePassed = true;
    stage = "cleanup-confirmation";
    cleanupConfirmed = !(await provider.headObject(objectRef));
    if (!cleanupConfirmed) {
      throw new Error("synthetic object still exists after DELETE");
    }
  } catch (error) {
    if (uploadAttempted && !cleanupConfirmed) {
      try {
        await provider.deleteObject(objectRef);
        cleanupConfirmed = !(await provider.headObject(objectRef));
      } catch {
        cleanupConfirmed = false;
      }
    }
    const errorDetails = getStorageErrorDetails(error, [
      config.accessKeyId,
      config.secretAccessKey,
    ]);
    console.error(
      "AMS_STORAGE_SMOKE_FAILED",
      JSON.stringify({
        stage,
        ...errorDetails,
        putPassed,
        headPassed,
        getPassed,
        deletePassed,
        cleanupConfirmed,
      }),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "AMS_STORAGE_SMOKE_PASSED",
    JSON.stringify({
      putPassed,
      headPassed,
      getPassed,
      deletePassed,
      cleanupConfirmed,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    "AMS_STORAGE_SMOKE_FAILED",
    JSON.stringify({
      stage: "configuration",
      ...getStorageErrorDetails(error, [
        process.env.RAILWAY_BUCKET_ACCESS_KEY_ID ?? "",
        process.env.RAILWAY_BUCKET_SECRET_ACCESS_KEY ?? "",
      ]),
      putPassed: false,
      headPassed: false,
      getPassed: false,
      deletePassed: false,
      cleanupConfirmed: false,
    }),
  );
  process.exitCode = 1;
});
