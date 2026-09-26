import { BACKEND_URL } from "@/lib/api/server/backendUrl";

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

/**
 * Calls the backend as the parent whose session token is `token`, and unwraps
 * the `{success,data}` / `{success,error}` envelope. Server-side only — see
 * parentSession.ts for where the token comes from.
 */
export async function backendFetch<T>(token: string, path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

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
