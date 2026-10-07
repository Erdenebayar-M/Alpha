import { fetchPublishedArticles } from "../articles";

function summary(slug: string, extra: Record<string, unknown> = {}) {
  return {
    slug,
    title: `Title ${slug}`,
    excerpt: null,
    category: "READING",
    thumbnail_url: null,
    thumbnail_alt: null,
    thumbnail_width: null,
    thumbnail_height: null,
    reading_time_minutes: 3,
    published_at: "2026-09-01T00:00:00.000Z",
    is_featured: false,
    ...extra,
  };
}

const body = [{ id: "b1", type: "paragraph", content: [{ text: "Сайн уу" }] }];

/** A fake production API serving `slugs` as published Articles, `perPage` per list page. */
function fakeApi(slugs: string[], perPage = 2) {
  const requested: string[] = [];
  const fetchFn = async (input: string | URL) => {
    const url = new URL(input.toString());
    requested.push(url.pathname + url.search);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: data }), { status });
    if (url.pathname === "/api/articles") {
      const page = Number(url.searchParams.get("page") ?? 1);
      const items = slugs.slice((page - 1) * perPage, page * perPage).map((s) => summary(s));
      return json({ articles: items, meta: { page, per_page: perPage, total: slugs.length, has_next: page * perPage < slugs.length } });
    }
    const slug = decodeURIComponent(url.pathname.replace("/api/articles/", ""));
    if (!slugs.includes(slug)) return json({ code: "NOT_FOUND", message: "nope" }, 404);
    return json({ article: { ...summary(slug, { is_featured: slug === "featured" }), body } });
  };
  return { fetchFn, requested };
}

describe("fetchPublishedArticles", () => {
  it("returns every published Article with its Body, across list pages", async () => {
    const { fetchFn } = fakeApi(["featured", "two", "three"]);
    const articles = await fetchPublishedArticles("https://api.example.com", fetchFn);
    expect(articles.map((a) => a.slug)).toEqual(["featured", "two", "three"]);
    expect(articles[0]).toMatchObject({ is_featured: true, body, category: "READING", reading_time_minutes: 3 });
  });

  it("accepts a base URL with a trailing slash", async () => {
    const { fetchFn, requested } = fakeApi(["one"]);
    await fetchPublishedArticles("https://api.example.com/", fetchFn);
    expect(requested[0]).toMatch(/^\/api\/articles\?/);
  });

  it("returns nothing when production has no published Articles", async () => {
    const { fetchFn } = fakeApi([]);
    await expect(fetchPublishedArticles("https://api.example.com", fetchFn)).resolves.toEqual([]);
  });

  it("fails loudly on an HTTP error instead of returning a partial copy", async () => {
    const fetchFn = async () => new Response("Bad gateway", { status: 502 });
    await expect(fetchPublishedArticles("https://api.example.com", fetchFn)).rejects.toThrow(/502/);
  });

  it("fails loudly when paging skips or repeats an Article, instead of copying an incomplete set", async () => {
    // Page 2 repeats page 1's last slug (tied published_at), so "three" is never listed.
    const { fetchFn: inner } = fakeApi(["one", "two", "three"]);
    const fetchFn = async (input: string | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === "/api/articles" && url.searchParams.get("page") === "2") {
        return new Response(JSON.stringify({ success: true, data: {
          articles: [summary("two")], meta: { page: 2, per_page: 2, total: 3, has_next: false },
        } }), { status: 200 });
      }
      return inner(input);
    };
    await expect(fetchPublishedArticles("https://api.example.com", fetchFn)).rejects.toThrow(/3/);
  });

  it("fails on a response that isn't the public Article shape", async () => {
    const fetchFn = async () => new Response(JSON.stringify({ success: true, data: { articles: "nope" } }), { status: 200 });
    await expect(fetchPublishedArticles("https://api.example.com", fetchFn)).rejects.toThrow();
  });
});
