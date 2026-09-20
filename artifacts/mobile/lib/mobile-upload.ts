import { File } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { apiOrigin } from "./trpc";
import { storage } from "./storage";

type UploadProgress = (percentage: number) => void;
type VideoAttachmentPurpose = "student_placement_video" | "teacher_kyc_video";
type UploadOptions = {
  name: string;
  contentType: string;
  purpose?: "live_session_recording" | "book_pdf" | "qiraat_certificate" | VideoAttachmentPurpose;
  onProgress?: UploadProgress;
};
export type VideoUploadResult = {
  playableObjectPath: string;
  videoProof: string;
  purpose: VideoAttachmentPurpose;
  durationSeconds: number;
};
const NETWORK_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 5 * 60_000;

async function fetchWithTimeout(input: string, init: RequestInit, message: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal as any });
  } catch (cause) {
    if ((cause as { name?: string })?.name === "AbortError") throw new Error(message);
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

async function authorizedHeaders(): Promise<Record<string, string>> {
  const token = await storage.getToken();
  if (!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد ثم أعد المحاولة.");
  return { Authorization: `Bearer ${token}` };
}

async function requestUploadUrl(
  name: string,
  size: number,
  contentType: string,
  purpose?: UploadOptions["purpose"],
): Promise<{ uploadURL: string; objectPath: string; uploadProof?: string }> {
  const response = await fetchWithTimeout(`${apiOrigin()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authorizedHeaders()) },
    body: JSON.stringify({
      name,
      size,
      contentType,
      ...(purpose ? { purpose } : {}),
    }),
  }, "انتهت مهلة تجهيز الرفع. تحقق من الاتصال وحاول مرة أخرى.");
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || "تعذر تجهيز رفع الفيديو.");
  }
  const payload = await response.json() as { uploadURL?: string; objectPath?: string; uploadProof?: string };
  if (!payload.uploadURL || !/^\/objects\/(?!.*\.\.)[\w\-./]+$/.test(payload.objectPath ?? "")) {
    throw new Error("استجاب الخادم بمسار تخزين غير صالح.");
  }
  return { uploadURL: payload.uploadURL, objectPath: payload.objectPath!, uploadProof: payload.uploadProof };
}

async function finalizeUpload(
  objectPath: string,
  purpose: UploadOptions["purpose"] | undefined,
  uploadProof?: string,
): Promise<VideoUploadResult | { playableObjectPath: string }> {
  const response = await fetchWithTimeout(`${apiOrigin()}/api/storage/uploads/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authorizedHeaders()) },
    body: JSON.stringify({ objectPath, ...(purpose ? { purpose } : {}), ...(uploadProof ? { uploadProof } : {}) }),
  }, "انتهت مهلة التحقق من الملف. تحقق من الاتصال وحاول مرة أخرى.");
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || "تعذر التحقق من الفيديو بعد رفعه.");
  }
  const payload = await response.json() as {
    playableObjectPath?: string;
    videoProof?: string;
    purpose?: VideoAttachmentPurpose;
    durationSeconds?: number;
  };
  if (!payload.playableObjectPath) throw new Error("استجاب الخادم دون مسار فيديو قابل للتشغيل.");
  if (purpose === "student_placement_video" || purpose === "teacher_kyc_video") {
    if (!payload.videoProof || payload.purpose !== purpose || typeof payload.durationSeconds !== "number") {
      throw new Error("استجاب الخادم دون إثبات فيديو مكتمل.");
    }
    return {
      playableObjectPath: payload.playableObjectPath,
      videoProof: payload.videoProof,
      purpose,
      durationSeconds: payload.durationSeconds,
    };
  }
  return { playableObjectPath: payload.playableObjectPath };
}

/**
 * Upload a native file URI through the existing private object-storage contract.
 * The local URI is never returned as a successful server reference.
 */
export async function uploadNativeVideo(
  uri: string,
  onProgress?: UploadProgress,
  options?: { name?: string; contentType?: string; purpose?: VideoAttachmentPurpose },
): Promise<VideoUploadResult> {
  return uploadNativeVideoWithOptions(uri, {
    name: options?.name ?? `placement-${Date.now()}.mp4`,
    contentType: options?.contentType ?? "video/mp4",
    purpose: options?.purpose ?? "student_placement_video",
    onProgress,
  });
}

async function uploadNativeVideoWithOptions(uri: string, options: UploadOptions): Promise<VideoUploadResult> {
  const result = await uploadNativeFileWithResult(uri, options);
  if (!("videoProof" in result)) throw new Error("لم يُثبت الخادم فيديو الاعتماد.");
  return result;
}

export async function uploadNativeFile(uri: string, options: UploadOptions): Promise<string> {
  const result = await uploadNativeFileWithResult(uri, options);
  return result.playableObjectPath;
}

async function uploadNativeFileWithResult(
  uri: string,
  options: UploadOptions,
): Promise<VideoUploadResult | { playableObjectPath: string }> {
  const file = new File(uri);
  const info = file.info();
  const size = info.size ?? 0;
  if (!file.exists || size <= 0) {
    throw new Error("ملف التسجيل غير موجود أو فارغ. أعد التسجيل.");
  }
  if (size > 500 * 1024 * 1024) {
    throw new Error("حجم الفيديو يتجاوز الحد المسموح.");
  }

  const { name, contentType, purpose, onProgress } = options;
  const { uploadURL, objectPath, uploadProof } = await requestUploadUrl(name, size, contentType, purpose);
  onProgress?.(0);
  const task = LegacyFileSystem.createUploadTask(
    uploadURL,
    uri,
    {
      httpMethod: "PUT",
      uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": contentType },
    },
    (event) => {
      if (event.totalBytesExpectedToSend > 0) {
        onProgress?.(Math.round((event.totalBytesSent / event.totalBytesExpectedToSend) * 90));
      }
    },
  );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const uploadPromise = task.uploadAsync();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        void task.cancelAsync().catch(() => undefined);
        reject(new Error("انتهت مهلة رفع الملف. تحقق من الاتصال وحاول مرة أخرى."));
      }, UPLOAD_TIMEOUT_MS);
    });
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error("فشل رفع الملف إلى التخزين. تحقق من الاتصال وحاول مرة أخرى.");
    }
    onProgress?.(92);
    const finalized = await finalizeUpload(objectPath, purpose, uploadProof);
    onProgress?.(100);
    return finalized;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}