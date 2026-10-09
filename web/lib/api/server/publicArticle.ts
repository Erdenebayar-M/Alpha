import { cache } from "react";
import { BACKEND_URL } from "@/lib/api/server/backendUrl";
import type { ArticleCategoryValue } from "@/lib/content";
import { toThumbnail, type Thumbnail } from "@/lib/api/server/publicArticles";
import type { ArticleBody } from "@/components/article/types";

export interface PublicArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: Thumbnail | null;
  category: ArticleCategoryValue;
  body: ArticleBody;
}

// About five minutes, matching the homepage list, so a card and its reading
// page can't disagree for longer than that.
const REVALIDATE_SECONDS = 300;

/**
 * Memoized per request, so generateMetadata and the page share one fetch.
 * Fetches a Published Article from the unauthenticated `GET /api/articles/:slug`
 * (backend/src/routes/articles.ts). Returns null for a 404 — a Draft and an
 * unknown slug are indistinguishable there on purpose — and throws on any
 * other failure so a backend outage isn't mistaken for a missing Article.
 */
export const fetchPublicArticle = cache(async (slug: string): Promise<PublicArticle | null> => {
  const res = await fetch(`${BACKEND_URL}/api/articles/${encodeURIComponent(slug)}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(`Backend returned ${res.status} for article ${slug}`);
  }
  const raw = json.data.article;
  return { ...raw, excerpt: raw.excerpt || null, thumbnail: toThumbnail(raw) } as PublicArticle;
});
