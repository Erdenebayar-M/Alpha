import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/**
 * Stand-in for the real backend's public `GET /api/articles/:slug`, so e2e
 * runs need no backend or database. Playwright's webServer starts it and
 * points the Next server's BACKEND_URL here (playwright.config.ts). Serves
 * one Published Article, the public article list (see articleScenarios),
 * plus the auth routes the sign-in, sign-up,
 * confirm-email, forgot-password and reset-password pages and the Google
 * callback call
 * (see FIXTURE_PARENT), `GET /api/auth/me` that proxy.ts checks a session
 * with, and the learner/diagnostic routes the Diagnostic proxy calls as that
 * parent;
 * every other slug — including a Draft's — is a 404,
 * matching the real route.
 */
export const PORT = 3211;
export const FIXTURE_SLUG = "fixture-article";

// Login stub: one parent signs in, one email is always rate-limited, anyone
// else is INVALID_CREDENTIALS — the three outcomes the sign-in page renders.
export const FIXTURE_PARENT = { email: "parent@example.com", password: "correct-password", token: "fixture-session-token" };
export const RATE_LIMITED_EMAIL = "limited@example.com";
// A parent who has not confirmed their email: the right password is
// EMAIL_NOT_CONFIRMED with the masked address, a wrong one the generic error.
export const UNCONFIRMED_PARENT = { email: "unconfirmed@example.com", password: "correct-password", maskedEmail: "u***@example.com" };
// A token `GET /api/auth/me` still accepts but the diagnostic routes reject,
// standing in for one revoked between page load and starting the Diagnostic.
export const EXPIRES_MID_FLOW_TOKEN = "expires-mid-flow-token";

const span = (text, extra = {}) => ({ text, ...extra });

const article = {
  slug: FIXTURE_SLUG,
  title: "Fixture article title",
  excerpt: "Fixture article excerpt",
  // Backend-relative, as a locally served upload is stored (see THUMBNAIL_PATH).
  thumbnail_url: "/content/images/fixture-thumbnail.svg",
  thumbnail_alt: "Fixture thumbnail alt",
  thumbnail_width: 389,
  thumbnail_height: 303,
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
    {
      id: "b9",
      type: "paragraph",
      indent: true,
      content: [
        span(
          "Indented paragraph text that runs long enough to wrap onto a second line, so the first line starts further in than the lines after it do at every viewport width.",
        ),
      ],
    },
  ],
};

const IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#cfe0ff"/></svg>`;

function readJson(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

function fail(res, status, code, message, details) {
  send(res, status, "application/json", JSON.stringify({ success: false, error: { code, message, ...(details && { details }) } }));
}

async function login(req, res) {
  const body = await readJson(req);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  if (body?.email === FIXTURE_PARENT.email && body?.password === FIXTURE_PARENT.password) {
    const data = { id: "fixture-parent", email: body.email, name: "Fixture Parent", token: FIXTURE_PARENT.token };
    return send(res, 200, "application/json", JSON.stringify({ success: true, data }));
  }
  if (body?.email === UNCONFIRMED_PARENT.email && body?.password === UNCONFIRMED_PARENT.password) {
    return fail(res, 403, "EMAIL_NOT_CONFIRMED", "Email is not confirmed yet", { email: UNCONFIRMED_PARENT.maskedEmail });
  }
  fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
}

// Register stub: the fixture parent's email is taken, another is rate-limited,
// anyone else signs up — answered, as the real route does, with the address
// the confirmation link went to and no token. Every body is kept under its
// email, so a spec can look up its own (specs run in parallel) and check what
// arrived — the surname, `next` — and that nothing else did.
export const TAKEN_EMAIL = FIXTURE_PARENT.email;
const registerBodies = new Map();

// The one common password the fixture knows: register and reset-password
// refuse it as the real routes do, naming the reason in `details.password`.
export const COMMON_PASSWORD = "password1";
const commonPasswordFailure = (res) =>
  fail(res, 400, "VALIDATION_ERROR", "Password is too common — choose another", { password: ["PASSWORD_COMMON"] });

async function register(req, res) {
  const body = await readJson(req);
  if (typeof body?.email === "string") registerBodies.set(body.email, body);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  if (body?.email === TAKEN_EMAIL) return fail(res, 409, "DUPLICATE_EMAIL", "Email already registered");
  if (body?.password === COMMON_PASSWORD) return commonPasswordFailure(res);
  send(res, 201, "application/json", JSON.stringify({ success: true, data: { email: body?.email } }));
}

// Confirm-email stub: one token confirms and signs in; any other is
// INVALID_CONFIRMATION_TOKEN, as the real route answers for an expired, used
// or unknown link. Every token is recorded, so a spec can count its own.
export const VALID_CONFIRMATION_TOKEN = "fixture-confirmation-token";
const confirmEmailRequests = [];

async function confirmEmail(req, res) {
  const body = await readJson(req);
  confirmEmailRequests.push(body?.token);
  if (body?.token !== VALID_CONFIRMATION_TOKEN) return fail(res, 400, "INVALID_CONFIRMATION_TOKEN", "Confirmation link is expired or invalid");
  const data = { id: "fixture-new-parent", email: "new-parent@example.com", name: "Болд", token: FIXTURE_PARENT.token };
  send(res, 200, "application/json", JSON.stringify({ success: true, data }));
}

// Forgot-password stub: the same success for every email, as the real route
// answers, except the rate-limited one. Every accepted email is recorded so a
// spec can count its own requests.
const forgotPasswordRequests = [];

async function forgotPassword(req, res) {
  const body = await readJson(req);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  forgotPasswordRequests.push(body?.email);
  send(res, 200, "application/json", JSON.stringify({ success: true, data: { ok: true } }));
}

// Resend-confirmation stub: the same success for every email, as the real
// route answers, except the rate-limited one. Every accepted body is recorded
// so a spec can look up its own requests.
const resendConfirmationRequests = [];

async function resendConfirmation(req, res) {
  const body = await readJson(req);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  resendConfirmationRequests.push(body);
  send(res, 200, "application/json", JSON.stringify({ success: true, data: { ok: true } }));
}

// Reset-password stub: one token resets and signs in; any other is
// INVALID_RESET_TOKEN, as the real route answers for an expired, used or
// unknown link.
export const VALID_RESET_TOKEN = "fixture-reset-token";

async function resetPassword(req, res) {
  const body = await readJson(req);
  if (body?.token !== VALID_RESET_TOKEN) return fail(res, 400, "INVALID_RESET_TOKEN", "Reset link is expired or invalid");
  if (body?.password === COMMON_PASSWORD) return commonPasswordFailure(res);
  const data = { id: "fixture-parent", email: FIXTURE_PARENT.email, name: "Fixture Parent", token: FIXTURE_PARENT.token };
  send(res, 200, "application/json", JSON.stringify({ success: true, data }));
}

// Google stub: one authorization code signs in; any other is
// GOOGLE_AUTH_FAILED, as the real route answers for a bad code or id_token.
// Every body is recorded so a spec can find its own (specs run in parallel)
// and check the verifier and redirect_uri web forwarded. Real Google is never
// contacted.
export const VALID_GOOGLE_CODE = "fixture-google-code";
const googleRequests = [];

async function google(req, res) {
  const body = await readJson(req);
  googleRequests.push(body);
  if (body?.code !== VALID_GOOGLE_CODE) return fail(res, 401, "GOOGLE_AUTH_FAILED", "Google sign-in failed");
  const data = { id: "fixture-google-parent", email: "google@example.com", name: "Google Parent", token: FIXTURE_PARENT.token };
  send(res, 200, "application/json", JSON.stringify({ success: true, data }));
}

// Learner/diagnostic stubs: like the real routes, they require a parent's
// Bearer token, and only the fixture parent's is valid — any other is
// UNAUTHORIZED, as the real backend answers for an expired or revoked token.
// Every call is recorded with the token it carried, so a spec can check the
// proxy acted as the signed-in parent. A learner's id carries the child's
// name, so a spec can pick out its own calls (specs run in parallel).
const diagnosticRequests = [];
const DIAGNOSTIC_TASK = {
  id: "fixture-task",
  task_type: "SELF_CHECK",
  prompt_text: "Fixture task",
  interaction_form: null,
  options: {},
  audio_url: null,
  image_url: null,
  primary_skill: "S1",
  estimated_time_seconds: 10,
  feedback_text: null,
  feedback_correct: null,
  feedback_wrong: null,
  correct_answer: "fixture answer",
};

async function asParent(req, res, respond) {
  const authorization = req.headers.authorization ?? null;
  const body = await readJson(req);
  diagnosticRequests.push({ path: req.url, authorization, body });
  if (authorization !== `Bearer ${FIXTURE_PARENT.token}`) return fail(res, 401, "UNAUTHORIZED", "Unauthorized");
  send(res, 200, "application/json", JSON.stringify({ success: true, data: respond(body) }));
}

// Public article list (`GET /api/articles`): Published Article summaries,
// newest first, in the shape the real route's summary select returns. Which
// set it serves is a scenario a spec switches with `POST /__articles-scenario`
// (home-articles.spec.ts mirrors these titles), each with titles unique to it so stale data from
// another scenario can't pass a check. `down` answers 500.
//
// E2E runs on `next dev`, where a request sent with `cache-control: no-cache`
// (home-articles.spec.ts) makes Next skip the homepage's 5-minute fetch
// revalidation, so a scenario switch shows on the next load. A production
// build ignores that header: if e2e moves to one, the article fetches would
// need a cache tag plus a test-only on-demand revalidation route instead.
const THUMBNAIL_PATH = "/content/images/fixture-thumbnail.svg";

function summary(slug, title, { category = "READING", excerpt = null, thumbnail = false, thumbnailAlt = null, featured = false, publishedAt }) {
  return {
    slug,
    title,
    excerpt,
    category,
    // Backend-relative, as the real backend stores a locally served upload —
    // web resolves it against the backend origin.
    thumbnail_url: thumbnail ? THUMBNAIL_PATH : null,
    thumbnail_alt: thumbnail ? thumbnailAlt : null,
    thumbnail_width: thumbnail ? 389 : null,
    thumbnail_height: thumbnail ? 303 : null,
    reading_time_minutes: 4,
    published_at: publishedAt,
    is_featured: featured,
  };
}

const articleScenarios = {
  normal: [
    summary("normal-newest", "Normal newest article", { publishedAt: "2026-10-05T00:00:00.000Z" }),
    summary("normal-featured", "Normal featured article", {
      category: "ORTHOGRAPHY",
      excerpt: "Normal featured excerpt",
      thumbnail: true,
      thumbnailAlt: "Normal featured thumbnail",
      featured: true,
      publishedAt: "2026-10-04T00:00:00.000Z",
    }),
    summary("normal-second", "Normal second article", { category: "SPELLING", thumbnail: true, publishedAt: "2026-10-03T00:00:00.000Z" }),
    summary("normal-third", "Normal third article", { excerpt: "Normal third excerpt", publishedAt: "2026-10-02T00:00:00.000Z" }),
  ],
  "bare-featured": [
    summary("bare-featured", "Bare featured article", { featured: true, publishedAt: "2026-10-04T00:00:00.000Z" }),
  ],
  "no-featured": [
    summary("no-featured-first", "No-featured first article", { publishedAt: "2026-10-04T00:00:00.000Z" }),
    summary("no-featured-second", "No-featured second article", { publishedAt: "2026-10-03T00:00:00.000Z" }),
  ],
  // Two non-featured Articles besides the Featured one: the grid shows just those.
  "two-articles": [
    summary("two-articles-first", "Two-articles first article", { category: "SPELLING", thumbnail: true, thumbnailAlt: "Two-articles first thumbnail", publishedAt: "2026-10-05T00:00:00.000Z" }),
    summary("two-articles-featured", "Two-articles featured article", { featured: true, publishedAt: "2026-10-04T00:00:00.000Z" }),
    summary("two-articles-second", "Two-articles second article", { category: "ORTHOGRAPHY", publishedAt: "2026-10-03T00:00:00.000Z" }),
  ],
  down: [],
};
let articleScenario = "normal";

function listArticles(req, res) {
  if (articleScenario === "down") return fail(res, 500, "INTERNAL", "Fixture backend is down");
  const params = new URL(req.url ?? "/", `http://localhost:${PORT}`).searchParams;
  const page = Number(params.get("page") ?? 1);
  const perPage = Number(params.get("per_page") ?? 12);
  const matching = articleScenarios[articleScenario].filter((article) => params.get("featured") !== "true" || article.is_featured);
  const articles = matching.slice((page - 1) * perPage, page * perPage);
  const meta = { page, per_page: perPage, total: matching.length, has_next: page * perPage < matching.length };
  send(res, 200, "application/json", JSON.stringify({ success: true, data: { articles, meta } }));
}

async function setArticleScenario(req, res) {
  const body = await readJson(req);
  if (!(body?.scenario in articleScenarios)) return fail(res, 400, "VALIDATION_ERROR", "Unknown scenario");
  articleScenario = body.scenario;
  // The titles let the spec check its mirror of them hasn't drifted.
  const titles = articleScenarios[articleScenario].map((article) => article.title);
  send(res, 200, "application/json", JSON.stringify({ success: true, data: { scenario: articleScenario, titles } }));
}

function send(res, status, contentType, body) {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}

export function startFixtureBackend() {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (req.method === "POST" && pathname === "/api/auth/login") return login(req, res);
    if (req.method === "POST" && pathname === "/api/auth/register") return register(req, res);
    if (req.method === "POST" && pathname === "/api/auth/confirm-email") return confirmEmail(req, res);
    if (req.method === "POST" && pathname === "/api/auth/forgot-password") return forgotPassword(req, res);
    if (req.method === "POST" && pathname === "/api/auth/resend-confirmation") return resendConfirmation(req, res);
    if (req.method === "POST" && pathname === "/api/auth/reset-password") return resetPassword(req, res);
    if (req.method === "POST" && pathname === "/api/auth/google") return google(req, res);
    if (req.method === "GET" && pathname === "/api/auth/me") {
      const valid = [FIXTURE_PARENT.token, EXPIRES_MID_FLOW_TOKEN].map((token) => `Bearer ${token}`);
      if (!valid.includes(req.headers.authorization)) return fail(res, 401, "UNAUTHORIZED", "Unauthorized");
      return send(res, 200, "application/json", JSON.stringify({ success: true, data: { id: "fixture-parent", email: FIXTURE_PARENT.email, name: "Болд", surname: "Дорж" } }));
    }
    if (req.method === "POST" && pathname === "/api/learner") return asParent(req, res, (body) => ({ id: `fixture-learner:${body?.name}` }));
    if (req.method === "POST" && pathname === "/api/diagnostic/start") {
      return asParent(req, res, () => ({ session_id: "fixture-session", task: DIAGNOSTIC_TASK, item_number: 1 }));
    }
    if (req.method === "GET" && pathname === "/__diagnostic-requests") return send(res, 200, "application/json", JSON.stringify(diagnosticRequests));
    if (req.method === "GET" && pathname === "/__google-requests") return send(res, 200, "application/json", JSON.stringify(googleRequests));
    if (req.method === "GET" && pathname === "/__confirm-email-requests") return send(res, 200, "application/json", JSON.stringify(confirmEmailRequests));
    if (req.method === "GET" && pathname === "/__forgot-password-requests") return send(res, 200, "application/json", JSON.stringify(forgotPasswordRequests));
    if (req.method === "GET" && pathname === "/__resend-confirmation-requests") return send(res, 200, "application/json", JSON.stringify(resendConfirmationRequests));
    if (req.method === "GET" && pathname === "/__register") {
      const email = new URL(req.url ?? "/", `http://localhost:${PORT}`).searchParams.get("email");
      return send(res, 200, "application/json", JSON.stringify(registerBodies.get(email) ?? null));
    }
    if (pathname === "/fixture.svg" || pathname === THUMBNAIL_PATH) return send(res, 200, "image/svg+xml", IMAGE_SVG);
    if (req.method === "POST" && pathname === "/__articles-scenario") return setArticleScenario(req, res);
    if (req.method === "GET" && pathname === "/api/articles") return listArticles(req, res);
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
