import type { Context, MiddlewareHandler } from 'hono';
import { ERRORS } from '../errors';
import { env } from '../../config/env';

interface Bucket {
  count: number;
  resetAt: number;
}

interface Options {
  windowMs: number;
  max: number;
  keyFn?: (c: Context) => string;
}

export function rateLimit(opts: Options): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();
  // NOTE: uses first X-Forwarded-For hop; assumes a trusted reverse proxy in prod.
  const keyFn =
    opts.keyFn ??
    ((c) =>
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown');

  // Prune expired buckets every 5 minutes to prevent unbounded memory growth.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }, 5 * 60 * 1000);
  sweep.unref();

  const disabled = env.RATE_LIMIT_DISABLED === 'true' && env.NODE_ENV !== 'production';

  return async (c, next) => {
    if (disabled) return next();
    const now = Date.now();
    const key = keyFn(c);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (bucket.count >= opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return ERRORS.RATE_LIMITED(c);
    }

    bucket.count += 1;
    return next();
  };
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// 10 registrations per IP per hour — prevents account-spam and email enumeration.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

// 5 LLM/generation requests per IP per minute — limits API cost exposure.
export const adminGenerateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});
