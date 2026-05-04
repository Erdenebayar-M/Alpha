import { createMiddleware } from 'hono/factory';
import { env } from '../../config/env';
import { ERRORS } from '../errors';

const DEV_FALLBACK = 'dev-admin-secret-change-in-production-32x';

export const withAdmin = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const expected =
    env.ADMIN_SECRET ?? (env.NODE_ENV === 'development' ? DEV_FALLBACK : null);

  if (!token || !expected || token !== expected) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid admin credentials');
  }

  await next();
});
