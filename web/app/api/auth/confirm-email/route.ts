import { confirmEmailWithBackend } from "@/lib/api/server/confirmEmail";
import { clientIpFrom } from "@/lib/auth/clientIp";
import { safeNextPath } from "@/lib/auth/safeNext";
import { setSessionCookie } from "@/lib/auth/sessionCookie";
import { siteConfig } from "@/lib/site-config";

const STATUS_BY_CODE = {
  INVALID_CONFIRMATION_TOKEN: 400,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Email confirmation: sends the emailed link's token to the backend, then
 * keeps the returned token in an httpOnly cookie on this origin exactly as
 * Sign in does — the parent is signed in. Sign up leads into the Diagnostic,
 * so the parent goes on to `next` when it is safe, else to /register-child.
 * Responds `{ redirectTo }` or `{ error: <backend code> }`.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { token, next } = (body ?? {}) as { token?: unknown; next?: unknown };
  if (typeof token !== "string" || !token) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const result = await confirmEmailWithBackend(token, clientIpFrom(request));
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  await setSessionCookie(result.token);
  return Response.json({ redirectTo: safeNextPath(next, siteConfig.assessmentUrl) });
}
