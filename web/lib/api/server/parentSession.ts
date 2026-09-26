import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BackendRequestError } from "@/lib/api/server/backendClient";
import { SIGNED_OUT_CODE } from "@/lib/api/types";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { clearSessionCookie } from "@/lib/auth/sessionCookie";

const signedOut = () => NextResponse.json({ error: "Sign in to continue", code: SIGNED_OUT_CODE }, { status: 401 });

/**
 * Runs a proxy route handler as the signed-in parent: `run` gets their session
 * token (docs/adr/0006-parent-session-on-web-origin.md), so everything it
 * creates on the backend belongs to their Parent account. With no session the
 * request is rejected before reaching the backend. A token the backend rejects
 * (expired, or revoked by a Password reset) clears the cookie, so the parent
 * is sent to sign in. Other backend errors pass through; anything else is
 * logged and answered with a 502 and `failureMessage`.
 */
export async function asSignedInParent(failureMessage: string, run: (token: string) => Promise<Response>): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return signedOut();

  try {
    return await run(token);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      if (err.status === 401) {
        await clearSessionCookie();
        return signedOut();
      }
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error(failureMessage, err);
    return NextResponse.json({ error: failureMessage }, { status: 502 });
  }
}
