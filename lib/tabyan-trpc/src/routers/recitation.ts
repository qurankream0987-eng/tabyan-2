/**
 * Tabyan AI — جلسات التسميع (Phase 1A — بدون AI / STT)
 * accuracyScore = NULL دائماً في هذه المرحلة — لا mock ولا نتيجة وهمية
 */
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedProcedure, studentProcedure, teacherProcedure } from "../middleware";
import { db } from "@workspace/db";
import { recitationSessions, sessions, students, levels } from "@workspace/db";
import {
  RECITATION_POLICY_VERSION,
  getRecitationPolicy,
  startRecitationInputSchema,
} from "../recitation-contract";

// ── Feature Flag ─────────────────────────────────────────────────────────────
// TABYAN_AI_ENABLED=true يفعّل واجهة التسميع فقط بعد اعتماد الإعدادات.
// الافتراضي: مغلق (undefined لا يعني enabled) — fail closed.
function aiEnabled(): boolean {
  return process.env.TABYAN_AI_ENABLED === "true";
}

function transcriptionEnabled(): boolean {
  return aiEnabled() && process.env.TABYAN_AI_TRANSCRIPTION_ENABLED === "true";
}

function liveTrackingEnabled(): boolean {
  return transcriptionEnabled() && process.env.TABYAN_AI_LIVE_TRACKING_ENABLED === "true";
}

/**
 * لا يوجد في الـschema الحالي واجب تسميع يحمل نطاقاً معتمداً من الخادم.
 * `todayAssignment` يوفّر مستوى الطالب فقط، لا assignment range؛ لذلك
 * نغلق EDUCATIONAL fail-closed بدلاً من قبول نطاق اختاره العميل كواجب.
 */
function educationalAssignmentSourceReady(): boolean {
  return false;
}

// ── Cache سور alquran.cloud ───────────────────────────────────────────────────
// ذاكرة تخزين مؤقت في مستوى العملية؛ كل سورة تُجلب مرة واحدة طوال عمر الخادم
type CachedAyah = { numberInSurah: number; text: string; words: string[] };
const surahCache = new Map<number, CachedAyah[]>();

const QURAN_API = "https://api.alquran.cloud/v1";

async function fetchSurahAyahs(surahId: number): Promise<CachedAyah[]> {
  if (surahCache.has(surahId)) return surahCache.get(surahId)!;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${QURAN_API}/surah/${surahId}/quran-uthmani`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`quran api ${res.status}`);
    const json = (await res.json()) as {
      code: number;
      data: { ayahs: { numberInSurah: number; text: string }[] };
    };
    if (json.code !== 200 || !Array.isArray(json.data?.ayahs)) throw new Error("bad payload");
    const ayahs: CachedAyah[] = json.data.ayahs.map((a) => ({
      numberInSurah: a.numberInSurah,
      text: a.text,
      words: a.text.split(/\s+/).filter(Boolean),
    }));
    surahCache.set(surahId, ayahs);
    return ayahs;
  } finally {
    clearTimeout(timer);
  }
}

// ── IDOR Guard: المعلم يجب أن يملك حلقة واحدة مع الطالب ─────────────────────
async function assertTeacherStudentLink(teacherId: string, studentId: string) {
  const [link] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.teacherId, teacherId), eq(sessions.studentId, studentId)))
    .limit(1);
  if (!link) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الطالب غير مرتبط بحلقاتك" });
}

// ── Router ────────────────────────────────────────────────────────────────────
export const recitationRouter = createRouter({
  /** حالة Feature Flag — لا تُفعَّل الميزة إذا كانت TABYAN_AI_ENABLED=false */
  status: publicQuery.query(() => ({
    enabled: aiEnabled(),
    transcriptionEnabled: transcriptionEnabled(),
    liveTrackingEnabled: liveTrackingEnabled(),
    educationalAssignmentSource: educationalAssignmentSourceReady() ? "ready" : "missing",
  })),

  /**
   * جلب نصوص الآيات (الرسم العثماني) لنطاق سورة/آيات
   * مع تقسيم كل آية إلى كلمات لوضع الكشف التدريجي
   */
  getAyahs: protectedProcedure
    .input(
      z.object({
        surahId: z.number().int().min(1).max(114),
        startAyah: z.number().int().min(1),
        endAyah: z.number().int().min(1),
      }),
    )
    .query(async ({ input }) => {
      if (!aiEnabled()) throw new TRPCError({ code: "FORBIDDEN", message: "التسميع غير مفعّل" });
      if (input.endAyah < input.startAyah) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "رقم الآية الأخيرة يجب أن يكون أكبر من أو يساوي الأولى" });
      }
      let ayahs: CachedAyah[];
      try {
        ayahs = await fetchSurahAyahs(input.surahId);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر جلب نصوص الآيات — تحقق من الاتصال بالإنترنت" });
      }
      return ayahs.filter(
        (a) => a.numberInSurah >= input.startAyah && a.numberInSurah <= input.endAyah,
      );
    }),

  /**
   * مقرر التسميع التعليمي اليوم — مستوى الطالب الحالي
   * يُستخدم كسياق في إعداد التسميع التعليمي لا كإلزام
   */
  todayAssignment: studentProcedure.query(async ({ ctx }) => {
    if (!aiEnabled()) return null;
    const [st] = await db
      .select({ currentLevelId: students.currentLevelId })
      .from(students)
      .where(eq(students.userId, ctx.user.id))
      .limit(1);
    if (!st?.currentLevelId) return null;
    const [lv] = await db
      .select({ id: levels.id, name: levels.name, path: levels.path })
      .from(levels)
      .where(eq(levels.id, st.currentLevelId))
      .limit(1);
    if (!lv || lv.path !== "quran") return null;
    return { levelId: lv.id, levelName: lv.name };
  }),

  /**
   * إنشاء جلسة تسميع جديدة. mode هو مصدر الحقيقة:
   * - GENERAL: سياق بداية اختياري، بلا expected range أو نهاية متوقعة.
   * - EDUCATIONAL: expectedRange صريح ومتحقق منه قبل أي كتابة.
   */
  start: protectedProcedure
    .input(startRecitationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!aiEnabled()) throw new TRPCError({ code: "FORBIDDEN", message: "التسميع غير مفعّل" });
      if (input.mode === "educational" && ctx.user.role !== "student") {
        throw new TRPCError({ code: "FORBIDDEN", message: "التسميع التعليمي متاح للطلاب فقط" });
      }
      if (input.mode === "educational" && !educationalAssignmentSourceReady()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "لا يوجد واجب تعليمي معتمد بنطاق محدد بعد",
        });
      }

      const policy = getRecitationPolicy(input.mode);
      const startContext = input.mode === "general" ? input.startContext : undefined;
      const expectedRange = input.mode === "educational" ? input.expectedRange : null;
      // حقول legacy تبقى للعرض والتوافق فقط، ولا تحدد mode أو policy.
      const legacyRange = expectedRange && expectedRange.start.surahId === expectedRange.end.surahId
        ? {
            surahId: expectedRange.start.surahId,
            startAyah: expectedRange.start.ayah,
            endAyah: expectedRange.end.ayah,
          }
        : {};

      const id = crypto.randomUUID();
      const studentId = ctx.user.role === "student" ? ctx.user.id : null;
      await db.insert(recitationSessions).values({
        id,
        userId: ctx.user.id,
        studentId,
        mode: input.mode,
        ...legacyRange,
        startPage: startContext?.startPage ?? null,
        startVerseKey: startContext?.startVerseKey ?? null,
        startWordPosition: startContext?.startWordPosition ?? null,
        expectedRange,
        policyVersion: RECITATION_POLICY_VERSION,
        hideMode: input.hideMode,
        status: "listening",
        startedAt: new Date(),
        pausedSeconds: 0,
      });
      return {
        sessionId: id,
        policy: {
          mode: policy.mode,
          expectedEndPosition: policy.expectedEndPosition,
          allowsEducationalProgress: policy.allowsEducationalProgress,
        },
      };
    }),

  /** إيقاف جلسة مؤقت — يسجّل lastPausedAt لحساب مدة الإيقاف عند الاستئناف */
  pause: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await db
        .select()
        .from(recitationSessions)
        .where(and(eq(recitationSessions.id, input.sessionId), eq(recitationSessions.userId, ctx.user.id)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      if (session.status !== "listening")
        throw new TRPCError({ code: "BAD_REQUEST", message: "الجلسة ليست في وضع الاستماع" });
      await db
        .update(recitationSessions)
        .set({ status: "paused", lastPausedAt: new Date() })
        .where(eq(recitationSessions.id, input.sessionId));
      return { ok: true };
    }),

  /** استئناف جلسة موقوفة — يضيف مدة الإيقاف المنقضية إلى pausedSeconds */
  resume: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await db
        .select()
        .from(recitationSessions)
        .where(and(eq(recitationSessions.id, input.sessionId), eq(recitationSessions.userId, ctx.user.id)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      if (session.status !== "paused")
        throw new TRPCError({ code: "BAD_REQUEST", message: "الجلسة ليست موقوفة" });
      const addedPause = session.lastPausedAt
        ? Math.floor((Date.now() - session.lastPausedAt.getTime()) / 1000)
        : 0;
      await db
        .update(recitationSessions)
        .set({
          status: "listening",
          lastPausedAt: null,
          pausedSeconds: (session.pausedSeconds ?? 0) + addedPause,
        })
        .where(eq(recitationSessions.id, input.sessionId));
      return { ok: true };
    }),

  /**
   * إنهاء جلسة التسميع وحساب صافي وقت التسميع النشط
   * durationSeconds = إجمالي المدة − مجموع فترات الإيقاف
   * accuracyScore = NULL (Phase 1A — لا AI)
   */
  end: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await db
        .select()
        .from(recitationSessions)
        .where(and(eq(recitationSessions.id, input.sessionId), eq(recitationSessions.userId, ctx.user.id)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      if (!["listening", "paused"].includes(session.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الجلسة منتهية بالفعل" });
      }
      const now = new Date();
      const totalSecs = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      const extraPause =
        session.status === "paused" && session.lastPausedAt
          ? Math.floor((now.getTime() - session.lastPausedAt.getTime()) / 1000)
          : 0;
      const totalPaused = (session.pausedSeconds ?? 0) + extraPause;
      const durationSeconds = Math.max(0, totalSecs - totalPaused);
      await db
        .update(recitationSessions)
        .set({ status: "completed", endedAt: now, durationSeconds, pausedSeconds: totalPaused })
        .where(eq(recitationSessions.id, input.sessionId));
      // لا يوجد auto completion أو progress write هنا؛ GENERAL ينتهي فقط بطلب المستخدم.
      return { ok: true, durationSeconds, completionState: "user_ended" as const };
    }),

  /** سجل جلسات المستخدم الحالي (آخر 20 افتراضياً) */
  myHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(recitationSessions)
        .where(eq(recitationSessions.userId, ctx.user.id))
        .orderBy(desc(recitationSessions.createdAt))
        .limit(input?.limit ?? 20);
    }),

  /**
   * إلغاء جلسة تسميع دون احتسابها مكتملة — تُخزَّن بحالة "cancelled"
   */
  cancel: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await db
        .select({ id: recitationSessions.id, status: recitationSessions.status })
        .from(recitationSessions)
        .where(and(eq(recitationSessions.id, input.sessionId), eq(recitationSessions.userId, ctx.user.id)))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "الجلسة غير موجودة" });
      if (!["listening", "paused"].includes(session.status)) return { ok: true };
      await db
        .update(recitationSessions)
        .set({ status: "cancelled", endedAt: new Date() })
        .where(eq(recitationSessions.id, input.sessionId));
      return { ok: true };
    }),

  /**
   * المعلم يطّلع على جلسات التسميع التعليمي لطالب مرتبط به
   * يشترط وجود حلقة واحدة على الأقل تجمع المعلم بالطالب (IDOR guard)
   */
  studentSessions: teacherProcedure
    .input(
      z.object({
        studentId: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertTeacherStudentLink(ctx.user.id, input.studentId);
      return db
        .select()
        .from(recitationSessions)
        .where(
          and(
            eq(recitationSessions.studentId, input.studentId),
            eq(recitationSessions.mode, "educational"),
          ),
        )
        .orderBy(desc(recitationSessions.createdAt))
        .limit(input.limit);
    }),
});
