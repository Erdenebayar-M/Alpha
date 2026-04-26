import { createMiddleware } from 'hono/factory';
import { verifyToken } from './jwt';
import { ERRORS } from '../errors';

export type AuthEnv = {
  Variables: {
    parent_id: string;
  };
};

/**
 * withAuth — Hono middleware.
 * Reads Authorization: Bearer <token>, verifies it, and sets parent_id on context.
 * Returns 401 if the header is missing or the token is invalid/expired.
 *
 * Protected routes must be mounted on a Hono<AuthEnv> instance so that
 * c.get('parent_id') is properly typed.
 */
export const withAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return ERRORS.UNAUTHORIZED(c, 'Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7);
  try {
    const { parent_id } = await verifyToken(token);
    c.set('parent_id', parent_id);
    await next();
  } catch {
    return ERRORS.UNAUTHORIZED(c, 'Invalid or expired token');
  }
});
