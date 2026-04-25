import type { Context } from 'hono';
import { fail } from './response';

export const ERRORS = {
  VALIDATION_ERROR: (c: Context, message: string, details?: unknown) =>
    fail(c, 'VALIDATION_ERROR', message, details, 400),

  UNAUTHORIZED: (c: Context, message = 'Unauthorized') =>
    fail(c, 'UNAUTHORIZED', message, undefined, 401),

  INVALID_CREDENTIALS: (c: Context) =>
    fail(c, 'INVALID_CREDENTIALS', 'Invalid email or password', undefined, 401),

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
};
