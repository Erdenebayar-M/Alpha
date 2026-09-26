import { BACKEND_URL } from "@/lib/api/server/backendAuth";

export type AuthResult<Code extends string> =
  | { ok: true; token: string }
  | { ok: false; code: Code | "UPSTREAM_ERROR" };

/**
 * POSTs to one of the backend's token-issuing auth routes as the parent
 * signing in or up (unlike backendClient.ts, which acts as the dev parent).
 * Server-side only.
 *
 * `clientIp` is forwarded because the backend's auth rate limits are keyed on
 * X-Forwarded-For — without it every parent would share this server's bucket.
 * `knownCodes` are the backend error codes the caller handles; anything else
 * is an UPSTREAM_ERROR.
 */
export async function authWithBackend<Code extends string>(
  path: "/api/auth/login" | "/api/auth/register",
  input: object,
  clientIp: string | null,
  knownCodes: readonly Code[],
): Promise<AuthResult<Code>> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(clientIp ? { "x-forwarded-for": clientIp } : {}) },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, code: "UPSTREAM_ERROR" };
  }

  const json = await res.json().catch(() => null);
  if (json?.success && typeof json.data?.token === "string") return { ok: true, token: json.data.token };

  const code = knownCodes.find((known) => known === json?.error?.code);
  if (code) return { ok: false, code };
  // A gateway in front of the backend may rate-limit with a non-JSON body.
  return { ok: false, code: (res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR") as Code | "UPSTREAM_ERROR" };
}
