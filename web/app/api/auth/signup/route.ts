import { registerWithBackend } from "@/lib/api/server/register";
import { parseRegisterInput } from "@/lib/auth/registerRules";
import { clientIpFrom } from "@/lib/auth/clientIp";

const STATUS_BY_CODE = {
  DUPLICATE_EMAIL: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  UPSTREAM_ERROR: 502,
} as const;

// The backend's cap on `next`; a longer one is dropped rather than refused.
const NEXT_MAX_LENGTH = 2048;

/**
 * Sign up: calls the backend register, which signs no one in — it emails an
 * Email confirmation link, and the parent is signed in only once they open it
 * (app/api/auth/confirm-email). `next` rides along into that link; the
 * confirmation decides whether it is safe to follow. Responds `{ email }`
 * (where the link went) or `{ error: <backend code> }`. The password
 * confirmation never gets here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseRegisterInput(body);
  if (!input) return Response.json({ error: "VALIDATION_ERROR" }, { status: STATUS_BY_CODE.VALIDATION_ERROR });

  const { next } = body as { next?: unknown };
  const withNext = typeof next === "string" && next.length <= NEXT_MAX_LENGTH ? { ...input, next } : input;
  const result = await registerWithBackend(withNext, clientIpFrom(request));
  if (!result.ok) return Response.json({ error: result.code }, { status: STATUS_BY_CODE[result.code] });

  return Response.json({ email: result.email });
}
