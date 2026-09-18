import { z } from "zod";
import bcrypt from "bcryptjs";
import { and, desc, eq, gte, ilike, inArray, isNotNull, like, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { createRouter, adminProcedure } from "../middleware";
import { db } from "@workspace/db";
import * as schema from "@workspace/db";
import {
  adminNotificationsSent, adminSessions, assessmentAttempts, assessmentQuestions, assessments,
  auditLogs, authTokens, bookmarks, books, evaluations, fatwaAnswers, fatwaQuestions, fatwaRatings,
  levels, muftiAssignments, notifications, promotionRequests,
  qiraatCertificates, recordings, sessions, studentProgress, students,
  systemSettings, teachers, teacherSettings, users, weeklySchedules,
} from "@workspace/db";
import { categoryEnum } from "./fatwa";
import { masterPasswordSchema, passwordSchema, usernameSchema } from "./auth";
import { isValidPersonName, normalizePersonName } from "../lib/input-normalization";

const SESSION_TYPE_LABELS: Record<string, string> = {
  quran_hifz: "حفظ قرآن", quran_review: "مراجعة قرآن", qiraat: "قراءات",
  tajweed_correction: "تصحيح تلاوة", tajweed_level: "تجويد",
  sharia_fiqh: "فقه", sharia_aqeedah: "عقيدة", sharia_seerah: "سيرة",
};
const CATEGORY_LABELS: Record<string, string> = {
  aqeedah: "عقيدة", fiqh: "فقه", muamalat: "معاملات", family: "أسرة", tajweed: "تجويد",
  salah: "صلاة", zakah: "زكاة", siyam: "صيام", hajj: "حج", taharah: "طهارة", qiraat: "قراءات", other: "أخرى",
};
const DAY_LABELS: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
};

// انتهاك قيد فريد يصل مغلّفاً داخل cause في أخطاء drizzle/pg — نفحص المستويين
const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
};

async function audit(adminId: string, action: string, targetType: string, targetId?: string, details?: unknown) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), adminId, action, targetType, targetId,
    details: details ? JSON.parse(JSON.stringify(details)) : null,
  });
}

async function notify(userId: string, title: string, body?: string, type: string = "general") {
  await db.insert(notifications).values({ id: crypto.randomUUID(), userId, title, body, type: type as never });
}

const hoursSince = (d: Date | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 3600000) : 0);

const accountFullNameSchema = z.string()
  .transform(normalizePersonName)
  .refine((value) => isValidPersonName(value), "الاسم الكامل غير صالح")
  .optional();

/** أسماء المسارات بالعربية — تُستخدم في نص إشعار القبول الديناميكي */
const PLACEMENT_PATH_LABELS: Record<string, string> = {
  quran: "مسار القرآن الكريم (حفظ ومراجعة)",
  tajweed_correction: "مسار تصحيح التلاوة",
  qiraat: "مسار القراءات",
  tajweed: "مسار التجويد",
  sharia: "مسار العلوم الشرعية",
};

export const adminRouter = createRouter({
  // ---------- KPIs ----------
  kpis: adminProcedure.query(async () => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [{ c: activeStudents }] = await db.select({ c: sql<number>`COUNT(*)` }).from(students);
    const [{ c: sessionsToday }] = await db.select({ c: sql<number>`COUNT(*)` }).from(sessions).where(gte(sessions.scheduledAt, todayStart));
    const [{ c: completedMonth }] = await db.select({ c: sql<number>`COUNT(*)` }).from(sessions)
      .where(and(eq(sessions.status, "completed"), gte(sessions.scheduledAt, monthStart)));
    const [{ avg: avgRating }] = await db.select({ avg: sql<string>`COALESCE(AVG(${evaluations.totalScore}),0)` }).from(evaluations);
    const [{ c: pendingReviews }] = await db.select({ c: sql<number>`COUNT(*)` }).from(promotionRequests).where(eq(promotionRequests.status, "pending"));
    const [{ c: pendingQiraat }] = await db.select({ c: sql<number>`COUNT(*)` }).from(qiraatCertificates).where(eq(qiraatCertificates.status, "pending"));
    const [{ c: pendingPlacement }] = await db.select({ c: sql<number>`COUNT(*)` }).from(students)
      .where(and(eq(students.placementTestStatus, "pending"), sql`${students.placementTestVideoUrl} IS NOT NULL`));
    const [{ c: pendingKyc }] = await db.select({ c: sql<number>`COUNT(*)` }).from(teachers)
      .where(and(eq(teachers.kycStatus, "pending"), sql`${teachers.kycVideoUrl} IS NOT NULL`));
    const [{ c: pendingFatwas }] = await db.select({ c: sql<number>`COUNT(*)` }).from(fatwaQuestions).where(eq(fatwaQuestions.status, "pending"));
    const [{ c: late48 }] = await db.select({ c: sql<number>`COUNT(*)` }).from(fatwaQuestions)
      .where(and(eq(fatwaQuestions.status, "assigned"), sql`${fatwaQuestions.assignedAt} < now() - interval '48 hours'`));
    return {
      activeStudents, sessionsToday, completedMonth,
      avgRating: Number(avgRating ?? 0).toFixed(1), churnRate: 12,
      urgent: { pendingReviews, pendingQiraat, pendingPlacement, pendingKyc, pendingFatwas, lateFatwas48h: late48 },
    };
  }),

  // ---------- Users ----------
  usersList: adminProcedure
    .input(z.object({ role: z.enum(["student", "teacher"]).optional(), query: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const conditions = [] as never[];
      if (input?.role) conditions.push(eq(users.role, input.role) as never);
      if (input?.query) conditions.push(or(like(users.fullName, `%${input.query}%`), like(users.phone, `%${input.query}%`)) as never);
      const rows = await db.select({
        id: users.id, fullName: users.fullName, phone: users.phone, role: users.role,
        isActive: users.isActive, bannedUntil: users.bannedUntil, banReason: users.banReason, createdAt: users.createdAt,
      }).from(users).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(users.createdAt)).limit(100);
      const studentIds = rows.filter(r => r.role === "student").map(r => r.id);
      const teacherIds = rows.filter(r => r.role === "teacher").map(r => r.id);
      
      const studentsMap = new Map();
      if (studentIds.length > 0) {
        const sts = await db.select().from(students).where(inArray(students.userId, studentIds));
        for (const s of sts) studentsMap.set(s.userId, s);
      }
      
      const teachersMap = new Map();
      if (teacherIds.length > 0) {
        const ts = await db.select().from(teachers).where(inArray(teachers.userId, teacherIds));
        for (const t of ts) teachersMap.set(t.userId, t);
      }
      
      const allLevels = await db.select().from(levels);
      const levelsMap = new Map(allLevels.map(l => [l.id, l.name]));

      const result = [];
      for (const u of rows) {
        let extra: Record<string, unknown> = {};
        if (u.role === "student") {
          const st = studentsMap.get(u.id);
          const levelName = st?.currentLevelId ? (levelsMap.get(st.currentLevelId) ?? "—") : "—";
          extra = { totalJuz: st?.totalJuz ?? 0, levelName };
        } else if (u.role === "teacher") {
          const t = teachersMap.get(u.id);
          extra = { avgRating: t?.avgRating ?? "0", isMufti: t?.isMufti ?? false, kycStatus: t?.kycStatus };
        }
        result.push({ ...u, ...extra });
      }
      return result;
    }),

  userMessage: adminProcedure
    .input(z.object({ userId: z.string(), text: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await notify(input.userId, "رسالة من الإدارة ✉️", input.text);
      await audit(ctx.user.id, "message_user", "user", input.userId);
      return { ok: true };
    }),

  userWarn: adminProcedure
    .input(z.object({ userId: z.string(), text: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await notify(input.userId, "⚠️ تنبيه إداري", input.text, "activity");
      await audit(ctx.user.id, "warn_user", "user", input.userId);
      return { ok: true };
    }),

  userBan: adminProcedure
    .input(z.object({ userId: z.string(), durationHours: z.number().min(1), reason: z.string().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const until = new Date(Date.now() + input.durationHours * 3600 * 1000);
      await db.update(users).set({ isActive: false, bannedUntil: until, banReason: input.reason }).where(eq(users.id, input.userId));
      await notify(input.userId, "تم حظر حسابك مؤقتاً 🚫", `محظور حتى ${until.toLocaleString("ar")} — السبب: ${input.reason}`, "activity");
      await audit(ctx.user.id, "ban_user", "user", input.userId, input);
      return { ok: true };
    }),

  userDelete: adminProcedure
    .input(z.object({ userId: z.string(), confirm: z.literal("حذف") }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(users).where(eq(users.id, input.userId));
      await audit(ctx.user.id, "delete_user", "user", input.userId);
      return { ok: true };
    }),

  teacherSoftDelete: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(users).set({ isActive: false }).where(eq(users.id, input.userId));
      await audit(ctx.user.id, "soft_delete_teacher", "user", input.userId);
      return { ok: true };
    }),

  // ---------- Schedules ----------
  schedulesList: adminProcedure.query(async () => {
    const rows = await db.select({
      schedule: weeklySchedules, teacherName: users.fullName, levelName: levels.name,
    }).from(weeklySchedules)
      .innerJoin(users, eq(weeklySchedules.teacherId, users.id))
      .leftJoin(levels, eq(weeklySchedules.levelId, levels.id))
      .orderBy(desc(weeklySchedules.createdAt));
    return rows.map((r) => ({ ...r.schedule, teacherName: r.teacherName, levelName: r.levelName, typeLabel: SESSION_TYPE_LABELS[r.schedule.sessionType] }));
  }),

  scheduleCreate: adminProcedure
    .input(z.object({
      teacherId: z.string(),
      sessionType: z.enum(["quran_hifz", "quran_review", "qiraat", "tajweed_correction", "tajweed_level", "sharia_fiqh", "sharia_aqeedah", "sharia_seerah"]),
      levelId: z.number().optional(), sessionMode: z.enum(["individual", "group"]),
      maxStudents: z.number().min(1).max(50).default(1),
      availableDays: z.array(z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"])).min(1),
      // صيغة الموعد: "HH:MM" أو نطاق "HH:MM-HH:MM" — النهاية بعد البداية ولا تعارض بين النطاقات
      availableTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(-([01]\d|2[0-3]):[0-5]\d)?$/, "صيغة الموعد غير صالحة — استخدم HH:MM أو HH:MM-HH:MM")).min(1)
        .refine((times) => {
          const ranges = times.filter((t) => t.includes("-")).map((t) => t.split("-") as [string, string]);
          for (const [s, e] of ranges) if (e <= s) return false;
          const sorted = [...ranges].sort((a, b) => a[0].localeCompare(b[0]));
          for (let i = 1; i < sorted.length; i++) if (sorted[i][0] < sorted[i - 1][1]) return false;
          return true;
        }, "المواعيد متعارضة أو النهاية قبل البداية"),
      durationMinutes: z.number().min(15).max(180),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(weeklySchedules).values({
        id: crypto.randomUUID(), teacherId: input.teacherId, sessionType: input.sessionType,
        levelId: input.levelId, sessionMode: input.sessionMode, maxStudents: input.maxStudents,
        durationMinutes: input.durationMinutes,
        availableDays: input.availableDays, availableTimes: input.availableTimes,
      });
      await notify(
        input.teacherId,
        "أُنشئ لك جدول أسبوعي جديد 📅",
        `${SESSION_TYPE_LABELS[input.sessionType]} — الأيام: ${input.availableDays.map((d) => DAY_LABELS[d] ?? d).join("، ")} — الأوقات: ${input.availableTimes.join("، ")}`,
        "session",
      );
      await audit(ctx.user.id, "create_schedule", "weekly_schedule", undefined, input);
      return { ok: true };
    }),

  scheduleToggle: adminProcedure
    .input(z.object({ scheduleId: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(weeklySchedules).set({ isActive: input.active }).where(eq(weeklySchedules.id, input.scheduleId));
      await audit(ctx.user.id, input.active ? "activate_schedule" : "deactivate_schedule", "weekly_schedule", input.scheduleId);
      return { ok: true };
    }),

  scheduleDelete: adminProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(weeklySchedules).where(eq(weeklySchedules.id, input.scheduleId));
      await audit(ctx.user.id, "delete_schedule", "weekly_schedule", input.scheduleId);
      return { ok: true };
    }),

  // فتح/إغلاق التسجيل في حلقة (جدول أسبوعي) دون حذفها أو إيقافها
  scheduleBookingToggle: adminProcedure
    .input(z.object({ scheduleId: z.string(), accepting: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(weeklySchedules).set({ isAcceptingBookings: input.accepting }).where(eq(weeklySchedules.id, input.scheduleId));
      await audit(ctx.user.id, input.accepting ? "open_schedule_booking" : "close_schedule_booking", "weekly_schedule", input.scheduleId);
      return { ok: true };
    }),

  // ---------- Bookings ----------
  bookingsList: adminProcedure.query(async () => {
    const teacherUsers = alias(users, "teacher_users");
    const rows = await db.select({
      id: sessions.id, sessionType: sessions.sessionType,
      scheduledAt: sessions.scheduledAt, status: sessions.status,
      studentName: users.fullName, teacherName: teacherUsers.fullName,
    }).from(sessions)
      .leftJoin(users, eq(sessions.studentId, users.id))
      .innerJoin(teacherUsers, eq(sessions.teacherId, teacherUsers.id))
      .orderBy(desc(sessions.scheduledAt)).limit(200);
    return rows.map((r) => ({
      id: r.id, typeLabel: SESSION_TYPE_LABELS[r.sessionType] ?? r.sessionType,
      studentName: r.studentName, teacherName: r.teacherName,
      scheduledAt: r.scheduledAt, status: r.status,
    }));
  }),

  bookingCancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, input.id));
      await audit(ctx.user.id, "cancel_booking", "session", input.id);
      return { ok: true };
    }),

  // ---------- Sessions ----------
  sessionsList: adminProcedure
    .input(z.object({ status: z.string().optional(), teacherId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const rows = await db.select({
        session: sessions, studentName: users.fullName,
      }).from(sessions)
        .innerJoin(users, eq(sessions.studentId, users.id))
        .orderBy(desc(sessions.scheduledAt)).limit(200);
      return rows.map((r) => ({ ...r.session, studentName: r.studentName, typeLabel: SESSION_TYPE_LABELS[r.session.sessionType] ?? r.session.sessionType }));
    }),

  // ---------- Sessions monitoring (متابعة الحلقات) ----------
  // حلقات جارية الآن + قادمة، مع بيانات الطرفين والمستوى — لصفحة متابعة الحلقات
  sessionsMonitoring: adminProcedure.query(async () => {
    const teacherUsers = alias(users, "mon_teacher_users");
    const rows = await db.select({
      id: sessions.id, scheduledAt: sessions.scheduledAt, durationMinutes: sessions.durationMinutes,
      status: sessions.status, topic: sessions.topic, sessionType: sessions.sessionType,
      type: sessions.type, startedAt: sessions.startedAt,
      studentName: users.fullName, teacherName: teacherUsers.fullName, levelName: levels.name,
    }).from(sessions)
      .innerJoin(users, eq(sessions.studentId, users.id))
      .innerJoin(teacherUsers, eq(sessions.teacherId, teacherUsers.id))
      .leftJoin(levels, eq(sessions.levelId, levels.id))
      .where(inArray(sessions.status, ["in_progress", "scheduled", "confirmed"]))
      .orderBy(desc(sessions.scheduledAt)).limit(200);
    return rows.map((r) => ({ ...r, typeLabel: SESSION_TYPE_LABELS[r.sessionType] ?? r.sessionType }));
  }),

  // دخول المشرف حلقة جارية كمراقب — التحقق من الدور يتم هنا في الخادم
  sessionRoom: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [s] = await db.select({
        id: sessions.id, scheduledAt: sessions.scheduledAt, status: sessions.status,
        sessionType: sessions.sessionType, topic: sessions.topic, durationMinutes: sessions.durationMinutes,
        startedAt: sessions.startedAt,
        studentName: users.fullName,
      }).from(sessions).innerJoin(users, eq(sessions.studentId, users.id))
        .where(eq(sessions.id, input.id)).limit(1);
      if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      const teacherUsers = alias(users, "sr_teacher_users");
      const [t] = await db.select({ teacherName: teacherUsers.fullName }).from(sessions)
        .innerJoin(teacherUsers, eq(sessions.teacherId, teacherUsers.id))
        .where(eq(sessions.id, input.id)).limit(1);
      return { ...s, teacherName: t?.teacherName ?? "—", typeLabel: SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType };
    }),

  // ---------- Levels ----------
  levelsList: adminProcedure.query(() => db.select().from(levels).orderBy(levels.orderIndex)),

  levelCreate: adminProcedure
    .input(z.object({
      name: z.string().min(2).max(50),
      nameEn: z.string().max(100).optional(),
      path: z.enum(["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"]),
      orderIndex: z.number().min(1),
      sessionsCount: z.number().min(1).default(5),
      requiredJuz: z.number().min(0).default(0),
      requiredSessions: z.number().min(0).default(0),
      requiresIjazah: z.boolean().default(false),
      isHidden: z.boolean().default(false),
      aqeedahLevelId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(levels).values({ ...input });
      await audit(ctx.user.id, "create_level", "level");
      return { ok: true };
    }),

  levelUpdate: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(50).optional(),
      nameEn: z.string().max(100).nullable().optional(),
      orderIndex: z.number().min(1).optional(),
      sessionsCount: z.number().min(1).optional(),
      requiredJuz: z.number().min(0).optional(),
      requiredSessions: z.number().min(0).optional(),
      requiresIjazah: z.boolean().optional(),
      isActive: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      aqeedahLevelId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      await db.update(levels).set(rest).where(eq(levels.id, id));
      await audit(ctx.user.id, "update_level", "level", String(id));
      return { ok: true };
    }),

  levelDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // حارس: المستوى المرجعي لبيانات قائمة لا يُحذف حفاظاً على السجلات — يُخفى أو يُعطَّل بدلاً منه
      const res = await db.execute(sql`SELECT (
        (SELECT COUNT(*) FROM student_progress WHERE level_id = ${input.id}) +
        (SELECT COUNT(*) FROM sessions WHERE level_id = ${input.id}) +
        (SELECT COUNT(*) FROM sharia_content WHERE level_id = ${input.id}) +
        (SELECT COUNT(*) FROM assessments WHERE level_id = ${input.id}) +
        (SELECT COUNT(*) FROM weekly_schedules WHERE level_id = ${input.id}) +
        (SELECT COUNT(*) FROM students WHERE current_level_id = ${input.id}) +
        (SELECT COUNT(*) FROM teachers WHERE assigned_level_id = ${input.id}) +
        (SELECT COUNT(*) FROM books WHERE level_ids @> to_jsonb(${input.id}::int))
      )::int AS n`);
      const n = Number((res.rows[0] as { n: number } | undefined)?.n ?? 0);
      if (n > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن حذف المستوى — توجد بيانات مرتبطة به (تقدم طلاب/جلسات/محتوى/تقييمات). أخفِه أو عطّله بدلاً من الحذف." });
      await db.delete(levels).where(eq(levels.id, input.id));
      await audit(ctx.user.id, "delete_level", "level", String(input.id));
      return { ok: true };
    }),

  levelSwap: adminProcedure
    .input(z.object({ idA: z.number(), idB: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // تبديل ذري لترتيب مستويين داخل معاملة واحدة — يمنع بقاء قيم مكررة عند الفشل الجزئي
      await db.transaction(async (tx) => {
        const [a] = await tx.select({ orderIndex: levels.orderIndex }).from(levels).where(eq(levels.id, input.idA)).limit(1);
        const [b] = await tx.select({ orderIndex: levels.orderIndex }).from(levels).where(eq(levels.id, input.idB)).limit(1);
        if (!a || !b) throw new TRPCError({ code: "NOT_FOUND", message: "المستوى غير موجود" });
        await tx.update(levels).set({ orderIndex: b.orderIndex }).where(eq(levels.id, input.idA));
        await tx.update(levels).set({ orderIndex: a.orderIndex }).where(eq(levels.id, input.idB));
      });
      await audit(ctx.user.id, "swap_level_order", "level", `${input.idA}<->${input.idB}`);
      return { ok: true };
    }),

  // ---------- Promotions ----------
  promotionsList: adminProcedure.query(async () => {
    const fromLevels = alias(levels, "from_levels");
    const toLevels = alias(levels, "to_levels");
    const rows = await db.select({
      pr: promotionRequests, studentName: users.fullName, schoolStage: students.schoolStage,
      fromName: fromLevels.name, toName: toLevels.name,
    }).from(promotionRequests)
      .innerJoin(students, eq(promotionRequests.studentId, students.userId))
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(fromLevels, eq(promotionRequests.fromLevelId, fromLevels.id))
      .leftJoin(toLevels, eq(promotionRequests.toLevelId, toLevels.id))
      .orderBy(desc(promotionRequests.createdAt)).limit(100);
    return rows.map((r) => ({
      ...r.pr, studentName: r.studentName,
      fromName: r.fromName ?? "—", toName: r.toName ?? "—",
      hoursAgo: hoursSince(r.pr.createdAt),
    }));
  }),

  promotionReview: adminProcedure
    .input(z.object({ requestId: z.string(), approve: z.boolean(), notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [req] = await db.select().from(promotionRequests).where(eq(promotionRequests.id, input.requestId)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      // الجزء السادس: المستوى القرآني لا يُعتبر مكتملاً حتى يكتمل متطلب العقيدة الإلزامي (تقدم مكتمل أو اختبار مجتاز)
      if (input.approve && req.fromLevelId) {
        const [fromLv] = await db.select({ path: levels.path, aqeedahLevelId: levels.aqeedahLevelId }).from(levels).where(eq(levels.id, req.fromLevelId)).limit(1);
        if (fromLv?.path === "quran" && fromLv.aqeedahLevelId) {
          const aqId = fromLv.aqeedahLevelId;
          const [aqProg] = await db.select({ id: studentProgress.id }).from(studentProgress)
            .where(and(eq(studentProgress.studentId, req.studentId), eq(studentProgress.levelId, aqId), eq(studentProgress.status, "completed"))).limit(1);
          const [aqExam] = await db.select({ id: schema.shariaExamAttempts.id }).from(schema.shariaExamAttempts)
            .where(and(eq(schema.shariaExamAttempts.studentId, req.studentId), eq(schema.shariaExamAttempts.levelId, aqId), eq(schema.shariaExamAttempts.passed, true))).limit(1);
          if (!aqProg && !aqExam) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن إتمام المستوى القرآني قبل إكمال متطلب العقيدة الإلزامي المرتبط به" });
        }
      }
      await db.update(promotionRequests).set({
        status: input.approve ? "approved" : "rejected",
        reviewNotes: input.notes, adminReviewerId: ctx.user.id, reviewedAt: new Date(),
      }).where(eq(promotionRequests.id, input.requestId));
      if (input.approve && req.toLevelId) {
        await db.update(students).set({ currentLevelId: req.toLevelId }).where(eq(students.userId, req.studentId));
        const [exists] = await db.select().from(studentProgress)
          .where(and(eq(studentProgress.studentId, req.studentId), eq(studentProgress.levelId, req.toLevelId))).limit(1);
        if (!exists) await db.insert(studentProgress).values({ id: crypto.randomUUID(), studentId: req.studentId, levelId: req.toLevelId, status: "in_progress", startedAt: new Date() });
        // الجزء السادس: دخول مستوى قرآني جديد يُلحق الطالب تلقائياً بمتطلب العقيدة المرتبط به
        const [toQl] = await db.select({ aqeedahLevelId: levels.aqeedahLevelId }).from(levels).where(eq(levels.id, req.toLevelId)).limit(1);
        if (toQl?.aqeedahLevelId) {
          const [aqExists] = await db.select({ id: studentProgress.id }).from(studentProgress)
            .where(and(eq(studentProgress.studentId, req.studentId), eq(studentProgress.levelId, toQl.aqeedahLevelId))).limit(1);
          if (!aqExists) await db.insert(studentProgress).values({ id: crypto.randomUUID(), studentId: req.studentId, levelId: toQl.aqeedahLevelId, status: "in_progress", startedAt: new Date() });
        }
        if (req.fromLevelId) await db.update(studentProgress).set({ status: "completed", completedAt: new Date() })
          .where(and(eq(studentProgress.studentId, req.studentId), eq(studentProgress.levelId, req.fromLevelId)));
      }
      await notify(req.studentId, input.approve ? "تمت ترقيتك إلى المستوى التالي 🎉" : "طلب الترقية مرفوض", input.notes, "result");
      // أبلغ المعلم الذي أنشأ الطلب إذا كان الطلب صادراً من معلم
      if (req.videoUrl?.startsWith("teacher_request_")) {
        const teacherId = req.videoUrl.slice("teacher_request_".length);
        if (teacherId) {
          await notify(
            teacherId,
            input.approve ? "تمت الموافقة على طلب الترقية ✅" : "تم رفض طلب الترقية",
            input.approve
              ? "وافق المسؤول على طلب ترقية طالبك إلى المستوى التالي"
              : `رفض المسؤول طلب ترقية طالبك${input.notes ? ` — ${input.notes}` : ""}`,
            "result",
          );
        }
      }
      await audit(ctx.user.id, input.approve ? "approve_promotion" : "reject_promotion", "promotion_request", input.requestId);
      return { ok: true };
    }),

  // ---------- Qiraat ----------
  qiraatList: adminProcedure.query(async () => {
    const rows = await db.select({ cert: qiraatCertificates, name: users.fullName }).from(qiraatCertificates)
      .innerJoin(students, eq(qiraatCertificates.studentId, students.userId))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(qiraatCertificates.status, "pending")).orderBy(desc(qiraatCertificates.createdAt));
    return rows.map((r) => ({ ...r.cert, studentName: r.name, hoursAgo: hoursSince(r.cert.createdAt) }));
  }),

  qiraatReview: adminProcedure
    .input(z.object({ certId: z.string(), approve: z.boolean(), notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [cert] = await db.select().from(qiraatCertificates).where(eq(qiraatCertificates.id, input.certId)).limit(1);
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(qiraatCertificates).set({
        status: input.approve ? "approved" : "rejected",
        reviewNotes: input.notes, adminReviewerId: ctx.user.id, reviewedAt: new Date(),
      }).where(eq(qiraatCertificates.id, input.certId));
      await notify(cert.studentId, input.approve ? "تم قبول شهادتك في القراءات ✅" : "طلب شهادة القراءات مرفوض", input.notes, "result");
      await audit(ctx.user.id, input.approve ? "approve_qiraat" : "reject_qiraat", "qiraat_certificate", input.certId);
      return { ok: true };
    }),

  // ---------- Placement ----------
  levelThresholds: adminProcedure.query(async () => {
    return db.select({ id: levels.id, name: levels.name, path: levels.path })
      .from(levels).where(eq(levels.isActive, true)).orderBy(levels.path, levels.orderIndex, levels.id);
  }),
  placementLevelThresholds: adminProcedure
    .input(z.object({ path: z.enum(["quran", "tajweed_correction"]) }))
    .query(async ({ input }) => db.select({ id: levels.id, name: levels.name, path: levels.path })
      .from(levels)
      .where(and(eq(levels.isActive, true), eq(levels.path, input.path)))
      .orderBy(levels.orderIndex, levels.id)),

  placementList: adminProcedure.query(async () => {
    const rows = await db.select({
      userId: students.userId, videoUrl: students.placementTestVideoUrl, createdAt: students.createdAt,
      pathType: students.placementPathType,
      name: users.fullName, schoolStage: students.schoolStage, schoolGrade: students.schoolGrade,
    }).from(students).innerJoin(users, eq(students.userId, users.id))
      .where(and(eq(students.placementTestStatus, "pending"), sql`${students.placementTestVideoUrl} IS NOT NULL`));
    return rows.map((r) => ({ ...r, hoursAgo: hoursSince(r.createdAt) }));
  }),

  placementReview: adminProcedure
    .input(z.object({ studentId: z.string(), approve: z.boolean(), resultLevelId: z.number().optional(), notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      // كل خطوات القبول (تحديث الحالة + التقدّم + الإشعار) داخل معاملة واحدة —
      // إما أن تنجح جميعها أو لا يُنشأ أي إشعار.
      await db.transaction(async (tx) => {
        // قفل صف الطالب (FOR UPDATE) يجعل القراءة+الكتابة ذرية: طلبان متزامنان
        // يتسلسلان فيرى الثاني الحالة approved ولا ينشئ إشعار قبول ثانياً
        const [prev] = await tx.select({ status: students.placementTestStatus, pathType: students.placementPathType }).from(students)
          .where(eq(students.userId, input.studentId)).limit(1).for("update");
        if (!prev) throw new TRPCError({ code: "NOT_FOUND", message: "الطالب غير موجود" });
        const alreadyApproved = prev.status === "approved";

        let acceptedLevel: { name: string; path: string; aqeedahLevelId: number | null } | undefined;
        if (input.approve) {
          if (input.resultLevelId == null) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "اختر مستوى القبول قبل الاعتماد" });
          }
          if (!prev.pathType) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "مسار اختبار الطالب غير محدد" });
          }
          const [candidate] = await tx.select({
            name: levels.name, path: levels.path, aqeedahLevelId: levels.aqeedahLevelId,
            isActive: levels.isActive,
          }).from(levels).where(eq(levels.id, input.resultLevelId)).limit(1);
          if (!candidate || !candidate.isActive || candidate.path !== prev.pathType) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "المستوى المختار لا ينتمي إلى مسار اختبار الطالب" });
          }
          acceptedLevel = candidate;
        }

        await tx.update(students).set({
          placementTestStatus: input.approve ? "approved" : "rejected",
          placementTestResultLevelId: input.resultLevelId, placementReviewNotes: input.notes,
          currentLevelId: input.approve ? input.resultLevelId : undefined,
        }).where(eq(students.userId, input.studentId));

        if (input.approve && input.resultLevelId) {
          const [exists] = await tx.select().from(studentProgress)
            .where(and(eq(studentProgress.studentId, input.studentId), eq(studentProgress.levelId, input.resultLevelId))).limit(1);
          if (!exists) await tx.insert(studentProgress).values({ id: crypto.randomUUID(), studentId: input.studentId, levelId: input.resultLevelId, status: "in_progress", startedAt: new Date() });
          // الجزء السادس: التسجيل في مستوى قرآني يُلحق الطالب تلقائياً بمتطلب العقيدة الإلزامي المرتبط به
          if (acceptedLevel?.aqeedahLevelId) {
            const [aqExists] = await tx.select({ id: studentProgress.id }).from(studentProgress)
              .where(and(eq(studentProgress.studentId, input.studentId), eq(studentProgress.levelId, acceptedLevel.aqeedahLevelId))).limit(1);
            if (!aqExists) await tx.insert(studentProgress).values({ id: crypto.randomUUID(), studentId: input.studentId, levelId: acceptedLevel.aqeedahLevelId, status: "in_progress", startedAt: new Date() });
          }
        }

        if (input.approve) {
          // إشعار القبول يُنشأ مرة واحدة فقط لأول اعتماد، بنص ديناميكي من قاعدة البيانات
          // (اسم المستوى والمسار يُثبَّتان في نص الإشعار وقت الإنشاء)
          if (!alreadyApproved) {
            const pathLabel = acceptedLevel ? (PLACEMENT_PATH_LABELS[acceptedLevel.path] ?? acceptedLevel.path) : null;
            const body = acceptedLevel && pathLabel
              ? `مبارك، لقد تم قبولك في مستوى ${acceptedLevel.name} ضمن ${pathLabel}. نسأل الله لك التوفيق والبركة في رحلتك التعليمية.${input.notes ? `\n\nملاحظات المشرف: ${input.notes}` : ""}`
              : `مبارك، لقد تم قبولك في المنصة. نسأل الله لك التوفيق والبركة في رحلتك التعليمية.${input.notes ? `\n\nملاحظات المشرف: ${input.notes}` : ""}`;
            await tx.insert(notifications).values({
              id: crypto.randomUUID(), userId: input.studentId,
              title: "مبارك! تم قبولك 🎉", body,
              type: "placement" as never,
              primaryActionUrl: "/student/home", primaryActionLabel: "الانتقال إلى لوحتي",
              payload: { event: "placement_accepted", levelId: input.resultLevelId ?? null, levelName: acceptedLevel?.name ?? null, path: acceptedLevel?.path ?? null },
            });
          }
        } else {
          // الرفض يصل للطالب بدون سبب أو تفاصيل
          await tx.insert(notifications).values({
            id: crypto.randomUUID(), userId: input.studentId,
            title: "نتيجة اختبار تحديد المستوى",
            body: "نأسف، لم يتم قبول طلبك هذه المرة — يمكنك تسجيل فيديو جديد وإعادة الإرسال.",
            type: "placement" as never,
            primaryActionUrl: "/student/placement", primaryActionLabel: "إعادة الاختبار",
          });
        }
      });
      await audit(ctx.user.id, "review_placement", "student", input.studentId, input);
      return { ok: true };
    }),

  // ---------- Student File (ملف الطالب الكامل بعد القبول) ----------
  studentFile: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ input }) => {
      const [row] = await db.select({ u: users, s: students }).from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(eq(students.userId, input.studentId)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الطالب غير موجود" });
      let currentLevelName: string | null = null;
      let currentLevelPath: string | null = null;
      if (row.s.currentLevelId) {
        const [lv] = await db.select().from(levels).where(eq(levels.id, row.s.currentLevelId)).limit(1);
        currentLevelName = lv?.name ?? null;
        currentLevelPath = lv?.path ?? null;
      }
      const progress = await db.select({
        id: studentProgress.id, status: studentProgress.status,
        startedAt: studentProgress.startedAt, completedAt: studentProgress.completedAt,
        completedJuz: studentProgress.completedJuz, completedSessions: studentProgress.completedSessions,
        levelName: levels.name, levelPath: levels.path,
      }).from(studentProgress).innerJoin(levels, eq(studentProgress.levelId, levels.id))
        .where(eq(studentProgress.studentId, input.studentId));
      const sess = await db.select({
        id: sessions.id, scheduledAt: sessions.scheduledAt, status: sessions.status,
        sessionType: sessions.sessionType, durationMinutes: sessions.durationMinutes,
        teacherName: users.fullName,
      }).from(sessions)
        .innerJoin(users, eq(sessions.teacherId, users.id))
        .where(eq(sessions.studentId, input.studentId))
        .orderBy(desc(sessions.scheduledAt)).limit(20);
      return {
        user: { id: row.u.id, fullName: row.u.fullName, phone: row.u.phone, createdAt: row.u.createdAt, isActive: row.u.isActive },
        student: row.s,
        currentLevelName, currentLevelPath,
        progress,
        sessions: sess.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType })),
      };
    }),

  // ---------- Teachers KYC ----------
  kycList: adminProcedure.query(async () => {
    const rows = await db.select({
      teacherId: teachers.userId, name: users.fullName, videoUrl: teachers.kycVideoUrl,
      answers: teachers.kycAnswers, createdAt: teachers.createdAt,
      kycStatus: teachers.kycStatus, reviewNotes: teachers.kycReviewNotes,
      bio: teachers.bio, specialization: teachers.specialization, experienceYears: teachers.experienceYears,
    }).from(teachers).innerJoin(users, eq(teachers.userId, users.id))
      .where(and(eq(teachers.kycStatus, "pending"), sql`${teachers.kycVideoUrl} IS NOT NULL`));
    const certs = rows.length
      ? await db.select().from(schema.teacherCertificates)
        .where(inArray(schema.teacherCertificates.teacherId, rows.map((r) => r.teacherId)))
      : [];
    return rows.map((r) => ({
      ...r, hoursAgo: hoursSince(r.createdAt),
      certificates: certs.filter((c) => c.teacherId === r.teacherId),
    }));
  }),

  kycReview: adminProcedure
    .input(z.object({
      teacherId: z.string(),
      decision: z.enum(["approve", "reject", "request_info"]),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.decision === "request_info") {
        // طلب معلومات إضافية: يبقى الحساب معلّقاً ويُشعَر المعلم بما ينقصه ليستكمله
        if (!input.notes?.trim())
          throw new TRPCError({ code: "BAD_REQUEST", message: "اذكر المعلومات المطلوبة في الملاحظات" });
        await db.update(teachers).set({ kycReviewNotes: input.notes }).where(eq(teachers.userId, input.teacherId));
        await notify(input.teacherId, "طلب معلومات إضافية لاستكمال قبول حسابك", input.notes, "result");
        await audit(ctx.user.id, "request_teacher_info", "teacher", input.teacherId);
        return { ok: true };
      }
      const approve = input.decision === "approve";
      await db.update(teachers).set({
        kycStatus: approve ? "approved" : "rejected", kycReviewNotes: input.notes,
      }).where(eq(teachers.userId, input.teacherId));
      await notify(input.teacherId, approve ? "مبارك! تم قبولك كمعلم متطوع ✅" : "طلب القبول مرفوض", input.notes, "result");
      await audit(ctx.user.id, approve ? "approve_teacher" : "reject_teacher", "teacher", input.teacherId);
      return { ok: true };
    }),

  // ---------- Fatwa Management ----------
  fatwaInbox: adminProcedure
    .input(z.object({
      tab: z.enum(["pending", "assigned", "answered", "published", "rejected"]).default("pending"),
      priority: z.enum(["urgent", "normal"]).optional(),
      category: categoryEnum.optional(),
      muftiId: z.string().optional(),
      query: z.string().trim().max(120).optional(),
    }))
    .query(async ({ input }) => {
      const statusMap: Record<string, ("pending" | "assigned" | "answered" | "published" | "rejected" | "cancelled")[]> = {
        pending: ["pending"], assigned: ["assigned"], answered: ["answered"],
        published: ["published"], rejected: ["rejected", "cancelled"],
      };
      const conditions = [
        inArray(fatwaQuestions.status, statusMap[input.tab]),
        input.priority ? eq(fatwaQuestions.priority, input.priority) : undefined,
        input.category ? eq(fatwaQuestions.category, input.category) : undefined,
        input.muftiId ? eq(fatwaQuestions.muftiId, input.muftiId) : undefined,
        input.query ? ilike(fatwaQuestions.questionText, `%${input.query}%`) : undefined,
      ].filter(Boolean) as ReturnType<typeof eq>[];
      const rows = await db.select().from(fatwaQuestions)
        .where(and(...conditions))
        .orderBy(desc(fatwaQuestions.createdAt)).limit(100);
      const userIds = [...new Set(rows.flatMap((r) => [r.studentId, r.muftiId].filter(Boolean) as string[]))];
      const us = userIds.length ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, userIds)) : [];
      const nameOf = (id: string | null) => us.find((u) => u.id === id)?.fullName ?? "—";
      const answers = rows.length ? await db.select().from(fatwaAnswers).where(inArray(fatwaAnswers.questionId, rows.map((r) => r.id))) : [];
      return rows.map((q) => ({
        ...q, categoryLabel: CATEGORY_LABELS[q.category] ?? q.category,
        studentName: nameOf(q.studentId), muftiName: q.muftiId ? nameOf(q.muftiId) : null,
        hoursAgo: hoursSince(q.assignedAt ?? q.createdAt),
        answer: answers.find((a) => a.questionId === q.id) ?? null,
      }));
    }),

  fatwaAssign: adminProcedure
    .input(z.object({ questionId: z.string(), muftiId: z.string(), note: z.string().max(500).optional(), urgent: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const [mufti] = await db.select().from(teachers).where(eq(teachers.userId, input.muftiId)).limit(1);
      if (!mufti?.isMufti) throw new TRPCError({ code: "BAD_REQUEST", message: "هذا المعلم ليس مفتياً" });
      const [q] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "السؤال غير موجود" });
      const [assign] = await db.select().from(muftiAssignments)
        .where(and(eq(muftiAssignments.teacherId, input.muftiId), eq(muftiAssignments.category, q.category), eq(muftiAssignments.isActive, true))).limit(1);
      if (!assign) throw new TRPCError({ code: "BAD_REQUEST", message: "المفتي غير مُعيّن لهذا التصنيف" });
      const [{ c: pendingCount }] = await db.select({ c: sql<number>`COUNT(*)` }).from(fatwaQuestions)
        .where(and(
          eq(fatwaQuestions.muftiId, input.muftiId),
          eq(fatwaQuestions.status, "assigned"),
          ne(fatwaQuestions.id, input.questionId),
        ));
      if (pendingCount >= assign.maxPendingFatwas)
        throw new TRPCError({ code: "BAD_REQUEST", message: `المفتي وصل الحد الأقصى (${assign.maxPendingFatwas} سؤالاً معلقاً)` });
      await db.update(fatwaQuestions).set({
        muftiId: input.muftiId, assignedBy: ctx.user.id, assignedAt: new Date(),
        status: "assigned", priority: input.urgent ? "urgent" : "normal",
      }).where(eq(fatwaQuestions.id, input.questionId));
      await notify(input.muftiId, "سؤال فتوى جديد أُسند إليك", input.note, "fatwa");
      await audit(ctx.user.id, "assign_fatwa", "fatwa_question", input.questionId, { muftiId: input.muftiId, urgent: input.urgent });
      return { ok: true };
    }),

  fatwaUpdateCategory: adminProcedure
    .input(z.object({ questionId: z.string(), category: categoryEnum }))
    .mutation(async ({ ctx, input }) => {
      const [q] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "السؤال غير موجود" });
      if (q.muftiId && q.category !== input.category) {
        const [assignment] = await db.select({ id: muftiAssignments.id })
          .from(muftiAssignments)
          .where(and(
            eq(muftiAssignments.teacherId, q.muftiId),
            eq(muftiAssignments.category, input.category),
            eq(muftiAssignments.isActive, true),
          ))
          .limit(1);
        if (!assignment) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تغيير التصنيف؛ التصنيف الجديد خارج تخصص المفتي الحالي" });
        }
      }
      await db.update(fatwaQuestions).set({ category: input.category }).where(eq(fatwaQuestions.id, input.questionId));
      await audit(ctx.user.id, "update_fatwa_category", "fatwa_question", input.questionId, { from: q.category, to: input.category });
      return { ok: true };
    }),

  fatwaReviewAnswer: adminProcedure
    .input(z.object({
      answerId: z.string(),
      action: z.enum(["publish_public", "publish_private", "reject"]),
      editedText: z.string().min(50).max(2000).optional(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [answer] = await db.select().from(fatwaAnswers).where(eq(fatwaAnswers.id, input.answerId)).limit(1);
      if (!answer) throw new TRPCError({ code: "NOT_FOUND" });
      const statusMap = { publish_public: "published_public", publish_private: "published_private", reject: "rejected" } as const;
      await db.update(fatwaAnswers).set({
        status: statusMap[input.action],
        ...(input.editedText ? { answerText: input.editedText } : {}),
        reviewNotes: input.notes ?? null,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
      }).where(eq(fatwaAnswers.id, input.answerId));
      if (input.action !== "reject") {
        await db.update(fatwaQuestions).set({ status: "published" }).where(eq(fatwaQuestions.id, answer.questionId));
        await notify(answer.questionId, "تم نشر إجابة سؤالك ✅", undefined, "fatwa");
      } else {
        await db.update(fatwaQuestions).set({ status: "answered" }).where(eq(fatwaQuestions.id, answer.questionId));
      }
      await audit(ctx.user.id, `fatwa_answer_${input.action}`, "fatwa_answer", input.answerId);
      return { ok: true };
    }),

  fatwaRejectQuestion: adminProcedure
    .input(z.object({ questionId: z.string(), reason: z.string().min(5).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const [q] = await db.select().from(fatwaQuestions).where(eq(fatwaQuestions.id, input.questionId)).limit(1);
      if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "السؤال غير موجود" });
      await db.update(fatwaQuestions).set({ status: "rejected" }).where(eq(fatwaQuestions.id, input.questionId));
      await notify(q.studentId, "سؤالك لم يُقبل للنشر", input.reason, "fatwa");
      await audit(ctx.user.id, "reject_fatwa_question", "fatwa_question", input.questionId);
      return { ok: true };
    }),

  // ---------- Muftis ----------
  muftisList: adminProcedure.query(async () => {
    const rows = await db.select({ teacherId: teachers.userId, fullName: users.fullName }).from(teachers)
      .innerJoin(users, eq(teachers.userId, users.id))
      .where(eq(teachers.isMufti, true));
    const result = [];
    for (const r of rows) {
      const assignments = await db.select().from(muftiAssignments)
        .where(and(eq(muftiAssignments.teacherId, r.teacherId), eq(muftiAssignments.isActive, true)));
      const [{ cnt: pending }] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(fatwaQuestions)
        .where(and(eq(fatwaQuestions.muftiId, r.teacherId), eq(fatwaQuestions.status, "assigned")));
      const [{ cnt: answered }] = await db.select({ cnt: sql<number>`COUNT(*)::int` }).from(fatwaAnswers)
        .where(eq(fatwaAnswers.muftiId, r.teacherId));
      const [{ avg }] = await db.select({ avg: sql<string>`COALESCE(AVG(${fatwaRatings.starRating}),0)` })
        .from(fatwaRatings)
        .innerJoin(fatwaAnswers, eq(fatwaRatings.answerId, fatwaAnswers.id))
        .where(eq(fatwaAnswers.muftiId, r.teacherId));
      result.push({
        teacherId: r.teacherId, fullName: r.fullName,
        pending, answered, avgStars: Number(avg ?? 0).toFixed(1),
        maxPending: assignments.reduce((m, a) => Math.max(m, a.maxPendingFatwas), 0),
        categories: assignments.map((a) => ({ id: a.id, categoryLabel: CATEGORY_LABELS[a.category] ?? a.category })),
      });
    }
    return result;
  }),

  muftisStats: adminProcedure.query(async () => {
    const [{ c: totalMuftis }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(teachers).where(eq(teachers.isMufti, true));
    const [{ c: unassigned }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(fatwaQuestions).where(eq(fatwaQuestions.status, "pending"));
    const [{ c: pending }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(fatwaQuestions).where(eq(fatwaQuestions.status, "assigned"));
    const [{ avg }] = await db.select({ avg: sql<string>`COALESCE(AVG(${fatwaRatings.starRating}),0)` }).from(fatwaRatings);
    const [{ hours }] = await db.select({
      hours: sql<string>`COALESCE(AVG(EXTRACT(EPOCH FROM (${fatwaAnswers.createdAt} - ${fatwaQuestions.createdAt}))) / 3600, 0)`,
    }).from(fatwaAnswers).innerJoin(fatwaQuestions, eq(fatwaAnswers.questionId, fatwaQuestions.id));
    return {
      totalMuftis, unassigned, pending,
      avgStars: Number(avg ?? 0).toFixed(1),
      avgAnswerHours: Math.round(Number(hours ?? 0) * 10) / 10,
    };
  }),

  teachersList: adminProcedure.query(async () => {
    const rows = await db.select({
      teacherId: teachers.userId, name: users.fullName,
      isMufti: teachers.isMufti, kycStatus: teachers.kycStatus,
    }).from(teachers).innerJoin(users, eq(teachers.userId, users.id))
      .orderBy(users.fullName);
    return rows;
  }),

  muftiAssign: adminProcedure
    .input(z.object({ teacherId: z.string(), categories: z.array(categoryEnum).min(1), maxPending: z.number().min(1).max(50).default(10) }))
    .mutation(async ({ ctx, input }) => {
      await db.update(teachers).set({ isMufti: true }).where(eq(teachers.userId, input.teacherId));
      await db.delete(muftiAssignments).where(eq(muftiAssignments.teacherId, input.teacherId));
      for (const cat of input.categories) {
        await db.insert(muftiAssignments).values({ id: crypto.randomUUID(), teacherId: input.teacherId, category: cat as never, maxPendingFatwas: input.maxPending });
      }
      await audit(ctx.user.id, "assign_mufti", "teacher", input.teacherId, { categories: input.categories });
      return { ok: true };
    }),

  muftiUnassign: adminProcedure
    .input(z.object({ teacherId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(teachers).set({ isMufti: false }).where(eq(teachers.userId, input.teacherId));
      await db.update(muftiAssignments).set({ isActive: false }).where(eq(muftiAssignments.teacherId, input.teacherId));
      await audit(ctx.user.id, "unassign_mufti", "teacher", input.teacherId);
      return { ok: true };
    }),

  // ---------- Library ----------
  libraryList: adminProcedure
    .input(z.object({ query: z.string().optional() }).optional())
    .query(({ input }) => db.select().from(books)
      .where(input?.query ? or(ilike(books.title, `%${input.query}%`), ilike(books.author, `%${input.query}%`)) : undefined)
      .orderBy(desc(books.createdAt))),

  libraryCreate: adminProcedure
    .input(z.object({
      title: z.string().min(2).max(200), author: z.string().max(150).optional(),
      category: z.enum(["aqeedah", "fiqh", "seerah", "tajweed", "quran", "qiraat", "fatwa", "hadith"]),
      section: z.enum(["curriculum", "hadith", "fatwa", "general"]).default("general"),
      contentType: z.enum(["pdf", "text", "audio", "video", "link"]),
      sourceType: z.enum(["uploaded", "external"]).default("external"),
      fileObjectKey: z.string().max(500).optional(),
      fileUrl: z.string().max(500).optional(), externalUrl: z.string().max(500).optional(),
      textContent: z.string().optional(), levelIds: z.array(z.number()).optional(),
      coverUrl: z.string().max(500).optional(), description: z.string().optional(),
      audioUrl: z.string().max(500).optional(),
      status: z.enum(["published", "hidden", "archived"]).default("published"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.sourceType === "uploaded" && !input.fileObjectKey?.startsWith("/objects/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الملف المرفوع غير صالح" });
      }
      if (input.contentType === "text" && !input.textContent?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "محتوى الكتاب النصي مطلوب" });
      }
      if (input.contentType === "link" && !input.externalUrl?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رابط الكتاب مطلوب" });
      }
      await db.insert(books).values({
        id: crypto.randomUUID(),
        ...input,
        fileUrl: input.sourceType === "uploaded" ? input.fileObjectKey : input.fileUrl,
        externalUrl: input.sourceType === "uploaded" ? null : input.externalUrl,
        createdBy: ctx.user.id,
      });
      await audit(ctx.user.id, "create_book", "book", undefined, { title: input.title });
      return { ok: true };
    }),

  libraryUpdate: adminProcedure
    .input(z.object({
      id: z.string(), title: z.string().min(2).max(200).optional(),
      author: z.string().max(150).optional(),
      category: z.enum(["aqeedah", "fiqh", "seerah", "tajweed", "quran", "qiraat", "fatwa", "hadith"]).optional(),
      section: z.enum(["curriculum", "hadith", "fatwa", "general"]).optional(),
      contentType: z.enum(["pdf", "text", "audio", "video", "link"]).optional(),
      sourceType: z.enum(["uploaded", "external"]).optional(),
      fileObjectKey: z.string().max(500).nullable().optional(),
      fileUrl: z.string().max(500).nullable().optional(), externalUrl: z.string().max(500).nullable().optional(),
      textContent: z.string().nullable().optional(),
      coverUrl: z.string().max(500).nullable().optional(), description: z.string().nullable().optional(),
      audioUrl: z.string().max(500).nullable().optional(),
      status: z.enum(["published", "hidden", "archived"]).optional(), levelIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (rest.sourceType === "uploaded" && !rest.fileObjectKey?.startsWith("/objects/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الملف المرفوع غير صالح" });
      }
      if (rest.contentType === "text" && rest.textContent !== undefined && !rest.textContent?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "محتوى الكتاب النصي مطلوب" });
      }
      if (rest.contentType === "link" && rest.externalUrl !== undefined && !rest.externalUrl?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رابط الكتاب مطلوب" });
      }
      await db.update(books).set({
        ...rest,
        ...(rest.sourceType === "uploaded" ? { fileUrl: rest.fileObjectKey, externalUrl: null } : {}),
      }).where(eq(books.id, id));
      await audit(ctx.user.id, "update_book", "book", id);
      return { ok: true };
    }),

  libraryDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(books).where(eq(books.id, input.id));
      await audit(ctx.user.id, "delete_book", "book", input.id);
      return { ok: true };
    }),

  // أرشفة/استعادة الكتب — الأرشفة من «منشور» فقط، والاستعادة من «مؤرشف» فقط (يحافظ على حالة «مخفي»، ولا يولّد audit لعنصر غير موجود)
  librarySetStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["archived", "published"]) }))
    .mutation(async ({ ctx, input }) => {
      const [book] = await db.select({ status: books.status }).from(books).where(eq(books.id, input.id)).limit(1);
      if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "الكتاب غير موجود" });
      if (input.status === "archived" && book.status !== "published") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن أرشفة كتاب مخفي أو مؤرشف مسبقاً" });
      }
      if (input.status === "published" && book.status !== "archived") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الكتاب ليس في الأرشيف" });
      }
      await db.update(books).set({ status: input.status }).where(eq(books.id, input.id));
      await audit(ctx.user.id, input.status === "archived" ? "archive_book" : "restore_book", "book", input.id);
      return { ok: true };
    }),

  // ---------- Assessments ----------
  assessmentsList: adminProcedure.query(async () => {
    const rows = await db.select({
      a: assessments, levelName: levels.name,
      questionCount: sql<number>`(SELECT COUNT(*) FROM ${assessmentQuestions} WHERE ${assessmentQuestions.assessmentId} = ${assessments.id})::int`,
      attemptCount: sql<number>`(SELECT COUNT(*) FROM ${assessmentAttempts} WHERE ${assessmentAttempts.assessmentId} = ${assessments.id})::int`,
    }).from(assessments)
      .leftJoin(levels, eq(assessments.levelId, levels.id))
      .orderBy(desc(assessments.createdAt));
    return rows.map((r) => ({ ...r.a, levelName: r.levelName, questionCount: r.questionCount, attemptCount: r.attemptCount }));
  }),

  assessmentUpdate: adminProcedure
    .input(z.object({
      id: z.string(), isActive: z.boolean().optional(),
      name: z.string().min(3).max(200).optional(),
      passPercentage: z.number().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      await db.update(assessments).set(rest).where(eq(assessments.id, id));
      await audit(ctx.user.id, "update_assessment", "assessment", id, rest);
      return { ok: true };
    }),

  questionsBankList: adminProcedure.query(() =>
    db.select().from(assessmentQuestions).where(eq(assessmentQuestions.isBankQuestion, true))
  ),

  questionAdd: adminProcedure
    .input(z.object({
      assessmentId: z.string().optional(),
      type: z.enum(["mcq", "true_false", "fill_blank", "recitation"]),
      questionText: z.string().min(3),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().optional(),
      topic: z.string().max(100).optional(),
      isBankQuestion: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(assessmentQuestions).values({
        id: crypto.randomUUID(), assessmentId: input.assessmentId ?? null,
        type: input.type, questionText: input.questionText,
        options: input.options ?? null, correctAnswer: input.correctAnswer ?? null,
        topic: input.topic ?? null, isBankQuestion: input.isBankQuestion ?? false,
      });
      await audit(ctx.user.id, "add_question", "assessment", input.assessmentId, { isBankQuestion: input.isBankQuestion ?? false });
      return { ok: true };
    }),

  assessmentCreate: adminProcedure
    .input(z.object({
      name: z.string().min(3).max(200), levelId: z.number().optional(),
      passPercentage: z.number().min(1).max(100).default(60),
      maxAttempts: z.number().min(1).default(3),
      durationMinutes: z.number().min(5).max(180).optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(assessments).values({ id: crypto.randomUUID(), ...input, createdBy: ctx.user.id });
      await audit(ctx.user.id, "create_assessment", "assessment", undefined, { name: input.name });
      return { ok: true };
    }),

  assessmentQuestionsAdd: adminProcedure
    .input(z.object({
      assessmentId: z.string(),
      questions: z.array(z.object({
        questionText: z.string().min(5),
        type: z.enum(["mcq", "true_false", "fill_blank", "recitation"]),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().optional(),
        topic: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const [i, q] of input.questions.entries()) {
        await db.insert(assessmentQuestions).values({ id: crypto.randomUUID(), assessmentId: input.assessmentId, orderIndex: i + 1, ...q });
      }
      await audit(ctx.user.id, "add_questions", "assessment", input.assessmentId, { count: input.questions.length });
      return { ok: true };
    }),

  attemptsList: adminProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.select({ attempt: assessmentAttempts, name: users.fullName }).from(assessmentAttempts)
        .innerJoin(users, eq(assessmentAttempts.studentId, users.id))
        .where(eq(assessmentAttempts.assessmentId, input.assessmentId))
        .orderBy(desc(assessmentAttempts.createdAt));
      return rows.map((r) => ({ ...r.attempt, studentName: r.name }));
    }),

  // ---------- Analytics ----------
  analyticsOverview: adminProcedure.query(async () => {
    const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`COUNT(*)` }).from(users);
    const [{ totalStudents }] = await db.select({ totalStudents: sql<number>`COUNT(*)` }).from(students);
    const [{ totalTeachers }] = await db.select({ totalTeachers: sql<number>`COUNT(*)` }).from(teachers).where(eq(teachers.kycStatus, "approved"));
    const [{ totalSessions }] = await db.select({ totalSessions: sql<number>`COUNT(*)` }).from(sessions);
    const [{ completedSessions }] = await db.select({ completedSessions: sql<number>`COUNT(*)` }).from(sessions).where(eq(sessions.status, "completed"));

    const [{ c: placementSubmitted }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(students)
      .where(sql`${students.placementTestVideoUrl} IS NOT NULL`);
    const [{ c: placementApproved }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(students)
      .where(eq(students.placementTestStatus, "approved"));

    const levelCounts = await db.select({
      levelId: students.currentLevelId, levelName: levels.name, c: sql<number>`COUNT(*)::int`,
    }).from(students)
      .leftJoin(levels, eq(students.currentLevelId, levels.id))
      .groupBy(students.currentLevelId, levels.name);

    const heatmap = await db.select({
      weekday: sql<number>`EXTRACT(DOW FROM ${sessions.scheduledAt})::int + 1`,
      hour: sql<number>`EXTRACT(HOUR FROM ${sessions.scheduledAt})::int`,
      c: sql<number>`COUNT(*)::int`,
    }).from(sessions).groupBy(sql`1`, sql`2`);

    const [{ c: booksCount }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(books);
    const [{ c: recordingsCount }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(recordings);
    const [{ c: fatwasPublished }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(fatwaAnswers)
      .where(eq(fatwaAnswers.status, "published_public"));
    const [{ c: bookmarksCount }] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(bookmarks);

    const teacherStats = await db.select({
      teacherId: sessions.teacherId, fullName: users.fullName,
      total: sql<number>`COUNT(*)::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${sessions.status} = 'completed')::int`,
    }).from(sessions)
      .innerJoin(users, eq(sessions.teacherId, users.id))
      .groupBy(sessions.teacherId, users.fullName);

    return {
      totalUsers, totalStudents, totalTeachers, totalSessions, completedSessions,
      funnel: { totalUsers, totalStudents, placementSubmitted, placementApproved },
      levelCounts, heatmap,
      content: { booksCount, recordingsCount, fatwasPublished, bookmarksCount },
      teacherStats,
    };
  }),

  // ---------- Notifications ----------
  notificationCreate: adminProcedure
    .input(z.object({
      audienceType: z.enum(["all_students", "all_teachers", "specific_level", "specific_user"]),
      audienceTarget: z.string().optional(),
      title: z.string().min(2).max(200), body: z.string().max(1000).optional(),
      notifType: z.enum(["general", "reminder", "result", "activity", "ayah_day", "hadith_day", "ibn_qayyim", "session", "fatwa", "recording"]).optional(),
      type: z.enum(["general", "reminder", "result", "activity", "ayah_day", "hadith_day", "ibn_qayyim", "session", "fatwa", "recording"]).optional(),
      isRecurring: z.boolean().optional(),
      recurrencePattern: z.string().max(50).optional(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const resolvedType = input.notifType ?? input.type ?? "general";
      const sentId = crypto.randomUUID();
      await db.insert(adminNotificationsSent).values({
        id: sentId, adminId: ctx.user.id, title: input.title, body: input.body,
        audienceType: input.audienceType, audienceTarget: input.audienceTarget,
        notificationType: resolvedType,
        isRecurring: input.isRecurring ?? false,
        recurrencePattern: input.recurrencePattern ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      });
      let targetUsers: string[] = [];
      if (input.audienceType === "all_students") {
        const us = await db.select({ id: users.id }).from(users).where(eq(users.role, "student"));
        targetUsers = us.map((u) => u.id);
      } else if (input.audienceType === "all_teachers") {
        const us = await db.select({ id: users.id }).from(users).where(eq(users.role, "teacher"));
        targetUsers = us.map((u) => u.id);
      } else if (input.audienceType === "specific_user" && input.audienceTarget) {
        targetUsers = [input.audienceTarget];
      } else if (input.audienceType === "specific_level" && input.audienceTarget) {
        const lvId = parseInt(input.audienceTarget);
        const st = await db.select({ userId: schema.students.userId }).from(schema.students).where(eq(schema.students.currentLevelId, lvId));
        targetUsers = st.map((s) => s.userId);
      }
      for (const userId of targetUsers) {
        await db.insert(notifications).values({ id: crypto.randomUUID(), userId, title: input.title, body: input.body, type: resolvedType as never });
      }
      await audit(ctx.user.id, "send_notification", "notification", sentId, { audienceType: input.audienceType, count: targetUsers.length });
      return { ok: true, sent: targetUsers.length, sentCount: targetUsers.length };
    }),

  notificationsTemplates: adminProcedure.query(() => [
    { key: "welcome", title: "أهلاً بك في تبيان", body: "نسعد بانضمامك إلى منصة تبيان لتعليم القرآن الكريم. رحلتك تبدأ الآن.", type: "general" },
    { key: "reminder_24h", title: "تذكير بحصتك غداً", body: "لديك حصة مجدولة بعد 24 ساعة. نراك في موعدك بإذن الله.", type: "reminder" },
    { key: "reminder_15m", title: "تذكير: حلقتك بعد قليل", body: "تبقى 15 دقيقة على بدء الحلقة.", type: "reminder" },
    { key: "placement_approved", title: "تم اعتماد مستواك", body: "مبروك! تم تحديد مستواك ويمكنك الآن حجز حصصك.", type: "result" },
    { key: "placement_rejected", title: "إعادة اختبار تحديد المستوى", body: "نرجو إعادة تسجيل فيديو اختبار تحديد المستوى وفق الملاحظات المرسلة.", type: "result" },
    { key: "promotion", title: "تمت ترقيتك", body: "مبارك! انتقلت إلى المستوى التالي. واصل التقدم.", type: "result" },
    { key: "recording", title: "تسجيل حصتك جاهز", body: "أصبح تسجيل حصتك الأخيرة متاحاً للمراجعة في ملفك.", type: "recording" },
  ]),

  notificationsLog: adminProcedure.query(async () => {
    const rows = await db.select({
      n: adminNotificationsSent, adminName: users.fullName,
    }).from(adminNotificationsSent)
      .leftJoin(users, eq(adminNotificationsSent.adminId, users.id))
      .orderBy(desc(adminNotificationsSent.sentAt)).limit(50);
    return rows.map((r) => ({ ...r.n, adminName: r.adminName }));
  }),

  notificationsRecurring: adminProcedure.query(() =>
    db.select().from(adminNotificationsSent)
      .where(eq(adminNotificationsSent.isRecurring, true))
      .orderBy(desc(adminNotificationsSent.sentAt)).limit(50)
  ),

  notificationToggleRecurring: adminProcedure
    .input(z.object({ id: z.string(), isRecurring: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(adminNotificationsSent).set({ isRecurring: input.isRecurring })
        .where(eq(adminNotificationsSent.id, input.id));
      await audit(ctx.user.id, input.isRecurring ? "enable_recurring_notification" : "disable_recurring_notification", "notification", input.id);
      return { ok: true };
    }),

  notificationLog: adminProcedure.query(() =>
    db.select().from(adminNotificationsSent).orderBy(desc(adminNotificationsSent.sentAt)).limit(50)
  ),

  // ---------- Settings ----------
  settingsGet: adminProcedure.query(() => db.select().from(systemSettings)),

  settingsUpdate: adminProcedure
    .input(z.object({ key: z.string().min(1).max(100), value: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(systemSettings).values({
        id: crypto.randomUUID(), key: input.key, value: input.value,
        description: input.description, updatedBy: ctx.user.id,
      }).onConflictDoUpdate({ target: systemSettings.key, set: { value: input.value, updatedBy: ctx.user.id } });
      await audit(ctx.user.id, "update_setting", "system_setting", input.key, { value: input.value });
      return { ok: true };
    }),

  settingsChangeMasterPassword: adminProcedure
    .input(z.object({ current: masterPasswordSchema, newPassword: masterPasswordSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db.select().from(systemSettings)
        .where(eq(systemSettings.key, "admin_master_password_hash")).limit(1);
      if (!row || !(await bcrypt.compare(input.current, row.value)))
        throw new TRPCError({ code: "FORBIDDEN", message: "كلمة السر الحالية غير صحيحة" });
      const hash = await bcrypt.hash(input.newPassword, 10);
      await db.update(systemSettings).set({ value: hash, updatedBy: ctx.user.id })
        .where(eq(systemSettings.key, "admin_master_password_hash"));
      await db.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.isActive, true));
      await audit(ctx.user.id, "change_master_password", "system_setting", "admin_master_password_hash");
      return { ok: true };
    }),

  activeAdmins: adminProcedure.query(async () => {
    const rows = await db.select({
      session: adminSessions, fullName: users.fullName, phone: users.phone,
    }).from(adminSessions).innerJoin(users, eq(users.id, adminSessions.userId))
      .where(eq(adminSessions.isActive, true)).orderBy(desc(adminSessions.lastActivity));
    return rows.map((r) => ({ ...r.session, fullName: r.fullName, phone: r.phone }));
  }),

  forceLogout: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.id, input.sessionId));
      await audit(ctx.user.id, "force_logout_admin", "admin_session", input.sessionId);
      return { ok: true };
    }),

  // ---------- سجل التدقيق ----------
  /** سجل التدقيق مع اسم المشرف المنفّذ وترقيم صفحات وتصفية اختيارية بالإجراء أو نوع المستهدف.
   *  leftJoin لا innerJoin — سجلات مشرف محذوف (adminId=NULL بعد onDelete:set null) يجب أن تبقى ظاهرة */
  auditLogsList: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      action: z.string().trim().min(1).max(50).optional(),
      targetType: z.string().trim().min(1).max(50).optional(),
    }).optional())
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = 30;
      const conds = [];
      if (input?.action) conds.push(eq(auditLogs.action, input.action));
      if (input?.targetType) conds.push(eq(auditLogs.targetType, input.targetType));
      const where = conds.length ? and(...conds) : undefined;
      const [{ c: total }] = await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogs).where(where);
      const rows = await db.select({
        id: auditLogs.id, action: auditLogs.action, targetType: auditLogs.targetType,
        targetId: auditLogs.targetId, details: auditLogs.details, ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt, adminName: users.fullName, adminUsername: users.username,
      }).from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.adminId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize).offset((page - 1) * pageSize);
      // خيارات التصفية من القيم الموجودة فعلاً — لا قائمة مجمّدة تتقادم مع كل إجراء جديد
      const actionRows = await db.selectDistinct({ v: auditLogs.action }).from(auditLogs).orderBy(auditLogs.action);
      const targetTypeRows = await db.selectDistinct({ v: auditLogs.targetType }).from(auditLogs).orderBy(auditLogs.targetType);
      return {
        rows, total: Number(total), page, pageSize,
        actions: actionRows.map((r) => r.v),
        targetTypes: targetTypeRows.map((r) => r.v),
      };
    }),

  // ---------- إدارة الحسابات (إنشاء من لوحة الإشراف) ----------
  // الصلاحية محصورة بالمشرف الحالي عبر adminProcedure — لا يستطيع أي دور آخر الوصول

  /** قائمة الحسابات المنشأة من لوحة الإشراف (createdBy موجود) — مشرفون ومعلمون */
  accountsList: adminProcedure.query(async () => {
    return db.select({
      id: users.id, username: users.username, fullName: users.fullName, role: users.role,
      isActive: users.isActive, accountOrigin: users.accountOrigin, createdAt: users.createdAt,
      kycStatus: teachers.kycStatus, assignedPath: teachers.assignedPath, levelName: levels.name,
    }).from(users)
      .leftJoin(teachers, eq(teachers.userId, users.id))
      .leftJoin(levels, eq(levels.id, teachers.assignedLevelId))
      .where(and(inArray(users.role, ["admin", "teacher"]), isNotNull(users.createdBy)))
      .orderBy(desc(users.createdAt));
  }),

  /** إنشاء مشرف جديد: اسم مستخدم فريد + كلمة سر مشفّرة فقط.
   *  القيد الفريد على username يجعل العملية idempotent — الضغط المكرر يفشل برسالة واضحة بلا حساب مكرر */
  createSupervisor: adminProcedure
    .input(z.object({ username: usernameSchema, password: passwordSchema, fullName: accountFullNameSchema }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(input.password, 10);
      const fullName = input.fullName ?? input.username;
      try {
        // الإنشاء + سجل التدقيق في معاملة واحدة — لا يُنشأ حساب بلا أثر تدقيقي ولا يُكتب أثر بلا حساب
        await db.transaction(async (tx) => {
          await tx.insert(users).values({
            id, fullName, username: input.username, role: "admin",
            passwordHash, accountOrigin: "supervisor_created", createdBy: ctx.user.id,
          });
          await tx.insert(auditLogs).values({
            id: crypto.randomUUID(), adminId: ctx.user.id, action: "create_supervisor",
             targetType: "user", targetId: id, details: { username: input.username, fullName },
          });
        });
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل — اختر اسماً آخر" });
        }
        throw e;
      }
      return { ok: true as const, id, username: input.username, fullName };
    }),

  /** إنشاء معلم معتمد مباشرة (بلا اختبار قبول): اسم مستخدم فريد + كلمة سر + مسار + مستوى تابع له.
   *  كل الكتابات في معاملة واحدة — فشل أي جزء يُرجع الجميع فلا يُخلق نصف حساب */
  createTeacher: adminProcedure
    .input(z.object({
      username: usernameSchema,
      password: passwordSchema,
      fullName: accountFullNameSchema,
      path: z.enum(["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"]),
      levelId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(input.password, 10);
      const fullName = input.fullName ?? input.username;
      try {
        // التحقق من المستوى والإنشاء والتدقيق والإشعار — كلها داخل معاملة واحدة ذرّية
        await db.transaction(async (tx) => {
          const [lvl] = await tx.select().from(levels).where(eq(levels.id, input.levelId)).limit(1);
          if (!lvl || !lvl.isActive) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "المستوى المختار غير موجود" });
          }
          if (lvl.path !== input.path) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "المستوى المختار لا يتبع المسار المحدد" });
          }
          await tx.insert(users).values({
            id, fullName, username: input.username, role: "teacher",
            passwordHash, accountOrigin: "supervisor_created", createdBy: ctx.user.id,
          });
          // معتمد مباشرة — يتجاوز اختبار القبول لأن المشرف أنشأ حسابه، والعمل تطوعي
          await tx.insert(teachers).values({
            userId: id, kycStatus: "approved", isVolunteer: true,
            assignedPath: input.path, assignedLevelId: input.levelId,
          });
          await tx.insert(teacherSettings).values({ id: crypto.randomUUID(), teacherId: id });
          await tx.insert(auditLogs).values({
            id: crypto.randomUUID(), adminId: ctx.user.id, action: "create_teacher",
            targetType: "user", targetId: id,
             details: { username: input.username, fullName, path: input.path, levelId: input.levelId },
          });
          await tx.insert(notifications).values({
            id: crypto.randomUUID(), userId: id, type: "general" as never,
            title: "أُنشئ حسابك في تبيان",
            body: "اعتمد المشرف حسابك مباشرة — يمكنك البدء فوراً بالدخول باسم المستخدم.",
          });
        });
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل — اختر اسماً آخر" });
        }
        throw e;
      }
      return { ok: true as const, id, username: input.username, fullName };
    }),

  /** تعطيل/تنشيط حساب إشرافي (مشرف أو معلم منشأ من اللوحة).
   *  التعطيل يُنهي كل جلسات ورموز المستخدم فوراً — لا يكفي منع الدخول القادم */
  accountSetActive: adminProcedure
    .input(z.object({ userId: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك إيقاف حسابك الحالي" });
      }
      await db.transaction(async (tx) => {
        const [target] = await tx.select({ id: users.id, role: users.role, username: users.username, createdBy: users.createdBy })
          .from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target || !["admin", "teacher"].includes(target.role) || !target.createdBy) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود ضمن حسابات الإشراف" });
        }
        await tx.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
        if (!input.isActive) {
          // إنهاء فوري لكل الجلسات والرموز — الحساب الموقوف لا يبقى متصلاً
          await tx.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.userId, input.userId));
          await tx.delete(authTokens).where(eq(authTokens.userId, input.userId));
        }
        await tx.insert(auditLogs).values({
          id: crypto.randomUUID(), adminId: ctx.user.id,
          action: input.isActive ? "activate_account" : "deactivate_account",
          targetType: "user", targetId: input.userId, details: { username: target.username },
        });
      });
      return { ok: true as const };
    }),

  /** إعادة تعيين كلمة سر حساب إشرافي — نفس passwordSchema المعتمد عند الإنشاء.
   *  تُنهى الجلسات والرموز القائمة كي لا تبقى جلسة قديمة صالحة بعد تغيير كلمة السر */
  accountResetPassword: adminProcedure
    .input(z.object({ userId: z.string().uuid(), password: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.transaction(async (tx) => {
        const [target] = await tx.select({ id: users.id, role: users.role, username: users.username, createdBy: users.createdBy })
          .from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target || !["admin", "teacher"].includes(target.role) || !target.createdBy) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود ضمن حسابات الإشراف" });
        }
        await tx.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
        if (input.userId !== ctx.user.id) {
          await tx.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.userId, input.userId));
          await tx.delete(authTokens).where(eq(authTokens.userId, input.userId));
        }
        await tx.insert(auditLogs).values({
          id: crypto.randomUUID(), adminId: ctx.user.id, action: "reset_account_password",
          targetType: "user", targetId: input.userId, details: { username: target.username },
        });
      });
      return { ok: true as const };
    }),

  /** إنهاء كل جلسات مستخدم إشرافي (adminSessions + authTokens) دون تغيير حالته */
  accountTerminateSessions: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك إنهاء جلستك الحالية من هنا" });
      }
      await db.transaction(async (tx) => {
        const [target] = await tx.select({ id: users.id, role: users.role, username: users.username, createdBy: users.createdBy })
          .from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target || !["admin", "teacher"].includes(target.role) || !target.createdBy) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود ضمن حسابات الإشراف" });
        }
        await tx.update(adminSessions).set({ isActive: false }).where(eq(adminSessions.userId, input.userId));
        await tx.delete(authTokens).where(eq(authTokens.userId, input.userId));
        await tx.insert(auditLogs).values({
          id: crypto.randomUUID(), adminId: ctx.user.id, action: "terminate_account_sessions",
          targetType: "user", targetId: input.userId, details: { username: target.username },
        });
      });
      return { ok: true as const };
    }),
});
