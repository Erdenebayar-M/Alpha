import type { Context, MiddlewareHandler } from 'hono';
import { ERRORS } from '../errors';

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
  const keyFn =
    opts.keyFn ??
    ((c) =>
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown');

  return async (c, next) => {
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
