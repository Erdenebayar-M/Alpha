import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'crypto';
import { env } from '../../config/env';
import { ERRORS } from '../errors';

export const withAdmin = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token.length !== env.ADMIN_SECRET.length) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid admin credentials');
  }

  const match = timingSafeEqual(Buffer.from(token), Buffer.from(env.ADMIN_SECRET));
  if (!match) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid admin credentials');
  }

  await next();
});
