import { z } from 'zod';

// A Parent's email is the same whatever its capitals or surrounding spaces, so
// it is normalised here, once, for backend, web and mobile alike.
const emailSchema = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(2),
  surname: z.string().optional(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

// Password reset request: only the email. The response never says whether a
// Parent account exists for it.
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Password reset: the raw token from the emailed link and the new password,
// under the same rule as registerSchema. The confirmation is client-only.
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// Google sign-in: the authorization code from Google's redirect, the PKCE
// verifier its challenge was made from, and the redirect_uri the code was
// issued for. The backend holds the client secret and finishes the exchange.
export const googleAuthSchema = z.object({
  code: z.string().min(1),
  code_verifier: z.string().min(43).max(128),
  redirect_uri: z.string().url(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
