import { createHash } from 'node:crypto';
import { prisma } from '../../lib/db/client';
import { sendEmail, type EmailMessage } from '../../lib/email';
import { env } from '../../config/env';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// An in-memory password_reset_tokens table, so "only the newest token is live"
// is asserted on state rather than on which Prisma calls were made.

interface TokenRow {
  id: string;
  parent_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

const tokens: TokenRow[] = [];

jest.mock('../../lib/db/client', () => ({
  prisma: {
    parent: { findUnique: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/auth/jwt', () => ({ signToken: jest.fn() }));
jest.mock('../../lib/auth/password', () => ({ hashPassword: jest.fn(), comparePassword: jest.fn() }));

// The fake email sender: captures what would have been sent.
jest.mock('../../lib/email', () => ({
  ...jest.requireActual('../../lib/email'),
  sendEmail: jest.fn(),
}));

const mockFindUnique  = prisma.parent.findUnique as jest.Mock;
const mockUpdateMany  = prisma.passwordResetToken.updateMany as jest.Mock;
const mockCreate      = prisma.passwordResetToken.create as jest.Mock;
const mockCount       = prisma.passwordResetToken.count as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockSendEmail   = sendEmail as jest.MockedFunction<typeof sendEmail>;

const PARENT = { id: 'parent-uuid-1', name: 'Болд' };
const REGISTERED = 'parent@example.com';

let ipCounter = 0;
// The route answers before the token is issued and the email sent (so a
// registered email isn't slower); settle() lets that background work finish.
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function forgotPassword(body: unknown) {
  // A fresh IP per request keeps these tests clear of the route's rate limit.
  const res = await authRouter.request('/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${++ipCounter}` },
    body: JSON.stringify(body),
  });
  await settle();
  return res;
}

const sentEmails = () => mockSendEmail.mock.calls.map(([message]) => message as EmailMessage);

function tokenFromLink(message: EmailMessage): string {
  const match = message.text.match(/\/reset-password\?token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`No reset link in:\n${message.text}`);
  return match[1];
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const liveTokens = () => tokens.filter((t) => t.used_at === null && t.expires_at.getTime() > Date.now());

beforeEach(() => {
  jest.clearAllMocks();
  tokens.length = 0;

  mockFindUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
    where.email === REGISTERED ? PARENT : null,
  );
  mockUpdateMany.mockImplementation(async ({ where, data }: { where: { parent_id: string; used_at: null }; data: { used_at: Date } }) => {
    const matching = tokens.filter((t) => t.parent_id === where.parent_id && t.used_at === null);
    for (const t of matching) t.used_at = data.used_at;
    return { count: matching.length };
  });
  mockCreate.mockImplementation(async ({ data }: { data: Omit<TokenRow, 'id' | 'used_at' | 'created_at'> }) => {
    const row = { id: `token-${tokens.length + 1}`, used_at: null, created_at: new Date(), ...data };
    tokens.push(row);
    return row;
  });
  mockCount.mockImplementation(async ({ where }: { where: { parent_id: string; created_at: { gte: Date } } }) =>
    tokens.filter((t) => t.parent_id === where.parent_id && t.created_at >= where.created_at.gte).length,
  );
  mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  mockSendEmail.mockResolvedValue(undefined);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /forgot-password', () => {
  it('responds identically for a registered and an unregistered email', async () => {
    const registered = await forgotPassword({ email: REGISTERED });
    const unregistered = await forgotPassword({ email: 'nobody@example.com' });

    expect(registered.status).toBe(200);
    expect(unregistered.status).toBe(registered.status);
    const body = await registered.json();
    expect(body).toEqual({ success: true, data: { ok: true } });
    expect(await unregistered.json()).toEqual(body);
  });

  it('emails the parent a reset link, and nobody else', async () => {
    await forgotPassword({ email: 'nobody@example.com' });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(tokens).toHaveLength(0);

    await forgotPassword({ email: REGISTERED });
    expect(sentEmails()).toHaveLength(1);
    const [message] = sentEmails();
    expect(message.to).toBe(REGISTERED);
    expect(message.subject).toBe('ОРТО — нууц үг сэргээх');
    expect(message.text).toContain('Сайн байна уу, Болд,');
    expect(message.text).toContain(`${env.WEB_URL}/reset-password?token=${tokenFromLink(message)}`);
  });

  it('stores only a hash of the token, expiring in 30 minutes', async () => {
    const before = Date.now();
    await forgotPassword({ email: REGISTERED });

    const raw = tokenFromLink(sentEmails()[0]);
    expect(raw.length).toBeGreaterThanOrEqual(43); // 32 random bytes, base64url
    expect(tokens).toHaveLength(1);
    const [row] = tokens;
    expect(row.parent_id).toBe(PARENT.id);
    expect(row.token_hash).toBe(sha256(raw));
    expect(JSON.stringify(row)).not.toContain(raw);

    const ttl = row.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(30 * 60 * 1000);
    expect(ttl).toBeLessThan(30 * 60 * 1000 + 5_000);
  });

  it('leaves only the newest token live after two requests', async () => {
    await forgotPassword({ email: REGISTERED });
    await forgotPassword({ email: REGISTERED });

    expect(tokens).toHaveLength(2);
    const [first, second] = sentEmails().map(tokenFromLink);
    expect(first).not.toBe(second);
    expect(liveTokens().map((t) => t.token_hash)).toEqual([sha256(second)]);
  });

  it('answers without waiting for the token or the email', async () => {
    let releaseEmail!: () => void;
    mockSendEmail.mockImplementation(() => new Promise<void>((resolve) => (releaseEmail = resolve)));

    const res = await authRouter.request('/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.250' },
      body: JSON.stringify({ email: REGISTERED }),
    });

    expect(res.status).toBe(200);
    await settle();
    expect(mockSendEmail).toHaveBeenCalledTimes(1); // still pending when the response went out
    releaseEmail();
  });

  it('issues at most 5 links per parent per hour, whatever the IP, and answers the same after', async () => {
    for (let i = 0; i < 5; i++) await forgotPassword({ email: REGISTERED });
    expect(tokens).toHaveLength(5);
    const newest = tokenFromLink(sentEmails()[4]);

    const capped = await forgotPassword({ email: REGISTERED });

    expect(capped.status).toBe(200);
    expect(await capped.json()).toEqual({ success: true, data: { ok: true } });
    expect(tokens).toHaveLength(5);
    expect(mockSendEmail).toHaveBeenCalledTimes(5);
    expect(liveTokens().map((t) => t.token_hash)).toEqual([sha256(newest)]);
  });

  it('still responds with success when the email cannot be sent', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSendEmail.mockRejectedValue(new Error('Resend rejected the email: 500'));

    const res = await forgotPassword({ email: REGISTERED });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(REGISTERED);
    errorSpy.mockRestore();
  });

  it('400 — rejects a body without a valid email', async () => {
    for (const body of [{}, { email: 'not-an-email' }, null]) {
      const res = await forgotPassword(body);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
