import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import { env } from '../../config/env';
import type { GoogleAuthInput } from '@app/shared';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
// Google signs id_tokens with either form of its issuer.
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const KEYS_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

/** The Google account behind a verified id_token. The email is verified and lowercased. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
}

let cachedKeys: { jwks: JSONWebKeySet; fetchedAt: number } | null = null;

async function fetchKeys(): Promise<JSONWebKeySet> {
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Google certs endpoint answered ${res.status}`);
  const jwks = (await res.json()) as JSONWebKeySet;
  cachedKeys = { jwks, fetchedAt: Date.now() };
  return jwks;
}

/**
 * Checks the id_token against Google's published keys, fetched with plain
 * fetch and cached for an hour. A key id the cache doesn't know means Google
 * rotated its keys, so they are fetched once more before giving up.
 */
async function verifyIdToken(idToken: string, clientId: string) {
  const options = { issuer: ISSUERS, audience: clientId, algorithms: ['RS256'] };
  const fresh = !cachedKeys || Date.now() - cachedKeys.fetchedAt > KEYS_TTL_MS;
  const jwks = fresh ? await fetchKeys() : cachedKeys!.jwks;
  try {
    return (await jwtVerify(idToken, createLocalJWKSet(jwks), options)).payload;
  } catch (err) {
    if (fresh || (err as { code?: string }).code !== 'ERR_JWKS_NO_MATCHING_KEY') throw err;
    return (await jwtVerify(idToken, createLocalJWKSet(await fetchKeys()), options)).payload;
  }
}

/**
 * Finishes Google sign-in: exchanges the authorization code (PKCE plus the
 * client secret, which only the backend holds) and verifies the returned
 * id_token — signature, issuer, audience, expiry — requiring a verified email.
 * Throws on any failure; the message says why, for the logs only.
 */
export async function googleIdentityFromCode({ code, code_verifier, redirect_uri }: GoogleAuthInput): Promise<GoogleIdentity> {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) throw new Error('Google sign-in is not configured');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier,
      redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const tokens = (await res.json().catch(() => null)) as { id_token?: unknown; error?: unknown } | null;
  if (!res.ok || typeof tokens?.id_token !== 'string') {
    throw new Error(`Google token exchange failed: ${res.status} ${String(tokens?.error ?? '')}`.trim());
  }

  const claims = await verifyIdToken(tokens.id_token, clientId);
  if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') throw new Error('id_token has no sub or email');
  if (claims.email_verified !== true) throw new Error('Google email is not verified');

  const name = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    given_name: name(claims.given_name),
    family_name: name(claims.family_name),
  };
}
