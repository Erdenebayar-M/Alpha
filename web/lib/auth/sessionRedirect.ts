import { NextResponse, type NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/api/server/backendUrl";
import { publicOrigin } from "@/lib/auth/publicOrigin";
import { withNext } from "@/lib/auth/safeNext";
import { SESSION_COOKIE, SESSION_COOKIE_SCOPE } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

/**
 * Session redirects (docs/adr/0006-parent-session-on-web-origin.md). A session
 * cookie counts only once the backend confirms its token: a revoked one (a
 * Password reset elsewhere) is cleared here, so it neither locks the parent
 * out of signing in again nor lets them fill in /register-child only to be
 * sent to sign in at the end. If the backend can't be reached, the cookie is
 * left alone and taken at its word.
 *
 * - `/register-child` and `/account` (and its tabs) without a session go to sign in, which
 *   brings the parent back through `next`.
 * - `/signin` and `/signup` with a session go to the Account page.
 *
 * Only call it for a path where `isSessionRedirectPath` holds.
 */
export async function sessionRedirect(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await checkSession(token) : "none";
  const signedIn = session === "valid" || session === "unknown";
  const { pathname, search } = request.nextUrl;

  let response: NextResponse;
  if (needsSession(pathname)) {
    response = signedIn
      ? NextResponse.next()
      : NextResponse.redirect(new URL(withNext(siteConfig.loginUrl, pathname + search), publicOrigin(request)));
  } else {
    response = signedIn ? NextResponse.redirect(new URL(siteConfig.accountUrl, publicOrigin(request))) : NextResponse.next();
  }

  if (session === "rejected") response.cookies.delete(SESSION_COOKIE_SCOPE);
  return response;
}

/** The pages `sessionRedirect` decides on; every other path passes untouched. */
export const isSessionRedirectPath = (pathname: string) => needsSession(pathname) || isSignedOutOnly(pathname);

const needsSession = (pathname: string) =>
  pathname === siteConfig.assessmentUrl || pathname === siteConfig.accountUrl || pathname.startsWith(`${siteConfig.accountUrl}/`);

const isSignedOutOnly = (pathname: string) => pathname === siteConfig.loginUrl || pathname === siteConfig.registerUrl;

async function checkSession(token: string): Promise<"valid" | "rejected" | "unknown"> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3_000),
    });
    if (res.ok) return "valid";
    return res.status === 401 ? "rejected" : "unknown";
  } catch {
    return "unknown";
  }
}
