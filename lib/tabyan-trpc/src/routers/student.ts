import { z } from "zod";
import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, studentProcedure } from "../middleware";
import { db } from "@workspace/db";
import {
  bookAssignments, books, evaluations, levels, notifications, promotionRequests, qiraatCertificates,
  recordings, scheduleChangeRequests, sessions, studentProgress, studentSettings,
  students, teachers, users, weeklySchedules,
} from "@workspace/db";
import { curriculumBookVisible } from "./library";

/** اسم كتاب تحفة الأطفال — مرجع ثابت للربط بينه وبين تسجيل الطالب التلقائي عند اختياره في اختبار القبول */
const TUHFA_BOOK_TITLE = "تحفة الأطفال";

const SESSION_TYPE_LABELS: Record<string, string> = {
  quran_hifz: "حفظ قرآن", quran_review: "مراجعة قرآن", qiraat: "قراءات",
  tajweed_correction: "تصحيح تلاوة", tajweed_level: "تجويد",
  sharia_fiqh: "فقه", sharia_aqeedah: "عقيدة", sharia_seerah: "سيرة",
};

/** Notify every admin account (real in-app notifications). */
async function notifyAdmins(title: string, body: string, type: "general" | "result" | "activity" = "general") {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  if (!admins.length) return;
  await db.insert(notifications).values(
    admins.map((a) => ({ id: crypto.randomUUID(), userId: a.id, title, body, type })),
  );
}

export const studentRouter = createRouter({
  dashboard: studentProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id;
    const [st] = await db.select().from(students).where(eq(students.userId, me)).limit(1);
    const upcoming = await db.select({
      id: sessions.id, scheduledAt: sessions.scheduledAt, durationMinutes: sessions.durationMinutes,
      status: sessions.status, topic: sessions.topic, sessionType: sessions.sessionType,
      levelId: sessions.levelId, levelName: levels.name,
      teacherName: users.fullName, teacherRating: teachers.avgRating,
    }).from(sessions)
      .innerJoin(teachers, eq(sessions.teacherId, teachers.userId))
      .innerJoin(users, eq(teachers.userId, users.id))
      .leftJoin(levels, eq(sessions.levelId, levels.id))
      .where(and(eq(sessions.studentId, me), gte(sessions.scheduledAt, new Date()),
        or(eq(sessions.status, "confirmed"), eq(sessions.status, "scheduled"), eq(sessions.status, "in_progress"))))
      .orderBy(sessions.scheduledAt).limit(20);
    const doneCount = await db.select({ id: sessions.id }).from(sessions)
      .where(and(eq(sessions.studentId, me), eq(sessions.status, "completed")));

    // التسجيل الفعلي في المسارات: حجوزات نشطة (غير ملغاة) أو تقدّم دراسي جارٍ —
    // لا يعتمد على وجود موعد قادم حتى لا يظهر المسجّل كغير مسجّل بين الحلقات
    const SESSION_TYPE_PATH: Record<string, string> = {
      quran_hifz: "quran", quran_review: "quran", qiraat: "quran",
      tajweed_correction: "tajweed", tajweed_level: "tajweed",
      sharia_fiqh: "sharia", sharia_aqeedah: "sharia", sharia_seerah: "sharia",
    };
    const LEVEL_PATH_TO_HOME: Record<string, string> = {
      quran: "quran", qiraat: "quran", tajweed_correction: "tajweed", tajweed: "tajweed", sharia: "sharia",
    };
    const activeBookings = await db.select({ sessionType: sessions.sessionType, levelPath: levels.path })
      .from(sessions)
      .leftJoin(levels, eq(sessions.levelId, levels.id))
      .where(and(eq(sessions.studentId, me),
        or(eq(sessions.status, "confirmed"), eq(sessions.status, "scheduled"), eq(sessions.status, "in_progress"))));
    const progressRows = await db.select({ levelPath: levels.path })
      .from(studentProgress)
      .innerJoin(levels, eq(studentProgress.levelId, levels.id))
      .where(and(eq(studentProgress.studentId, me), eq(studentProgress.status, "in_progress")));
    const enrolled = new Set<string>();
    for (const r of activeBookings) {
      const p = SESSION_TYPE_PATH[r.sessionType] ?? (r.levelPath ? LEVEL_PATH_TO_HOME[r.levelPath] : undefined);
      if (p) enrolled.add(p);
    }
    for (const r of progressRows) {
      const p = r.levelPath ? LEVEL_PATH_TO_HOME[r.levelPath] : undefined;
      if (p) enrolled.add(p);
    }
    const enrolledPaths = ["quran", "tajweed", "sharia"].filter((p) => enrolled.has(p));
    const evals = await db.select({ total: evaluations.totalScore }).from(evaluations).where(eq(evaluations.studentId, me));
    const avgScore = evals.length ? Math.round(evals.reduce((a, e) => a + e.total, 0) / evals.length) : 0;
    let levelName = "—";
    let lv: (typeof levels.$inferSelect) | undefined;
    if (st?.currentLevelId) {
      [lv] = await db.select().from(levels).where(eq(levels.id, st.currentLevelId)).limit(1);
      levelName = lv?.name ?? "—";
    }
    // كتب «دروس اليوم» تخضع لنفس فلترة المكتبة: المسار (وفي الشريعة المادة) ثم الترتيب
    const myLevelScope = lv?.id != null ? { path: lv.path, orderIndex: lv.orderIndex, nameEn: lv.nameEn } : null;
    const allLevelsForBooks = await db.select().from(levels);
    const levelById = new Map(allLevelsForBooks.map((l) => [l.id, { path: l.path, orderIndex: l.orderIndex, nameEn: l.nameEn }]));
    const lessonBooks = (await db.select().from(books).where(eq(books.status, "published")))
      .filter((b) => b.section !== "curriculum" || curriculumBookVisible((b.levelIds as number[] | null) ?? [], myLevelScope, levelById))
      .slice(0, 3);
    const birth = st?.birthDate ? new Date(st.birthDate) : null;
    const age = birth ? Math.floor((Date.now() - birth.getTime()) / 3.156e10) : null;

    // الجزء السابع: نسبة الإتمام الكلية تجمع القرآن + متطلب العقيدة الإلزامي + التقييمات المطلوبة،
    // ولا تبلغ 100% أبداً حتى يكتمل كل مكوّن إلزامي
    let completionPercentage = 0;
    if (st?.currentLevelId) {
      const [cur] = await db.select().from(levels).where(eq(levels.id, st.currentLevelId)).limit(1);
      if (cur?.path === "quran") {
        const components: number[] = [];
        const [prog] = await db.select().from(studentProgress)
          .where(and(eq(studentProgress.studentId, me), eq(studentProgress.levelId, cur.id))).limit(1);
        let quranPct = 0;
        if (prog?.status === "completed") quranPct = 100;
        else if (prog) {
          const parts: number[] = [];
          if (cur.requiredJuz > 0) parts.push(Math.min(100, (prog.completedJuz / cur.requiredJuz) * 100));
          if (cur.requiredSessions > 0) parts.push(Math.min(100, (prog.completedSessions / cur.requiredSessions) * 100));
          quranPct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
        }
        components.push(quranPct);
        if (cur.aqeedahLevelId) {
          const aqId = cur.aqeedahLevelId;
          const [aqProg] = await db.select().from(studentProgress)
            .where(and(eq(studentProgress.studentId, me), eq(studentProgress.levelId, aqId))).limit(1);
          let aqPct = 0;
          if (aqProg?.status === "completed") aqPct = 100;
          else {
            const aqRes = await db.execute(sql`SELECT
              (SELECT COUNT(*) FROM sharia_exam_attempts WHERE student_id = ${me} AND level_id = ${aqId} AND passed)::int AS exam_passed,
              (SELECT COUNT(*) FROM sharia_content WHERE level_id = ${aqId} AND status = 'published')::int AS total,
              (SELECT COUNT(*) FROM sharia_content_progress p JOIN sharia_content c ON c.id = p.content_id
                WHERE p.student_id = ${me} AND c.level_id = ${aqId} AND (p.status = 'completed' OR p.progress_percentage >= 100))::int AS done`);
            const aqRow = aqRes.rows[0] as { exam_passed: number; total: number; done: number } | undefined;
            if (Number(aqRow?.exam_passed ?? 0) > 0) aqPct = 100;
            else {
              const aqTotal = Number(aqRow?.total ?? 0);
              if (aqTotal > 0) aqPct = (Number(aqRow?.done ?? 0) / aqTotal) * 100;
            }
          }
          components.push(aqPct);
        }
        const asRes = await db.execute(sql`SELECT
          (SELECT COUNT(*) FROM assessments WHERE level_id = ${cur.id} AND is_active)::int AS total,
          (SELECT COUNT(DISTINCT a.id) FROM assessments a JOIN assessment_attempts t ON t.assessment_id = a.id
            WHERE a.level_id = ${cur.id} AND a.is_active AND t.student_id = ${me} AND t.passed)::int AS passed`);
        const asRow = asRes.rows[0] as { total: number; passed: number } | undefined;
        if (Number(asRow?.total ?? 0) > 0) components.push((Number(asRow?.passed ?? 0) / Number(asRow?.total)) * 100);
        const avg = components.reduce((a, b) => a + b, 0) / components.length;
        completionPercentage = Math.round(components.every((c) => c >= 100) ? 100 : Math.min(99, avg));
      }
    }

    return {
      student: st, age, levelName, enrolledPaths, completionPercentage,
      stats: { totalJuz: st?.totalJuz ?? 0, sessionsCount: doneCount.length, avgScore },
      upcoming: upcoming.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] })),
      todayLessons: lessonBooks,
    };
  }),

  submitPlacement: studentProcedure
    .input(z.object({
      videoUrl: z.string().regex(/^\/objects\/(?!.*\.\.)[\w\-./]+$/, "مسار الفيديو غير صالح"),
      pathType: z.enum(["quran", "tajweed_correction"]).default("quran"),
      // يطابق نطاق التسجيل الفعلي في تطبيق الجوال (٤٥–٣٠٠ ثانية) — كان الحد الأقصى هنا ١٢٠
      // فيرفض الخادم أي تسجيل أطول رغم أن الواجهة تسمح به وتعرضه للمستخدم.
      durationSeconds: z.number().int().min(1).max(300).optional(),
      // اختيار الطالب دراسة تحفة الأطفال أثناء اختبار القبول (المستويات 1-4 فقط) — لا يؤثر على منطق الاختبار أو نتيجته
      studyTuhfa: z.boolean().optional(),
      levelId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // المستوى المشمول هو أول أربعة مستويات مرتبة داخل مسار القرآن فقط.
      // لا نعتمد على رقم ID ولا على قاعدة "كل ما ليس الأخير".
      let tuhfaEligible = false;
      if (input.pathType === "quran" && input.levelId != null) {
        const quranLevels = await db.select({ id: levels.id })
          .from(levels).where(eq(levels.path, "quran")).orderBy(levels.orderIndex);
        const levelIndex = quranLevels.findIndex((level) => level.id === input.levelId);
        tuhfaEligible = levelIndex >= 0 && levelIndex < 4;
        if (tuhfaEligible && typeof input.studyTuhfa !== "boolean") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "يجب تحديد اختيار منظومة تحفة الأطفال قبل إرسال الاختبار",
          });
        }
      }

      await db.update(students).set({
        placementTestVideoUrl: input.videoUrl,
        placementTestStatus: "pending",
        placementPathType: input.pathType,
        ...(tuhfaEligible ? { wantsTuhfa: input.studyTuhfa } : {}),
      }).where(eq(students.userId, ctx.user.id));
      const pathLabel = input.pathType === "tajweed_correction" ? "تصحيح التلاوة" : "حفظ ومراجعة القرآن";
      await notifyAdmins(
        "📹 اختبار قبول جديد بانتظار المراجعة",
        `الطالب ${ctx.user.fullName} أرسل فيديو اختبار القبول (المسار: ${pathLabel}${input.durationSeconds ? ` — المدة: ${input.durationSeconds} ثانية` : ""}). راجعه من لوحة الإدارة.`,
        "result",
      );
      // مزامنة التعيين التلقائي مع الاختيار النهائي:
      // true يضيف المقرر، وfalse يزيل فقط التعيين الذي أنشأه هذا المسار (ولا يلمس تعييناً يدوياً).
      if (tuhfaEligible && typeof input.studyTuhfa === "boolean") {
        const [tuhfaBook] = await db.select({ id: books.id }).from(books)
          .where(eq(books.title, TUHFA_BOOK_TITLE)).limit(1);
        if (tuhfaBook) {
          if (input.studyTuhfa) {
            await db.insert(bookAssignments)
              .values({ id: crypto.randomUUID(), studentId: ctx.user.id, bookId: tuhfaBook.id, source: "placement_choice" })
              .onConflictDoNothing();
          } else {
            await db.delete(bookAssignments)
              .where(and(
                eq(bookAssignments.studentId, ctx.user.id),
                eq(bookAssignments.bookId, tuhfaBook.id),
                eq(bookAssignments.source, "placement_choice"),
              ));
          }
        }
      }
      return { ok: true };
    }),

  /** أهلية مسار تصحيح التلاوة — متاح لجميع الأعمار */
  recitationEligibility: studentProcedure.query(async ({ ctx }) => {
    const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
    const birth = st?.birthDate ? new Date(st.birthDate) : null;
    const age = birth ? Math.floor((Date.now() - birth.getTime()) / 3.156e10) : null;
    return { age, birthDate: st?.birthDate ?? null, eligible: true };
  }),

  placementStatus: studentProcedure.query(async ({ ctx }) => {
    const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
    let resultLevelName: string | null = null;
    if (st?.placementTestResultLevelId) {
      const [lv] = await db.select().from(levels).where(eq(levels.id, st.placementTestResultLevelId)).limit(1);
      resultLevelName = lv?.name ?? null;
    }
    return {
      status: st?.placementTestStatus ?? "pending",
      hasVideo: !!st?.placementTestVideoUrl,
      resultLevelName,
      notes: st?.placementReviewNotes ?? null,
    };
  }),

  paths: studentProcedure.query(async ({ ctx }) => {
    const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
    const birth = st?.birthDate ? new Date(st.birthDate) : null;
    const age = birth ? Math.floor((Date.now() - birth.getTime()) / 3.156e10) : 0;
    const [cert] = await db.select().from(qiraatCertificates)
      .where(and(eq(qiraatCertificates.studentId, ctx.user.id), ne(qiraatCertificates.status, "rejected")))
      .orderBy(desc(qiraatCertificates.createdAt)).limit(1);
    return {
      age,
      quran: { visible: true },
      tajweedCorrection: { visible: true },
      qiraat: { certified: cert?.status === "approved", certificateStatus: cert?.status ?? null },
    };
  }),

  levels: studentProcedure
    .input(z.object({ path: z.enum(["quran", "tajweed_correction", "qiraat", "tajweed", "sharia"]) }))
    .query(async ({ ctx, input }) => {
      const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
      const lvls = await db.select().from(levels)
        .where(and(eq(levels.path, input.path), eq(levels.isActive, true), eq(levels.isHidden, false)))
        .orderBy(levels.orderIndex);
      const progress = await db.select().from(studentProgress).where(eq(studentProgress.studentId, ctx.user.id));
      const pmap = new Map(progress.map((p) => [p.levelId, p]));
      // أسماء متطلبات العقيدة المرتبطة بكل مستوى (لعرضها على بطاقات المستويات القرآنية)
      const aqRows = await db.select({ id: levels.id, name: levels.name }).from(levels)
        .where(and(eq(levels.path, "sharia"), eq(levels.nameEn, "aqeedah_quran")));
      const aqMap = new Map(aqRows.map((r) => [r.id, r.name]));
      return lvls.map((l) => ({
        ...l,
        isCurrent: st?.currentLevelId === l.id,
        progressStatus: pmap.get(l.id)?.status ?? "in_progress",
        aqeedahRequirement: l.aqeedahLevelId ? (aqMap.get(l.aqeedahLevelId) ?? null) : null,
        aqeedahStatus: l.aqeedahLevelId ? (pmap.get(l.aqeedahLevelId)?.status ?? null) : null,
      }));
    }),

  teachers: studentProcedure
    .input(z.object({ sessionType: z.string().optional() }).optional())
    .query(async () => {
      const rows = await db.select({
        teacherId: teachers.userId, name: users.fullName, avgRating: teachers.avgRating,
        experienceYears: teachers.experienceYears, specialization: teachers.specialization,
        scheduleId: weeklySchedules.id, sessionType: weeklySchedules.sessionType,
        sessionMode: weeklySchedules.sessionMode, maxStudents: weeklySchedules.maxStudents,
        availableDays: weeklySchedules.availableDays, availableTimes: weeklySchedules.availableTimes,
        durationMinutes: weeklySchedules.durationMinutes, levelId: weeklySchedules.levelId,
        isAcceptingBookings: weeklySchedules.isAcceptingBookings,
      }).from(teachers)
        .innerJoin(users, eq(teachers.userId, users.id))
        .leftJoin(weeklySchedules, and(eq(weeklySchedules.teacherId, teachers.userId), eq(weeklySchedules.isActive, true)))
        .where(and(eq(teachers.kycStatus, "approved"), eq(users.isActive, true)));
      // عدد المسجلين الفعليين في كل حلقة (جدول) — طلاب مميزون لهم حجوزات قادمة، لعرض المقاعد المتاحة
      const scheduleIds = rows.map((r) => r.scheduleId).filter((x): x is string => !!x);
      const enrolledRows = scheduleIds.length
        ? await db.select({ scheduleId: sessions.scheduleId, studentId: sessions.studentId }).from(sessions)
            .where(and(inArray(sessions.scheduleId, scheduleIds), inArray(sessions.status, ["scheduled", "confirmed", "in_progress"])))
        : [];
      const enrolledBySchedule = new Map<string, Set<string>>();
      for (const e of enrolledRows) if (e.scheduleId && e.studentId) {
        const set = enrolledBySchedule.get(e.scheduleId) ?? new Set<string>();
        set.add(e.studentId);
        enrolledBySchedule.set(e.scheduleId, set);
      }

      const grouped = new Map<string, { teacherId: string; name: string; avgRating: string; experienceYears: number; specialization: string | null; schedules: unknown[] }>();
      for (const r of rows) {
        if (!grouped.has(r.teacherId))
          grouped.set(r.teacherId, { teacherId: r.teacherId, name: r.name, avgRating: r.avgRating, experienceYears: r.experienceYears, specialization: r.specialization, schedules: [] });
        if (r.scheduleId)
          grouped.get(r.teacherId)!.schedules.push({ id: r.scheduleId, sessionType: r.sessionType, sessionMode: r.sessionMode, maxStudents: r.maxStudents, availableDays: r.availableDays, availableTimes: r.availableTimes, durationMinutes: r.durationMinutes, levelId: r.levelId, isAcceptingBookings: r.isAcceptingBookings, enrolledCount: enrolledBySchedule.get(r.scheduleId)?.size ?? 0 });
      }
      return [...grouped.values()];
    }),

  bookSession: studentProcedure
    .input(z.object({
      teacherId: z.string(), sessionType: z.enum(["quran_hifz", "quran_review", "qiraat", "tajweed_correction", "tajweed_level", "sharia_fiqh", "sharia_aqeedah", "sharia_seerah"]),
      scheduleId: z.string(), // إلزامي: الحجز يرتبط بجدول محدد — لا غموض بين جداول المعلم المتشابهة
      levelId: z.number().optional(), scheduledAt: z.string(), durationMinutes: z.number().default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      const scheduledDate = new Date(input.scheduledAt);
      const sessionLabel = SESSION_TYPE_LABELS[input.sessionType] ?? input.sessionType;

      // Fetch teacher name (read-only, outside transaction)
      const [teacherUser] = await db.select({ fullName: users.fullName })
        .from(users).where(eq(users.id, input.teacherId)).limit(1);

      // Atomically: lock schedule row → capacity check → insert session
      // FOR UPDATE on the weeklySchedules row serialises concurrent bookings
      // for the same slot, preventing two students from racing past the capacity check.
      const sessionMode = await db.transaction(async (tx) => {
        const [schedule] = await tx
          .select({
            sessionMode: weeklySchedules.sessionMode, maxStudents: weeklySchedules.maxStudents,
            availableDays: weeklySchedules.availableDays, availableTimes: weeklySchedules.availableTimes,
            levelId: weeklySchedules.levelId, isAcceptingBookings: weeklySchedules.isAcceptingBookings,
          })
          .from(weeklySchedules)
          .where(and(
            eq(weeklySchedules.id, input.scheduleId),
            eq(weeklySchedules.teacherId, input.teacherId),
            eq(weeklySchedules.sessionType, input.sessionType),
            eq(weeklySchedules.isActive, true),
          ))
          .for("update")   // row-level lock — held until transaction commits
          .limit(1);

        if (!schedule) throw new TRPCError({ code: "BAD_REQUEST", message: "هذه الحلقة غير متاحة — تحقق من الجدول وأعد المحاولة" });
        if (!schedule.isAcceptingBookings) throw new TRPCError({ code: "BAD_REQUEST", message: "التسجيل في هذه الحلقة مغلق حالياً" });

        // التحقق أن الموعد المطلوب ضمن أيام وأوقات الجدول فعلاً
        const JS_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayKey = JS_DAYS[scheduledDate.getDay()];
        const days = (schedule.availableDays as string[]) ?? [];
        if (!days.includes(dayKey)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "هذا اليوم غير متاح في جدول المعلم" });
        }
        const hhmm = `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`;
        const times = (schedule.availableTimes as string[]) ?? [];
        if (!times.some((t) => t.split("-")[0] === hhmm)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الوقت غير متاح في جدول المعلم" });
        }
        // حلقة مربوطة بمستوى تتطلب تمرير نفس المستوى — لا يجوز تجاوزها بحذف levelId من الطلب
        if (schedule.levelId && schedule.levelId !== input.levelId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "المستوى لا يطابق جدول هذه الحلقة" });
        }

        // منع الحجز المزدوج: نفس الطالب لنفس الجدول والموعد (القفل أعلاه يجعل الفحص ذرياً)
        const [dupe] = await tx.select({ id: sessions.id }).from(sessions)
          .where(and(
            eq(sessions.scheduleId, input.scheduleId),
            eq(sessions.studentId, ctx.user.id),
            eq(sessions.scheduledAt, scheduledDate),
            inArray(sessions.status, ["scheduled", "confirmed", "in_progress"]),
          )).limit(1);
        if (dupe) throw new TRPCError({ code: "CONFLICT", message: "لديك حجز قائم لهذا الموعد بالفعل" });

        const resolvedMode = (schedule?.sessionMode ?? "individual") as "individual" | "group";

        if (resolvedMode === "group") {
          // مقاعد الحلقة تُحسب لكل موعد (occurrence) على حدة — حجوزات الأسابيع الأخرى لا تستهلك مقاعد هذا الموعد
          const maxStudents = schedule?.maxStudents ?? 1;
          const existing = await tx.select({ id: sessions.id }).from(sessions)
            .where(and(
              eq(sessions.scheduleId, input.scheduleId),
              eq(sessions.scheduledAt, scheduledDate),
              inArray(sessions.status, ["scheduled", "confirmed", "in_progress"]),
            ));
          if (existing.length >= maxStudents) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "الحلقة ممتلئة، اختر موعداً آخر",
            });
          }
        }

        await tx.insert(sessions).values({
          id, teacherId: input.teacherId, studentId: ctx.user.id, scheduleId: input.scheduleId,
          sessionType: input.sessionType, levelId: input.levelId,
          type: resolvedMode,
          scheduledAt: scheduledDate, durationMinutes: input.durationMinutes,
          status: "confirmed", meetingUrl: `/session/${id}`,
        });

        return resolvedMode;
      });

      const sessionKind = sessionMode === "group" ? "جماعية" : "فردية";

      const dateStr = scheduledDate.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeStr = scheduledDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

      /** payload مشترك لإشعارات هذه الحلقة */
      const sessionPayload = {
        teacherName: teacherUser?.fullName ?? null,
        subject: sessionLabel,
        date: dateStr,
        time: timeStr,
        durationMinutes: input.durationMinutes,
        sessionKind,
      };

      // إشعار للمعلم بالحجز الجديد
      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: input.teacherId, title: "حجز جديد 📅",
        body: `حجز ${ctx.user.fullName} موعد ${sessionLabel} — ${dateStr}`,
        type: "session",
        payload: { subject: sessionLabel, date: dateStr, time: timeStr, durationMinutes: input.durationMinutes, sessionKind },
      });

      // إشعار تأكيد للطالب مع تفاصيل الموعد
      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: ctx.user.id, title: "تأكيد الحجز ✅",
        body: `تم تأكيد حجز موعد ${sessionLabel} — ${dateStr}`,
        type: "session_reminder",
        payload: sessionPayload,
        primaryActionUrl: `/student/session/${id}`,
        primaryActionLabel: "عرض الجلسة",
      });

      return { ok: true, sessionId: id };
    }),

  mySessions: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select({
      id: sessions.id, scheduledAt: sessions.scheduledAt, durationMinutes: sessions.durationMinutes,
      status: sessions.status, topic: sessions.topic, sessionType: sessions.sessionType, meetingUrl: sessions.meetingUrl,
      teacherName: users.fullName,
    }).from(sessions).innerJoin(users, eq(sessions.teacherId, users.id))
      .where(eq(sessions.studentId, ctx.user.id)).orderBy(desc(sessions.scheduledAt)).limit(50);
    return rows.map((s) => ({ ...s, typeLabel: SESSION_TYPE_LABELS[s.sessionType] }));
  }),

  sessionRoom: studentProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [s] = await db.select({
        id: sessions.id, scheduledAt: sessions.scheduledAt, status: sessions.status,
        sessionType: sessions.sessionType, topic: sessions.topic, durationMinutes: sessions.durationMinutes,
        teacherId: sessions.teacherId, studentId: sessions.studentId, teacherName: users.fullName,
      }).from(sessions).innerJoin(users, eq(sessions.teacherId, users.id))
        .where(eq(sessions.id, input.id)).limit(1);
      if (!s || s.studentId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      return {
        ...s,
        typeLabel: SESSION_TYPE_LABELS[s.sessionType],
        recordingEnabled: process.env.LIVE_SESSION_RECORDING_ENABLED === "true",
      };
    }),

  myRecordings: studentProcedure.query(async ({ ctx }) => {
    const recs = await db.select({
      id: recordings.id, sessionId: recordings.sessionId, videoUrl: recordings.videoUrl,
      durationSeconds: recordings.durationSeconds, quality: recordings.quality, createdAt: recordings.createdAt,
      teacherName: users.fullName, topic: sessions.topic, sessionType: sessions.sessionType,
    }).from(recordings)
      .innerJoin(sessions, eq(recordings.sessionId, sessions.id))
      .innerJoin(users, eq(sessions.teacherId, users.id))
      .where(and(
        eq(recordings.studentId, ctx.user.id),
        eq(recordings.status, "ready"),
        eq(recordings.isDeleted, false),
      ))
      .orderBy(desc(recordings.createdAt)).limit(50);
    const evals = await db.select().from(evaluations).where(eq(evaluations.studentId, ctx.user.id));
    const emap = new Map(evals.map((e) => [e.sessionId, e]));
    return recs.map((r) => ({ ...r, typeLabel: SESSION_TYPE_LABELS[r.sessionType as string], evaluation: emap.get(r.sessionId) ?? null }));
  }),

  progress: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select({
      levelId: studentProgress.levelId, status: studentProgress.status,
      completedJuz: studentProgress.completedJuz, completedSessions: studentProgress.completedSessions,
      averageScore: studentProgress.averageScore, name: levels.name, path: levels.path, orderIndex: levels.orderIndex,
    }).from(studentProgress).innerJoin(levels, eq(studentProgress.levelId, levels.id))
      .where(eq(studentProgress.studentId, ctx.user.id)).orderBy(levels.orderIndex);
    return rows;
  }),

  submitPromotion: studentProcedure
    .input(z.object({ toLevelId: z.number(), videoUrl: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [st] = await db.select().from(students).where(eq(students.userId, ctx.user.id)).limit(1);
      if (!st?.currentLevelId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن طلب الترقية قبل تعيين مستواك عبر اختبار تحديد المستوى" });
      // الترقية للمستوى التالي مباشرة فقط وضمن المسار نفسه — تمنع قفز المستويات ومتطلباتها الإلزامية
      const [cur] = await db.select().from(levels).where(eq(levels.id, st.currentLevelId)).limit(1);
      const [target] = await db.select().from(levels).where(eq(levels.id, input.toLevelId)).limit(1);
      if (!cur || !target || !target.isActive || target.isHidden || target.path !== cur.path || target.orderIndex !== cur.orderIndex + 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الترقية متاحة للمستوى التالي مباشرة فقط وضمن مسارك الحالي" });
      }
      const [pending] = await db.select({ id: promotionRequests.id }).from(promotionRequests)
        .where(and(eq(promotionRequests.studentId, ctx.user.id), eq(promotionRequests.status, "pending"))).limit(1);
      if (pending) throw new TRPCError({ code: "CONFLICT", message: "لديك طلب ترقية قيد المراجعة بالفعل" });
      await db.insert(promotionRequests).values({
        id: crypto.randomUUID(), studentId: ctx.user.id,
        fromLevelId: st.currentLevelId, toLevelId: input.toLevelId, videoUrl: input.videoUrl,
      });
      return { ok: true };
    }),

  myNotifications: studentProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(50);
    return { items: rows, unread: rows.filter((n) => !n.isRead).length };
  }),

  markRead: studentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(notifications).set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { ok: true };
    }),

  markAllRead: studentProcedure.mutation(async ({ ctx }) => {
    await db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, ctx.user.id));
    return { ok: true };
  }),

  settings: studentProcedure.query(async ({ ctx }) => {
    const [s] = await db.select().from(studentSettings).where(eq(studentSettings.studentId, ctx.user.id)).limit(1);
    return s ?? null;
  }),

  updateSettings: studentProcedure
    .input(z.object({
      darkMode: z.boolean().optional(), sessionReminderMinutes: z.number().optional(),
      ayahNotification: z.boolean().optional(), hadithNotification: z.boolean().optional(),
      ibnQayyimNotification: z.boolean().optional(), activityNotification: z.boolean().optional(),
      videoQuality: z.string().optional(), audioQuality: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(studentSettings).where(eq(studentSettings.studentId, ctx.user.id)).limit(1);
      if (existing) await db.update(studentSettings).set(input).where(eq(studentSettings.studentId, ctx.user.id));
      else await db.insert(studentSettings).values({ id: crypto.randomUUID(), studentId: ctx.user.id, ...input });
      return { ok: true };
    }),

  requestScheduleChange: studentProcedure
    .input(z.object({ sessionId: z.string(), requestedNewTime: z.string(), reason: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      const [s] = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
      if (!s || s.studentId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(scheduleChangeRequests).values({
        id: crypto.randomUUID(), sessionId: input.sessionId, studentId: ctx.user.id,
        teacherId: s.teacherId, requestedNewTime: new Date(input.requestedNewTime), reason: input.reason,
      });
      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: s.teacherId, title: "طلب تغيير موعد 🔄",
        body: `${ctx.user.fullName} طلب تغيير موعد جلسة`, type: "session",
      });
      return { ok: true };
    }),

  myIjazat: studentProcedure.query(async ({ ctx }) => {
    return db.select({
      id: qiraatCertificates.id, certificateUrl: qiraatCertificates.certificateUrl,
      status: qiraatCertificates.status, reviewNotes: qiraatCertificates.reviewNotes,
      createdAt: qiraatCertificates.createdAt,
    }).from(qiraatCertificates)
      .where(eq(qiraatCertificates.studentId, ctx.user.id))
      .orderBy(desc(qiraatCertificates.createdAt));
  }),

  submitQiraatCertificate: studentProcedure
    .input(z.object({ certificateUrl: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const [pending] = await db.select({ id: qiraatCertificates.id }).from(qiraatCertificates)
        .where(and(eq(qiraatCertificates.studentId, ctx.user.id), eq(qiraatCertificates.status, "pending"))).limit(1);
      if (pending) throw new TRPCError({ code: "BAD_REQUEST", message: "لديك شهادة قيد المراجعة" });
      await db.insert(qiraatCertificates).values({
        id: crypto.randomUUID(), studentId: ctx.user.id, certificateUrl: input.certificateUrl,
      });
      return { ok: true };
    }),
});
