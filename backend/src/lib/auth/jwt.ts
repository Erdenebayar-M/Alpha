import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(s);
}

/** `token_version` is the Parent account's at signing; see withAuth. */
export type TokenClaims = {
  parent_id: string;
  token_version: number;
};

export async function signToken(payload: TokenClaims): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('mongolian-app')
    .setAudience('parent-api')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
    issuer: 'mongolian-app',
    audience: 'parent-api',
  });
  if (typeof payload.parent_id !== 'string') {
    throw new Error('Malformed token: missing parent_id');
  }
  // Tokens issued before token_version existed carry none; they count as 0 so
  // deploying this signs no one out.
  const token_version = payload.token_version ?? 0;
  if (typeof token_version !== 'number') {
    throw new Error('Malformed token: token_version is not a number');
  }
  return { parent_id: payload.parent_id, token_version };
}
