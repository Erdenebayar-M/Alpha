// Hoisted before imports: the limiter reads env at module load, and the local
// backend/.env sets RATE_LIMIT_DISABLED=true (load testing) — this test must
// run with the limiter active regardless of the developer's .env.
jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET:         'test-admin-secret-that-is-32chars-ok',
    GEMINI_API_KEY:       'AIzaFake',
    OPENROUTER_API_KEY:   'sk-or-fake',
    OPENAI_API_KEY:       undefined,
    NODE_ENV:             'test',
    DATABASE_URL:         'postgresql://localhost/test',
    JWT_SECRET:           'x'.repeat(64),
    JWT_EXPIRES_IN:       '7d',
    BCRYPT_ROUNDS:        12,
    CORS_ORIGIN:          'http://localhost:3000',
    PORT:                 3001,
    RATE_LIMIT_DISABLED:  undefined,
    R2_ACCOUNT_ID:        undefined,
    R2_ACCESS_KEY_ID:     undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET_NAME:       undefined,
    R2_PUBLIC_URL:        undefined,
    ALLOW_PROD_SEED:      undefined,
    RESEND_API_KEY:       undefined,
    EMAIL_FROM:           undefined,
    WEB_URL:              'http://localhost:3000',
  },
}));

import { prisma } from '../../lib/db/client';
import { comparePassword } from '../../lib/auth/password';
import { signToken } from '../../lib/auth/jwt';
import authRouter from '../auth';

jest.mock('../../lib/db/client', () => ({
  prisma: {
    parent: { findUnique: jest.fn(), create: jest.fn() },
    passwordResetToken: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));
jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));
jest.mock('../../lib/auth/jwt', () => ({ signToken: jest.fn() }));

const mockFindUnique = prisma.parent.findUnique as jest.MockedFunction<typeof prisma.parent.findUnique>;
const mockCompare    = comparePassword         as jest.MockedFunction<typeof comparePassword>;
const mockSign       = signToken               as jest.MockedFunction<typeof signToken>;

function login(ip: string) {
  return authRouter.request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email: 'a@b.com', password: 'wrongpassword' }),
  });
}

describe('POST /login — rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockCompare.mockResolvedValue(false as never);
    mockSign.mockResolvedValue('token' as never);
  });

  it('blocks the 6th login attempt from the same IP within the window', async () => {
    const ip = '203.0.113.42';
    for (let i = 0; i < 5; i++) {
      const res = await login(ip);
      expect(res.status).toBe(401);
    }
    const blocked = await login(ip);
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });

  it('does not block a different IP', async () => {
    const a = '203.0.113.50';
    const b = '203.0.113.51';
    for (let i = 0; i < 5; i++) await login(a);
    const blocked = await login(a);
    expect(blocked.status).toBe(429);

    const fresh = await login(b);
    expect(fresh.status).toBe(401);
  });
});

function forgotPassword(ip: string) {
  return authRouter.request('/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email: 'a@b.com' }),
  });
}

describe('POST /forgot-password — rate limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
  });

  it('blocks the 6th request from the same IP within the window', async () => {
    const ip = '203.0.113.60';
    for (let i = 0; i < 5; i++) {
      const res = await forgotPassword(ip);
      expect(res.status).toBe(200);
    }
    const blocked = await forgotPassword(ip);
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });

  it('has its own bucket, apart from login', async () => {
    const ip = '203.0.113.61';
    for (let i = 0; i < 6; i++) await login(ip);
    expect((await login(ip)).status).toBe(429);

    expect((await forgotPassword(ip)).status).toBe(200);
  });
});

function resetPassword(ip: string) {
  return authRouter.request('/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ token: 'unknown-token', password: 'new-password' }),
  });
}

describe('POST /reset-password — rate limiting', () => {
  it('blocks the 11th attempt from the same IP within the window', async () => {
    const ip = '203.0.113.70';
    for (let i = 0; i < 10; i++) {
      const res = await resetPassword(ip);
      expect(res.status).toBe(400);
    }
    const blocked = await resetPassword(ip);
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });

  it('has its own bucket, apart from login', async () => {
    const ip = '203.0.113.71';
    for (let i = 0; i < 6; i++) await login(ip);
    expect((await login(ip)).status).toBe(429);

    expect((await resetPassword(ip)).status).toBe(400);
  });
});
