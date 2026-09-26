import { resetPasswordWithBackend } from "@/lib/api/server/resetPassword";
import { parseResetPasswordInput } from "@/lib/auth/resetPasswordRules";
import { clientIpFrom } from "@/lib/auth/clientIp";
import { setSessionCookie } from "@/lib/auth/sessionCookie";

const STATUS_BY_CODE = {
  INVALID_RESET_TOKEN: 400,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Password reset: sends the emailed link's token and the new password to the
 * backend, then keeps the returned token in an httpOnly cookie on this origin
 * exactly as Sign in does — the parent is signed in. Responds `{ redirectTo }`
 * or `{ error: <backend code> }`. The password confirmation never gets here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseResetPasswordInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const result = await resetPasswordWithBackend(input, clientIpFrom(request));
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  await setSessionCookie(result.token);
  return Response.json({ redirectTo: "/" });
}
