import { z } from "zod";
import { articleCategorySchema } from "@app/shared";

// Published Articles are copied from production through its public read API
// (GET /api/articles, GET /api/articles/:slug), never its database, so this
// can only ever see what any visitor sees. These schemas mirror the public
// selects in src/routes/articles.ts.

const PER_PAGE = 50; // publicArticleListQuerySchema's maximum

const summarySchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  excerpt: z.string().nullable(),
  category: articleCategorySchema,
  thumbnail_url: z.string().nullable(),
  thumbnail_alt: z.string().nullable(),
  thumbnail_width: z.number().int().nullable(),
  thumbnail_height: z.number().int().nullable(),
  reading_time_minutes: z.number().int(),
  published_at: z.string().nullable(),
  is_featured: z.boolean(),
});

// Body is kept exactly as production stored it: re-parsing it with
// articleBodySchema would normalise old Block shapes on the way through.
const publicArticleSchema = summarySchema.extend({
  body: z.array(z.record(z.string(), z.unknown())),
});
export type PublicArticle = z.infer<typeof publicArticleSchema>;

const listSchema = z.object({
  articles: z.array(summarySchema),
  meta: z.object({ total: z.number().int(), has_next: z.boolean() }),
});
const detailSchema = z.object({ article: publicArticleSchema });

type FetchFn = (input: string | URL) => Promise<Response>;

async function getData<T>(url: URL, schema: z.ZodType<T>, fetchFn: FetchFn): Promise<T> {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  const envelope = (await res.json()) as { data?: unknown };
  const parsed = schema.safeParse(envelope.data);
  if (!parsed.success) {
    throw new Error(`GET ${url} returned an unexpected shape: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Every published Article on the API at `baseUrl`, Body included. Any failed
 *  or malformed response throws, so a run never copies half a set. */
export async function fetchPublishedArticles(
  baseUrl: string,
  fetchFn: FetchFn = fetch,
): Promise<PublicArticle[]> {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const slugs = new Set<string>();
  let total = 0;
  for (let page = 1; ; page++) {
    const url = new URL(`api/articles?page=${page}&per_page=${PER_PAGE}`, base);
    const { articles, meta } = await getData(url, listSchema, fetchFn);
    for (const a of articles) slugs.add(a.slug);
    total = meta.total;
    if (!meta.has_next) break;
  }
  // The list is offset-paged by published_at alone, so Articles tied across a
  // page boundary can be skipped or repeated. Catch it rather than copy short.
  if (slugs.size !== total) {
    throw new Error(`Listed ${slugs.size} distinct Articles but the API reports ${total}; re-run to retry`);
  }
  const articles: PublicArticle[] = [];
  for (const slug of slugs) {
    const url = new URL(`api/articles/${encodeURIComponent(slug)}`, base);
    articles.push((await getData(url, detailSchema, fetchFn)).article);
  }
  return articles;
}
