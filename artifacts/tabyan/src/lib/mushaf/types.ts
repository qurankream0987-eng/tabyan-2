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
