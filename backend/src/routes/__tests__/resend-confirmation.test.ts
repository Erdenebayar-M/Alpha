import { createHash } from 'node:crypto';
import { prisma } from '../../lib/db/client';
import { sendEmail, type EmailMessage } from '../../lib/email';
import { env } from '../../config/env';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// An in-memory email_confirmation_tokens table, so "only the newest token is
// live" is asserted on state rather than on which Prisma calls were made.

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
    emailConfirmationToken: { updateMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/auth/jwt', () => ({ signToken: jest.fn() }));
jest.mock('../../lib/auth/password', () => ({ hashPassword: jest.fn(), comparePassword: jest.fn() }));
jest.mock('../../lib/email', () => ({
  ...jest.requireActual('../../lib/email'),
  sendEmail: jest.fn(),
}));

const mockFindUnique  = prisma.parent.findUnique as jest.Mock;
const mockUpdateMany  = prisma.emailConfirmationToken.updateMany as jest.Mock;
const mockCreate      = prisma.emailConfirmationToken.create as jest.Mock;
const mockCount       = prisma.emailConfirmationToken.count as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockSendEmail   = sendEmail as jest.MockedFunction<typeof sendEmail>;

const UNCONFIRMED = 'new@example.com';
const CONFIRMED = 'done@example.com';
const PARENTS: Record<string, { id: string; name: string; email_confirmed_at: Date | null }> = {
  [UNCONFIRMED]: { id: 'parent-uuid-1', name: 'Болд', email_confirmed_at: null },
  [CONFIRMED]: { id: 'parent-uuid-2', name: 'Дорж', email_confirmed_at: new Date() },
};

let ipCounter = 0;
// The route answers before the token is issued and the email sent; settle()
// lets that background work finish.
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function resend(body: unknown) {
  // A fresh IP per request keeps these tests clear of the route's rate limit.
  const res = await authRouter.request('/resend-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${++ipCounter}` },
    body: JSON.stringify(body),
  });
  await settle();
  return res;
}

const sentEmails = () => mockSendEmail.mock.calls.map(([message]) => message as EmailMessage);

function tokenFromLink(message: EmailMessage): string {
  const match = message.text.match(/\/confirm-email\?token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`No confirmation link in:\n${message.text}`);
  return match[1];
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const liveTokens = () => tokens.filter((t) => t.used_at === null && t.expires_at.getTime() > Date.now());

beforeEach(() => {
  jest.clearAllMocks();
  tokens.length = 0;

  mockFindUnique.mockImplementation(async ({ where }: { where: { email: string } }) => PARENTS[where.email] ?? null);
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

describe('POST /resend-confirmation', () => {
  it('answers identically for an unconfirmed, a confirmed and an unknown email', async () => {
    const unconfirmed = await resend({ email: UNCONFIRMED });
    const confirmed = await resend({ email: CONFIRMED });
    const unknown = await resend({ email: 'nobody@example.com' });

    expect(unconfirmed.status).toBe(200);
    const body = await unconfirmed.json();
    expect(body).toEqual({ success: true, data: { ok: true } });
    for (const other of [confirmed, unknown]) {
      expect(other.status).toBe(200);
      expect(await other.json()).toEqual(body);
    }
  });

  it('emails a confirmation link to an unconfirmed parent, and nobody else', async () => {
    await resend({ email: CONFIRMED });
    await resend({ email: 'nobody@example.com' });
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(tokens).toHaveLength(0);

    await resend({ email: UNCONFIRMED });
    expect(sentEmails()).toHaveLength(1);
    const [message] = sentEmails();
    expect(message.to).toBe(UNCONFIRMED);
    expect(message.text).toContain('Болд');
    expect(message.text).toContain(`${env.WEB_URL}/confirm-email?token=${tokenFromLink(message)}`);
  });

  it('finds the parent whatever the capitals or surrounding spaces of the email', async () => {
    await resend({ email: '  New@Example.COM ' });

    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0].to).toBe(UNCONFIRMED);
  });

  it('carries next into the link', async () => {
    await resend({ email: UNCONFIRMED, next: '/learners' });

    const url = new URL(sentEmails()[0].text.match(/https?:\/\/\S+\/confirm-email\?\S+/)![0]);
    expect(url.searchParams.get('next')).toBe('/learners');
  });

  it('stores only a hash of the token, expiring in 24 hours', async () => {
    const before = Date.now();
    await resend({ email: UNCONFIRMED });

    const raw = tokenFromLink(sentEmails()[0]);
    expect(tokens).toHaveLength(1);
    const [row] = tokens;
    expect(row.parent_id).toBe(PARENTS[UNCONFIRMED].id);
    expect(row.token_hash).toBe(sha256(raw));
    expect(JSON.stringify(row)).not.toContain(raw);
    const ttl = row.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(ttl).toBeLessThan(24 * 60 * 60 * 1000 + 5_000);
  });

  it('leaves only the newest token live after two resends', async () => {
    await resend({ email: UNCONFIRMED });
    await resend({ email: UNCONFIRMED });

    expect(tokens).toHaveLength(2);
    const [first, second] = sentEmails().map(tokenFromLink);
    expect(first).not.toBe(second);
    expect(liveTokens().map((t) => t.token_hash)).toEqual([sha256(second)]);
  });

  it('answers without waiting for the token or the email', async () => {
    let releaseEmail!: () => void;
    mockSendEmail.mockImplementation(() => new Promise<void>((resolve) => (releaseEmail = resolve)));

    const res = await authRouter.request('/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.250' },
      body: JSON.stringify({ email: UNCONFIRMED }),
    });

    expect(res.status).toBe(200);
    await settle();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    releaseEmail();
  });

  it('issues at most 5 links per parent per hour, whatever the IP, and answers the same after', async () => {
    for (let i = 0; i < 5; i++) await resend({ email: UNCONFIRMED });
    expect(tokens).toHaveLength(5);
    const newest = tokenFromLink(sentEmails()[4]);

    const capped = await resend({ email: UNCONFIRMED });

    expect(capped.status).toBe(200);
    expect(await capped.json()).toEqual({ success: true, data: { ok: true } });
    expect(tokens).toHaveLength(5);
    expect(mockSendEmail).toHaveBeenCalledTimes(5);
    expect(liveTokens().map((t) => t.token_hash)).toEqual([sha256(newest)]);
  });

  it('still responds with success when the email cannot be sent', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSendEmail.mockRejectedValue(new Error('Resend rejected the email: 500'));

    const res = await resend({ email: UNCONFIRMED });

    expect(res.status).toBe(200);
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(UNCONFIRMED);
    errorSpy.mockRestore();
  });

  it('400 — rejects a body without a valid email', async () => {
    for (const body of [{}, { email: 'not-an-email' }, null]) {
      const res = await resend(body);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('429 — blocks the 6th request from the same IP within the window', async () => {
    const send = () =>
      authRouter.request('/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.90' },
        body: JSON.stringify({ email: 'nobody@example.com' }),
      });
    for (let i = 0; i < 5; i++) expect((await send()).status).toBe(200);

    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });
});
