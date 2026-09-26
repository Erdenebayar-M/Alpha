import { postAuthRoute, type AuthFailure } from "@/lib/api/server/authRequest";
import type { ForgotPasswordInput } from "@/lib/auth/forgotPasswordRules";

const KNOWN_CODES = ["RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type ForgotPasswordResult = { ok: true } | AuthFailure<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/forgot-password`, which answers the
 *  same whether or not the email is registered. See postAuthRoute. */
export async function requestPasswordReset(input: ForgotPasswordInput, clientIp: string | null): Promise<ForgotPasswordResult> {
  const result = await postAuthRoute("/api/auth/forgot-password", input, clientIp, KNOWN_CODES);
  return result.ok ? { ok: true } : result;
}
