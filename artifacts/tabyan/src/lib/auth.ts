// Auth token storage (custom token auth — no OAuth)
import { clearUserScopedQueryCache } from "@/providers/trpc";
import { advanceAuthRevision } from "./web-auth-runtime";

const TOKEN_KEY = "tabyan_token";
const ROLE_KEY = "tabyan_role";
const NAME_KEY = "tabyan_name";
// علامات دائمة على الجهاز — لا تُمسح عند تسجيل الخروج:
// SPLASH_KEY: الزائر رأى شاشة الترحيب. KNOWN_ACCOUNT_KEY: سبق تسجيل دخول حساب حقيقي على هذا الجهاز.
const SPLASH_KEY = "tabyan.splashSeen";
const KNOWN_ACCOUNT_KEY = "tabyan.knownAccount";
const listeners = new Set<() => void>();

function notifyAuthListeners() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== TOKEN_KEY) return;
    advanceAuthRevision();
    clearUserScopedQueryCache();
    notifyAuthListeners();
    // A different tab may have changed identity while this tab held account-specific component state.
    window.location.reload();
  });
}

export type Role = "student" | "teacher" | "admin" | null;

export const authStore = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get role(): Role { return (localStorage.getItem(ROLE_KEY) as Role) ?? null; },
  get name() { return localStorage.getItem(NAME_KEY); },
  set(token: string, role: string, name?: string, beforeNotify?: () => void) {
    const changed = this.token !== token;
    if (changed) advanceAuthRevision();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
    if (changed) clearUserScopedQueryCache();
    beforeNotify?.();
    // نجاح تسجيل الدخول/إنشاء الحساب = الحساب موجود فعلاً؛ لا ترحيب مجدداً على هذا الجهاز
    try {
      localStorage.setItem(SPLASH_KEY, "1");
      if (!token.startsWith("demo-")) localStorage.setItem(KNOWN_ACCOUNT_KEY, "1");
    } catch { /* التخزين محظور */ }
    notifyAuthListeners();
  },
  setName(name: string) { localStorage.setItem(NAME_KEY, name); },
  clear() {
    advanceAuthRevision();
    clearUserScopedQueryCache();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
    notifyAuthListeners();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  get isLoggedIn() { return !!this.token; },
  /** حساب حقيقي سجّل دخوله سابقاً على هذا الجهاز — تبقى العلامة بعد الخروج */
  get hasKnownAccount() { try { return !!localStorage.getItem(KNOWN_ACCOUNT_KEY); } catch { return false; } },
  /** وضع العرض التجريبي — دخول بدون خادم، بيانات محلية */
  get isDemo() { return (this.token ?? "").startsWith("demo-"); },
};
