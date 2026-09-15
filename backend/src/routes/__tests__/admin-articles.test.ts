/**
 * Tests for POST /api/admin/articles and GET /api/admin/articles/:id —
 * the first Articles slice (issue #80): staff start a Draft and read it back.
 */

jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET: 'test-admin-secret-that-is-32chars-ok',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'x'.repeat(64),
    CORS_ORIGIN: 'http://localhost:3000',
    RATE_LIMIT_DISABLED: 'true',
  },
}));

jest.mock('../../lib/db/client', () => ({
  prisma: {
    article: { create: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prisma } from '../../lib/db/client';
import { Prisma } from '../../../generated/prisma';
import adminArticles from '../adminArticles';

const mockCreate = prisma.article.create as jest.MockedFunction<any>;
const mockFindUnique = prisma.article.findUnique as jest.MockedFunction<any>;

// Matches the real shape thrown by the pg driver adapter this app uses
// (src/lib/db/client.ts), confirmed against a live duplicate-slug insert —
// NOT Prisma's classic-engine meta.target shape, which this adapter doesn't use.
function slugConflictError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`slug`)', {
    code: 'P2002',
    clientVersion: '7.8.0',
    meta: { modelName: 'Article', driverAdapterError: { cause: { constraint: { fields: ['slug'] } } } },
  });
}

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function createArticle(payload: Record<string, unknown>, headers: Record<string, string> = { Authorization: BEARER }) {
  return adminArticles.request('/', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function getArticle(id: string, headers: Record<string, string> = { Authorization: BEARER }) {
  return adminArticles.request(`/${id}`, { method: 'GET', headers });
}

const VALID_BODY = {
  title: 'Уншихад анхаарах зөвлөгөө',
  slug: 'reading-tips-1',
  category: 'READING',
};

const PARAGRAPH_AND_HEADING_BODY = [
  { id: 'b1', type: 'heading', level: 2, text: 'Intro' },
  { id: 'b2', type: 'paragraph', content: [{ text: 'one two three', bold: true }] },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'new-article-id', version: 1, status: 'DRAFT', is_featured: false, ...data }),
  );
});

describe('POST /', () => {
  it('creates a Draft with version 1 and returns it in the ok envelope', async () => {
    const res = await createArticle(VALID_BODY);
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.success).toBe(true);
    expect(json.data.article).toMatchObject({
      title: VALID_BODY.title,
      slug: VALID_BODY.slug,
      category: 'READING',
      status: 'DRAFT',
      version: 1,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: VALID_BODY.title,
          slug: VALID_BODY.slug,
          category: 'READING',
          excerpt: null,
          body: [],
          reading_time_minutes: 0,
        }),
        select: expect.objectContaining({ id: true, slug: true, body: true, version: true }),
      }),
    );
  });

  it('accepts optional excerpt and Body', async () => {
    const res = await createArticle({
      ...VALID_BODY,
      excerpt: 'A short summary',
      body: PARAGRAPH_AND_HEADING_BODY,
    });
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          excerpt: 'A short summary',
          body: PARAGRAPH_AND_HEADING_BODY,
          reading_time_minutes: 1,
        }),
      }),
    );
  });

  it('rejects a missing title', async () => {
    const { title, ...rest } = VALID_BODY;
    const res = await createArticle(rest);
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.title).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a badly formatted slug', async () => {
    const res = await createArticle({ ...VALID_BODY, slug: 'Not A Slug!' });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.slug).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown category', async () => {
    const res = await createArticle({ ...VALID_BODY, category: 'MATH' });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.category).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a slug already used by another Article', async () => {
    mockCreate.mockRejectedValueOnce(slugConflictError());
    const res = await createArticle(VALID_BODY);
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.slug).toBeDefined();
  });

  it('re-throws a create failure unrelated to the slug constraint', async () => {
    mockCreate.mockRejectedValueOnce(new Error('connection lost'));
    const res = await createArticle(VALID_BODY);
    expect(res.status).toBe(500);
  });

  it('accepts a Body with paragraph and heading Blocks', async () => {
    const res = await createArticle({ ...VALID_BODY, body: PARAGRAPH_AND_HEADING_BODY });
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('rejects a disallowed href scheme, naming the Block position', async () => {
    const res = await createArticle({
      ...VALID_BODY,
      body: [{ id: 'b1', type: 'paragraph', content: [{ text: 'click', href: 'javascript:alert(1)' }] }],
    });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.body[0]).toMatch(/^Block 0: /);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a protocol-relative-style href even without a literal "//" prefix', async () => {
    // "/\evil.com" starts with a single "/" but WHATWG URL parsers (browsers
    // included) normalize the backslash to "/", resolving it off-origin —
    // a prefix-only check would wrongly accept this.
    const res = await createArticle({
      ...VALID_BODY,
      body: [{ id: 'b1', type: 'paragraph', content: [{ text: 'click', href: '/\\evil.com' }] }],
    });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.details.body[0]).toMatch(/^Block 0: /);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('strips unrecognized keys from a Block before persisting', async () => {
    const res = await createArticle({
      ...VALID_BODY,
      body: [
        { id: 'b1', type: 'paragraph', content: [{ text: 'hi' }], smuggled: '<img onerror=alert(1)>' },
      ],
    });
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: [{ id: 'b1', type: 'paragraph', content: [{ text: 'hi' }] }],
        }),
      }),
    );
  });

  it('rejects an invalid heading level, naming the Block position', async () => {
    const res = await createArticle({
      ...VALID_BODY,
      body: [{ id: 'b1', type: 'heading', level: 4, text: 'Bad' }],
    });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.details.body[0]).toMatch(/^Block 0: /);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown Block type, naming the Block position', async () => {
    const res = await createArticle({
      ...VALID_BODY,
      body: [
        { id: 'b1', type: 'heading', level: 2, text: 'Ok' },
        { id: 'b2', type: 'video', url: 'https://example.com' },
      ],
    });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.details.body[0]).toMatch(/^Block 1: /);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects requests without the admin secret', async () => {
    const res = await createArticle(VALID_BODY, {});
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('GET /:id', () => {
  it('returns the Article with its Body', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'article-1',
      title: 'Title',
      slug: 'title',
      category: 'READING',
      body: PARAGRAPH_AND_HEADING_BODY,
      status: 'DRAFT',
      version: 1,
    });
    const res = await getArticle('article-1');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.article.body).toEqual(PARAGRAPH_AND_HEADING_BODY);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ id: true, slug: true, body: true, version: true }),
      }),
    );
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await getArticle('missing-id');
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('rejects requests without the admin secret', async () => {
    const res = await getArticle('article-1', {});
    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
