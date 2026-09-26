/**
 * Hand-mirror of shared/src/validators/auth.ts's `loginSchema` (web isn't an
 * npm workspace member, so it can't import @app/shared — same arrangement as
 * lib/api/types.ts). scripts/check-shared-drift.mjs fails when the source of
 * truth changes shape.
 *
 *   loginSchema = { email: z.string().email(), password: z.string() }
 *
 * `password` has no rule: an empty or wrong one is the backend's
 * INVALID_CREDENTIALS, not a validation error.
 */

// Zod 4's default `z.string().email()` pattern (zod/v4/core/regexes.js).
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function isValidLoginEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Narrows an untrusted request body to the shape `loginSchema` accepts. */
export function parseLoginInput(body: unknown): LoginInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (!isValidLoginEmail(email)) return null;
  return { email, password };
}
