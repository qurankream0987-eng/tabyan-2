import { z } from "zod";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, studentProcedure, publicQuery } from "../middleware";
import { db } from "@workspace/db";
import {
  fatwaAnswers, fatwaQuestions, fatwaRatings, fatwaViews, users,
} from "@workspace/db";

const CATEGORY_LABELS: Record<string, string> = {
  aqeedah: "عقيدة", fiqh: "فقه", muamalat: "معاملات", family: "أسرة", tajweed: "تجويد",
  salah: "صلاة", zakah: "زكاة", siyam: "صيام", hajj: "حج", taharah: "طهارة", qiraat: "قراءات", other: "أخرى",
};
export const categoryEnum = z.enum(["aqeedah", "fiqh", "muamalat", "family", "tajweed", "salah", "zakah", "siyam", "hajj", "taharah", "qiraat", "other"]);

export const fatwaRouter = createRouter({
  ask: studentProcedure
    .input(z.object({
      questionText: z.string().min(10, "السؤال 10 أحرف على الأقل").max(500, "السؤال 500 حرف كحد أقصى"),
      category: categoryEnum, imageUrl: z.string().optional(), audioUrl: z.string().optional(),
      followupOfId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // المتابعة يجب أن تتعلق بسؤال يملكه الطالب نفسه — لا بسؤال شخص آخر
      if (input.followupOfId) {
        const [orig] = await db.select({ studentId: fatwaQuestions.studentId }).from(fatwaQuestions)
          .where(eq(fatwaQuestions.id, input.followupOfId)).limit(1);
        if (!orig || orig.studentId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      }
      const id = crypto.randomUUID();
      await db.insert(fatwaQuestions).values({ id, studentId: ctx.user.id, ...input });
      return { ok: true, id };
    }),

  myFatwas: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select({
      id: fatwaQuestions.id, questionText: fatwaQuestions.questionText, category: fatwaQuestions.category,
      status: fatwaQuestions.status, createdAt: fatwaQuestions.createdAt, followupOfId: fatwaQuestions.followupOfId,
    }).from(fatwaQuestions).where(eq(fatwaQuestions.studentId, ctx.user.id))
      .orderBy(desc(fatwaQuestions.createdAt)).limit(50);
    return rows.map((r) => ({ ...r, categoryLabel: CATEGORY_LABELS[r.category] }));
  }),

  detail: studentProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [q] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.questionId)).limit(1);
      if (!q || q.studentId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const [a] = await db.select({
        id: fatwaAnswers.id, answerText: fatwaAnswers.answerText, referenceText: fatwaAnswers.referenceText,
        audioUrl: fatwaAnswers.audioUrl, audioDurationSeconds: fatwaAnswers.audioDurationSeconds,
        status: fatwaAnswers.status, createdAt: fatwaAnswers.createdAt, muftiName: users.fullName,
      }).from(fatwaAnswers).leftJoin(users, eq(fatwaAnswers.muftiId, users.id))
        .where(eq(fatwaAnswers.questionId, q.id)).limit(1);
      const visible = a && (a.status === "published_private" || a.status === "published_public");
      let myRating = null;
      if (visible) {
        const [r] = await db.select().from(fatwaRatings)
          .where(and(eq(fatwaRatings.answerId, a.id), eq(fatwaRatings.studentId, ctx.user.id))).limit(1);
        myRating = r ?? null;
      }
      return { question: { ...q, categoryLabel: CATEGORY_LABELS[q.category] }, answer: visible ? a : null, myRating };
    }),

  rate: studentProcedure
    .input(z.object({
      answerId: z.string(), starRating: z.number().min(1).max(5),
      isHelpful: z.boolean().optional(), feedbackText: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // التقييم مسموح فقط لإجابة منشورة على سؤال يملكه الطالب نفسه
      const [ans] = await db.select({ questionId: fatwaAnswers.questionId, status: fatwaAnswers.status })
        .from(fatwaAnswers).where(eq(fatwaAnswers.id, input.answerId)).limit(1);
      if (!ans || (ans.status !== "published_private" && ans.status !== "published_public")) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الإجابة غير موجودة" });
      }
      const [owner] = await db.select({ studentId: fatwaQuestions.studentId }).from(fatwaQuestions)
        .where(eq(fatwaQuestions.id, ans.questionId)).limit(1);
      if (!owner || owner.studentId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك تقييم إجابة لا تخص سؤالك" });
      }
      const [existing] = await db.select().from(fatwaRatings)
        .where(and(eq(fatwaRatings.answerId, input.answerId), eq(fatwaRatings.studentId, ctx.user.id))).limit(1);
      if (existing) {
        await db.update(fatwaRatings).set({
          starRating: input.starRating, isHelpful: input.isHelpful, feedbackText: input.feedbackText,
        }).where(eq(fatwaRatings.id, existing.id));
      } else {
        await db.insert(fatwaRatings).values({
          id: crypto.randomUUID(), answerId: input.answerId, studentId: ctx.user.id,
          starRating: input.starRating, isHelpful: input.isHelpful, feedbackText: input.feedbackText,
        });
      }
      return { ok: true };
    }),

  followup: studentProcedure
    .input(z.object({ originalQuestionId: z.string(), questionText: z.string().min(10).max(500), category: categoryEnum }))
    .mutation(async ({ ctx, input }) => {
      const [orig] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.originalQuestionId)).limit(1);
      if (!orig || orig.studentId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const id = crypto.randomUUID();
      await db.insert(fatwaQuestions).values({
        id, studentId: ctx.user.id, questionText: input.questionText,
        category: input.category, followupOfId: input.originalQuestionId,
      });
      return { ok: true, id };
    }),

  publicList: publicQuery
    .input(z.object({ category: categoryEnum.optional(), query: z.string().optional() }))
    .query(async ({ input }) => {
      const conditions: ReturnType<typeof eq>[] = [eq(fatwaAnswers.status, "published_public")];
      const rows = await db.select({
        answerId: fatwaAnswers.id, answerText: fatwaAnswers.answerText, audioUrl: fatwaAnswers.audioUrl,
        audioDurationSeconds: fatwaAnswers.audioDurationSeconds,
        createdAt: fatwaAnswers.createdAt, muftiName: users.fullName,
        questionText: fatwaQuestions.questionText, category: fatwaQuestions.category,
        questionId: fatwaQuestions.id,
      }).from(fatwaAnswers)
        .innerJoin(fatwaQuestions, eq(fatwaAnswers.questionId, fatwaQuestions.id))
        .leftJoin(users, eq(fatwaAnswers.muftiId, users.id))
        .where(
          and(
            eq(fatwaAnswers.status, "published_public"),
            input.category ? eq(fatwaQuestions.category, input.category) : undefined,
            input.query ? like(fatwaQuestions.questionText, `%${input.query}%`) : undefined,
          )
        )
        .orderBy(desc(fatwaAnswers.createdAt)).limit(50);

      const result = [];
      for (const r of rows) {
        const [{ avg }] = await db.select({ avg: sql<string>`COALESCE(AVG(${fatwaRatings.starRating}),0)` })
          .from(fatwaRatings).where(eq(fatwaRatings.answerId, r.answerId));
        const [{ c: views }] = await db.select({ c: sql<number>`COUNT(*)` })
          .from(fatwaViews).where(eq(fatwaViews.answerId, r.answerId));
        const avgStars = Number(avg).toFixed(1);
        result.push({ ...r, categoryLabel: CATEGORY_LABELS[r.category], avgStars, avgRating: avgStars, views });
      }
      return result;
    }),

  publicDetail: publicQuery
    .input(z.object({ answerId: z.string() }))
    .query(async ({ input }) => {
      const [row] = await db.select({
        answerId: fatwaAnswers.id, answerText: fatwaAnswers.answerText, referenceText: fatwaAnswers.referenceText,
        audioUrl: fatwaAnswers.audioUrl, audioDurationSeconds: fatwaAnswers.audioDurationSeconds,
        createdAt: fatwaAnswers.createdAt, muftiName: users.fullName,
        questionText: fatwaQuestions.questionText, category: fatwaQuestions.category,
      }).from(fatwaAnswers)
        .innerJoin(fatwaQuestions, eq(fatwaAnswers.questionId, fatwaQuestions.id))
        .leftJoin(users, eq(fatwaAnswers.muftiId, users.id))
        .where(and(eq(fatwaAnswers.id, input.answerId), eq(fatwaAnswers.status, "published_public")))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(fatwaViews).values({ id: crypto.randomUUID(), answerId: input.answerId });
      const [{ avg }] = await db.select({ avg: sql<string>`COALESCE(AVG(${fatwaRatings.starRating}),0)` })
        .from(fatwaRatings).where(eq(fatwaRatings.answerId, input.answerId));
      const [{ c: views }] = await db.select({ c: sql<number>`COUNT(*)` })
        .from(fatwaViews).where(eq(fatwaViews.answerId, input.answerId));
      const avgStars = Number(avg).toFixed(1);
      return { ...row, categoryLabel: CATEGORY_LABELS[row.category], avgStars, avgRating: avgStars, views };
    }),
});
