import { postAuthRoute, type AuthFailure } from "@/lib/api/server/authRequest";
import type { RegisterInput } from "@/lib/auth/registerRules";

const KNOWN_CODES = ["DUPLICATE_EMAIL", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type RegisterResult = { ok: true; email: string } | AuthFailure<(typeof KNOWN_CODES)[number]>;

/**
 * Calls the backend's `POST /api/auth/register`, which signs no one in: it
 * emails an Email confirmation link and answers with the address it went to.
 * `next` is carried into that link. See postAuthRoute.
 */
export async function registerWithBackend(input: RegisterInput & { next?: string }, clientIp: string | null): Promise<RegisterResult> {
  const result = await postAuthRoute("/api/auth/register", input, clientIp, KNOWN_CODES);
  if (!result.ok) return result;
  const email = (result.data as { email?: unknown } | null)?.email;
  return typeof email === "string" ? { ok: true, email } : { ok: false, code: "UPSTREAM_ERROR" };
}
