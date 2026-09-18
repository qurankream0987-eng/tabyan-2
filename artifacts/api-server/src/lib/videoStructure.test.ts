import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeVideoFile, validateMp4Structure, validateWebmStructure } from "./videoStructure";

const mkBox = (type: string, size: number): Buffer => {
  const b = Buffer.alloc(8);
  b.writeUInt32BE(size, 0);
  b.write(type, 4, "latin1");
  return b;
};

/* ── أدوات بناء عناصر EBML ── */
const EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const SEGMENT = Buffer.from([0x18, 0x53, 0x80, 0x67]);
const CLUSTER = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);
const INFO = Buffer.from([0x15, 0x49, 0xa9, 0x66]);
const TRACKS = Buffer.from([0x16, 0x54, 0xae, 0x6b]);

/** vint حجم بطول بايت واحد (حتى 126) */
const vint1 = (n: number) => Buffer.from([0x80 | n]);
/** vint حجم بطول بايتين (حتى 16382) */
const vint2 = (n: number) => Buffer.from([0x40 | (n >> 8), n & 0xff]);
/** vint حجم غير معروف بطول 8 بايتات (أسلوب MediaRecorder) */
const VINT_UNKNOWN = Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

const ebmlEl = (id: Buffer, size: Buffer, payload: Buffer) => Buffer.concat([id, size, payload]);

const TIMESTAMP = Buffer.from([0xe7]);
const SIMPLE_BLOCK = Buffer.from([0xa3]);

/** ملف WebM نموذجي بأسلوب MediaRecorder: ترويسة معلومة + Segment غير معلوم + Cluster غير معلوم + كتل SimpleBlock معلومة */
function makeMediaRecorderWebm(payloadBytes = 200, blockCount = 4): Buffer {
  const header = ebmlEl(EBML, vint1(32), Buffer.alloc(32));
  const inner = Buffer.concat([ebmlEl(INFO, vint1(16), Buffer.alloc(16)), ebmlEl(TRACKS, vint1(24), Buffer.alloc(24))]);
  const blocks: Buffer[] = [ebmlEl(TIMESTAMP, vint1(2), Buffer.alloc(2))];
  const perBlock = Math.floor(payloadBytes / blockCount);
  for (let i = 0; i < blockCount; i++) {
    blocks.push(ebmlEl(SIMPLE_BLOCK, vint1(perBlock), Buffer.alloc(perBlock)));
  }
  return Buffer.concat([header, SEGMENT, VINT_UNKNOWN, inner, CLUSTER, VINT_UNKNOWN, ...blocks]);
}

/* ═══ MP4 ═══ */

test("MP4: stub مبتور (512 بايت أحرف tab — نفس نمط ملف Production) يُرفض", () => {
  const stub = Buffer.alloc(512, 0x09);
  assert.equal(validateMp4Structure(stub, null, stub.length), false);
});

test("MP4: ملف صغير سليم (ftyp + moov + mdat ممتد للنهاية) يُقبل", () => {
  const good = Buffer.concat([mkBox("ftyp", 24), Buffer.alloc(16), mkBox("moov", 40), Buffer.alloc(32), mkBox("mdat", 0), Buffer.alloc(100)]);
  assert.equal(validateMp4Structure(good, null, good.length), true);
});

test("MP4: صندوق mdat معلن أكبر من حجم الملف (بتر في الوسط) يُرفض", () => {
  const bad = Buffer.concat([mkBox("ftyp", 24), Buffer.alloc(16), mkBox("mdat", 1_000_000)]);
  assert.equal(validateMp4Structure(bad, null, bad.length), false);
});

test("MP4: moov في الذيل (غير faststart) يُقبل عند تمرير الذيل", () => {
  const head = Buffer.concat([mkBox("ftyp", 24), Buffer.alloc(16), mkBox("mdat", 70 * 1024)]);
  const tail = Buffer.concat([Buffer.alloc(8), mkBox("moov", 16), Buffer.alloc(8)]);
  assert.equal(validateMp4Structure(head, tail, 70 * 1024 + 48), true);
});

test("MP4: بلا moov في الرأس والذيل يُرفض", () => {
  const noMoov = Buffer.concat([mkBox("ftyp", 24), Buffer.alloc(16), mkBox("mdat", 0), Buffer.alloc(50)]);
  assert.equal(validateMp4Structure(noMoov, null, noMoov.length), false);
});

test("MP4: حجم صفر أو رأس فارغ يُرفض", () => {
  assert.equal(validateMp4Structure(Buffer.alloc(0), null, 0), false);
});

/* ═══ WebM ═══ */

test("WebM: ملف بأسلوب MediaRecorder (أحجام غير معلومة) يُقبل", () => {
  const good = makeMediaRecorderWebm();
  assert.equal(validateWebmStructure(good, null, good.length), true);
});

test("WebM: أحجام معلومة كاملة ضمن حدود الملف تُقبل", () => {
  const cluster = ebmlEl(CLUSTER, vint1(64), Buffer.alloc(64));
  const segmentPayload = Buffer.concat([ebmlEl(INFO, vint1(8), Buffer.alloc(8)), cluster]);
  const good = Buffer.concat([ebmlEl(EBML, vint1(32), Buffer.alloc(32)), ebmlEl(SEGMENT, vint1(segmentPayload.length), segmentPayload)]);
  assert.equal(validateWebmStructure(good, null, good.length), true);
});

test("WebM: Segment معلن أكبر من الملف (مبتور الذيل) يُرفض", () => {
  const truncated = Buffer.concat([ebmlEl(EBML, vint1(32), Buffer.alloc(32)), SEGMENT, vint1(120), Buffer.alloc(40)]);
  assert.equal(validateWebmStructure(truncated, null, truncated.length), false);
});

test("WebM: Cluster معلن أكبر من الملف (بتر وسط بيانات الوسائط) يُرفض", () => {
  const header = ebmlEl(EBML, vint1(32), Buffer.alloc(32));
  const truncated = Buffer.concat([header, SEGMENT, VINT_UNKNOWN, CLUSTER, vint2(10_000), Buffer.alloc(300)]);
  assert.equal(validateWebmStructure(truncated, null, truncated.length), false);
});

test("WebM: عنصر داخلي (Tracks) يتجاوز حجم الملف يُرفض", () => {
  const header = ebmlEl(EBML, vint1(32), Buffer.alloc(32));
  const bad = Buffer.concat([header, SEGMENT, VINT_UNKNOWN, TRACKS, vint1(100), Buffer.alloc(20)]);
  assert.equal(validateWebmStructure(bad, null, bad.length), false);
});

test("WebM: stub يبدأ بتوقيع EBML لكن العنصر الثاني ليس Segment يُرفض", () => {
  const stub = Buffer.concat([ebmlEl(EBML, vint1(32), Buffer.alloc(32)), Buffer.alloc(100)]);
  assert.equal(validateWebmStructure(stub, null, stub.length), false);
});

test("WebM: ترويسة EBML معلنة أكبر من الملف (مبتورة) تُرفض", () => {
  const tiny = Buffer.concat([EBML, Buffer.from([0xb8]), Buffer.alloc(4)]);
  assert.equal(validateWebmStructure(tiny, null, tiny.length), false);
});

test("WebM: Cluster في الذيل بحدود صالحة يُقبل عند غيابه عن الرأس", () => {
  const header = ebmlEl(EBML, vint1(32), Buffer.alloc(32));
  const head = Buffer.concat([header, SEGMENT, VINT_UNKNOWN, INFO, vint1(100)]);
  const fileSize = 200 * 1024;
  const tailLen = 512;
  const cluster = ebmlEl(CLUSTER, vint1(200), Buffer.alloc(200));
  const tail = Buffer.concat([Buffer.alloc(tailLen - cluster.length), cluster]);
  assert.equal(validateWebmStructure(head, tail, fileSize), true);
});

test("WebM: stub نمط ملف Production (512 بايت tabs) يُرفض", () => {
  const stub = Buffer.alloc(512, 0x09);
  assert.equal(validateWebmStructure(stub, null, stub.length), false);
});

test("WebM: ملف MediaRecorder مكتمل بكتل معلومة داخل Cluster غير معلوم يُقبل", () => {
  const good = makeMediaRecorderWebm(400, 4);
  assert.equal(validateWebmStructure(good, null, good.length), true);
});

test("WebM: بتر ذيل ملف MediaRecorder (Cluster غير معلوم) عند عدة إزاحات يُرفض", () => {
  const good = makeMediaRecorderWebm(400, 4);
  for (const cut of [1, 7, 25, 60, 99]) {
    const truncated = good.subarray(0, good.length - cut);
    assert.equal(validateWebmStructure(truncated, null, truncated.length), false, `cut=${cut}`);
  }
});

test("WebM: ملف كبير (ذيل منفصل) مكتمل يُقبل، ومبتور الذيل يُرفض", () => {
  // ملف 200KB: الرأس يغطي أول 64KB فقط، والذيل يحمل نهاية آخر Cluster
  const header = ebmlEl(EBML, vint1(32), Buffer.alloc(32));
  const inner = Buffer.concat([ebmlEl(INFO, vint1(16), Buffer.alloc(16)), ebmlEl(TRACKS, vint1(24), Buffer.alloc(24))]);
  const blocks = [ebmlEl(TIMESTAMP, vint1(2), Buffer.alloc(2))];
  // كتل تملأ ~200KB
  const bigBlockPayload = 16000;
  for (let i = 0; i < 12; i++) blocks.push(ebmlEl(SIMPLE_BLOCK, vint2(bigBlockPayload), Buffer.alloc(bigBlockPayload)));
  const full = Buffer.concat([header, SEGMENT, VINT_UNKNOWN, inner, CLUSTER, VINT_UNKNOWN, ...blocks]);
  const head = full.subarray(0, 64 * 1024);
  const tail = full.subarray(full.length - 64 * 1024);
  assert.equal(validateWebmStructure(head, tail, full.length), true);
  // بتر 100 بايت من النهاية: آخر كتلة لم تعد تنتهي عند حجم الملف
  const truncatedSize = full.length - 100;
  const truncTail = full.subarray(truncatedSize - 64 * 1024, truncatedSize);
  assert.equal(validateWebmStructure(head, truncTail, truncatedSize), false);
});

/* ═══ الطبقة الثانية: ffprobe على ملفات حقيقية (يتخطى إن غاب ffmpeg) ═══ */

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const FFMPEG_OK = hasFfmpeg();

function makeFixture(kind: "mp4" | "webm", path: string): void {
  const codecs = kind === "mp4" ? ["-c:v", "libx264", "-c:a", "aac"] : ["-c:v", "libvpx-vp9", "-c:a", "libopus"];
  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=10",
    "-f", "lavfi", "-i", "sine=duration=2",
    ...codecs, path,
  ], { stdio: "pipe" });
}

test("ffprobe: فيديو MP4 حقيقي سليم يُقبل، ومبتور الذيل يُرفض", { skip: !FFMPEG_OK }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "tabyan-test-"));
  const valid = join(dir, "valid.mp4");
  makeFixture("mp4", valid);
  assert.equal(await probeVideoFile(valid), true);
  const trunc = join(dir, "trunc.mp4");
  const bytes = execFileSync("head", ["-c", "-50000", valid]);
  writeFileSync(trunc, bytes);
  assert.equal(await probeVideoFile(trunc), false);
});

test("ffprobe: فيديو WebM حقيقي سليم يُقبل، ومبتور الذيل يُرفض", { skip: !FFMPEG_OK }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "tabyan-test-"));
  const valid = join(dir, "valid.webm");
  makeFixture("webm", valid);
  assert.equal(await probeVideoFile(valid), true);
  const trunc = join(dir, "trunc.webm");
  const bytes = execFileSync("head", ["-c", "-30000", valid]);
  writeFileSync(trunc, bytes);
  assert.equal(await probeVideoFile(trunc), false);
});

test("ffprobe: stub نمط ملف Production (512 بايت tabs) يُرفض", { skip: !FFMPEG_OK }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "tabyan-test-"));
  const stub = join(dir, "stub.mp4");
  writeFileSync(stub, Buffer.alloc(512, 0x09));
  assert.equal(await probeVideoFile(stub), false);
});
