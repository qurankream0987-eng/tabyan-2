import { useSyncExternalStore, type ReactNode } from "react";
import { Navigate } from "react-router";
import { authStore, type Role } from "@/lib/auth";
import { trpc } from "@/providers/trpc";

export default function AuthGate({ children, role }: { children: ReactNode; role?: Exclude<Role, null> }) {
  const token = useSyncExternalStore(authStore.subscribe, () => authStore.token, () => null);
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!token && !authStore.isDemo, retry: false });
  if (!token) {
    return <Navigate to="/" replace />;
  }
  if (!authStore.isDemo && me.isPending) return <div role="status" className="p-8 text-center">جارٍ التحقق من الجلسة…</div>;
  if (!authStore.isDemo && me.isError) return <div role="alert" className="p-8 text-center">
    تعذّر تأكيد الجلسة — تحقق من الاتصال وحاول مرة أخرى.
    <button type="button" onClick={() => void me.refetch()} className="block mx-auto mt-3 underline">إعادة المحاولة</button>
  </div>;
  const resolvedRole = authStore.isDemo ? authStore.role : me.data?.role;
  if (role && resolvedRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}