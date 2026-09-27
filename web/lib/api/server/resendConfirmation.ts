import { postAuthRoute, type AuthFailure } from "@/lib/api/server/authRequest";
import type { ResendConfirmationInput } from "@/lib/auth/resendConfirmationRules";

const KNOWN_CODES = ["RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type ResendConfirmationResult = { ok: true } | AuthFailure<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/resend-confirmation`, which answers the
 *  same whether or not an unconfirmed account has the email. See postAuthRoute. */
export async function resendConfirmation(input: ResendConfirmationInput, clientIp: string | null): Promise<ResendConfirmationResult> {
  const result = await postAuthRoute("/api/auth/resend-confirmation", input, clientIp, KNOWN_CODES);
  return result.ok ? { ok: true } : result;
}
