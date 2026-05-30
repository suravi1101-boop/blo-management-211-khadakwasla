import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client configured for BLO Management.
 * - staleTime: 30000 → treat data as fresh for 30s; prevents redundant refetches
 * - gcTime: 300000 → keep in memory for 5 minutes; allows actor to initialize
 * - retry: 2 → retry failed requests twice (handles actor-not-ready errors)
 * - refetchOnWindowFocus: false → no auto-refresh, manual only per user preference
 */
/**
 * React Query client configured for BLO Management.
 * - staleTime: 0 → always treat cache as stale so data always fetches on mount
 * - gcTime: 300000 → keep in memory for 5 minutes to avoid flicker on tab switch
 * - retry: 3 → retry failed requests three times (handles actor-not-ready race)
 * - retryDelay: 1000 → wait 1s between retries to allow actor to initialize
 * - refetchOnWindowFocus: false → no auto-refresh, manual only per user preference
 * - refetchOnMount: always → always re-fetch when a component mounts
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 300000,
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: "always",
    },
  },
});
