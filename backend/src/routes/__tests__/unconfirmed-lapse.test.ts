import { prisma } from '../../lib/db/client';
import { sendEmail, type EmailMessage } from '../../lib/email';
import { replaceUnconfirmedParent, UNCONFIRMED_LAPSE_MS } from '../../lib/auth/emailConfirmation';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// Same in-memory parents/email_confirmation_tokens tables as
// email-confirmation.test.ts, so replacing and lapsing an unconfirmed Parent
// account are judged by what the routes answer and what state results, not by
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
    parent: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    emailConfirmationToken: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(async (password: string) => `hashed:${password}`),
  comparePassword: jest.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
}));
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
  parent: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  emailConfirmationToken: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock; count: jest.Mock };
  $transaction: jest.Mock;
};
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

const EMAIL = 'bat@gmail.com';
const PASSWORD = 'long-enough-pw';
const DAY_MS = 24 * 60 * 60 * 1000;

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

const settle = () => new Promise((resolve) => setImmediate(resolve));
const forgotPassword = async (body: unknown) => {
  const res = await post('/forgot-password', body);
  await settle();
  return res;
};
const resend = async (body: unknown) => {
  const res = await post('/resend-confirmation', body);
  await settle();
  return res;
};

const sentMessages = () => mockSendEmail.mock.calls.map(([m]) => m as EmailMessage);

function emailedLink(): URL {
  const message = sentMessages().at(-1);
  const match = message?.text.match(/https?:\/\/\S+\/confirm-email\?\S+/);
  if (!match) throw new Error('No confirmation link was emailed');
  return new URL(match[0]);
}

async function signUpAndGetToken(overrides: Record<string, unknown> = {}): Promise<string> {
  expect((await register(overrides)).status).toBe(201);
  return emailedLink().searchParams.get('token')!;
}

interface Envelope {
  success: boolean;
  data?: { id?: string; email?: string; name?: string; token?: string; ok?: boolean };
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
  db.parent.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Partial<ParentRow> & { token_version?: { increment: number } } }) => {
      const row = parents.find((p) => p.id === where.id);
      if (!row) throw new Error('Record to update not found');
      const { token_version, ...rest } = data;
      Object.assign(row, rest);
      if (token_version) row.token_version += token_version.increment;
      return { ...row };
    },
  );
  db.parent.findUniqueOrThrow.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const row = parents.find((p) => p.id === where.id);
    if (!row) throw new Error('Record not found');
    return { ...row };
  });
  db.parent.updateMany.mockImplementation(
    async ({
      where,
      data,
    }: {
      where: { id: string; email_confirmed_at: null };
      data: Partial<ParentRow> & { token_version?: { increment: number } };
    }) => {
      const matching = parents.filter((p) => p.id === where.id && p.email_confirmed_at === where.email_confirmed_at);
      const { token_version, ...rest } = data;
      for (const row of matching) {
        Object.assign(row, rest);
        if (token_version) row.token_version += token_version.increment;
      }
      return { count: matching.length };
    },
  );

  db.emailConfirmationToken.findUnique.mockImplementation(async ({ where }: { where: { token_hash: string } }) =>
    tokens.find((t) => t.token_hash === where.token_hash) ?? null,
  );
  db.emailConfirmationToken.updateMany.mockImplementation(
    async ({ where, data }: { where: { id?: string; parent_id?: string; used_at?: null; expires_at?: { gt: Date } }; data: { used_at: Date } }) => {
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
  db.emailConfirmationToken.create.mockImplementation(async ({ data }: { data: Omit<TokenRow, 'id' | 'used_at' | 'created_at'> }) => {
    const row = { id: `token-${tokens.length + 1}`, used_at: null, created_at: new Date(), ...data };
    tokens.push(row);
    return row;
  });
  db.emailConfirmationToken.count.mockImplementation(async ({ where }: { where: { parent_id: string; created_at: { gte: Date } } }) =>
    tokens.filter((t) => t.parent_id === where.parent_id && t.created_at >= where.created_at.gte).length,
  );
  // Forgot-password's own token table, empty in these tests — only whether it
  // gets used at all is under test here.
  (prisma as unknown as { passwordResetToken: { updateMany: jest.Mock; create: jest.Mock; count: jest.Mock } }).passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
  (prisma as unknown as { passwordResetToken: { updateMany: jest.Mock; create: jest.Mock; count: jest.Mock } }).passwordResetToken.create.mockResolvedValue({});
  (prisma as unknown as { passwordResetToken: { updateMany: jest.Mock; create: jest.Mock; count: jest.Mock } }).passwordResetToken.count.mockResolvedValue(0);
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
  );
  mockSendEmail.mockResolvedValue(undefined);
});

// ─── Register replaces an unconfirmed account ───────────────────────────────

describe('POST /register over an unconfirmed Parent account', () => {
  it('replaces its name, surname and password, keeping the same account id', async () => {
    await signUpAndGetToken({ name: 'Болд', surname: 'Бат', password: 'first-password1' });
    const firstId = parents[0].id;

    const res = await register({ name: 'Сараа', surname: 'Дорж', password: 'second-password2' });

    expect(res.status).toBe(201);
    expect(parents).toHaveLength(1);
    expect(parents[0]).toEqual(
      expect.objectContaining({
        id: firstId,
        email: EMAIL,
        name: 'Сараа',
        surname: 'Дорж',
        password_hash: 'hashed:second-password2',
        email_confirmed_at: null,
      }),
    );
  });

  it('clears surname when the new sign-up leaves it out', async () => {
    await signUpAndGetToken({ surname: 'Бат' });

    await register({ surname: undefined });

    expect(parents[0].surname).toBeNull();
  });

  it('kills the old link and only the new one works', async () => {
    const oldToken = await signUpAndGetToken();

    const newToken = await signUpAndGetToken({ password: 'second-password2' });

    expect(oldToken).not.toBe(newToken);
    expect((await confirm(oldToken)).status).toBe(400);
    const res = await confirm(newToken);
    expect(res.status).toBe(200);
    expect((await json(res)).data?.email).toBe(EMAIL);
  });

  it('signs in with the new password only, after confirming', async () => {
    await signUpAndGetToken({ password: 'first-password1' });
    const newToken = await signUpAndGetToken({ password: 'second-password2' });
    await confirm(newToken);

    expect((await login('first-password1')).status).toBe(401);
    expect((await login('second-password2')).status).toBe(200);
  });

  it('sends exactly one fresh confirmation email on replace', async () => {
    await signUpAndGetToken();
    mockSendEmail.mockClear();

    await register({ password: 'second-password2' });

    expect(sentMessages()).toHaveLength(1);
    expect(sentMessages()[0].to).toBe(EMAIL);
  });

  it('still answers 201, replacing the account, when it is more than 7 days old', async () => {
    await signUpAndGetToken();
    parents[0].created_at = new Date(Date.now() - 8 * DAY_MS);

    const res = await register({ name: 'Сараа', password: 'second-password2' });

    expect(res.status).toBe(201);
    expect(parents).toHaveLength(1);
    expect(parents[0].name).toBe('Сараа');
  });

  it('still replaces the account past the per-parent confirmation-token cap, but sends no new link', async () => {
    await signUpAndGetToken();
    // 4 more replaces bring the hour's token count to 5 (the cap).
    for (let i = 0; i < 4; i++) {
      expect((await register({ password: `interim-password-${i}` })).status).toBe(201);
    }
    mockSendEmail.mockClear();

    const res = await register({ name: 'Сарнай', password: 'final-password1' });

    expect(res.status).toBe(201);
    expect(parents[0].name).toBe('Сарнай');
    expect(parents[0].password_hash).toBe('hashed:final-password1');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('answers DUPLICATE_EMAIL, changing nothing, when a confirm wins the race after the initial lookup', async () => {
    const token = await signUpAndGetToken();
    await confirm(token);
    // Stands in for register's own lookup having read the account a moment
    // before this confirm landed: the replace's claim inside the transaction
    // is what actually loses the race, not the lookup that precedes it.
    db.parent.findUnique.mockResolvedValueOnce({ ...parents[0], email_confirmed_at: null });

    const res = await register({ name: 'Attacker', password: 'attacker-password1' });

    expect(res.status).toBe(409);
    expect((await json(res)).error?.code).toBe('DUPLICATE_EMAIL');
    expect(parents[0].name).toBe('Болд');
    expect(parents[0].password_hash).not.toBe('hashed:attacker-password1');
  });
});

describe('replaceUnconfirmedParent racing a concurrent confirm', () => {
  it('returns null and changes nothing once the account is confirmed', async () => {
    const token = await signUpAndGetToken();
    await confirm(token);
    const confirmedAt = parents[0].email_confirmed_at;

    const result = await replaceUnconfirmedParent(parents[0].id, { name: 'Attacker', surname: null, password_hash: 'hashed:attacker-pw' });

    expect(result).toBeNull();
    expect(parents[0].name).toBe('Болд');
    expect(parents[0].password_hash).not.toBe('hashed:attacker-pw');
    expect(parents[0].email_confirmed_at).toEqual(confirmedAt);
  });
});

// ─── Sign in on a lapsed unconfirmed account ────────────────────────────────

describe('POST /login on an unconfirmed Parent account older than 7 days', () => {
  it('is INVALID_CREDENTIALS even with the right password, not EMAIL_NOT_CONFIRMED', async () => {
    await signUpAndGetToken();
    parents[0].created_at = new Date(Date.now() - 8 * DAY_MS);

    const res = await login();

    expect(res.status).toBe(401);
    expect((await json(res)).error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('is lapsed exactly at the 7-day boundary', async () => {
    await signUpAndGetToken();
    parents[0].created_at = new Date(Date.now() - UNCONFIRMED_LAPSE_MS);

    const res = await login();

    expect(res.status).toBe(401);
    expect((await json(res)).error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('just under the 7-day boundary is still EMAIL_NOT_CONFIRMED, not yet lapsed', async () => {
    await signUpAndGetToken();
    // A minute of headroom keeps this deterministic against the boundary
    // check re-reading Date.now() slightly later than this assignment.
    parents[0].created_at = new Date(Date.now() - UNCONFIRMED_LAPSE_MS + 60_000);

    const res = await login();

    expect(res.status).toBe(403);
    expect((await json(res)).error?.code).toBe('EMAIL_NOT_CONFIRMED');
  });
});

// ─── Forgot-password on a lapsed unconfirmed account ────────────────────────

describe('POST /forgot-password on an unconfirmed Parent account older than 7 days', () => {
  it('sends nothing, answering the same as for an unregistered email', async () => {
    await signUpAndGetToken();
    parents[0].created_at = new Date(Date.now() - 8 * DAY_MS);
    mockSendEmail.mockClear();

    const res = await forgotPassword({ email: EMAIL });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('still sends a link for a fresh unconfirmed account', async () => {
    await signUpAndGetToken();
    mockSendEmail.mockClear();

    await forgotPassword({ email: EMAIL });

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});

// ─── Resend on a lapsed unconfirmed account ─────────────────────────────────

describe('POST /resend-confirmation on an unconfirmed Parent account older than 7 days', () => {
  it('sends nothing, answering the same as for an unregistered email', async () => {
    await signUpAndGetToken();
    parents[0].created_at = new Date(Date.now() - 8 * DAY_MS);
    mockSendEmail.mockClear();

    const res = await resend({ email: EMAIL });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
