import { SURAHS } from "@/lib/quran-data";

/** موضع الصفحة داخل سورتها (0..1)، أو null لسورة في صفحة واحدة. */
export function surahPageProgress(surahNumber: number | null, page: number): number | null {
  if (!surahNumber) return null;
  const surah = SURAHS[surahNumber - 1];
  if (!surah) return null;
  const nextStart = SURAHS[surahNumber]?.startPage ?? 605;
  const last = Math.max(surah.startPage, nextStart - (nextStart > surah.startPage ? 1 : 0));
  const count = last - surah.startPage + 1;
  if (count <= 1) return null;
  return Math.min(1, Math.max(0, (page - surah.startPage + 1) / count));
}
