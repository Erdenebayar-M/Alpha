import type { Context } from 'hono';
import { fail } from './response';

export const ERRORS = {
  VALIDATION_ERROR: (c: Context, message: string, details?: unknown) =>
    fail(c, 'VALIDATION_ERROR', message, details, 400),

  UNAUTHORIZED: (c: Context, message = 'Unauthorized') =>
    fail(c, 'UNAUTHORIZED', message, undefined, 401),

  INVALID_CREDENTIALS: (c: Context) =>
    fail(c, 'INVALID_CREDENTIALS', 'Invalid email or password', undefined, 401),

  // An expired, used or unknown Password reset token — deliberately one code,
  // so the response doesn't say which.
  INVALID_RESET_TOKEN: (c: Context) =>
    fail(c, 'INVALID_RESET_TOKEN', 'Reset link is expired or invalid', undefined, 400),

  // An expired, used or unknown Email confirmation token — one code, as for
  // INVALID_RESET_TOKEN.
  INVALID_CONFIRMATION_TOKEN: (c: Context) =>
    fail(c, 'INVALID_CONFIRMATION_TOKEN', 'Confirmation link is expired or invalid', undefined, 400),

  // The right password for a Parent account whose email isn't confirmed yet.
  // Only given after the password checks out, so it reveals nothing to a
  // caller who doesn't know it.
  EMAIL_NOT_CONFIRMED: (c: Context) =>
    fail(c, 'EMAIL_NOT_CONFIRMED', 'Email is not confirmed yet', undefined, 403),

  // Any failed Google sign-in: a bad or expired code, an id_token that doesn't
  // verify, an unverified email, or Google not configured.
  GOOGLE_AUTH_FAILED: (c: Context) =>
    fail(c, 'GOOGLE_AUTH_FAILED', 'Google sign-in failed', undefined, 401),

  NOT_FOUND: (c: Context, message: string) =>
    fail(c, 'NOT_FOUND', message, undefined, 404),

  FORBIDDEN: (c: Context, message = 'Forbidden') =>
    fail(c, 'FORBIDDEN', message, undefined, 403),

  CONFLICT: (c: Context, message: string) =>
    fail(c, 'CONFLICT', message, undefined, 409),

  DUPLICATE_EMAIL: (c: Context) =>
    fail(c, 'DUPLICATE_EMAIL', 'Email already registered', undefined, 409),

  UNPROCESSABLE: (c: Context, message: string, details?: unknown) =>
    fail(c, 'UNPROCESSABLE', message, details, 422),

  RATE_LIMITED: (c: Context, message = 'Хэт олон оролдлого хийсэн. Хэсэг хүлээгээд дахин оролдоно уу.') =>
    fail(c, 'RATE_LIMITED', message, undefined, 429),

  SERVICE_UNAVAILABLE: (c: Context, message: string) =>
    fail(c, 'SERVICE_UNAVAILABLE', message, undefined, 503),

  INTERNAL: (c: Context, message: string) =>
    fail(c, 'INTERNAL', message, undefined, 500),
};
