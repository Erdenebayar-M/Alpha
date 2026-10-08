import { test, expect } from "@playwright/test";
import { POST } from "@/app/api/feedback/route";
import { feedbackEnabled } from "@/lib/feedback/config";

// The widget only runs when FEEDBACK_ENABLED and a token are set, and the e2e
// Next server runs without them (production's setup), so these call the route
// directly with GitHub's API stubbed. The production side is the last tests.
const TOKEN = "fixture-github-token";
const ORIGIN = "http://localhost:3000";

type SentIssue = { url: string; authorization: string | null; body: { title: string; body: string; labels: string[] } };

let sent: SentIssue[] = [];
let githubStatus = 201;
const realFetch = globalThis.fetch;

// Each test posts from its own address, so one test's submissions don't count
// towards another's rate limit (tests in a worker share the route's module).
let nextIp = 1;
function submit(payload: unknown, ip = `203.0.113.${nextIp++}`) {
  return POST(
    new Request(`${ORIGIN}/api/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

const valid = {
  text: "Make the hero title bigger\nIt reads too small on phones.",
  figmaUrl: "https://www.figma.com/design/abc123/Orto?node-id=1360-8937",
  pageUrl: `${ORIGIN}/articles/fixture-article?x=1`,
  viewport: { width: 390, height: 844 },
};

test.describe("with the widget enabled", () => {
  test.beforeEach(() => {
    process.env.FEEDBACK_ENABLED = "1";
    process.env.FEEDBACK_GITHUB_TOKEN = TOKEN;
    process.env.VERCEL_GIT_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
    sent = [];
    githubStatus = 201;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      sent.push({ url: String(input), authorization: headers.get("authorization"), body: JSON.parse(String(init?.body)) });
      return Response.json({ number: 42, html_url: "https://github.com/Erdenebayar-M/Alpha/issues/42" }, { status: githubStatus });
    }) as typeof fetch;
  });
  test.afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.FEEDBACK_ENABLED;
    delete process.env.FEEDBACK_GITHUB_TOKEN;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  test("is enabled", () => {
    expect(feedbackEnabled()).toBe(true);
  });

  test("a submission creates an issue on this repo, labelled needs-triage, with the token kept server-side", async () => {
    const res = await submit(valid);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ issueNumber: 42, issueUrl: "https://github.com/Erdenebayar-M/Alpha/issues/42" });
    expect(JSON.stringify(json)).not.toContain(TOKEN);

    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.github.com/repos/Erdenebayar-M/Alpha/issues");
    expect(sent[0].authorization).toBe(`Bearer ${TOKEN}`);
    expect(sent[0].body.labels).toEqual(["needs-triage"]);
  });

  test("the issue has a title from the text's first line, the text, the Figma link and the captured context", async () => {
    await submit(valid);
    const { title, body } = sent[0].body;
    expect(title).toBe("Feedback: Make the hero title bigger");
    expect(body).toContain("Make the hero title bigger\nIt reads too small on phones.");
    expect(body).toContain(valid.figmaUrl);
    expect(body).toContain(`- Page: ${ORIGIN}/articles/fixture-article\n`);
    expect(body).toContain("390 × 844");
    expect(body).toContain("0123456789abcdef0123456789abcdef01234567");
  });

  test("the page URL loses its query and hash, so a reset or confirmation token never reaches the issue", async () => {
    await submit({ ...valid, pageUrl: `${ORIGIN}/reset-password?token=secret-reset-token#frag` });
    expect(sent[0].body.body).toContain(`- Page: ${ORIGIN}/reset-password\n`);
    expect(sent[0].body.body).not.toContain("secret-reset-token");
  });

  test("the text is fenced, so @mentions and #refs in it don't ping anyone or cross-link", async () => {
    await submit({ ...valid, text: "ask @someone about #12\n```\nstill inside" });
    const { body } = sent[0].body;
    // A fence longer than any backtick run in the text, so the text can't close it.
    expect(body.startsWith("````text\nask @someone about #12\n```\nstill inside\n````\n")).toBe(true);
  });

  test("a title cut never splits an emoji in half", async () => {
    await submit({ ...valid, text: "a".repeat(68) + "😀".repeat(10) });
    const { title } = sent[0].body;
    expect(title).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    expect(title.endsWith("…")).toBe(true);
  });

  test("a long first line is cut short in the title", async () => {
    await submit({ ...valid, text: "ж".repeat(200) });
    expect(sent[0].body.title.length).toBeLessThanOrEqual(80);
    expect(sent[0].body.title.endsWith("…")).toBe(true);
  });

  test("the Figma link is optional", async () => {
    expect((await submit({ ...valid, figmaUrl: undefined })).status).toBe(201);
    expect((await submit({ ...valid, figmaUrl: "" })).status).toBe(201);
    expect(sent[0].body.body).not.toContain("figma.com");
  });

  test("without a deployed commit the issue says so", async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    await submit(valid);
    expect(sent[0].body.body).toContain("Commit: not deployed");
  });

  for (const [name, payload] of [
    ["empty text", { ...valid, text: "" }],
    ["whitespace-only text", { ...valid, text: "  \n\t " }],
    ["no text", { ...valid, text: undefined }],
    ["oversized text", { ...valid, text: "a".repeat(5001) }],
    ["a page URL that isn't http(s)", { ...valid, pageUrl: "javascript:alert(1)" }],
    ["a bad viewport", { ...valid, viewport: { width: -1, height: "tall" } }],
    ["a body that isn't JSON", "not json"],
  ] as const) {
    test(`${name} is rejected without creating an issue`, async () => {
      const res = await submit(payload);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "VALIDATION_ERROR" });
      expect(sent).toHaveLength(0);
    });
  }

  for (const figmaUrl of ["https://evil.example/figma.com", "http://www.figma.com/design/abc", "figma.com/design/abc"]) {
    test(`a Figma link that isn't an https figma.com URL (${figmaUrl}) is rejected`, async () => {
      const res = await submit({ ...valid, figmaUrl });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "INVALID_FIGMA_URL" });
      expect(sent).toHaveLength(0);
    });
  }

  test("a request body over the size limit is refused before it is parsed", async () => {
    const res = await submit({ ...valid, text: "a".repeat(40_000) });
    expect(res.status).toBe(413);
    expect(sent).toHaveLength(0);
  });

  test("a body sent without Content-Length is still capped while it is read", async () => {
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 4096;
        if (pulled > 10_000_000) controller.close();
        else controller.enqueue(new Uint8Array(4096).fill(97));
      },
    });
    const res = await POST(
      new Request(`${ORIGIN}/api/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: endless, duplex: "half" } as RequestInit),
    );
    expect(res.status).toBe(413);
    expect(pulled).toBeLessThan(100_000);
    expect(sent).toHaveLength(0);
  });

  test("rejected submissions don't use up the rate limit", async () => {
    const ip = "198.51.100.8";
    for (let i = 0; i < 12; i++) expect((await submit({ ...valid, figmaUrl: "https://evil.example/x" }, ip)).status).toBe(400);
    expect((await submit(valid, ip)).status).toBe(201);
  });

  test("one address is rate-limited after a burst of submissions", async () => {
    const ip = "198.51.100.7";
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await submit(valid, ip)).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(sent).toHaveLength(10);
    // Another address is unaffected.
    expect((await submit(valid)).status).toBe(201);
  });

  test("a GitHub failure is a 502 that doesn't leak GitHub's response", async () => {
    githubStatus = 403;
    const res = await submit(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "UPSTREAM_ERROR" });
  });
});

test.describe("with an image", () => {
  const R2 = {
    R2_ACCOUNT_ID: "acct123",
    R2_ACCESS_KEY_ID: "fixture-access-key",
    R2_SECRET_ACCESS_KEY: "fixture-r2-secret",
    R2_BUCKET_NAME: "orto-assets",
    R2_PUBLIC_URL: "https://assets.example.test/",
  };
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  let puts: { url: string; headers: Headers; size: number }[] = [];
  let issues: SentIssue[] = [];
  let r2Status = 200;

  test.beforeEach(() => {
    Object.assign(process.env, R2, { FEEDBACK_ENABLED: "1", FEEDBACK_GITHUB_TOKEN: TOKEN });
    puts = [];
    issues = [];
    r2Status = 200;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PUT") {
        puts.push({ url, headers: new Headers(init.headers), size: (init.body as Uint8Array).byteLength });
        return new Response(null, { status: r2Status });
      }
      issues.push({ url, authorization: null, body: JSON.parse(String(init?.body)) });
      return Response.json({ number: 7, html_url: "https://github.com/Erdenebayar-M/Alpha/issues/7" }, { status: 201 });
    }) as typeof fetch;
  });
  test.afterEach(() => {
    globalThis.fetch = realFetch;
    for (const key of [...Object.keys(R2), "FEEDBACK_ENABLED", "FEEDBACK_GITHUB_TOKEN"]) delete process.env[key];
  });

  function submitWithImage(file: Blob | string | null, ip = `203.0.113.${100 + nextIp++}`, payload: unknown = valid) {
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    if (typeof file === "string") form.set("image", file);
    else if (file !== null) form.set("image", file, "shot.png");
    return POST(new Request(`${ORIGIN}/api/feedback`, { method: "POST", headers: { "x-forwarded-for": ip }, body: form }));
  }

  test("an image is stored under feedback/ in R2 and embedded in the issue", async () => {
    const res = await submitWithImage(new Blob([PNG], { type: "image/png" }));
    expect(res.status).toBe(201);
    expect(puts).toHaveLength(1);
    const { url, headers } = puts[0];
    expect(url).toMatch(/^https:\/\/acct123\.r2\.cloudflarestorage\.com\/orto-assets\/feedback\/[0-9a-f-]{36}\.png$/);
    expect(headers.get("content-type")).toBe("image/png");
    expect(headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=fixture-access-key\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=.*, Signature=[0-9a-f]{64}$/);
    const key = url.split("/orto-assets/")[1];
    expect(issues[0].body.body).toContain(`![Screenshot](https://assets.example.test/${key})`);
  });

  test("R2 credentials reach neither the response nor the issue", async () => {
    const res = await submitWithImage(new Blob([PNG]));
    const everything = JSON.stringify([await res.json(), issues]);
    expect(everything).not.toContain("fixture-r2-secret");
    expect(everything).not.toContain("fixture-access-key");
  });

  test("a multipart submission with no image works as the text-only one", async () => {
    expect((await submitWithImage(null)).status).toBe(201);
    expect((await submitWithImage(new Blob([]))).status).toBe(201);
    expect(puts).toHaveLength(0);
    expect(issues[0].body.body).not.toContain("![Screenshot]");
  });

  test("the file's claimed type is ignored: only real PNG/JPEG/GIF/WebP bytes are stored", async () => {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/png" });
    for (const file of [svg, new Blob(["just text"], { type: "image/png" }), "not a file"]) {
      const res = await submitWithImage(file);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "INVALID_IMAGE" });
    }
    expect(puts).toHaveLength(0);
    expect(issues).toHaveLength(0);
  });

  test("an oversized image is refused without a store or an issue", async () => {
    const big = new Uint8Array(3 * 1024 * 1024 + 1);
    big.set(PNG);
    const res = await submitWithImage(new Blob([big]));
    expect(res.status).toBe(413);
    expect(puts).toHaveLength(0);
    expect(issues).toHaveLength(0);
  });

  test("a rejected image doesn't use up the rate limit", async () => {
    const ip = "198.51.100.77";
    for (let i = 0; i < 12; i++) expect((await submitWithImage(new Blob(["x"]), ip)).status).toBe(400);
    expect((await submitWithImage(new Blob([PNG]), ip)).status).toBe(201);
  });

  test("a failed upload fails the submission rather than filing an issue without its screenshot", async () => {
    r2Status = 403;
    const res = await submitWithImage(new Blob([PNG]));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "UPSTREAM_ERROR" });
    expect(issues).toHaveLength(0);
  });

  test("an image with R2 unconfigured fails the submission", async () => {
    delete process.env.R2_BUCKET_NAME;
    const res = await submitWithImage(new Blob([PNG]));
    expect(res.status).toBe(502);
    expect(puts).toHaveLength(0);
    expect(issues).toHaveLength(0);
  });
});

test.describe("disabled", () => {
  test("without the flag, or with it on a Production deploy, the widget is off", () => {
    process.env.FEEDBACK_GITHUB_TOKEN = TOKEN;
    try {
      expect(feedbackEnabled()).toBe(false);
      process.env.FEEDBACK_ENABLED = "1";
      process.env.VERCEL_ENV = "production";
      expect(feedbackEnabled()).toBe(false);
      delete process.env.FEEDBACK_GITHUB_TOKEN;
      delete process.env.VERCEL_ENV;
      // A flag with no token can't create issues, so it doesn't show either.
      expect(feedbackEnabled()).toBe(false);
    } finally {
      delete process.env.FEEDBACK_ENABLED;
      delete process.env.FEEDBACK_GITHUB_TOKEN;
      delete process.env.VERCEL_ENV;
    }
  });

  test("the route is a 404 when disabled", async () => {
    const res = await submit(valid);
    expect(res.status).toBe(404);
  });

  // The e2e Next server runs with no feedback env, as production does.
  test("the real server renders no widget and 404s the route", async ({ request }) => {
    const page = await request.get("/");
    expect(await page.text()).not.toContain("data-feedback-widget");
    const res = await request.post("/api/feedback", { data: valid });
    expect(res.status()).toBe(404);
  });
});
