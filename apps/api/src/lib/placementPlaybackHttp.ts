export type PlacementPlaybackRange = {
  start: number;
  end: number;
  total: number;
};

export function parsePlacementPlaybackRange(
  rangeHeader: string | undefined,
  totalSize: number,
): { range?: PlacementPlaybackRange; invalid: boolean } {
  if (!rangeHeader || totalSize <= 0) return { invalid: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return { invalid: false };
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { invalid: true };
    return {
      range: {
        start: Math.max(totalSize - suffixLength, 0),
        end: totalSize - 1,
        total: totalSize,
      },
      invalid: false,
    };
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= totalSize || end < start) {
    return { invalid: true };
  }
  return { range: { start, end, total: totalSize }, invalid: false };
}

export function normalizePlacementPlaybackContentType(value: unknown): {
  contentType: string;
  diagnosticCode: "PV18D2" | null;
} {
  const raw = String(value ?? "").trim().toLowerCase();
  const mediaType = raw.split(";", 1)[0]?.trim() ?? "";
  if (mediaType === "video/mp4") {
    return {
      contentType: "video/mp4",
      diagnosticCode: raw === "video/mp4" ? null : "PV18D2",
    };
  }
  if (mediaType === "video/webm") {
    return {
      contentType: "video/webm",
      diagnosticCode: raw === "video/webm" ? null : "PV18D2",
    };
  }
  if (mediaType === "video/quicktime") {
    return {
      contentType: "video/quicktime",
      diagnosticCode: raw === "video/quicktime" ? null : "PV18D2",
    };
  }
  return { contentType: "application/octet-stream", diagnosticCode: null };
}
/**
 * Content-Type for the general private-object route. Recorders store values
 * such as `video/mp4;codecs=vp9,opus` or `audio/webm;codecs=opus`; the codec
 * parameter is advisory, and a wrong one makes WebKit refuse a playable file
 * (MEDIA_ERR_SRC_NOT_SUPPORTED) before sniffing. Media types are reduced to
 * the bare container; other types (PDF, images) pass through unchanged.
 */
export function normalizeServedMediaContentType(value: unknown): string {
  const raw = String(value ?? "").trim();
  const mediaType = raw.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (/^(video|audio)\/[a-z0-9.+-]+$/.test(mediaType)) return mediaType;
  return raw || "application/octet-stream";
}
