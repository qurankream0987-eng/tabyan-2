import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "./storage";

export type Role = "student" | "teacher" | "admin";
type AuthState = {
  token: string | null;
  role: Role | null;
  name: string | null;
  ready: boolean;
  signIn: (token: string, role: Role, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "signIn" | "signOut">>({
    token: null, role: null, name: null, ready: false,
  });

  useEffect(() => {
    Promise.all([storage.getToken(), storage.getRole(), storage.getName()])
      .then(([token, role, name]) => {
        const validRole = role === "student" || role === "teacher" || role === "admin" ? role : null;
        setState({ token, role: validRole, name, ready: true });
      })
      .catch(() => setState((current) => ({ ...current, ready: true })));
  }, []);

  useEffect(() => storage.onSessionInvalidated(() => {
    setState({ token: null, role: null, name: null, ready: true });
  }), []);

  const value = useMemo<AuthState>(() => ({
    ...state,
    signIn: async (token, role, name) => {
      await storage.setSession(token, role, name);
      setState({ token, role, name: name ?? null, ready: true });
    },
    signOut: async () => {
      await storage.clearSession();
      setState({ token: null, role: null, name: null, ready: true });
    },
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
