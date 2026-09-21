import { Hono } from 'hono';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { prisma } from '../lib/db/client';
import { publicArticleListQuerySchema } from '@app/shared';
import { paginationSkipTake, paginationMeta } from '../lib/pagination';

// The first unauthenticated content route (spec #77) — mounted with no auth
// middleware, unlike every other router in this app.
const articles = new Hono();

// Never id, version or (in the list) Body — this select is the future
// paywall's boundary: a summary is safe to hand to anyone, always.
const PUBLIC_ARTICLE_SUMMARY_SELECT = {
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  thumbnail_url: true,
  thumbnail_alt: true,
  thumbnail_width: true,
  thumbnail_height: true,
  reading_time_minutes: true,
  published_at: true,
  is_featured: true,
} satisfies Record<string, true>;

const PUBLIC_ARTICLE_DETAIL_SELECT = {
  ...PUBLIC_ARTICLE_SUMMARY_SELECT,
  body: true,
} satisfies Record<string, true>;

// ─── GET /api/articles ──────────────────────────────────────────────────────

articles.get('/', async (c) => {
  const parsed = publicArticleListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { category, page, per_page } = parsed.data;

  const where = { status: 'PUBLISHED' as const, ...(category ? { category } : {}) };

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { published_at: 'desc' },
      ...paginationSkipTake(page, per_page),
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    }),
    prisma.article.count({ where }),
  ]);

  return ok(c, { articles: items, meta: paginationMeta(page, per_page, total) });
});

// ─── GET /api/articles/:slug ────────────────────────────────────────────────
// A Draft's slug and an unknown slug are indistinguishable on purpose — both
// 404, so an unpublished Article's existence is never revealed.

articles.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const article = await prisma.article.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: PUBLIC_ARTICLE_DETAIL_SELECT,
  });
  if (!article) return ERRORS.NOT_FOUND(c, `Article ${slug} not found`);
  return ok(c, { article });
});

export default articles;
