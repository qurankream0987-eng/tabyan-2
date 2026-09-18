import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const DOWNLOAD_PREFIX = "tabyan.library.download.";

function key(bookId: string) {
  return `${DOWNLOAD_PREFIX}${bookId}`;
}

export async function getLibraryDownload(bookId: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(key(bookId));
  if (!uri) return null;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await AsyncStorage.removeItem(key(bookId));
    return null;
  }
  return uri;
}

export async function downloadLibraryPdf(bookId: string, source: string): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error("لا تتوفر مساحة تخزين آمنة على الجهاز.");
  const destination = `${FileSystem.documentDirectory}tabyan-library-${encodeURIComponent(bookId)}.pdf`;
  const result = await FileSystem.downloadAsync(source, destination);
  if (result.status < 200 || result.status >= 300) {
    throw new Error("تعذر تنزيل الملف. تحقق من الاتصال وحاول مرة أخرى.");
  }
  await AsyncStorage.setItem(key(bookId), result.uri);
  return result.uri;
}

export async function removeLibraryDownload(bookId: string): Promise<void> {
  const uri = await AsyncStorage.getItem(key(bookId));
  if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  await AsyncStorage.removeItem(key(bookId));
}