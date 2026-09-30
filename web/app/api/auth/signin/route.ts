import { loginWithBackend } from "@/lib/api/server/login";
import { parseLoginInput } from "@/lib/auth/loginRules";
import { welcomeUrl } from "@/lib/auth/flash";
import { safeNextPath } from "@/lib/auth/safeNext";
import { clientIpFrom } from "@/lib/auth/clientIp";
import { setSessionCookie } from "@/lib/auth/sessionCookie";

const STATUS_BY_CODE = {
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_CONFIRMED: 403,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Sign in: calls the backend login, keeps the token in an httpOnly cookie on
 * this origin and hands the page back only where to go next — the token never
 * reaches page scripts (docs/adr/0006-parent-session-on-web-origin.md).
 * Responds `{ redirectTo }` or `{ error: <backend code> }` — with `maskedEmail` for EMAIL_NOT_CONFIRMED.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseLoginInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const clientIp = clientIpFrom(request);
  const result = await loginWithBackend(input, clientIp);
  if (!result.ok) {
    return Response.json({ error: result.code, maskedEmail: result.maskedEmail }, { status: STATUS_BY_CODE[result.code] });
  }

  await setSessionCookie(result.token);
  return Response.json({ redirectTo: safeNextPath((body as { next?: unknown }).next, welcomeUrl) });
}
