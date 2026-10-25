import { privateMediaFailureMessage, usePrivateMedia } from "@/lib/private-media";

/**
 * Native <video>/<audio> for stored private objects (and external URLs).
 * Never renders a silent black box: loading, denial, missing file, and
 * unsupported-format states are all explained in Arabic with a retry.
 */
export default function PrivateMediaPlayer({
  source,
  kind = "video",
  className,
  autoPlay,
  onError,
}: {
  source: string | null | undefined;
  kind?: "video" | "audio";
  className?: string;
  autoPlay?: boolean;
  onError?: () => void;
}) {
  const media = usePrivateMedia(source, { onError });

  if (!media.isPrivate && !media.src) {
    return (
      <div className="flex items-center justify-center h-24 rounded-xl bg-muted/40 border border-border px-4">
        <p className="font-readex text-sm text-muted-foreground text-center">
          {kind === "audio" ? "لا يوجد ملف صوتي صالح للتشغيل." : "لا يوجد فيديو صالح للتشغيل."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {kind === "audio" ? (
        <audio src={media.src} controls preload="metadata" autoPlay={autoPlay} className={className ?? "w-full"} {...media.mediaProps} />
      ) : (
        <video
          src={media.src}
          controls
          preload="metadata"
          playsInline
          autoPlay={autoPlay}
          className={className ?? "w-full rounded-xl bg-night max-h-80"}
          {...media.mediaProps}
        />
      )}
      {media.loading && !media.src && (
        <p className="font-readex text-xs text-muted-foreground text-center">جارٍ تجهيز التشغيل…</p>
      )}
      {media.failure && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 font-readex text-xs font-bold text-destructive">
          <span className="flex-1">{privateMediaFailureMessage(media.failure, kind)}</span>
          {media.failure !== "forbidden" && media.failure !== "missing" && (
            <button
              type="button"
              onClick={media.retry}
              className="rounded-lg border border-destructive/30 bg-background px-3 py-1.5 text-[11px]"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      )}
    </div>
  );
}
