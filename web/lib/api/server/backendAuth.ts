/**
 * Only ever imported from route handlers under web/app/api/*, which the
 * Next.js App Router always runs server-side — so this file's env vars and
 * token never reach a client bundle without a `server-only` dependency
 * (AGENTS.md: don't add one unless native APIs can't do the job).
 *
 * Dev-only auth for the diagnostic proxy (web/app/api/diagnostic/*). Every
 * backend diagnostic/learner route requires a parent JWT — there is no
 * unauthenticated path — so the proxy logs in once with credentials from
 * server-only env vars and reuses the token for every request until it's
 * rejected. This is a placeholder for real parent auth on web (tracked as an
 * open item in the plan); nothing here is exposed to the browser.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const DEV_EMAIL = process.env.DEV_PARENT_EMAIL;
const DEV_PASSWORD = process.env.DEV_PARENT_PASSWORD;

let cachedToken: string | null = null;

async function login(): Promise<string> {
  if (!DEV_EMAIL || !DEV_PASSWORD) {
    throw new Error(
      "DEV_PARENT_EMAIL / DEV_PARENT_PASSWORD are not set. Copy web/.env.example to web/.env.local " +
        "and point them at a seeded backend account (the seed script creates test@local.dev / password123).",
    );
  }

  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`Backend login failed: ${body?.error?.message ?? res.statusText}`);
  }
  return body.data.token as string;
}

/** Returns a cached token, logging in on first use or after a 401. */
export async function getBackendToken(forceRefresh = false): Promise<string> {
  if (cachedToken && !forceRefresh) return cachedToken;
  cachedToken = await login();
  return cachedToken;
}

export function invalidateBackendToken(): void {
  cachedToken = null;
}

export { BACKEND_URL };
