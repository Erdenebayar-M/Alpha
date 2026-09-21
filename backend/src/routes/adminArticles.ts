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
} from '@app/shared';
import { r2Enabled, r2Upload } from '../lib/r2';
import { EXT_FOR_TYPE } from '../lib/media-type';
import { readImageDimensions } from '../lib/image-size';
import { parseUploadedFile } from '../lib/upload';

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

    const article = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
    return ok(c, { article });
  } catch (err) {
    return slugConflictOrRethrow(c, err);
  }
});

// ─── POST /api/admin/articles/:id/publish ──────────────────────────────────
// Runs the shared readiness check (title, valid slug, excerpt, Thumbnail, at
// least one Block). Publishing an already-Published Article is a no-op that
// returns it unchanged; `published_at` is set only the first time.

adminArticles.post('/:id/publish', async (c) => {
  const id = c.req.param('id');
  const article = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
  if (!article) return ERRORS.NOT_FOUND(c, `Article ${id} not found`);

  if (article.status === 'PUBLISHED') {
    return ok(c, { article });
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
    where: { id, status: 'DRAFT' },
    data: {
      status: 'PUBLISHED',
      published_at: article.published_at ?? new Date(),
    },
  });

  const published = await prisma.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
  return ok(c, { article: published });
});

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
