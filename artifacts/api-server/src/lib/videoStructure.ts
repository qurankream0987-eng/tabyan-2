/**
 * فحص سلامة ملفات الفيديو المرفوعة على طبقتين:
 * 1. مدققات بنيوية نقية وسريعة (رأس/ذيل) ترفض العوارض الواضحة دون تنزيل كامل.
 * 2. probeVideoFile — المدقق النهائي الموثوق عبر ffprobe: يقرأ كل حزم الملف
 *    ويفشل على أي خطأ (moov مفقود، نهاية مبتورة، بيانات فاسدة).
 * لا حد أدنى للحجم — أي فيديو صغير سليم يمر.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** يُرمى عندما يكون ثنائي ffprobe غير متوفر في بيئة التشغيل — خطأ بنية تحتية، ليس فيديو غير صالح */
export class FfprobeUnavailableError extends Error {
  constructor() {
    super("ffprobe binary is not available in this runtime");
    this.name = "FfprobeUnavailableError";
  }
}

/**
 * مسار ffprobe بأولوية:
 * 1. النسخة المنسوخة بجانب الحزمة (dist/bin/ffprobe) — بيئة النشر: esbuild يدمج
 *    كود ffprobe-static لكن ثنائيّه ملف خارجي لا يُدمج، وbuild.mjs ينسخه هناك.
 * 2. حزمة ffprobe-static من node_modules — بيئة التطوير والاختبارات (tsx).
 * 3. ffprobe النظام كاحتياط أخير.
 */
function resolveFfprobePath(): string {
  try {
    const bundledPath = fileURLToPath(new URL("./bin/ffprobe", import.meta.url));
    if (existsSync(bundledPath)) return bundledPath;
  } catch {
    /* import.meta غير متاح — تابع */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = (require("ffprobe-static") as { path: string }).path;
    if (staticPath && existsSync(staticPath)) return staticPath;
  } catch {
    /* الحزمة غير متوفرة — جرّب النظام */
  }
  return "ffprobe";
}

const FFPROBE_PATH = resolveFfprobePath();

/** المسار المحلول فعلياً — لسجل الإقلاع حتى يُعرف أي ثنائي سيُستخدم في كل بيئة */
export function ffprobeRuntimePath(): string {
  return FFPROBE_PATH;
}

/** فحص بدء التشغيل: يجب أن يتوفر ffprobe وإلا فالفحص الخادمي معطّل — يُسجَّل بوضوح عند الإقلاع */
export function assertFfprobeAvailable(): boolean {
  return FFPROBE_PATH !== "ffprobe" || existsSync(FFPROBE_PATH) || whichFfprobe();
}

function whichFfprobe(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
    execFileSync("ffprobe", ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * يفحص ملف فيديو على القرص عبر ffprobe: يجب أن ينجح الخروج، وألا يطبع أي
 * خطأ (ffprobe يخرج 0 أحياناً رغم تلف الملف، لذا stderr الفارغ شرط)، وأن
 * يجد مسار فيديو واحداً على الأقل بحزم فعلية.
 * يرمي FfprobeUnavailableError إذا غاب الثنائي — لا يصنّفه كفيديو غير صالح.
 */
export function probeVideoFile(filePath: string): Promise<boolean> {
  return probeVideoFileDetails(filePath).then((result) => result.valid);
}

export type VideoProbeResult = {
  valid: boolean;
  durationSeconds: number | null;
};

export function probeVideoFileDetails(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    execFile(
      FFPROBE_PATH,
      [
        "-v", "error",
        "-count_packets",
        "-show_entries", "stream=codec_type,nb_read_packets,duration:format=format_name,duration",
        "-of", "json",
        filePath,
      ],
      { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new FfprobeUnavailableError());
          return;
        }
        if (error) { resolve({ valid: false, durationSeconds: null }); return; }
        if (stderr.trim().length > 0) { resolve({ valid: false, durationSeconds: null }); return; }
        try {
          const parsed = JSON.parse(stdout) as {
            format?: { format_name?: string; duration?: string };
            streams?: { codec_type?: string; nb_read_packets?: string; duration?: string }[];
          };
          // حاوية معروفة فقط — ffprobe قد يخمّن ملفاً نصياً كـ rawvideo
          const format = parsed.format?.format_name ?? "";
          if (!/^(mov,mp4,m4a,3gp,3g2,mj2|matroska,webm)$/.test(format)) {
            resolve({ valid: false, durationSeconds: null });
            return;
          }
          const video = (parsed.streams ?? []).find((s) => s.codec_type === "video");
          const rawDuration = video?.duration ?? parsed.format?.duration;
          const durationSeconds = rawDuration == null ? NaN : Number(rawDuration);
          resolve({
            valid: !!video
              && Number(video.nb_read_packets ?? 0) > 0
              && Number.isFinite(durationSeconds)
              && durationSeconds > 0,
            durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null,
          });
        } catch {
          resolve({ valid: false, durationSeconds: null });
        }
      },
    );
  });
}


const EBML_HEADER_ID = 0x1a45dfa3;
const WEBM_SEGMENT_ID = 0x18538067;
const WEBM_CLUSTER_ID = 0x1f43b675;

/** يمشي على صناديق MP4 ذات المستوى الأعلى ويتحقق أن أياً منها لا يتجاوز حجم الملف الفعلي */
export function walkMp4Boxes(bytes: Buffer, baseOffset: number, fileSize: number, found: Set<string>): boolean {
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let boxSize = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    let headerSize = 8;
    if (boxSize === 1) {
      if (offset + 16 > bytes.length) return false;
      boxSize = Number(bytes.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (boxSize === 0) {
      boxSize = fileSize - baseOffset - offset; // الصندوق يمتد حتى نهاية الملف
    }
    if (!/^[\x20-\x7e]{4}$/.test(type) || boxSize < headerSize) return false;
    found.add(type);
    // صندوق معلن يتجاوز حجم الملف الحقيقي = ملف مبتور
    if (baseOffset + offset + boxSize > fileSize) return false;
    offset += boxSize;
  }
  return true;
}

/**
 * MP4/MOV: ftyp إلزامي، الصناديق المعلنة يجب ألا تتجاوز حجم الملف،
 * وmoov (فهرس التشغيل) يجب أن يوجد في الرأس أو الذيل.
 */
export function validateMp4Structure(head: Buffer, tail: Buffer | null, fileSize: number): boolean {
  if (fileSize <= 0 || head.length === 0) return false;
  const found = new Set<string>();
  if (!walkMp4Boxes(head, 0, fileSize, found)) return false;
  if (!found.has("ftyp")) return false;
  if (!found.has("moov")) {
    if (tail === null) return false; // الرأس غطى الملف كله ولا moov
    if (!tail.includes(Buffer.from("moov", "latin1"))) return false;
  }
  return true;
}

/** يقرأ معرّف عنصر EBML (vint مع الاحتفاظ ببت العلامة، 1-4 بايت)؛ يعيد null عند نقص البايتات */
function readEbmlId(bytes: Buffer, offset: number): { id: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let length = 0;
  for (let i = 0; i < 4; i++) {
    if (first & (0x80 >> i)) { length = i + 1; break; }
  }
  if (length === 0 || offset + length > bytes.length) return null;
  let id = 0;
  for (let i = 0; i < length; i++) id = id * 256 + bytes[offset + i];
  return { id, length };
}

/** يفك حجم عنصر EBML المشفر vint (بت العلامة يُزال)؛ unknown = كل بتات القيمة 1 (الحجم غير معروف) */
function readEbmlVintSize(bytes: Buffer, offset: number): { value: bigint; length: number; unknown: boolean } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let length = 0;
  for (let i = 0; i < 8; i++) {
    if (first & (0x80 >> i)) { length = i + 1; break; }
  }
  if (length === 0 || offset + length > bytes.length) return null;
  let value = BigInt(first & (~(0x80 >> (length - 1)) & 0xff));
  for (let i = 1; i < length; i++) {
    value = (value << 8n) | BigInt(bytes[offset + i]);
  }
  const unknown = value === (1n << BigInt(7 * length)) - 1n;
  return { value, length, unknown };
}

/** يفحص عنصر Cluster ابتداءً من معرّفه عند الموضع المعطى؛ الحدود بإزاحات مطلقة مقابل حجم الملف */
function clusterFitsFile(bytes: Buffer, offset: number, absStart: number, fileSize: number): boolean {
  const size = readEbmlVintSize(bytes, offset + 4); // معرّف Cluster دائماً 4 بايت
  if (!size) return false;
  const dataStart = absStart + offset + 4 + size.length;
  if (size.unknown) return dataStart < fileSize; // MediaRecorder يكتب حجماً غير معروف
  return dataStart + Number(size.value) <= fileSize;
}

/** معرّفات عناصر مستوى الكتلة داخل Cluster — نقاط انطلاق محتملة لسلسلة نهاية الملف */
const BLOCK_LEVEL_IDS = [0xa3, 0xa0, 0xe7, 0xec, 0xbf]; // SimpleBlock, BlockGroup, Timestamp, Void, CRC-32
const CLUSTER_ID_BYTES = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);

/**
 * يمشي على سلسلة عناصر EBML متتالية ابتداءً من موضع داخل مخزن بايتات،
 * وينجح فقط إذا انتهت السلسلة تماماً عند نهاية الملف الحقيقي — أي أن آخر
 * عنصر مكتمل يقف عند fileSize. ملف مبتور من الذيل يترك عنصراً أخيراً
 * معلناً يتجاوز fileSize فتفشل كل السلاسل.
 */
function chainReachesEof(buf: Buffer, start: number, absStart: number, fileSize: number): boolean {
  let pos = start;
  for (let guard = 0; guard < 4096; guard++) {
    const el = readEbmlId(buf, pos);
    if (!el) return false;
    const size = readEbmlVintSize(buf, pos + el.length);
    if (!size) return false;
    const dataStart = pos + el.length + size.length;
    if (size.unknown) {
      // عنصر ممتد حتى نهاية أبيه؛ مع وجود حمولة يُقبل كنهاية نظيفة
      return absStart + dataStart < fileSize;
    }
    const end = absStart + dataStart + Number(size.value);
    if (end > fileSize) return false;
    if (end === fileSize) return true;
    pos = dataStart + Number(size.value);
  }
  return false;
}

/** يبحث في مخزن (رأس أو ذيل) عن أي سلسلة عناصر تنتهي نظيفة عند نهاية الملف */
export function ebmlTailClosesCleanly(buf: Buffer, absStart: number, fileSize: number): boolean {
  // جرّب من بداية المخزن نفسه (قد يبدأ تماماً عند حد عنصر)
  if (chainReachesEof(buf, 0, absStart, fileSize)) return true;
  // ثم من كل ظهور لمعرّف Cluster أو عنصر مستوى الكتلة
  let idx = buf.indexOf(CLUSTER_ID_BYTES);
  while (idx !== -1) {
    if (chainReachesEof(buf, idx, absStart, fileSize)) return true;
    idx = buf.indexOf(CLUSTER_ID_BYTES, idx + 1);
  }
  for (let i = 0; i + 1 < buf.length; i++) {
    const b = buf[i];
    if (!BLOCK_LEVEL_IDS.includes(b)) continue;
    // لمعرّفات البايت الواحد: يجب أن تليها vint حجم قابلة للفك — chainReachesEof يتحقق
    if (chainReachesEof(buf, i, absStart, fileSize)) return true;
  }
  return false;
}

/**
 * WebM: يحلل عناصر EBML فعلياً — ترويسة EBML بحدود داخل الملف، ثم Segment
 * بحدود داخل الملف (أو حجم غير معروف ممتد للنهاية)، ثم عنصر Cluster واحد
 * على الأقل بحدود صالحة داخل الملف. أي عنصر معلن يتجاوز حجم الملف الحقيقي
 * = ملف مبتور ويُرفض، حتى لو بدأ بالتوقيع الصحيح.
 */
export function validateWebmStructure(head: Buffer, tail: Buffer | null, fileSize: number): boolean {
  if (fileSize <= 0 || head.length < 8) return false;

  // العنصر الأول: ترويسة EBML بحجم معلوم داخل الملف
  const headerEl = readEbmlId(head, 0);
  if (!headerEl || headerEl.id !== EBML_HEADER_ID) return false;
  let pos = headerEl.length;
  const headerSize = readEbmlVintSize(head, pos);
  if (!headerSize || headerSize.unknown) return false;
  pos += headerSize.length;
  if (pos + Number(headerSize.value) > fileSize) return false;
  pos += Number(headerSize.value);
  if (pos >= fileSize || pos >= head.length) return false;

  // العنصر الثاني: Segment — حجمه (إن كان معلوماً) يجب ألا يتجاوز الملف
  const segmentEl = readEbmlId(head, pos);
  if (!segmentEl || segmentEl.id !== WEBM_SEGMENT_ID) return false;
  pos += segmentEl.length;
  const segmentSize = readEbmlVintSize(head, pos);
  if (!segmentSize) return false;
  pos += segmentSize.length;
  if (!segmentSize.unknown && pos + Number(segmentSize.value) > fileSize) return false;

  // امشِ على أبناء Segment داخل الرأس حتى أول Cluster
  while (pos < head.length) {
    const el = readEbmlId(head, pos);
    if (!el) break;
    if (el.id === WEBM_CLUSTER_ID) {
      const clusterSize = readEbmlVintSize(head, pos + el.length);
      if (!clusterSize) return false;
      const dataStart = pos + el.length + clusterSize.length;
      if (!clusterSize.unknown) {
        // حجم معلوم: يجب أن يكتمل داخل الملف
        return dataStart + Number(clusterSize.value) <= fileSize;
      }
      // حجم غير معلوم (أسلوب MediaRecorder): يمتد للنهاية — يجب أن تغلق
      // عناصر الذيل نظيفة عند نهاية الملف وإلا فالملف مبتور الذيل
      if (tail !== null) return ebmlTailClosesCleanly(tail, fileSize - tail.length, fileSize);
      // الرأس يغطي الملف كله: امشِ على محتوى Cluster حتى نهاية الملف
      return ebmlTailClosesCleanly(head.subarray(dataStart), dataStart, fileSize);
    }
    const childSize = readEbmlVintSize(head, pos + el.length);
    if (!childSize) break;
    if (childSize.unknown) break; // عنصر غير معروف الحجم قبل أي Cluster — لا يمكن التخطي
    const next = pos + el.length + childSize.length + Number(childSize.value);
    if (next > fileSize) return false; // عنصر داخلي يتجاوز حجم الملف = مبتور
    if (next <= pos) return false; // حماية من حلقة لا نهائية
    pos = next;
  }

  // لم يُعثر على Cluster في الرأس — افحص الذيل إن توفر (ملفات كبيرة)
  if (tail === null) return false;
  const tailStart = fileSize - tail.length;
  let scan = tail.indexOf(CLUSTER_ID_BYTES);
  while (scan !== -1) {
    if (clusterFitsFile(tail, scan, tailStart, fileSize)) return true;
    scan = tail.indexOf(CLUSTER_ID_BYTES, scan + 1);
  }
  return false;
}
