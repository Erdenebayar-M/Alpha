import { NextResponse, type NextRequest } from "next/server";
import { devGate as copy } from "@/lib/content";

/**
 * The dev site's shared-password gate, run by proxy.ts only when
 * DEV_SITE_PASSWORD is set (Vercel Preview env; never Production). Until the
 * visitor has entered the password, a page gets a password form and an API
 * call gets a 401; the form posts back to the page's own URL, so a right
 * password lands the visitor where they were heading.
 *
 * The cookie holds a hash of the password, never the password itself, so
 * changing DEV_SITE_PASSWORD locks out everyone who unlocked with the old one.
 */
export const DEV_GATE_COOKIE = "orto_dev_gate";
const PASSWORD_FIELD = "dev-gate-password";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The response that replaces the visitor's request, or `undefined` once they have unlocked the site. */
export async function devGate(request: NextRequest, password: string): Promise<NextResponse | undefined> {
  const unlocked = await unlockToken(password);
  if (request.cookies.get(DEV_GATE_COOKIE)?.value === unlocked) return undefined;

  const { pathname, search } = request.nextUrl;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "DEV_SITE_LOCKED" }, { status: 401 });
  }

  const entered = request.method === "POST" ? await submittedPassword(request) : null;
  if (entered === null) return passwordPage(false);
  // Compared as hashes, so the time taken says nothing about the password.
  if ((await unlockToken(entered)) !== unlocked) return passwordPage(true);

  // The request's own origin, not publicOrigin(): the visitor stays on the
  // deploy they unlocked even where WEB_ORIGIN names another (a Preview deploy
  // sharing Production's). Next's proxy refuses a relative Location.
  const response = NextResponse.redirect(new URL(pathname + search, request.url), 303);
  response.cookies.set(DEV_GATE_COOKIE, unlocked, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

/** Tells search engines to keep the dev site out of their index. */
export function noindex<T extends Response>(response: T): T {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/** The password the gate's form sent, or `null` for any other POST (or a body that can't be read). */
async function submittedPassword(request: NextRequest): Promise<string | null> {
  try {
    const entered = (await request.formData()).get(PASSWORD_FIELD);
    return typeof entered === "string" ? entered : null;
  } catch {
    return null;
  }
}

// Every request hashes the configured password, so its token is kept; guesses
// are hashed fresh, so they don't pile up here.
const tokens = new Map<string, Promise<string>>();

function unlockToken(password: string): Promise<string> {
  let token = tokens.get(password);
  if (!token) {
    token = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(`${DEV_GATE_COOKIE}:${password}`))
      .then((digest) => Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""));
    if (password === process.env.DEV_SITE_PASSWORD) tokens.set(password, token);
  }
  return token;
}

// A bare page served from the proxy, not an app route, so production has no
// such page at all. It can't load globals.css, so the theme tokens it uses
// (--color-brand-blue, --color-border-card, …) are copied in by value.
function passwordPage(wrongPassword: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${copy.title}</title>
<style>
  :root { --brand-blue: #2f5be4; --border: #e4e7ec; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; font-family: system-ui, sans-serif; background: #f7f9fc; color: #183153; }
  form { width: 100%; max-width: 360px; display: grid; gap: 12px; background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-sizing: border-box; }
  h1 { margin: 0; font-size: 20px; }
  p { margin: 0; font-size: 14px; color: #667085; }
  input { font: inherit; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }
  button { font: inherit; font-weight: 600; padding: 10px 12px; border: 0; border-radius: 10px; background: var(--brand-blue); color: #fff; cursor: pointer; }
  input:focus-visible, button:focus-visible { outline: 2px solid var(--brand-blue); outline-offset: 2px; }
  [role="alert"] { color: #d92d20; }
</style>
</head>
<body>
<form method="post">
  <h1>${copy.title}</h1>
  <p>${copy.intro}</p>
  <label for="${PASSWORD_FIELD}">${copy.passwordLabel}</label>
  <input id="${PASSWORD_FIELD}" name="${PASSWORD_FIELD}" type="password" autocomplete="current-password" required autofocus>
  ${wrongPassword ? `<p role="alert">${copy.wrongPassword}</p>` : ""}
  <button type="submit">${copy.submitLabel}</button>
</form>
</body>
</html>`;
  return new NextResponse(html, { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
}
