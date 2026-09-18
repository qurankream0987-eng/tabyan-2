export type MushafWordTuple = readonly [position: number, line: number, type: 0 | 1 | 2, code: string];

export interface MushafVerse {
  k: string;
  n: number;
  c: number;
  w: MushafWordTuple[];
}

export interface MushafPageData {
  p: number;
  j: number;
  h: number | null;
  v: MushafVerse[];
}