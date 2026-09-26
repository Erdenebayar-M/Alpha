import { BACKEND_URL } from "@/lib/api/server/backendAuth";
import type { LoginInput } from "@/lib/auth/loginRules";

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; code: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "VALIDATION_ERROR" | "UPSTREAM_ERROR" };

const KNOWN_CODES = ["INVALID_CREDENTIALS", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

/**
 * Calls the backend's `POST /api/auth/login` as the signing-in parent (unlike
 * backendClient.ts, which acts as the dev parent). Server-side only.
 *
 * `clientIp` is forwarded because the backend's login rate limit is keyed on
 * X-Forwarded-For — without it every parent would share this server's bucket.
 */
export async function loginWithBackend(input: LoginInput, clientIp: string | null): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/login`, {
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

  const code = KNOWN_CODES.find((known) => known === json?.error?.code);
  if (code) return { ok: false, code };
  // A gateway in front of the backend may rate-limit with a non-JSON body.
  return { ok: false, code: res.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR" };
}
