import crypto from "crypto";
import { z } from "zod";
import { and, desc, eq, gte, isNull, lte, sql, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, teacherProcedure, approvedTeacherProcedure } from "../middleware";
import { db } from "@workspace/db";
import { isValidPersonName, normalizePersonName } from "../lib/input-normalization";
import {
  evaluations, fatwaAnswers, fatwaQuestions, levels, notifications, promotionRequests,
  recordings, scheduleChangeRequests, sessions, studentProgress, students,
  teacherBroadcasts, teacherCertificates, teacherMessages, teacherSettings, teachers, users,
  weeklySchedules,
} from "@workspace/db";

const SESSION_TYPE_LABELS: Record<string, string> = {
  quran_hifz: "Ø­ÙØ¸ Ù‚Ø±Ø¢Ù†", quran_review: "Ù…Ø±Ø§Ø¬Ø¹Ø© Ù‚Ø±Ø¢Ù†", qiraat: "Ù‚Ø±Ø§Ø¡Ø§Øª",
  tajweed_correction: "ØªØµØ­ÙŠØ­ ØªÙ„Ø§ÙˆØ©", tajweed_level: "ØªØ¬ÙˆÙŠØ¯",
  sharia_fiqh: "ÙÙ‚Ù‡", sharia_aqeedah: "Ø¹Ù‚ÙŠØ¯Ø©", sharia_seerah: "Ø³ÙŠØ±Ø©",
};

/**
 * صلاحية مشتركة: يشترط وجود حلقة واحدة على الأقل (مجدولة أو منعقدة) تجمع المعلم بالطالب
 * قبل أي قراءة/كتابة موجّهة لهذا الطالب — يمنع وصول معلم إلى طالب لا يعلّمه (IDOR).
 * نفس مصدر قائمة myStudents، ولا يكفي إخفاء الطالب من الواجهة.
 */
async function assertTeacherStudentLink(teacherId: string, studentId: string) {
  const [link] = await db.select({ id: sessions.id }).from(sessions)
    .where(and(eq(sessions.teacherId, teacherId), eq(sessions.studentId, studentId))).limit(1);
  if (!link) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الطالب غير مرتبط بحلقاتك" });
}

export const teacherRouter = createRouter({
  kycStatus: teacherProcedure.query(async ({ ctx }) => {
    const [t] = await db.select().from(teachers).where(eq(teachers.userId, ctx.user.id)).limit(1);
    return { kycStatus: t?.kycStatus ?? "awaiting_assessment", notes: t?.kycReviewNotes ?? null, isMufti: t?.isMufti ?? false, isVolunteer: t?.isVolunteer ?? false };
  }),

  // خيار «التسجيل كمتطوع» يُضبط في الخادم ضمن تدفق اختبار القبول — لا يتغيّر بعد بدء التوثيق
  startAssessment: teacherProcedure
    .input(z.object({ volunteer: z.boolean().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      await db.update(teachers).set({ kycStatus: "in_progress", ...(input?.volunteer !== undefined ? { isVolunteer: input.volunteer } : {}) })
        .where(and(eq(teachers.userId, ctx.user.id), eq(teachers.kycStatus, "awaiting_assessment")));
      return { ok: true };
    }),

  submitKyc: teacherProcedure
    .input(z.object({ videoUrl: z.string().min(1), answers: z.array(z.object({ q: z.string(), a: z.string() })).length(10) }))
    .mutation(async ({ ctx, input }) => {
      const [teacher] = await db.select({ kycStatus: teachers.kycStatus })
        .from(teachers).where(eq(teachers.userId, ctx.user.id)).limit(1);
      if (!teacher || !["in_progress", "rejected"].includes(teacher.kycStatus)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ابدأ اختبار القبول أولاً" });
      }
      await db.update(teachers).set({ kycVideoUrl: input.videoUrl, kycAnswers: input.answers, kycStatus: "pending" })
        .where(eq(teachers.userId, ctx.user.id));
      return { ok: true };
    }),

  dashboard: approvedTeacherProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id;
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    const [t] = await db.select().from(teachers).where(eq(teachers.userId, me)).limit(1);
    const next = await db.select({
      id: sessions.id, scheduledAt: sessions.scheduledAt, durationMinutes: sessions.durationMinutes,
      status: sessions.status, topic: sessions.topic, sessionType: sessions.sessionType,
      studentName: users.fullName, levelId: sessions.levelId,
    }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
      .where(and(eq(sessions.teacherId, me), gte(sessions.scheduledAt, now),
        sql`${sessions.status} IN ('scheduled','confirmed')`))
      .orderBy(sessions.scheduledAt).limit(1);
    const weekSessions = await db.select({ id: sessions.id }).from(sessions)
      .where(and(eq(sessions.teacherId, me), gte(sessions.scheduledAt, now), lte(sessions.scheduledAt, weekEnd)));
    const completedThisWeek = await db.select({ id: sessions.id, durationMinutes: sessions.durationMinutes }).from(sessions)
      .where(and(eq(sessions.teacherId, me), eq(sessions.status, "completed"), gte(sessions.scheduledAt, new Date(now.getTime() - 7 * 86400000))));
    const myStudents = await db.select({ studentId: sessions.studentId }).from(sessions)
      .where(eq(sessions.teacherId, me)).groupBy(sessions.studentId);
    const pendingEvals = await db.select({ id: sessions.id }).from(sessions)
      .leftJoin(evaluations, and(eq(evaluations.sessionId, sessions.id), eq(evaluations.isCompleted, true)))
      .where(and(eq(sessions.teacherId, me), eq(sessions.status, "completed"), isNull(evaluations.id)));
    const recsThisMonth = await db.select({ id: recordings.id }).from(recordings)
      .where(and(eq(recordings.teacherId, me), gte(recordings.createdAt, new Date(now.getFullYear(), now.getMonth(), 1))));
    const pendingFatwas = await db.select({ id: fatwaQuestions.id }).from(fatwaQuestions)
      .where(and(eq(fatwaQuestions.muftiId, me), eq(fatwaQuestions.status, "assigned")));
    const teachingMinutes = completedThisWeek.reduce((a, s) => a + (s.durationMinutes ?? 30), 0);
    return {
      teacher: t, nextSession: next[0] ? { ...next[0], typeLabel: SESSION_TYPE_LABELS[next[0].sessionType] } : null,
      weekCount: weekSessions.length,
      studentsCount: myStudents.length,
      recordingsThisMonth: recsThisMonth.length,
      pendingFatwas: t?.isMufti ? pendingFatwas.length : null,
      summary: {
        completedThisWeek: completedThisWeek.length,
        pendingEvaluations: pendingEvals.length,
        teachingHours: `${Math.floor(teachingMinutes / 60)}:${String(teachingMinutes % 60).padStart(2, "0")}`,
        avgRating: t?.avgRating ?? "0",
      },
    };
  }),

  schedule: approvedTeacherProcedure
    .input(z.object({ range: z.enum(["today", "tomorrow", "week", "month"]).default("week") }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      if (input?.range === "tomorrow") start.setDate(start.getDate() + 1);
      const end = new Date(start);
      if (input?.range === "today" || input?.range === "tomorrow") end.setDate(end.getDate() + 1);
      else if (input?.range === "month") end.setDate(end.getDate() + 30);
      else end.setDate(end.getDate() + 7);
      const rows = await db.select({
        id: sessions.id, scheduledAt: sessions.scheduledAt, durationMinutes: sessions.durationMinutes,
        status: sessions.status, topic: sessions.topic, sessionType: sessions.sessionType, type: sessions.type,
        studentName: users.fullName, levelId: sessions.levelId,
      }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
        .where(and(eq(sessions.teacherId, ctx.user.id), gte(sessions.scheduledAt, start), lte(sessions.scheduledAt, end)))
        .orderBy(sessions.scheduledAt);
      const changeReqs = await db.select({
        id: scheduleChangeRequests.id, sessionId: scheduleChangeRequests.sessionId,
        requestedNewTime: scheduleChangeRequests.requestedNewTime, reason: scheduleChangeRequests.reason,
        studentName: users.fullName,
      }).from(scheduleChangeRequests).innerJoin(users, eq(scheduleChangeRequests.studentId, users.id))
        .where(and(eq(scheduleChangeRequests.teacherId, ctx.user.id), eq(scheduleChangeRequests.status, "pending")));
      return {
        sessions: rows.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] })),
        changeRequests: changeReqs,
      };
    }),

  respondChangeRequest: approvedTeacherProcedure
    .input(z.object({ id: z.string(), approve: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [r] = await db.select().from(scheduleChangeRequests).where(eq(scheduleChangeRequests.id, input.id)).limit(1);
      if (!r || r.teacherId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(scheduleChangeRequests).set({
        status: input.approve ? "approved" : "rejected", reviewedBy: ctx.user.id, reviewedAt: new Date(),
      }).where(eq(scheduleChangeRequests.id, input.id));
      if (input.approve && r.requestedNewTime)
        await db.update(sessions).set({ scheduledAt: r.requestedNewTime }).where(eq(sessions.id, r.sessionId));

      // بناء payload الموعد الجديد عند الموافقة
      let changePayload: Record<string, unknown> | null = null;
      if (input.approve && r.requestedNewTime) {
        const newDate = new Date(r.requestedNewTime);
        const [sess] = await db.select({ sessionType: sessions.sessionType, durationMinutes: sessions.durationMinutes })
          .from(sessions).where(eq(sessions.id, r.sessionId)).limit(1);
        const [teacherUser] = await db.select({ fullName: users.fullName }).from(users)
          .where(eq(users.id, ctx.user.id)).limit(1);
        changePayload = {
          teacherName: teacherUser?.fullName ?? null,
          subject: sess ? (SESSION_TYPE_LABELS[sess.sessionType] ?? sess.sessionType) : null,
          date: newDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          time: newDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
          durationMinutes: sess?.durationMinutes ?? null,
          sessionKind: "individual",
        };
      }

      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: r.studentId,
        title: input.approve ? "تم قبول تغيير الموعد ✅" : "تم رفض تغيير الموعد",
        body: input.approve && changePayload?.date
          ? `موعدك الجديد: ${changePayload.date} الساعة ${changePayload.time}`
          : undefined,
        type: "session",
        ...(changePayload ? { payload: changePayload } : {}),
      });
      return { ok: true };
    }),

  sessionRoom: approvedTeacherProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [s] = await db.select({
        id: sessions.id, scheduledAt: sessions.scheduledAt, status: sessions.status,
        sessionType: sessions.sessionType, topic: sessions.topic, durationMinutes: sessions.durationMinutes,
        notes: sessions.notes, teacherId: sessions.teacherId, studentId: sessions.studentId,
        studentName: users.fullName, levelId: sessions.levelId,
      }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
        .where(eq(sessions.id, input.id)).limit(1);
      if (!s || s.teacherId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Ø§Ù„Ø¬Ù„Ø³Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©" });
      return {
        ...s,
        typeLabel: SESSION_TYPE_LABELS[s.sessionType],
        recordingEnabled: process.env.LIVE_SESSION_RECORDING_ENABLED === "true",
      };
    }),

  startSession: approvedTeacherProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(sessions).set({ status: "in_progress", startedAt: new Date() })
        .where(and(eq(sessions.id, input.id), eq(sessions.teacherId, ctx.user.id)));
      return { ok: true };
    }),

  endSession: approvedTeacherProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [s] = await db.select().from(sessions).where(eq(sessions.id, input.id)).limit(1);
      if (!s || s.teacherId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(sessions).set({ status: "completed", endedAt: new Date() }).where(eq(sessions.id, input.id));
      return { ok: true };
    }),

  evaluate: approvedTeacherProcedure
    .input(z.object({
      sessionId: z.string(),
      hifzScore: z.number().min(0).max(50), revisionScore: z.number().min(0).max(20),
      tajweedScore: z.number().min(0).max(20), commitmentScore: z.number().min(0).max(10),
      notes: z.string().max(500).optional(), audioNotesUrl: z.string().optional(),
      recommendation: z.enum(["promote", "keep", "review"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [s] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
      if (!s || s.teacherId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const total = input.hifzScore + input.revisionScore + input.tajweedScore + input.commitmentScore;
      const [existing] = await db.select().from(evaluations).where(eq(evaluations.sessionId, input.sessionId)).limit(1);
      if (existing) {
        await db.update(evaluations).set({ ...input, totalScore: total, isCompleted: true }).where(eq(evaluations.id, existing.id));
      } else {
        await db.insert(evaluations).values({
          id: crypto.randomUUID(), studentId: s.studentId!, teacherId: ctx.user.id, ...input, totalScore: total, isCompleted: true,
        });
      }
      if (s.studentId) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(), userId: s.studentId, title: "ØªÙ‚ÙŠÙŠÙ…Ùƒ Ø¬Ø§Ù‡Ø² ðŸ“Š",
          body: `Ù‚ÙŠÙ‘Ù…Ùƒ Ù…Ø¹Ù„Ù…Ùƒ Ø¨Ø¯Ø±Ø¬Ø© ${total}/100`, type: "result",
          ...(input.audioNotesUrl
            ? { attachments: [{ name: "\u0645\u0644\u0627\u062d\u0638\u0629 \u0635\u0648\u062a\u064a\u0629 \u0645\u0646 \u0627\u0644\u0645\u0639\u0644\u0645", kind: "audio", url: input.audioNotesUrl }] }
            : {}),
        });
        const all = await db.select({ total: evaluations.totalScore }).from(evaluations).where(eq(evaluations.studentId, s.studentId));
        const avg = all.reduce((a, e) => a + e.total, 0) / all.length;
        const [st] = await db.select().from(students).where(eq(students.userId, s.studentId)).limit(1);
        if (st?.currentLevelId) {
          await db.update(studentProgress).set({ averageScore: avg.toFixed(2) })
            .where(and(eq(studentProgress.studentId, s.studentId), eq(studentProgress.levelId, st.currentLevelId)));
        }
      }
      return { ok: true, total };
    }),

  pendingEvaluations: approvedTeacherProcedure.query(async ({ ctx }) => {
    const rows = await db.select({
      id: sessions.id, scheduledAt: sessions.scheduledAt, topic: sessions.topic,
      sessionType: sessions.sessionType, durationMinutes: sessions.durationMinutes, studentName: users.fullName,
    }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
      .leftJoin(evaluations, and(eq(evaluations.sessionId, sessions.id), eq(evaluations.isCompleted, true)))
      .where(and(eq(sessions.teacherId, ctx.user.id), eq(sessions.status, "completed"), isNull(evaluations.id)))
      .orderBy(desc(sessions.scheduledAt));
    return rows.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] }));
  }),

  myStudents: approvedTeacherProcedure.query(async ({ ctx }) => {
    const rows = await db.select({
      studentId: sessions.studentId, name: users.fullName, totalJuz: students.totalJuz, currentLevelId: students.currentLevelId,
    }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
      .innerJoin(students, eq(sessions.studentId, students.userId))
      .where(eq(sessions.teacherId, ctx.user.id)).groupBy(sessions.studentId, users.fullName, students.totalJuz, students.currentLevelId);
    const studentIds = rows.map((r) => r.studentId).filter(Boolean) as string[];
    const allLevels = await db.select().from(levels);
    const levelsMap = new Map(allLevels.map((l) => [l.id, l.name]));

    const allEvals = studentIds.length ? await db.select({ studentId: evaluations.studentId, total: evaluations.totalScore })
      .from(evaluations).where(and(inArray(evaluations.studentId, studentIds), eq(evaluations.teacherId, ctx.user.id)))
      .orderBy(desc(evaluations.createdAt)) : [];
    
    const lastEvalsMap = new Map();
    for (const e of allEvals) {
       if (!lastEvalsMap.has(e.studentId)) lastEvalsMap.set(e.studentId, e.total);
    }

    const nextSessions = studentIds.length ? await db.select({ studentId: sessions.studentId, at: sessions.scheduledAt })
      .from(sessions).where(and(inArray(sessions.studentId, studentIds), eq(sessions.teacherId, ctx.user.id), gte(sessions.scheduledAt, new Date())))
      .orderBy(asc(sessions.scheduledAt)) : [];
      
    const nextSessionsMap = new Map();
    for (const s of nextSessions) {
       if (!nextSessionsMap.has(s.studentId)) nextSessionsMap.set(s.studentId, s.at);
    }

    const result = [];
    for (const r of rows) {
      let levelName = "—";
      if (r.currentLevelId) {
        levelName = levelsMap.get(r.currentLevelId) ?? "—";
      }
      const lastScore = lastEvalsMap.get(r.studentId) ?? null;
      const nextSessionAt = nextSessionsMap.get(r.studentId) ?? null;
      result.push({ ...r, levelName, lastScore, nextSessionAt });
    }
    return result;
  }),

  studentDetail: approvedTeacherProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTeacherStudentLink(ctx.user.id, input.studentId);
      const [info] = await db.select({ user: users, student: students })
        .from(users).innerJoin(students, eq(users.id, students.userId)).where(eq(users.id, input.studentId)).limit(1);
      if (!info) throw new TRPCError({ code: "NOT_FOUND" });
      const [evals, upcoming, recs] = await Promise.all([
        db.select().from(evaluations)
          .where(and(eq(evaluations.studentId, input.studentId), eq(evaluations.teacherId, ctx.user.id)))
          .orderBy(desc(evaluations.createdAt)).limit(20),
        db.select().from(sessions)
          .where(and(eq(sessions.studentId, input.studentId), eq(sessions.teacherId, ctx.user.id), gte(sessions.scheduledAt, new Date())))
          .orderBy(sessions.scheduledAt).limit(10),
        db.select().from(recordings)
          .where(and(eq(recordings.studentId, input.studentId), eq(recordings.teacherId, ctx.user.id), eq(recordings.isDeleted, false)))
          .orderBy(desc(recordings.createdAt)).limit(20),
      ]);
      return { info, evaluations: evals, upcoming, recordings: recs, wantsTuhfa: info.student.wantsTuhfa ?? null };
    }),

  sendMessage: approvedTeacherProcedure
    .input(z.object({ studentId: z.string(), messageText: z.string().min(1).max(1000), audioUrl: z.string().optional(), fileUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeacherStudentLink(ctx.user.id, input.studentId);
      await db.insert(teacherMessages).values({
        id: crypto.randomUUID(), teacherId: ctx.user.id, studentId: input.studentId,
        messageText: input.messageText, audioUrl: input.audioUrl, fileUrl: input.fileUrl,
      });
      const attachments: Array<{ name: string; kind: string; url: string }> = [];
      if (input.audioUrl) attachments.push({ name: "\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062a\u064a\u0629", kind: "audio", url: input.audioUrl });
      if (input.fileUrl) attachments.push({ name: "\u0645\u0631\u0641\u0642 \u0645\u0646 \u0627\u0644\u0645\u0639\u0644\u0645", kind: "pdf", url: input.fileUrl });
      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: input.studentId, title: `Ø±Ø³Ø§Ù„Ø© Ù…Ù† ${ctx.user.fullName} âœ‰ï¸`,
        body: input.messageText.slice(0, 100), type: "general",
        ...(attachments.length ? { attachments } : {}),
      });
      return { ok: true };
    }),

  myRecordings: approvedTeacherProcedure.query(async ({ ctx }) => {
    const recs = await db.select({
      id: recordings.id, sessionId: recordings.sessionId, videoUrl: recordings.videoUrl,
      durationSeconds: recordings.durationSeconds, createdAt: recordings.createdAt,
      studentName: users.fullName, topic: sessions.topic, sessionType: sessions.sessionType,
    }).from(recordings).innerJoin(sessions, eq(recordings.sessionId, sessions.id))
      .innerJoin(users, eq(sessions.studentId, users.id))
      .where(and(
        eq(recordings.teacherId, ctx.user.id),
        eq(recordings.status, "ready"),
        eq(recordings.isDeleted, false),
      ))
      .orderBy(desc(recordings.createdAt)).limit(50);
    const evals = await db.select({ sessionId: evaluations.sessionId }).from(evaluations)
      .where(and(eq(evaluations.teacherId, ctx.user.id), eq(evaluations.isCompleted, true)));
    const done = new Set(evals.map((e) => e.sessionId));
    return recs.map((r) => ({ ...r, typeLabel: SESSION_TYPE_LABELS[r.sessionType as string], hasEvaluation: done.has(r.sessionId) }));
  }),

  fatwaInbox: approvedTeacherProcedure.query(async ({ ctx }) => {
    const [t] = await db.select().from(teachers).where(eq(teachers.userId, ctx.user.id)).limit(1);
    if (!t?.isMufti) return { isMufti: false, items: [] };
    const rows = await db.select({
      id: fatwaQuestions.id, questionText: fatwaQuestions.questionText, category: fatwaQuestions.category,
      status: fatwaQuestions.status, priority: fatwaQuestions.priority, assignedAt: fatwaQuestions.assignedAt,
      createdAt: fatwaQuestions.createdAt, studentName: users.fullName,
      answerId: fatwaAnswers.id, answerStatus: fatwaAnswers.status,
    }).from(fatwaQuestions).innerJoin(users, eq(fatwaQuestions.studentId, users.id))
      .leftJoin(fatwaAnswers, eq(fatwaAnswers.questionId, fatwaQuestions.id))
      .where(eq(fatwaQuestions.muftiId, ctx.user.id)).orderBy(desc(fatwaQuestions.createdAt)).limit(50);
    const hours = (d: Date | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 3600000) : 0;
    return { isMufti: true, items: rows.map((r) => ({ ...r, hoursAgo: hours(r.assignedAt ?? r.createdAt) })) };
  }),

  answerFatwa: approvedTeacherProcedure
    .input(z.object({
      questionId: z.string(), answerText: z.string().min(50).max(2000),
      referenceText: z.string().max(500).optional(),
      audioUrl: z.string().optional(), audioDurationSeconds: z.number().max(600).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [t] = await db.select().from(teachers).where(eq(teachers.userId, ctx.user.id)).limit(1);
      if (!t?.isMufti) throw new TRPCError({ code: "FORBIDDEN", message: "Ù„Ù… ØªÙØ¹ÙŠÙŽÙ‘Ù† Ù…ÙØªÙŠØ§Ù‹" });
      const [q] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.questionId)).limit(1);
      if (!q || q.muftiId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(fatwaAnswers).values({
        id: crypto.randomUUID(), questionId: input.questionId, muftiId: ctx.user.id,
        answerText: input.answerText, referenceText: input.referenceText,
        audioUrl: input.audioUrl ?? null, audioDurationSeconds: input.audioDurationSeconds,
      });
      await db.update(fatwaQuestions).set({ status: "answered" }).where(eq(fatwaQuestions.id, input.questionId));
      return { ok: true };
    }),

  requestPromotion: approvedTeacherProcedure
    .input(z.object({ studentId: z.string(), notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeacherStudentLink(ctx.user.id, input.studentId);
      const [st] = await db.select().from(students).where(eq(students.userId, input.studentId)).limit(1);
      if (!st) throw new TRPCError({ code: "NOT_FOUND", message: "Ø§Ù„Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" });

      const currentLevelId = st.currentLevelId;
      let nextLevel = null;
      if (currentLevelId) {
        const [cur] = await db.select().from(levels).where(eq(levels.id, currentLevelId)).limit(1);
        if (cur) {
          const [next] = await db.select().from(levels)
            .where(and(eq(levels.path, cur.path), sql`${levels.orderIndex} = ${cur.orderIndex} + 1`))
            .limit(1);
          nextLevel = next ?? null;
        }
      }
      if (!nextLevel) throw new TRPCError({ code: "BAD_REQUEST", message: "Ø§Ù„Ø·Ø§Ù„Ø¨ ÙÙŠ Ø¢Ø®Ø± Ù…Ø³ØªÙˆÙ‰ Ø£Ùˆ Ù„Ù… ÙŠÙØ­Ø¯ÙŽÙ‘Ø¯ Ù…Ø³ØªÙˆØ§Ù‡ Ø¨Ø¹Ø¯" });

      const existing = await db.select().from(promotionRequests)
        .where(and(eq(promotionRequests.studentId, input.studentId), eq(promotionRequests.status, "pending")))
        .limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "ÙŠÙˆØ¬Ø¯ Ø·Ù„Ø¨ ØªØ±Ù‚ÙŠØ© Ù…Ø¹Ù„Ù‘Ù‚ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø·Ø§Ù„Ø¨" });

      await db.insert(promotionRequests).values({
        id: crypto.randomUUID(), studentId: input.studentId,
        fromLevelId: currentLevelId, toLevelId: nextLevel.id,
        videoUrl: `teacher_request_${ctx.user.id}`,
      });
      // أبلغ جميع المشرفين بوجود طلب ترقية جديد
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      for (const admin of admins) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(), userId: admin.id,
          title: "طلب ترقية جديد من معلم",
          body: `طلب معلم ترقية أحد طلابه إلى مستوى ${nextLevel.name} — في انتظار مراجعتك`,
          type: "result",
        });
      }
      return { ok: true, toLevel: nextLevel.name };
    }),

  settings: teacherProcedure.query(async ({ ctx }) => {
    const [s] = await db.select().from(teacherSettings).where(eq(teacherSettings.teacherId, ctx.user.id)).limit(1);
    return s ?? null;
  }),

  updateSettings: teacherProcedure
    .input(z.object({
      videoQuality: z.enum(["360p", "480p", "720p", "1080p"]).optional(),
      audioQuality: z.enum(["low", "medium", "high"]).optional(),
      autoRecord: z.boolean().optional(), reminderMinutes: z.number().optional(),
      defaultCameraOn: z.boolean().optional(), defaultMicOn: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(), soundEnabled: z.boolean().optional(), vibrationEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(teacherSettings).where(eq(teacherSettings.teacherId, ctx.user.id)).limit(1);
      if (existing) await db.update(teacherSettings).set(input).where(eq(teacherSettings.teacherId, ctx.user.id));
      else await db.insert(teacherSettings).values({ id: crypto.randomUUID(), teacherId: ctx.user.id, ...input });
      return { ok: true };
    }),

  updateProfile: teacherProcedure
    .input(z.object({
      fullName: z.string().transform(normalizePersonName).refine((value) => isValidPersonName(value), "الاسم غير صالح").optional(),
      bio: z.string().max(500).optional(),
      avatarUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.fullName) await db.update(users).set({ fullName: input.fullName }).where(eq(users.id, ctx.user.id));
      if (input.avatarUrl) await db.update(users).set({ avatarUrl: input.avatarUrl }).where(eq(users.id, ctx.user.id));
      if (input.bio !== undefined) await db.update(teachers).set({ bio: input.bio }).where(eq(teachers.userId, ctx.user.id));
      return { ok: true };
    }),

  // ── شهادات المعلم (توثيق اختياري — متاحة قبل الاعتماد وبعده) ──
  myCertificates: teacherProcedure.query(async ({ ctx }) => {
    return db.select().from(teacherCertificates)
      .where(eq(teacherCertificates.teacherId, ctx.user.id))
      .orderBy(desc(teacherCertificates.createdAt));
  }),

  addCertificate: teacherProcedure
    .input(z.object({ filePath: z.string().min(1).max(500), title: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await db.insert(teacherCertificates).values({ id, teacherId: ctx.user.id, filePath: input.filePath, title: input.title });
      return { ok: true, id };
    }),

  removeCertificate: teacherProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(teacherCertificates)
        .where(and(eq(teacherCertificates.id, input.id), eq(teacherCertificates.teacherId, ctx.user.id)));
      return { ok: true };
    }),

  // ── الإشعارات الجماعية — معلم معتمد فقط، والمستلمون يُحسمون من الخادم حصراً ──
  broadcastAudiences: approvedTeacherProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id;
    const ACTIVE = ["scheduled", "confirmed", "in_progress"] as const;
    const all = await db.selectDistinct({ studentId: sessions.studentId }).from(sessions)
      .where(and(eq(sessions.teacherId, me), inArray(sessions.status, [...ACTIVE])));
    const scheds = await db.select({
      id: weeklySchedules.id, sessionType: weeklySchedules.sessionType, levelId: weeklySchedules.levelId,
      availableDays: weeklySchedules.availableDays, availableTimes: weeklySchedules.availableTimes,
      sessionMode: weeklySchedules.sessionMode,
    }).from(weeklySchedules).where(and(eq(weeklySchedules.teacherId, me), eq(weeklySchedules.isActive, true)));
    const perSchedule = await Promise.all(scheds.map(async (s) => {
      const rows = await db.selectDistinct({ studentId: sessions.studentId }).from(sessions)
        .where(and(eq(sessions.scheduleId, s.id), inArray(sessions.status, [...ACTIVE])));
      return { ...s, studentCount: rows.filter((r) => r.studentId).length };
    }));
    return {
      allCount: all.filter((r) => r.studentId).length,
      schedules: perSchedule.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType })),
    };
  }),

  sendBroadcast: approvedTeacherProcedure
    .input(z.object({
      title: z.string().min(3).max(200),
      body: z.string().min(1).max(2000),
      scheduleId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.user.id;
      const ACTIVE = ["scheduled", "confirmed", "in_progress"] as const;
      const conditions = [eq(sessions.teacherId, me), inArray(sessions.status, [...ACTIVE])];
      if (input.scheduleId) {
        // أمان: لا يُقبل scheduleId إلا إن كان يخص المعلم نفسه — ولا تُقبل أي قائمة مستلمين من العميل
        const [sch] = await db.select({ id: weeklySchedules.id }).from(weeklySchedules)
          .where(and(eq(weeklySchedules.id, input.scheduleId), eq(weeklySchedules.teacherId, me))).limit(1);
        if (!sch) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الجدول لا يخصك" });
        conditions.push(eq(sessions.scheduleId, input.scheduleId));
      }
      const recipients = await db.selectDistinct({ studentId: sessions.studentId }).from(sessions).where(and(...conditions));
      const ids = recipients.map((r) => r.studentId).filter((x): x is string => !!x);
      if (!ids.length) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد طلاب مستهدفون لهذا الإشعار" });
      await db.insert(notifications).values(
        ids.map((userId) => ({ id: crypto.randomUUID(), userId, title: input.title, body: input.body, type: "general" })),
      );
      await db.insert(teacherBroadcasts).values({
        id: crypto.randomUUID(), teacherId: me, title: input.title, body: input.body,
        scheduleId: input.scheduleId ?? null, audience: input.scheduleId ? "schedule" : "all",
        recipientCount: ids.length,
      });
      return { ok: true, recipientCount: ids.length };
    }),

  broadcastHistory: approvedTeacherProcedure.query(async ({ ctx }) => {
    return db.select().from(teacherBroadcasts)
      .where(eq(teacherBroadcasts.teacherId, ctx.user.id))
      .orderBy(desc(teacherBroadcasts.createdAt));
  }),
});

