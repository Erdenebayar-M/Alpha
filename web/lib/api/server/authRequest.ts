import { BACKEND_URL } from "@/lib/api/server/backendUrl";

type TokenPath = "/api/auth/login" | "/api/auth/register" | "/api/auth/reset-password" | "/api/auth/google";
type AuthPath = TokenPath | "/api/auth/forgot-password";

export type AuthFailure<Code extends string> = { ok: false; code: Code | "UPSTREAM_ERROR" };

export type AuthResult<Code extends string> = { ok: true; token: string } | AuthFailure<Code>;

/**
 * POSTs to one of the backend's unauthenticated auth routes as the parent
 * (backendClient.ts calls the routes that need their session token). Server-side only.
 *
 * `clientIp` is forwarded because the backend's auth rate limits are keyed on
 * X-Forwarded-For — without it every parent would share this server's bucket.
 * `knownCodes` are the backend error codes the caller handles; anything else
 * is an UPSTREAM_ERROR. Resolves to the envelope's `data` on success.
 */
export async function postAuthRoute<Code extends string>(
  path: AuthPath,
  input: object,
  clientIp: string | null,
  knownCodes: readonly Code[],
): Promise<{ ok: true; data: unknown } | AuthFailure<Code>> {
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
  if (json?.success) return { ok: true, data: json.data };

  const code = knownCodes.find((known) => known === json?.error?.code);
  if (code) return { ok: false, code };
  // A gateway in front of the backend may rate-limit with a non-JSON body.
  return { ok: false, code: (res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR") as Code | "UPSTREAM_ERROR" };
}

/** postAuthRoute for the token-issuing routes (sign in, sign up, Password reset, Google). */
export async function authWithBackend<Code extends string>(
  path: TokenPath,
  input: object,
  clientIp: string | null,
  knownCodes: readonly Code[],
): Promise<AuthResult<Code>> {
  const result = await postAuthRoute(path, input, clientIp, knownCodes);
  if (!result.ok) return result;
  const token = (result.data as { token?: unknown } | null)?.token;
  return typeof token === "string" ? { ok: true, token } : { ok: false, code: "UPSTREAM_ERROR" };
}
