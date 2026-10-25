import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/tabyan-trpc";
import { sessionFetch } from "./session-fetch";
import { userFacingErrorMessage } from "./user-facing-error";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: BASE + "/api/trpc",
      transformer: superjson,
      fetch: sessionFetch,
      headers() {
        const token = localStorage.getItem("tabyan_token");
        return token ? { Authorization: "Bearer " + token } : {};
      },
    }),
  ],
});

const errMsg = (e: unknown) => userFacingErrorMessage(e, "تعذّر الاتصال بالخادم — حاول مجدداً");

export const api = {
  /** دخول حسابات الإشراف (مشرف/معلم) باسم مستخدم + كلمة سر */
  async passwordLogin(username: string, password: string) {
    try { return await trpcClient.auth.passwordLogin.mutate({ username, password }); }
    catch (e) { return { ok: false as const, message: errMsg(e) }; }
  },
  async logout() {
    try { await trpcClient.auth.logout.mutate(); } catch { /* ignore */ }
  },
};
