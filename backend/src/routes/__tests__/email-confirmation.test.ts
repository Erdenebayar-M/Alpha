import { prisma } from '../../lib/db/client';
import { sendEmail, type EmailMessage } from '../../lib/email';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// In-memory parents and email_confirmation_tokens tables. A link is obtained
// the way a parent gets one — through /register and the (fake) email — and
// confirmation is judged by what /confirm-email and /login then answer, not by
// which Prisma calls were made.

interface ParentRow {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  password_hash: string | null;
  token_version: number;
  email_confirmed_at: Date | null;
  created_at: Date;
}

interface TokenRow {
  id: string;
  parent_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

const parents: ParentRow[] = [];
const tokens: TokenRow[] = [];

jest.mock('../../lib/db/client', () => ({
  prisma: {
    parent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    emailConfirmationToken: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// "Hashing" that /login's comparePassword can check, without bcrypt.
jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(async (password: string) => `hashed:${password}`),
  comparePassword: jest.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
}));
// A readable stand-in for a JWT that carries its claims.
jest.mock('../../lib/auth/jwt', () => ({
  signToken: jest.fn(async ({ parent_id, token_version }: { parent_id: string; token_version: number }) =>
    `session.${parent_id}.${token_version}`,
  ),
}));
jest.mock('../../lib/email', () => ({
  ...jest.requireActual('../../lib/email'),
  sendEmail: jest.fn(),
}));

const db = prisma as unknown as {
  parent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  emailConfirmationToken: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
  $transaction: jest.Mock;
};
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

const EMAIL = 'bat@gmail.com';
const PASSWORD = 'long-enough-pw';
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let ipCounter = 0;

function post(path: string, body: unknown) {
  // A fresh IP per request keeps these tests clear of the routes' rate limits.
  return authRouter.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${++ipCounter}` },
    body: JSON.stringify(body),
  });
}

const register = (body: Record<string, unknown> = {}) =>
  post('/register', { email: EMAIL, name: 'Болд', surname: 'Бат', password: PASSWORD, ...body });
const confirm = (token: unknown) => post('/confirm-email', { token });
const login = (password = PASSWORD, email = EMAIL) => post('/login', { email, password });

const sentMessages = () => mockSendEmail.mock.calls.map(([m]) => m as EmailMessage);

/** The confirmation link from the most recent email. */
function emailedLink(): URL {
  const message = sentMessages().at(-1);
  const match = message?.text.match(/https?:\/\/\S+\/confirm-email\?\S+/);
  if (!match) throw new Error('No confirmation link was emailed');
  return new URL(match[0]);
}

/** Signs up and returns the raw token from the emailed link. */
async function signUpAndGetToken(): Promise<string> {
  expect((await register()).status).toBe(201);
  return emailedLink().searchParams.get('token')!;
}

interface Envelope {
  success: boolean;
  data?: { id?: string; email?: string; name?: string; token?: string };
  error?: { code: string; details?: unknown };
}
const json = async (res: Response) => (await res.json()) as Envelope;

beforeEach(() => {
  jest.clearAllMocks();
  parents.length = 0;
  tokens.length = 0;

  db.parent.findUnique.mockImplementation(async ({ where }: { where: { email?: string; id?: string } }) =>
    parents.find((p) => (where.email ? p.email === where.email : p.id === where.id)) ?? null,
  );
  db.parent.create.mockImplementation(async ({ data }: { data: Pick<ParentRow, 'email' | 'name' | 'password_hash'> & { surname?: string } }) => {
    if (parents.some((p) => p.email === data.email)) throw new Error('Unique constraint failed on email');
    const row: ParentRow = {
      id: `parent-${parents.length + 1}`,
      surname: null,
      token_version: 0,
      email_confirmed_at: null,
      created_at: new Date(),
      ...data,
    };
    parents.push(row);
    return { ...row };
  });
  db.parent.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Partial<ParentRow> }) => {
    const row = parents.find((p) => p.id === where.id);
    if (!row) throw new Error('Record to update not found');
    Object.assign(row, data);
    return { ...row };
  });

  db.emailConfirmationToken.findUnique.mockImplementation(async ({ where }: { where: { token_hash: string } }) =>
    tokens.find((t) => t.token_hash === where.token_hash) ?? null,
  );
  db.emailConfirmationToken.updateMany.mockImplementation(
    async ({ where, data }: { where: { id?: string; used_at?: null; expires_at?: { gt: Date } }; data: { used_at: Date } }) => {
      // Applies only the conditions the query gives, like the real table.
      const matching = tokens.filter(
        (t) =>
          (where.id === undefined || t.id === where.id) &&
          (!('used_at' in where) || t.used_at === where.used_at) &&
          (where.expires_at === undefined || t.expires_at > where.expires_at.gt),
      );
      for (const t of matching) t.used_at = data.used_at;
      return { count: matching.length };
    },
  );
  db.emailConfirmationToken.create.mockImplementation(async ({ data }: { data: Omit<TokenRow, 'id' | 'used_at' | 'created_at'> }) => {
    const row = { id: `token-${tokens.length + 1}`, used_at: null, created_at: new Date(), ...data };
    tokens.push(row);
    return row;
  });
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
  );
  mockSendEmail.mockResolvedValue(undefined);
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /register', () => {
  it('creates an unconfirmed Parent account, answering with the address but no token or cookie', async () => {
    const res = await register({ email: '  Bat@Gmail.COM ' });

    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({ success: true, data: { email: EMAIL } });
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(parents).toEqual([
      expect.objectContaining({ email: EMAIL, name: 'Болд', surname: 'Бат', password_hash: `hashed:${PASSWORD}`, email_confirmed_at: null }),
    ]);
  });

  it('sends exactly one confirmation email, to the address, with a link to web', async () => {
    await register();

    expect(sentMessages()).toHaveLength(1);
    expect(sentMessages()[0].to).toBe(EMAIL);
    const link = emailedLink();
    expect(`${link.origin}${link.pathname}`).toBe('http://localhost:3000/confirm-email');
    expect(link.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(sentMessages()[0].html).toContain(link.searchParams.get('token'));
  });

  it('stores only a hash of the token, expiring in 24 hours', async () => {
    const token = await signUpAndGetToken();

    expect(tokens).toHaveLength(1);
    expect(tokens[0].token_hash).not.toContain(token);
    expect(tokens[0].expires_at.getTime() - Date.now()).toBeGreaterThan(DAY_MS - 60_000);
    expect(tokens[0].expires_at.getTime() - Date.now()).toBeLessThanOrEqual(DAY_MS);
  });

  it('carries `next` into the link', async () => {
    await register({ next: '/articles/some-slug' });

    expect(emailedLink().searchParams.get('next')).toBe('/articles/some-slug');
  });

  it('leaves `next` out of the link when none was given', async () => {
    await register();

    expect(emailedLink().searchParams.has('next')).toBe(false);
  });

  it('409 — an email held by a confirmed Parent account is still DUPLICATE_EMAIL, and nothing is sent', async () => {
    await confirm(await signUpAndGetToken());
    mockSendEmail.mockClear();

    const res = await register({ email: 'BAT@gmail.com', password: 'another-password' });

    expect(res.status).toBe(409);
    expect((await json(res)).error?.code).toBe('DUPLICATE_EMAIL');
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(parents).toHaveLength(1);
  });

  it('still answers 201 when the email cannot be sent — the failure is only logged', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('Resend rejected the email: 500'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await register();

    expect(res.status).toBe(201);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('email_confirmation_email_failed'));
    error.mockRestore();
  });
});

// ─── Confirm ─────────────────────────────────────────────────────────────────

describe('POST /confirm-email', () => {
  it('confirms the email and signs the parent in, answering like login', async () => {
    const token = await signUpAndGetToken();

    const res = await confirm(token);

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      success: true,
      data: { id: 'parent-1', email: EMAIL, name: 'Болд', token: 'session.parent-1.0' },
    });
    expect(res.headers.get('set-cookie')).toContain('auth_token=session.parent-1.0');
    expect(parents[0].email_confirmed_at).toBeInstanceOf(Date);
  });

  it('after confirming, the parent can sign in with their password', async () => {
    await confirm(await signUpAndGetToken());

    const res = await login();

    expect(res.status).toBe(200);
    expect((await json(res)).data?.id).toBe('parent-1');
  });

  it('rejects a link that has already been used', async () => {
    const token = await signUpAndGetToken();
    expect((await confirm(token)).status).toBe(200);

    const reused = await confirm(token);

    expect(reused.status).toBe(400);
    expect((await json(reused)).error?.code).toBe('INVALID_CONFIRMATION_TOKEN');
  });

  it('lets only one of two simultaneous confirms with the same link through', async () => {
    const token = await signUpAndGetToken();

    const results = await Promise.all([confirm(token), confirm(token)]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it('rejects an expired link, leaving the account unconfirmed', async () => {
    const token = await signUpAndGetToken();
    for (const t of tokens) t.expires_at = new Date(Date.now() - 1000);

    const res = await confirm(token);

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('INVALID_CONFIRMATION_TOKEN');
    expect(parents[0].email_confirmed_at).toBeNull();
  });

  it('rejects an unknown link', async () => {
    await signUpAndGetToken();

    const res = await confirm('not-a-token-anyone-was-sent');

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('INVALID_CONFIRMATION_TOKEN');
    expect(parents[0].email_confirmed_at).toBeNull();
  });

  it('400 — rejects a body without a token', async () => {
    for (const body of [{}, { token: '' }, null]) {
      const res = await post('/confirm-email', body);
      expect(res.status).toBe(400);
      expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    }
  });
});

// ─── Login before confirming ─────────────────────────────────────────────────

describe('POST /login on an unconfirmed Parent account', () => {
  it('with the right password is EMAIL_NOT_CONFIRMED, and signs no one in', async () => {
    await signUpAndGetToken();

    const res = await login();

    expect(res.status).toBe(403);
    const error = (await json(res)).error;
    expect(error?.code).toBe('EMAIL_NOT_CONFIRMED');
    expect(error?.details).toEqual({ email: 'b***@gmail.com' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('with a wrong password is the generic INVALID_CREDENTIALS', async () => {
    await signUpAndGetToken();

    const res = await login('wrong-password');

    expect(res.status).toBe(401);
    expect((await json(res)).error?.code).toBe('INVALID_CREDENTIALS');
  });
});
