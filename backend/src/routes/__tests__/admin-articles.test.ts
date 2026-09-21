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
    R2_PUBLIC_URL: 'https://cdn.example.dev',
  },
}));

jest.mock('../../lib/db/client', () => ({
  prisma: {
    article: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/db/client';
import { Prisma } from '../../../generated/prisma';
import adminArticles from '../adminArticles';

const mockCreate = prisma.article.create as jest.MockedFunction<any>;
const mockFindUnique = prisma.article.findUnique as jest.MockedFunction<any>;
const mockUpdateMany = prisma.article.updateMany as jest.MockedFunction<any>;
const mockFindMany = prisma.article.findMany as jest.MockedFunction<any>;
const mockCount = prisma.article.count as jest.MockedFunction<any>;

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

function listArticles(query = '', headers: Record<string, string> = { Authorization: BEARER }) {
  return adminArticles.request(`/${query}`, { method: 'GET', headers });
}

function saveArticle(
  id: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = { Authorization: BEARER },
) {
  return adminArticles.request(`/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function publishArticle(id: string, headers: Record<string, string> = { Authorization: BEARER }) {
  return adminArticles.request(`/${id}/publish`, { method: 'POST', headers });
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

const VALID_SAVE_BODY = {
  title: 'Уншихад анхаарах зөвлөгөө',
  slug: 'reading-tips-1',
  category: 'READING',
  excerpt: 'A short summary',
  thumbnail: { url: '/content/articles/thumb.png', alt: 'A child reading', width: 800, height: 600 },
  body: PARAGRAPH_AND_HEADING_BODY,
  version: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'new-article-id', version: 1, status: 'DRAFT', is_featured: false, ...data }),
  );
  // Default: the version-guarded write matches a row (count: 1) and the
  // follow-up findUnique refetches it. Individual tests override either
  // call with a `*Once` mock for the conflict/not-found paths.
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockFindUnique.mockImplementation(() =>
    Promise.resolve({ id: 'article-1', version: 2, status: 'DRAFT', is_featured: false }),
  );
  mockFindMany.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
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

describe('GET /', () => {
  const SUMMARY = {
    id: 'article-1',
    title: 'Уншихад анхаарах зөвлөгөө',
    slug: 'reading-tips-1',
    category: 'READING',
    status: 'DRAFT',
    is_featured: false,
    published_at: null,
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('lists Drafts and Published together, most recently updated first, with no Body', async () => {
    mockFindMany.mockResolvedValueOnce([SUMMARY]);
    mockCount.mockResolvedValueOnce(1);
    const res = await listArticles();
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.success).toBe(true);
    expect(json.data.articles).toEqual([SUMMARY]);
    expect(json.data.articles[0].body).toBeUndefined();
    expect(json.data.meta).toEqual({ page: 1, per_page: 50, total: 1, has_next: false });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { updated_at: 'desc' },
        skip: 0,
        take: 50,
        select: expect.objectContaining({ id: true, title: true, slug: true, category: true, status: true }),
      }),
    );
    const selectArg = mockFindMany.mock.calls[0][0].select;
    expect(selectArg.body).toBeUndefined();
  });

  it('filters by status', async () => {
    await listArticles('?status=PUBLISHED');
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED' } }));
    expect(mockCount).toHaveBeenCalledWith({ where: { status: 'PUBLISHED' } });
  });

  it('filters by category', async () => {
    await listArticles('?category=SPELLING');
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { category: 'SPELLING' } }));
  });

  it('filters by q, a case-insensitive title search', async () => {
    await listArticles('?q=reading');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { title: { contains: 'reading', mode: 'insensitive' } } }),
    );
  });

  it('combines status, category and q filters', async () => {
    await listArticles('?status=DRAFT&category=READING&q=tips');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'DRAFT',
          category: 'READING',
          title: { contains: 'tips', mode: 'insensitive' },
        },
      }),
    );
  });

  it('paginates with page/per_page and computes has_next', async () => {
    mockCount.mockResolvedValueOnce(30);
    const res = await listArticles('?page=2&per_page=10');
    const json = await body(res);
    expect(json.data.meta).toEqual({ page: 2, per_page: 10, total: 30, has_next: true });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('rejects an invalid status', async () => {
    const res = await listArticles('?status=ARCHIVED');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.status).toBeDefined();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid category', async () => {
    const res = await listArticles('?category=MATH');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.category).toBeDefined();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid page number', async () => {
    const res = await listArticles('?page=0');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.page).toBeDefined();
  });

  it('rejects a per_page over the max', async () => {
    const res = await listArticles('?per_page=500');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.per_page).toBeDefined();
  });

  it('rejects requests without the admin secret', async () => {
    const res = await listArticles('', {});
    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
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

describe('PUT /:id', () => {
  it('stores all fields, increments version and returns the updated Article for a current version', async () => {
    const res = await saveArticle('article-1', VALID_SAVE_BODY);
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.success).toBe(true);
    expect(json.data.article).toMatchObject({ version: 2 });
    // The where clause guards the write itself — no separate findUnique
    // read-then-write, which would leave a window for a lost update.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-1', version: 1, OR: [{ published_at: null }, { slug: VALID_SAVE_BODY.slug }] },
        data: expect.objectContaining({
          title: VALID_SAVE_BODY.title,
          slug: VALID_SAVE_BODY.slug,
          category: 'READING',
          excerpt: 'A short summary',
          body: PARAGRAPH_AND_HEADING_BODY,
          thumbnail_url: '/content/articles/thumb.png',
          thumbnail_alt: 'A child reading',
          thumbnail_width: 800,
          thumbnail_height: 600,
          reading_time_minutes: 1,
          version: { increment: 1 },
        }),
      }),
    );
  });

  it('returns CONFLICT and writes nothing for an outdated version', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    const res = await saveArticle('article-1', { ...VALID_SAVE_BODY, version: 2 });
    expect(res.status).toBe(409);
    const json = await body(res);
    expect(json.error.code).toBe('CONFLICT');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-1', version: 2, OR: [{ published_at: null }, { slug: VALID_SAVE_BODY.slug }] },
      }),
    );
  });

  it('rejects a slug already used by another Article', async () => {
    mockUpdateMany.mockRejectedValueOnce(slugConflictError());
    const res = await saveArticle('article-1', VALID_SAVE_BODY);
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.slug).toBeDefined();
  });

  it('rejects a Thumbnail URL that fails the asset URL rule', async () => {
    const res = await saveArticle('article-1', {
      ...VALID_SAVE_BODY,
      thumbnail: { ...VALID_SAVE_BODY.thumbnail, url: 'https://evil.example.com/thumb.png' },
    });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.thumbnail).toBeDefined();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a Thumbnail without alt text', async () => {
    const { alt, ...thumbnailWithoutAlt } = VALID_SAVE_BODY.thumbnail;
    const res = await saveArticle('article-1', { ...VALID_SAVE_BODY, thumbnail: thumbnailWithoutAlt });
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.thumbnail).toBeDefined();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('recalculates reading time from the Body on save', async () => {
    const res = await saveArticle('article-1', {
      ...VALID_SAVE_BODY,
      body: [{ id: 'b1', type: 'paragraph', content: [{ text: 'one two three four five' }] }],
    });
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reading_time_minutes: 1 }) }),
    );
  });

  it('saves an incomplete Draft successfully (no excerpt, no Thumbnail, empty Body)', async () => {
    const { excerpt, thumbnail, body: _body, ...rest } = VALID_SAVE_BODY;
    const res = await saveArticle('article-1', rest);
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          excerpt: null,
          thumbnail_url: null,
          thumbnail_alt: null,
          thumbnail_width: null,
          thumbnail_height: null,
          body: [],
          reading_time_minutes: 0,
        }),
      }),
    );
  });

  it("can't change status or is_featured through a save", async () => {
    const res = await saveArticle('article-1', {
      ...VALID_SAVE_BODY,
      status: 'PUBLISHED',
      is_featured: true,
    });
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: expect.anything(), is_featured: expect.anything() }),
      }),
    );
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await saveArticle('missing-id', VALID_SAVE_BODY);
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('rejects requests without the admin secret', async () => {
    const res = await saveArticle('article-1', VALID_SAVE_BODY, {});
    expect(res.status).toBe(401);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a slug change once the Article has been published', async () => {
    // The atomic write's OR clause is what actually blocks this in a real
    // database; the mock can't evaluate it, so it stands in for a real
    // no-match by returning count: 0, and the follow-up findUnique explains why.
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFindUnique.mockResolvedValueOnce({ slug: 'old-slug', published_at: '2026-01-01T00:00:00.000Z' });
    const res = await saveArticle('article-1', { ...VALID_SAVE_BODY, slug: 'new-slug' });
    expect(res.status).toBe(422);
    const json = await body(res);
    expect(json.error.code).toBe('UNPROCESSABLE');
    expect(json.error.details.slug).toBeDefined();
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-1', version: 1, OR: [{ published_at: null }, { slug: 'new-slug' }] },
      }),
    );
  });

  it('allows a save that keeps the same slug once the Article has been published', async () => {
    const res = await saveArticle('article-1', VALID_SAVE_BODY);
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'article-1',
          version: 1,
          OR: [{ published_at: null }, { slug: VALID_SAVE_BODY.slug }],
        },
      }),
    );
  });
});

describe('POST /:id/publish', () => {
  const COMPLETE_ARTICLE = {
    id: 'article-1',
    title: 'Уншихад анхаарах зөвлөгөө',
    slug: 'reading-tips-1',
    excerpt: 'A short summary',
    category: 'READING',
    body: PARAGRAPH_AND_HEADING_BODY,
    thumbnail_url: '/content/articles/thumb.png',
    thumbnail_alt: 'A child reading',
    thumbnail_width: 800,
    thumbnail_height: 600,
    reading_time_minutes: 1,
    status: 'DRAFT',
    is_featured: false,
    published_at: null,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('publishes a complete Draft, setting status and published_at', async () => {
    mockFindUnique.mockResolvedValueOnce(COMPLETE_ARTICLE);
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      status: 'PUBLISHED',
      published_at: '2026-02-01T00:00:00.000Z',
    });
    const res = await publishArticle('article-1');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.article.status).toBe('PUBLISHED');
    expect(json.data.article.published_at).toBeTruthy();
    // Guarded on status, not just id: a concurrent Publish that already
    // flipped the row is a no-op here rather than a second, racing write.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-1', status: 'DRAFT' },
        data: expect.objectContaining({ status: 'PUBLISHED', published_at: expect.any(Date) }),
      }),
    );
  });

  it('returns the already-published row when a concurrent Publish wins the race', async () => {
    mockFindUnique.mockResolvedValueOnce(COMPLETE_ARTICLE);
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      status: 'PUBLISHED',
      published_at: '2026-03-01T00:00:00.000Z',
    });
    const res = await publishArticle('article-1');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.article.status).toBe('PUBLISHED');
    expect(json.data.article.published_at).toBe('2026-03-01T00:00:00.000Z');
  });

  it('returns UNPROCESSABLE listing every missing item', async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      excerpt: null,
      thumbnail_url: null,
      body: [],
    });
    const res = await publishArticle('article-1');
    expect(res.status).toBe(422);
    const json = await body(res);
    expect(json.error.code).toBe('UNPROCESSABLE');
    expect(json.error.details.missing).toEqual(['excerpt', 'thumbnail', 'body']);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('keeps the original published_at when publishing again', async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      status: 'PUBLISHED',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    const res = await publishArticle('article-1');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.article.published_at).toBe('2026-01-01T00:00:00.000Z');
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('keeps an existing published_at instead of overwriting it on a re-publish', async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      status: 'DRAFT',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    mockFindUnique.mockResolvedValueOnce({
      ...COMPLETE_ARTICLE,
      status: 'PUBLISHED',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    await publishArticle('article-1');
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ published_at: '2026-01-01T00:00:00.000Z' }) }),
    );
  });

  it('returns NOT_FOUND for an unknown id', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await publishArticle('missing-id');
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('rejects requests without the admin secret', async () => {
    const res = await publishArticle('article-1', {});
    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
