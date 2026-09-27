import { prisma } from '../db/client';
import { hashEmailedToken, newEmailedToken, webLink } from './emailedToken';

export const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** The emailed link: web's confirmation page, carrying `next` when given. */
export function emailConfirmationLink(token: string, next?: string): string {
  return webLink('/confirm-email', { token, next });
}

/**
 * Creates an unconfirmed Parent account and its first Email confirmation
 * token in one transaction, so no account exists without a link to confirm
 * it. Returns the parent and the raw token.
 */
export async function createUnconfirmedParent(data: {
  email: string;
  name: string;
  surname?: string;
  password_hash: string;
}): Promise<{ parent: { id: string; email: string; name: string }; token: string }> {
  const token = newEmailedToken();
  const parent = await prisma.$transaction(async (tx) => {
    const { id, email, name } = await tx.parent.create({ data });
    await tx.emailConfirmationToken.create({
      data: { parent_id: id, token_hash: hashEmailedToken(token), expires_at: new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS) },
    });
    return { id, email, name };
  });
  return { parent, token };
}

/**
 * Confirms the email of the token's Parent account. Returns the parent, or
 * null — changing nothing — when the token is unknown, used or expired. The
 * token is claimed and the email confirmed in one transaction, and the claim
 * only succeeds while the token is still unused and unexpired, so two
 * requests racing on the same link can't both win.
 */
export async function confirmEmailWithToken(
  token: string,
): Promise<{ id: string; email: string; name: string; token_version: number } | null> {
  const row = await prisma.emailConfirmationToken.findUnique({ where: { token_hash: hashEmailedToken(token) } });
  if (!row || row.used_at || row.expires_at.getTime() <= Date.now()) return null;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.emailConfirmationToken.updateMany({
      where: { id: row.id, used_at: null, expires_at: { gt: now } },
      data: { used_at: now },
    });
    if (claimed.count !== 1) return null;
    const { id, email, name, token_version } = await tx.parent.update({
      where: { id: row.parent_id },
      data: { email_confirmed_at: now },
    });
    return { id, email, name, token_version };
  });
}
