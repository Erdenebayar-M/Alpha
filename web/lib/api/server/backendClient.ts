import { BACKEND_URL, getBackendToken, invalidateBackendToken } from "@/lib/api/server/backendAuth";

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

/**
 * Calls the real backend as the dev parent, unwraps the `{success,data}` /
 * `{success,error}` envelope, and retries once with a fresh token on 401.
 * Server-side only — see backendAuth.ts.
 */
export async function backendFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return attempt(path, options, false);
}

async function attempt<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<T> {
  const token = await getBackendToken(isRetry);

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401 && !isRetry) {
    invalidateBackendToken();
    return attempt(path, options, true);
  }

  const json = await res.json().catch(() => null);
  if (!json) {
    throw new BackendRequestError("UPSTREAM_ERROR", `Backend returned a non-JSON ${res.status} response`, res.status);
  }
  if (!json.success) {
    throw new BackendRequestError(json.error?.code ?? "UPSTREAM_ERROR", json.error?.message ?? res.statusText, res.status, json.error?.details);
  }
  return json.data as T;
}

export class BackendRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "BackendRequestError";
  }
}
