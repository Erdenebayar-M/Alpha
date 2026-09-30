import { z } from 'zod';
import { COMMON_PASSWORDS } from './commonPasswords';

// A Weak password (web/CONTEXT.md) is one a Parent account may not choose.
// Judged only when a password is set — Sign up and Password reset — never at
// Sign in, so an existing weak password still gets its parent in. There is
// deliberately no composition rule (digit, symbol, capital): NIST SP 800-63B
// screens against common passwords instead.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
// bcrypt ignores everything past 72 bytes, and a Cyrillic letter is 2 bytes in
// UTF-8 — a 64-letter Mongolian password would otherwise be only partly hashed.
export const PASSWORD_MAX_BYTES = 72;
// A name or email part shorter than this is too likely to turn up by chance.
export const SIMILARITY_MIN_LENGTH = 4;

// Each one is the Zod issue's message, so it reaches clients in the backend's
// VALIDATION_ERROR `details.password` and web can word it for the parent.
// These are API reasons, not error codes in the error-skill-map sense.
export const PASSWORD_WEAKNESSES = [
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_PATTERN',
  'PASSWORD_COMMON',
  'PASSWORD_SIMILAR',
] as const;
export type PasswordWeakness = (typeof PASSWORD_WEAKNESSES)[number];

export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** The whole password is one repeated character, or one ascending or
 *  descending run of digits or Latin letters (`12345678`, `hgfedcba`).
 *  Keyboard walks and repeated chunks are left to the common-password list. */
export function isSimplePattern(password: string): boolean {
  const chars = [...password.toLowerCase()];
  if (chars.every((char) => char === chars[0])) return true;
  const sameClass = chars.every((char) => /[0-9]/.test(char)) || chars.every((char) => /[a-z]/.test(char));
  if (!sameClass) return false;
  const step = chars[1].charCodeAt(0) - chars[0].charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  return chars.every((char, i) => i === 0 || char.charCodeAt(0) - chars[i - 1].charCodeAt(0) === step);
}

/** The first rule a new password breaks, whoever it belongs to; null when none. */
export function passwordWeakness(password: string): PasswordWeakness | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return 'PASSWORD_TOO_SHORT';
  if ([...password].length > PASSWORD_MAX_LENGTH || utf8ByteLength(password) > PASSWORD_MAX_BYTES) return 'PASSWORD_TOO_LONG';
  if (isSimplePattern(password)) return 'PASSWORD_PATTERN';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'PASSWORD_COMMON';
  return null;
}

/** The password contains the parent's own email name, name or surname. Only
 *  Sign up can ask this: Password reset has no account details to hand. */
export function resemblesParent(password: string, parent: { email: string; name: string; surname?: string }): boolean {
  const lowered = password.toLowerCase();
  const parts = [parent.email.split('@')[0], parent.name, parent.surname ?? ''].map((part) => part.trim().toLowerCase());
  return parts.some((part) => [...part].length >= SIMILARITY_MIN_LENGTH && lowered.includes(part));
}

/** A password being set: any characters, never trimmed. */
export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  const weakness = passwordWeakness(password);
  if (weakness) ctx.addIssue({ code: 'custom', message: weakness });
});
