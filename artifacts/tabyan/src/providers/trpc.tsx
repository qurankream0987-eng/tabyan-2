import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "@workspace/tabyan-trpc";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
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

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const token = localStorage.getItem("tabyan_token");
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", "Bearer " + token);
        return globalThis.fetch(input, { ...(init ?? {}), headers, credentials: "include" });
      },
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
