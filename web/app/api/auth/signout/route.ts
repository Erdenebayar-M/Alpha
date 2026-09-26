import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/auth/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/sessionCookie";

/**
 * Sign out: clears the session cookie and redirects to `/`. The backend token
 * is a stateless JWT with nothing to revoke server-side (ADR 0006), so
 * dropping the cookie is the whole of it. POST only, so a link or an image on
 * another site can't sign a parent out.
 */
export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
}
