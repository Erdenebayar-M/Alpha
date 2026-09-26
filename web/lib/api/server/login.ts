import { authWithBackend, type AuthResult } from "@/lib/api/server/authRequest";
import type { LoginInput } from "@/lib/auth/loginRules";

const KNOWN_CODES = ["INVALID_CREDENTIALS", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type LoginResult = AuthResult<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/login`. See authWithBackend. */
export function loginWithBackend(input: LoginInput, clientIp: string | null): Promise<LoginResult> {
  return authWithBackend("/api/auth/login", input, clientIp, KNOWN_CODES);
}
