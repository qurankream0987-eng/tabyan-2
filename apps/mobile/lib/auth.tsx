import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "./storage";
import { clearUserScopedQueryCache, revokeServerSession } from "./trpc";
import { clearPrivateMediaCache } from "./media/private-media-cache";
import { clearLibraryDownloads } from "./media/library-download";
import { clearPrivateTemporaryFiles } from "./media/private-temporary-files";
import { beginAccountTransition } from "./account-transition";
import { clearNativeSessionRecordings } from "../modules/tabyan-session-recorder/src";

export type Role = "student" | "teacher" | "admin";
type AuthState = {
  token: string | null;
  role: Role | null;
  name: string | null;
  ready: boolean;
  signIn: (token: string, role: Role, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthRouter = {
  canDismiss: () => boolean;
  dismissAll: () => void;
  replace: (path: any) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function navigateToWelcome(router: AuthRouter) {
  // dismissAll on a stack with nothing to pop raises POP_TO_TOP "not handled".
  if (router.canDismiss()) router.dismissAll();
  router.replace("/guest");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "signIn" | "signOut">>({
    token: null, role: null, name: null, ready: false,
  });

  useEffect(() => {
    Promise.all([
      storage.getToken(),
      storage.getRole(),
      storage.getName(),
      clearPrivateMediaCache().catch(() => undefined),
      clearPrivateTemporaryFiles(),
      clearNativeSessionRecordings(),
    ])
      .then(([token, role, name]) => {
        const validRole = role === "student" || role === "teacher" || role === "admin" ? role : null;
        setState({ token, role: validRole, name, ready: true });
      })
      .catch(() => setState((current) => ({ ...current, ready: true })));
  }, []);

  useEffect(() => storage.onSessionInvalidated(() => {
    beginAccountTransition();
    clearUserScopedQueryCache();
    setState({ token: null, role: null, name: null, ready: true });
    void Promise.all([
      clearPrivateMediaCache(),
      clearLibraryDownloads(),
      clearPrivateTemporaryFiles(),
      clearNativeSessionRecordings(),
    ]).catch(() => undefined);
  }), []);

  const value = useMemo<AuthState>(() => ({
    ...state,
    signIn: async (token, role, name) => {
      if (state.token !== token) {
        beginAccountTransition();
        clearUserScopedQueryCache();
        setState({ token: null, role: null, name: null, ready: true });
        await Promise.all([
          storage.clearSession(),
          clearPrivateMediaCache(),
          clearLibraryDownloads(),
          clearPrivateTemporaryFiles(),
          clearNativeSessionRecordings(),
        ]);
      }
      await storage.setSession(token, role, name);
      setState({ token, role, name: name ?? null, ready: true });
    },
    signOut: async () => {
      const token = state.token;
      beginAccountTransition();
      clearUserScopedQueryCache();
      setState({ token: null, role: null, name: null, ready: true });
      await Promise.all([
        storage.clearSession(),
        clearPrivateMediaCache(),
        clearLibraryDownloads(),
        clearPrivateTemporaryFiles(),
        clearNativeSessionRecordings(),
      ]);
      if (token) void revokeServerSession(token);
    },
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
