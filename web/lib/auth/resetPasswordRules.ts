import { PASSWORD_MIN_LENGTH } from "@/lib/auth/registerRules";

/**
 * Hand-mirror of shared/src/validators/auth.ts's `resetPasswordSchema` (see
 * loginRules.ts for why web mirrors instead of importing).
 * scripts/check-shared-drift.mjs fails when the source of truth changes shape.
 *
 *   resetPasswordSchema = { token: z.string().min(1), password: z.string().min(8) }
 *
 * The form's own rule, confirmation included, is registerRules.ts's
 * validateNewPassword; the confirmation is never sent.
 */

export interface ResetPasswordInput {
  token: string;
  password: string;
}

/** Narrows an untrusted request body to the shape `resetPasswordSchema` accepts. */
export function parseResetPasswordInput(body: unknown): ResetPasswordInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { token, password } = body as Record<string, unknown>;
  if (typeof token !== "string" || token.length === 0) return null;
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) return null;
  return { token, password };
}
