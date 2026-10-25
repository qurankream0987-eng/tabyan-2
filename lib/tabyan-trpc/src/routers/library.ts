import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, studentProcedure } from "../middleware";
import { db } from "@workspace/db";
import {
  bookAssignments, books, bookmarks, downloads, levels, studentProgress, students,
} from "@workspace/db";

/**
 * فلترة كتب المنهج حسب موقع الطالب الفعلي:
 * الكتاب المربوط بمستويات لا يظهر إلا إذا كان أحد مستوياته في **نفس مسار الطالب**
 * (وفي الشريعة: نفس المادة عبر levels.nameEn) وبترتيب لا يتجاوز ترتيب مستواه الحالي.
 * المقارنة العالمية بـ orderIndex وحدها كانت تسرّب كتباً بين المسارات (قرآن↔تجويد)
 * وبين مواد الشريعة المختلفة لأن orderIndex مكرر داخل مسار الشريعة.
 */
export function curriculumBookVisible(
  bookLevelIds: number[] | null,
  myLevel: { path: string; orderIndex: number; nameEn: string | null } | null,
  levelById: Map<number, { path: string; orderIndex: number; nameEn: string | null }>,
): boolean {
  const ids = bookLevelIds ?? [];
  if (ids.length === 0) return true; // كتاب عام لكل المستويات
  if (!myLevel) return false; // بلا مستوى حالي لا تُعرض كتب مرتبطة بمستويات
  return ids.some((id) => {
    const l = levelById.get(id);
    if (!l || l.path !== myLevel.path) return false;
    // الشريعة: مطابقة المادة صارمة (nameEn مكرر الترتيب بين المواد، فلا يكفي orderIndex)
    if (myLevel.path === "sharia" && l.nameEn !== myLevel.nameEn) return false;
    return l.orderIndex <= myLevel.orderIndex;
  });
}

/** نطاق مستوى الطالب الحالي + فهرس كل المستويات — أساس فلترة كتب المنهج في كل نقاط المكتبة */
async function studentLevelScope(userId: string) {
  const [st] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  let myLevel: { path: string; orderIndex: number; nameEn: string | null } | null = null;
  if (st?.currentLevelId) {
    const [lv] = await db.select().from(levels).where(eq(levels.id, st.currentLevelId)).limit(1);
    if (lv) myLevel = { path: lv.path, orderIndex: lv.orderIndex, nameEn: lv.nameEn };
  }
  const allLevels = await db.select().from(levels);
  const levelById = new Map(allLevels.map((l) => [l.id, { path: l.path, orderIndex: l.orderIndex, nameEn: l.nameEn }]));
  return { myLevel, levelById };
}

/** هل يحق للطالب فعلياً الوصول لهذا الكتاب؟ (منشور + أهلية المنهج) */
async function assertBookAccessible(userId: string, bookId: string) {
  const [book] = await db.select().from(books)
    .where(and(eq(books.id, bookId), eq(books.status, "published"))).limit(1);
  if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "الكتاب غير موجود أو غير منشور" });
  if (book.section === "curriculum") {
    const { myLevel, levelById } = await studentLevelScope(userId);
    if (!curriculumBookVisible((book.levelIds as number[] | null) ?? [], myLevel, levelById)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذا الكتاب غير متاح لمستواك الحالي" });
    }
  }
  return book;
}

const CATEGORY_LABELS: Record<string, string> = {
  aqeedah: "عقيدة", fiqh: "فقه", seerah: "سيرة", tajweed: "تجويد", quran: "قرآن", qiraat: "قراءات", fatwa: "فتوى", hadith: "حديث",
};

export const libraryRouter = createRouter({
  detail: studentProcedure
    .input(z.object({ bookId: z.string() }))
    .query(async ({ ctx, input }) => {
      const book = await assertBookAccessible(ctx.user.id, input.bookId);
      return { ...book, categoryLabel: CATEGORY_LABELS[book.category] ?? book.category };
    }),

  browse: studentProcedure
    .input(z.object({ section: z.string().optional(), category: z.string().optional(), query: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
      let myLevel: { path: string; orderIndex: number; nameEn: string | null } | null = null;
      if (st?.currentLevelId) {
        const [lv] = await db.select().from(levels).where(eq(levels.id, st.currentLevelId)).limit(1);
        if (lv) myLevel = { path: lv.path, orderIndex: lv.orderIndex, nameEn: lv.nameEn };
      }
      const myBm = await db.select({ bookId: bookmarks.bookId }).from(bookmarks).where(eq(bookmarks.studentId, ctx.user.id));
      const myDl = await db.select({ bookId: downloads.bookId }).from(downloads).where(eq(downloads.studentId, ctx.user.id));
      const myAs = await db.select({ bookId: bookAssignments.bookId }).from(bookAssignments).where(eq(bookAssignments.studentId, ctx.user.id));
      const bset = new Set(myBm.map((b) => b.bookId));
      const dset = new Set(myDl.map((d) => d.bookId));
      const aset = new Set(myAs.map((a) => a.bookId));
      const rows = await db.select().from(books).where(eq(books.status, "published"));
      const allLevels = await db.select().from(levels);
      const levelById = new Map(allLevels.map((l) => [l.id, { path: l.path, orderIndex: l.orderIndex, nameEn: l.nameEn }]));
      const filtered = rows.filter((b) => {
        if (input?.section && b.section !== input.section) return false;
        if (input?.category && b.category !== input.category) return false;
        if (input?.query && !b.title.toLowerCase().includes(input.query.toLowerCase())) return false;
        if (b.section !== "curriculum") return true;
        return curriculumBookVisible((b.levelIds as number[] | null) ?? [], myLevel, levelById);
      });
      return filtered.map((b) => ({
        ...b, categoryLabel: CATEGORY_LABELS[b.category],
        isBookmarked: bset.has(b.id), isDownloaded: dset.has(b.id), isAssigned: aset.has(b.id),
      }));
    }),

  toggleBookmark: studentProcedure
    .input(z.object({ bookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertBookAccessible(ctx.user.id, input.bookId);
      const [existing] = await db.select().from(bookmarks)
        .where(and(eq(bookmarks.studentId, ctx.user.id), eq(bookmarks.bookId, input.bookId))).limit(1);
      if (existing) { await db.delete(bookmarks).where(eq(bookmarks.id, existing.id)); return { bookmarked: false }; }
      await db.insert(bookmarks).values({ id: crypto.randomUUID(), studentId: ctx.user.id, bookId: input.bookId });
      return { bookmarked: true };
    }),

  toggleDownload: studentProcedure
    .input(z.object({ bookId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertBookAccessible(ctx.user.id, input.bookId);
      const [existing] = await db.select().from(downloads)
        .where(and(eq(downloads.studentId, ctx.user.id), eq(downloads.bookId, input.bookId))).limit(1);
      if (existing) { await db.delete(downloads).where(eq(downloads.id, existing.id)); return { downloaded: false }; }
      await db.insert(downloads).values({ id: crypto.randomUUID(), studentId: ctx.user.id, bookId: input.bookId });
      return { downloaded: true };
    }),

  myLibrary: studentProcedure.query(async ({ ctx }) => {
    const bm = await db.select({ book: books }).from(bookmarks)
      .innerJoin(books, eq(bookmarks.bookId, books.id)).where(and(eq(bookmarks.studentId, ctx.user.id), eq(books.status, "published")));
    const dl = await db.select({ book: books }).from(downloads)
      .innerJoin(books, eq(downloads.bookId, books.id)).where(and(eq(downloads.studentId, ctx.user.id), eq(books.status, "published")));
    // إخفاء ما لم يعد مؤهلاً له بعد تغيّر مستواه (دون حذف بياناته)
    const { myLevel, levelById } = await studentLevelScope(ctx.user.id);
    const visible = (b: typeof books.$inferSelect) =>
      b.section !== "curriculum" || curriculumBookVisible((b.levelIds as number[] | null) ?? [], myLevel, levelById);
    return {
      bookmarks: bm.filter((r) => visible(r.book)).map((r) => ({ ...r.book, categoryLabel: CATEGORY_LABELS[r.book.category] })),
      downloads: dl.filter((r) => visible(r.book)).map((r) => ({ ...r.book, categoryLabel: CATEGORY_LABELS[r.book.category] })),
    };
  }),
});
