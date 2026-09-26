import { authWithBackend, type AuthResult } from "@/lib/api/server/authRequest";
import type { RegisterInput } from "@/lib/auth/registerRules";

const KNOWN_CODES = ["DUPLICATE_EMAIL", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type RegisterResult = AuthResult<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/register`. See authWithBackend. */
export function registerWithBackend(input: RegisterInput, clientIp: string | null): Promise<RegisterResult> {
  return authWithBackend("/api/auth/register", input, clientIp, KNOWN_CODES);
}
