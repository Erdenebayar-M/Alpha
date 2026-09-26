import { Hono } from 'hono';
import { withAuth, type AuthEnv } from '../middleware';
import { verifyToken } from '../jwt';
import { prisma } from '../../db/client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the jwt module so this test never touches jose (ESM-only package).
// The middleware's job is HTTP behaviour, not JWT cryptography — that lives
// in jwt.test.ts when/if the jwt unit is tested in isolation.
jest.mock('../jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

jest.mock('../../db/client', () => ({
  prisma: { parent: { findUnique: jest.fn() } },
}));

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockFindParent = prisma.parent.findUnique as jest.Mock;

// ─── Test app ────────────────────────────────────────────────────────────────

function makeApp() {
  const app = new Hono<AuthEnv>();
  app.use('/protected', withAuth);
  app.get('/protected', (c) => c.json({ parent_id: c.get('parent_id') }));
  return app;
}

interface ApiResponse {
  error?: { code: string; message: string };
  parent_id?: string;
}

async function json(res: Response): Promise<ApiResponse> {
  return res.json() as Promise<ApiResponse>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('withAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindParent.mockResolvedValue({ token_version: 0 });
  });

  it('401 — no Authorization header', async () => {
    const res = await makeApp().request('/protected');

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error!.code).toBe('UNAUTHORIZED');
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('401 — Authorization header without Bearer prefix', async () => {
    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error!.code).toBe('UNAUTHORIZED');
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('401 — expired token (verifyToken rejects)', async () => {
    mockVerifyToken.mockRejectedValue(new Error('JWTExpired'));

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer expired.token.here' },
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error!.code).toBe('UNAUTHORIZED');
  });

  it('401 — malformed token (verifyToken rejects)', async () => {
    mockVerifyToken.mockRejectedValue(new Error('JWSInvalid'));

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer not.a.real.jwt' },
    });

    expect(res.status).toBe(401);
    expect(mockVerifyToken).toHaveBeenCalledWith('not.a.real.jwt');
  });

  it('200 — valid token: passes through and sets parent_id on context', async () => {
    mockVerifyToken.mockResolvedValue({ parent_id: 'parent-uuid-1', token_version: 0 });

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer valid.token.here' },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.parent_id).toBe('parent-uuid-1');
    expect(mockVerifyToken).toHaveBeenCalledWith('valid.token.here');
  });

  it('401 — token minted before a Password reset (older token_version)', async () => {
    mockVerifyToken.mockResolvedValue({ parent_id: 'parent-uuid-1', token_version: 0 });
    mockFindParent.mockResolvedValue({ token_version: 1 });

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer pre-reset.token' },
    });

    expect(res.status).toBe(401);
    expect((await json(res)).error!.code).toBe('UNAUTHORIZED');
    expect(mockFindParent).toHaveBeenCalledWith({ where: { id: 'parent-uuid-1' }, select: { token_version: true } });
  });

  it('200 — token carrying the current token_version', async () => {
    mockVerifyToken.mockResolvedValue({ parent_id: 'parent-uuid-1', token_version: 1 });
    mockFindParent.mockResolvedValue({ token_version: 1 });

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer post-reset.token' },
    });

    expect(res.status).toBe(200);
  });

  it('401 — token belonging to a deleted Parent account', async () => {
    mockVerifyToken.mockResolvedValue({ parent_id: 'deleted-parent', token_version: 0 });
    mockFindParent.mockResolvedValue(null);

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer orphan.token' },
    });

    expect(res.status).toBe(401);
    expect((await json(res)).error!.code).toBe('UNAUTHORIZED');
  });

  it('a failed Parent account lookup is not answered as a sign-out', async () => {
    mockVerifyToken.mockResolvedValue({ parent_id: 'parent-uuid-1', token_version: 0 });
    mockFindParent.mockRejectedValue(new Error('connection refused'));
    const app = makeApp();
    app.onError((_err, c) => c.json({ error: { code: 'INTERNAL_ERROR', message: '' } }, 500));

    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid.token.here' },
    });

    expect(res.status).toBe(500);
  });
});
