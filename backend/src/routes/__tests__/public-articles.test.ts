/**
 * Tests for the public Article router (issue #84): GET /api/articles and
 * GET /api/articles/:slug — no auth, Published Articles only.
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
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/db/client';
import articles from '../articles';

const mockFindMany = prisma.article.findMany as jest.MockedFunction<any>;
const mockCount = prisma.article.count as jest.MockedFunction<any>;
const mockFindFirst = prisma.article.findFirst as jest.MockedFunction<any>;

const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function listArticles(query = '') {
  return articles.request(`/${query}`, { method: 'GET' });
}

function getArticle(slug: string) {
  return articles.request(`/${slug}`, { method: 'GET' });
}

const SUMMARY = {
  slug: 'reading-tips-1',
  title: 'Уншихад анхаарах зөвлөгөө',
  excerpt: 'A short summary',
  category: 'READING',
  thumbnail_url: '/content/articles/thumb.png',
  thumbnail_alt: 'A child reading',
  thumbnail_width: 800,
  thumbnail_height: 600,
  reading_time_minutes: 1,
  published_at: '2026-01-02T00:00:00.000Z',
  is_featured: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
  mockFindFirst.mockResolvedValue(null);
});

describe('GET /', () => {
  it('lists Published Articles, newest published_at first, with no id, version or Body', async () => {
    mockFindMany.mockResolvedValueOnce([SUMMARY]);
    mockCount.mockResolvedValueOnce(1);
    const res = await listArticles();
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.success).toBe(true);
    expect(json.data.articles).toEqual([SUMMARY]);
    expect(json.data.articles[0].id).toBeUndefined();
    expect(json.data.articles[0].version).toBeUndefined();
    expect(json.data.articles[0].body).toBeUndefined();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PUBLISHED' },
        orderBy: { published_at: 'desc' },
        skip: 0,
        take: 12,
      }),
    );
    const selectArg = mockFindMany.mock.calls[0][0].select;
    expect(selectArg.id).toBeUndefined();
    expect(selectArg.version).toBeUndefined();
    expect(selectArg.body).toBeUndefined();
  });

  it('filters by category', async () => {
    await listArticles('?category=SPELLING');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PUBLISHED', category: 'SPELLING' } }),
    );
    expect(mockCount).toHaveBeenCalledWith({ where: { status: 'PUBLISHED', category: 'SPELLING' } });
  });

  it('paginates with page/per_page and computes has_next', async () => {
    mockCount.mockResolvedValueOnce(30);
    const res = await listArticles('?page=2&per_page=10');
    const json = await body(res);
    expect(json.data.meta).toEqual({ page: 2, per_page: 10, total: 30, has_next: true });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('defaults to a small page size', async () => {
    mockCount.mockResolvedValueOnce(1);
    const res = await listArticles();
    const json = await body(res);
    expect(json.data.meta).toEqual({ page: 1, per_page: 12, total: 1, has_next: false });
  });

  it('rejects a per_page over the public maximum', async () => {
    const res = await listArticles('?per_page=500');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.per_page).toBeDefined();
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
    expect(json.error.details.page).toBeDefined();
  });
});

describe('GET /:slug', () => {
  it('returns the Body for a Published Article', async () => {
    mockFindFirst.mockResolvedValueOnce({ ...SUMMARY, body: [{ id: 'b1', type: 'heading', level: 2, text: 'Hi' }] });
    const res = await getArticle('reading-tips-1');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.article.body).toEqual([{ id: 'b1', type: 'heading', level: 2, text: 'Hi' }]);
    expect(json.data.article.id).toBeUndefined();
    expect(json.data.article.version).toBeUndefined();
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'reading-tips-1', status: 'PUBLISHED' } }),
    );
  });

  it('returns NOT_FOUND for a Draft slug', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const res = await getArticle('draft-only-slug');
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND for an unknown slug', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const res = await getArticle('nope');
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json.error.code).toBe('NOT_FOUND');
  });
});
