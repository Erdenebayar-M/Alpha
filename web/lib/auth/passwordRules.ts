/**
 * Hand-mirror of shared/src/validators/password.ts's Weak password rules (web
 * isn't an npm workspace member — same arrangement as loginRules.ts), less
 * the common-password list: that one lives only in shared/, and the backend
 * names it as `PASSWORD_COMMON` in its VALIDATION_ERROR's `details.password`,
 * which the auth route handlers pass through as `passwordWeakness`.
 * scripts/check-shared-drift.mjs fails when the constants or reasons drift.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_BYTES = 72;
export const SIMILARITY_MIN_LENGTH = 4;

export const PASSWORD_WEAKNESSES = [
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "PASSWORD_PATTERN",
  "PASSWORD_COMMON",
  "PASSWORD_SIMILAR",
] as const;
export type PasswordWeakness = (typeof PASSWORD_WEAKNESSES)[number];

export function isPasswordWeakness(value: unknown): value is PasswordWeakness {
  return (PASSWORD_WEAKNESSES as readonly unknown[]).includes(value);
}

function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

function isSimplePattern(password: string): boolean {
  const chars = [...password.toLowerCase()];
  if (chars.every((char) => char === chars[0])) return true;
  const sameClass = chars.every((char) => /[0-9]/.test(char)) || chars.every((char) => /[a-z]/.test(char));
  if (!sameClass) return false;
  const step = chars[1].charCodeAt(0) - chars[0].charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  return chars.every((char, i) => i === 0 || char.charCodeAt(0) - chars[i - 1].charCodeAt(0) === step);
}

/** The first rule a new password breaks that web can tell by itself; null
 *  when none. Being a common password is the backend's to say. */
export function passwordWeakness(password: string): PasswordWeakness | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return "PASSWORD_TOO_SHORT";
  if ([...password].length > PASSWORD_MAX_LENGTH || utf8ByteLength(password) > PASSWORD_MAX_BYTES) return "PASSWORD_TOO_LONG";
  if (isSimplePattern(password)) return "PASSWORD_PATTERN";
  return null;
}

/** The password contains the parent's own email name, name or surname — Sign up only. */
export function resemblesParent(password: string, parent: { email: string; name: string; surname?: string }): boolean {
  const lowered = password.toLowerCase();
  const parts = [parent.email.split("@")[0], parent.name, parent.surname ?? ""].map((part) => part.trim().toLowerCase());
  return parts.some((part) => [...part].length >= SIMILARITY_MIN_LENGTH && lowered.includes(part));
}
