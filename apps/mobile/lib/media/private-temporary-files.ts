import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { isCurrentAccountGeneration, getAccountGeneration } from "../account-transition";

const PRIVATE_TEMP_FILES_KEY = "tabyan.native.private-temp-files";
let operationQueue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isAppTemporaryFile(uri: string): boolean {
  if (!uri.startsWith("file://")) return false;
  const cacheDirectory = FileSystem.cacheDirectory;
  return !!cacheDirectory && uri.startsWith(cacheDirectory);
}

function parseUris(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((uri): uri is string => typeof uri === "string" && isAppTemporaryFile(uri))
      : [];
  } catch {
    return [];
  }
}

async function readUris(): Promise<string[]> {
  return parseUris(await AsyncStorage.getItem(PRIVATE_TEMP_FILES_KEY));
}

async function writeUris(uris: string[]): Promise<void> {
  if (uris.length) {
    await AsyncStorage.setItem(PRIVATE_TEMP_FILES_KEY, JSON.stringify([...new Set(uris)]));
  } else {
    await AsyncStorage.removeItem(PRIVATE_TEMP_FILES_KEY);
  }
}

async function deleteTemporaryFile(uri: string): Promise<void> {
  if (isAppTemporaryFile(uri)) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export function trackPrivateTemporaryFile(
  uri: string,
  accountGeneration = getAccountGeneration(),
): Promise<boolean> {
  if (!isAppTemporaryFile(uri)) return Promise.resolve(isCurrentAccountGeneration(accountGeneration));
  return serialize(async () => {
    if (!isCurrentAccountGeneration(accountGeneration)) {
      await deleteTemporaryFile(uri);
      return false;
    }
    const uris = await readUris();
    if (!uris.includes(uri)) uris.push(uri);
    await writeUris(uris);
    if (!isCurrentAccountGeneration(accountGeneration)) {
      await writeUris((await readUris()).filter((trackedUri) => trackedUri !== uri));
      await deleteTemporaryFile(uri);
      return false;
    }
    return true;
  });
}

export function removePrivateTemporaryFile(uri: string): Promise<void> {
  return serialize(async () => {
    await deleteTemporaryFile(uri);
    await writeUris((await readUris()).filter((trackedUri) => trackedUri !== uri));
  });
}

/** Remove only app-owned temporary recordings and picker copies; never source files. */
export function clearPrivateTemporaryFiles(): Promise<void> {
  return serialize(async () => {
    const uris = await readUris();
    const results = await Promise.allSettled(uris.map(deleteTemporaryFile));
    const failedUris = uris.filter((_, index) => results[index]?.status === "rejected");
    await writeUris(failedUris);
    if (failedUris.length) {
      throw new Error(`Could not remove ${failedUris.length} private temporary file(s).`);
    }
  });
}
