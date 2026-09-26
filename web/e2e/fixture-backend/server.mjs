import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/**
 * Stand-in for the real backend's public `GET /api/articles/:slug`, so e2e
 * runs need no backend or database. Playwright's webServer starts it and
 * points the Next server's BACKEND_URL here (playwright.config.ts). Serves
 * one Published Article; every other slug — including a Draft's — is a 404,
 * matching the real route.
 */
export const PORT = 3211;
export const FIXTURE_SLUG = "fixture-article";

const span = (text, extra = {}) => ({ text, ...extra });

const article = {
  slug: FIXTURE_SLUG,
  title: "Fixture article title",
  category: "READING",
  body: [
    { id: "b1", type: "paragraph", alignment: "center", content: [span("Centered paragraph text")] },
    {
      id: "b2",
      type: "image",
      source: "link",
      url: `http://localhost:${PORT}/fixture.svg`,
      alt: "Fixture image",
      width: 320,
      height: 180,
    },
    { id: "b3", type: "heading", level: 2, text: "Level two subheading" },
    {
      id: "b4",
      type: "list",
      style: "ordered",
      items: [{ spans: [span("First ordered item")] }, { spans: [span("Second ordered item")] }],
    },
    { id: "b5", type: "paragraph", content: [span("Paragraph splitting the list")] },
    {
      id: "b6",
      type: "list",
      style: "ordered",
      startsAt: 3,
      items: [{ spans: [span("Third ordered item")] }, { spans: [span("Fourth ordered item")] }],
    },
    {
      id: "b7",
      type: "quote",
      content: [span("Quoted words")],
      attribution: "Quote author",
    },
    {
      id: "b8",
      type: "list",
      style: "bullet",
      items: [{ spans: [span("Plain bullet one")] }, { spans: [span("Plain bullet two")] }],
    },
  ],
};

const IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#cfe0ff"/></svg>`;

function send(res, status, contentType, body) {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}

export function startFixtureBackend() {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (pathname === "/fixture.svg") return send(res, 200, "image/svg+xml", IMAGE_SVG);
    if (pathname === `/api/articles/${FIXTURE_SLUG}`) {
      return send(res, 200, "application/json", JSON.stringify({ success: true, data: { article } }));
    }
    if (pathname.startsWith("/api/articles/")) {
      const error = { code: "NOT_FOUND", message: "Article not found" };
      return send(res, 404, "application/json", JSON.stringify({ success: false, error }));
    }
    send(res, 404, "text/plain", "Not found");
  });
  server.listen(PORT);
  return server;
}

// Run directly by Playwright's webServer; importing this file doesn't listen.
if (import.meta.url === pathToFileURL(process.argv[1]).href) startFixtureBackend();
