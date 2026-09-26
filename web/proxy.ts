import { NextResponse, type NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/api/server/backendUrl";
import { publicOrigin } from "@/lib/auth/publicOrigin";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";

/**
 * Session redirects (docs/adr/0006-parent-session-on-web-origin.md):
 *
 * - `/register-child` without a session goes to sign in, which brings the
 *   parent back through `next`. Optimistic: it reads only whether the cookie
 *   is there; the Diagnostic proxy rejects and clears a token the backend no
 *   longer accepts (lib/api/server/parentSession.ts), and the flow then sends
 *   the parent to sign in.
 * - `/signin` and `/signup` with a session go to `/` — but only once the
 *   backend confirms the token. A revoked one (a Password reset elsewhere)
 *   would otherwise lock the parent out of signing in again, so it is cleared
 *   and the page shown. If the backend can't be reached, the page is shown too.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname, search } = request.nextUrl;

  if (pathname === siteConfig.assessmentUrl) {
    if (token) return NextResponse.next();
    const signIn = new URL(siteConfig.loginUrl, publicOrigin(request));
    signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }

  if (!token) return NextResponse.next();
  const session = await checkSession(token);
  if (session === "valid") return NextResponse.redirect(new URL("/", publicOrigin(request)));

  const response = NextResponse.next();
  if (session === "rejected") response.cookies.delete({ name: SESSION_COOKIE, path: "/" });
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
