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

// ── Create schema ─────────────────────────────────────────────────────────

export const createArticleSchema = z
  .object({
    title: z.string().min(1).max(300),
    slug: articleSlugSchema,
    category: articleCategorySchema,
    excerpt: z.string().max(500).optional(),
    body: z.array(z.unknown()).default([]),
  })
  .superRefine((val, ctx) => {
    const result = validateArticleBody(val.body);
    if (!result.ok) {
      for (const message of result.errors) {
        ctx.addIssue({ code: 'custom', path: ['body'], message });
      }
    }
  })
  // Re-parse into the typed, key-stripped Blocks so callers persist exactly
  // what was validated — not the raw payload a caller could smuggle extra
  // fields into. Safe to assume success: the superRefine above already
  // rejected anything articleBodySchema wouldn't parse.
  .transform((val) => {
    const result = validateArticleBody(val.body);
    return { ...val, body: result.ok ? result.data : ([] as ArticleBody) };
  });

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

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
