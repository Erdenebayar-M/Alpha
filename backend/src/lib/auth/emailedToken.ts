import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env';

// The one-time tokens sent in emailed links — Password reset and Email
// confirmation. The raw token lives in the link alone; only its hash is stored.

export function newEmailedToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only this digest is stored; the raw token lives in the emailed link alone. */
export function hashEmailedToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A link to a web page, built from WEB_URL. Undefined params are left out. */
export function webLink(path: string, params: Record<string, string | undefined>): string {
  const url = new URL(path, env.WEB_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}
