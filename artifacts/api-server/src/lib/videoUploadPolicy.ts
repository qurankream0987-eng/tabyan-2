/**
 * Returns the lower-case media type essence of a Content-Type value.
 * Browsers' MediaRecorder reports types such as
 * `video/mp4;codecs=avc1.42E01E,mp4a.40.2`; the codec parameters describe the
 * same container and must not cause the upload to be rejected.
 */
export function videoUploadMediaType(contentType: string): string {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

/**
 * Container/extension pairing accepted for placement, KYC and live-session
 * video uploads. The file bytes are still verified after upload (signature,
 * box/EBML structure and ffprobe); this is only the request-time gate.
 */
export function isSupportedVideoUpload(name: string, contentType: string): boolean {
  const mediaType = videoUploadMediaType(contentType);
  return (
    (mediaType === "video/mp4" && /\.mp4$/i.test(name))
    || (mediaType === "video/webm" && /\.webm$/i.test(name))
    || (mediaType === "video/quicktime" && /\.mov$/i.test(name))
  );
}
