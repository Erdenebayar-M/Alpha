import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleSignInWithBackend } from "@/lib/api/server/googleSignIn";
import { clientIpFrom } from "@/lib/auth/clientIp";
import { GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_PATH, googleCallbackUrl, googleFailureUrl, parseGoogleFlow, publicOrigin } from "@/lib/auth/googleOAuth";
import { safeNextPath } from "@/lib/auth/safeNext";
import { setSessionCookie } from "@/lib/auth/setSessionCookie";

/**
 * Google redirects here after consent. Checks `state` against the flow
 * cookie, hands the code and PKCE verifier to the backend (which holds the
 * client secret), sets the session like Sign in, and redirects to `next` or
 * `/`. A cancel, a state mismatch or a backend failure goes back to the page
 * the flow started from, which then shows the Google failure message.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const flow = parseGoogleFlow(jar.get(GOOGLE_FLOW_COOKIE)?.value);
  // One use per flow, whatever the outcome.
  jar.delete({ name: GOOGLE_FLOW_COOKIE, path: GOOGLE_FLOW_PATH });

  const code = params.get("code");
  if (!flow || !code || params.get("error") || params.get("state") !== flow.state) {
    return NextResponse.redirect(googleFailureUrl(request, flow?.from ?? "/signin", flow?.next), 303);
  }

  const result = await googleSignInWithBackend(
    { code, code_verifier: flow.verifier, redirect_uri: googleCallbackUrl(request) },
    clientIpFrom(request),
  );
  if (!result.ok) return NextResponse.redirect(googleFailureUrl(request, flow.from, flow.next), 303);

  await setSessionCookie(result.token);
  return NextResponse.redirect(new URL(safeNextPath(flow.next), publicOrigin(request)), 303);
}
