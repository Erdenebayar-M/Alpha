import { Hono } from 'hono';
import { withAuth, type AuthEnv } from '../middleware';
import { verifyToken } from '../jwt';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the jwt module so this test never touches jose (ESM-only package).
// The middleware's job is HTTP behaviour, not JWT cryptography — that lives
// in jwt.test.ts when/if the jwt unit is tested in isolation.
jest.mock('../jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

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
  beforeEach(() => jest.clearAllMocks());

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
    mockVerifyToken.mockResolvedValue({ parent_id: 'parent-uuid-1' });

    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer valid.token.here' },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.parent_id).toBe('parent-uuid-1');
    expect(mockVerifyToken).toHaveBeenCalledWith('valid.token.here');
  });
});
