import { Platform } from "react-native";
import { apiOrigin } from "./trpc";

export type LibraryMediaBook = {
  id: string;
  contentType: string;
  sourceType?: string | null;
  fileObjectKey?: string | null;
  fileUrl?: string | null;
  externalUrl?: string | null;
  audioUrl?: string | null;
};

function appendToken(url: string, token: string | null) {
  if (!token) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    parsed.searchParams.set("token", token);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isPrivateApiUrl(value: string) {
  try {
    const parsed = new URL(value);
    const origin = new URL(apiOrigin()).origin;
    return parsed.origin === origin
      && (parsed.pathname.startsWith("/api/storage/objects/")
        || parsed.pathname.startsWith("/api/storage/books/"));
  } catch {
    return false;
  }
}

function stripToken(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    return parsed.toString();
  } catch {
    return url;
  }
}

function objectUrl(value: string, token: string | null) {
  if (isHttpUrl(value)) return value;
  if (value.startsWith("/api/storage/")) return appendToken(`${apiOrigin()}${value}`, token);
  const path = value.startsWith("/objects/") ? value : value.startsWith("/") ? value : `/${value}`;
  return appendToken(`${apiOrigin()}/api/storage${path}`, token);
}

export function resolveLibraryAsset(value: string | null | undefined, token: string | null) {
  if (!value) return "";
  if (/^file:\/\//i.test(value)) return value;
  if (isHttpUrl(value)) return isPrivateApiUrl(value) ? appendToken(value, token) : value;
  return objectUrl(value, token);
}

export type LibraryPlayableSource = {
  uri: string;
  headers?: Record<string, string>;
};

/**
 * Canonical media source/auth resolver.
 *
 * Web uses a short-lived query token because the browser media element cannot
 * reliably attach an Authorization header. Native uses a Bearer header and
 * deliberately removes any token query from private API URLs. External URLs
 * and local file:// previews are never given the app token.
 */
export function resolveLibraryPlayableSource(
  value: string | null | undefined,
  token: string | null,
  runtime: "web" | "native" = Platform.OS === "web" ? "web" : "native",
): LibraryPlayableSource | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (/^file:\/\//i.test(raw)) return { uri: raw };

  const privateUrl = isPrivateApiUrl(raw);
  const resolved = isHttpUrl(raw)
    ? raw
    : objectUrl(raw, runtime === "web" ? token : null);
  if (!isHttpUrl(resolved)) return null;

  if (!privateUrl && !isPrivateApiUrl(resolved)) return { uri: resolved };
  if (runtime === "web") return { uri: appendToken(resolved, token) };

  const uri = stripToken(resolved);
  return token
    ? { uri, headers: { Authorization: `Bearer ${token}` } }
    : { uri };
}

export function bookPdfUrl(bookId: string, token: string | null, inline = true) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (inline) params.set("inline", "1");
  const query = params.toString();
  return `${apiOrigin()}/api/storage/books/${encodeURIComponent(bookId)}/download${query ? `?${query}` : ""}`;
}

/**
 * Matches Web's streamUrl/objectUrl policy without exposing fileObjectKey as a
 * UI URL. Uploaded PDFs use the student-authorized book endpoint; other
 * private objects use the authenticated object stream.
 */
export function resolveLibrarySource(book: LibraryMediaBook, token: string | null) {
  const contentType = typeof book.contentType === "string" ? book.contentType : "";
  const sourceType = typeof book.sourceType === "string" ? book.sourceType : "";
  const fileObjectKey = typeof book.fileObjectKey === "string" ? book.fileObjectKey : "";
  const fileUrl = typeof book.fileUrl === "string" ? book.fileUrl : "";
  const externalUrl = typeof book.externalUrl === "string" ? book.externalUrl : "";
  const audioUrl = typeof book.audioUrl === "string" ? book.audioUrl : "";
  const uploadedPdf = contentType === "pdf" && (
    sourceType === "uploaded"
    || fileObjectKey.startsWith("/objects/")
    || fileUrl.startsWith("/objects/")
  );
  if (uploadedPdf) return bookPdfUrl(book.id, token, true);

  const raw = contentType === "audio"
    ? audioUrl || fileUrl || externalUrl
    : fileUrl || externalUrl || audioUrl;
  if (!raw) return "";
  if (isHttpUrl(raw)) return isPrivateApiUrl(raw) ? appendToken(raw, token) : raw;
  return objectUrl(raw, token);
}