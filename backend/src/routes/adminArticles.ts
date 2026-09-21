import { Hono, type Context } from 'hono';
import { z } from 'zod';
import * as crypto from 'crypto';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { prisma } from '../lib/db/client';
import { Prisma } from '../../generated/prisma';
import { assetUrlSchema } from '../lib/asset-url';
import { paginationSkipTake, paginationMeta } from '../lib/pagination';
import {
  createArticleSchema,
  saveArticleSchema,
  adminArticleListQuerySchema,
  computeReadingTimeMinutes,
  getArticlePublishIssues,
  getArticleBodyAssetUrls,
  type ArticleBody,
} from '@app/shared';
import { r2Enabled, r2Upload } from '../lib/r2';
import { EXT_FOR_TYPE } from '../lib/media-type';
import { readImageDimensions } from '../lib/image-size';
import { parseUploadedFile } from '../lib/upload';

const thumbnailUrlSchema = z.object({ url: assetUrlSchema });

// @app/shared validates every Block's shape but can't check an image url
// against the R2 allowlist — that depends on server config it can't see. It
// hands back every asset url in the Body (an image Block's, a link card's)
// tagged with the Block's position and field; this re-checks each one the
// same way the Thumbnail's url is checked above.
function findBodyAssetUrlErrors(articleBody: ArticleBody): string[] {
  const errors: string[] = [];
  for (const { position, field, url } of getArticleBodyAssetUrls(articleBody)) {
    const check = assetUrlSchema.safeParse(url);
    if (!check.success) {
      errors.push(`Block ${position}: ${field} ${check.error.issues[0]?.message ?? 'is invalid'}`);
    }
  }
  return errors;
}

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

// `was_published` isn't a column — it's true for a Draft that has been
// Published before (so its slug is a live link somewhere) and false for one
// that never has. Derived on every full-Article response rather than stored,
// since it always follows from status + published_at.
function decorateArticle<T extends { status: string; published_at: unknown }>(
  article: T,
): T & { was_published: boolean } {
  return { ...article, was_published: article.status === 'DRAFT' && article.published_at != null };
}

type AdminArticle = NonNullable<Awaited<ReturnType<typeof findArticle>>>;

function findArticle(id: string) {
  return prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
}

function articleResponse(c: Context, article: AdminArticle) {
  return ok(c, { article: decorateArticle(article) });
}

// Wraps an `/:id` handler: looks the Article up and answers NOT_FOUND if it
// doesn't exist, so the handler only ever sees a real row.
function withArticle(handler: (c: Context<any, '/:id'>, article: AdminArticle) => Response | Promise<Response>) {
  return async (c: Context<any, '/:id'>) => {
    const id = c.req.param('id');
    const article = await findArticle(id);
    if (!article) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);
    return handler(c, article);
  };
}

// Reads the Article fresh and returns it. Every write route ends here: the
// row can be gone by the time it's refetched (a concurrent Delete landing
// between the write and this read), which is a NOT_FOUND, not a crash.
const respondWithArticle = withArticle(articleResponse);

// Summary shape for the list route — no body, matching the spec's "items
// are summaries" rule.
const ARTICLE_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  category: true,
  status: true,
  is_featured: true,
  published_at: true,
  updated_at: true,
} satisfies Record<string, true>;

// ─── GET /api/admin/articles ────────────────────────────────────────────────
// Defaults to Drafts and Published together, most recently updated first.

adminArticles.get('/', async (c) => {
  const parsed = adminArticleListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { status, category, q, page, per_page } = parsed.data;

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      ...paginationSkipTake(page, per_page),
      select: ARTICLE_LIST_SELECT,
    }),
    prisma.article.count({ where }),
  ]);

  return ok(c, { articles, meta: paginationMeta(page, per_page, total) });
});

// ─── POST /api/admin/articles ─────────────────────────────────────────────────

adminArticles.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { title, slug, category, excerpt, body: articleBody } = parsed.data;

  const assetErrors = findBodyAssetUrlErrors(articleBody);
  if (assetErrors.length > 0) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', { body: assetErrors });
  }

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

adminArticles.get('/:id', respondWithArticle);

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

  const assetErrors = findBodyAssetUrlErrors(articleBody);
  if (assetErrors.length > 0) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', { body: assetErrors });
  }

  try {
    // The where clause makes both the version check and the published-slug
    // lock part of the write itself — a separate `findUnique` read-then-write
    // for either would leave a window where a concurrent change (a second
    // save, or a Publish setting published_at) lands between the read and
    // the write and slips past a check that already passed.
    const updated = await prisma.article.updateMany({
      where: { id, version, OR: [{ published_at: null }, { slug }] },
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
      // Distinguish why nothing matched: gone, slug-locked, or stale version.
      const existing = await prisma.article.findUnique({
        where: { id },
        select: { slug: true, published_at: true },
      });
      if (!existing) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);
      if (existing.published_at && slug !== existing.slug) {
        return ERRORS.UNPROCESSABLE(c, 'Slug cannot be changed once an Article has been published', {
          slug: ['Slug cannot be changed after publishing'],
        });
      }
      return ERRORS.CONFLICT(c, 'Article was changed since it was last read');
    }

    return respondWithArticle(c);
  } catch (err) {
    return slugConflictOrRethrow(c, err);
  }
});

// ─── POST /api/admin/articles/:id/publish ──────────────────────────────────
// Runs the shared readiness check (title, valid slug, excerpt, Thumbnail, at
// least one Block). Publishing an already-Published Article is a no-op that
// returns it unchanged; `published_at` is set only the first time.

adminArticles.post('/:id/publish', withArticle(async (c, article) => {
  if (article.status === 'PUBLISHED') {
    return articleResponse(c, article);
  }

  const missing = getArticlePublishIssues(article);
  if (missing.length > 0) {
    return ERRORS.UNPROCESSABLE(c, 'Article is missing required fields to publish', { missing });
  }

  // Guarded on status, not just id: if a concurrent Publish call already
  // flipped this Draft to Published, this write is a no-op and the refetch
  // below returns that already-published row instead of racing to overwrite
  // its published_at.
  await prisma.article.updateMany({
    where: { id: article.id, status: 'DRAFT' },
    data: {
      status: 'PUBLISHED',
      published_at: article.published_at ?? new Date(),
    },
  });

  return respondWithArticle(c);
}));

// ─── POST /api/admin/articles/:id/unpublish ────────────────────────────────
// Returns a Published Article to Draft and clears Featured (ADR 0002: an
// unpublished Article can never be the site's featured pick). `published_at`
// is left untouched so `was_published` keeps remembering that this Draft's
// slug was once a live link. Unpublishing a Draft is a no-op.

adminArticles.post('/:id/unpublish', withArticle(async (c, article) => {
  if (article.status === 'DRAFT') {
    return articleResponse(c, article);
  }

  // Guarded on status, not just id, for the same race-safety reason as Publish.
  await prisma.article.updateMany({
    where: { id: article.id, status: 'PUBLISHED' },
    data: { status: 'DRAFT', is_featured: false },
  });

  return respondWithArticle(c);
}));

// ─── DELETE /api/admin/articles/:id ─────────────────────────────────────────
// Permanently removes a Draft. A Published Article must be unpublished first
// — deleting it outright would break a link that may already be shared.

adminArticles.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const article = await prisma.article.findUnique({ where: { id }, select: { status: true } });
  if (!article) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);

  if (article.status === 'PUBLISHED') {
    return ERRORS.UNPROCESSABLE(c, 'Published Articles must be unpublished before they can be deleted');
  }

  await prisma.article.delete({ where: { id } });
  return ok(c, { id, deleted: true });
});

// ─── POST /api/admin/articles/:id/feature ──────────────────────────────────
// Only a Published Article can be Featured. Per ADR 0002 (one hand-picked
// Featured article, not a queue), clearing every other Article's Featured
// flag and setting this one's happens in a single transaction so a reader
// can never observe two Featured Articles at once.

// Thrown inside the Feature transaction to roll it back when the set step
// matches nothing; never escapes the route.
class FeatureTargetNotPublished extends Error {}

adminArticles.post('/:id/feature', withArticle(async (c, article) => {
  if (article.status !== 'PUBLISHED') {
    return ERRORS.UNPROCESSABLE(c, 'Only Published Articles can be Featured');
  }

  try {
    // The status re-check on the set half of the write (not just the initial
    // read above) closes the window where a concurrent Unpublish flips this
    // Article to Draft between the read and the transaction. When it matches
    // nothing, throwing rolls back the clear half too, so the previously
    // Featured Article keeps its flag instead of the site losing its pick.
    await prisma.$transaction(async (tx) => {
      await tx.article.updateMany({ where: { is_featured: true }, data: { is_featured: false } });
      const set = await tx.article.updateMany({
        where: { id: article.id, status: 'PUBLISHED' },
        data: { is_featured: true },
      });
      if (set.count === 0) throw new FeatureTargetNotPublished();
    });
  } catch (err) {
    if (err instanceof FeatureTargetNotPublished) {
      return ERRORS.UNPROCESSABLE(c, 'Only Published Articles can be Featured');
    }
    // Both writes touch only is_featured, so the one unique constraint they
    // can trip is the at-most-one-Featured index (ADR 0002) — a concurrent
    // Feature of another Article committed first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return ERRORS.CONFLICT(c, 'Another Article was Featured at the same time');
    }
    throw err;
  }

  return respondWithArticle(c);
}));

// ─── DELETE /api/admin/articles/:id/feature ─────────────────────────────────
// Clears Featured, leaving the site with no Featured article. Calling this
// again — or on an Article that was never Featured — is a no-op.

adminArticles.delete('/:id/feature', withArticle(async (c, article) => {
  if (!article.is_featured) {
    return articleResponse(c, article);
  }

  await prisma.article.update({ where: { id: article.id }, data: { is_featured: false } });

  return respondWithArticle(c);
}));

// ─── POST /api/admin/articles/images ───────────────────────────────────────────
// Uploads a standalone image for use in an image Block, a link-card image or a
// Thumbnail. The type is read from the file's own bytes — never the filename or
// the multipart-declared type — so a mislabelled or renamed file can't get through.

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

adminArticles.post('/images', async (c) => {
  if (!r2Enabled()) {
    return ERRORS.SERVICE_UNAVAILABLE(c, 'Image storage is not configured');
  }

  const uploaded = await parseUploadedFile(c, MAX_IMAGE_BYTES);
  if (!uploaded.ok) {
    return ERRORS.VALIDATION_ERROR(c, uploaded.message);
  }
  const { buf, sniffed } = uploaded;

  // Guard on the actual bytes, not the filename or the browser-declared type.
  if (!sniffed || !sniffed.startsWith('image/')) {
    return ERRORS.VALIDATION_ERROR(c, 'Unrecognized image format. Upload JPEG, PNG, WebP or GIF.');
  }

  const dimensions = readImageDimensions(buf, sniffed);
  if (!dimensions) {
    return ERRORS.VALIDATION_ERROR(c, 'Could not read image dimensions');
  }

  const filename = `${crypto.randomUUID()}.${EXT_FOR_TYPE[sniffed]}`;
  const url = await r2Upload(`articles/${filename}`, buf, sniffed);

  return ok(c, { url, width: dimensions.width, height: dimensions.height, content_type: sniffed }, undefined, 201);
});

export default adminArticles;
