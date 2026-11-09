import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizationReason, normalizeStoredVideo, probeVideoStreams } from "./videoNormalization";

const quiet = { info: () => undefined, warn: () => undefined };

function hasFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "pipe" }); return true; } catch { return false; }
}

test("only videos that do not play everywhere, or are heavy, are converted", () => {
  const h264 = { format: "mov,mp4,m4a,3gp,3g2,mj2", videoCodec: "h264", audioCodec: "aac", width: 720, height: 1280 };
  assert.equal(normalizationReason(h264, 8_000_000, 60), null);
  assert.equal(normalizationReason({ ...h264, videoCodec: "hevc" }, 8_000_000, 60), "video hevc");
  assert.equal(normalizationReason({ ...h264, audioCodec: "amr_nb" }, 8_000_000, 60), "audio amr_nb");
  assert.equal(normalizationReason({ ...h264, format: "matroska,webm", videoCodec: "vp9" }, 8_000_000, 60), "container matroska,webm");
  assert.equal(normalizationReason(h264, 144_000_000, 66), "bitrate");
});

test("an HEVC portrait video is replaced by H.264/AAC 720p of the same length", { skip: !hasFfmpeg() }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "tabyan-normalize-test-"));
  const original = join(dir, "hevc.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=30:duration=3",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libx265", "-tag:v", "hvc1", "-c:a", "aac", "-shortest", original]);
  let replaced: { path: string; type: string; bytes: Buffer } | null = null;
  const storage = {
    download: async () => ({ body: new Response(readFileSync(original)).body as never }),
    replace: async (path: string, filePath: string, type: string) => {
      const kept = join(dir, "replaced.mp4");
      copyFileSync(filePath, kept);
      replaced = { path, type, bytes: readFileSync(kept) };
      return true;
    },
  };
  assert.equal(await normalizeStoredVideo("/objects/uploads/x", storage, quiet), "converted");
  assert.ok(replaced);
  const result = replaced as { path: string; type: string; bytes: Buffer };
  assert.equal(result.path, "/objects/uploads/x");
  assert.equal(result.type, "video/mp4");
  const out = join(dir, "replaced.mp4");
  const streams = await probeVideoStreams(out);
  assert.equal(streams.videoCodec, "h264");
  assert.equal(streams.audioCodec, "aac");
  assert.equal(streams.width, 720);
  assert.equal(streams.height, 1280);
  // moov first: playback starts before the whole file arrives.
  assert.ok(result.bytes.subarray(0, 64 * 1024).includes(Buffer.from("moov")));

  // A video that already plays everywhere is left alone.
  replaced = null;
  storage.download = async () => ({ body: new Response(readFileSync(out)).body as never });
  assert.equal(await normalizeStoredVideo("/objects/uploads/y", storage, quiet), "kept");
  assert.equal(replaced, null);
});
