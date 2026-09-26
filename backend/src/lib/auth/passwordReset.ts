import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db/client';
import { env } from '../../config/env';
import { hashPassword } from './password';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// Per parent, whatever the IP: each new token kills the previous one, so
// without this anyone could keep a parent's emailed link from ever working.
const MAX_TOKENS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/** Only this digest is stored; the raw token lives in the emailed link alone. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function passwordResetLink(token: string): string {
  const url = new URL('/reset-password', env.WEB_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * Issues a Password reset token for the parent and returns the raw token.
 * Their older unused tokens are marked used in the same transaction, so only
 * the newest link works. Returns null, issuing nothing, once the parent has
 * had MAX_TOKENS_PER_HOUR tokens in the last hour.
 */
export async function issuePasswordResetToken(parent_id: string): Promise<string | null> {
  const now = new Date();
  const recent = await prisma.passwordResetToken.count({
    where: { parent_id, created_at: { gte: new Date(now.getTime() - HOUR_MS) } },
  });
  if (recent >= MAX_TOKENS_PER_HOUR) return null;

  const token = randomBytes(32).toString('base64url');

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { parent_id, used_at: null }, data: { used_at: now } }),
    prisma.passwordResetToken.create({
      data: { parent_id, token_hash: hashResetToken(token), expires_at: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return token;
}

/**
 * Sets a new password from a Password reset token. Returns the parent, or null
 * — changing nothing — when the token is unknown, used or expired. The token
 * is claimed and the password set in one transaction, and the claim only
 * succeeds while the token is still unused and unexpired, so two requests
 * racing on the same link can't both win.
 */
export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const row = await prisma.passwordResetToken.findUnique({ where: { token_hash: hashResetToken(token) } });
  if (!row || row.used_at || row.expires_at.getTime() <= Date.now()) return null;

  const password_hash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    // Re-checks expiry too: hashing is slow, and the link may run out meanwhile.
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, used_at: null, expires_at: { gt: now } },
      data: { used_at: now },
    });
    if (claimed.count !== 1) return null;
    const { id, email, name } = await tx.parent.update({ where: { id: row.parent_id }, data: { password_hash } });
    return { id, email, name };
  });
}
