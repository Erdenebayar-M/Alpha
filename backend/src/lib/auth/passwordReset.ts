import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db/client';
import { env } from '../../config/env';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Only this digest is stored; the raw token lives in the emailed link alone. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function passwordResetLink(token: string): string {
  return `${env.WEB_URL}/reset-password?token=${token}`;
}

/**
 * Issues a Password reset token for the parent and returns the raw token.
 * Their older unused tokens are marked used in the same transaction, so only
 * the newest link works.
 */
export async function issuePasswordResetToken(parent_id: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { parent_id, used_at: null }, data: { used_at: now } }),
    prisma.passwordResetToken.create({
      data: { parent_id, token_hash: hashResetToken(token), expires_at: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return token;
}
