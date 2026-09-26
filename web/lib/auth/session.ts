/** The parent session cookie on the web origin (docs/adr/0006-parent-session-on-web-origin.md). */
export const SESSION_COOKIE = "orto_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Where the cookie is set, and so what deleting it has to match (lib/auth/sessionCookie.ts, proxy.ts). */
export const SESSION_COOKIE_SCOPE = { name: SESSION_COOKIE, path: "/" } as const;
