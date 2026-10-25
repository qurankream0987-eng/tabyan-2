import { z } from "zod";
import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "../middleware";
import { db, notifications, notificationSettings } from "@workspace/db";

/** أنواع الإشعارات المدعومة + أولوياتها الافتراضية */
export const NOTIFICATION_TYPES = [
  "session_reminder", "session_change", "evaluation", "achievement",
  "announcement", "ayah", "payment", "placement", "promotion",
  "general", "session", "activity",
] as const;

const listInput = z.object({
  types: z.array(z.string()).optional(),
  period: z.enum(["all", "today", "week", "month"]).default("all"),
  readStatus: z.enum(["all", "read", "unread"]).default("all"),
  limit: z.number().min(1).max(100).default(60),
});

const settingsInput = z.object({
  sessionReminders: z.boolean().optional(),
  sessionChanges: z.boolean().optional(),
  evaluations: z.boolean().optional(),
  achievements: z.boolean().optional(),
  announcements: z.boolean().optional(),
  ayahOfDay: z.boolean().optional(),
  payments: z.boolean().optional(),
  reminderBeforeMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(1440)]).optional(),
  ayahDeliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  dndDuringPrayer: z.boolean().optional(),
  dndDuringSession: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
});

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const notificationsRouter = createRouter({
  /** القائمة مقسمة: مثبتة / اليوم / سابقة + عدد غير المقروء */
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const now = new Date();
    const conditions = [
      eq(notifications.userId, ctx.user.id),
      or(isNull(notifications.expiresAt), gte(notifications.expiresAt, now)),
    ];
    if (input.types?.length) conditions.push(inArray(notifications.type, input.types));
    if (input.readStatus === "read") conditions.push(eq(notifications.isRead, true));
    if (input.readStatus === "unread") conditions.push(eq(notifications.isRead, false));
    if (input.period !== "all") {
      const days = input.period === "today" ? 0 : input.period === "week" ? 7 : 30;
      const from = startOfToday();
      from.setDate(from.getDate() - days);
      conditions.push(gte(notifications.createdAt, from));
    }

    const rows = await db.select().from(notifications)
      .where(and(...(conditions as Parameters<typeof and>)))
      .orderBy(desc(notifications.isPinned), desc(notifications.createdAt))
      .limit(input.limit);

    const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, ctx.user.id),
        eq(notifications.isRead, false),
        or(isNull(notifications.expiresAt), gte(notifications.expiresAt, now)),
      ));

    const today = startOfToday();
    const pinned = rows.filter((n) => n.isPinned);
    const todayList = rows.filter((n) => !n.isPinned && n.createdAt && n.createdAt >= today);
    const earlier = rows.filter((n) => !n.isPinned && (!n.createdAt || n.createdAt < today));
    return { pinned, today: todayList, earlier, unreadCount: unread ?? 0 };
  }),

  /** إشعار واحد (شاشة التفاصيل) — يعلَّم مقروءًا تلقائيًا */
  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [n] = await db.select().from(notifications)
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)))
      .limit(1);
    if (!n) throw new TRPCError({ code: "NOT_FOUND", message: "الإشعار غير موجود" });
    if (!n.isRead) {
      // تحديث القراءة مقيَّد بمعرّف الإشعار + معرّف المستخدم الموثق (دفاع متعدد الطبقات)
      await db.update(notifications).set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, n.id), eq(notifications.userId, ctx.user.id)));
    }
    return { ...n, isRead: true };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, ctx.user.id),
        eq(notifications.isRead, false),
        or(isNull(notifications.expiresAt), gte(notifications.expiresAt, new Date())),
      ));
    return { count: unread ?? 0 };
  }),

  markRead: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
    return { ok: true };
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
    return { ok: true };
  }),

  togglePin: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const [n] = await db.select({ isPinned: notifications.isPinned }).from(notifications)
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)))
      .limit(1);
    if (!n) throw new TRPCError({ code: "NOT_FOUND" });
    await db.update(notifications).set({ isPinned: !n.isPinned })
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
    return { ok: true, isPinned: !n.isPinned };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await db.delete(notifications)
      .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
    return { ok: true };
  }),

  clearRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, true), eq(notifications.isPinned, false)));
    return { ok: true };
  }),

  /** إعدادات الإشعارات — تُنشأ افتراضيًا عند أول طلب */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const [s] = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.user.id)).limit(1);
    if (s) return s;
    const id = crypto.randomUUID();
    await db.insert(notificationSettings).values({ id, userId: ctx.user.id }).onConflictDoNothing();
    const [created] = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.user.id)).limit(1);
    return created!;
  }),

  updateSettings: protectedProcedure.input(settingsInput).mutation(async ({ ctx, input }) => {
    const [existing] = await db.select({ id: notificationSettings.id }).from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.user.id)).limit(1);
    if (!existing) {
      await db.insert(notificationSettings).values({
        id: crypto.randomUUID(), userId: ctx.user.id, ...input,
      });
    } else {
      await db.update(notificationSettings).set(input)
        .where(eq(notificationSettings.userId, ctx.user.id));
    }
    const [s] = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.user.id)).limit(1);
    return s!;
  }),
});
