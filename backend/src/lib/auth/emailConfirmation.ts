import { prisma } from '../db/client';
import { hashEmailedToken, newEmailedToken, webLink } from './emailedToken';

export const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Per parent, whatever the IP: each new token kills the previous one, so
// without this anyone could keep a parent's emailed link from ever working.
const MAX_TOKENS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

// An unconfirmed Parent account this old is dead weight: nothing has proven
// the email is the parent's, and no job scheduler sweeps these away, so
// Sign in, Resend and Forgot-password all treat it as if it never existed —
// freeing its email for the next Sign up to take over.
export const UNCONFIRMED_LAPSE_MS = 7 * 24 * 60 * 60 * 1000;

export function isLapsedUnconfirmedParent(parent: { email_confirmed_at: Date | null; created_at: Date }): boolean {
  return !parent.email_confirmed_at && parent.created_at.getTime() <= Date.now() - UNCONFIRMED_LAPSE_MS;
}

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
 * Issues a fresh Email confirmation token for the parent and returns the raw
 * token. Their older unused tokens are marked used in the same transaction, so
 * only the newest link works. Returns null, issuing nothing, once the parent
 * has had MAX_TOKENS_PER_HOUR tokens in the last hour.
 */
export async function issueEmailConfirmationToken(parent_id: string): Promise<string | null> {
  const now = new Date();
  const recent = await prisma.emailConfirmationToken.count({
    where: { parent_id, created_at: { gte: new Date(now.getTime() - HOUR_MS) } },
  });
  if (recent >= MAX_TOKENS_PER_HOUR) return null;

  const token = newEmailedToken();

  await prisma.$transaction([
    prisma.emailConfirmationToken.updateMany({ where: { parent_id, used_at: null }, data: { used_at: now } }),
    prisma.emailConfirmationToken.create({
      data: { parent_id, token_hash: hashEmailedToken(token), expires_at: new Date(now.getTime() + CONFIRMATION_TOKEN_TTL_MS) },
    }),
  ]);
  return token;
}

/**
 * Replaces an unconfirmed Parent account with a Sign up's new details — name,
 * surname and password — as though it never existed, in one transaction:
 * `token_version` bumped and its older confirmation tokens invalidated so a
 * link or session from the account it replaces can't outlive it.
 *
 * The claim only succeeds while the account is still unconfirmed: a confirm
 * racing this replace may win first, and a confirmed account is never
 * replaced. Returns null in that case.
 *
 * A fresh confirmation token is issued subject to the same per-parent cap as
 * `issueEmailConfirmationToken` — the account is replaced either way (a
 * mistyped password shouldn't get stuck on it), but past the cap the
 * returned `token` is null and no new link goes out this hour.
 */
export async function replaceUnconfirmedParent(
  parent_id: string,
  data: { name: string; surname: string | null; password_hash: string },
): Promise<{ parent: { id: string; email: string; name: string }; token: string | null } | null> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.parent.updateMany({
      where: { id: parent_id, email_confirmed_at: null },
      data: { ...data, token_version: { increment: 1 } },
    });
    if (claimed.count !== 1) return null;

    // The account's details just changed, so every older link — however
    // recent — must die: whoever still holds one must not confirm into an
    // account with someone else's name and password.
    await tx.emailConfirmationToken.updateMany({ where: { parent_id, used_at: null }, data: { used_at: now } });

    const parent = await tx.parent.findUniqueOrThrow({ where: { id: parent_id }, select: { id: true, email: true, name: true } });

    const recent = await tx.emailConfirmationToken.count({
      where: { parent_id, created_at: { gte: new Date(now.getTime() - HOUR_MS) } },
    });
    if (recent >= MAX_TOKENS_PER_HOUR) return { parent, token: null };

    const token = newEmailedToken();
    await tx.emailConfirmationToken.create({
      data: { parent_id, token_hash: hashEmailedToken(token), expires_at: new Date(now.getTime() + CONFIRMATION_TOKEN_TTL_MS) },
    });
    return { parent, token };
  });
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
