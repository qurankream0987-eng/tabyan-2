import { z } from "zod";
import { desc, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminProcedure } from "../middleware";
import { db } from "@workspace/db";
import { dailyVerses, users } from "@workspace/db";

/** آية اليوم — مصدر حقيقي (alquran.cloud، الرسم العثماني) مع إمكانية تخصيص المسؤول */

const QURAN_API = "https://api.alquran.cloud/v1";
const TOTAL_AYAHS = 6236;

export type DailyVerse = {
  text: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  source: "auto" | "admin" | "fallback";
};

/** آيات احتياطية تُستخدم فقط إذا تعذر الوصول للمصدر وقاعدة البيانات */
const FALLBACK_VERSES: Omit<DailyVerse, "source">[] = [
  { text: "إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوا وَّالَّذِينَ هُم مُّحْسِنُونَ", surahName: "النحل", surahNumber: 16, ayahNumber: 128 },
  { text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", surahName: "الطلاق", surahNumber: 65, ayahNumber: 2 },
  { text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", surahName: "الشرح", surahNumber: 94, ayahNumber: 6 },
  { text: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ", surahName: "البقرة", surahNumber: 2, ayahNumber: 216 },
  { text: "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", surahName: "التوبة", surahNumber: 9, ayahNumber: 120 },
  { text: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ", surahName: "هود", surahNumber: 11, ayahNumber: 88 },
  { text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", surahName: "الشرح", surahNumber: 94, ayahNumber: 5 },
];

/** تاريخ اليوم بتوقيت مكة المكرمة (UTC+3 ثابت) بصيغة YYYY-MM-DD */
export function todayInMakkah(): string {
  const now = new Date(Date.now() + 3 * 3600_000);
  return now.toISOString().slice(0, 10);
}

/** اختيار رقم آية حتمي (1..6236) من التاريخ — يتغير يومياً ولا يتكرر بنمط قصير */
function ayahNumberForDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return (h % TOTAL_AYAHS) + 1;
}

type QuranApiAyah = {
  text: string;
  numberInSurah: number;
  surah: { number: number; name: string };
};

/** جلب آية بالرسم العثماني من alquran.cloud (برقمها العام أو سورة:آية) */
async function fetchAyah(ref: string | number): Promise<Omit<DailyVerse, "source">> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${QURAN_API}/ayah/${ref}/quran-uthmani`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`quran api ${res.status}`);
    const json = (await res.json()) as { code: number; data: QuranApiAyah };
    if (json.code !== 200 || !json.data?.text) throw new Error("quran api bad payload");
    const d = json.data;
    // اسم السورة يأتي بصيغة "سُورَةُ ٱلْبَقَرَةِ" — نزيل كلمة سورة لأن الواجهة تضيفها
    const surahName = d.surah.name.replace(/^سُورَةُ\s+/u, "").trim();
    return { text: d.text, surahName, surahNumber: d.surah.number, ayahNumber: d.numberInSurah };
  } finally {
    clearTimeout(timer);
  }
}

function fallbackFor(dateStr: string): DailyVerse {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return { ...FALLBACK_VERSES[h % FALLBACK_VERSES.length], source: "fallback" };
}

/** الحصول على آية اليوم: مخصصة من المسؤول ← مخزنة تلقائياً ← جلب جديد وتخزين ← احتياطي */
export async function getDailyVerse(dateStr: string): Promise<DailyVerse> {
  // 1) موجودة في قاعدة البيانات (سواء وضعها المسؤول أو خُزّنت تلقائياً)
  try {
    const [row] = await db.select().from(dailyVerses).where(eq(dailyVerses.verseDate, dateStr)).limit(1);
    if (row) {
      return {
        text: row.text, surahName: row.surahName, surahNumber: row.surahNumber,
        ayahNumber: row.ayahNumber, source: row.source === "admin" ? "admin" : "auto",
      };
    }
  } catch { /* DB غير متاحة — نكمل بالجلب المباشر */ }

  // 2) جلب من المصدر الحقيقي وتخزينها لليوم
  try {
    const verse = await fetchAyah(ayahNumberForDate(dateStr));
    try {
      await db.insert(dailyVerses).values({
        id: crypto.randomUUID(), verseDate: dateStr, ...verse, source: "auto",
      }).onConflictDoNothing({ target: dailyVerses.verseDate });
    } catch { /* التخزين اختياري */ }
    return { ...verse, source: "auto" };
  } catch {
    // 3) احتياطي أخير حتى لا تظهر الشاشة فارغة
    return fallbackFor(dateStr);
  }
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ YYYY-MM-DD");

export const dailyVerseRouter = createRouter({
  /** آية اليوم — متاحة للجميع (تظهر أيضاً في الوضع التجريبي وقبل تسجيل الدخول) */
  today: publicQuery.query(async () => {
    const today = todayInMakkah();
    return { date: today, verse: await getDailyVerse(today) };
  }),

  /** معاينة آية قبل اعتمادها (المسؤول يدخل سورة + رقم آية) */
  preview: adminProcedure
    .input(z.object({ surahNumber: z.number().int().min(1).max(114), ayahNumber: z.number().int().min(1).max(286) }))
    .query(async ({ input }) => {
      try {
        return await fetchAyah(`${input.surahNumber}:${input.ayahNumber}`);
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "تعذر جلب الآية — تأكد من رقم السورة والآية" });
      }
    }),

  /** تحديد آية مخصصة ليوم معيّن (الافتراضي: اليوم) */
  set: adminProcedure
    .input(z.object({
      surahNumber: z.number().int().min(1).max(114),
      ayahNumber: z.number().int().min(1).max(286),
      date: dateSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dateStr = input.date ?? todayInMakkah();
      let verse: Omit<DailyVerse, "source">;
      try {
        verse = await fetchAyah(`${input.surahNumber}:${input.ayahNumber}`);
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "تعذر جلب الآية — تأكد من رقم السورة والآية" });
      }
      // set_by مرجع لجدول المستخدمين — حساب التطوير الوهمي غير موجود فيه
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const setBy = exists ? ctx.user.id : null;
      await db.insert(dailyVerses).values({
        id: crypto.randomUUID(), verseDate: dateStr, ...verse, source: "admin", setBy,
      }).onConflictDoUpdate({
        target: dailyVerses.verseDate,
        set: { ...verse, source: "admin", setBy },
      });
      return { date: dateStr, verse: { ...verse, source: "admin" as const } };
    }),

  /** إلغاء التخصيص والعودة للاختيار التلقائي */
  clear: adminProcedure
    .input(z.object({ date: dateSchema.optional() }))
    .mutation(async ({ input }) => {
      const dateStr = input.date ?? todayInMakkah();
      await db.delete(dailyVerses).where(eq(dailyVerses.verseDate, dateStr));
      return { ok: true };
    }),

  /** آخر الآيات المخزنة (لعرضها في لوحة الإدارة) */
  recent: adminProcedure.query(async () => {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    return db.select().from(dailyVerses)
      .where(gte(dailyVerses.verseDate, since))
      .orderBy(desc(dailyVerses.verseDate)).limit(14);
  }),
});
