import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  JWT_SECRET: z.string().min(64, "JWT_SECRET must be at least 64 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  CORS_ORIGIN: z.string(),

  OPENROUTER_API_KEY: z.string().startsWith("sk-or-"),
  GEMINI_API_KEY: z.string().startsWith("AIza"),
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),

  ALLOW_PROD_SEED: z.string().optional(),
  ADMIN_SECRET: z.string().min(32).optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
