import { createTRPCClient, httpLink } from "@trpc/client";
import { getQueryKey } from "@trpc/react-query";
import type { AppRouter } from "@workspace/tabyan-trpc";
import superjson from "superjson";
import { authStore, type Role } from "./auth";
import { queryClient, trpc } from "@/providers/trpc";
import { sessionFetch } from "./session-fetch";
import { authRevision, beginWebLogin, endWebLogin } from "./web-auth-runtime";

type LoginResult = { token: string; role: string; name?: string };

/** One logical operation, verified identity/cache committed before navigation. */
export async function loginWebSession(operation: () => Promise<LoginResult>, expectedRole?: Exclude<Role, null>) {
  const revision = beginWebLogin();
  if (revision === null) return null;
  try {
    const result = await operation();
    const client = createTRPCClient<AppRouter>({
      links: [httpLink({
        url: import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/trpc",
        transformer: superjson,
        headers: { Authorization: `Bearer ${result.token}` },
        fetch: sessionFetch,
      })],
    });
    // This request uses the new token explicitly, not an old localStorage value.
    const user = await client.auth.me.query();
    if (!user.id || user.role !== result.role || (expectedRole && user.role !== expectedRole)) {
      throw new Error(expectedRole === "admin" ? "هذا الحساب ليس حساب مشرف"
        : expectedRole === "teacher" ? "هذا الحساب ليس حساب معلم — ادخل من بوابة الإشراف"
        : "تعذّر تأكيد الجلسة — حاول مرة أخرى");
    }
    if (revision !== authRevision()) throw new Error("أُلغيت محاولة الدخول — حاول مرة أخرى");
    authStore.set(result.token, user.role, user.fullName, () => {
      queryClient.setQueryData(getQueryKey(trpc.auth.me, undefined, "query"), user);
    });
    return { token: result.token, role: user.role, name: user.fullName };
  } finally {
    endWebLogin();
  }
}
