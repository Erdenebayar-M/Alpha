import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  surname: z.string().optional(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Password reset request: only the email. The response never says whether a
// Parent account exists for it.
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Password reset: the raw token from the emailed link and the new password,
// under the same rule as registerSchema. The confirmation is client-only.
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
