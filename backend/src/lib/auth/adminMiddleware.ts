import { createMiddleware } from 'hono/factory';
import { createHash, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';
import { ERRORS } from '../errors';

// Hash both sides to a fixed-length digest so timingSafeEqual never throws
// on length mismatch and the secret's length is never revealed by timing.
const sha256 = (s: string) => createHash('sha256').update(s).digest();

export const withAdmin = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid admin credentials');
  }

  const match = timingSafeEqual(sha256(token), sha256(env.ADMIN_SECRET));
  if (!match) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid admin credentials');
  }

  await next();
});
