const QURAN_MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g;
const FORMAT_CHARS = /[\u200C\u200D\uFEFF]/g;

export function normalizeQuranText(text: string) {
  return text
    .normalize("NFC")
    .replace(/\u0670/g, "ا")
    .replace(QURAN_MARKS, "")
    .replace(/\u0640/g, "")
    .replace(FORMAT_CHARS, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}