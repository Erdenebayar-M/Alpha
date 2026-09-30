import { isValidLoginEmail } from "@/lib/auth/loginRules";
import { PASSWORD_MIN_LENGTH, passwordWeakness, resemblesParent, type PasswordWeakness } from "@/lib/auth/passwordRules";

/**
 * Hand-mirror of shared/src/validators/auth.ts's `registerSchema` (web isn't
 * an npm workspace member — same arrangement as loginRules.ts).
 * scripts/check-shared-drift.mjs fails when the source of truth changes shape.
 *
 *   registerSchema = { email: emailSchema, name: z.string().min(2),
 *                      surname: z.string().optional(), password: newPasswordSchema,
 *                      next: z.string().max(2048).optional() }
 *                    + password must not resemble the parent (PASSWORD_SIMILAR)
 *   (emailSchema = z.string().trim().toLowerCase().email();
 *    newPasswordSchema's rules are mirrored in passwordRules.ts)
 *
 * `confirmPassword` is a client-only check: it is never sent to the backend
 * and never added to the shared schema. The schema's optional `next` is not
 * a form field: the sign-up route handler adds it.
 */

export const NAME_MIN_LENGTH = 2;

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

/** A new password's error is which rule it broke; the other fields' is only that they broke theirs. */
export type NewPasswordErrors = { password?: PasswordWeakness; confirmPassword?: true };
export type RegisterErrors = Partial<Record<"name" | "email", true>> & NewPasswordErrors;

/** The first rule each field breaks, keyed by field. Empty when the form is valid. `surname` has no rule. */
export function validateRegisterForm(values: RegisterFormValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (values.name.trim().length < NAME_MIN_LENGTH) errors.name = true;
  if (!isValidLoginEmail(values.email.trim())) errors.email = true;
  const passwordErrors = validateNewPassword(values);
  // Checked last, as the schema does: only once the password is otherwise fine.
  if (!passwordErrors.password && resemblesParent(values.password, { email: values.email.trim(), name: values.name, surname: values.surname })) {
    return { ...errors, password: "PASSWORD_SIMILAR" };
  }
  return { ...errors, ...passwordErrors };
}

/** The new-password pair's rule, shared by Sign up and Password reset: not a
 *  Weak password web can spot, then confirmed. Empty when both hold. */
export function validateNewPassword({ password, confirmPassword }: { password: string; confirmPassword: string }): NewPasswordErrors {
  const weakness = passwordWeakness(password);
  if (weakness) return { password: weakness };
  if (confirmPassword !== password) return { confirmPassword: true };
  return {};
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

/** The copy for a new-password field's error, by which rule it broke — shared
 *  by Sign up and Password reset, whose `errors` copy both carry these keys. */
export function newPasswordErrorText(
  errors: NewPasswordErrors,
  key: "password" | "confirmPassword",
  copy: { password: Record<PasswordWeakness, string>; confirmPassword: string },
): string | undefined {
  if (key === "password") return errors.password && copy.password[errors.password];
  return errors.confirmPassword && copy.confirmPassword;
}
