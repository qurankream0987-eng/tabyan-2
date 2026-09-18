import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createRouter, studentProcedure, adminProcedure } from "../middleware";
import { db } from "@workspace/db";
import {
  levels, shariaContent, shariaContentProgress, shariaExamQuestions, shariaExamAttempts, shariaSubjects,
} from "@workspace/db";

const PASS_PERCENTAGE = 70;
const MAX_ATTEMPTS = 3;

// أسماء احتياطية للفروع غير المدرجة في جدول المواد — الفرع الإلزامي المرتبط بالقرآن
// لا يظهر كمادة في قسم الدروس الشرعية، لكن محتواه يُعرض ويُختبر عبر مسار القرآن
const FALLBACK_SUBJECT_NAMES: Record<string, string> = {
  aqeedah_quran: "العقيدة",
};

/** خريطة key→name لمواد الدروس الشرعية من قاعدة البيانات — تُدار من لوحة الإدارة */
async function subjectNameMap(): Promise<Record<string, string>> {
  const rows = await db.select({ key: shariaSubjects.key, name: shariaSubjects.name }).from(shariaSubjects);
  return { ...FALLBACK_SUBJECT_NAMES, ...Object.fromEntries(rows.map((r) => [r.key, r.name])) };
}

async function levelWithSubject(levelId: number) {
  const [lv] = await db.select().from(levels).where(eq(levels.id, levelId)).limit(1);
  if (!lv || lv.path !== "sharia") return null;
  const subjectLevels = await db.select().from(levels)
    .where(and(eq(levels.path, "sharia"), eq(levels.nameEn, lv.nameEn ?? "")))
    .orderBy(asc(levels.orderIndex));
  const order = subjectLevels.findIndex((l) => l.id === lv.id) + 1;
  const names = await subjectNameMap();
  return {
    id: lv.id,
    name: lv.name,
    subject: lv.nameEn ?? "",
    subjectName: names[lv.nameEn ?? ""] ?? lv.nameEn ?? "",
    description: null as string | null,
    order,
  };
}

/** حارس حدود الوحدة: يتأكد أن contentId يعود لمحتوى شرعي منشور ضمن مستوى sharia قبل أي كتابة */
async function assertPublishedShariaContent(contentId: string) {
  const [row] = await db.select({ id: shariaContent.id })
    .from(shariaContent)
    .innerJoin(levels, eq(levels.id, shariaContent.levelId))
    .where(and(eq(shariaContent.id, contentId), eq(shariaContent.status, "published"), eq(levels.path, "sharia")))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "المحتوى غير موجود" });
}

export const shariaRouter = createRouter({
  subjects: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(levels)
      .where(and(eq(levels.path, "sharia"), eq(levels.isActive, true), eq(levels.isHidden, false)))
      .orderBy(asc(levels.orderIndex));
    const levelIds = rows.map((r) => r.id);

    const contents = levelIds.length
      ? await db.select({ id: shariaContent.id, levelId: shariaContent.levelId })
          .from(shariaContent)
          .where(and(inArray(shariaContent.levelId, levelIds), eq(shariaContent.status, "published")))
      : [];
    const contentIds = contents.map((c) => c.id);
    const progress = contentIds.length
      ? await db.select().from(shariaContentProgress)
          .where(and(eq(shariaContentProgress.studentId, ctx.user.id), inArray(shariaContentProgress.contentId, contentIds)))
      : [];
    const progByContent = new Map(progress.map((p) => [p.contentId, p]));
    const passedAttempts = levelIds.length
      ? await db.select().from(shariaExamAttempts)
          .where(and(eq(shariaExamAttempts.studentId, ctx.user.id), eq(shariaExamAttempts.passed, true), inArray(shariaExamAttempts.levelId, levelIds)))
      : [];
    const passedLevels = new Set(passedAttempts.map((a) => a.levelId));

    // اسم المستوى القرآني الذي يتطلب كل مستوى عقدي (الربط الإلزامي بين المسارين)
    const quranLinks = levelIds.length
      ? await db.select({ aqeedahLevelId: levels.aqeedahLevelId, name: levels.name }).from(levels)
          .where(and(eq(levels.path, "quran"), inArray(levels.aqeedahLevelId, levelIds)))
      : [];
    const requiredForMap = new Map(quranLinks.filter((q) => q.aqeedahLevelId != null).map((q) => [q.aqeedahLevelId as number, q.name]));

    // المواد تُجلب من جدول sharia_subjects (إدارة المشرف) — الفرع الإلزامي aqeedah_quran ليس مادة فلا يظهر هنا
    const subjectRows = await db.select().from(shariaSubjects)
      .where(eq(shariaSubjects.isActive, true))
      .orderBy(asc(shariaSubjects.orderIndex));

    return subjectRows.map((s) => {
      const subjLevels = rows.filter((l) => l.nameEn === s.key);
      return {
        key: s.key,
        name: s.name,
        description: s.description,
        icon: s.icon,
        color: s.color,
        levels: subjLevels.map((l, i) => {
          const lvContents = contents.filter((c) => c.levelId === l.id);
          const pcts = lvContents.map((c) => progByContent.get(c.id)?.progressPercentage ?? 0);
          const contentPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
          const progressPercentage = passedLevels.has(l.id) ? 100 : contentPct;
          const status = passedLevels.has(l.id)
            ? "completed"
            : contentPct > 0 ? "in_progress" : "available";
          return { id: l.id, name: l.name, description: null as string | null, order: i + 1, status, progressPercentage, contentCount: lvContents.length, requiredFor: requiredForMap.get(l.id) ?? null };
        }),
      };
    });
  }),

  /** ملخص تقدم الطالب في الدروس الشرعية: إجمالي/مكتمل/متبقٍ/نسبة + آخر درس (أكمل حيث توقفت) */
  summary: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(levels)
      .where(and(eq(levels.path, "sharia"), eq(levels.isActive, true), eq(levels.isHidden, false)))
      .orderBy(asc(levels.orderIndex));
    const levelIds = rows.map((r) => r.id);
    const contents = levelIds.length
      ? await db.select({ id: shariaContent.id, levelId: shariaContent.levelId, title: shariaContent.title })
          .from(shariaContent)
          .where(and(inArray(shariaContent.levelId, levelIds), eq(shariaContent.status, "published")))
      : [];
    const contentIds = contents.map((c) => c.id);
    const progress = contentIds.length
      ? await db.select().from(shariaContentProgress)
          .where(and(eq(shariaContentProgress.studentId, ctx.user.id), inArray(shariaContentProgress.contentId, contentIds)))
      : [];
    const total = contents.length;
    // دلالة الإكمال موحّدة مع المستويات: دروس المستوى المجتاز اختباره تُحسب مكتملة
    const passedAttempts = levelIds.length
      ? await db.select({ levelId: shariaExamAttempts.levelId }).from(shariaExamAttempts)
          .where(and(eq(shariaExamAttempts.studentId, ctx.user.id), eq(shariaExamAttempts.passed, true), inArray(shariaExamAttempts.levelId, levelIds)))
      : [];
    const passedLevels = new Set(passedAttempts.map((a) => a.levelId));
    const completedSet = new Set(
      progress.filter((p) => p.status === "completed" || p.progressPercentage >= 100).map((p) => p.contentId),
    );
    for (const c of contents) if (passedLevels.has(c.levelId)) completedSet.add(c.id);
    const completed = completedSet.size;
    const last = progress.slice().sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())[0];
    const names = await subjectNameMap();
    let lastStudied: null | { contentId: string; title: string; levelId: number; levelName: string; subjectKey: string; subjectName: string; progressPercentage: number } = null;
    if (last) {
      const c = contents.find((x) => x.id === last.contentId);
      const lv = rows.find((r) => r.id === c?.levelId);
      if (c && lv) {
        lastStudied = {
          contentId: c.id, title: c.title, levelId: lv.id, levelName: lv.name,
          subjectKey: lv.nameEn ?? "", subjectName: names[lv.nameEn ?? ""] ?? "",
          progressPercentage: last.progressPercentage,
        };
      }
    }
    return { total, completed, remaining: total - completed, percentage: total ? Math.round((completed / total) * 100) : 0, lastStudied };
  }),

  levelContent: studentProcedure
    .input(z.object({ levelId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const level = await levelWithSubject(input.levelId);
      if (!level) return null;
      const rows = await db.select().from(shariaContent)
        .where(and(eq(shariaContent.levelId, input.levelId), eq(shariaContent.status, "published")))
        .orderBy(asc(shariaContent.orderIndex), asc(shariaContent.createdAt));
      const ids = rows.map((r) => r.id);
      const progress = ids.length
        ? await db.select().from(shariaContentProgress)
            .where(and(eq(shariaContentProgress.studentId, ctx.user.id), inArray(shariaContentProgress.contentId, ids)))
        : [];
      const progByContent = new Map(progress.map((p) => [p.contentId, p]));
      return {
        level,
        content: rows.map((c) => {
          const p = progByContent.get(c.id);
          return {
            id: c.id, title: c.title, author: c.author, description: c.description,
            contentType: c.contentType, durationMinutes: c.durationMinutes, pageCount: c.pageCount,
            progressPercentage: p?.progressPercentage ?? 0,
            status: p?.status === "completed" ? "completed" : (p?.progressPercentage ?? 0) > 0 ? "in_progress" : "available",
          };
        }),
      };
    }),

  content: studentProcedure
    .input(z.object({ contentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [c] = await db.select().from(shariaContent).where(eq(shariaContent.id, input.contentId)).limit(1);
      if (!c || c.status !== "published") return null;
      const level = await levelWithSubject(c.levelId);
      const [p] = await db.select().from(shariaContentProgress)
        .where(and(eq(shariaContentProgress.studentId, ctx.user.id), eq(shariaContentProgress.contentId, c.id))).limit(1);
      // الدرس السابق/التالي داخل نفس المستوى (بترتيب المنهج)
      const siblings = await db.select({ id: shariaContent.id, title: shariaContent.title })
        .from(shariaContent)
        .where(and(eq(shariaContent.levelId, c.levelId), eq(shariaContent.status, "published")))
        .orderBy(asc(shariaContent.orderIndex), asc(shariaContent.createdAt));
      const idx = siblings.findIndex((s) => s.id === c.id);
      const prev = idx > 0 ? { id: siblings[idx - 1].id, title: siblings[idx - 1].title } : null;
      const next = idx >= 0 && idx < siblings.length - 1 ? { id: siblings[idx + 1].id, title: siblings[idx + 1].title } : null;
      return {
        content: {
          id: c.id, title: c.title, author: c.author, description: c.description,
          contentType: c.contentType, fileUrl: c.fileUrl, externalUrl: c.externalUrl,
          textBody: c.textBody, durationMinutes: c.durationMinutes, pageCount: c.pageCount,
        },
        level,
        prev,
        next,
        progressPercentage: p?.progressPercentage ?? 0,
        lastPosition: p?.lastPosition ?? null,
        status: p?.status === "completed" ? "completed" : (p?.progressPercentage ?? 0) > 0 ? "in_progress" : "available",
        bookmarked: p?.bookmarked ?? false,
      };
    }),

  updateContentProgress: studentProcedure
    .input(z.object({
      contentId: z.string(),
      progressPercentage: z.number().int().min(0).max(100),
      lastPosition: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertPublishedShariaContent(input.contentId);
      const [existing] = await db.select().from(shariaContentProgress)
        .where(and(eq(shariaContentProgress.studentId, ctx.user.id), eq(shariaContentProgress.contentId, input.contentId))).limit(1);
      const status = input.progressPercentage >= 100 ? "completed" as const : "in_progress" as const;
      if (existing) {
        await db.update(shariaContentProgress).set({
          progressPercentage: Math.max(existing.progressPercentage, input.progressPercentage),
          lastPosition: input.lastPosition ?? existing.lastPosition,
          status: existing.status === "completed" ? "completed" : status,
        }).where(eq(shariaContentProgress.id, existing.id));
      } else {
        await db.insert(shariaContentProgress).values({
          id: crypto.randomUUID(), studentId: ctx.user.id, contentId: input.contentId,
          progressPercentage: input.progressPercentage, lastPosition: input.lastPosition, status,
        });
      }
      return { ok: true };
    }),

  toggleBookmark: studentProcedure
    .input(z.object({ contentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPublishedShariaContent(input.contentId);
      const [existing] = await db.select().from(shariaContentProgress)
        .where(and(eq(shariaContentProgress.studentId, ctx.user.id), eq(shariaContentProgress.contentId, input.contentId))).limit(1);
      if (existing) {
        await db.update(shariaContentProgress).set({ bookmarked: !existing.bookmarked }).where(eq(shariaContentProgress.id, existing.id));
        return { bookmarked: !existing.bookmarked };
      }
      await db.insert(shariaContentProgress).values({
        id: crypto.randomUUID(), studentId: ctx.user.id, contentId: input.contentId,
        progressPercentage: 0, bookmarked: true,
      });
      return { bookmarked: true };
    }),

  exam: studentProcedure
    .input(z.object({ levelId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const level = await levelWithSubject(input.levelId);
      if (!level) return null;
      const qs = await db.select().from(shariaExamQuestions)
        .where(and(eq(shariaExamQuestions.levelId, input.levelId), eq(shariaExamQuestions.isActive, true)))
        .orderBy(asc(shariaExamQuestions.orderIndex));
      const attempts = await db.select().from(shariaExamAttempts)
        .where(and(eq(shariaExamAttempts.studentId, ctx.user.id), eq(shariaExamAttempts.levelId, input.levelId)))
        .orderBy(desc(shariaExamAttempts.createdAt));
      const attemptsUsed = attempts.length;
      return {
        level,
        questions: qs.map((q) => ({
          id: q.id, questionText: q.questionText,
          questionType: q.questionType === "mcq" ? "multiple_choice" : q.questionType,
          options: (q.options as string[] | null) ?? [], points: q.points,
        })),
        passPercentage: PASS_PERCENTAGE,
        maxAttempts: MAX_ATTEMPTS,
        attemptsUsed,
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptsUsed),
        passed: attempts.some((a) => a.passed),
        bestScore: attempts.reduce((m, a) => Math.max(m, a.score), 0),
      };
    }),

  submitExam: studentProcedure
    .input(z.object({
      levelId: z.number().int(),
      answers: z.array(z.object({ questionId: z.string(), answer: z.string().max(300) })),
    }))
    .mutation(async ({ ctx, input }) => {
      const qs = await db.select().from(shariaExamQuestions)
        .where(and(eq(shariaExamQuestions.levelId, input.levelId), eq(shariaExamQuestions.isActive, true)));
      if (!qs.length) throw new Error("لا أسئلة لهذا المستوى بعد");

      const answerMap = new Map(input.answers.map((a) => [a.questionId, a.answer.trim()]));
      let totalPoints = 0;
      let earnedPoints = 0;
      const graded = qs.map((q) => {
        const given = (answerMap.get(q.id) ?? "").trim();
        const correct = given.length > 0 && given === q.correctAnswer.trim();
        totalPoints += q.points;
        const earned = correct ? q.points : 0;
        earnedPoints += earned;
        return { questionId: q.id, correct, correctAnswer: q.correctAnswer, explanation: q.explanation, points: q.points, earned };
      });
      const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= PASS_PERCENTAGE;

      // قيد الامتحان على مستويات الشريعة فقط (levelWithSubject يرفض أي مسار آخر)
      const level = await levelWithSubject(input.levelId);
      if (!level) throw new TRPCError({ code: "NOT_FOUND", message: "المستوى غير موجود" });

      // قراءة المحاولات + الإدراج داخل معاملة واحدة؛ والقيد الفريد
      // (student, level, attemptNumber) في قاعدة البيانات يمنع سباق الإرسال المزدوج
      const attemptNumber = await db.transaction(async (tx) => {
        const prior = await tx.select({ id: shariaExamAttempts.id }).from(shariaExamAttempts)
          .where(and(eq(shariaExamAttempts.studentId, ctx.user.id), eq(shariaExamAttempts.levelId, input.levelId)));
        if (prior.length >= MAX_ATTEMPTS) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "استنفدت عدد المحاولات المتاحة لهذا الاختبار" });
        }
        const num = prior.length + 1;
        try {
          await tx.insert(shariaExamAttempts).values({
            id: crypto.randomUUID(), studentId: ctx.user.id, levelId: input.levelId,
            score, passed, answers: input.answers, attemptNumber: num,
          });
        } catch (e) {
          // node-postgres يضع رمز الخطأ أحياناً في e.code مباشرة وأحياناً في e.cause.code
          const code = (e as { code?: string; cause?: { code?: string } })?.code
            ?? (e as { cause?: { code?: string } })?.cause?.code;
          if (code === "23505") {
            throw new TRPCError({ code: "CONFLICT", message: "تم استلام هذا الإرسال مسبقاً — أعد تحميل الصفحة" });
          }
          throw e;
        }
        return num;
      });

      const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptNumber);
      const reveal = passed || attemptsRemaining === 0;
      return {
        score, passed,
        passingScore: PASS_PERCENTAGE,
        attemptsUsed: attemptNumber,
        attemptsRemaining,
        results: graded.map((r) => ({
          questionId: r.questionId,
          correct: r.correct,
          points: r.points,
          earned: r.earned,
          correctAnswer: reveal ? r.correctAnswer : null,
          explanation: reveal ? r.explanation : null,
        })),
      };
    }),

  certificate: studentProcedure
    .input(z.object({ levelId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [passed] = await db.select().from(shariaExamAttempts)
        .where(and(
          eq(shariaExamAttempts.studentId, ctx.user.id),
          eq(shariaExamAttempts.levelId, input.levelId),
          eq(shariaExamAttempts.passed, true),
        )).limit(1);
      if (!passed) return null;
      const level = await levelWithSubject(input.levelId);
      if (!level) return null;
      return {
        certificate: {
          grade: passed.score >= 90 ? "ممتاز" : passed.score >= 80 ? "جيد جداً" : passed.score >= 70 ? "جيد" : "مقبول",
          issuedAt: passed.createdAt,
          certificateNumber: `TAB-${level.id}-${ctx.user.id.slice(0, 8)}`,
        },
        level: { name: level.name },
        subject: { name: level.subjectName, key: level.subject },
      };
    }),

  adminListContent: adminProcedure
    .input(z.object({ levelId: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const rows = input?.levelId
        ? await db.select().from(shariaContent).where(eq(shariaContent.levelId, input.levelId)).orderBy(asc(shariaContent.orderIndex))
        : await db.select().from(shariaContent).orderBy(asc(shariaContent.levelId), asc(shariaContent.orderIndex));
      return rows;
    }),

  adminUpsertContent: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      levelId: z.number().int(),
      title: z.string().min(1).max(200),
      author: z.string().max(150).optional(),
      description: z.string().optional(),
      contentType: z.enum(["pdf", "text", "audio", "video", "link"]),
      fileUrl: z.string().max(500).optional(),
      externalUrl: z.string().max(500).optional(),
      textBody: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      pageCount: z.number().int().optional(),
      orderIndex: z.number().int().optional(),
      status: z.enum(["published", "hidden"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...vals } = input;
      if (id) {
        await db.update(shariaContent).set(vals).where(eq(shariaContent.id, id));
        return { id };
      }
      const newId = crypto.randomUUID();
      await db.insert(shariaContent).values({ id: newId, ...vals, createdBy: ctx.user.id });
      return { id: newId };
    }),

  adminDeleteContent: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(shariaContent).where(eq(shariaContent.id, input.id));
      return { ok: true };
    }),

  adminListQuestions: adminProcedure
    .input(z.object({ levelId: z.number().int() }))
    .query(async ({ input }) => {
      return db.select().from(shariaExamQuestions)
        .where(eq(shariaExamQuestions.levelId, input.levelId)).orderBy(asc(shariaExamQuestions.orderIndex));
    }),

  adminUpsertQuestion: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      levelId: z.number().int(),
      questionText: z.string().min(1),
      questionType: z.enum(["mcq", "true_false", "fill_blank"]).default("mcq"),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().min(1).max(300),
      explanation: z.string().optional(),
      points: z.number().int().min(1).default(1),
      orderIndex: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...vals } = input;
      if (id) {
        await db.update(shariaExamQuestions).set(vals).where(eq(shariaExamQuestions.id, id));
        return { id };
      }
      const newId = crypto.randomUUID();
      await db.insert(shariaExamQuestions).values({ id: newId, ...vals });
      return { id: newId };
    }),

  adminDeleteQuestion: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(shariaExamQuestions).where(eq(shariaExamQuestions.id, input.id));
      return { ok: true };
    }),

  // ---------- إدارة مواد الدروس الشرعية (المشرف) ----------
  adminListSubjects: adminProcedure.query(async () => {
    const rows = await db.select().from(shariaSubjects).orderBy(asc(shariaSubjects.orderIndex));
    const lvlRows = await db.select({ id: levels.id, nameEn: levels.nameEn }).from(levels)
      .where(eq(levels.path, "sharia"));
    const counts = new Map<string, number>();
    for (const l of lvlRows) if (l.nameEn) counts.set(l.nameEn, (counts.get(l.nameEn) ?? 0) + 1);
    return rows.map((s) => ({ ...s, levelCount: counts.get(s.key) ?? 0 }));
  }),

  adminUpsertSubject: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "المفتاح بأحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط"),
      name: z.string().min(2).max(100),
      description: z.string().max(500).nullish(),
      icon: z.string().max(40).nullish(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "اللون بصيغة HEX مثل #800020").nullish(),
      orderIndex: z.number().int().min(0),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (input.id) {
        // المفتاح ثابت بعد الإنشاء — المستويات والمحتوى مرتبطة به
        const [row] = await db.update(shariaSubjects).set({
          name: input.name, description: input.description ?? null,
          icon: input.icon ?? null, color: input.color ?? null,
          orderIndex: input.orderIndex, isActive: input.isActive, updatedAt: new Date(),
        }).where(eq(shariaSubjects.id, input.id)).returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "المادة غير موجودة" });
        return row;
      }
      const dup = await db.select({ id: shariaSubjects.id }).from(shariaSubjects)
        .where(eq(shariaSubjects.key, input.key)).limit(1);
      if (dup.length) throw new TRPCError({ code: "CONFLICT", message: "توجد مادة بهذا المفتاح مسبقاً" });
      const [row] = await db.insert(shariaSubjects).values({
        id: crypto.randomUUID(), key: input.key, name: input.name,
        description: input.description ?? null, icon: input.icon ?? null, color: input.color ?? null,
        orderIndex: input.orderIndex, isActive: input.isActive,
      }).returning();
      return row;
    }),

  adminDeleteSubject: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [subj] = await db.select().from(shariaSubjects).where(eq(shariaSubjects.id, input.id)).limit(1);
      if (!subj) throw new TRPCError({ code: "NOT_FOUND", message: "المادة غير موجودة" });
      const refs = await db.select({ id: levels.id }).from(levels)
        .where(and(eq(levels.path, "sharia"), eq(levels.nameEn, subj.key))).limit(1);
      if (refs.length)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن حذف مادة تحتوي مستويات — احذف المستويات أولاً أو أوقف تفعيل المادة" });
      await db.delete(shariaSubjects).where(eq(shariaSubjects.id, input.id));
      return { ok: true };
    }),

  // إعادة ترتيب مستويات مادة شرعية — يستقبل المعرّفات بالترتيب الجديد ويضبط order_index = الموضع
  adminReorderLevels: adminProcedure
    .input(z.object({ subjectKey: z.string(), levelIds: z.array(z.number().int()).min(1) }))
    .mutation(async ({ input }) => {
      for (let i = 0; i < input.levelIds.length; i++) {
        await db.update(levels).set({ orderIndex: i + 1 })
          .where(and(eq(levels.id, input.levelIds[i]), eq(levels.path, "sharia"), eq(levels.nameEn, input.subjectKey)));
      }
      return { ok: true };
    }),
});
