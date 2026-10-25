/**
 * محرك الضعف والمراجعة الذكية (Part 30–31) — حتمي وقابل للتفسير بالكامل.
 *
 * درجة الضعف لآية (كلما ارتفعت احتاجت مراجعة أكثر):
 *
 *   weakness = 3.0 × الأخطاء المؤكدة
 *            + 1.5 × الأخطاء المصحَّحة
 *            + 1.0 × التلميحات
 *            + 2.0 × المراجعات الفاشلة
 *            − 1.5 × المراجعات الناجحة        (بحد أدنى صفر للمجموع)
 *            + تقادم: min(3, أيام منذ آخر مراجعة ÷ 7)   (فقط إن وُجد ضعف سابق)
 *
 * الكلمات الصحيحة لا تُنقص الدرجة مباشرة (تلاوة كثيرة لا تمحو خطأً متكرراً)،
 * بل عبر المراجعات الناجحة. كل عنصر في الدرجة يُعاد سبباً نصياً للمستخدم.
 */
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import type { AyahStat, HistoryData } from "./recitationHistoryStore";

export const WEAKNESS_WEIGHTS = {
  mistake: 3,
  corrected: 1.5,
  peek: 1,
  failedReview: 2,
  successfulReview: -1.5,
  stalenessPerWeek: 1,
  stalenessCap: 3,
} as const;

const DAY = 86_400_000;

export interface WeaknessScore {
  verseKey: string;
  score: number;
  reasons: string[];
  daysSinceReview: number;
}

export function weaknessOf(stat: AyahStat, now: number): WeaknessScore {
  const w = WEAKNESS_WEIGHTS;
  const days = stat.lastReviewedAt ? Math.floor((now - stat.lastReviewedAt) / DAY) : 0;
  const base = w.mistake * stat.mistakes
    + w.corrected * stat.corrected
    + w.peek * stat.peeks
    + w.failedReview * stat.failedReviews
    + w.successfulReview * stat.successfulReviews;
  const hadWeakness = stat.mistakes + stat.corrected + stat.peeks + stat.failedReviews > 0;
  const staleness = hadWeakness ? Math.min(w.stalenessCap, (days / 7) * w.stalenessPerWeek) : 0;
  const score = Math.max(0, base) + (Math.max(0, base) > 0 ? staleness : 0);
  const reasons: string[] = [];
  if (stat.mistakes) reasons.push(`${toArabicDigits(stat.mistakes)} خطأ مؤكد`);
  if (stat.corrected) reasons.push(`${toArabicDigits(stat.corrected)} خطأ مصحَّح`);
  if (stat.peeks) reasons.push(`${toArabicDigits(stat.peeks)} تلميح`);
  if (stat.failedReviews) reasons.push(`${toArabicDigits(stat.failedReviews)} مراجعة لم تكتمل`);
  if (stat.successfulReviews) reasons.push(`${toArabicDigits(stat.successfulReviews)} مراجعة متقنة`);
  if (staleness >= 1 && score > 0) reasons.push(`لم تُراجع منذ ${toArabicDigits(days)} يوماً`);
  return { verseKey: stat.verseKey, score: Math.round(score * 10) / 10, reasons, daysSinceReview: days };
}

export function rankWeakness(data: HistoryData, now: number, limit = 20): WeaknessScore[] {
  return Object.values(data.ayahs)
    .map((stat) => weaknessOf(stat, now))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || compareVerseKeys(a.verseKey, b.verseKey))
    .slice(0, limit);
}

export function compareVerseKeys(a: string, b: string) {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

/** فترات مراجعة متباعدة حسب عدد المراجعات المتقنة المتتالية (أيام). */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;

export function isDueForReview(stat: AyahStat, now: number): boolean {
  if (!stat.lastReviewedAt) return false;
  const streak = Math.max(0, stat.successfulReviews - stat.failedReviews);
  const interval = REVIEW_INTERVAL_DAYS[Math.min(REVIEW_INTERVAL_DAYS.length - 1, streak)];
  return now - stat.lastReviewedAt >= interval * DAY;
}

export interface ReviewRange {
  surah: number;
  from: number;
  to: number;
}

/** يجمع آيات متتالية من السورة نفسها في نطاقات (البقرة ٥–٩ بدل خمس بطاقات). */
export function groupRanges(verseKeys: string[], maxGap = 1): ReviewRange[] {
  const sorted = [...new Set(verseKeys)].sort(compareVerseKeys);
  const ranges: ReviewRange[] = [];
  for (const key of sorted) {
    const [surah, ayah] = key.split(":").map(Number);
    const last = ranges.at(-1);
    if (last && last.surah === surah && ayah - last.to <= maxGap + 1) last.to = ayah;
    else ranges.push({ surah, from: ayah, to: ayah });
  }
  return ranges;
}

export function rangeLabel(range: ReviewRange) {
  const name = SURAHS[range.surah - 1]?.name ?? "";
  return range.from === range.to
    ? `${name} ${toArabicDigits(range.from)}`
    : `${name} ${toArabicDigits(range.from)}–${toArabicDigits(range.to)}`;
}

export type RecommendationKind = "weakest" | "due_today" | "frequent_mistakes" | "stale" | "warmup";

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  description: string;
  ranges: ReviewRange[];
}

const TITLES: Record<RecommendationKind, string> = {
  weakest: "أضعف مواضعي",
  due_today: "مراجعة اليوم",
  frequent_mistakes: "مواضع كثيرة الأخطاء",
  stale: "لم أراجعها منذ مدة",
  warmup: "تهيئة سريعة",
};

/**
 * توصيات من السجل الفعلي فقط؛ سجل فارغ = لا توصيات (لا اقتراحات وهمية).
 */
export function recommend(data: HistoryData, now: number): Recommendation[] {
  const stats = Object.values(data.ayahs);
  if (!stats.length) return [];
  const out: Recommendation[] = [];

  const weakest = rankWeakness(data, now, 6);
  if (weakest.length) {
    out.push({
      kind: "weakest",
      title: TITLES.weakest,
      description: weakest[0].reasons.slice(0, 2).join(" · "),
      ranges: groupRanges(weakest.map((w) => w.verseKey)).slice(0, 4),
    });
  }

  const due = stats.filter((s) => isDueForReview(s, now)).map((s) => s.verseKey);
  if (due.length) {
    out.push({
      kind: "due_today",
      title: TITLES.due_today,
      description: `${toArabicDigits(due.length)} آية حان موعد مراجعتها حسب فترات المراجعة المتباعدة`,
      ranges: groupRanges(due).slice(0, 4),
    });
  }

  const frequent = stats.filter((s) => s.mistakes + s.corrected >= 2).map((s) => s.verseKey);
  if (frequent.length) {
    out.push({
      kind: "frequent_mistakes",
      title: TITLES.frequent_mistakes,
      description: "آيات تكرر فيها الخطأ مرتين أو أكثر",
      ranges: groupRanges(frequent).slice(0, 4),
    });
  }

  const stale = stats.filter((s) => s.lastReviewedAt && now - s.lastReviewedAt >= 14 * DAY).map((s) => s.verseKey);
  if (stale.length) {
    out.push({
      kind: "stale",
      title: TITLES.stale,
      description: "لم تُتلَ منذ أسبوعين أو أكثر",
      ranges: groupRanges(stale).slice(0, 4),
    });
  }

  const last = [...data.sessions].sort((a, b) => b.at - a.at)[0];
  if (last?.firstVerseKey && last.lastVerseKey) {
    const [surah, from] = last.firstVerseKey.split(":").map(Number);
    const [endSurah, to] = last.lastVerseKey.split(":").map(Number);
    out.push({
      kind: "warmup",
      title: TITLES.warmup,
      description: "آخر ما تلوته — ثلاثة أسئلة قصيرة",
      ranges: [{ surah, from, to: endSurah === surah ? Math.max(from, to) : (SURAHS[surah - 1]?.ayahs ?? from) }],
    });
  }
  return out;
}
