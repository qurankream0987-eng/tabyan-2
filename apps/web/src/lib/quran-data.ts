// Surah table shared with the mobile app; the Juz table below is web-only.
export { SURAHS, TOTAL_PAGES, type SurahMeta } from "@workspace/tabyan-domain/quran-surahs";

export interface JuzMeta {
  n: number;
  name: string;
  startPage: number;
}

const JUZ_NAMES = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن",
  "التاسع", "العاشر", "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر",
  "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون",
  "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون",
];

const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const JUZ_LIST: JuzMeta[] = JUZ_NAMES.map((name, i) => ({
  n: i + 1,
  name: `الجزء ${name}`,
  startPage: JUZ_START_PAGES[i],
}));
