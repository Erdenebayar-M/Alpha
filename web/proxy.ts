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
 * - `/register-child` without a session goes to sign in, which brings the
 *   parent back through `next`.
 * - `/signin` and `/signup` with a session go to `/`.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await checkSession(token) : "none";
  const signedIn = session === "valid" || session === "unknown";
  const { pathname, search } = request.nextUrl;

  let response: NextResponse;
  if (pathname === siteConfig.assessmentUrl) {
    response = signedIn
      ? NextResponse.next()
      : NextResponse.redirect(new URL(withNext(siteConfig.loginUrl, pathname + search), publicOrigin(request)));
  } else {
    response = signedIn ? NextResponse.redirect(new URL("/", publicOrigin(request))) : NextResponse.next();
  }

  if (session === "rejected") response.cookies.delete(SESSION_COOKIE_SCOPE);
  return response;
}

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

// Literal paths: the matcher must be statically analysable, so it can't read
// siteConfig. Keep in step with assessmentUrl, loginUrl and registerUrl.
export const config = {
  matcher: ["/register-child", "/signin", "/signup"],
};
