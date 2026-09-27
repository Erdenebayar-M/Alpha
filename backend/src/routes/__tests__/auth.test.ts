import { prisma } from '../../lib/db/client';
import { hashPassword, comparePassword } from '../../lib/auth/password';
import { signToken } from '../../lib/auth/jwt';
import authRouter from '../auth';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    parent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../../lib/auth/jwt', () => ({
  signToken: jest.fn(),
}));

const mockFindUnique = prisma.parent.findUnique as jest.MockedFunction<typeof prisma.parent.findUnique>;
const mockCreate     = prisma.parent.create    as jest.MockedFunction<typeof prisma.parent.create>;
const mockHash       = hashPassword            as jest.MockedFunction<typeof hashPassword>;
const mockCompare    = comparePassword         as jest.MockedFunction<typeof comparePassword>;
const mockSign       = signToken               as jest.MockedFunction<typeof signToken>;

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

interface AuthBody {
  success?: boolean;
  data?: { id?: string; email?: string; name?: string; token?: string };
  error?: { code: string; message: string };
}

async function json(res: Response): Promise<AuthBody> {
  return res.json() as Promise<AuthBody>;
}

const FAKE_PARENT = {
  id: 'parent-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  password_hash: 'hashed-pw',
  token_version: 0,
  created_at: new Date(),
};

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 — returns id, email, name, token on success', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed-pw' as never);
    mockCreate.mockResolvedValue(FAKE_PARENT as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    const res = await post('/register', {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data).toEqual({
      id: FAKE_PARENT.id,
      email: FAKE_PARENT.email,
      name: FAKE_PARENT.name,
      token: 'jwt-token',
    });
    expect(mockHash).toHaveBeenCalledWith('password123');
    expect(mockSign).toHaveBeenCalledWith({ parent_id: FAKE_PARENT.id, token_version: 0 });
  });

  it('stores the optional surname', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed-pw' as never);
    mockCreate.mockResolvedValue({ ...FAKE_PARENT, surname: 'Бат' } as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    const res = await post('/register', {
      email: 'test@example.com',
      name: 'Test User',
      surname: 'Бат',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: 'test@example.com', name: 'Test User', surname: 'Бат', password_hash: 'hashed-pw' },
    });
  });

  it('stores the email trimmed and lowercased', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed-pw' as never);
    mockCreate.mockResolvedValue(FAKE_PARENT as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    const res = await post('/register', {
      email: '  Bat@Gmail.com ',
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'bat@gmail.com' }),
    });
  });

  it('409 — duplicate email in different capitals is DUPLICATE_EMAIL, never a second Parent', async () => {
    mockFindUnique.mockImplementation((async ({ where }: { where: { email: string } }) =>
      where.email === 'bat@gmail.com' ? { ...FAKE_PARENT, email: 'bat@gmail.com' } : null) as never);

    const res = await post('/register', {
      email: 'BAT@Gmail.COM',
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect((await json(res)).error!.code).toBe('DUPLICATE_EMAIL');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('409 — duplicate email', async () => {
    mockFindUnique.mockResolvedValue(FAKE_PARENT as never);

    const res = await post('/register', {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error!.code).toBe('DUPLICATE_EMAIL');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('400 — missing email field', async () => {
    const res = await post('/register', {
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
  });

  it('400 — invalid email format', async () => {
    const res = await post('/register', {
      email: 'not-an-email',
      name: 'Test User',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
  });

  it('400 — password too short', async () => {
    const res = await post('/register', {
      email: 'test@example.com',
      name: 'Test User',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 — returns id, email, name, token on success', async () => {
    mockFindUnique.mockResolvedValue(FAKE_PARENT as never);
    mockCompare.mockResolvedValue(true as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    const res = await post('/login', {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toEqual({
      id: FAKE_PARENT.id,
      email: FAKE_PARENT.email,
      name: FAKE_PARENT.name,
      token: 'jwt-token',
    });
  });

  it("signs the token with the Parent account's current token_version", async () => {
    mockFindUnique.mockResolvedValue({ ...FAKE_PARENT, token_version: 2 } as never);
    mockCompare.mockResolvedValue(true as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    await post('/login', { email: 'test@example.com', password: 'password123' });

    expect(mockSign).toHaveBeenCalledWith({ parent_id: FAKE_PARENT.id, token_version: 2 });
  });

  it('200 — signs in with different capitals and surrounding spaces than at sign up', async () => {
    mockFindUnique.mockImplementation((async ({ where }: { where: { email: string } }) =>
      where.email === 'bat@gmail.com' ? { ...FAKE_PARENT, email: 'bat@gmail.com' } : null) as never);
    mockCompare.mockResolvedValue(true as never);
    mockSign.mockResolvedValue('jwt-token' as never);

    const res = await post('/login', { email: ' Bat@Gmail.com ', password: 'password123' });

    expect(res.status).toBe(200);
    expect((await json(res)).data!.token).toBe('jwt-token');
  });

  it('401 — wrong password', async () => {
    mockFindUnique.mockResolvedValue(FAKE_PARENT as never);
    mockCompare.mockResolvedValue(false as never);

    const res = await post('/login', {
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error!.code).toBe('INVALID_CREDENTIALS');
    expect(mockSign).not.toHaveBeenCalled();
  });

  it('401 — email not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await post('/login', {
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error!.code).toBe('INVALID_CREDENTIALS');
  });

  it('401 — a Google-only Parent account (no password) gets the same generic error', async () => {
    mockFindUnique.mockResolvedValue({ ...FAKE_PARENT, password_hash: null, google_id: 'google-sub-1' } as never);
    // Even a comparison that would accept anything must not let this through.
    mockCompare.mockResolvedValue(true as never);

    // Its own IP: this suite's other logins already fill the default bucket.
    const res = await authRouter.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.77' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });

    expect(res.status).toBe(401);
    expect((await json(res)).error!.code).toBe('INVALID_CREDENTIALS');
    expect(mockSign).not.toHaveBeenCalled();
  });

  it('400 — missing email', async () => {
    const res = await post('/login', { password: 'password123' });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
  });
});
