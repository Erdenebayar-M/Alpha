import { z } from 'zod';

/**
 * Canonical Article contract — single source of truth for every Article write
 * path (backend admin routes) and read path (public + admin), per ADR 0001
 * (Body is typed block JSON) and ADR 0002 (single hand-picked Featured article).
 */

// ── Category ──────────────────────────────────────────────────────────────

export const ARTICLE_CATEGORIES = ['READING', 'ORTHOGRAPHY', 'SPELLING'] as const;
export const articleCategorySchema = z.enum(ARTICLE_CATEGORIES);
export type ArticleCategoryValue = (typeof ARTICLE_CATEGORIES)[number];

// ── Status ────────────────────────────────────────────────────────────────

export const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export const articleStatusSchema = z.enum(ARTICLE_STATUSES);
export type ArticleStatusValue = (typeof ARTICLE_STATUSES)[number];

// ── Slug ──────────────────────────────────────────────────────────────────

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const articleSlugSchema = z
  .string()
  .regex(SLUG_RE, 'Slug must be lowercase Latin letters, digits and single hyphens');

// ── Inline href allowlist ────────────────────────────────────────────────
// https:, http:, mailto:, or a same-origin path starting with "/". A path is
// resolved against a placeholder origin and checked that it stays on it —
// a plain prefix check would miss browser URL-normalization tricks (e.g.
// "//host" or "/\host", which WHATWG parsers treat as protocol-relative)
// that resolve off-origin despite starting with a single "/".

function isAllowedHref(href: string): boolean {
  if (href.startsWith('https:') || href.startsWith('http:') || href.startsWith('mailto:')) {
    return true;
  }
  if (!href.startsWith('/')) return false;
  try {
    const placeholder = 'https://placeholder.invalid';
    return new URL(href, placeholder).origin === placeholder;
  } catch {
    return false;
  }
}

export const inlineHrefSchema = z
  .string()
  .refine(isAllowedHref, { message: 'href must be https:, http:, mailto: or a path starting with /' });

// ── Blocks ────────────────────────────────────────────────────────────────

export const inlineSpanSchema = z.object({
  text: z.string().min(1),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: inlineHrefSchema.optional(),
});

export const paragraphBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('paragraph'),
  content: z.array(inlineSpanSchema).min(1),
});

export const headingBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3)], { error: 'Heading level must be 2 or 3' }),
  text: z.string().min(1),
});

export const blockSchema = z.discriminatedUnion('type', [paragraphBlockSchema, headingBlockSchema], {
  error: 'Unknown block type',
});

export const articleBodySchema = z.array(blockSchema);

export type InlineSpan = z.infer<typeof inlineSpanSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ArticleBlock = z.infer<typeof blockSchema>;
export type ArticleBody = z.infer<typeof articleBodySchema>;

/**
 * Validate a raw Body value, returning either the typed Blocks or a list of
 * `"Block <position>: <message>"` strings. Kept separate from the schema's
 * own issue output because `flatten().fieldErrors` — the house convention for
 * VALIDATION_ERROR details — collapses every nested path down to its
 * top-level key, which would otherwise drop which Block failed.
 */
export function validateArticleBody(
  body: unknown,
): { ok: true; data: ArticleBody } | { ok: false; errors: string[] } {
  const res = articleBodySchema.safeParse(body);
  if (res.success) return { ok: true, data: res.data };
  const errors = res.error.issues.map((issue) => {
    const position = typeof issue.path[0] === 'number' ? issue.path[0] : '?';
    return `Block ${position}: ${issue.message}`;
  });
  return { ok: false, errors };
}

// ── Body field (shared by every write schema) ────────────────────────────
// One pass: validateArticleBody both reports position-aware issues and
// supplies the typed, key-stripped Blocks that get persisted — a caller
// can't smuggle extra fields into a Block past this transform.

const articleBodyFieldSchema = z
  .array(z.unknown())
  .default([])
  .transform((raw, ctx) => {
    const result = validateArticleBody(raw);
    if (!result.ok) {
      for (const message of result.errors) ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    }
    return result.data;
  });

// ── Thumbnail ─────────────────────────────────────────────────────────────
// Shape only — the URL allowlist depends on server config (R2 origin) that
// @app/shared can't see, so the backend re-checks `thumbnail.url` itself.

export const articleThumbnailSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type ArticleThumbnail = z.infer<typeof articleThumbnailSchema>;

// ── Create schema ─────────────────────────────────────────────────────────

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  slug: articleSlugSchema,
  category: articleCategorySchema,
  excerpt: z.string().max(500).optional(),
  body: articleBodyFieldSchema,
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

// ── Save schema (PUT — replaces the whole editable Article) ────────────────
// Never carries status or is_featured: those change only through the
// publish/unpublish/feature actions, not a content save.

export const saveArticleSchema = createArticleSchema.extend({
  thumbnail: articleThumbnailSchema.nullable().optional(),
  version: z.number().int().positive(),
});

export type SaveArticleInput = z.infer<typeof saveArticleSchema>;

// ── Admin list query ────────────────────────────────────────────────────────
// Pagination names and defaults match the other admin list routes
// (content.ts's /words, /admin/content routes): page/per_page in, meta with
// page/per_page/total/has_next out.

export const adminArticleListQuerySchema = z.object({
  status: articleStatusSchema.optional(),
  category: articleCategorySchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(50),
});

export type AdminArticleListQuery = z.infer<typeof adminArticleListQuerySchema>;

// ── Public list query ───────────────────────────────────────────────────────
// Same page/per_page/meta shape as the admin list, but a smaller default and
// cap — this is served to anonymous site visitors, not staff browsing a
// back office.

export const publicArticleListQuerySchema = z.object({
  category: articleCategorySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
});

export type PublicArticleListQuery = z.infer<typeof publicArticleListQuerySchema>;

// ── Publish readiness ────────────────────────────────────────────────────
// Single source of truth for what "ready to publish" means, per ADR-backed
// spec #77: title, a valid slug, excerpt, Thumbnail and at least one Block.
// Consumed by POST /:id/publish and, later, the admin editor to pre-flight
// the same rule before the button is even clickable.

export const ARTICLE_PUBLISH_FIELDS = ['title', 'slug', 'excerpt', 'thumbnail', 'body'] as const;
export type ArticlePublishField = (typeof ARTICLE_PUBLISH_FIELDS)[number];

export interface ArticlePublishCheckInput {
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  body: unknown;
}

/** Missing fields blocking Publish, in a fixed order — empty when ready. */
export function getArticlePublishIssues(article: ArticlePublishCheckInput): ArticlePublishField[] {
  const missing: ArticlePublishField[] = [];
  if (!article.title.trim()) missing.push('title');
  if (!SLUG_RE.test(article.slug)) missing.push('slug');
  if (!article.excerpt || !article.excerpt.trim()) missing.push('excerpt');
  if (!article.thumbnail_url) missing.push('thumbnail');
  if (!Array.isArray(article.body) || article.body.length === 0) missing.push('body');
  return missing;
}

// ── Reading time ──────────────────────────────────────────────────────────

const WORDS_PER_MINUTE = 200;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/** Word count across paragraph/heading text, at ~200 wpm, min 1 minute for any non-empty Body. */
export function computeReadingTimeMinutes(body: ArticleBody): number {
  let wordCount = 0;
  for (const block of body) {
    if (block.type === 'paragraph') {
      for (const span of block.content) wordCount += countWords(span.text);
    } else {
      wordCount += countWords(block.text);
    }
  }
  if (wordCount === 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
