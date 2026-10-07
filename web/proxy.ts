import { NextResponse, type NextRequest } from "next/server";
import { isSessionRedirectPath, sessionRedirect } from "@/lib/auth/sessionRedirect";
import { devGate, noindex } from "@/lib/devGate";

/**
 * On a dev deploy (DEV_SITE_PASSWORD set) every route sits behind the password
 * gate and is marked noindex. Then, on any deploy, the session redirects run
 * on their own pages (lib/auth/sessionRedirect.ts); every other route passes.
 */
export async function proxy(request: NextRequest) {
  const password = process.env.DEV_SITE_PASSWORD;
  if (password) {
    const locked = await devGate(request, password);
    if (locked) return noindex(locked);
  }

  const response = isSessionRedirectPath(request.nextUrl.pathname) ? await sessionRedirect(request) : NextResponse.next();
  return password ? noindex(response) : response;
}

// Every route the gate has to cover, so it can't list the session pages; those
// are picked out by isSessionRedirectPath instead. Framework files under
// /_next/ and static assets (public/, icon.svg) skip the proxy: they are the
// same as production's. Only asset extensions are skipped, not any dot, so a
// page or API path like /articles/v1.2 is still gated.
export const config = {
  matcher: ["/((?!_next/|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|wav|mp3|woff2?)$).*)"],
};
