import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/auth/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/sessionCookie";

/**
 * Sign out: clears the session cookie and redirects to `/`. The backend token
 * is a stateless JWT with nothing to revoke server-side (ADR 0006), so
 * dropping the cookie is the whole of it. POST only, and refused when the
 * browser says it came from another origin, so another site's link, image or
 * self-submitting form can't sign a parent out.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== publicOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
}
