import { authWithBackend, type AuthResult } from "@/lib/api/server/authRequest";

const KNOWN_CODES = ["INVALID_CONFIRMATION_TOKEN", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type ConfirmEmailResult = AuthResult<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/confirm-email`, which confirms the
 *  email and signs the parent in as login does. See authWithBackend. */
export function confirmEmailWithBackend(token: string, clientIp: string | null): Promise<ConfirmEmailResult> {
  return authWithBackend("/api/auth/confirm-email", { token }, clientIp, KNOWN_CODES);
}
