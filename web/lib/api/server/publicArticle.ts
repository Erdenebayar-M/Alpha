import { cache } from "react";
import { BACKEND_URL } from "@/lib/api/server/backendUrl";
import type { ArticleCategoryValue } from "@/lib/content";
import type { ArticleBody } from "@/components/article/types";

export interface PublicArticle {
  slug: string;
  title: string;
  category: ArticleCategoryValue;
  body: ArticleBody;
}

/**
 * Memoized per request, so generateMetadata and the page share one fetch.
 * Fetches a Published Article from the unauthenticated `GET /api/articles/:slug`
 * (backend/src/routes/articles.ts). Returns null for a 404 — a Draft and an
 * unknown slug are indistinguishable there on purpose — and throws on any
 * other failure so a backend outage isn't mistaken for a missing Article.
 */
export const fetchPublicArticle = cache(async (slug: string): Promise<PublicArticle | null> => {
  const res = await fetch(`${BACKEND_URL}/api/articles/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(`Backend returned ${res.status} for article ${slug}`);
  }
  return json.data.article as PublicArticle;
});
