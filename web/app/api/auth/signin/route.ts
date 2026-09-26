import { cookies } from "next/headers";
import { loginWithBackend } from "@/lib/api/server/login";
import { parseLoginInput } from "@/lib/auth/loginRules";
import { safeNextPath } from "@/lib/auth/safeNext";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const STATUS_BY_CODE = {
  INVALID_CREDENTIALS: 401,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Sign in: calls the backend login, keeps the token in an httpOnly cookie on
 * this origin and hands the page back only where to go next — the token never
 * reaches page scripts (docs/adr/0006-parent-session-on-web-origin.md).
 * Responds `{ redirectTo }` or `{ error: <backend code> }`.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseLoginInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await loginWithBackend(input, clientIp);
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  (await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return Response.json({ redirectTo: safeNextPath((body as { next?: unknown }).next) });
}
