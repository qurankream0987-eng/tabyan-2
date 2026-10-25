import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "@workspace/tabyan-trpc";
import type { ReactNode } from "react";
import { isUserScopedQueryKey } from "@workspace/tabyan-domain/user-query-scope";
import { sessionFetch } from "@/lib/session-fetch";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  mutationCache: new MutationCache(),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error: unknown) => {
        // never retry 401/403 — they won't resolve without a new token
        const code = (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
        if (code === 401 || code === 403) return false;
        return failureCount < 1;
      },
    },
  },
});

/** Remove server state belonging to the previous identity, but keep public catalogs cached. */
export function clearUserScopedQueryCache() {
  queryClient.removeQueries({ predicate: (query) => isUserScopedQueryKey(query.queryKey) });
  queryClient.getMutationCache().clear();
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/trpc",
      transformer: superjson,
      fetch: sessionFetch,
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
