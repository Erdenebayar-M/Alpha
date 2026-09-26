import { isValidLoginEmail } from "@/lib/auth/loginRules";

/**
 * Hand-mirror of shared/src/validators/auth.ts's `registerSchema` (web isn't
 * an npm workspace member — same arrangement as loginRules.ts).
 * scripts/check-shared-drift.mjs fails when the source of truth changes shape.
 *
 *   registerSchema = { email: z.string().email(), name: z.string().min(2),
 *                      surname: z.string().optional(), password: z.string().min(8) }
 *
 * `confirmPassword` is a client-only check: it is never sent to the backend
 * and never added to the shared schema.
 */

export const NAME_MIN_LENGTH = 2;
export const PASSWORD_MIN_LENGTH = 8;

export interface RegisterInput {
  email: string;
  name: string;
  surname?: string;
  password: string;
}

export type RegisterField = "name" | "email" | "password" | "confirmPassword";

export interface RegisterFormValues {
  surname: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** The first rule each field breaks, keyed by field. Empty when the form is valid. `surname` has no rule. */
export function validateRegisterForm(values: RegisterFormValues): Partial<Record<RegisterField, true>> {
  const errors: Partial<Record<RegisterField, true>> = {};
  if (values.name.trim().length < NAME_MIN_LENGTH) errors.name = true;
  if (!isValidLoginEmail(values.email.trim())) errors.email = true;
  if (values.password.length < PASSWORD_MIN_LENGTH) errors.password = true;
  else if (values.confirmPassword !== values.password) errors.confirmPassword = true;
  return errors;
}

/** Narrows an untrusted request body to the shape `registerSchema` accepts. */
export function parseRegisterInput(body: unknown): RegisterInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { email, name, surname, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string") return null;
  if (surname !== undefined && typeof surname !== "string") return null;
  const trimmedName = name.trim();
  const trimmedSurname = typeof surname === "string" ? surname.trim() : "";
  if (!isValidLoginEmail(email) || trimmedName.length < NAME_MIN_LENGTH || password.length < PASSWORD_MIN_LENGTH) return null;
  return { email, name: trimmedName, ...(trimmedSurname ? { surname: trimmedSurname } : {}), password };
}
