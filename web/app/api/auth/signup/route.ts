import { registerWithBackend } from "@/lib/api/server/register";
import { parseRegisterInput } from "@/lib/auth/registerRules";
import { clientIpFrom } from "@/lib/auth/clientIp";
import { setSessionCookie } from "@/lib/auth/sessionCookie";

const STATUS_BY_CODE = {
  DUPLICATE_EMAIL: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Sign up: calls the backend register, keeps the token in an httpOnly cookie
 * on this origin exactly as Sign in does, and hands the page back only where
 * to go next. The parent is signed in straight away. Responds `{ redirectTo }`
 * or `{ error: <backend code> }`. The password confirmation never gets here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseRegisterInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const clientIp = clientIpFrom(request);
  const result = await registerWithBackend(input, clientIp);
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  await setSessionCookie(result.token);
  return Response.json({ redirectTo: "/" });
}
