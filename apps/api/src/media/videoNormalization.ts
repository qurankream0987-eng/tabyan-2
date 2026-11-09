/**
 * Uploaded videos are made playable everywhere after they are accepted: an iPhone's HEVC
 * (H.265), a browser's WebM, AMR audio, or a needlessly heavy 1080p file plays on few
 * Android phones and browsers, or takes minutes to load. Such a file is converted in the
 * background to H.264/AAC MP4 at 720p and put in place of the original, which is kept
 * under backups/. The object path, owner and ACL do not change.
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { ffprobeRuntimePath, probeVideoFileDetails } from "./videoStructure";

export type VideoStreams = {
  format: string;
  videoCodec: string | null;
  audioCodec: string | null;
  width: number;
  height: number;
};

/** Above this a video is re-encoded even in a playable codec (1 min ≈ 19 MB). */
const MAX_BITS_PER_SECOND = 2_500_000;
const PLAYABLE_AUDIO = new Set(["aac", "mp3"]);

/** Why a video should be converted, or null when it already plays everywhere. */
export function normalizationReason(streams: VideoStreams, sizeBytes: number, durationSeconds: number): string | null {
  if (!streams.format.startsWith("mov,mp4")) return `container ${streams.format}`;
  if (streams.videoCodec !== "h264") return `video ${streams.videoCodec ?? "none"}`;
  if (streams.audioCodec && !PLAYABLE_AUDIO.has(streams.audioCodec)) return `audio ${streams.audioCodec}`;
  if (durationSeconds > 0 && (sizeBytes * 8) / durationSeconds > MAX_BITS_PER_SECOND) return "bitrate";
  return null;
}

function run(binary: string, args: string[], timeout: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stderr: String(stderr).slice(-500) }));
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export async function probeVideoStreams(filePath: string): Promise<VideoStreams> {
  const { stdout } = await run(ffprobeRuntimePath(), [
    "-v", "error", "-show_entries", "format=format_name:stream=codec_type,codec_name,width,height", "-of", "json", filePath,
  ], 60_000);
  const parsed = JSON.parse(stdout) as {
    format?: { format_name?: string };
    streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number }[];
  };
  const video = parsed.streams?.find((s) => s.codec_type === "video");
  const audio = parsed.streams?.find((s) => s.codec_type === "audio");
  return {
    format: parsed.format?.format_name ?? "",
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    width: video?.width ?? 0,
    height: video?.height ?? 0,
  };
}

/** H.264 Main / AAC MP4, the shorter side at most 720 px, moov first so playback starts at once. */
export function transcodeArgs(input: string, output: string): string[] {
  return [
    "-y", "-v", "error", "-i", input,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "libx264", "-profile:v", "main", "-preset", "veryfast", "-crf", "25", "-pix_fmt", "yuv420p",
    "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart",
    output,
  ];
}

export type NormalizationStorage = {
  download(objectPath: string): Promise<{ body: ReadableStream<Uint8Array> | null }>;
  replace(objectPath: string, filePath: string, contentType: string): Promise<boolean>;
};

export type NormalizationLog = {
  info(details: Record<string, unknown>, message: string): void;
  warn(details: Record<string, unknown>, message: string): void;
};

/**
 * Converts one stored video when it needs it. Returns what was done; never throws for a
 * file that cannot be converted (the original stays as uploaded).
 */
export async function normalizeStoredVideo(
  objectPath: string,
  storage: NormalizationStorage,
  log: NormalizationLog,
  ffmpegPath = "ffmpeg",
): Promise<"converted" | "kept" | "failed"> {
  const id = randomUUID();
  const input = join(tmpdir(), `tabyan-normalize-${id}-in`);
  const output = join(tmpdir(), `tabyan-normalize-${id}-out.mp4`);
  try {
    const download = await storage.download(objectPath);
    if (!download.body) return "failed";
    await pipeline(Readable.fromWeb(download.body), createWriteStream(input));
    const before = await probeVideoFileDetails(input);
    if (!before.valid || before.durationSeconds == null) return "kept";
    const streams = await probeVideoStreams(input);
    const { size } = await stat(input);
    const reason = normalizationReason(streams, size, before.durationSeconds);
    if (!reason) return "kept";
    const started = Date.now();
    await run(ffmpegPath, transcodeArgs(input, output), 15 * 60_000);
    const after = await probeVideoFileDetails(output);
    // The converted file must be whole and as long as the original, or the original stays.
    if (!after.valid || after.durationSeconds == null || Math.abs(after.durationSeconds - before.durationSeconds) > 1.5) {
      log.warn({ objectPath, reason, before: before.durationSeconds, after: after.durationSeconds }, "Video normalization produced a different video; original kept");
      return "failed";
    }
    const converted = (await stat(output)).size;
    if (!(await storage.replace(objectPath, output, "video/mp4"))) return "kept";
    log.info({ objectPath, reason, fromBytes: size, toBytes: converted, ms: Date.now() - started }, "Video normalized for playback");
    return "converted";
  } catch (error) {
    log.warn({ objectPath, err: error }, "Video normalization failed; original kept");
    return "failed";
  } finally {
    await rm(input, { force: true });
    await rm(output, { force: true });
  }
}

/** One conversion at a time: they are CPU-heavy, and uploads are few. */
let queue: Promise<unknown> = Promise.resolve();
export function scheduleVideoNormalization(
  objectPath: string,
  storage: NormalizationStorage,
  log: NormalizationLog,
  onDone?: (result: "converted" | "kept" | "failed") => void,
) {
  queue = queue.then(() => normalizeStoredVideo(objectPath, storage, log)).then((result) => onDone?.(result), () => undefined);
}
