import { Hono } from 'hono';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { prisma } from '../lib/db/client';
import { Prisma } from '../../generated/prisma';
import { createArticleSchema, computeReadingTimeMinutes } from '@app/shared';

const adminArticles = new Hono();
adminArticles.use('/*', withAdmin);

// Explicit select so a future column is never exposed to the admin API
// without a deliberate decision to add it here.
const ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  category: true,
  body: true,
  thumbnail_url: true,
  thumbnail_alt: true,
  thumbnail_width: true,
  thumbnail_height: true,
  reading_time_minutes: true,
  status: true,
  is_featured: true,
  published_at: true,
  version: true,
  created_at: true,
  updated_at: true,
} satisfies Record<string, true>;

// The pg driver adapter (src/lib/db/client.ts) reports P2002 target columns
// under meta.driverAdapterError.cause.constraint.fields, not meta.target —
// the shape Prisma's classic (non-adapter) engine uses. Check both so this
// keeps working if the adapter is ever swapped out.
function isUniqueSlugViolation(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return false;
  }
  const meta = err.meta as
    | { target?: string[]; driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } } }
    | undefined;
  const fields = meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;
  return Array.isArray(fields) && fields.includes('slug');
}

// ─── POST /api/admin/articles ─────────────────────────────────────────────────

adminArticles.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { title, slug, category, excerpt, body: articleBody } = parsed.data;

  try {
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        category,
        excerpt: excerpt ?? null,
        body: articleBody,
        reading_time_minutes: computeReadingTimeMinutes(articleBody),
      },
      select: ARTICLE_SELECT,
    });
    return ok(c, { article }, undefined, 201);
  } catch (err) {
    // Relying on the DB's unique constraint (rather than a findUnique
    // pre-check) closes the race where two requests for the same slug
    // both pass a pre-check before either insert commits.
    if (isUniqueSlugViolation(err)) {
      return ERRORS.VALIDATION_ERROR(c, 'Invalid body', { slug: ['Slug is already in use'] });
    }
    throw err;
  }
});

// ─── GET /api/admin/articles/:id ───────────────────────────────────────────────

adminArticles.get('/:id', async (c) => {
  const id = c.req.param('id');
  const article = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
  if (!article) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);
  return ok(c, { article });
});

export default adminArticles;
