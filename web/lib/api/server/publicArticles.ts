import { BACKEND_URL } from "@/lib/api/server/backendUrl";
import { categoryByApiValue, type ArticleCategoryValue } from "@/lib/content";

export interface Thumbnail {
  /** Absolute: a backend-relative `/content/…` path is already resolved. */
  src: string;
  /** Null when staff gave none — the image is then decorative. */
  alt: string | null;
  width: number | null;
  height: number | null;
  /**
   * True unless the Thumbnail is on an R2 public host, the only one
   * next.config.ts's remotePatterns allow (any other host would make the
   * image component throw mid-render). A backend-served `/content/…` upload
   * is on a private address in development, which the optimizer refuses
   * without `dangerouslyAllowLocalIP` — an SSRF opening not worth it.
   */
  unoptimized: boolean;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  category: ArticleCategoryValue;
  thumbnail: Thumbnail | null;
  publishedAt: string;
  isFeatured: boolean;
}

// About five minutes, so a newly Published or Featured Article reaches the
// homepage soon without every visit hitting the backend.
const REVALIDATE_SECONDS = 300;
// A stalled backend must not hold the homepage render; give up and hide the
// section instead.
const TIMEOUT_MS = 5000;

/**
 * The one Featured article (web/CONTEXT.md), or null when none is Featured
 * or the list can't be fetched — see fetchArticleList.
 */
export async function fetchFeaturedArticle(): Promise<ArticleSummary | null> {
  const articles = await fetchArticleList({ featured: "true", per_page: "1" });
  return articles[0] ?? null;
}

/**
 * Up to `limit` of the newest Published Articles other than the Featured one
 * (so none shows twice on the homepage), newest first. At most one Article is
 * Featured, so asking for one more than `limit` always leaves enough.
 */
export async function fetchLatestArticles(limit: number): Promise<ArticleSummary[]> {
  const articles = await fetchArticleList({ per_page: String(limit + 1) });
  return articles.filter((article) => !article.isFeatured).slice(0, limit);
}

/**
 * Published Article summaries, newest first, from the unauthenticated
 * `GET /api/articles` (backend/src/routes/articles.ts). On the homepage a
 * failed list is no reason to fail the page, so any failure — network,
 * timeout, non-2xx, malformed payload — is logged here and returned as no
 * Articles. A single malformed summary (say, a Category web doesn't know
 * yet) is logged and skipped, keeping the rest.
 */
async function fetchArticleList(query: Record<string, string>): Promise<ArticleSummary[]> {
  const url = `${BACKEND_URL}/api/articles?${new URLSearchParams(query)}`;
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(`Backend returned ${res.status}`);
    const articles: unknown = json.data?.articles;
    if (!Array.isArray(articles)) throw new Error("Response has no articles array");
    return articles.flatMap((raw) => {
      const summary = toArticleSummary(raw);
      if (!summary) console.error(`Skipping malformed Article summary from ${url}:`, raw);
      return summary ? [summary] : [];
    });
  } catch (error) {
    console.error(`Article list request ${url} failed:`, error);
    return [];
  }
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNullableString = (value: unknown): value is string | null => value === null || isString(value);
const isNullableNumber = (value: unknown): value is number | null => value === null || typeof value === "number";

function toArticleSummary(raw: unknown): ArticleSummary | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  if (
    !isString(a.slug) ||
    !isString(a.title) ||
    !isNullableString(a.excerpt) ||
    !isString(a.category) ||
    !(a.category in categoryByApiValue) ||
    !isNullableString(a.thumbnail_url) ||
    !isNullableString(a.thumbnail_alt) ||
    !isNullableNumber(a.thumbnail_width) ||
    !isNullableNumber(a.thumbnail_height) ||
    !isString(a.published_at) ||
    typeof a.is_featured !== "boolean"
  ) {
    return null;
  }
  const thumbnail = resolveThumbnailUrl(a.thumbnail_url);
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt || null,
    category: a.category as ArticleCategoryValue,
    thumbnail: thumbnail && {
      ...thumbnail,
      alt: a.thumbnail_alt || null,
      width: a.thumbnail_width,
      height: a.thumbnail_height,
    },
    publishedAt: a.published_at,
    isFeatured: a.is_featured,
  };
}

// Stored Thumbnail urls are either on the R2 public host or a backend-relative
// `/content/…` path (backend/src/lib/asset-url.ts), served by the backend at
// BACKEND_URL. Anything else that isn't an absolute https url is dropped, so
// the card falls back to its illustration.
function resolveThumbnailUrl(url: string | null): Pick<Thumbnail, "src" | "unoptimized"> | null {
  if (!url) return null;
  if (url.startsWith("/content/")) return { src: new URL(url, BACKEND_URL).href, unoptimized: true };
  const parsed = URL.parse(url);
  if (parsed?.protocol !== "https:") return null;
  return { src: parsed.href, unoptimized: !parsed.hostname.endsWith(".r2.dev") };
}
