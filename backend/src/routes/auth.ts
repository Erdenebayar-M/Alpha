import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { prisma } from '../lib/db/client';
import { hashPassword, comparePassword } from '../lib/auth/password';
import { signToken } from '../lib/auth/jwt';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { registerSchema, loginSchema, forgotPasswordSchema } from '@app/shared';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../lib/auth/rateLimit';
import { issuePasswordResetToken, passwordResetLink } from '../lib/auth/passwordReset';
import { sendEmail, passwordResetEmail } from '../lib/email';
import { AUTH_COOKIE, withAuth, type AuthEnv } from '../lib/auth/middleware';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

const auth = new Hono<AuthEnv>();

// POST /api/auth/register
auth.post('/register', registerLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, name, surname, password } = parsed.data;

  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    return ERRORS.DUPLICATE_EMAIL(c);
  }

  const password_hash = await hashPassword(password);
  const parent = await prisma.parent.create({
    data: { email, name, surname, password_hash },
  });

  const token = await signToken({ parent_id: parent.id });
  setAuthCookie(c, token);
  return ok(c, { id: parent.id, email: parent.email, name: parent.name, token }, undefined, 201);
});

// POST /api/auth/login
auth.post('/login', loginLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;

  const parent = await prisma.parent.findUnique({ where: { email } });
  if (!parent) {
    return ERRORS.INVALID_CREDENTIALS(c);
  }

  const valid = await comparePassword(password, parent.password_hash);
  if (!valid) {
    return ERRORS.INVALID_CREDENTIALS(c);
  }

  const token = await signToken({ parent_id: parent.id });
  setAuthCookie(c, token);
  return ok(c, { id: parent.id, email: parent.email, name: parent.name, token });
});

// Issues a token and emails the link. Failures are only logged: the caller has
// already answered.
async function sendPasswordReset(parent: { id: string; name: string }, email: string, request_id: string | null) {
  try {
    const token = await issuePasswordResetToken(parent.id);
    if (!token) return;
    await sendEmail(passwordResetEmail({ to: email, name: parent.name, link: passwordResetLink(token) }));
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id,
        event: 'password_reset_email_failed',
        parent_id: parent.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

// POST /api/auth/forgot-password — requests a Password reset link. The response
// is the same, and as quick, whether or not a Parent account has this email:
// issuing the token and sending the email happen after it goes out.
auth.post('/forgot-password', forgotPasswordLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email } = parsed.data;
  const parent = await prisma.parent.findUnique({ where: { email }, select: { id: true, name: true } });
  if (parent) void sendPasswordReset(parent, email, c.get('requestId') ?? null);

  return ok(c, { ok: true });
});

// POST /api/auth/logout — clears the auth cookie
auth.post('/logout', async (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: '/' });
  return ok(c, { ok: true });
});

// GET /api/auth/me — returns the authenticated parent's profile
auth.get('/me', withAuth, async (c) => {
  const parent_id = c.get('parent_id');
  const parent = await prisma.parent.findUnique({
    where: { id: parent_id },
    select: { id: true, email: true, name: true },
  });
  if (!parent) {
    return ERRORS.UNAUTHORIZED(c, 'Account no longer exists');
  }
  return ok(c, parent);
});

export default auth;
