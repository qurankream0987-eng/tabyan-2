import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db } from "@workspace/db";
import { adminSessions, authTokens, users } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

export type SessionUser = {
  id: string;
  fullName: string;
  phone: string;
  role: "student" | "teacher" | "admin";
};

// Keep req/res loosely typed so emitted declarations don't depend on express types (TS2742)
export type TrpcContext = {
  req: { headers: Record<string, string | string[] | undefined> };
  res: unknown;
  user: SessionUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<TrpcContext> {
  const base = { req: opts.req, res: opts.res, user: null as SessionUser | null };
  const header = (opts.req.headers["authorization"] as string) ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return base;

  // ── Dev bypass: token shape  dev-<role>-<base64name>-<ts> ──────────────
  // SECURITY: هذا المسار متاح فقط في بيئة التطوير، ويُرفض تلقائياً في الإنتاج
  if (token.startsWith("dev-")) {
    if (process.env.NODE_ENV !== "development") {
      // في الإنتاج: رفض أي token بصيغة dev-* بصمت (no user)
      return base;
    }
    const parts = token.split("-");          // ["dev", role, b64name, ts]
    const role  = (parts[1] ?? "student") as SessionUser["role"];
    let   name  = "زائر";
    try { name = decodeURIComponent(atob(parts[2] ?? "")); } catch { /* ignore */ }
    base.user = { id: "dev-user", fullName: name, phone: "0500000000", role };
    return base;
  }

  try {
    const rows = await db
      .select({ tokenRole: authTokens.role, userId: users.id, fullName: users.fullName, phone: users.phone, userRole: users.role })
      .from(authTokens)
      .innerJoin(users, eq(authTokens.userId, users.id))
      .where(and(eq(authTokens.token, token), gt(authTokens.expiresAt, new Date())))
      .limit(1);
    if (rows.length === 0) return base;
    const r = rows[0];
    // جلسات المشرفين قابلة للإبطال: force_logout وتغيير كلمة السر الرئيسية يعطّلان سجلات adminSessions،
    // فلولم نتحقق هنا لاستمر الرمز المُبطَل صالحاً حتى انتهائه. كل رموز المشرفين الحقيقية تُسجَّل في adminSessions عند إصدارها.
    if (r.tokenRole === "admin") {
      const sess = await db.select({ id: adminSessions.id }).from(adminSessions)
        .where(and(eq(adminSessions.jwtToken, token), eq(adminSessions.isActive, true))).limit(1);
      if (sess.length === 0) return base;
    }
    // phone أصبح nullable منذ حسابات الإشراف (دخول باسم مستخدم) — نُبدّل الغياب بسلسلة فارغة حفاظاً على نوع SessionUser
    base.user = { id: r.userId, fullName: r.fullName, phone: r.phone ?? "", role: r.tokenRole as SessionUser["role"] };
    return base;
  } catch {
    return base;
  }
}
