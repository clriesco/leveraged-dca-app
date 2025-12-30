import useSWR, { SWRConfiguration } from "swr";

/**
 * Default SWR configuration
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - revalidateOnFocus: false - Don't refetch when window regains focus
 * - revalidateOnReconnect: true - Refetch when network reconnects
 * - dedupingInterval: 2000 - Dedupe requests within 2 seconds
 */
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch when switching tabs
  revalidateOnReconnect: true, // Refetch if network reconnects
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  refreshInterval: 0, // Don't auto-refresh (manual refresh only)
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

/**
 * Custom hook with default SWR config
 */
export function useSWRWithConfig<T>(
  key: string | null,
  fetcher: (() => Promise<T>) | null,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, fetcher, { ...swrConfig, ...config });
}

