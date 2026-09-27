import type { APIRequestContext } from "@playwright/test";

/** The bodies the fixture backend's resend-confirmation stub accepted for one
 *  email. Specs run in parallel, so each looks up only its own. */
export async function resendRequestsFor(request: APIRequestContext, email: string): Promise<{ email: string; next?: string }[]> {
  const all: { email: string; next?: string }[] = await (await request.get("http://localhost:3211/__resend-confirmation-requests")).json();
  return all.filter((body) => body.email === email);
}
