import { requestPasswordReset } from "@/lib/api/server/forgotPassword";
import { parseForgotPasswordInput } from "@/lib/auth/forgotPasswordRules";
import { clientIpFrom } from "@/lib/auth/clientIp";

const STATUS_BY_CODE = {
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

/**
 * Password reset request: asks the backend to email a reset link. No session
 * is involved. Responds `{ ok: true }` — the same for any email, as the
 * backend does — or `{ error: <backend code> }`.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseForgotPasswordInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const result = await requestPasswordReset(input, clientIpFrom(request));
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  return Response.json({ ok: true });
}
