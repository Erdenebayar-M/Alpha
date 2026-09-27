import { isValidLoginEmail } from "@/lib/auth/loginRules";

/**
 * Hand-mirror of shared/src/validators/auth.ts's `resendConfirmationSchema`
 * (see loginRules.ts for why web mirrors instead of importing).
 * scripts/check-shared-drift.mjs fails when the source of truth changes shape.
 *
 *   resendConfirmationSchema = { email: emailSchema, next: z.string().max(2048).optional() }
 */

const NEXT_MAX_LENGTH = 2048;

export interface ResendConfirmationInput {
  email: string;
  next?: string;
}

/** Narrows an untrusted request body to the shape `resendConfirmationSchema` accepts. */
export function parseResendConfirmationInput(body: unknown): ResendConfirmationInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { email, next } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isValidLoginEmail(email)) return null;
  if (next === undefined) return { email };
  if (typeof next !== "string" || next.length > NEXT_MAX_LENGTH) return null;
  return { email, next };
}
