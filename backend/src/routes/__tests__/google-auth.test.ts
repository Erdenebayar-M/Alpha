import { generateKeyPair, exportJWK, SignJWT, type CryptoKey, type JWK } from 'jose';
import { prisma } from '../../lib/db/client';
import authRouter from '../auth';

// ─── Fakes ───────────────────────────────────────────────────────────────────
// An in-memory parents table, and Google faked at the fetch boundary: its
// token endpoint hands back an id_token this test signs with its own RS256
// key, published through the fake certs endpoint. What is judged is the
// response and the parents table afterwards.

const CLIENT_ID = 'client-id.apps.googleusercontent.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const KID = 'google-key-1';

jest.mock('../../config/env', () => ({
  env: {
    ...jest.requireActual('../../config/env').env,
    GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'client-secret',
  },
}));

interface ParentRow {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  password_hash: string | null;
  google_id: string | null;
  token_version: number;
}

const parents: ParentRow[] = [];

jest.mock('../../lib/db/client', () => ({
  prisma: { parent: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } },
}));
jest.mock('../../lib/auth/jwt', () => ({
  signToken: jest.fn(async ({ parent_id, token_version }: { parent_id: string; token_version: number }) =>
    `session.${parent_id}.${token_version}`,
  ),
}));

const db = prisma as unknown as { parent: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock } };

let googleKey: CryptoKey;
let publishedJwks: JWK[];
let tokenRequests: URLSearchParams[];
/** What the fake token endpoint answers; a test swaps it to fail the exchange. */
let tokenResponse: () => Response;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nowSeconds = () => Math.floor(Date.now() / 1000);

interface IdTokenOptions {
  claims?: Record<string, unknown>;
  audience?: string;
  issuer?: string;
  expiresAt?: number;
  key?: CryptoKey;
  kid?: string;
}

function idToken({ claims = {}, audience = CLIENT_ID, issuer = 'https://accounts.google.com', expiresAt, key, kid = KID }: IdTokenOptions = {}) {
  return new SignJWT({ email: 'dorj@example.com', email_verified: true, given_name: 'Дорж', family_name: 'Бат', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject((claims.sub as string | undefined) ?? 'google-sub-1')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt ?? nowSeconds() + 3600)
    .sign(key ?? googleKey);
}

/** Has Google's token endpoint answer the next exchange with this id_token. */
async function googleIssues(options: IdTokenOptions = {}) {
  const id_token = await idToken(options);
  tokenResponse = () => Response.json({ access_token: 'access', id_token, token_type: 'Bearer', expires_in: 3599 });
}

let ipCounter = 0;
const GOOD_BODY = {
  code: 'auth-code-from-google',
  code_verifier: 'v'.repeat(43),
  redirect_uri: 'http://localhost:3000/api/auth/google/callback',
};

function signInWithGoogle(body: unknown = GOOD_BODY) {
  return authRouter.request('/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `203.0.113.${++ipCounter}` },
    body: JSON.stringify(body),
  });
}

interface Envelope {
  success: boolean;
  data?: { id?: string; email?: string; name?: string; token?: string };
  error?: { code: string };
}
const json = async (res: Response) => (await res.json()) as Envelope;

async function expectFailure(res: Response) {
  expect(res.status).toBe(401);
  expect((await json(res)).error?.code).toBe('GOOGLE_AUTH_FAILED');
}

function seedParent(row: Partial<ParentRow>) {
  parents.push({
    id: `parent-${parents.length + 1}`,
    email: 'someone@example.com',
    name: 'Нэр',
    surname: null,
    password_hash: 'hashed:pw',
    google_id: null,
    token_version: 0,
    ...row,
  });
}

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  googleKey = privateKey;
  firstJwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256', use: 'sig' };
});
let firstJwk: JWK;

const realFetch = global.fetch;
afterAll(() => {
  global.fetch = realFetch;
});

beforeEach(async () => {
  jest.clearAllMocks();
  parents.length = 0;
  tokenRequests = [];
  publishedJwks = [firstJwk];
  await googleIssues();
  // Every rejection is logged; the logs aren't what these tests judge.
  jest.spyOn(console, 'error').mockImplementation(() => {});

  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url === TOKEN_URL) {
      tokenRequests.push(new URLSearchParams(String(init?.body)));
      return tokenResponse();
    }
    if (url === CERTS_URL) return Response.json({ keys: publishedJwks });
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  const matches = (p: ParentRow, where: Partial<ParentRow>) =>
    Object.entries(where).every(([k, v]) => p[k as keyof ParentRow] === v);
  db.parent.findUnique.mockImplementation(async ({ where }: { where: Partial<ParentRow> }) =>
    parents.find((p) => matches(p, where)) ?? null,
  );
  db.parent.findFirst.mockImplementation(async ({ where }: { where: { email: { equals: string; mode: 'insensitive' } } }) =>
    parents.find((p) => p.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
  );
  db.parent.create.mockImplementation(async ({ data }: { data: Partial<ParentRow> }) => {
    const row: ParentRow = {
      id: `parent-${parents.length + 1}`,
      surname: null,
      password_hash: null,
      google_id: null,
      token_version: 0,
      // Prisma stores an omitted (undefined) column as its default.
      ...(Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Pick<ParentRow, 'email' | 'name'>),
    };
    parents.push(row);
    return { ...row };
  });
  db.parent.update.mockImplementation(async ({ where, data }: { where: Partial<ParentRow>; data: object }) => {
    const row = parents.find((p) => matches(p, where));
    if (!row) throw new Error('Record to update not found');
    const { token_version, ...rest } = data as Omit<Partial<ParentRow>, 'token_version'> & { token_version?: { increment: number } };
    Object.assign(row, rest);
    if (token_version) row.token_version += token_version.increment;
    return { ...row };
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /google', () => {
  it('exchanges the code with PKCE and the client secret', async () => {
    await signInWithGoogle();

    expect(tokenRequests).toHaveLength(1);
    expect(Object.fromEntries(tokenRequests[0])).toEqual({
      grant_type: 'authorization_code',
      code: GOOD_BODY.code,
      code_verifier: GOOD_BODY.code_verifier,
      redirect_uri: GOOD_BODY.redirect_uri,
      client_id: CLIENT_ID,
      client_secret: 'client-secret',
    });
  });

  it('creates a Parent account with no password, named from Google', async () => {
    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      success: true,
      data: { id: 'parent-1', email: 'dorj@example.com', name: 'Дорж', token: 'session.parent-1.0' },
    });
    expect(parents).toEqual([
      expect.objectContaining({ email: 'dorj@example.com', name: 'Дорж', surname: 'Бат', google_id: 'google-sub-1', password_hash: null }),
    ]);
    expect(res.headers.get('set-cookie')).toContain('auth_token=session.parent-1.0');
  });

  it('finds the Parent account by google_id, even after the Google email changed', async () => {
    seedParent({ email: 'old-address@example.com', google_id: 'google-sub-1', token_version: 3 });

    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect((await json(res)).data).toEqual({ id: 'parent-1', email: 'old-address@example.com', name: 'Нэр', token: 'session.parent-1.3' });
    expect(parents).toHaveLength(1);
  });

  // Password sign-ups don't prove they own the email, so a password set before
  // the verified owner arrives may be someone else's: linking drops it and
  // signs out every existing session. Password reset sets a new one.
  it('links a password Parent account with the same verified email, dropping its password and sessions', async () => {
    seedParent({ email: 'dorj@example.com', token_version: 2 });

    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect((await json(res)).data).toEqual({ id: 'parent-1', email: 'dorj@example.com', name: 'Нэр', token: 'session.parent-1.3' });
    expect(parents).toEqual([expect.objectContaining({ google_id: 'google-sub-1', password_hash: null, token_version: 3, name: 'Нэр' })]);
  });

  it('keeps the password and sessions on later sign-ins once linked', async () => {
    seedParent({ email: 'dorj@example.com', google_id: 'google-sub-1', password_hash: 'hashed:set-after-linking', token_version: 4 });

    await signInWithGoogle();

    expect(parents).toEqual([expect.objectContaining({ password_hash: 'hashed:set-after-linking', token_version: 4 })]);
  });

  it('links by email regardless of case', async () => {
    seedParent({ email: 'Dorj@Example.com' });

    const res = await signInWithGoogle();

    expect((await json(res)).data?.id).toBe('parent-1');
    expect(parents).toEqual([expect.objectContaining({ email: 'Dorj@Example.com', google_id: 'google-sub-1' })]);
  });

  it('stores a new Google email lowercased', async () => {
    await googleIssues({ claims: { email: 'New.Parent@Example.com' } });

    await signInWithGoogle();

    expect(parents).toEqual([expect.objectContaining({ email: 'new.parent@example.com' })]);
  });

  it('rejects an email already linked to a different Google account', async () => {
    seedParent({ email: 'dorj@example.com', google_id: 'another-google-sub' });

    await expectFailure(await signInWithGoogle());
    expect(parents).toEqual([expect.objectContaining({ google_id: 'another-google-sub' })]);
  });

  it('names a Parent account from the email when Google gives no name', async () => {
    await googleIssues({ claims: { given_name: undefined, family_name: undefined } });

    await signInWithGoogle();

    expect(parents).toEqual([expect.objectContaining({ name: 'dorj', surname: null })]);
  });

  it('rejects an unverified email, creating and linking nothing', async () => {
    seedParent({ email: 'dorj@example.com' });
    await googleIssues({ claims: { email_verified: false } });

    await expectFailure(await signInWithGoogle());
    expect(parents).toEqual([expect.objectContaining({ google_id: null })]);
  });

  it('rejects an id_token signed with a key Google did not publish', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    await googleIssues({ key: privateKey });

    await expectFailure(await signInWithGoogle());
    expect(parents).toHaveLength(0);
  });

  it('rejects an expired id_token', async () => {
    await googleIssues({ expiresAt: nowSeconds() - 600 });

    await expectFailure(await signInWithGoogle());
  });

  it('rejects an id_token for another audience', async () => {
    await googleIssues({ audience: 'someone-else.apps.googleusercontent.com' });

    await expectFailure(await signInWithGoogle());
  });

  it('rejects an id_token from another issuer', async () => {
    await googleIssues({ issuer: 'https://evil.example.com' });

    await expectFailure(await signInWithGoogle());
  });

  it('accepts the issuer without a scheme, which Google also uses', async () => {
    await googleIssues({ issuer: 'accounts.google.com' });

    expect((await signInWithGoogle()).status).toBe(200);
  });

  it("fetches Google's keys again when the id_token's key is new to it", async () => {
    expect((await signInWithGoogle()).status).toBe(200); // the keys are now cached
    const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
    publishedJwks = [firstJwk, { ...(await exportJWK(publicKey)), kid: 'google-key-2', alg: 'RS256', use: 'sig' }];
    await googleIssues({ key: privateKey, kid: 'google-key-2' });

    expect((await signInWithGoogle()).status).toBe(200);
  });

  it('fails when Google rejects the code', async () => {
    tokenResponse = () => Response.json({ error: 'invalid_grant' }, { status: 400 });

    await expectFailure(await signInWithGoogle());
  });

  it('fails when Google cannot be reached', async () => {
    tokenResponse = () => {
      throw new TypeError('fetch failed');
    };

    await expectFailure(await signInWithGoogle());
  });

  it('400 — rejects a body missing the code or with a malformed verifier', async () => {
    for (const body of [{ ...GOOD_BODY, code: '' }, { ...GOOD_BODY, code_verifier: 'short' }, { ...GOOD_BODY, redirect_uri: 'nope' }, null]) {
      const res = await signInWithGoogle(body);
      expect(res.status).toBe(400);
      expect((await json(res)).error?.code).toBe('VALIDATION_ERROR');
    }
    expect(tokenRequests).toHaveLength(0);
  });
});
