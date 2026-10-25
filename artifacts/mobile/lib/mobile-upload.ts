import { File } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { apiOrigin } from "./trpc";
import { storage } from "./storage";
import {
  getAccountGeneration,
  isCurrentAccountGeneration,
  onAccountTransition,
} from "./account-transition";

type UploadProgress = (percentage: number) => void;
type VideoAttachmentPurpose = "student_placement_video" | "teacher_kyc_video" | "live_session_recording";
type SubmissionVideoPurpose = Exclude<VideoAttachmentPurpose, "live_session_recording">;
type UploadOptions = {
  name: string;
  contentType: string;
  purpose?: "live_session_recording" | "book_pdf" | "qiraat_certificate" | VideoAttachmentPurpose;
  onProgress?: UploadProgress;
  expectedAccountGeneration?: number;
};
export type VideoUploadResult = {
  playableObjectPath: string;
  videoProof: string;
  purpose: VideoAttachmentPurpose;
  durationSeconds: number;
  /** Local guard only; this value is never sent to the server. */
  accountGeneration: number;
};
const NETWORK_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 5 * 60_000;

type AccountRequestContext = { token: string; generation: number };

function assertCurrentAccount(context: AccountRequestContext) {
  if (!isCurrentAccountGeneration(context.generation)) {
    throw new Error("تغيّر الحساب قبل اكتمال العملية. أعد المحاولة من الحساب الحالي.");
  }
}

async function captureAccountContext(expectedGeneration?: number): Promise<AccountRequestContext> {
  const generation = expectedGeneration ?? getAccountGeneration();
  if (!isCurrentAccountGeneration(generation)) {
    throw new Error("تغيّر الحساب قبل بدء العملية. أعد المحاولة من الحساب الحالي.");
  }
  const token = await storage.getToken();
  assertCurrentAccount({ token: token ?? "", generation });
  if (!token) throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد ثم أعد المحاولة.");
  return { token, generation };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  message: string,
  context: AccountRequestContext,
) {
  const controller = new AbortController();
  const unsubscribe = onAccountTransition(() => controller.abort());
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    assertCurrentAccount(context);
    const response = await fetch(input, { ...init, signal: controller.signal as any });
    assertCurrentAccount(context);
    return response;
  } catch (cause) {
    if (!isCurrentAccountGeneration(context.generation)) {
      throw new Error("تغيّر الحساب قبل اكتمال العملية. أعد المحاولة من الحساب الحالي.");
    }
    if ((cause as { name?: string })?.name === "AbortError") throw new Error(message);
    throw cause;
  } finally {
    clearTimeout(timer);
    unsubscribe();
  }
}

function authorizedHeaders(context: AccountRequestContext): Record<string, string> {
  return { Authorization: `Bearer ${context.token}` };
}

async function requestUploadUrl(
  context: AccountRequestContext,
  name: string,
  size: number,
  contentType: string,
  purpose?: UploadOptions["purpose"],
): Promise<{ uploadURL: string; objectPath: string; uploadProof?: string }> {
  const response = await fetchWithTimeout(`${apiOrigin()}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorizedHeaders(context) },
    body: JSON.stringify({
      name,
      size,
      contentType,
      ...(purpose ? { purpose } : {}),
    }),
  }, "انتهت مهلة تجهيز الرفع. تحقق من الاتصال وحاول مرة أخرى.", context);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    assertCurrentAccount(context);
    throw new Error(body?.error || "تعذر تجهيز رفع الفيديو.");
  }
  const payload = await response.json() as { uploadURL?: string; objectPath?: string; uploadProof?: string };
  assertCurrentAccount(context);
  if (!payload.uploadURL || !/^\/objects\/(?!.*\.\.)[\w\-./]+$/.test(payload.objectPath ?? "")) {
    throw new Error("استجاب الخادم بمسار تخزين غير صالح.");
  }
  return { uploadURL: payload.uploadURL, objectPath: payload.objectPath!, uploadProof: payload.uploadProof };
}

async function finalizeUpload(
  context: AccountRequestContext,
  objectPath: string,
  purpose: UploadOptions["purpose"] | undefined,
  uploadProof?: string,
): Promise<VideoUploadResult | { playableObjectPath: string }> {
  const response = await fetchWithTimeout(`${apiOrigin()}/api/storage/uploads/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorizedHeaders(context) },
    body: JSON.stringify({ objectPath, ...(purpose ? { purpose } : {}), ...(uploadProof ? { uploadProof } : {}) }),
  }, "انتهت مهلة التحقق من الملف. تحقق من الاتصال وحاول مرة أخرى.", context);
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    assertCurrentAccount(context);
    throw new Error(body?.error || "تعذر التحقق من الفيديو بعد رفعه.");
  }
  const payload = await response.json() as {
    playableObjectPath?: string;
    videoProof?: string;
    purpose?: VideoAttachmentPurpose;
    durationSeconds?: number;
  };
  assertCurrentAccount(context);
  if (!payload.playableObjectPath) throw new Error("استجاب الخادم دون مسار فيديو قابل للتشغيل.");
  if (
    purpose === "student_placement_video"
    || purpose === "teacher_kyc_video"
    || purpose === "live_session_recording"
  ) {
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
  options?: {
    name?: string;
    contentType?: string;
    purpose?: SubmissionVideoPurpose;
    expectedAccountGeneration?: number;
  },
): Promise<VideoUploadResult> {
  return uploadNativeVideoWithOptions(uri, {
    name: options?.name ?? `placement-${Date.now()}.mp4`,
    contentType: options?.contentType ?? "video/mp4",
    purpose: options?.purpose ?? "student_placement_video",
    onProgress,
    expectedAccountGeneration: options?.expectedAccountGeneration,
  });
}

export async function uploadNativeLiveSessionRecording(
  uri: string,
  options: Omit<UploadOptions, "purpose">,
  expectedAccountGeneration?: number,
): Promise<VideoUploadResult> {
  return uploadNativeVideoWithOptions(uri, {
    ...options,
    purpose: "live_session_recording",
    expectedAccountGeneration,
  });
}

async function uploadNativeVideoWithOptions(uri: string, options: UploadOptions): Promise<VideoUploadResult> {
  const context = await captureAccountContext(options.expectedAccountGeneration);
  const result = await uploadNativeFileWithResult(uri, options, context);
  assertCurrentAccount(context);
  if (!("videoProof" in result)) throw new Error("لم يُثبت الخادم فيديو الاعتماد.");
  return { ...result, accountGeneration: context.generation };
}

export async function uploadNativeFile(uri: string, options: UploadOptions): Promise<string> {
  const context = await captureAccountContext(options.expectedAccountGeneration);
  const result = await uploadNativeFileWithResult(uri, options, context);
  assertCurrentAccount(context);
  return result.playableObjectPath;
}

/**
 * Link an already finalized private object to the live session. Storage
 * finalization and session finalization are separate server checks.
 */
export async function finalizeLiveSessionRecording(
  sessionId: string,
  recording: VideoUploadResult,
  clientDurationSeconds: number,
): Promise<void> {
  const context = await captureAccountContext(recording.accountGeneration);
  const response = await fetchWithTimeout(`${apiOrigin()}/api/storage/live-session-recordings/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authorizedHeaders(context) },
    body: JSON.stringify({
      sessionId,
      objectPath: recording.playableObjectPath,
      durationSeconds: clientDurationSeconds,
      videoProof: recording.videoProof,
    }),
  }, "انتهت مهلة ربط التسجيل بالحلقة. تحقق من الاتصال وحاول مرة أخرى.", context);
  assertCurrentAccount(context);
  if (response.ok) return;
  const body = await response.json().catch(() => null) as { error?: string } | null;
  assertCurrentAccount(context);
  throw new Error(body?.error || "تعذر ربط التسجيل بالحلقة.");
}

async function uploadNativeFileWithResult(
  uri: string,
  options: UploadOptions,
  context: AccountRequestContext,
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
  const { uploadURL, objectPath, uploadProof } = await requestUploadUrl(context, name, size, contentType, purpose);
  assertCurrentAccount(context);
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
        if (isCurrentAccountGeneration(context.generation) && event.totalBytesExpectedToSend > 0) {
        onProgress?.(Math.round((event.totalBytesSent / event.totalBytesExpectedToSend) * 90));
      }
    },
  );
  const unsubscribe = onAccountTransition(() => {
    void task.cancelAsync().catch(() => undefined);
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    assertCurrentAccount(context);
    const uploadPromise = task.uploadAsync();
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        void task.cancelAsync().catch(() => undefined);
        reject(new Error("انتهت مهلة رفع الملف. تحقق من الاتصال وحاول مرة أخرى."));
      }, UPLOAD_TIMEOUT_MS);
    });
    let result: Awaited<typeof uploadPromise>;
    try {
      result = await Promise.race([uploadPromise, timeoutPromise]);
    } catch (cause) {
      assertCurrentAccount(context);
      throw cause;
    }
    assertCurrentAccount(context);
    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error("فشل رفع الملف إلى التخزين. تحقق من الاتصال وحاول مرة أخرى.");
    }
    onProgress?.(92);
    const finalized = await finalizeUpload(context, objectPath, purpose, uploadProof);
    assertCurrentAccount(context);
    onProgress?.(100);
    return finalized;
  } finally {
    if (timeout) clearTimeout(timeout);
    unsubscribe();
  }
}