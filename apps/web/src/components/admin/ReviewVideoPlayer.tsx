import { useEffect, useMemo, useRef, useState } from "react";
import { objectUrl } from "@/lib/upload";
import { privateMediaFailureMessage, privateObjectPath, usePrivateMedia } from "@/lib/private-media";

/** يستخرج معرّف فيديو YouTube من صيغ الروابط الشائعة، أو null إن لم يكن رابط YouTube */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v") ?? "";
        return /^[\w-]{11}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

type DirectUrlResult = "NOT TESTED" | "OPENED" | "PASS" | "FAIL";
type DiagnosticEvent = {
  name: string;
  at: string;
};

function makeDiagnosticId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `diag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function safeSource(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    return `${url.origin}/api/storage/objects/[redacted]`;
  } catch {
    return "/api/storage/objects/[redacted]";
  }
}

function safeDiagnosticText(value: string | null | undefined): string {
  if (!value) return "none";
  // Browser-provided error text is untrusted and can contain a failing URL,
  // bearer token, or cookie. Preserve the required field without raw content.
  return "[browser message redacted]";
}

/**
 * مشغّل فيديو المراجعات — يصنّف الرابط تلقائياً:
 * YouTube → iframe آمن (youtube-nocookie) · /objects/ → مشغّل محمي عبر objectUrl · غير ذلك → رسالة
 */
export default function ReviewVideoPlayer({
  videoUrl,
  title,
  onError,
  playbackMode = "private",
  className = "w-full rounded-xl bg-night max-h-72",
}: {
  videoUrl: string;
  title?: string;
  onError?: () => void;
  playbackMode?: "placement" | "private";
  className?: string;
}) {
  const ytId = youtubeVideoId(videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [diagnosticId] = useState(makeDiagnosticId);
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [copied, setCopied] = useState(false);
  const [directUrlResult, setDirectUrlResult] = useState<DirectUrlResult>("NOT TESTED");
  const [readyDiagnosticId, setReadyDiagnosticId] = useState<string | null>(null);
  const privatePath = privateObjectPath(videoUrl);
  const isPrivateObject = privatePath !== null;
  const isPlacementPlayback = playbackMode === "placement" && isPrivateObject;
  // Native streaming through a signed capability for both modes — no Blob
  // download of the whole file (it broke seeking and memory for long videos).
  const media = usePrivateMedia(ytId ? null : videoUrl, {
    purpose: playbackMode === "placement" ? "placement" : "media",
    diagnosticId: isPlacementPlayback ? diagnosticId : undefined,
    onError,
  });
  const diagnosticReady = !isPrivateObject || readyDiagnosticId === diagnosticId;
  const playbackUrl = useMemo(
    () => (privatePath ? objectUrl(privatePath, diagnosticId) : videoUrl),
    [videoUrl, diagnosticId, privatePath],
  );

  useEffect(() => {
    if (isPlacementPlayback) {
      setReadyDiagnosticId(diagnosticId);
      return;
    }
    if (!isPrivateObject) {
      setReadyDiagnosticId(diagnosticId);
      return;
    }
    setReadyDiagnosticId(null);
    let cancelled = false;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("tabyan_token");
    fetch(`${base}/api/storage/diagnostic-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
       body: JSON.stringify({ objectPath: privatePath, diagnosticId }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("diagnostic registration failed");
        if (!cancelled) setReadyDiagnosticId(diagnosticId);
      })
      .catch(() => {
        if (!cancelled) setReadyDiagnosticId(null);
      });
    return () => { cancelled = true; };
  }, [videoUrl, diagnosticId, privatePath, isPrivateObject, isPlacementPlayback]);

  const recordEvent = (name: string) => {
    setEvents((previous) => [
      ...previous.slice(-79),
      { name, at: new Date().toISOString() },
    ]);
  };

  const copyReport = async () => {
    const video = videoRef.current;
    const error = video?.error;
    const eventNames = events.map((event) => event.name);
    const hasMetadata = eventNames.includes("loadedmetadata");
    const hasPlaying = eventNames.includes("playing");
    const hasError = eventNames.includes("error") || !!error;
    const caseName = hasPlaying
      ? "CASE C"
      : hasMetadata && Number.isFinite(video?.duration) && (video?.videoWidth ?? 0) > 0 && hasError
        ? "CASE B"
        : "CASE A";
    const report = [
      "TABYAN SAFARI VIDEO DIAGNOSTIC",
      "Diagnostic ID: " + diagnosticId,
      "Browser: " + navigator.userAgent,
      "Platform: " + navigator.platform,
      "Case: " + caseName,
      "Timestamp: " + new Date().toISOString(),
      "currentSrc: " + safeSource(video?.currentSrc || playbackUrl),
      "error.code: " + (error?.code ?? "none"),
      "error.message: " + safeDiagnosticText(error?.message),
      "readyState: " + (video?.readyState ?? "unknown"),
      "networkState: " + (video?.networkState ?? "unknown"),
      "duration: " + (Number.isFinite(video?.duration) ? video?.duration : "NaN"),
      "currentTime: " + (video?.currentTime ?? "unknown"),
      "videoWidth: " + (video?.videoWidth ?? "unknown"),
      "videoHeight: " + (video?.videoHeight ?? "unknown"),
      "paused: " + (video?.paused ?? "unknown"),
      "Direct URL Test: " + directUrlResult,
      "Events:",
      events.length ? events.map((event) => `${event.name} @ ${event.at}`).join(" → ") : "none",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("انسخ تقرير التشخيص (بدون أي token):", report);
    }
  };

  const openDirectUrl = async () => {
    if (!privatePath) return;
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("tabyan_token");
      const response = await fetch(`${base}/api/storage/diagnostic-direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
       body: JSON.stringify({ objectPath: privatePath, diagnosticId }),
      });
      if (!response.ok) throw new Error("direct diagnostic request failed");
      const { url } = await response.json() as { url: string };
      // The returned URL has only an opaque short-lived ID. Authorization
      // remains in an HttpOnly cookie and is never shown in the address bar.
      window.open(url, "_blank", "noopener,noreferrer");
      setDirectUrlResult("OPENED");
    } catch {
      setDirectUrlResult("FAIL");
    }
  };

  const mediaEventHandlers = {
    onLoadStart: () => recordEvent("loadstart"),
    onDurationChange: () => recordEvent("durationchange"),
    onLoadedMetadata: () => recordEvent("loadedmetadata"),
    onLoadedData: () => recordEvent("loadeddata"),
    onProgress: () => recordEvent("progress"),
    onCanPlay: () => recordEvent("canplay"),
    onCanPlayThrough: () => recordEvent("canplaythrough"),
    onPlay: () => recordEvent("play"),
    onPlaying: () => recordEvent("playing"),
    onWaiting: () => recordEvent("waiting"),
    onStalled: () => recordEvent("stalled"),
    onSuspend: () => recordEvent("suspend"),
    onAbort: () => recordEvent("abort"),
    onEmptied: () => recordEvent("emptied"),
    onPause: () => recordEvent("pause"),
    onEnded: () => recordEvent("ended"),
  };

  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${ytId}`}
        title={title ?? "فيديو المراجعة"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full rounded-xl border-0 aspect-video bg-night"
      />
    );
  }
   if (privatePath) {
    return (
      <div className="space-y-2">
        <video
          ref={videoRef}
          src={media.src}
          controls
          preload="metadata"
          playsInline
          {...mediaEventHandlers}
          onLoadedMetadata={(event) => {
            recordEvent("loadedmetadata");
            media.mediaProps.onLoadedMetadata(event);
          }}
          onPlaying={() => {
            recordEvent("playing");
            media.mediaProps.onPlaying();
          }}
          onError={(event) => {
            event.currentTarget.setAttribute("data-video-error", "true");
            recordEvent("error");
            media.mediaProps.onError(event);
          }}
          className={className}
        />
        {media.loading && !media.src && (
          <p className="font-readex text-xs text-muted-foreground text-center">جارٍ تجهيز الفيديو…</p>
        )}
        {media.failure && (
          <div className="space-y-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 font-readex text-xs font-bold text-destructive">
            <div className="flex items-center gap-2">
              <span className="shrink-0">⚠</span>
              {privateMediaFailureMessage(media.failure)}
            </div>
            <button
              type="button"
              onClick={media.retry}
              className="rounded-lg border border-destructive/30 bg-background px-3 py-1.5 text-[11px]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!isPlacementPlayback && <button
            type="button"
            onClick={copyReport}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-readex text-[11px] font-bold text-foreground hover:bg-muted"
          >
            {copied ? "تم نسخ التشخيص" : "نسخ معلومات تشخيص الفيديو"}
          </button>}
          <button
            type="button"
            onClick={openDirectUrl}
            disabled={!diagnosticReady || !isPrivateObject}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-readex text-[11px] font-bold text-foreground hover:bg-muted"
          >
            {!isPrivateObject
              ? "الاختبار المباشر متاح للملفات الخاصة فقط"
              : diagnosticReady ? "اختبار فتح الفيديو مباشرة" : "جاري تجهيز التشخيص…"}
          </button>
          <span className="font-mono text-[10px] text-muted-foreground" aria-label="Diagnostic ID">
            {diagnosticId.slice(0, 8)}
          </span>
        </div>
        {directUrlResult === "OPENED" && (
          <div className="flex items-center gap-2 font-readex text-[11px] text-muted-foreground">
            <span>بعد العودة من الرابط المباشر:</span>
            <button type="button" onClick={() => setDirectUrlResult("PASS")} className="text-green-700 underline">نجح</button>
            <button type="button" onClick={() => setDirectUrlResult("FAIL")} className="text-destructive underline">فشل</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-24 rounded-xl bg-muted/40 border border-border px-4">
      <p className="font-readex text-sm text-muted-foreground text-center">رابط فيديو غير صالح أو غير مدعوم</p>
    </div>
  );
}
