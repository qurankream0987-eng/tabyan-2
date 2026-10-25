import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const DOWNLOAD_PREFIX = "tabyan.library.download.";
const DOWNLOAD_FILE_PREFIX = "tabyan-library-";

let cacheEpoch = 0;
let downloadSequence = 0;
let operationQueue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isCurrentEpoch(epoch: number) {
  return epoch === cacheEpoch;
}

function key(bookId: string) {
  return `${DOWNLOAD_PREFIX}${bookId}`;
}

function isAppLibraryDownload(uri: string): boolean {
  const directory = FileSystem.documentDirectory;
  return !!directory && uri.startsWith(`${directory}${DOWNLOAD_FILE_PREFIX}`);
}

async function removeKeyIfValueMatches(storageKey: string, uri: string) {
  if (await AsyncStorage.getItem(storageKey) === uri) {
    await AsyncStorage.removeItem(storageKey);
  }
}

export async function getLibraryDownload(bookId: string): Promise<string | null> {
  await operationQueue;
  const epoch = cacheEpoch;
  const storageKey = key(bookId);
  const uri = await AsyncStorage.getItem(storageKey);
  if (!uri) return null;
  if (!isCurrentEpoch(epoch) || !isAppLibraryDownload(uri)) return null;
  const info = await FileSystem.getInfoAsync(uri);
  if (!isCurrentEpoch(epoch) || await AsyncStorage.getItem(storageKey) !== uri) return null;
  if (!info.exists) {
    await removeKeyIfValueMatches(storageKey, uri);
    return null;
  }
  return uri;
}

export async function downloadLibraryPdf(bookId: string, source: string): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error("لا تتوفر مساحة تخزين آمنة على الجهاز.");
  await operationQueue;
  const epoch = cacheEpoch;
  const storageKey = key(bookId);
  const previousUri = await AsyncStorage.getItem(storageKey);
  if (!isCurrentEpoch(epoch)) {
    throw new Error("تغيّر الحساب قبل بدء التنزيل. أعد المحاولة من الحساب الحالي.");
  }
  const destination = `${FileSystem.documentDirectory}${DOWNLOAD_FILE_PREFIX}${encodeURIComponent(bookId)}-${Date.now().toString(36)}-${++downloadSequence}.pdf`;
  const result = await FileSystem.downloadAsync(source, destination);
  if (!isCurrentEpoch(epoch)) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error("تغيّر الحساب قبل اكتمال التنزيل. أعد المحاولة من الحساب الحالي.");
  }
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error("تعذر تنزيل الملف. تحقق من الاتصال وحاول مرة أخرى.");
  }
  await AsyncStorage.setItem(storageKey, result.uri);
  if (!isCurrentEpoch(epoch)) {
    await removeKeyIfValueMatches(storageKey, result.uri);
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new Error("تغيّر الحساب قبل اكتمال التنزيل. أعد المحاولة من الحساب الحالي.");
  }
  if (previousUri && previousUri !== result.uri && isAppLibraryDownload(previousUri)) {
    await FileSystem.deleteAsync(previousUri, { idempotent: true });
  }
  return result.uri;
}

export async function removeLibraryDownload(bookId: string): Promise<void> {
  await serialize(async () => {
    const storageKey = key(bookId);
    const uri = await AsyncStorage.getItem(storageKey);
    if (uri && isAppLibraryDownload(uri)) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    await removeKeyIfValueMatches(storageKey, uri ?? "");
  });
}

/**
 * Clears only this app's offline library PDFs. The epoch prevents downloads
 * started by the previous account from saving a file after cleanup.
 */
export function clearLibraryDownloads(): Promise<void> {
  cacheEpoch += 1;
  return serialize(async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter((storageKey) => storageKey.startsWith(DOWNLOAD_PREFIX));
    const savedEntries = await AsyncStorage.multiGet(keys);
    const localUris = new Set(
      savedEntries
        .map(([, uri]) => uri)
        .filter((uri): uri is string => !!uri && isAppLibraryDownload(uri)),
    );

    if (FileSystem.documentDirectory) {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      for (const fileName of files) {
        if (fileName.startsWith(DOWNLOAD_FILE_PREFIX)) {
          localUris.add(`${FileSystem.documentDirectory}${fileName}`);
        }
      }
    }

    const results = await Promise.allSettled(
      [...localUris].map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })),
    );
    await AsyncStorage.multiRemove(keys);
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("تعذر حذف بعض ملفات المكتبة المحفوظة على الجهاز.");
    }
  });
}