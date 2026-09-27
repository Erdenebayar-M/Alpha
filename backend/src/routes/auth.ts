import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { prisma } from '../lib/db/client';
import { hashPassword, comparePassword } from '../lib/auth/password';
import { signToken } from '../lib/auth/jwt';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, confirmEmailSchema, resendConfirmationSchema, googleAuthSchema } from '@app/shared';
import { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter, confirmEmailLimiter, resendConfirmationLimiter, googleLimiter } from '../lib/auth/rateLimit';
import { issuePasswordResetToken, passwordResetLink, resetPasswordWithToken } from '../lib/auth/passwordReset';
import { createUnconfirmedParent, emailConfirmationLink, confirmEmailWithToken, issueEmailConfirmationToken } from '../lib/auth/emailConfirmation';
import { sendEmail, type EmailMessage, passwordResetEmail, emailConfirmationEmail } from '../lib/email';
import { googleIdentityFromCode, type GoogleIdentity } from '../lib/auth/google';
import { maskEmail } from '../lib/mask-email';
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

// POST /api/auth/register — Sign up. Creates an unconfirmed Parent account and
// emails its Email confirmation link; the parent is signed in only once they
// open it (POST /confirm-email). Answers with the address the link went to,
// and no token.
auth.post('/register', registerLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, name, surname, password, next } = parsed.data;

  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    return ERRORS.DUPLICATE_EMAIL(c);
  }

  const password_hash = await hashPassword(password);
  const { parent, token } = await createUnconfirmedParent({ email, name, surname, password_hash });

  // A failed send is only logged: the account exists either way, and the
  // parent is told to check their email.
  try {
    await sendEmail(emailConfirmationEmail({ to: parent.email, name: parent.name, link: emailConfirmationLink(token, next) }));
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id: c.get('requestId') ?? null,
        event: 'email_confirmation_email_failed',
        parent_id: parent.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return ok(c, { email: parent.email }, undefined, 201);
});

// POST /api/auth/confirm-email — Email confirmation from the emailed link's
// token. Confirms the email and signs the parent in, answering like login.
auth.post('/confirm-email', confirmEmailLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = confirmEmailSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const confirmed = await confirmEmailWithToken(parsed.data.token);
  if (!confirmed) {
    return ERRORS.INVALID_CONFIRMATION_TOKEN(c);
  }

  const { token_version, ...parent } = confirmed;
  const token = await signToken({ parent_id: parent.id, token_version });
  setAuthCookie(c, token);
  return ok(c, { ...parent, token });
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

  // A Google-only Parent account has no password: the same generic error, so
  // the response doesn't reveal how the account signs in.
  const valid = parent.password_hash !== null && (await comparePassword(password, parent.password_hash));
  if (!valid) {
    return ERRORS.INVALID_CREDENTIALS(c);
  }
  // Checked only after the password, so the answer tells nothing to a caller
  // who doesn't know it.
  if (!parent.email_confirmed_at) {
    return ERRORS.EMAIL_NOT_CONFIRMED(c, maskEmail(parent.email));
  }

  const token = await signToken({ parent_id: parent.id, token_version: parent.token_version });
  setAuthCookie(c, token);
  return ok(c, { id: parent.id, email: parent.email, name: parent.name, token });
});

// Issues a token and emails the link — Password reset or Email confirmation.
// Failures are only logged: the caller has already answered.
async function issueAndEmail(
  parent: { id: string },
  request_id: string | null,
  event: string,
  issue: (parent_id: string) => Promise<string | null>,
  email: (token: string) => EmailMessage,
) {
  try {
    const token = await issue(parent.id);
    if (!token) return;
    await sendEmail(email(token));
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id,
        event,
        parent_id: parent.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

const sendPasswordReset = (parent: { id: string; name: string }, email: string, request_id: string | null) =>
  issueAndEmail(parent, request_id, 'password_reset_email_failed', issuePasswordResetToken, (token) =>
    passwordResetEmail({ to: email, name: parent.name, link: passwordResetLink(token) }),
  );

const sendEmailConfirmation = (parent: { id: string; name: string }, email: string, next: string | undefined, request_id: string | null) =>
  issueAndEmail(parent, request_id, 'email_confirmation_email_failed', issueEmailConfirmationToken, (token) =>
    emailConfirmationEmail({ to: email, name: parent.name, link: emailConfirmationLink(token, next) }),
  );

// POST /api/auth/resend-confirmation — sends a new Email confirmation link,
// which invalidates the older ones. The response is the same, and as quick,
// whether or not an unconfirmed Parent account has this email: only one does
// get mail, after the response goes out.
auth.post('/resend-confirmation', resendConfirmationLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = resendConfirmationSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, next } = parsed.data;
  const parent = await prisma.parent.findUnique({ where: { email }, select: { id: true, name: true, email_confirmed_at: true } });
  if (parent && !parent.email_confirmed_at) void sendEmailConfirmation(parent, email, next, c.get('requestId') ?? null);

  return ok(c, { ok: true });
});

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

// POST /api/auth/reset-password — sets a new password from the emailed link's
// token and signs the parent in, answering like login. Every other session is
// signed out: the reset increments token_version and only the new token has it.
auth.post('/reset-password', resetPasswordLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const reset = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!reset) {
    return ERRORS.INVALID_RESET_TOKEN(c);
  }

  const { token_version, ...parent } = reset;
  const token = await signToken({ parent_id: parent.id, token_version });
  setAuthCookie(c, token);
  return ok(c, { ...parent, token });
});

// The Parent account for a Google identity: the one already linked to it;
// otherwise the one with its email, which gets linked; otherwise a new one
// without a password. Throws when that email's account is linked to a
// different Google account.
//
// Linking drops the account's password and signs out its sessions: sign-up
// never proves the email is the parent's, so whoever set that password may
// not be the Google-verified owner now arriving. Password reset, which goes
// through the email, sets a new one.
async function parentForGoogle(identity: GoogleIdentity) {
  const linked = await prisma.parent.findUnique({ where: { google_id: identity.sub } });
  if (linked) return linked;

  const byEmail = await prisma.parent.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } } });
  if (byEmail) {
    if (byEmail.google_id) throw new Error('Email is linked to a different Google account');
    return prisma.parent.update({
      where: { id: byEmail.id },
      data: { google_id: identity.sub, password_hash: null, token_version: { increment: 1 } },
    });
  }

  return prisma.parent.create({
    data: {
      email: identity.email,
      google_id: identity.sub,
      name: identity.given_name ?? identity.email.split('@')[0],
      surname: identity.family_name,
    },
  });
}

// POST /api/auth/google — Sign in or Sign up with Google, one flow for both.
// Takes the authorization code web received and answers like login.
auth.post('/google', googleLimiter, async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = googleAuthSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  let parent;
  try {
    parent = await parentForGoogle(await googleIdentityFromCode(parsed.data));
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id: c.get('requestId') ?? null,
        event: 'google_auth_failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return ERRORS.GOOGLE_AUTH_FAILED(c);
  }

  const token = await signToken({ parent_id: parent.id, token_version: parent.token_version });
  setAuthCookie(c, token);
  return ok(c, { id: parent.id, email: parent.email, name: parent.name, token });
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
