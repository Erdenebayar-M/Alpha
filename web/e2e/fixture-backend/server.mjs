import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/**
 * Stand-in for the real backend's public `GET /api/articles/:slug`, so e2e
 * runs need no backend or database. Playwright's webServer starts it and
 * points the Next server's BACKEND_URL here (playwright.config.ts). Serves
 * one Published Article, plus the auth routes the sign-in, sign-up,
 * forgot-password and reset-password pages and the Google callback call
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

function fail(res, status, code, message) {
  send(res, status, "application/json", JSON.stringify({ success: false, error: { code, message } }));
}

async function login(req, res) {
  const body = await readJson(req);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  if (body?.email === FIXTURE_PARENT.email && body?.password === FIXTURE_PARENT.password) {
    const data = { id: "fixture-parent", email: body.email, name: "Fixture Parent", token: FIXTURE_PARENT.token };
    return send(res, 200, "application/json", JSON.stringify({ success: true, data }));
  }
  fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
}

// Register stub: the fixture parent's email is taken, another is rate-limited,
// anyone else signs up and gets a token. Every body is kept under its email,
// so a spec can look up its own (specs run in parallel) and check what
// arrived — the surname — and that nothing else did.
export const TAKEN_EMAIL = FIXTURE_PARENT.email;
const registerBodies = new Map();

async function register(req, res) {
  const body = await readJson(req);
  if (typeof body?.email === "string") registerBodies.set(body.email, body);
  if (body?.email === RATE_LIMITED_EMAIL) return fail(res, 429, "RATE_LIMITED", "Too many attempts");
  if (body?.email === TAKEN_EMAIL) return fail(res, 409, "DUPLICATE_EMAIL", "Email already registered");
  const data = { id: "fixture-new-parent", email: body?.email, name: body?.name, token: FIXTURE_PARENT.token };
  send(res, 201, "application/json", JSON.stringify({ success: true, data }));
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

// Reset-password stub: one token resets and signs in; any other is
// INVALID_RESET_TOKEN, as the real route answers for an expired, used or
// unknown link.
export const VALID_RESET_TOKEN = "fixture-reset-token";

async function resetPassword(req, res) {
  const body = await readJson(req);
  if (body?.token !== VALID_RESET_TOKEN) return fail(res, 400, "INVALID_RESET_TOKEN", "Reset link is expired or invalid");
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

function send(res, status, contentType, body) {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}

export function startFixtureBackend() {
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (req.method === "POST" && pathname === "/api/auth/login") return login(req, res);
    if (req.method === "POST" && pathname === "/api/auth/register") return register(req, res);
    if (req.method === "POST" && pathname === "/api/auth/forgot-password") return forgotPassword(req, res);
    if (req.method === "POST" && pathname === "/api/auth/reset-password") return resetPassword(req, res);
    if (req.method === "POST" && pathname === "/api/auth/google") return google(req, res);
    if (req.method === "GET" && pathname === "/api/auth/me") {
      if (req.headers.authorization !== `Bearer ${FIXTURE_PARENT.token}`) return fail(res, 401, "UNAUTHORIZED", "Unauthorized");
      return send(res, 200, "application/json", JSON.stringify({ success: true, data: { id: "fixture-parent", email: FIXTURE_PARENT.email, name: "Fixture Parent" } }));
    }
    if (req.method === "POST" && pathname === "/api/learner") return asParent(req, res, (body) => ({ id: `fixture-learner:${body?.name}` }));
    if (req.method === "POST" && pathname === "/api/diagnostic/start") {
      return asParent(req, res, () => ({ session_id: "fixture-session", task: DIAGNOSTIC_TASK, item_number: 1 }));
    }
    if (req.method === "GET" && pathname === "/__diagnostic-requests") return send(res, 200, "application/json", JSON.stringify(diagnosticRequests));
    if (req.method === "GET" && pathname === "/__google-requests") return send(res, 200, "application/json", JSON.stringify(googleRequests));
    if (req.method === "GET" && pathname === "/__forgot-password-requests") return send(res, 200, "application/json", JSON.stringify(forgotPasswordRequests));
    if (req.method === "GET" && pathname === "/__register") {
      const email = new URL(req.url ?? "/", `http://localhost:${PORT}`).searchParams.get("email");
      return send(res, 200, "application/json", JSON.stringify(registerBodies.get(email) ?? null));
    }
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
