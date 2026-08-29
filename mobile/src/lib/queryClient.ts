import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/src/api/envelope';

// A 4xx (bad request, forbidden, not found, unauthorized) will never succeed
// by retrying — most importantly, a 401 previously turned into 3 extra
// requests (and 3 extra clearToken() calls) per query under the default
// retry:3. Only retry network hiccups and 5xx.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
