import { createHash, randomBytes } from "node:crypto";
import { publicOrigin } from "@/lib/auth/publicOrigin";

/**
 * Google sign-in on web (docs/adr/0006-parent-session-on-web-origin.md). Web
 * holds only the public client ID; the backend holds the secret and finishes
 * the code exchange. Server-only.
 */

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** Carries the PKCE verifier, `state`, and where to go afterwards between start and callback. */
export const GOOGLE_FLOW_COOKIE = "orto_google_flow";
export const GOOGLE_FLOW_PATH = "/api/auth/google";
export const GOOGLE_FLOW_MAX_AGE_SECONDS = 10 * 60;

/** Query flag the auth pages read to show the Google failure message. */
export const GOOGLE_ERROR_PARAM = "google_error";

/** The public client ID, or null when Google sign-in isn't configured (the button is then hidden). */
export function googleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID || null;
}

/** The pages a Google flow can start from, and return to on failure. */
const AUTH_PAGES = ["/signin", "/signup"] as const;
export type AuthPage = (typeof AUTH_PAGES)[number];

export function authPageFrom(value: unknown): AuthPage {
  return AUTH_PAGES.find((page) => page === value) ?? "/signin";
}

/**
 * The Google button's link to the start route, or null when Google sign-in
 * isn't configured — the auth pages then render no button and no divider.
 * `next` rides along; the callback decides whether it is safe to follow.
 */
export function googleStartHref(from: AuthPage, next: string | undefined): string | null {
  if (!googleClientId()) return null;
  const params = new URLSearchParams({ from, ...(next ? { next } : {}) });
  return `${GOOGLE_FLOW_PATH}/start?${params}`;
}

export interface GoogleFlow {
  state: string;
  verifier: string;
  from: AuthPage;
  next?: string;
}

const randomToken = () => randomBytes(32).toString("base64url");

/** A fresh flow: 43-character PKCE verifier and an unguessable `state`. */
export function newGoogleFlow(from: AuthPage, next: string | undefined): GoogleFlow {
  return { state: randomToken(), verifier: randomToken(), from, ...(next ? { next } : {}) };
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function parseGoogleFlow(raw: string | undefined): GoogleFlow | null {
  if (!raw) return null;
  try {
    const flow = JSON.parse(raw) as Partial<GoogleFlow>;
    if (typeof flow.state !== "string" || typeof flow.verifier !== "string") return null;
    return {
      state: flow.state,
      verifier: flow.verifier,
      from: authPageFrom(flow.from),
      ...(typeof flow.next === "string" ? { next: flow.next } : {}),
    };
  } catch {
    return null;
  }
}

/** The redirect_uri registered with Google: this site's callback route, on the public origin (an internal host is a redirect_uri Google wouldn't recognise). */
export function googleCallbackUrl(request: Request): string {
  return new URL(`${GOOGLE_FLOW_PATH}/callback`, publicOrigin(request)).toString();
}

/** Back to the page the flow started from, with the failure flag and any `next` kept for a retry. */
export function googleFailureUrl(request: Request, from: AuthPage, next: string | undefined): URL {
  const url = new URL(from, publicOrigin(request));
  if (next) url.searchParams.set("next", next);
  url.searchParams.set(GOOGLE_ERROR_PARAM, "1");
  return url;
}
