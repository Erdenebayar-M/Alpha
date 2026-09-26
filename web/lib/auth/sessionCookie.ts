import { cookies } from "next/headers";
import { SESSION_COOKIE_SCOPE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

/** Keeps the backend's token in an httpOnly cookie on this origin (ADR 0006). Route handlers only. */
export async function setSessionCookie(token: string) {
  (await cookies()).set({
    ...SESSION_COOKIE_SCOPE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Ends the parent session on this origin: on Sign out, and when the backend rejects the token. Route handlers only. */
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_SCOPE);
}
