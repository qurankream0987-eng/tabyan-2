import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import Constants from "expo-constants";
import type { ReactNode } from "react";
import { isUserScopedQueryKey } from "@workspace/tabyan-domain/user-query-scope";
// Use the built declaration so the Native compiler does not pull server-only
// fetch/AbortSignal implementations into the React Native type graph.
import type { AppRouter } from "@workspace/tabyan-trpc/types";
import { storage } from "./storage";
import { getAccountGeneration, isCurrentAccountGeneration, onAccountTransition } from "./account-transition";

export const trpc = createTRPCReact<AppRouter>();

function httpStatus(error: unknown) {
  return (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
}

function handleAuthError(error: unknown) {
  // 401 means the token is missing, expired, or revoked: sign out.
  // 403 is ambiguous. It is a role mismatch (the stored role no longer has access),
  // but procedures also answer FORBIDDEN for business rules (e.g. a placement video
  // already under review). Sign out only when the session itself turns out to be bad.
  const status = httpStatus(error);
  if (status === 401) void storage.invalidateSession();
  else if (status === 403) void verifySessionAfterForbidden();
}

let sessionCheck: Promise<void> | null = null;

/** After a 403, ask the server who we are; drop the session only if it is invalid or its role changed. */
function verifySessionAfterForbidden() {
  sessionCheck ??= (async () => {
    const generation = getAccountGeneration();
    const [token, role] = await Promise.all([storage.getToken(), storage.getRole()]);
    if (!token) return;
    const checkClient = createTRPCClient<AppRouter>({
      links: [httpLink({ url: `${apiOrigin()}/api/trpc`, transformer: superjson, headers: { Authorization: `Bearer ${token}` } })],
    });
    try {
      const me = await checkClient.auth.me.query();
      if (role && me.role !== role && isCurrentAccountGeneration(generation)) await storage.invalidateSession();
    } catch (checkError) {
      const checkStatus = httpStatus(checkError);
      if ((checkStatus === 401 || checkStatus === 403) && isCurrentAccountGeneration(generation)) {
        await storage.invalidateSession();
      }
      // Offline or a server error: keep the session; the next request will tell.
    }
  })().finally(() => { sessionCheck = null; });
  return sessionCheck;
}

export function apiOrigin() {
  const configured = process.env.EXPO_PUBLIC_DOMAIN ?? Constants.expoConfig?.extra?.productionDomain;
  if (!configured) throw new Error("EXPO_PUBLIC_DOMAIN is required for the Native API client");
  return configured.startsWith("http") ? configured : `https://${configured}`;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnReconnect: true,
      retry: (failureCount, error: unknown) => {
        const status = httpStatus(error);
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});

/** Remove server state belonging to the previous identity, but keep public catalogs cached. */
export function clearUserScopedQueryCache() {
  const predicate = (query: { queryKey: readonly unknown[] }) => isUserScopedQueryKey(query.queryKey);
  void queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
  queryClient.getMutationCache().clear();
}

function getAuthorizationHeader(headers: RequestInit["headers"]): string | null {
  if (!headers) return null;
  const headerObject = headers as { get?: (name: string) => string | null };
  if (typeof headerObject.get === "function") return headerObject.get("authorization");
  const entries: Array<[string, unknown]> = Array.isArray(headers)
    ? headers as Array<[string, unknown]>
    : Object.entries(headers as Record<string, unknown>);
  const authorization = entries.find(([name]) => String(name).toLowerCase() === "authorization");
  return authorization ? String(authorization[1]) : null;
}

async function accountBoundFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const generation = getAccountGeneration();
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal?.aborted) controller.abort();
  else upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });

  const unsubscribe = onAccountTransition(() => controller.abort());
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(cleanupTimer);
    unsubscribe();
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  };
  const cleanupTimer = setTimeout(cleanup, 60_000);

  try {
    if (!isCurrentAccountGeneration(generation)) throw new Error("Account changed before the request started.");
    const authorization = getAuthorizationHeader(init?.headers);
    const currentToken = await storage.getToken();
    if (
      !isCurrentAccountGeneration(generation)
      || (authorization && authorization !== `Bearer ${currentToken ?? ""}`)
    ) {
      throw new Error("Account changed before the request started.");
    }
    const response = await fetch(input as any, { ...init, signal: controller.signal as any });
    if (!isCurrentAccountGeneration(generation)) throw new Error("Account changed while the request was in flight.");

    const originalJson = response.json.bind(response);
    const originalText = response.text.bind(response);
    Object.defineProperty(response, "json", {
      configurable: true,
      value: async () => {
        try { return await originalJson(); } finally { cleanup(); }
      },
    });
    Object.defineProperty(response, "text", {
      configurable: true,
      value: async () => {
        try { return await originalText(); } finally { cleanup(); }
      },
    });
    return response;
  } catch (error) {
    cleanup();
    throw error;
  }
}

const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiOrigin()}/api/trpc`,
      transformer: superjson,
      fetch: accountBoundFetch,
      headers: async () => {
        const generation = getAccountGeneration();
        const token = await storage.getToken();
        if (!isCurrentAccountGeneration(generation)) {
          throw new Error("Account changed before the request could be authenticated.");
        }
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

/**
 * Best-effort server-side revocation of a Tabyan bearer token (auth.logout). Never throws and
 * never delays local sign-out. Only the Tabyan session ends — the device's Google account is untouched.
 */
export async function revokeServerSession(token: string) {
  const revokeClient = createTRPCClient<AppRouter>({
    links: [httpLink({ url: `${apiOrigin()}/api/trpc`, transformer: superjson, headers: { Authorization: `Bearer ${token}` } })],
  });
  try {
    await Promise.race([
      revokeClient.auth.logout.mutate(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // Offline or already-expired token: the local session is already cleared.
  }
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
