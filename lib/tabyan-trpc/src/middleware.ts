import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { eq } from "drizzle-orm";
import { db, teachers } from "@workspace/db";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireRole = (roles: Array<"student" | "teacher" | "admin">) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول" });
    if (!roles.includes(ctx.user.role))
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بالوصول" });
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const protectedProcedure = t.procedure.use(requireRole(["student", "teacher", "admin"]));
export const studentProcedure = t.procedure.use(requireRole(["student"]));
export const teacherProcedure = t.procedure.use(requireRole(["teacher"]));
export const adminProcedure = t.procedure.use(requireRole(["admin"]));

/** معلم معتمد فقط — يرفض غير المُجاز (kycStatus ≠ approved) حتى يعتمد المشرف حسابه.
 *  نقاط التأهيل (kycStatus/submitKyc/settings/…) تبقى على teacherProcedure العادي. */
export const approvedTeacherProcedure = t.procedure.use(requireRole(["teacher"])).use(
  async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول" });
    const [row] = await db
      .select({ kycStatus: teachers.kycStatus })
      .from(teachers)
      .where(eq(teachers.userId, ctx.user.id))
      .limit(1);
    if (row?.kycStatus !== "approved")
      throw new TRPCError({ code: "FORBIDDEN", message: "حسابك بانتظار قبول المشرف — أكمل اختبار قبول المعلم أولاً" });
    return next({ ctx: { ...ctx, user: ctx.user } });
  },
);
