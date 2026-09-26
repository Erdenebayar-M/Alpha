import { isValidLoginEmail } from "@/lib/auth/loginRules";

/**
 * Hand-mirror of shared/src/validators/auth.ts's `forgotPasswordSchema` (see
 * loginRules.ts for why web mirrors instead of importing).
 * scripts/check-shared-drift.mjs fails when the source of truth changes shape.
 *
 *   forgotPasswordSchema = { email: z.string().email() }
 *
 * The email rule is the same Zod default loginSchema uses, so it reuses
 * isValidLoginEmail.
 */

export interface ForgotPasswordInput {
  email: string;
}

/** Narrows an untrusted request body to the shape `forgotPasswordSchema` accepts. */
export function parseForgotPasswordInput(body: unknown): ForgotPasswordInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { email } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isValidLoginEmail(email)) return null;
  return { email };
}
