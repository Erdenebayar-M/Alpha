import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken } from './jwt';
import { prisma } from '../db/client';
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
 *
 * The token must also carry the Parent account's current `token_version`: a
 * Password reset increments it, signing out every session issued before. A
 * token whose Parent account no longer exists is rejected too.
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

  let claims;
  try {
    claims = await verifyToken(token);
  } catch {
    return ERRORS.UNAUTHORIZED(c, 'Invalid or expired token');
  }

  // Outside the try: a database failure is a 500, not a sign-out.
  const parent = await prisma.parent.findUnique({ where: { id: claims.parent_id }, select: { token_version: true } });
  if (parent?.token_version !== claims.token_version) {
    return ERRORS.UNAUTHORIZED(c, 'Invalid or expired token');
  }

  c.set('parent_id', claims.parent_id);
  await next();
});
