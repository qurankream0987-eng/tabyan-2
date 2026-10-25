import * as FileSystem from "expo-file-system/legacy";

export type CachePreparationStage =
  | "DOWNLOAD_STARTED"
  | "DOWNLOAD_FAILED"
  | "ACCESS_REJECTED"
  | "CACHE_WRITE_STARTED"
  | "CACHE_WRITE_FAILED"
  | "LOCAL_FILE_MISSING"
  | "LOCAL_FILE_EMPTY"
  | "LOCAL_FILE_READY"
  | "MEDIA_UNSUPPORTED";

function mediaExtension(mimeType: string | null | undefined): "mp4" | "mov" | "webm" | null {
  const normalized = mimeType?.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized === "video/mp4") return "mp4";
  if (normalized === "video/quicktime") return "mov";
  if (normalized === "video/webm") return "webm";
  return null;
}

function responseContentType(headers: Record<string, string>): string | undefined {
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "content-type");
  return entry?.[1];
}

let cacheAttempt = 0;
let cacheEpoch = 0;
let cleanupQueue: Promise<void> = Promise.resolve();
const PRIVATE_MEDIA_PREFIX = "tabyan-private-media-";

function nextCacheKey() {
  cacheAttempt = (cacheAttempt + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now()}-${cacheAttempt}`;
}

async function waitForCurrentCleanup() {
  let observed: Promise<void>;
  do {
    observed = cleanupQueue;
    await observed;
  } while (observed !== cleanupQueue);
}

function assertCacheEpoch(expected: number) {
  if (expected !== cacheEpoch) {
    throw new Error("Private media cache was cleared during download");
  }
}

export async function downloadPrivateMediaToCache(
  uri: string,
  headers: Record<string, string>,
  onStage?: (stage: CachePreparationStage) => void,
): Promise<string> {
  await waitForCurrentCleanup();
  const downloadEpoch = cacheEpoch;
  if (!FileSystem.cacheDirectory) {
    onStage?.("CACHE_WRITE_FAILED");
    throw new Error("لا تتوفر مساحة مؤقتة لتشغيل الفيديو.");
  }

  const cacheKey = nextCacheKey();
  const temporaryDestination = `${FileSystem.cacheDirectory}tabyan-private-media-${cacheKey}.download`;
  let downloadedUri = temporaryDestination;
  let finalDestination: string | null = null;
  onStage?.("DOWNLOAD_STARTED");
  try {
    let result: FileSystem.FileSystemDownloadResult;
    try {
      result = await FileSystem.downloadAsync(uri, temporaryDestination, {
        headers,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
      });
      downloadedUri = result.uri;
      assertCacheEpoch(downloadEpoch);
    } catch (error) {
      onStage?.("DOWNLOAD_FAILED");
      throw error;
    }
    if (result.status < 200 || result.status >= 300) {
      onStage?.(result.status === 401 || result.status === 403 ? "ACCESS_REJECTED" : "DOWNLOAD_FAILED");
      throw new Error(`Private media download failed with status ${result.status}`);
    }

    const temporaryInfo = await FileSystem.getInfoAsync(result.uri);
    assertCacheEpoch(downloadEpoch);
    if (!temporaryInfo.exists) {
      onStage?.("LOCAL_FILE_MISSING");
      throw new Error("Private media download did not create a file");
    }
    if (!("size" in temporaryInfo) || !temporaryInfo.size) {
      onStage?.("LOCAL_FILE_EMPTY");
      throw new Error("Private media download produced an empty file");
    }

    const headerMimeType = responseContentType(result.headers);
    const extension = mediaExtension(result.mimeType) ?? mediaExtension(headerMimeType);
    const reportedMimeTypes = [result.mimeType, headerMimeType]
      .map((value) => value?.split(";", 1)[0]?.trim().toLowerCase())
      .filter((value): value is string => !!value && value !== "application/octet-stream");
    if (!extension && reportedMimeTypes.length > 0) {
      onStage?.("MEDIA_UNSUPPORTED");
      throw new Error("Private media response type is unsupported");
    }
    const safeExtension = extension ?? "mp4";
    finalDestination = `${FileSystem.cacheDirectory}tabyan-private-media-${cacheKey}.${safeExtension}`;
    onStage?.("CACHE_WRITE_STARTED");
    try {
      await FileSystem.moveAsync({ from: result.uri, to: finalDestination });
      assertCacheEpoch(downloadEpoch);
    } catch (error) {
      onStage?.("CACHE_WRITE_FAILED");
      throw error;
    }

    const finalInfo = await FileSystem.getInfoAsync(finalDestination);
    assertCacheEpoch(downloadEpoch);
    if (!finalInfo.exists) {
      onStage?.("LOCAL_FILE_MISSING");
      throw new Error("Private media cache file is missing");
    }
    if (!("size" in finalInfo) || !finalInfo.size) {
      onStage?.("LOCAL_FILE_EMPTY");
      throw new Error("Private media cache file is empty");
    }
    onStage?.("LOCAL_FILE_READY");
    return finalDestination;
  } catch (error) {
    await FileSystem.deleteAsync(temporaryDestination, { idempotent: true }).catch(() => undefined);
    if (downloadedUri !== temporaryDestination) {
      await FileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
    }
    if (finalDestination) {
      await FileSystem.deleteAsync(finalDestination, { idempotent: true }).catch(() => undefined);
    }
    throw error;
  }
}

/**
 * Removes only temporary private-media playback files. Account transitions
 * increment the epoch first so downloads already in progress cannot repopulate
 * this cache after cleanup.
 */
export function clearPrivateMediaCache(): Promise<void> {
  cacheEpoch += 1;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) return Promise.resolve();

  const cleanup = async () => {
    const entries = await FileSystem.readDirectoryAsync(cacheDirectory);
    const privateMediaPaths = entries
      .filter((entry) => entry.startsWith(PRIVATE_MEDIA_PREFIX))
      .map((entry) => `${cacheDirectory}${entry}`);
    await Promise.all(
      privateMediaPaths.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)),
    );
  };
  const pending = cleanupQueue.then(cleanup, cleanup);
  cleanupQueue = pending.catch(() => undefined);
  return pending;
}

export async function removeCachedPrivateMedia(uri: string | null): Promise<void> {
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
