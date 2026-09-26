import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_FLOW_COOKIE,
  GOOGLE_FLOW_MAX_AGE_SECONDS,
  GOOGLE_FLOW_PATH,
  authPageFrom,
  googleCallbackUrl,
  googleClientId,
  googleFailureUrl,
  newGoogleFlow,
  pkceChallenge,
} from "@/lib/auth/googleOAuth";

/**
 * Starts Google sign-in (the auth pages' Google button links here with
 * `from` and optionally `next`). Makes the PKCE verifier and `state`, keeps
 * them in a short-lived httpOnly cookie that only the callback sees, and
 * redirects to Google's consent screen.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = authPageFrom(params.get("from"));
  const next = params.get("next") ?? undefined;

  const clientId = googleClientId();
  if (!clientId) return NextResponse.redirect(googleFailureUrl(request, from, next), 303);

  const flow = newGoogleFlow(from, next);
  (await cookies()).set(GOOGLE_FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: the callback arrives as a top-level redirect from Google.
    sameSite: "lax",
    maxAge: GOOGLE_FLOW_MAX_AGE_SECONDS,
    path: GOOGLE_FLOW_PATH,
  });

  const google = new URL(GOOGLE_AUTHORIZE_URL);
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCallbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    code_challenge: pkceChallenge(flow.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(google, 303);
}
