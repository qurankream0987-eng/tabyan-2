import { SURAHS } from "./quran-surahs";

/** بيانات صفحة المصحف — الصيغة المدمجة التي يولّدها scripts/download-mushaf.mjs */
export type MushafWordTuple = readonly [position: number, line: number, type: 0 | 1 | 2, code: string];
export interface MushafVerse {
  /** مفتاح الآية مثل "2:255" */ k: string;
  /** رقم الآية داخل السورة */ n: number;
  /** رقم السورة */ c: number;
  /** كلمات الآية */ w: MushafWordTuple[];
}
export interface MushafPageData {
  /** رقم الصفحة 1..604 */ p: number;
  /** الجزء */ j: number;
  /** الحزب */ h: number | null;
  v: MushafVerse[];
}
/** كلمة مفككة جاهزة للعرض داخل سطر */
export interface LineWord {
  verseKey: string;
  chapter: number;
  verseNum: number;
  position: number;
  /** 0=كلمة 1=خاتمة آية 2=علامة وقف */
  type: 0 | 1 | 2;
  /** رموز glyphs لخط QCF v2 الخاص بالصفحة */
  code: string;
}

/** صف واحد من صفحة المصحف: أسطر الكلمات، أو ترويسة سورة، أو بسملة. */
export interface MushafLineModel {
  line: number;
  kind: "words" | "surah-header" | "basmalah";
  words?: LineWord[];
  surahName?: string;
  surahNumber?: number;
  ayahCount?: number;
  centered?: boolean;
}

/**
 * يوزّع كلمات الصفحة على أسطرها الحقيقية (line_v2)، ويضع ترويسة السورة والبسملة
 * في السطرين السابقين لأول آية من كل سورة كما في الطبعة المدنية.
 */
export function buildPageLines(data: MushafPageData): MushafLineModel[] {
  const wordLines = new Map<number, LineWord[]>();
  const models: MushafLineModel[] = [];
  for (const v of data.v) {
    for (const w of v.w) {
      const lw: LineWord = {
        verseKey: v.k, chapter: v.c, verseNum: v.n,
        position: w[0], type: w[2], code: w[3],
      };
      const arr = wordLines.get(w[1]) ?? [];
      arr.push(lw);
      wordLines.set(w[1], arr);
    }
    if (v.n === 1 && v.w.length > 0) {
      const firstLine = v.w[0][1];
      const isFatiha  = v.c === 1;
      const isTawbah  = v.c === 9;
      const headerLine = firstLine - (isFatiha || isTawbah ? 1 : 2);
      if (headerLine >= 1) {
        const meta = SURAHS[v.c - 1];
        models.push({ line: headerLine, kind: "surah-header", surahName: meta?.name ?? "", surahNumber: meta?.n, ayahCount: meta?.ayahs });
        if (!isFatiha && !isTawbah) models.push({ line: headerLine + 1, kind: "basmalah" });
      } else if (headerLine === 0 && !isFatiha && !isTawbah) {
        // The title closed the previous page; its basmala opens this one.
        models.push({ line: 1, kind: "basmalah" });
      }
    }
  }
  // A surah ending above line 15 leaves the next surah's title (and basmala) at the foot of
  // this page when that surah starts on the next one, as in the printed Madinah mushaf.
  const last = data.v[data.v.length - 1];
  const lastLine = last ? Math.max(...last.w.map((w) => w[1])) : 15;
  const next = last ? SURAHS[last.c] : undefined;
  if (last && next && last.n === SURAHS[last.c - 1]?.ayahs && lastLine < 15) {
    models.push({ line: lastLine + 1, kind: "surah-header", surahName: next.name, surahNumber: next.n, ayahCount: next.ayahs });
    if (lastLine + 2 <= 15 && next.n !== 9) models.push({ line: lastLine + 2, kind: "basmalah" });
  }
  for (const [line, words] of wordLines) {
    const centered = words.some(
      (w) => w.type === 1 && SURAHS[w.chapter - 1] && w.verseNum === SURAHS[w.chapter - 1].ayahs
    );
    models.push({ line, kind: "words", words, centered });
  }
  return models.sort((a, b) => a.line - b.line);
}
