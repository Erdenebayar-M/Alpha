import { prisma } from '../../lib/db/client';
import { comparePassword } from '../../lib/auth/password';
import { signToken } from '../../lib/auth/jwt';
import authRouter from '../auth';

jest.mock('../../lib/db/client', () => ({
  prisma: { parent: { findUnique: jest.fn(), create: jest.fn() } },
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
