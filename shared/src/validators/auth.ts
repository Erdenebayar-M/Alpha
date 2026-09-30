import { z } from 'zod';
import { newPasswordSchema, resemblesParent, type PasswordWeakness } from './password';

// A Parent's email is the same whatever its capitals or surrounding spaces, so
// it is normalised here, once, for backend, web and mobile alike.
const emailSchema = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(2),
  surname: z.string().optional(),
  password: newPasswordSchema,
  // Where web sends the parent once they open the emailed link. It is only
  // carried into the link; web decides whether it is safe to follow.
  next: z.string().max(2048).optional(),
}).superRefine(({ email, name, surname, password }, ctx) => {
  // Runs only once every field is otherwise valid.
  if (resemblesParent(password, { email, name, surname })) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: 'PASSWORD_SIMILAR' satisfies PasswordWeakness });
  }
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
// under registerSchema's rule less the resemblance check — there is no
// account to hand until the token is spent. The confirmation is client-only.
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: newPasswordSchema,
});

// Email confirmation: the raw token from the emailed link.
export const confirmEmailSchema = z.object({
  token: z.string().min(1),
});

// Resend of the Email confirmation link: only the email, and the `next` that
// registerSchema carries. The response never says whether an unconfirmed
// Parent account exists for it.
export const resendConfirmationSchema = z.object({
  email: emailSchema,
  next: z.string().max(2048).optional(),
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
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
