import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { resolvePlacementPlaybackUrl } from "@/lib/placement-playback";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CAPABILITY_PATH = /^\/api\/storage\/media-playback\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export type PrivateMediaPurpose = "media" | "placement";
export type PrivateMediaFailure = "forbidden" | "missing" | "unsupported" | "network";

/** Accept both the stored object key and older URLs saved by previous builds. */
export function privateObjectPath(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  if (raw.startsWith("/objects/")) return raw.split("?")[0];
  try {
    const url = new URL(raw, window.location.origin);
    const marker = "/api/storage/objects/";
    if (url.pathname.startsWith(marker)) return `/objects/${url.pathname.slice(marker.length)}`;
    if (url.origin === window.location.origin && url.pathname.startsWith("/objects/")) return url.pathname;
  } catch {
    // Not a URL at all — callers treat it as an unsupported source.
  }
  return null;
}

/** Only same-origin media capability URLs without extra query are accepted. */
export function resolveMediaPlaybackUrl(candidateUrl: string, apiOrigin: string): string {
  const apiBase = new URL(apiOrigin);
  const parsed = new URL(candidateUrl, apiBase);
  if (parsed.origin !== apiBase.origin || !CAPABILITY_PATH.test(parsed.pathname) || parsed.search) {
    throw new Error("Media playback URL was rejected");
  }
  return parsed.href;
}

class PlaybackIssueError extends Error {
  constructor(readonly failure: PrivateMediaFailure) {
    super(failure);
  }
}

async function requestPlaybackUrl(
  objectPath: string,
  purpose: PrivateMediaPurpose,
  signal: AbortSignal,
  diagnosticId?: string,
): Promise<string> {
  const token = localStorage.getItem("tabyan_token");
  const endpoint = purpose === "placement" ? "placement-playback-url" : "media-playback-url";
  const response = await fetch(`${BASE}/api/storage/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(diagnosticId ? { "X-Diagnostic-Request-ID": diagnosticId } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ objectPath }),
    signal,
  });
  if (response.status === 401 || response.status === 403) throw new PlaybackIssueError("forbidden");
  if (response.status === 404) throw new PlaybackIssueError("missing");
  if (!response.ok) throw new PlaybackIssueError("network");
  const payload = await response.json() as { url?: unknown };
  if (typeof payload.url !== "string") throw new PlaybackIssueError("network");
  const apiOrigin = new URL(BASE || "/", window.location.origin).origin;
  return purpose === "placement"
    ? resolvePlacementPlaybackUrl(payload.url, apiOrigin)
    : resolveMediaPlaybackUrl(payload.url, apiOrigin);
}

type MediaElement = HTMLVideoElement | HTMLAudioElement;

/**
 * Plays a private stored object through the browser's native media pipeline.
 *
 * The long-lived session token never enters a media URL: a short-lived signed
 * capability is minted per object, and HTTP Range/seek/Safari semantics are
 * handled by the server. When a capability expires mid-session (a seek after
 * 15 minutes answers 410), the element errors; this hook silently mints a new
 * capability once and restores the position — the video is not "deleted".
 * External http(s) sources are passed through unchanged.
 */
export function usePrivateMedia(
  source: string | null | undefined,
  options: { purpose?: PrivateMediaPurpose; diagnosticId?: string; onError?: () => void } = {},
) {
  const purpose = options.purpose ?? "media";
  const objectPath = privateObjectPath(source);
  const external = !objectPath && source && /^https?:\/\//i.test(source) ? source : null;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<PrivateMediaFailure | null>(null);
  const [nonce, setNonce] = useState(0);
  const autoRetried = useRef(false);
  const resume = useRef<{ time: number; play: boolean } | null>(null);
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const fail = useCallback((kind: PrivateMediaFailure) => {
    setFailure(kind);
    onErrorRef.current?.();
  }, []);

  useEffect(() => {
    autoRetried.current = false;
    resume.current = null;
  }, [objectPath]);

  useEffect(() => {
    if (!objectPath) {
      setUrl(null);
      setLoading(false);
      setFailure(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailure(null);
    requestPlaybackUrl(objectPath, purpose, controller.signal, options.diagnosticId)
      .then((fresh) => {
        if (!controller.signal.aborted) setUrl(fresh);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setUrl(null);
        fail(error instanceof PlaybackIssueError ? error.failure : "network");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [objectPath, purpose, nonce, options.diagnosticId, fail]);

  /** Manual retry: a fresh capability, keeping the current position. */
  const retry = useCallback(() => {
    autoRetried.current = false;
    setFailure(null);
    setNonce((value) => value + 1);
  }, []);

  const onError = useCallback((event: SyntheticEvent<MediaElement>) => {
    const element = event.currentTarget;
    if (objectPath && !autoRetried.current) {
      autoRetried.current = true;
      resume.current = { time: element.currentTime || 0, play: !element.paused };
      setNonce((value) => value + 1);
      return;
    }
    fail(element.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? "unsupported" : "network");
  }, [objectPath, fail]);

  const onLoadedMetadata = useCallback((event: SyntheticEvent<MediaElement>) => {
    const pending = resume.current;
    if (!pending) return;
    resume.current = null;
    const element = event.currentTarget;
    if (pending.time > 0) element.currentTime = pending.time;
    if (pending.play) void element.play().catch(() => {});
  }, []);

  const onPlaying = useCallback(() => {
    autoRetried.current = false;
  }, []);

  return {
    isPrivate: !!objectPath,
    src: objectPath ? url ?? undefined : external ?? undefined,
    loading,
    failure,
    retry,
    mediaProps: { onError, onLoadedMetadata, onPlaying },
  };
}

export function privateMediaFailureMessage(failure: PrivateMediaFailure, kind: "video" | "audio" = "video"): string {
  const noun = kind === "audio" ? "الملف الصوتي" : "الفيديو";
  switch (failure) {
    case "forbidden":
      return `لا تملك صلاحية تشغيل هذا ${kind === "audio" ? "الملف الصوتي" : "الفيديو"}.`;
    case "missing":
      return `تعذر تشغيل ${noun}: الملف غير متوفر.`;
    case "unsupported":
      return `تعذر تشغيل ${noun}: صيغة الملف غير مدعومة في هذا المتصفح. جرّب متصفحاً أو جهازاً آخر.`;
    default:
      return `تعذر تشغيل ${noun}.`;
  }
}
