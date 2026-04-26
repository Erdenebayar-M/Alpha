import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(s);
}

export async function signToken(payload: { parent_id: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{ parent_id: string }> {
  const { payload } = await jwtVerify(token, getSecret());
  if (typeof payload.parent_id !== 'string') {
    throw new Error('Malformed token: missing parent_id');
  }
  return { parent_id: payload.parent_id };
}
