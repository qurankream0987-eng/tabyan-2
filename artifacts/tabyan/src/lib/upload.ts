const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Real two-step upload: request a presigned URL from our API server,
 * then PUT the bytes directly to cloud storage.
 * Returns the objectPath (e.g. /objects/uploads/<id>) to store in the DB.
 * The file is later served from `${BASE}/api/storage${objectPath}`.
 */
export async function uploadFile(
  file: Blob,
  name: string,
  onProgress?: (pct: number) => void,
  purpose?: "live_session_recording" | "book_pdf",
): Promise<string> {
  const token = localStorage.getItem("tabyan_token");
  const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({
      name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      ...(purpose ? { purpose } : {}),
    }),
  });
  if (!res.ok) throw new Error("تعذر تجهيز الرفع — تأكد من تسجيل الدخول");
  const { uploadURL, objectPath } = (await res.json()) as { uploadURL: string; objectPath: string };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadURL);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("فشل رفع الملف")));
    xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء الرفع"));
    xhr.send(file);
  });

  // تأمين الملف: ملكية خاصة للرافع (+ قراءة للمسؤول) — بدونها يبقى الملف غير قابل للقراءة (fail-closed)
  const fin = await fetch(`${BASE}/api/storage/uploads/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ objectPath, ...(purpose ? { purpose } : {}) }),
  });
  if (!fin.ok) {
    // الخادم قد يرفض الملف لأنه ليس فيديو صالحاً — نُظهر رسالته الواضحة للمستخدم
    const body = (await fin.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "تعذر تأمين الملف بعد الرفع");
  }

  return objectPath;
}

/**
 * A live recording is not considered saved when its bytes reach storage. The
 * final request verifies the finalized private object and only then creates
 * its session record. This preserves the invariant that the database never
 * points at a fabricated recording URL.
 */
export async function finalizeLiveSessionRecording(
  sessionId: string,
  objectPath: string,
  durationSeconds: number,
): Promise<void> {
  const token = localStorage.getItem("tabyan_token");
  const response = await fetch(`${BASE}/api/storage/live-session-recordings/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, objectPath, durationSeconds }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null) as { error?: string } | null;
  throw new Error(body?.error || "تعذر ربط التسجيل بالحلقة");
}

/**
 * Build the serving URL for a stored objectPath.
 * The auth token is appended as a query param because media tags
 * (<video>, <img>) cannot send Authorization headers.
 */
export function objectUrl(objectPath: string, diagnosticId?: string): string {
  if (/^https?:\/\//.test(objectPath)) return objectPath;
  const token = localStorage.getItem("tabyan_token");
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (diagnosticId) query.set("diag", diagnosticId);
  const suffix = query.toString();
  return `${BASE}/api/storage${objectPath}${suffix ? `?${suffix}` : ""}`;
}

/** Student-authorized stream for a published uploaded book. */
export function bookFileUrl(bookId: string, inline = true): string {
  const token = localStorage.getItem("tabyan_token");
  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (inline) query.set("inline", "1");
  return `${BASE}/api/storage/books/${encodeURIComponent(bookId)}/download${query.toString() ? `?${query}` : ""}`;
}
