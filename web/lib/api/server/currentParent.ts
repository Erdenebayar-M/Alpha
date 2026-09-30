import { cookies } from "next/headers";
import { backendFetch, BackendRequestError } from "@/lib/api/server/backendClient";
import type { CurrentParent } from "@/lib/account/identity";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * The signed-in parent for a server component, or `null` with no session or
 * when the backend rejects the token (expired, or revoked by a Password
 * reset). A rejected cookie is cleared by proxy.ts, not here — server
 * components can't set cookies. Other backend failures throw.
 */
export async function currentParent(): Promise<CurrentParent | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await backendFetch<CurrentParent>(token, "/auth/me");
  } catch (err) {
    if (err instanceof BackendRequestError && err.status === 401) return null;
    throw err;
  }
}
