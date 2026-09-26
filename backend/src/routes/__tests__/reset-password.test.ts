import { prisma } from '../../lib/db/client';
import { sendEmail, type EmailMessage } from '../../lib/email';
import { signToken } from '../../lib/auth/jwt';
import { hashPassword } from '../../lib/auth/password';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// In-memory parents and password_reset_tokens tables. A link is obtained the
// way a parent gets one — through /forgot-password and the (fake) email — and
// the reset is judged by what /login then accepts, not by which Prisma calls
// were made.

interface ParentRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  token_version: number;
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
    parent: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// "Hashing" that /login's comparePassword can check, so old and new passwords
// are told apart without bcrypt.
jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(async (password: string) => `hashed:${password}`),
  comparePassword: jest.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
}));
// A readable stand-in for a JWT that carries its claims, so a session can be
// taken from one request and presented on a later one.
jest.mock('../../lib/auth/jwt', () => ({
  signToken: jest.fn(async ({ parent_id, token_version }: { parent_id: string; token_version: number }) =>
    `session.${parent_id}.${token_version}`,
  ),
  verifyToken: jest.fn(async (token: string) => {
    const [kind, parent_id, version] = token.split('.');
    if (kind !== 'session') throw new Error('JWSInvalid');
    return { parent_id, token_version: Number(version) };
  }),
}));
jest.mock('../../lib/email', () => ({
  ...jest.requireActual('../../lib/email'),
  sendEmail: jest.fn(),
}));

const db = prisma as unknown as {
  parent: { findUnique: jest.Mock; update: jest.Mock };
  passwordResetToken: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock; count: jest.Mock };
  $transaction: jest.Mock;
};
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockSign = signToken as jest.MockedFunction<typeof signToken>;

const EMAIL = 'parent@example.com';
const OLD_PASSWORD = 'old-password-1';
const NEW_PASSWORD = 'new-password-2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let ipCounter = 0;
const settle = () => new Promise((resolve) => setImmediate(resolve));

function post(path: string, body: unknown) {
  // A fresh IP per request keeps these tests clear of the routes' rate limits.
  return authRouter.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${++ipCounter}` },
    body: JSON.stringify(body),
  });
}

/** Requests a Password reset link and returns the raw token from the email. */
async function requestResetToken(): Promise<string> {
  mockSendEmail.mockClear();
  await post('/forgot-password', { email: EMAIL });
  await settle();
  const [message] = mockSendEmail.mock.calls.map(([m]) => m as EmailMessage);
  const match = message?.text.match(/\/reset-password\?token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('No reset link was emailed');
  return match[1];
}

const resetPassword = (token: unknown, password: unknown) => post('/reset-password', { token, password });
const login = (password: string) => post('/login', { email: EMAIL, password });
const me = (session: string) => authRouter.request('/me', { headers: { Authorization: `Bearer ${session}` } });

interface Envelope {
  success: boolean;
  data?: { id?: string; email?: string; name?: string; token?: string };
  error?: { code: string };
}
const json = async (res: Response) => (await res.json()) as Envelope;

beforeEach(() => {
  jest.clearAllMocks();
  parents.length = 0;
  tokens.length = 0;
  parents.push({ id: 'parent-uuid-1', email: EMAIL, name: 'Болд', password_hash: `hashed:${OLD_PASSWORD}`, token_version: 0 });

  const pick = <T extends object>(row: T | undefined, select?: Record<string, boolean>) =>
    row && select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k as keyof T]])) : (row ?? null);

  db.parent.findUnique.mockImplementation(async ({ where, select }: { where: { email?: string; id?: string }; select?: Record<string, boolean> }) =>
    pick(parents.find((p) => (where.email ? p.email === where.email : p.id === where.id)), select),
  );
  db.parent.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: { password_hash?: string; token_version?: { increment: number } } }) => {
      const row = parents.find((p) => p.id === where.id);
      if (!row) throw new Error('Record to update not found');
      if (data.password_hash !== undefined) row.password_hash = data.password_hash;
      if (data.token_version) row.token_version += data.token_version.increment;
      return { ...row };
    },
  );

  db.passwordResetToken.findUnique.mockImplementation(async ({ where }: { where: { token_hash: string } }) =>
    tokens.find((t) => t.token_hash === where.token_hash) ?? null,
  );
  db.passwordResetToken.updateMany.mockImplementation(
    async ({ where, data }: { where: { id?: string; parent_id?: string; used_at?: null; expires_at?: { gt: Date } }; data: { used_at: Date } }) => {
      // Applies only the conditions the query gives, like the real table.
      const matching = tokens.filter(
        (t) =>
          (where.id === undefined || t.id === where.id) &&
          (where.parent_id === undefined || t.parent_id === where.parent_id) &&
          (!('used_at' in where) || t.used_at === where.used_at) &&
          (where.expires_at === undefined || t.expires_at > where.expires_at.gt),
      );
      for (const t of matching) t.used_at = data.used_at;
      return { count: matching.length };
    },
  );
  db.passwordResetToken.create.mockImplementation(async ({ data }: { data: Omit<TokenRow, 'id' | 'used_at' | 'created_at'> }) => {
    const row = { id: `token-${tokens.length + 1}`, used_at: null, created_at: new Date(), ...data };
    tokens.push(row);
    return row;
  });
  db.passwordResetToken.count.mockImplementation(async ({ where }: { where: { parent_id: string; created_at: { gte: Date } } }) =>
    tokens.filter((t) => t.parent_id === where.parent_id && t.created_at >= where.created_at.gte).length,
  );
  // Both forms: an array of queries (issuing a token) and a callback (the reset).
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
  );
  mockSendEmail.mockResolvedValue(undefined);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /reset-password', () => {
  it('sets the new password and signs the parent in, like login', async () => {
    const token = await requestResetToken();

    const res = await resetPassword(token, NEW_PASSWORD);

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      success: true,
      data: { id: 'parent-uuid-1', email: EMAIL, name: 'Болд', token: 'session.parent-uuid-1.1' },
    });
    expect(mockSign).toHaveBeenCalledWith({ parent_id: 'parent-uuid-1', token_version: 1 });
    expect(res.headers.get('set-cookie')).toContain('auth_token=session.parent-uuid-1.1');
  });

  it('after a reset, the old password fails and the new one works', async () => {
    expect((await login(OLD_PASSWORD)).status).toBe(200);
    const token = await requestResetToken();

    await resetPassword(token, NEW_PASSWORD);

    const old = await login(OLD_PASSWORD);
    expect(old.status).toBe(401);
    expect((await json(old)).error?.code).toBe('INVALID_CREDENTIALS');
    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });

  it('signs the Parent account out everywhere else; the session from the reset works', async () => {
    const before = (await json(await login(OLD_PASSWORD))).data!.token!;
    expect((await me(before)).status).toBe(200);

    const after = (await json(await resetPassword(await requestResetToken(), NEW_PASSWORD))).data!.token!;

    const stale = await me(before);
    expect(stale.status).toBe(401);
    expect((await json(stale)).error?.code).toBe('UNAUTHORIZED');
    expect((await me(after)).status).toBe(200);
    expect((await me((await json(await login(NEW_PASSWORD))).data!.token!)).status).toBe(200);
  });

  it('a failed reset signs no one out', async () => {
    const before = (await json(await login(OLD_PASSWORD))).data!.token!;

    await resetPassword('not-a-token-anyone-was-sent', NEW_PASSWORD);

    expect((await me(before)).status).toBe(200);
  });

  it('rejects a token that has already been used, leaving the first reset in place', async () => {
    const token = await requestResetToken();
    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);

    const reused = await resetPassword(token, 'attacker-password');

    expect(reused.status).toBe(400);
    expect((await json(reused)).error?.code).toBe('INVALID_RESET_TOKEN');
    expect((await login('attacker-password')).status).toBe(401);
    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });

  it('lets only one of two simultaneous resets with the same token through', async () => {
    const token = await requestResetToken();

    const results = await Promise.all([resetPassword(token, NEW_PASSWORD), resetPassword(token, 'other-password-3')]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });

  it('rejects an expired token', async () => {
    const token = await requestResetToken();
    for (const t of tokens) t.expires_at = new Date(Date.now() - 1000);

    const res = await resetPassword(token, NEW_PASSWORD);

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('INVALID_RESET_TOKEN');
    expect((await login(OLD_PASSWORD)).status).toBe(200);
  });

  it('rejects a token that expires while the new password is being hashed', async () => {
    const token = await requestResetToken();
    (hashPassword as jest.Mock).mockImplementationOnce(async (password: string) => {
      for (const t of tokens) t.expires_at = new Date(Date.now() - 1);
      return `hashed:${password}`;
    });

    const res = await resetPassword(token, NEW_PASSWORD);

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('INVALID_RESET_TOKEN');
    expect((await login(OLD_PASSWORD)).status).toBe(200);
  });

  it('rejects an unknown token', async () => {
    await requestResetToken();

    const res = await resetPassword('not-a-token-anyone-was-sent', NEW_PASSWORD);

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('INVALID_RESET_TOKEN');
    expect((await login(OLD_PASSWORD)).status).toBe(200);
  });

  it('rejects a link superseded by a newer request', async () => {
    const older = await requestResetToken();
    const newer = await requestResetToken();

    expect((await resetPassword(older, NEW_PASSWORD)).status).toBe(400);
    expect((await resetPassword(newer, NEW_PASSWORD)).status).toBe(200);
  });

  it('400 — rejects a password under 8 characters without using the token', async () => {
    const token = await requestResetToken();

    const res = await resetPassword(token, 'short');

    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);
  });

  it('400 — rejects a body without a token', async () => {
    for (const body of [{ password: NEW_PASSWORD }, { token: '', password: NEW_PASSWORD }, null]) {
      const res = await post('/reset-password', body);
      expect(res.status).toBe(400);
      expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    }
  });
});
