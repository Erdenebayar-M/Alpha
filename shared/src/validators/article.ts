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

// One level only: an item is an array of inline spans, never another list —
// there is no schema shape a nested list could take that would parse here.
export const LIST_STYLES = ['bullet', 'ordered'] as const;
export const listStyleSchema = z.enum(LIST_STYLES);
export type ListStyle = (typeof LIST_STYLES)[number];

export const listBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('list'),
  style: listStyleSchema,
  items: z
    .array(z.array(inlineSpanSchema).min(1, 'each list item needs at least one span'))
    .min(1, 'list needs at least one item'),
});

export const quoteBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('quote'),
  content: z.array(inlineSpanSchema).min(1),
  attribution: z.string().min(1).optional(),
});

export const calloutBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('callout'),
  content: z.array(inlineSpanSchema).min(1),
});

export const dividerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('divider'),
});

// Shape only — like the Thumbnail below, the asset-host allowlist depends on
// server config (R2 origin) that @app/shared can't see, so the backend
// re-checks every image url (this Block's, and a link card's) itself.
export const imageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('image'),
  url: z.string().min(1, 'url is required'),
  alt: z.string().min(1, 'alt is required'),
  caption: z.string().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const httpUrlSchema = z.string().refine(isHttpUrl, { message: 'url must be an http(s) link' });

export const linkCardImageSchema = z.object({
  url: z.string().min(1, 'url is required'),
  alt: z.string().min(1, 'alt is required'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// The server never fetches this url — title/description/image are typed in
// by hand, per ADR 0001.
export const linkCardBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('link_card'),
  url: httpUrlSchema,
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1).optional(),
  image: linkCardImageSchema.optional(),
});

// ── Video links ──────────────────────────────────────────────────────────
// Only provider + video_id are ever stored or returned — never the pasted
// url — so a video Block can't carry an arbitrary embed target.

export const VIDEO_PROVIDERS = ['youtube', 'vimeo'] as const;
export const videoProviderSchema = z.enum(VIDEO_PROVIDERS);
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export interface ParsedVideoLink {
  provider: VideoProvider;
  video_id: string;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,}$/;
const VIMEO_ID_RE = /^\d+$/;

/**
 * Parse a pasted YouTube or Vimeo url into `{ provider, video_id }`, or
 * `null` for any other host (or a link on a known host this can't read).
 * Exported so the admin editor can preview a pasted link before it's ever
 * sent to the server.
 */
export function parseVideoUrl(raw: string): ParsedVideoLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0] ?? '';
      return YOUTUBE_ID_RE.test(id) ? { provider: 'youtube', video_id: id } : null;
    }
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v') ?? '';
      return YOUTUBE_ID_RE.test(id) ? { provider: 'youtube', video_id: id } : null;
    }
    const embedMatch = /^\/embed\/([^/?]+)/.exec(url.pathname);
    if (embedMatch && YOUTUBE_ID_RE.test(embedMatch[1])) {
      return { provider: 'youtube', video_id: embedMatch[1] };
    }
    const shortsMatch = /^\/shorts\/([^/?]+)/.exec(url.pathname);
    if (shortsMatch && YOUTUBE_ID_RE.test(shortsMatch[1])) {
      return { provider: 'youtube', video_id: shortsMatch[1] };
    }
    return null;
  }

  if (VIMEO_HOSTS.has(host)) {
    const segments = url.pathname.split('/').filter(Boolean);
    // `/album/2222/video/1111` and `player.vimeo.com/video/1111` both name
    // the actual video id right after a literal "video" segment — checked
    // first, since the *first* numeric segment in an album/showcase link is
    // the album id, not the video.
    const videoIdx = segments.indexOf('video');
    if (videoIdx !== -1 && VIMEO_ID_RE.test(segments[videoIdx + 1] ?? '')) {
      return { provider: 'vimeo', video_id: segments[videoIdx + 1] };
    }
    // Otherwise (`/76979871`, `/channels/staffpicks/76979871`) the video id
    // is the last numeric segment, not the first.
    const numeric = segments.filter((segment) => VIMEO_ID_RE.test(segment));
    const id = numeric[numeric.length - 1];
    return id ? { provider: 'vimeo', video_id: id } : null;
  }

  return null;
}

// The client sends a pasted `url`; only the parsed `provider` + `video_id`
// ever reach the union's output type, per ADR 0001.
export const videoBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('video'),
    url: z.string().min(1, 'url is required'),
  })
  .transform((val, ctx) => {
    const parsed = parseVideoUrl(val.url);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'url must be a YouTube or Vimeo link', path: ['url'] });
      return z.NEVER;
    }
    return { id: val.id, type: 'video' as const, provider: parsed.provider, video_id: parsed.video_id };
  });

export const blockSchema = z.discriminatedUnion(
  'type',
  [
    paragraphBlockSchema,
    headingBlockSchema,
    listBlockSchema,
    quoteBlockSchema,
    calloutBlockSchema,
    dividerBlockSchema,
    imageBlockSchema,
    videoBlockSchema,
    linkCardBlockSchema,
  ],
  { error: 'Unknown block type' },
);

export const MAX_BODY_BLOCKS = 200;

export const articleBodySchema = z
  .array(blockSchema)
  .max(MAX_BODY_BLOCKS, { message: `Body cannot have more than ${MAX_BODY_BLOCKS} Blocks` })
  .superRefine((blocks, ctx) => {
    const seen = new Set<string>();
    blocks.forEach((block, index) => {
      if (seen.has(block.id)) {
        ctx.addIssue({ code: 'custom', message: `Block id "${block.id}" is used more than once`, path: [index, 'id'] });
      }
      seen.add(block.id);
    });
  });

export type InlineSpan = z.infer<typeof inlineSpanSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ListBlock = z.infer<typeof listBlockSchema>;
export type QuoteBlock = z.infer<typeof quoteBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;
export type DividerBlock = z.infer<typeof dividerBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type LinkCardBlock = z.infer<typeof linkCardBlockSchema>;
export type ArticleBlock = z.infer<typeof blockSchema>;
export type ArticleBody = z.infer<typeof articleBodySchema>;

// ── Body asset urls ──────────────────────────────────────────────────────
// Every url in a Body that points at an uploaded asset (an image Block, or a
// link card's image) rather than an arbitrary external link. @app/shared
// can't check these against the R2 allowlist (server config), so it hands
// the backend exactly the urls that need that check, each tagged with the
// Block position and field for an error message that names both.

export interface ArticleBodyAssetRef {
  position: number;
  field: string;
  url: string;
}

export function getArticleBodyAssetUrls(body: ArticleBody): ArticleBodyAssetRef[] {
  const refs: ArticleBodyAssetRef[] = [];
  body.forEach((block, position) => {
    if (block.type === 'image') {
      refs.push({ position, field: 'url', url: block.url });
    }
    if (block.type === 'link_card' && block.image) {
      refs.push({ position, field: 'image.url', url: block.image.url });
    }
  });
  return refs;
}

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
// back office. `featured=true` narrows to the single hand-picked Featured
// Article (ADR 0002) — there is never more than one, so this returns zero or
// one item, not a ranked page.

export const publicArticleListQuerySchema = z.object({
  category: articleCategorySchema.optional(),
  featured: z.enum(['true']).optional(),
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

/**
 * Word count across every Block the reader actually reads (paragraph,
 * heading, list, quote, callout text), at ~200 wpm, min 1 minute for any
 * non-empty Body. A quote's attribution, a caption, and a link card's
 * title/description are labels, not reading content, so they don't count —
 * divider, image and video carry no text at all.
 */
export function computeReadingTimeMinutes(body: ArticleBody): number {
  let wordCount = 0;
  for (const block of body) {
    switch (block.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        for (const span of block.content) wordCount += countWords(span.text);
        break;
      case 'heading':
        wordCount += countWords(block.text);
        break;
      case 'list':
        for (const item of block.items) {
          for (const span of item) wordCount += countWords(span.text);
        }
        break;
      case 'divider':
      case 'image':
      case 'video':
      case 'link_card':
        break;
    }
  }
  if (wordCount === 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
