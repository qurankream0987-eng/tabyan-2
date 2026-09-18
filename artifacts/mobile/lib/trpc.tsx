import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import Constants from "expo-constants";
import type { ReactNode } from "react";
// Use the built declaration so the Native compiler does not pull server-only
// fetch/AbortSignal implementations into the React Native type graph.
import type { AppRouter } from "../../../lib/tabyan-trpc/dist/index";
import { storage } from "./storage";

export const trpc = createTRPCReact<AppRouter>();

function httpStatus(error: unknown) {
  return (error as { data?: { httpStatus?: number } })?.data?.httpStatus;
}

function handleAuthError(error: unknown) {
  if (httpStatus(error) === 401) void storage.invalidateSession();
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

const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiOrigin()}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        const token = await storage.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
