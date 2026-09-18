import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/tabyan-trpc";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: BASE + "/api/trpc",
      transformer: superjson,
      headers() {
        const token = localStorage.getItem("tabyan_token");
        return token ? { Authorization: "Bearer " + token } : {};
      },
    }),
  ],
});

const errMsg = (e: unknown) =>
  (e as { message?: string })?.message ?? "حدث خطأ غير متوقع — حاول مجدداً";

export const api = {
  async completeProfile(data: {
    phone: string; fullName: string; birthDate: string; password: string; confirmPassword: string;
    schoolStage?: "primary" | "middle" | "high"; schoolGrade?: string;
    parentPhone?: string; gpsLat?: string; gpsLng?: string; role?: "student" | "teacher";
  }) {
    try { return await trpcClient.auth.completeProfile.mutate(data); }
    catch (e) { return { ok: false as const, message: errMsg(e) }; }
  },
  async adminLogin(masterPassword: string) {
    try { return await trpcClient.auth.adminLogin.mutate({ masterPassword }); }
    catch (e) { return { ok: false as const, message: errMsg(e) }; }
  },
  /** دخول حسابات الإشراف (مشرف/معلم) باسم مستخدم + كلمة سر */
  async passwordLogin(username: string, password: string) {
    try { return await trpcClient.auth.passwordLogin.mutate({ username, password }); }
    catch (e) { return { ok: false as const, message: errMsg(e) }; }
  },
  async logout() {
    try { await trpcClient.auth.logout.mutate(); } catch { /* ignore */ }
  },
};
