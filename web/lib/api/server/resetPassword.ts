import { authWithBackend, type AuthResult } from "@/lib/api/server/authRequest";
import type { ResetPasswordInput } from "@/lib/auth/resetPasswordRules";

const KNOWN_CODES = ["INVALID_RESET_TOKEN", "RATE_LIMITED", "VALIDATION_ERROR"] as const;

export type ResetPasswordResult = AuthResult<(typeof KNOWN_CODES)[number]>;

/** Calls the backend's `POST /api/auth/reset-password`, which signs the parent
 *  in as login does. See authWithBackend. */
export function resetPasswordWithBackend(input: ResetPasswordInput, clientIp: string | null): Promise<ResetPasswordResult> {
  return authWithBackend("/api/auth/reset-password", input, clientIp, KNOWN_CODES);
}
