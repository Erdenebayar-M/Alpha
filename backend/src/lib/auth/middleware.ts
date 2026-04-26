import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from './jwt';
import { ERRORS } from '../errors';

export const AUTH_COOKIE = 'auth_token';

export type AuthEnv = {
  Variables: {
    parent_id: string;
  };
};

/**
 * withAuth — Hono middleware.
 * Reads the JWT from the `auth_token` HttpOnly cookie first, then falls back
 * to `Authorization: Bearer <token>`. The cookie is the primary path used by
 * the Next.js frontend; the Bearer fallback exists for legacy callers and tests.
 */
export const withAuth = createMiddleware<AuthEnv>(async (c, next) => {
  let token: string | undefined = getCookie(c, AUTH_COOKIE);
  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
  }

  if (!token) {
    return ERRORS.UNAUTHORIZED(c, 'Missing auth_token cookie or Authorization header');
  }

  try {
    const { parent_id } = await verifyToken(token);
    c.set('parent_id', parent_id);
    await next();
  } catch {
    return ERRORS.UNAUTHORIZED(c, 'Invalid or expired token');
  }
});
