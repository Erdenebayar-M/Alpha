import type { NextRequest } from "next/server";
import { sessionRedirect } from "@/lib/auth/sessionRedirect";

export async function proxy(request: NextRequest) {
  return sessionRedirect(request);
}

// Literal paths: the matcher must be statically analysable, so it can't read
// siteConfig. Keep in step with assessmentUrl, accountUrl, loginUrl and registerUrl.
export const config = {
  matcher: ["/register-child", "/account/:path*", "/signin", "/signup"],
};
