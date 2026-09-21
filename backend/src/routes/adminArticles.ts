import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { prisma } from '../lib/db/client';
import { Prisma } from '../../generated/prisma';
import { assetUrlSchema } from '../lib/asset-url';
import { createArticleSchema, saveArticleSchema, computeReadingTimeMinutes } from '@app/shared';

const thumbnailUrlSchema = z.object({ url: assetUrlSchema });

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

// Shared by every write path (create, save): a duplicate-slug write is
// reported as a field error; anything else propagates to app.onError.
function slugConflictOrRethrow(c: Context, err: unknown) {
  if (isUniqueSlugViolation(err)) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', { slug: ['Slug is already in use'] });
  }
  throw err;
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
    return slugConflictOrRethrow(c, err);
  }
});

// ─── GET /api/admin/articles/:id ───────────────────────────────────────────────

adminArticles.get('/:id', async (c) => {
  const id = c.req.param('id');
  const article = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
  if (!article) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);
  return ok(c, { article });
});

// ─── PUT /api/admin/articles/:id ───────────────────────────────────────────────
// Replaces the whole editable Article. Guarded by `version`: the client sends
// the version it last read, and a stale version is refused with nothing
// written — never status or is_featured, which only change via the
// publish/unpublish/feature actions.

adminArticles.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = saveArticleSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { title, slug, category, excerpt, thumbnail, body: articleBody, version } = parsed.data;

  if (thumbnail) {
    const urlCheck = thumbnailUrlSchema.safeParse(thumbnail);
    if (!urlCheck.success) {
      return ERRORS.VALIDATION_ERROR(c, 'Invalid body', {
        thumbnail: urlCheck.error.flatten().fieldErrors.url,
      });
    }
  }

  try {
    // The where clause makes the version check part of the write itself —
    // a `findUnique` followed by a separate `update` would leave a window
    // where two concurrent saves both read the same version, both pass the
    // check, and the second silently clobbers the first.
    const updated = await prisma.article.updateMany({
      where: { id, version },
      data: {
        title,
        slug,
        category,
        excerpt: excerpt ?? null,
        body: articleBody,
        thumbnail_url: thumbnail?.url ?? null,
        thumbnail_alt: thumbnail?.alt ?? null,
        thumbnail_width: thumbnail?.width ?? null,
        thumbnail_height: thumbnail?.height ?? null,
        reading_time_minutes: computeReadingTimeMinutes(articleBody),
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      const exists = await prisma.article.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);
      return ERRORS.CONFLICT(c, 'Article was changed since it was last read');
    }

    const article = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
    return ok(c, { article });
  } catch (err) {
    return slugConflictOrRethrow(c, err);
  }
});

export default adminArticles;
