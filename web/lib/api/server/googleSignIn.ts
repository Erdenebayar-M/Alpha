import { authWithBackend, type AuthResult } from "@/lib/api/server/authRequest";

const KNOWN_CODES = ["GOOGLE_AUTH_FAILED", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type GoogleSignInResult = AuthResult<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/google`, which holds the client secret and finishes the exchange. See authWithBackend. */
export function googleSignInWithBackend(
  input: { code: string; code_verifier: string; redirect_uri: string },
  clientIp: string | null,
): Promise<GoogleSignInResult> {
  return authWithBackend("/api/auth/google", input, clientIp, KNOWN_CODES);
}
