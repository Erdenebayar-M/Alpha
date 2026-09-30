import { PASSWORD_MIN_LENGTH, PASSWORD_WEAKNESSES, type PasswordWeakness } from '@app/shared';

// Its own module, apart from password.ts: route tests mock that one whole to
// stub bcrypt, and this must keep working under them.

// The VALIDATION_ERROR message for a Weak password, for clients that show the
// message as-is (mobile). Web words each reason itself from `details.password`.
const WEAK_PASSWORD_MESSAGES: Record<PasswordWeakness, string> = {
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_TOO_LONG: 'Password is too long',
  PASSWORD_PATTERN: 'Password cannot be one repeated character or a simple sequence',
  PASSWORD_COMMON: 'Password is too common — choose another',
  PASSWORD_SIMILAR: 'Password cannot contain your name or email',
};

/** A request body's validation message: the password's weakness when that is
 *  what failed, otherwise the generic one. */
export function validationMessage(fieldErrors: { password?: string[] }): string {
  const weakness = fieldErrors.password?.find((issue): issue is PasswordWeakness => (PASSWORD_WEAKNESSES as readonly string[]).includes(issue));
  return weakness ? WEAK_PASSWORD_MESSAGES[weakness] : 'Invalid request body';
}
