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

function post(path: string, body: unknown) {
  return authRouter.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

interface AuthBody {
  id?: string;
  email?: string;
  name?: string;
  token?: string;
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
    expect(body).toEqual({
      id: FAKE_PARENT.id,
      email: FAKE_PARENT.email,
      name: FAKE_PARENT.name,
      token: 'jwt-token',
    });
    expect(mockHash).toHaveBeenCalledWith('password123');
    expect(mockSign).toHaveBeenCalledWith({ parent_id: FAKE_PARENT.id });
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
    expect(body.error!.code).toBe('CONFLICT');
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
    expect(body).toEqual({
      id: FAKE_PARENT.id,
      email: FAKE_PARENT.email,
      name: FAKE_PARENT.name,
      token: 'jwt-token',
    });
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
    expect(body.error!.code).toBe('UNAUTHORIZED');
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
    expect(body.error!.code).toBe('UNAUTHORIZED');
  });

  it('400 — missing email', async () => {
    const res = await post('/login', { password: 'password123' });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
  });
});
