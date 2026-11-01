/**
 * واجبات التسميع: المعلم يحدد لطالب بعينه سورة ونطاق آيات، والطالب يسمّعها
 * تسميعاً تعليمياً من التطبيق أو الموقع ويسلّم النتيجة، ثم يراجعها المعلم
 * ويقيّمها بنفسه. النتيجة يحسبها محرك الأخطاء على جهاز الطالب، ولا تُعدّ تقييماً.
 */
import crypto from "crypto";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, notifications, recitationAssignments, recitationSessions, sessions, users } from "@workspace/db";
import { SURAHS } from "@workspace/tabyan-domain/quran-surahs";
import { approvedTeacherProcedure, createRouter, studentProcedure } from "../middleware";
import { assignmentResultSchema, hideModeSchema, recitationAudioObjectPath } from "../recitation-contract";

/** Same guard as the teacher router: a teacher only reaches students they teach. */
async function assertTeacherStudentLink(teacherId: string, studentId: string) {
  const [link] = await db.select({ id: sessions.id }).from(sessions)
    .where(and(eq(sessions.teacherId, teacherId), eq(sessions.studentId, studentId))).limit(1);
  if (!link) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الطالب غير مرتبط بحلقاتك" });
}

type AssignmentRow = typeof recitationAssignments.$inferSelect;

/** Adds where the submitted session's audio is kept, for playing it back. */
function withAudioPath(assignment: AssignmentRow) {
  return { ...assignment, audioPath: assignment.sessionId ? recitationAudioObjectPath(assignment.sessionId) : null };
}

async function teacherAssignment(teacherId: string, assignmentId: string) {
  const [assignment] = await db.select().from(recitationAssignments)
    .where(and(eq(recitationAssignments.id, assignmentId), eq(recitationAssignments.teacherId, teacherId))).limit(1);
  if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "الواجب غير موجود" });
  return assignment;
}

export function assignmentLabel(assignment: { surahId: number; startAyah: number; endAyah: number }) {
  const name = SURAHS[assignment.surahId - 1]?.name ?? "";
  return assignment.startAyah === assignment.endAyah
    ? `سورة ${name} — الآية ${assignment.startAyah}`
    : `سورة ${name} — الآيات ${assignment.startAyah}–${assignment.endAyah}`;
}

const createInput = z.object({
  studentId: z.string().min(1),
  surahId: z.number().int().min(1).max(114),
  startAyah: z.number().int().min(1),
  endAyah: z.number().int().min(1),
  hideMode: hideModeSchema.default("progressive_reveal"),
  note: z.string().trim().max(500).optional(),
  dueAt: z.coerce.date().optional(),
}).superRefine((input, ctx) => {
  const ayahs = SURAHS[input.surahId - 1]?.ayahs ?? 0;
  if (input.endAyah < input.startAyah) ctx.addIssue({ code: "custom", path: ["endAyah"], message: "آخر آية يجب أن تكون بعد أول آية" });
  if (input.endAyah > ayahs) ctx.addIssue({ code: "custom", path: ["endAyah"], message: `السورة ${ayahs} آية فقط` });
});

export const recitationAssignmentsRouter = createRouter({
  // ── المعلم ────────────────────────────────────────────────────────────────
  create: approvedTeacherProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    await assertTeacherStudentLink(ctx.user.id, input.studentId);
    const id = crypto.randomUUID();
    await db.insert(recitationAssignments).values({
      id,
      teacherId: ctx.user.id,
      studentId: input.studentId,
      surahId: input.surahId,
      startAyah: input.startAyah,
      endAyah: input.endAyah,
      hideMode: input.hideMode,
      note: input.note || null,
      dueAt: input.dueAt ?? null,
    });
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: input.studentId,
      title: "واجب تسميع جديد 📖",
      body: `${assignmentLabel(input)} — من ${ctx.user.fullName}`,
      type: "general",
    });
    return { id };
  }),

  /** واجبات طالب واحد عند هذا المعلم، الأحدث أولاً. */
  forStudent: approvedTeacherProcedure
    .input(z.object({ studentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertTeacherStudentLink(ctx.user.id, input.studentId);
      const rows = await db.select().from(recitationAssignments)
        .where(and(eq(recitationAssignments.teacherId, ctx.user.id), eq(recitationAssignments.studentId, input.studentId)))
        .orderBy(desc(recitationAssignments.createdAt)).limit(50);
      return rows.map(withAudioPath);
    }),

  /** واجبات سلّمها الطلاب وتنتظر مراجعة المعلم. */
  reviewQueue: approvedTeacherProcedure.query(async ({ ctx }) => {
    const rows = await db.select({ assignment: recitationAssignments, studentName: users.fullName })
      .from(recitationAssignments).innerJoin(users, eq(recitationAssignments.studentId, users.id))
      .where(and(eq(recitationAssignments.teacherId, ctx.user.id), eq(recitationAssignments.status, "submitted")))
      .orderBy(desc(recitationAssignments.submittedAt)).limit(50);
    return rows.map((row) => ({ ...row, assignment: withAudioPath(row.assignment) }));
  }),

  review: approvedTeacherProcedure
    .input(z.object({
      assignmentId: z.string().min(1),
      score: z.number().int().min(0).max(100),
      feedback: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await teacherAssignment(ctx.user.id, input.assignmentId);
      if (assignment.status !== "submitted" && assignment.status !== "reviewed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لم يسلّم الطالب هذا الواجب بعد" });
      }
      await db.update(recitationAssignments).set({
        status: "reviewed",
        teacherScore: input.score,
        teacherFeedback: input.feedback || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(recitationAssignments.id, assignment.id));
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: assignment.studentId,
        title: "قيّم معلمك تسميعك ✅",
        body: `${assignmentLabel(assignment)} — ${input.score}/100`,
        type: "general",
      });
      return { ok: true };
    }),

  cancel: approvedTeacherProcedure
    .input(z.object({ assignmentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await teacherAssignment(ctx.user.id, input.assignmentId);
      if (assignment.status === "reviewed") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يُلغى واجب بعد تقييمه" });
      await db.update(recitationAssignments).set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(recitationAssignments.id, assignment.id));
      return { ok: true };
    }),

  // ── الطالب ────────────────────────────────────────────────────────────────
  /** واجبات الطالب غير الملغاة مع اسم المعلم، الأحدث أولاً. */
  mine: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select({ assignment: recitationAssignments, teacherName: users.fullName })
      .from(recitationAssignments).leftJoin(users, eq(recitationAssignments.teacherId, users.id))
      .where(and(
        eq(recitationAssignments.studentId, ctx.user.id),
        inArray(recitationAssignments.status, ["assigned", "submitted", "reviewed"]),
      ))
      .orderBy(desc(recitationAssignments.createdAt)).limit(50);
    return rows.map((row) => ({ ...row, assignment: withAudioPath(row.assignment) }));
  }),

  /**
   * يسلّم نتيجة جلسة تعليمية منتهية بدأت من هذا الواجب. يمكن إعادة التسليم
   * قبل تقييم المعلم؛ آخر تسليم يحل محل السابق.
   */
  submit: studentProcedure
    .input(z.object({ sessionId: z.string().min(1), result: assignmentResultSchema }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await db.select().from(recitationSessions)
        .where(and(eq(recitationSessions.id, input.sessionId), eq(recitationSessions.userId, ctx.user.id))).limit(1);
      if (!session || session.mode !== "educational" || !session.assignmentId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "جلسة التسميع التعليمي غير موجودة" });
      }
      if (session.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "أنهِ الجلسة قبل تسليمها" });
      const [assignment] = await db.select().from(recitationAssignments)
        .where(and(eq(recitationAssignments.id, session.assignmentId), eq(recitationAssignments.studentId, ctx.user.id))).limit(1);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "الواجب غير موجود" });
      if (assignment.status === "reviewed" || assignment.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لم يعد هذا الواجب يقبل التسليم" });
      }
      await db.update(recitationAssignments).set({
        status: "submitted",
        sessionId: session.id,
        result: { ...input.result, durationSeconds: session.durationSeconds ?? 0 },
        submittedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(recitationAssignments.id, assignment.id));
      if (assignment.teacherId) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: assignment.teacherId,
          title: "سلّم طالب واجب تسميع 🎙",
          body: `${ctx.user.fullName}: ${assignmentLabel(assignment)}`,
          type: "general",
        });
      }
      return { ok: true };
    }),
});
